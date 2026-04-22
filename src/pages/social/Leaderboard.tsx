import { Trophy, Zap, Flame, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const Leaderboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"global" | "friends">("global");

  const { data: myXp } = useQuery({
    queryKey: ["my-xp", user?.uid],
    queryFn: async () => {
      if (!user) return 0;
      const q = query(collection(db, "xp_logs"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      let total = 0;
      snap.forEach((d) => { total += d.data().xp_amount || 0; });
      return total;
    },
    enabled: !!user,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const docRef = doc(db, "profiles", user.uid);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!user,
  });

  const { data: streak } = useQuery({
    queryKey: ["streak-lb", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const docRef = doc(db, "user_streaks", user.uid);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : { current_streak: 0 };
    },
    enabled: !!user,
  });

  // Global leaderboard: top XP users
  const { data: globalUsers } = useQuery({
    queryKey: ["leaderboard-global"],
    queryFn: async () => {
      try {
        const q = query(collection(db, "profiles"), orderBy("total_xp", "desc"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map((d, i) => {
          const data = d.data();
          const name = data.full_name || "Student";
          return {
            name,
            avatar: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            xp: data.total_xp || 0,
            isYou: d.id === user?.uid,
            subject: "Student",
            rank: i + 1,
          };
        });
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const myName = myProfile?.full_name || user?.displayName || "You";
  const myInitials = myName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const xp = myXp ?? 0;
  const level = Math.floor(xp / 200) + 1;
  const xpInLevel = xp % 200;

  // If user not in global list, add them
  const displayUsers = tab === "global"
    ? (() => {
        const list = globalUsers ?? [];
        if (list.length > 0 && !list.find((u) => u.isYou)) {
          const withMe = [...list, { name: myName, avatar: myInitials, xp, isYou: true, subject: "Student", rank: list.length + 1 }];
          return withMe.sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));
        }
        return list;
      })()
    : [{ name: myName, avatar: myInitials, xp, isYou: true, subject: "Student", rank: 1 }];

  const myRank = displayUsers.find((u) => u.isYou)?.rank ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Social & Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">Compete with friends, earn badges, and climb the global ranks.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Weekly Leaderboard</h3>
                <p className="text-xs text-muted-foreground">Top learners by XP</p>
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

            <div className="grid grid-cols-[60px_1fr_1fr_100px] gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2 border-b border-border">
              <span>Rank</span>
              <span>Student</span>
              <span>Level</span>
              <span className="text-right">XP Points</span>
            </div>

            <div className="space-y-1">
              {displayUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data yet. Start studying to appear on the leaderboard!</p>
              ) : (
                displayUsers.map((u) => (
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
                    <span className="text-xs text-muted-foreground">Level {Math.floor(u.xp / 200) + 1}</span>
                    <span className="text-sm font-bold text-accent text-right">{u.xp.toLocaleString()} XP</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <div className="bg-[hsl(var(--navy))] text-white rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Zap className="h-5 w-5 text-[hsl(var(--highlight))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">Level {level}</span>
            </div>
            <h3 className="text-lg font-bold">XP System</h3>
            <p className="text-xs opacity-80">You're {200 - xpInLevel} XP away from level {level + 1}!</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(xpInLevel / 200) * 100}%` }} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Streak</div>
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-destructive" />
              <span className="text-2xl font-bold text-foreground">{streak?.current_streak ?? 0} Days</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Your Stats</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total XP</span>
                <span className="font-bold text-foreground">{xp.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-bold text-foreground">#{myRank}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Level</span>
                <span className="font-bold text-foreground">{level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
