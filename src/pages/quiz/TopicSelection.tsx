import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, FileText, BrainCircuit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const PracticeArena = () => {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("Medium");

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

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Practice Arena</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate custom AI quizzes or flashcards directly from your uploaded study materials.
        </p>
      </div>

      {/* Difficulty Selector */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quiz Difficulty</h3>
          <p className="text-xs text-muted-foreground">Adjust the complexity of the quiz questions</p>
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

      {/* User Materials grid */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Your Study Materials</h2>
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
          ) : materials?.length ? (
            materials?.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-cta/40 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
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
                
                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/quiz/${m.id}`}
                    state={{ 
                      topicTitle: m.file_name, 
                      subjectName: "Your Material",
                      materialContext: m.summary || m.extracted_text?.substring(0, 5000) || "",
                      difficulty
                    }}
                    className="flex-1"
                  >
                    <Button
                      size="sm"
                      className="w-full bg-cta text-cta-foreground hover:bg-cta/90 text-xs font-semibold gap-1.5"
                    >
                      <Gamepad2 className="h-4 w-4" /> Quiz
                    </Button>
                  </Link>
                  <Link
                    to={`/materials/flashcards`}
                    state={{ preselectedMaterial: m }}
                    className="flex-1"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-semibold gap-1.5"
                    >
                      <BrainCircuit className="h-4 w-4" /> Flashcards
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">No materials uploaded yet. Upload a PDF or text to start practicing!</p>
              <Link to="/materials">
                <Button size="sm">Upload Material</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeArena;

