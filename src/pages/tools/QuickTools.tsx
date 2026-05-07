import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer, StickyNote, Calculator, ArrowLeftRight, FileText, Focus,
  Play, Pause, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp, Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ── Pomodoro Timer Component ─────────────────────────────────────
const PomodoroTimer = () => {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const focusDuration = 25 * 60;
  const breakDuration = 5 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      if (mode === "focus") {
        setSessions((s) => s + 1);
        toast.success("Focus session complete! Take a break 🎉");
        setMode("break");
        setTimeLeft(breakDuration);
      } else {
        toast.success("Break over — time to focus! 🧠");
        setMode("focus");
        setTimeLeft(focusDuration);
      }
      setIsRunning(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft, mode]);

  const reset = () => {
    setIsRunning(false);
    setMode("focus");
    setTimeLeft(focusDuration);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = mode === "focus" ? ((focusDuration - timeLeft) / focusDuration) * 100 : ((breakDuration - timeLeft) / breakDuration) * 100;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" /> Pomodoro Timer
        </h3>
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${mode === "focus" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
          {mode === "focus" ? "Focus" : "Break"}
        </span>
      </div>

      {/* Circular progress */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-40 w-40">
          <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle cx="50" cy="50" r="44" fill="none" stroke={mode === "focus" ? "hsl(var(--primary))" : "hsl(var(--success))"} strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 44}`} strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">{sessions} sessions</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsRunning(!isRunning)} size="sm" className="gap-2">
            {isRunning ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {timeLeft === focusDuration || timeLeft === breakDuration ? "Start" : "Resume"}</>}
          </Button>
          <Button onClick={reset} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Quick Notes Component ────────────────────────────────────────
const QuickNotes = () => {
  const [notes, setNotes] = useState<{ id: string; text: string; createdAt: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("eduonx_quick_notes") || "[]");
    } catch { return []; }
  });
  const [newNote, setNewNote] = useState("");

  const saveNotes = useCallback((n: typeof notes) => {
    setNotes(n);
    localStorage.setItem("eduonx_quick_notes", JSON.stringify(n));
  }, []);

  const addNote = () => {
    if (!newNote.trim()) return;
    const updated = [{ id: Date.now().toString(), text: newNote.trim(), createdAt: Date.now() }, ...notes];
    saveNotes(updated);
    setNewNote("");
    toast.success("Note saved!");
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <StickyNote className="h-5 w-5 text-cta" /> Quick Notes
      </h3>
      <div className="flex gap-2">
        <Textarea placeholder="Jot down a quick note..." value={newNote} onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[60px] resize-none text-sm" onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && addNote()} />
      </div>
      <Button onClick={addNote} size="sm" disabled={!newNote.trim()} className="gap-2 w-full">
        <Plus className="h-4 w-4" /> Add Note
      </Button>
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No notes yet. Start jotting!</p>
        ) : notes.map((n) => (
          <div key={n.id} className="bg-muted/50 rounded-lg px-3 py-2 flex items-start gap-2 group">
            <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{n.text}</p>
            <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Calculator Component ─────────────────────────────────────────
const CalcTool = () => {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const calculate = () => {
    try {
      // Safe eval alternative using Function constructor
      const sanitized = expression.replace(/[^-()\d/*+.^%\s]/g, '');
      const fn = new Function(`return ${sanitized}`);
      const res = fn();
      setResult(String(res));
    } catch {
      setResult("Error");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <Calculator className="h-5 w-5 text-success" /> Calculator
      </h3>
      <div className="space-y-3">
        <Input placeholder="e.g. (25 * 4) + 100" value={expression} onChange={(e) => setExpression(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && calculate()} className="font-mono text-sm h-11" />
        <Button onClick={calculate} size="sm" className="w-full gap-2" disabled={!expression.trim()}>
          Calculate
        </Button>
        {result !== null && (
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-center">
            <span className="text-xs text-muted-foreground">Result</span>
            <div className="text-2xl font-bold text-foreground font-mono">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Unit Converter Component ─────────────────────────────────────
const UnitConverter = () => {
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("length");
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");

  const conversions: Record<string, Record<string, number>> = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
    temperature: { C: 1, F: 1, K: 1 }, // Special handling
    volume: { L: 1, mL: 0.001, gal: 3.78541, qt: 0.946353, cup: 0.236588 },
  };

  const units = Object.keys(conversions[category] || {});
  useEffect(() => {
    setFromUnit(units[0] || ""); setToUnit(units[1] || "");
  }, [category]);

  const convert = (): string => {
    const val = parseFloat(value);
    if (isNaN(val) || !fromUnit || !toUnit) return "—";

    if (category === "temperature") {
      if (fromUnit === toUnit) return val.toFixed(2);
      if (fromUnit === "C" && toUnit === "F") return ((val * 9/5) + 32).toFixed(2);
      if (fromUnit === "F" && toUnit === "C") return ((val - 32) * 5/9).toFixed(2);
      if (fromUnit === "C" && toUnit === "K") return (val + 273.15).toFixed(2);
      if (fromUnit === "K" && toUnit === "C") return (val - 273.15).toFixed(2);
      if (fromUnit === "F" && toUnit === "K") return (((val - 32) * 5/9) + 273.15).toFixed(2);
      if (fromUnit === "K" && toUnit === "F") return (((val - 273.15) * 9/5) + 32).toFixed(2);
    }

    const base = val * (conversions[category]?.[fromUnit] ?? 1);
    return (base / (conversions[category]?.[toUnit] ?? 1)).toFixed(4);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ArrowLeftRight className="h-5 w-5 text-accent" /> Unit Converter
      </h3>
      <div className="flex flex-wrap gap-2 mb-2">
        {Object.keys(conversions).map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
              category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"
            }`}
          >{cat}</button>
        ))}
      </div>
      <Input type="number" placeholder="Enter value" value={value} onChange={(e) => setValue(e.target.value)} className="h-10 font-mono" />
      <div className="grid grid-cols-2 gap-2">
        <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card text-foreground text-sm px-3">
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={toUnit} onChange={(e) => setToUnit(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card text-foreground text-sm px-3">
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {value && (
        <div className="bg-muted/50 rounded-lg px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground">Result</span>
          <div className="text-xl font-bold text-foreground font-mono">{convert()} {toUnit}</div>
        </div>
      )}
    </div>
  );
};

// ── Formula Sheet Component ──────────────────────────────────────
const FormulaSheet = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const formulas: Record<string, { formula: string; desc: string }[]> = {
    "Physics": [
      { formula: "v = u + at", desc: "Final velocity" },
      { formula: "s = ut + ½at²", desc: "Displacement" },
      { formula: "F = ma", desc: "Newton's second law" },
      { formula: "E = mc²", desc: "Mass-energy equivalence" },
      { formula: "P = W/t", desc: "Power" },
      { formula: "KE = ½mv²", desc: "Kinetic energy" },
    ],
    "Mathematics": [
      { formula: "x = (-b ± √(b²-4ac)) / 2a", desc: "Quadratic formula" },
      { formula: "A = πr²", desc: "Circle area" },
      { formula: "sin²θ + cos²θ = 1", desc: "Pythagorean identity" },
      { formula: "d/dx [xⁿ] = nxⁿ⁻¹", desc: "Power rule" },
      { formula: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C", desc: "Power integral" },
    ],
    "Chemistry": [
      { formula: "PV = nRT", desc: "Ideal gas law" },
      { formula: "pH = -log[H⁺]", desc: "pH formula" },
      { formula: "Molarity = moles/L", desc: "Concentration" },
      { formula: "ΔG = ΔH - TΔS", desc: "Gibbs free energy" },
    ],
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5 text-destructive" /> Formula Sheet
      </h3>
      <div className="space-y-2">
        {Object.entries(formulas).map(([subject, list]) => (
          <div key={subject} className="border border-border rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(expanded === subject ? null : subject)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
            >
              {subject}
              {expanded === subject ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded === subject && (
              <div className="px-4 pb-3 space-y-2">
                {list.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                    <code className="text-sm font-mono text-primary flex-1">{f.formula}</code>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{f.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Focus Mode Toggle Component ──────────────────────────────────
const FocusModeWidget = () => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`rounded-xl p-6 space-y-4 border transition-all ${
      isFocused ? "bg-primary/5 border-primary/30" : "bg-card border-border"
    }`}>
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <Focus className="h-5 w-5 text-primary" /> Focus Mode
      </h3>
      <p className="text-sm text-muted-foreground">
        {isFocused ? "Focus mode is active. Distractions minimized. Stay on track! 🎯" : "Activate focus mode to minimize distractions and stay productive."}
      </p>
      <Button onClick={() => { setIsFocused(!isFocused); toast(isFocused ? "Focus mode deactivated" : "Focus mode activated! 🧠"); }}
        className={`w-full gap-2 ${isFocused ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
        variant={isFocused ? "default" : "outline"}
      >
        <Focus className="h-4 w-4" /> {isFocused ? "Exit Focus Mode" : "Enter Focus Mode"}
      </Button>
      {isFocused && (
        <div className="text-xs text-primary font-medium text-center animate-pulse">
          ✨ Stay focused. You've got this!
        </div>
      )}
    </div>
  );
};

// ── Main Quick Tools Page ────────────────────────────────────────
const QuickTools = () => {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Quick Tools</h1>
          <p className="text-muted-foreground text-sm">Productivity tools to supercharge your study sessions</p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PomodoroTimer />
        <QuickNotes />
        <CalcTool />
        <UnitConverter />
        <FormulaSheet />
        <FocusModeWidget />
      </div>
    </div>
  );
};

export default QuickTools;
