import { Clock, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Calendar, FileText, Flame, BarChart3, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const ProgressDashboard = () => {
  const { streak, avgScore, progressAnalytics, weakTopics, isLoading } = useDashboardData();

  const totalHours = (progressAnalytics.monthSeconds / 3600).toFixed(1);
  const weekHours = (progressAnalytics.weekSeconds / 3600).toFixed(1);
  const todayMinutes = Math.round(progressAnalytics.todaySeconds / 60);
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const chartData = progressAnalytics.chartData;
  const dayWiseRecords = progressAnalytics.dayWiseRecords;
  const sessionCount = progressAnalytics.sessionCount ?? 0;
  const avgSessionMinutes = progressAnalytics.avgSessionMinutes ?? 0;

  // Week-over-week change
  const prevWeekHours = (progressAnalytics.prevWeekSeconds ?? 0) / 3600;
  const weekChange = prevWeekHours > 0
    ? Math.round(((progressAnalytics.weekSeconds / 3600 - prevWeekHours) / prevWeekHours) * 100)
    : 0;

  const maxHours = Math.max(...(chartData?.map((d: any) => d.hours) ?? [1]), 0.5);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>›</span>
        <span className="text-foreground font-medium">Progress & Analytics</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Your Learning Journey</h1>
          <p className="text-muted-foreground text-sm mt-1">Detailed breakdown of your study habits and academic performance.</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">Last 30 Days</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <Skeleton className="h-4 w-4 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : [
              {
                icon: Clock,
                label: "This Month",
                value: `${totalHours}h`,
                badge: null,
                badgeColor: "text-accent bg-accent/10",
              },
              {
                icon: weekChange >= 0 ? TrendingUp : TrendingDown,
                label: "This Week",
                value: `${weekHours}h`,
                badge: weekChange !== 0 ? `${weekChange > 0 ? "+" : ""}${weekChange}% vs LW` : null,
                badgeColor: weekChange >= 0 ? "text-accent bg-accent/10" : "text-destructive bg-destructive/10",
              },
              {
                icon: Calendar,
                label: "Today",
                value: `${todayMinutes}m`,
                badge: "Auto tracked",
                badgeColor: "text-accent bg-accent/10",
              },
              {
                icon: Flame,
                label: "Day Streak",
                value: `${currentStreak}`.padStart(2, "0"),
                badge: longestStreak > 0 ? `Record ${longestStreak}` : null,
                badgeColor: "text-accent bg-accent/10",
              },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className="h-4 w-4 text-accent" />
                  {s.badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                      {s.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold text-foreground mt-0.5">{s.value}</div>
              </div>
            ))}
      </div>

      {/* Productivity metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Total Sessions</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{sessionCount}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Avg Session</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{avgSessionMinutes}m</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Avg Quiz Score</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{avgScore ?? 0}%</div>
        </div>
      </div>

      {/* Main grid: Chart + AI Insights */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Study Hours chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Weekly Study Hours</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Time spent in focused study sessions</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />Current Week</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-44">
            {(chartData ?? Array.from({ length: 7 }, (_, i) => ({ day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], hours: 0 }))).map((d: any) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-[10px] text-muted-foreground font-medium">{d.hours > 0 ? `${d.hours}h` : ""}</div>
                <div className="w-full rounded-t-lg relative" style={{ height: `${Math.max((d.hours / maxHours) * 100, 4)}%` }}>
                  <div className={`absolute inset-0 rounded-t-lg ${d.hours > 0 ? "bg-accent/80" : "bg-muted/40"}`} />
                </div>
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Smart Insights */}
        <div className="bg-[hsl(var(--navy))] text-white rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[hsl(var(--highlight))]" />
            <h3 className="font-semibold">AI Smart Insights</h3>
          </div>
          {todayMinutes > 0 || sessionCount > 0 ? (
            <>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider mb-1">Productivity</div>
                <p className="text-xs opacity-90">
                  {todayMinutes >= 30
                    ? "Great focus today! You've studied for over 30 minutes. Keep up the momentum!"
                    : todayMinutes > 0
                    ? `You've studied ${todayMinutes} minutes today. Try to reach 30 minutes for optimal learning.`
                    : "Start a study session today to maintain your streak!"}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider mb-1">Consistency</div>
                <p className="text-xs opacity-90">
                  {currentStreak >= 7
                    ? `🔥 Amazing ${currentStreak}-day streak! You're building a powerful learning habit.`
                    : currentStreak >= 3
                    ? `Good ${currentStreak}-day streak! Keep going to build long-term retention.`
                    : "Consistency is key to learning. Try to study every day, even just 10 minutes."}
                </p>
              </div>
              {weekChange !== 0 && (
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <div className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider mb-1">Trend</div>
                  <p className="text-xs opacity-90">
                    {weekChange > 0
                      ? `📈 You studied ${weekChange}% more this week compared to last week. Excellent progress!`
                      : `📉 Study time decreased by ${Math.abs(weekChange)}% this week. Consider setting a daily goal.`}
                  </p>
                </div>
              )}
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm">
                <Link to="/timer">Start Study Session</Link>
              </Button>
            </>
          ) : (
            <p className="text-xs opacity-80">Complete study sessions and quizzes to receive personalized insights about your learning patterns.</p>
          )}
        </div>
      </div>

      {/* Day-wise records */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-1">Day-wise Study Records (Last 30 Days)</h3>
        <p className="text-xs text-muted-foreground mb-4">Track daily consistency and study patterns.</p>
        {(dayWiseRecords ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dayWiseRecords.map((entry: { date: string; minutes: number; sessions?: number }) => (
              <div key={entry.date} className="rounded-lg border border-border px-4 py-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">{entry.date}</div>
                  {entry.sessions && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {entry.sessions} session{entry.sessions !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{entry.minutes} minutes studied</div>
                {/* Mini progress bar */}
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(100, (entry.minutes / 60) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No study records yet. Start the timer from dashboard.</p>
        )}
      </div>

      {/* Bottom grid: Subject Mastery + Recent Sessions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subject Mastery */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Subject Mastery</h3>
            <Link to="/lessons" className="text-xs text-accent hover:underline">View All</Link>
          </div>
          {(weakTopics ?? []).length > 0 ? (
            weakTopics.map((t: any) => (
              <div key={t.topic} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">{t.topic}</span>
                  <span className="text-accent font-semibold">{t.avgScore}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      t.avgScore >= 80 ? "bg-accent" : t.avgScore >= 50 ? "bg-[hsl(var(--highlight))]" : "bg-destructive/60"
                    }`}
                    style={{ width: `${t.avgScore}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Take quizzes to see your mastery levels.</p>
          )}
        </div>

        {/* Study Insights */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Study Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Study Time</span>
              <span className="font-semibold text-foreground">{totalHours}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This Week</span>
              <span className="font-semibold text-foreground">{weekHours}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-semibold text-foreground">{sessionCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Session</span>
              <span className="font-semibold text-foreground">{avgSessionMinutes}m</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Streak</span>
              <span className="font-semibold text-foreground">{currentStreak} days 🔥</span>
            </div>
          </div>
          <Link to="/timer" className="text-xs text-accent hover:underline block mt-4">Start New Session →</Link>
        </div>
      </div>

      {/* Weak topics alert */}
      {(weakTopics?.length ?? 0) > 0 && (
        <div className="bg-secondary/50 border border-accent/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <span className="font-semibold text-sm text-foreground">Needs Attention</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {weakTopics?.map((t: any) => (
              <div key={t.topic} className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                {t.topic} — {t.avgScore}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
