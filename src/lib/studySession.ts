import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}

interface SaveSessionResult {
  xp: number;
  newStreak: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const dayDiff = (a: string, b: string) => {
  const first = new Date(`${a}T00:00:00Z`).getTime();
  const second = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((first - second) / DAY_MS);
};

export async function saveStudySession(
  userId: string,
  startedAt: string,
  durationSeconds: number,
  currentStreak: StreakData | null
): Promise<SaveSessionResult> {
  const xp = Math.floor(durationSeconds / 60) * 5;
  const now = new Date();
  const todayKey = toDateKey(now);

  await addDoc(collection(db, "study_sessions"), {
    user_id: userId,
    started_at: startedAt,
    ended_at: now.toISOString(),
    duration_seconds: durationSeconds,
    created_at: serverTimestamp(),
  });

  if (xp > 0) {
    await addDoc(collection(db, "xp_logs"), {
      user_id: userId,
      xp_amount: xp,
      source_type: "study_session",
      created_at: serverTimestamp(),
    });
  }

  const streakRef = doc(db, "user_streaks", userId);
  const streakSnap = await getDoc(streakRef);
  const streakData = (streakSnap.exists() ? (streakSnap.data() as StreakData) : currentStreak) ?? {
    current_streak: 0,
    longest_streak: 0,
    last_study_date: null,
  };

  let newStreak = streakData.current_streak ?? 0;
  const lastDate = streakData.last_study_date;

  if (!lastDate) {
    newStreak = 1;
  } else {
    const diff = dayDiff(todayKey, lastDate);
    if (diff === 0) {
      newStreak = streakData.current_streak;
    } else if (diff === 1) {
      newStreak = streakData.current_streak + 1;
    } else {
      newStreak = 1;
    }
  }

  await setDoc(
    streakRef,
    {
      current_streak: newStreak,
      longest_streak: Math.max(streakData.longest_streak ?? 0, newStreak),
      last_study_date: todayKey,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );

  const profileRef = doc(db, "profiles", userId);
  await setDoc(profileRef, { total_xp: increment(xp), updated_at: serverTimestamp() }, { merge: true });

  return { xp, newStreak };
}

/**
 * awardXP — stubbed for Firebase migration
 */
export async function awardXP(
  userId: string,
  amount: number,
  sourceType: "quiz" | "lesson" | "study_session" | "achievement" | "daily_login"
): Promise<void> {
  await addDoc(collection(db, "xp_logs"), {
    user_id: userId,
    xp_amount: amount,
    source_type: sourceType,
    created_at: serverTimestamp(),
  });
  await setDoc(doc(db, "profiles", userId), { total_xp: increment(amount), updated_at: serverTimestamp() }, { merge: true });
}
