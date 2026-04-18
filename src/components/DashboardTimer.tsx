import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { saveStudySession } from "@/lib/studySession";
import { toast } from "sonner";

const DashboardTimer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ✅ FIX: Start as false — timer should NOT auto-start on Dashboard load
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<string>(new Date().toISOString());

  // ✅ FIX: Use refs to avoid stale closure in cleanup
  const secondsRef = useRef(0);
  const runningRef = useRef(false);

  const streak = { current_streak: 0, longest_streak: 0, last_study_date: null };
  const savingRef = useRef(false);


  // Keep refs in sync with state
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { runningRef.current = running; }, [running]);

  // Timer tick
  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (interval.current) clearInterval(interval.current);
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    startedAt.current = new Date().toISOString();
    setRunning(true);
  };

  const persistCurrentSession = useCallback(async (showToast: boolean) => {
    const dur = secondsRef.current;
    if (!user || dur < 10) {
      setSeconds(0);
      startedAt.current = new Date().toISOString();
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;

    setSaving(true);
    try {
      const { xp, newStreak } = await saveStudySession(
        user.uid,
        startedAt.current,
        dur,
        streak
      );

      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      queryClient.invalidateQueries({ queryKey: ["studyTime"] });
      queryClient.invalidateQueries({ queryKey: ["progressAnalytics"] });

      if (showToast) {
        toast.success(`Session saved! +${xp} XP · ${newStreak}-day streak 🔥`);
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
      setSeconds(0);
      if (user) localStorage.removeItem(`study-timer-${user.uid}`);
      startedAt.current = new Date().toISOString();
    }
  }, [queryClient, user]);

  const handleStop = useCallback(async () => {
    setRunning(false);
    if (interval.current) clearInterval(interval.current);
    await persistCurrentSession(true);
  }, [persistCurrentSession]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && runningRef.current) {
        setRunning(false);
        if (interval.current) clearInterval(interval.current);
        persistCurrentSession(false).catch(console.error);
      }
    };

    const handleBeforeUnload = () => {
      if (runningRef.current) {
        persistCurrentSession(false).catch(console.error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistCurrentSession]);

  useEffect(() => {
    if (!running) return;
    const storageKey = user ? `study-timer-${user.uid}` : "study-timer";
    localStorage.setItem(storageKey, JSON.stringify({ startedAt: startedAt.current, seconds }));
  }, [running, seconds, user]);

  useEffect(() => {
    if (!user) return;
    const storageKey = `study-timer-${user.uid}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { startedAt?: string; seconds?: number };
      if (typeof parsed.seconds === "number" && parsed.seconds > 0) {
        setSeconds(parsed.seconds);
        if (parsed.startedAt) startedAt.current = parsed.startedAt;
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [user]);

  const xpEarned = Math.floor(seconds / 60) * 5;

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
      <Timer
        className={`h-4 w-4 flex-shrink-0 ${
          running ? "text-primary animate-pulse" : "text-muted-foreground"
        }`}
      />

      <span className="font-mono text-sm font-bold text-foreground tabular-nums">
        {fmt(seconds)}
      </span>

      {xpEarned > 0 && (
        <span className="text-xs text-success font-semibold">+{xpEarned} XP</span>
      )}

      {!running && (
        <button
          onClick={handleStart}
          className="ml-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          title="Start study timer"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}

      {running && seconds > 10 && (
        <button
          onClick={handleStop}
          disabled={saving}
          className="ml-1 p-1 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
          title="Stop & save session"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default DashboardTimer;
