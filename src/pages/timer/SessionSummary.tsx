import { Link, useLocation, useNavigate, useEffect } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Flame, Zap, ArrowRight, BookOpen } from "lucide-react";

const SessionSummary = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const duration = (state as { duration?: number; xp?: number; streak?: number })?.duration ?? 0;
  const xp = (state as { duration?: number; xp?: number; streak?: number })?.xp ?? 0;
  const streak = (state as { duration?: number; xp?: number; streak?: number })?.streak ?? 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  // If landed here without state, redirect to timer
  if (!state) {
    navigate("/timer", { replace: true });
    return null;
  }

  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto space-y-6 flex flex-col items-center justify-center min-h-[70vh]">

      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-success/10 items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Session Complete!</h1>
        <p className="text-muted-foreground text-sm">
          {xp > 0
            ? `Great focus session! You earned ${xp} XP. Keep it up!`
            : "Session logged. Keep building your study habit!"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { icon: BookOpen,  label: "Duration",  value: mins > 0 ? `${mins}m ${secs}s` : `${secs}s`,               color: "text-primary" },
          { icon: Zap,       label: "XP Earned", value: `+${xp}`,                                                   color: "text-cta" },
          { icon: Flame,     label: "Streak",    value: `${streak} day${streak !== 1 ? "s" : ""}`,                  color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
            <div className="text-lg font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* XP highlight */}
      {xp > 0 && (
        <div className="w-full bg-cta-light border border-cta/20 rounded-xl p-4 text-center animate-fade-in">
          <div className="text-sm font-semibold text-cta">🎉 +{xp} XP added to your profile!</div>
          <div className="text-xs text-muted-foreground mt-1">
            Every minute of study counts towards your level.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <Link to="/timer" className="flex-1">
          <Button variant="outline" className="w-full">
            Study Again
          </Button>
        </Link>
        <Link to="/dashboard" className="flex-1">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default SessionSummary;
