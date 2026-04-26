import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Focus, X, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useDeepFocus } from "@/hooks/useDeepFocus";
import { awardXP } from "@/lib/studySession";
import { toast } from "sonner";
import { doc, getDoc, collection, getDocs, query, where, writeBatch } from "firebase/firestore";

const LESSON_XP = 20; // XP awarded per lesson completion

const LessonViewer = () => {
  const { id: topicId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDeepFocus, toggleDeepFocus } = useDeepFocus();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch topic and lessons from Firestore
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () => {
      if (!topicId) return null;
      try {
        const topicDoc = await getDoc(doc(db, "topics", topicId));
        return topicDoc.exists() ? { id: topicDoc.id, ...topicDoc.data() } : null;
      } catch (error) {
        console.error("[LessonViewer] Topic fetch error:", error);
        return null;
      }
    }
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons", topicId],
    queryFn: async () => {
      if (!topicId) return [];
      try {
        const lessonsSnap = await getDocs(
          query(
            collection(db, "lessons"),
            where("topic_id", "==", topicId)
          )
        );
        return lessonsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as {
          id: string;
          topic_id: string;
          title: string;
          content?: string;
          [key: string]: any;
        }));
      } catch (error) {
        console.error("[LessonViewer] Lessons fetch error:", error);
        return [];
      }
    },
    enabled: !!topicId
  });

  // Fetch user progress for this topic
  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", topicId, user?.uid],
    queryFn: async () => {
      if (!topicId || !user) return [];
      try {
        const progressSnap = await getDocs(
          query(
            collection(db, "lesson_progress"),
            where("user_id", "==", user.uid),
            where("topic_id", "==", topicId)
          )
        );
        return progressSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as {
          id: string;
          user_id: string;
          topic_id: string;
          lesson_id: string;
          completed: boolean;
          [key: string]: any;
        }));
      } catch (error) {
        console.error("[LessonViewer] Progress fetch error:", error);
        return [];
      }
    },
    enabled: !!topicId && !!user
  });

  const completedSet = new Set(
    (progress ?? []).flatMap((p: any) => p.completed_lessons ?? [])
  );

  const currentLesson = lessons?.[currentIndex];
  const isCompleted = currentLesson ? completedSet.has(currentLesson.id) : false;
  const isLoading = topicLoading || lessonsLoading;
  const totalLessons = lessons?.length ?? 0;
  const overallPct = totalLessons > 0 ? Math.round((completedSet.size / totalLessons) * 100) : 0;

  // Mark complete AND award XP
  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user || !currentLesson || !topicId) return;
      
      // Update lesson_progress in Firestore
      const batch = writeBatch(db);
      const progressRef = doc(db, "lesson_progress", `${user.uid}_${topicId}`);
      
      const existingProgress = progress[0] || { completed_lessons: [] };
      const updated = Array.from(new Set([...(existingProgress.completed_lessons || []), currentLesson.id]));
      
      batch.set(progressRef, {
        user_id: user.uid,
        topic_id: topicId,
        completed_lessons: updated,
        updated_at: new Date()
      }, { merge: true });
      
      await batch.commit();
      await awardXP(user.uid, LESSON_XP, "lesson");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", topicId, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["topics", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["totalXp"] });
      toast.success(`Lesson completed! +${LESSON_XP} XP 🎉`);
    },
    onError: (error) => {
      console.error("[LessonViewer] Mark complete error:", error);
      toast.error("Failed to complete lesson");
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto text-center space-y-4 py-20">
        <p className="text-muted-foreground">No lessons found for this topic.</p>
        <Link to="/lessons" className="text-primary hover:underline text-sm">
          ← Back to Lessons
        </Link>
      </div>
    );
  }

  // Simple markdown renderer
  const renderContent = (content: string) =>
    content.split("\n").map((line, i) => {
      if (line.startsWith("### "))
        return <h4 key={i} className="text-base font-semibold mt-4 text-foreground">{line.slice(4)}</h4>;
      if (line.startsWith("## "))
        return <h3 key={i} className="text-lg font-semibold mt-6 text-foreground">{line.slice(3)}</h3>;
      if (line.startsWith("```") || line === "```") return null;
      if (line.startsWith("- "))
        return <li key={i} className="text-muted-foreground ml-4 leading-relaxed">{line.slice(2)}</li>;
      if (/^\d+\.\s/.test(line))
        return <li key={i} className="text-muted-foreground ml-4 list-decimal leading-relaxed">{line.replace(/^\d+\.\s/, "")}</li>;
      if (line.trim() === "") return <br key={i} />;
      if (line.startsWith("  "))
        return (
          <div key={i} className="font-mono text-sm text-primary bg-muted px-3 py-0.5 rounded my-0.5">
            {line}
          </div>
        );
      return (
        <p key={i} className="text-muted-foreground leading-relaxed">
          {line}
        </p>
      );
    });

  return (
    <div className={`p-6 md:p-8 max-w-3xl mx-auto space-y-6 ${isDeepFocus ? "reading-mode" : ""}`}>

      {/* ── Back link + Deep Focus toggle ─────────────────── */}
      <div className="flex items-center justify-between">
        {!isDeepFocus && (
          <Link
            to="/lessons"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
          </Link>
        )}

        {/* ✅ NEW: Deep Focus Mode toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDeepFocus}
          className={`ml-auto gap-2 text-xs ${
            isDeepFocus
              ? "border-primary text-primary bg-primary/10"
              : "text-muted-foreground"
          }`}
        >
          {isDeepFocus ? (
            <><X className="h-3.5 w-3.5" /> Exit Focus</>
          ) : (
            <><Focus className="h-3.5 w-3.5" /> Deep Focus</>
          )}
        </Button>
      </div>

      {/* ── Topic / lesson metadata ───────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {(topic?.subjects as { name?: string })?.name ?? "Subject"}
          </span>
          <span>Lesson {currentIndex + 1} of {totalLessons}</span>
          {isCompleted && (
            <span className="flex items-center gap-1 text-success font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {currentLesson.title}
        </h1>
      </div>

      {/* ── Progress bar (success green per design spec) ─── */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-success rounded-full transition-all duration-500"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* ── Lesson content card ───────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Lesson Content</span>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            +{LESSON_XP} XP on complete
          </span>
        </div>
        <div className="prose prose-sm max-w-none space-y-1">
          {renderContent(currentLesson.content)}
        </div>
      </div>

      {/* ── Navigation + Complete actions ─────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="gap-2"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>

        {/* Mark complete — primary CTA uses Amber */}
        <Button
          onClick={() => markComplete.mutate()}
          className={`gap-2 flex-1 ${
            isCompleted
              ? "bg-success/10 text-success border border-success/30 hover:bg-success/20"
              : "bg-cta text-cta-foreground hover:bg-cta/90 font-semibold"
          }`}
          disabled={isCompleted || markComplete.isPending}
        >
          {isCompleted ? (
            <><CheckCircle2 className="h-4 w-4" /> Completed</>
          ) : markComplete.isPending ? (
            "Saving…"
          ) : (
            <><Zap className="h-4 w-4" /> Mark Complete (+{LESSON_XP} XP)</>
          )}
        </Button>

        <Button
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={currentIndex >= totalLessons - 1}
          onClick={() => setCurrentIndex((i) => i + 1)}
        >
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Take a quiz prompt ────────────────────────────── */}
      {overallPct === 100 && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground text-sm">🎉 All lessons complete!</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Test your knowledge with a quiz on this topic.
            </div>
          </div>
          <Link to={`/quiz/${topicId}`} state={{ topicTitle: topic?.title ?? "Topic", subjectName: (topic?.subjects as { name?: string })?.name ?? "" }}>
            <Button className="bg-cta text-cta-foreground hover:bg-cta/90 text-sm">
              Take Quiz
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default LessonViewer;
