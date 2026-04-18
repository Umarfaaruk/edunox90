import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const DAY_MS = 24 * 60 * 60 * 1000;
const shortDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const startOfWeek = (date: Date) => {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
};

export const useDashboardData = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const docRef = doc(db, "profiles", user.uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    },
    enabled: !!user,
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const docRef = doc(db, "user_streaks", user.uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : { current_streak: 0 };
    },
    enabled: !!user,
  });

  const { data: totalXp } = useQuery({
    queryKey: ["totalXp", user?.uid],
    queryFn: async () => {
      if (!user) return 0;
      const q = query(collection(db, "xp_logs"), where("user_id", "==", user.uid));
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => {
        total += doc.data().xp_amount || 0;
      });
      return total;
    },
    enabled: !!user,
  });

  const { data: studyTime } = useQuery({
    queryKey: ["studyTime", user?.uid],
    queryFn: async () => {
      if (!user) return "0h";
      const q = query(collection(db, "study_sessions"), where("user_id", "==", user.uid));
      const querySnapshot = await getDocs(q);
      let totalSeconds = 0;
      querySnapshot.forEach((doc) => {
        totalSeconds += doc.data().duration_seconds || 0;
      });
      const hours = (totalSeconds / 3600).toFixed(1);
      return `${hours}h`;
    },
    enabled: !!user,
  });

  const { data: progressAnalytics } = useQuery({
    queryKey: ["progressAnalytics", user?.uid],
    queryFn: async () => {
      if (!user) {
        return {
          todaySeconds: 0,
          weekSeconds: 0,
          monthSeconds: 0,
          chartData: shortDay.slice(1).concat(shortDay[0]).map((day) => ({ day, hours: 0 })),
          dayWiseRecords: [] as Array<{ date: string; minutes: number }>,
        };
      }

      const sessionsQuery = query(collection(db, "study_sessions"), where("user_id", "==", user.uid));
      const snapshot = await getDocs(sessionsQuery);
      const now = new Date();
      const todayKey = toDateKey(now);
      const weekStart = startOfWeek(now).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const sevenDaysAgo = now.getTime() - 6 * DAY_MS;

      let todaySeconds = 0;
      let weekSeconds = 0;
      let monthSeconds = 0;
      const byDate = new Map<string, number>();

      snapshot.forEach((item) => {
        const data = item.data();
        const duration = Number(data.duration_seconds ?? 0);
        const date = data.ended_at ? new Date(data.ended_at) : data.created_at?.toDate?.() ?? null;
        if (!date || Number.isNaN(date.getTime())) return;

        const key = toDateKey(date);
        byDate.set(key, (byDate.get(key) ?? 0) + duration);

        if (key === todayKey) todaySeconds += duration;
        if (date.getTime() >= weekStart) weekSeconds += duration;
        if (date.getTime() >= monthStart) monthSeconds += duration;
      });

      const chartData = Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(sevenDaysAgo + idx * DAY_MS);
        const key = toDateKey(date);
        return {
          day: shortDay[date.getDay()],
          hours: Number(((byDate.get(key) ?? 0) / 3600).toFixed(1)),
        };
      });

      const dayWiseRecords = Array.from(byDate.entries())
        .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

      return { todaySeconds, weekSeconds, monthSeconds, chartData, dayWiseRecords };
    },
    enabled: !!user,
  });

  const { data: avgScore } = useQuery({
    queryKey: ["avgScore", user?.uid],
    queryFn: async () => {
      if (!user) return 0;
      const q = query(collection(db, "quiz_attempts"), where("user_id", "==", user.uid));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return 0;
      let totalPct = 0;
      let count = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.total_questions > 0) {
          totalPct += (data.score / data.total_questions);
          count++;
        }
      });
      return count > 0 ? Math.round((totalPct / count) * 100) : 0;
    },
    enabled: !!user,
  });

  const continueLearning: any[] = [];
  const weakTopics: any[] = [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return {
    profile,
    streak,
    totalXp: totalXp ?? 0,
    studyTime: studyTime ?? "0h",
    avgScore: avgScore ?? null,
    progressAnalytics: progressAnalytics ?? {
      todaySeconds: 0,
      weekSeconds: 0,
      monthSeconds: 0,
      chartData: shortDay.slice(1).concat(shortDay[0]).map((day) => ({ day, hours: 0 })),
      dayWiseRecords: [],
    },
    continueLearning,
    weakTopics,
    greeting: greeting(),
  };
};