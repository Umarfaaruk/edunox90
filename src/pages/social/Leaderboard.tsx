import { Trophy, Zap, Flame, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
// import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ElementType> = {};

const Leaderboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"global" | "friends">("global");

  const { data: myXp } = useQuery({
    queryKey: ["my-xp", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.from("xp_logs").select("xp_amount").eq("user_id", user.id);
      return (data ?? []).reduce((s, r) => s + r.xp_amount, 0);
    },
    enabled: !!user,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: friendUsers } = useQuery({
    queryKey: ["leaderboard-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: friends } = await supabase
        .from("friends")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));

      const [profileRes, xpRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", friendIds),
        supabase.from("xp_logs").select("user_id, xp_amount").in("user_id", friendIds),
      ]);

      const xpMap: Record<string, number> = {};
      (xpRes.data ?? []).forEach((r) => {
        xpMap[r.user_id] = (xpMap[r.user_id] || 0) + r.xp_amount;
      });

      return (profileRes.data ?? []).map((p) => ({
        name: p.full_name || "Unknown",
        avatar: (p.full_name || "??").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        xp: xpMap[p.user_id] || 0,
        isYou: false,
        subject: "Student",
      }));
    },
    enabled: !!user,
  });

  const { data: earnedBadges } = useQuery({
    queryKey: ["user-achievements-lb", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_id, achievements(name, icon)")
        .eq("user_id", user.id)
        .limit(4);
      return data ?? [];
    },
    enabled: !!user,
  });

  const myName = myProfile?.full_name || "You";
  const myInitials = myName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const xp = myXp ?? 0;
  const level = Math.floor(xp / 200) + 1;
  const xpInLevel = xp % 200;

  const allUsers = [
    { name: myName, avatar: myInitials, xp, isYou: true, subject: "Student" },
    ...(friendUsers ?? []),
  ]
    .sort((a, b) => b.xp - a.xp)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const myRank = allUsers.find((u) => u.isYou)?.rank ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Social & Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">Compete with friends, earn badges, and climb the global ranks.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Leaderboard + Badges */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Weekly Leaderboard</h3>
                <p className="text-xs text-muted-foreground">Global Season 14 • Ends in 2d 14h</p>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
                <button
                  onClick={() => setTab("global")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tab === "global" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setTab("friends")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tab === "friends" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Friends
                </button>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[60px_1fr_1fr_100px] gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2 border-b border-border">
              <span>Rank</span>
              <span>Student</span>
              <span>Subject Mastery</span>
              <span className="text-right">XP Points</span>
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {allUsers.map((u) => (
                <div
                  key={`${u.name}-${u.rank}`}
                  className={`grid grid-cols-[60px_1fr_1fr_100px] gap-4 items-center px-2 py-3 rounded-lg ${
                    u.isYou ? "bg-accent/5 border border-accent/20" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {u.rank <= 3 && <span className="text-base">{u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : "🥉"}</span>}
                    <span className="text-sm font-bold text-muted-foreground">{u.rank}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      u.isYou ? "bg-accent text-accent-foreground" : "bg-secondary text-[hsl(var(--navy))]"
                    }`}>
                      {u.avatar}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{u.isYou ? "You" : u.name}</span>
                      {u.isYou && <span className="text-[10px] text-muted-foreground ml-1">(You)</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{u.subject}</span>
                  <span className="text-sm font-bold text-accent text-right">{u.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Your Badges</h3>
              <Link to="/achievements" className="text-xs text-accent hover:underline">View All ({earnedBadges?.length ?? 0})</Link>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {(earnedBadges ?? []).slice(0, 4).map((b: any, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-accent/20 bg-accent/5">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center">{(b.achievements as any)?.name ?? "Badge"}</span>
                </div>
              ))}
              {(earnedBadges?.length ?? 0) < 4 && Array.from({ length: 4 - (earnedBadges?.length ?? 0) }).map((_, i) => (
                <div key={`locked-${i}`} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border opacity-40">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Locked</span>
                </div>
              ))}
            </div>

            {/* Bottom stats */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Rank #{myRank}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-accent" />
                <span className="font-medium text-foreground">{xp.toLocaleString()} XP</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Flame className="h-4 w-4 text-destructive" />
                <span className="font-medium text-foreground">{streak?.current_streak ?? 0} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* XP System card */}
          <div className="bg-[hsl(var(--navy))] text-white rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Zap className="h-5 w-5 text-[hsl(var(--highlight))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">Daily Goal</span>
            </div>
            <h3 className="text-lg font-bold">XP System</h3>
            <p className="text-xs opacity-80">You're {200 - xpInLevel} XP away from level {level + 1}!</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(xpInLevel / 200) * 100}%` }} />
            </div>
          </div>

          {/* Active Streak */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Streak</div>
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-destructive" />
              <span className="text-2xl font-bold text-foreground">{streak?.current_streak ?? 0} Days</span>
            </div>
          </div>

          {/* Friend Activity */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Friend Activity</h3>
            </div>
            {(friendUsers?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {friendUsers?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-[hsl(var(--navy))] flex-shrink-0 mt-0.5">
                      {f.avatar}
                    </div>
                    <div>
                      <p className="text-xs text-foreground"><span className="font-medium">{f.name}</span> earned {f.xp} XP</p>
                      <p className="text-[10px] text-muted-foreground">Recently</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Add friends to see their activity here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
