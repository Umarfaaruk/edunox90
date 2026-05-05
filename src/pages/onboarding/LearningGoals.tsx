import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Zap, Clock, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

import eduonxLogo from "@/assets/eduonx-logo.jpeg";

const goals = [
  { id: "homework", icon: Zap, label: "Get homework help", desc: "Solve problems faster with AI" },
  { id: "exams", icon: Target, label: "Prepare for exams", desc: "Structured study for upcoming tests" },
  { id: "habits", icon: Clock, label: "Build study habits", desc: "Develop daily learning routines" },
  { id: "compete", icon: Trophy, label: "Compete & improve", desc: "Challenge friends and track progress" },
];

const difficulties = ["Beginner", "Intermediate", "Advanced"];

const LearningGoals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleGoal = (id: string) =>
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleFinish = async () => {
    if (selectedGoals.length === 0 || !difficulty || !user) {
      toast.error("Please select at least one goal and a difficulty level");
      return;
    }

    setIsLoading(true);
    try {
      // Update preferences in Firestore
      await updateDoc(doc(db, "user_preferences", user.uid), {
        goals: selectedGoals,
        difficulty_level: difficulty,
        updated_at: new Date().toISOString(),
      });

      // Mark onboarding as complete in Firestore
      await updateDoc(doc(db, "profiles", user.uid), {
        onboarding_completed: true,
        primary_goal: selectedGoals[0],
        study_preference: difficulty,
        updated_at: new Date().toISOString(),
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Firestore Error:", err);
      toast.error(err.message || "Failed to save goals");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center shrink-0 w-full justify-center lg:justify-start">
          <img src={eduonxLogo} alt="EduOnx Logo" className="h-[180px] w-auto max-w-full lg:max-w-[250px] object-contain" />
        </div>
      </div>

      <div className="w-full bg-muted h-1">
        <div className="bg-accent h-1 w-full rounded-r-full transition-all" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-secondary items-center justify-center mb-2">
              <Target className="h-6 w-6 text-navy" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Set your learning goals</h2>
            <p className="text-muted-foreground text-sm">We'll tailor your experience based on your goals</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">What do you want to achieve?</label>
              <div className="grid grid-cols-1 gap-3">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors text-left ${
                      selectedGoals.includes(g.id)
                        ? "bg-navy text-highlight border-navy"
                        : "bg-card border-border text-foreground hover:border-accent/50"
                    }`}
                  >
                    <g.icon className={`h-5 w-5 flex-shrink-0 ${selectedGoals.includes(g.id) ? "text-highlight" : "text-accent"}`} />
                    <div>
                      <div className="text-sm font-semibold">{g.label}</div>
                      <div className={`text-xs mt-0.5 ${selectedGoals.includes(g.id) ? "text-soft" : "text-muted-foreground"}`}>{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Difficulty level</label>
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                      difficulty === d
                        ? "bg-navy text-highlight border-navy"
                        : "bg-card border-border text-foreground hover:border-accent/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-11 bg-navy text-highlight hover:bg-navy/90 font-semibold gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Start Learning"} {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LearningGoals;
