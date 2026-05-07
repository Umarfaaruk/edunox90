import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ArrowLeft, GraduationCap, Target, Brain, Lightbulb,
  Clock, BookOpen, Sparkles, Rocket, CheckCircle2, User2, Palette
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import eduonxLogo from "@/assets/eduonx-logo.jpeg";

// ── Stage definitions ────────────────────────────────────────────
const TOTAL_STAGES = 8;

const stageInfo = [
  { title: "Tell us about yourself", subtitle: "Help us personalize your experience", icon: User2 },
  { title: "What's your primary goal?", subtitle: "We'll align everything to help you achieve it", icon: Target },
  { title: "How do you currently study?", subtitle: "Understanding your habits helps us optimize", icon: BookOpen },
  { title: "What challenges do you face?", subtitle: "We'll build solutions around your pain points", icon: Lightbulb },
  { title: "What's your learning style?", subtitle: "Everyone learns differently — we adapt to you", icon: Palette },
  { title: "Time & Resources", subtitle: "Let us know how much time you can dedicate", icon: Clock },
  { title: "AI Expectations", subtitle: "Tell us how you'd like AI to help you", icon: Brain },
  { title: "Ready to commit?", subtitle: "One last step — set your learning commitment", icon: Rocket },
];

const learnerTypes = ["School Student", "College Student", "Competitive Exam", "Self-Learner", "Professional"];
const grades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Undergraduate", "Postgraduate"];
const streams = ["Science", "Commerce", "Arts / Humanities", "Engineering", "Medical", "Other"];
const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Computer Science", "Economics", "Accounting", "Psychology"];

const goals = [
  { id: "exams", label: "🎯 Prepare for exams", desc: "Structured study for upcoming tests" },
  { id: "homework", label: "⚡ Get homework help", desc: "Solve problems faster with AI" },
  { id: "concepts", label: "🧠 Master concepts deeply", desc: "Deep understanding, not rote learning" },
  { id: "habits", label: "⏰ Build study habits", desc: "Develop daily learning routines" },
  { id: "compete", label: "🏆 Compete & improve", desc: "Challenge yourself and track growth" },
  { id: "career", label: "💼 Career preparation", desc: "Build skills for professional growth" },
];

const studyHabits = [
  { id: "regular", label: "I study regularly", desc: "Almost every day" },
  { id: "before_exams", label: "Only before exams", desc: "Cramming is my style" },
  { id: "inconsistent", label: "Inconsistent", desc: "I try but can't maintain routines" },
  { id: "new_to_studying", label: "Just getting started", desc: "Building habits from scratch" },
];

const painPoints = [
  { id: "focus", label: "😵 Can't stay focused" },
  { id: "retention", label: "🧠 Poor retention" },
  { id: "planning", label: "📅 No study plan" },
  { id: "motivation", label: "😴 Lack of motivation" },
  { id: "resources", label: "📚 Too many resources" },
  { id: "doubt_solving", label: "❓ Doubts go unsolved" },
  { id: "time_mgmt", label: "⏳ Time management" },
  { id: "exam_anxiety", label: "😰 Exam anxiety" },
];

const learningStyles = [
  { id: "visual", label: "👁️ Visual", desc: "Charts, diagrams, videos" },
  { id: "reading", label: "📖 Reading/Writing", desc: "Notes, summaries, text" },
  { id: "practice", label: "✍️ Practice-based", desc: "Problems, quizzes, exercises" },
  { id: "listening", label: "👂 Auditory", desc: "Lectures, explanations, discussions" },
];

const dailyStudyHours = ["< 30 min", "30 min – 1 hour", "1 – 2 hours", "2 – 4 hours", "4+ hours"];

const aiPreferences = [
  { id: "explain_simply", label: "🔤 Explain simply", desc: "Break complex topics into simple steps" },
  { id: "quiz_me", label: "📝 Quiz me often", desc: "Test my understanding frequently" },
  { id: "socratic", label: "🤔 Socratic method", desc: "Guide me with questions" },
  { id: "deep_dive", label: "🔬 Go deep", desc: "Detailed explanations with context" },
  { id: "examples", label: "💡 Real-world examples", desc: "Connect concepts to real life" },
  { id: "summary", label: "📋 Summarize", desc: "Quick key takeaways" },
];

const commitments = [
  { id: "casual", label: "🌱 Casual", desc: "1-2 days/week", days: 2 },
  { id: "regular", label: "📘 Regular", desc: "3-4 days/week", days: 4 },
  { id: "dedicated", label: "🔥 Dedicated", desc: "5-6 days/week", days: 6 },
  { id: "intense", label: "🚀 Intense", desc: "Every single day", days: 7 },
];

// ── Onboarding component ────────────────────────────────────────
const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Stage 0 — Profile
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [place, setPlace] = useState("");
  const [learnerType, setLearnerType] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");

  // Stage 1 — Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [urgency, setUrgency] = useState(""); // "upcoming", "months", "long_term"

  // Stage 2 — Study habits
  const [studyHabit, setStudyHabit] = useState("");

  // Stage 3 — Pain points
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);

  // Stage 4 — Learning style
  const [selectedLearningStyle, setSelectedLearningStyle] = useState("");

  // Stage 5 — Time & Resources
  const [dailyTime, setDailyTime] = useState("");
  const [preferredTime, setPreferredTime] = useState(""); // morning, afternoon, evening, night

  // Stage 6 — AI preferences
  const [selectedAIPrefs, setSelectedAIPrefs] = useState<string[]>([]);

  // Stage 7 — Commitment
  const [commitment, setCommitment] = useState("");

  const toggleMulti = useCallback((arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }, []);

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject("");
    }
  };

  const canProceed = (): boolean => {
    switch (stage) {
      case 0: return !!name.trim() && !!selectedGrade && selectedSubjects.length > 0;
      case 1: return selectedGoals.length > 0;
      case 2: return !!studyHabit;
      case 3: return selectedPainPoints.length > 0;
      case 4: return !!selectedLearningStyle;
      case 5: return !!dailyTime;
      case 6: return selectedAIPrefs.length > 0;
      case 7: return !!commitment;
      default: return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Save profile
      await setDoc(doc(db, "profiles", user.uid), {
        full_name: name.trim(),
        age: age || null,
        place: place || null,
        grade_level: selectedGrade,
        stream: selectedStream || null,
        user_id: user.uid,
        onboarding_completed: true,
        primary_goal: selectedGoals[0],
        study_preference: studyHabit,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      // Save comprehensive preferences
      await setDoc(doc(db, "user_preferences", user.uid), {
        user_id: user.uid,
        learner_type: learnerType,
        subjects: selectedSubjects,
        goals: selectedGoals,
        urgency: urgency || null,
        study_habit: studyHabit,
        pain_points: selectedPainPoints,
        learning_style: selectedLearningStyle,
        daily_study_time: dailyTime,
        preferred_study_time: preferredTime || null,
        ai_preferences: selectedAIPrefs,
        commitment_level: commitment,
        commitment_days: commitments.find(c => c.id === commitment)?.days ?? 3,
        onboarding_version: 2,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      toast.success("Welcome to EduOnx! 🚀");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Onboarding Error:", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const info = stageInfo[stage];
  const StageIcon = info.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center shrink-0 w-full justify-center lg:justify-start">
          <img src={eduonxLogo} alt="EduOnx Logo" className="h-[50px] w-auto max-w-full lg:max-w-[250px] object-contain invert grayscale brightness-200 mix-blend-screen opacity-90" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted h-1.5">
        <div className="bg-primary h-1.5 rounded-r-full transition-all duration-500" style={{ width: `${((stage + 1) / TOTAL_STAGES) * 100}%` }} />
      </div>

      {/* Stage counter */}
      <div className="flex justify-center pt-3 gap-2">
        {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-all ${
              i < stage ? "bg-primary" : i === stage ? "bg-primary scale-125" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300" key={stage}>
          {/* Stage header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center mb-2">
              <StageIcon className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{info.title}</h2>
            <p className="text-muted-foreground text-sm">{info.subtitle}</p>
          </div>

          {/* ── Stage 0: User Profile ─────────────────────── */}
          {stage === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Display Name *</label>
                <Input placeholder="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Age</label>
                  <Input type="number" min="10" max="99" placeholder="Your age" value={age} onChange={(e) => setAge(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Place</label>
                  <Input placeholder="City, Country" value={place} onChange={(e) => setPlace(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">I am a...</label>
                <div className="flex flex-wrap gap-2">
                  {learnerTypes.map((t) => (
                    <button key={t} onClick={() => setLearnerType(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        learnerType === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Grade / Level *</label>
                <div className="grid grid-cols-3 gap-2">
                  {grades.map((g) => (
                    <button key={g} onClick={() => setSelectedGrade(g)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        selectedGrade === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stream</label>
                <div className="flex flex-wrap gap-2">
                  {streams.map((s) => (
                    <button key={s} onClick={() => setSelectedStream(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedStream === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subjects you study *</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s} onClick={() => toggleMulti(selectedSubjects, s, setSelectedSubjects)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSubjects.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{s}</button>
                  ))}
                  {selectedSubjects.filter((s) => !subjects.includes(s)).map((s) => (
                    <button key={s} onClick={() => toggleMulti(selectedSubjects, s, setSelectedSubjects)}
                      className="px-3 py-2 rounded-lg text-sm font-medium border bg-primary text-primary-foreground border-primary"
                    >{s}</button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Add custom subject..." value={customSubject} onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomSubject()} className="h-9 text-sm flex-1" />
                  <Button onClick={addCustomSubject} size="sm" disabled={!customSubject.trim()} className="h-9">Add</Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Stage 1: Goal Clarity ─────────────────────── */}
          {stage === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3">
                {goals.map((g) => (
                  <button key={g.id} onClick={() => toggleMulti(selectedGoals, g.id, setSelectedGoals)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                      selectedGoals.includes(g.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{g.label}</div>
                      <div className={`text-xs mt-0.5 ${selectedGoals.includes(g.id) ? "opacity-80" : "text-muted-foreground"}`}>{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">How urgently do you need this?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "upcoming", label: "🔴 Very urgent (< 1 month)" },
                    { id: "months", label: "🟡 A few months" },
                    { id: "long_term", label: "🟢 Long-term growth" },
                  ].map((u) => (
                    <button key={u.id} onClick={() => setUrgency(u.id)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                        urgency === u.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{u.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stage 2: Learning Behavior ─────────────────── */}
          {stage === 2 && (
            <div className="grid grid-cols-1 gap-3">
              {studyHabits.map((h) => (
                <button key={h.id} onClick={() => setStudyHabit(h.id)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                    studyHabit === h.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{h.label}</div>
                    <div className={`text-xs mt-0.5 ${studyHabit === h.id ? "opacity-80" : "text-muted-foreground"}`}>{h.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Stage 3: Pain Points ──────────────────────── */}
          {stage === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {painPoints.map((p) => (
                  <button key={p.id} onClick={() => toggleMulti(selectedPainPoints, p.id, setSelectedPainPoints)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                      selectedPainPoints.includes(p.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                    }`}
                  >{p.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── Stage 4: Learning Style ───────────────────── */}
          {stage === 4 && (
            <div className="grid grid-cols-1 gap-3">
              {learningStyles.map((s) => (
                <button key={s.id} onClick={() => setSelectedLearningStyle(s.id)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                    selectedLearningStyle === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className={`text-xs mt-0.5 ${selectedLearningStyle === s.id ? "opacity-80" : "text-muted-foreground"}`}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Stage 5: Time & Resources ─────────────────── */}
          {stage === 5 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">How much time can you study daily? *</label>
                <div className="grid grid-cols-1 gap-2">
                  {dailyStudyHours.map((h) => (
                    <button key={h} onClick={() => setDailyTime(h)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                        dailyTime === h ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{h}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">When do you prefer to study?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "morning", label: "🌅 Morning" },
                    { id: "afternoon", label: "☀️ Afternoon" },
                    { id: "evening", label: "🌆 Evening" },
                    { id: "night", label: "🌙 Night" },
                  ].map((t) => (
                    <button key={t.id} onClick={() => setPreferredTime(t.id)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                        preferredTime === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stage 6: AI Expectations ──────────────────── */}
          {stage === 6 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select all that match your preference</p>
              <div className="grid grid-cols-1 gap-3">
                {aiPreferences.map((p) => (
                  <button key={p.id} onClick={() => toggleMulti(selectedAIPrefs, p.id, setSelectedAIPrefs)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                      selectedAIPrefs.includes(p.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{p.label}</div>
                      <div className={`text-xs mt-0.5 ${selectedAIPrefs.includes(p.id) ? "opacity-80" : "text-muted-foreground"}`}>{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Stage 7: Commitment Activation ────────────── */}
          {stage === 7 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {commitments.map((c) => (
                  <button key={c.id} onClick={() => setCommitment(c.id)}
                    className={`px-5 py-4 rounded-xl border transition-all text-center ${
                      commitment === c.id ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30" : "bg-card border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="text-lg mb-1">{c.label.split(" ")[0]}</div>
                    <div className="text-sm font-semibold">{c.label.split(" ").slice(1).join(" ")}</div>
                    <div className={`text-xs mt-1 ${commitment === c.id ? "opacity-80" : "text-muted-foreground"}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  Your personalized plan awaits!
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your answers, we'll create an AI-powered study plan, customize your dashboard,
                  set up smart reminders, and personalize your AI tutor experience.
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation buttons ────────────────────────── */}
          <div className="flex items-center gap-3">
            {stage > 0 && (
              <Button variant="outline" onClick={() => setStage(stage - 1)} className="h-11 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {stage < TOTAL_STAGES - 1 ? (
              <Button onClick={() => setStage(stage + 1)} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
                disabled={!canProceed()}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
                disabled={isLoading || !canProceed()}
              >
                {isLoading ? "Setting up your experience..." : "Launch My Learning Journey"} {!isLoading && <Rocket className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
