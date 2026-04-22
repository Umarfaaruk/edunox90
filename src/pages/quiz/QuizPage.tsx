import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Loader2, Lightbulb, BookOpen, Flame, SkipForward, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { aiComplete } from "@/lib/aiService";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

/**
 * QuizPage — AI-powered quiz generation using OpenRouter (Gemma 3 27B)
 *
 * Generates quizzes and hints via the centralized aiService.
 */
const QuizPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const topicTitle = (location.state as { topicTitle?: string; subjectName?: string })?.topicTitle ?? "Quiz";
  const subjectName = (location.state as { topicTitle?: string; subjectName?: string })?.subjectName ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timer, setTimer] = useState(0);
  const [streak, setStreak] = useState(0);

  // AI Hint state
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);

  const fetched = useRef(false);

  // Generate quiz via OpenRouter API
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const run = async () => {
      try {
        const prompt = `Generate exactly 5 multiple-choice quiz questions about "${topicTitle}"${subjectName ? ` (subject: ${subjectName})` : ""}.

Return ONLY a valid JSON array with this exact format, no other text:
[
  {
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Rules:
- Each question must have exactly 4 options
- "correct" is the 0-based index of the correct option
- Questions should range from easy to medium difficulty
- Make questions educational and clear
- Include helpful explanations`;

        const text = await aiComplete({
          messages: [
            { role: "system", content: "You are a quiz generator. Return ONLY valid JSON arrays, no other text or markdown." },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          maxTokens: 2048,
        });

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Failed to parse quiz questions from AI response");

        const parsed = JSON.parse(jsonMatch[0]) as Question[];
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No questions generated");

        // Validate structure
        const valid = parsed.filter(
          (q) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === "number"
        );

        if (valid.length === 0) throw new Error("Invalid question format from AI");

        setQuestions(valid);
        setAnswers(Array(valid.length).fill(null));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        toast.error(msg);
        console.error("[QuizPage] Generation error:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [topicTitle, subjectName, id, navigate]);

  // Timer
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (idx < questions[current]?.options.length) setSelected(idx);
      }
      if (e.key === "Enter" && selected !== null) handleNext();
      if (e.key === "h" || e.key === "H") handleAskHint();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [loading, selected, current, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const goToResults = (finalAnswers: (number | null)[]) => {
    const score = finalAnswers.filter((a, i) => a === questions[i]?.correct).length;
    navigate(`/quiz/${id}/results`, {
      state: {
        score,
        total: questions.length,
        topicTitle,
        topicId: id,
        questions,
        answers: finalAnswers,
        timeSeconds: timer,
      },
    });
  };

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[current] = selected;
    setAnswers(newAnswers);
    const isCorrect = selected !== null && questions[current] && selected === questions[current].correct;
    setStreak(isCorrect ? (s) => s + 1 : () => 0);
    setShowHint(false);
    setHintText("");

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
    } else {
      goToResults(newAnswers);
    }
  };

  const handleSkip = () => {
    const newAnswers = [...answers];
    newAnswers[current] = null;
    setAnswers(newAnswers);
    setStreak(0);
    setShowHint(false);
    setHintText("");

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
    } else {
      goToResults(newAnswers);
    }
  };

  // AI Hint via OpenRouter
  const handleAskHint = async () => {
    if (hintLoading) return;
    setShowHint(true);
    setHintLoading(true);
    setHintText("");

    try {
      const q = questions[current];
      const prompt = `Give me a helpful hint (NOT the answer) for this ${topicTitle} question: "${q.question}". The hint should guide the student toward the correct answer without revealing it directly. Keep it to 2-3 sentences.`;

      const text = await aiComplete({
        messages: [
          { role: "system", content: "You are a helpful tutor. Give hints, NOT answers." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 256,
      });

      setHintText(text || "Think about the core concept behind this topic. Re-read the question carefully.");
    } catch {
      setHintText("Hint unavailable right now. Try re-reading the question options carefully.");
    } finally {
      setHintLoading(false);
    }
  };

  const currentScore = answers.slice(0, current).filter((a, i) => a === questions[i]?.correct).length;
  const currentXP = currentScore * 10;

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating quiz questions with AI…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto text-center py-20 space-y-4">
        <p className="text-muted-foreground">Couldn't generate questions. Please try again.</p>
        <Button onClick={() => navigate("/quiz")} variant="outline">Back to Topics</Button>
      </div>
    );
  }

  const q = questions[current];
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Topic: <span className="text-foreground font-medium">{topicTitle}</span>
          </span>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-medium">{formatTime(timer)}</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/quiz")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Save & Exit
        </button>
      </div>

      {/* Question header */}
      <div>
        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Smart Quiz</div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            Question {current + 1}{" "}
            <span className="text-muted-foreground font-normal text-base">of {questions.length}</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Score:</span>
            <span className="text-sm font-bold text-cta">{currentXP} XP</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-success rounded-full transition-all duration-500"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
        <p className="text-foreground font-medium text-lg leading-relaxed">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-all ${
                selected === i
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 rounded-full border items-center justify-center text-xs font-bold mr-4 ${
                  selected === i ? "border-primary-foreground/60" : "border-muted-foreground/30"
                }`}
              >
                {letters[i]}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* AI Hint panel */}
      {showHint && (
        <div className="bg-cta-light border border-cta/20 rounded-xl p-4 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-cta uppercase tracking-wider">
              <Lightbulb className="h-3.5 w-3.5" /> AI Hint
            </div>
            <button onClick={() => setShowHint(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {hintLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating hint…
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{hintText}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleAskHint}
          disabled={hintLoading}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Lightbulb className="h-4 w-4" />
          {showHint ? "Refresh Hint" : "Ask AI for Hint"}
          <span className="text-[10px] text-muted-foreground">(H)</span>
        </button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSkip} className="gap-2">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
          <Button
            onClick={handleNext}
            disabled={selected === null}
            className="bg-cta text-cta-foreground hover:bg-cta/90 font-semibold gap-2 px-6"
          >
            {current < questions.length - 1 ? "Submit Answer" : "Finish Quiz"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <BookOpen className="h-3.5 w-3.5" /> Related Material
          </div>
          <p className="text-xs text-muted-foreground italic">
            AI hint will show related study content for this question.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <Flame className="h-3.5 w-3.5" /> Answer Streak
          </div>
          {streak > 0 ? (
            <p className="text-sm font-bold text-success">🔥 {streak} correct in a row!</p>
          ) : (
            <p className="text-xs text-muted-foreground">Answer correctly to build a streak!</p>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span>1–4 Select</span>
        <span>Enter Submit</span>
        <span>H Hint</span>
      </div>
    </div>
  );
};

export default QuizPage;
