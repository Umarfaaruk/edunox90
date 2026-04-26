import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, Search, Calculator, Atom, FlaskConical, Leaf, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { defaultTopics as topics, defaultSubjects as subjects } from "@/data/topics";

const iconMap: Record<string, React.ReactNode> = {
  calculator:      <Calculator    className="h-5 w-5 text-primary" />,
  atom:            <Atom          className="h-5 w-5 text-primary" />,
  "flask-conical": <FlaskConical  className="h-5 w-5 text-primary" />,
  leaf:            <Leaf          className="h-5 w-5 text-primary" />,
};

const TopicSelection = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const { data: fetchedTopics, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, "topics"));
        if (snap.empty) return null;
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      } catch (e) {
        console.error("Error fetching topics:", e);
        return null;
      }
    },
  });

  // Fetch user materials
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["user-materials", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(collection(db, "materials"), where("user_id", "==", user.uid));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      } catch (e) {
        console.error("Error fetching materials:", e);
        return [];
      }
    },
    enabled: !!user,
  });

  const activeTopics = fetchedTopics || topics;

  const subjectNames = ["All", ...(subjects?.map((s) => s.name) ?? [])];
  const filtered = (activeTopics ?? []).filter(
    (t) =>
      (filter === "All" || t.subjectName === filter) &&
      t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Practice Quiz</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a topic and difficulty to start an AI-generated quiz
        </p>
      </div>

      {/* Difficulty Selector */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quiz Difficulty</h3>
          <p className="text-xs text-muted-foreground">Adjust the complexity of the questions</p>
        </div>
        <div className="flex gap-2">
          {["Easy", "Medium", "Hard"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setDifficulty(lvl)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                difficulty === lvl
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjectNames.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Topic grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full mt-4" />
              </div>
            ))
          : filtered.map((t) => (
              <div
                key={t.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {iconMap[t.subjectIcon] ?? <Gamepad2 className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.subjectName}
                      {(t as { lesson_count?: number }).lesson_count
                        ? ` · ${(t as { lesson_count?: number }).lesson_count} lessons`
                        : ""}
                    </div>
                  </div>
                </div>
                {/* ✅ EduOnx: CTA = Amber */}
                <Link
                  to={`/quiz/${t.id}`}
                  state={{ topicTitle: t.title, subjectName: t.subjectName, difficulty }}
                >
                  <Button
                    size="sm"
                    className="w-full bg-cta text-cta-foreground hover:bg-cta/90 text-xs font-semibold"
                  >
                    Start Quiz
                  </Button>
                </Link>
              </div>
            ))}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <Gamepad2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics match your search</p>
          </div>
        )}
      </div>

      {/* User Materials grid */}
      {(materialsLoading || (materials && materials.length > 0)) && (
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Your Study Materials</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Generate a custom AI quiz directly from your uploaded files
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {materialsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5">
                  <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full mt-4" />
                </div>
              ))
            ) : (
              materials?.map((m) => (
                <div
                  key={m.id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-cta/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-cta/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-cta" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{m.file_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Uploaded Material
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/quiz/${m.id}`}
                    state={{ 
                      topicTitle: m.file_name, 
                      subjectName: "Your Material",
                      materialContext: m.summary || m.extracted_text?.substring(0, 5000) || "",
                      difficulty
                    }}
                  >
                    <Button
                      size="sm"
                      className="w-full bg-cta text-cta-foreground hover:bg-cta/90 text-xs font-semibold"
                    >
                      Generate Quiz
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicSelection;
