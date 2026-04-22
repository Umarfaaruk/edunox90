import { User, Zap, Trophy, BookOpen, Clock, Flame, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const Profile = () => {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
      } catch (error) {
        console.error("[Profile] Profile load error:", error);
        throw error;
      }
    },
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["profile-stats", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      try {
        // Get XP logs
        const xpQ = query(collection(db, "xp_logs"), where("user_id", "==", user.uid));
        const xpDocs = await getDocs(xpQ);
        const totalXp = xpDocs.docs.reduce((sum, doc) => sum + (doc.data().xp_amount || 0), 0);

        // Get streak
        const streakRef = doc(db, "user_streaks", user.uid);
        const streakSnap = await getDoc(streakRef);
        const streak = streakSnap.exists() ? streakSnap.data() : { current_streak: 0, longest_streak: 0 };

        // Get quiz attempts
        const quizQ = query(collection(db, "quiz_attempts"), where("user_id", "==", user.uid));
        const quizDocs = await getDocs(quizQ);
        const quizCount = quizDocs.size;

        // Get study sessions
        const sessionsQ = query(collection(db, "study_sessions"), where("user_id", "==", user.uid));
        const sessionDocs = await getDocs(sessionsQ);
        const totalStudySeconds = sessionDocs.docs.reduce((sum, doc) => sum + (doc.data().duration_seconds || 0), 0);

        return {
          totalXp,
          level: Math.floor(totalXp / 200) + 1,
          levelProgress: totalXp % 200,
          streak: streak,
          quizCount: quizCount,
          lessonsCompleted: quizCount,
          studyHours: (totalStudySeconds / 3600).toFixed(1),
          badges: [],
        };
      } catch (error) {
        console.error("[Profile] Stats load error:", error);
        return {
          totalXp: 0,
          level: 1,
          levelProgress: 0,
          streak: { current_streak: 0 },
          quizCount: 0,
          lessonsCompleted: 0,
          studyHours: "0",
          badges: [],
        };
      }
    },
    enabled: !!user,
  });

  const isLoading = profileLoading || statsLoading;
  const displayName = profile?.full_name ?? "Student";
  const gradeLevel = profile?.grade_level ?? "—";
  const xpToNextLevel = 200;
  const levelProgress = stats?.levelProgress ?? 0;
  const levelPct = Math.round((levelProgress / xpToNextLevel) * 100);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>›</span>
        <span className="text-foreground font-medium">Profile</span>
      </div>

      {/* Profile header card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar */}
        <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-10 w-10 text-primary-foreground" />
        </div>

        <div className="flex-1 text-center sm:text-left">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-40 mb-2 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-28 mx-auto sm:mx-0" />
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {gradeLevel} · {profile?.study_preference ?? "Student"}
              </p>
            </>
          )}

          {/* XP / Level / Streak row */}
          <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start flex-wrap">
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-cta" />
              <span className="text-sm font-bold text-foreground">
                {(stats?.totalXp ?? 0).toLocaleString()} XP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Level {stats?.level ?? 1}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-sm font-bold text-foreground">
                {stats?.streak?.current_streak ?? 0} days
              </span>
            </div>
          </div>

          {/* Level progress bar */}
          {!isLoading && (
            <div className="mt-3 max-w-xs mx-auto sm:mx-0">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Level {stats?.level ?? 1}</span>
                <span>{levelProgress} / {xpToNextLevel} XP to Level {(stats?.level ?? 1) + 1}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Link to="/settings">
          <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
            <Settings className="h-4 w-4" /> Edit Profile
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen,  label: "Lessons Done",   value: stats?.lessonsCompleted ?? 0,  color: "text-primary" },
          { icon: Trophy,    label: "Quizzes Taken",  value: stats?.quizCount ?? 0,          color: "text-cta" },
          { icon: Clock,     label: "Study Hours",    value: `${stats?.studyHours ?? "0.0"}h`, color: "text-success" },
          { icon: Flame,     label: "Best Streak",    value: `${stats?.streak?.longest_streak ?? 0}d`, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-5 mx-auto mb-2" />
                <Skeleton className="h-6 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </>
            ) : (
              <>
                <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent badges */}
      {(stats?.badges?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Recent Achievements</h3>
            <Link to="/achievements" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats?.badges?.slice(0, 4).map((b) => (
              <div
                key={(b as { achievement_id: string }).achievement_id}
                className="bg-muted rounded-lg p-3 text-center"
              >
                <div className="text-2xl mb-1">
                  {(b as { achievements?: { icon?: string } }).achievements?.icon ?? "🏆"}
                </div>
                <div className="text-xs font-medium text-foreground truncate">
                  {(b as { achievements?: { name?: string } }).achievements?.name ?? "Badge"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/progress"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group"
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">View Progress</div>
            <div className="text-xs text-muted-foreground">Detailed analytics</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
        </Link>

        <Link
          to="/achievements"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group"
        >
          <div className="h-9 w-9 rounded-lg bg-cta/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-cta" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Achievements</div>
            <div className="text-xs text-muted-foreground">Badges & rewards</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-cta transition-colors" />
        </Link>
      </div>
    </div>
  );
};

export default Profile;
