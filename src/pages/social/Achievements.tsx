import { Trophy, Star, Flame, Target, Zap, BookOpen, Medal, Award, Clock, MessageCircleQuestion } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  flame: Flame,
  trophy: Trophy,
  star: Star,
  target: Target,
  "book-open": BookOpen,
  zap: Zap,
  medal: Medal,
  award: Award,
  clock: Clock,
  "message-circle-question": MessageCircleQuestion,
};

const Achievements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch achievement definitions
  const { data: achievementDefs } = useQuery({
    queryKey: ["achievement-defs"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").order("sort_order");
      return data ?? [];
    },
  });

  // Fetch user's earned achievements
  const { data: earnedAchievements } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch user stats for progress tracking & auto-unlock
  const { data: stats } = useQuery({
    queryKey: ["achievement-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [xpRes, streakRes, quizRes, progressRes, doubtRes, studyRes] = await Promise.all([
        supabase.from("xp_logs").select("xp_amount").eq("user_id", user.id),
        supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("quiz_attempts").select("score, total_questions").eq("user_id", user.id),
        supabase.from("user_lesson_progress").select("completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("doubt_sessions").select("id").eq("user_id", user.id),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", user.id),
      ]);

      const totalXp = (xpRes.data ?? []).reduce((s, r) => s + r.xp_amount, 0);
      const streak = streakRes.data;
      const quizzes = quizRes.data ?? [];
      const lessonsCompleted = progressRes.data?.length ?? 0;
      const perfectQuizzes = quizzes.filter((q) => q.score === q.total_questions && q.total_questions > 0).length;
      const high90 = quizzes.filter((q) => q.total_questions > 0 && (q.score / q.total_questions) >= 0.9).length;
      const totalStudySeconds = (studyRes.data ?? []).reduce((s, r) => s + r.duration_seconds, 0);
      const doubtCount = doubtRes.data?.length ?? 0;

      return {
        totalXp,
        streak,
        quizCount: quizzes.length,
        perfectQuizzes,
        high90,
        lessonsCompleted,
        totalStudySeconds,
        doubtCount,
      };
    },
    enabled: !!user,
  });

  // Auto-unlock achievements
  useEffect(() => {
    if (!user || !achievementDefs || !earnedAchievements || !stats) return;

    const earnedIds = new Set(earnedAchievements.map((e) => e.achievement_id));

    const progressMap: Record<string, number> = {
      streak_7: stats.streak?.longest_streak ?? 0,
      streak_30: stats.streak?.longest_streak ?? 0,
      first_quiz: stats.quizCount,
      quiz_master: stats.quizCount,
      perfect_score: stats.perfectQuizzes,
      sharp_shooter: stats.high90,
      bookworm: stats.lessonsCompleted,
      xp_hunter: stats.totalXp,
      xp_legend: stats.totalXp,
      first_doubt: stats.doubtCount,
      study_hour: stats.totalStudySeconds,
      study_marathon: stats.totalStudySeconds,
    };

    const toUnlock = achievementDefs.filter((a) => {
      if (earnedIds.has(a.id)) return false;
      const progress = progressMap[a.key] ?? 0;
      return progress >= a.threshold;
    });

    if (toUnlock.length === 0) return;

    (async () => {
      for (const achievement of toUnlock) {
        const { error } = await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });

        if (!error) {
          // Award XP for the achievement
          await supabase.from("xp_logs").insert({
            user_id: user.id,
            source_type: "achievement",
            xp_amount: achievement.xp_reward,
            reference_id: achievement.id,
          });
          toast.success(`🏆 Achievement unlocked: ${achievement.name} (+${achievement.xp_reward} XP)`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["totalXp"] });
    })();
  }, [user, achievementDefs, earnedAchievements, stats]);

  // Compute display data
  const totalXp = stats?.totalXp ?? 0;
  const level = Math.floor(totalXp / 200) + 1;
  const xpInLevel = totalXp % 200;
  const xpForNext = 200;
  const levelTitle =
    level >= 10 ? "Legend" : level >= 7 ? "Master" : level >= 5 ? "Scholar" : level >= 3 ? "Rising Star" : "Beginner";

  const earnedIds = new Set((earnedAchievements ?? []).map((e) => e.achievement_id));

  const progressMap: Record<string, { current: number; total: number }> = stats
    ? {
        streak_7: { current: stats.streak?.current_streak ?? 0, total: 7 },
        streak_30: { current: stats.streak?.current_streak ?? 0, total: 30 },
        first_quiz: { current: stats.quizCount, total: 1 },
        quiz_master: { current: stats.quizCount, total: 50 },
        perfect_score: { current: stats.perfectQuizzes, total: 1 },
        sharp_shooter: { current: stats.high90, total: 10 },
        bookworm: { current: stats.lessonsCompleted, total: 20 },
        xp_hunter: { current: stats.totalXp, total: 1000 },
        xp_legend: { current: stats.totalXp, total: 5000 },
        first_doubt: { current: stats.doubtCount, total: 1 },
        study_hour: { current: Math.floor(stats.totalStudySeconds / 60), total: 60 },
        study_marathon: { current: Math.floor(stats.totalStudySeconds / 60), total: 600 },
      }
    : {};

  const isLoading = !achievementDefs || !stats;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const earnedCount = (earnedAchievements ?? []).length;
  const totalCount = achievementDefs?.length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Achievements</h1>
          <p className="text-muted-foreground text-sm">{earnedCount}/{totalCount} badges earned</p>
        </div>
      </div>

      {/* XP progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Level {level} — {levelTitle}</span>
          <span className="text-xs text-accent font-bold">{xpInLevel} / {xpForNext} XP</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(xpInLevel / xpForNext) * 100}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-2">{xpForNext - xpInLevel} XP to Level {level + 1} · Total: {totalXp.toLocaleString()} XP</div>
      </div>

      {/* Badge grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {(achievementDefs ?? []).map((a) => {
          const earned = earnedIds.has(a.id);
          const prog = progressMap[a.key];
          const IconComp = iconMap[a.icon] ?? Trophy;

          return (
            <div
              key={a.id}
              className={`bg-card border rounded-xl p-5 transition-colors ${
                earned ? "border-accent/30" : "border-border opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  earned ? "bg-secondary" : "bg-muted"
                }`}>
                  <IconComp className={`h-6 w-6 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">+{a.xp_reward} XP</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                  {!earned && prog && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((prog.current / prog.total) * 100, 100)}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{Math.min(prog.current, prog.total)}/{prog.total}</div>
                    </div>
                  )}
                  {earned && (
                    <span className="inline-block mt-2 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">Earned ✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
