import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import eduonxLogo from "@/assets/eduonx-logo.jpeg";

const learnerTypes = ["Individual Learner", "School / Institution"];
const grades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "College"];
const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Computer Science", "Economics"];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [learnerType, setLearnerType] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleSubject = (s: string) =>
    setSelectedSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject("");
      setShowCustomInput(false);
    }
  };

  const handleContinue = async () => {
    if (!name.trim() || !selectedGrade || selectedSubjects.length === 0 || !user) {
      toast.error("Please fill in your name, grade, and select at least one subject");
      return;
    }

    setIsLoading(true);
    try {
      // Save profile to Firestore
      await setDoc(doc(db, "profiles", user.uid), {
        full_name: name.trim(),
        grade_level: selectedGrade,
        user_id: user.uid,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      // Save preferences to Firestore
      await setDoc(doc(db, "user_preferences", user.uid), {
        user_id: user.uid,
        subjects: selectedSubjects,
        learner_type: learnerType,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      navigate("/onboarding/goals");
    } catch (err: any) {
      console.error("Firestore Error:", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center shrink-0 w-full justify-center lg:justify-start">
          <img src={eduonxLogo} alt="EduOnx Logo" className="h-[60px] w-auto max-w-full lg:max-w-[250px] object-contain invert grayscale brightness-200 mix-blend-screen opacity-90" />
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-muted h-1">
        <div className="bg-accent h-1 w-1/2 rounded-r-full transition-all" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-secondary items-center justify-center mb-2">
              <GraduationCap className="h-6 w-6 text-navy" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Set up your profile</h2>
            <p className="text-muted-foreground text-sm">Help us personalize your learning experience</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <Input placeholder="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>

            {/* Learner Type */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {learnerTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setLearnerType(t)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                      learnerType === t
                        ? "bg-navy text-highlight border-navy"
                        : "bg-card border-border text-foreground hover:border-accent/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Grade / Level</label>
              <div className="grid grid-cols-4 gap-2">
                {grades.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedGrade === g
                        ? "bg-navy text-highlight border-navy"
                        : "bg-card border-border text-foreground hover:border-accent/50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Subjects you study</label>
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSubject(s)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                      selectedSubjects.includes(s)
                        ? "bg-navy text-highlight border-navy"
                        : "bg-card border-border text-foreground hover:border-accent/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}

                {/* Custom subjects added by user */}
                {selectedSubjects
                  .filter((s) => !subjects.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className="px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left bg-navy text-highlight border-navy"
                    >
                      {s}
                    </button>
                  ))}

                {/* Custom subject input or button */}
                {showCustomInput ? (
                  <div className="col-span-2 flex gap-2">
                    <Input
                      placeholder="Enter subject or topic…"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomSubject()}
                      className="h-11 flex-1"
                      autoFocus
                    />
                    <Button
                      onClick={addCustomSubject}
                      className="h-11 bg-navy text-highlight hover:bg-navy/90"
                      disabled={!customSubject.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setShowCustomInput(false); setCustomSubject(""); }}
                      className="h-11"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="px-4 py-3 rounded-lg text-sm font-medium border border-dashed border-border text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors text-left"
                  >
                    + Custom Subject
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-11 bg-navy text-highlight hover:bg-navy/90 font-semibold gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Continue"} {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
