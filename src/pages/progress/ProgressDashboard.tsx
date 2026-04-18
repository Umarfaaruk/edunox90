import { Clock, TrendingUp, AlertTriangle, Lightbulb, Calendar, FileText, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const ProgressDashboard = () => {
  const { streak, avgScore, progressAnalytics, weakTopics } = useDashboardData();
  const data: any = {
    totalHours: (progressAnalytics.monthSeconds / 3600).toFixed(1),
    weekHours: (progressAnalytics.weekSeconds / 3600).toFixed(1),
    todayMinutes: Math.round(progressAnalytics.todaySeconds / 60),
    avgScore: avgScore ?? 0,
    chartData: progressAnalytics.chartData,
    mastery: [],
    weakTopics: weakTopics ?? [],
    studyChange: 0,
    masteryChange: 0,
    streak: streak ?? { current_streak: 0, longest_streak: 0 },
    badgeCount: 0,
    recentQuizzes: [],
    dayWiseRecords: progressAnalytics.dayWiseRecords,
  };
  const isLoading = false;

  const maxHours = Math.max(...(data?.chartData?.map((d: any) => d.hours) ?? [1]), 0.5);

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
                value: `${data?.totalHours}h`,
                badge: data?.studyChange ? `${data.studyChange > 0 ? "+" : ""}${data.studyChange}% vs LW` : null,
                badgeColor: (data?.studyChange ?? 0) >= 0 ? "text-accent bg-accent/10" : "text-destructive bg-destructive/10",
              },
              {
                icon: TrendingUp,
                label: "This Week",
                value: `${data?.weekHours}h`,
                badge: null,
                badgeColor: "text-accent bg-accent/10",
              },
              {
                icon: Calendar,
                label: "Today",
                value: `${data?.todayMinutes}m`,
                badge: "Auto tracked",
                badgeColor: "text-accent bg-accent/10",
              },
              {
                icon: Flame,
                label: "Day Streak",
                value: `${data?.streak?.current_streak ?? 0}`.padStart(2, "0"),
                badge: data?.streak ? `Record ${data.streak.longest_streak ?? 0}` : null,
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
            {(data?.chartData ?? Array.from({ length: 7 }, (_, i) => ({ day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], hours: 0 }))).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg relative" style={{ height: `${Math.max((d.hours / maxHours) * 100, 4)}%` }}>
                  <div className="absolute inset-0 bg-accent/80 rounded-t-lg" />
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
          {(data?.weakTopics?.length ?? 0) > 0 ? (
            <>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider mb-1">Observation</div>
                <p className="text-xs opacity-90">
                  Your performance in {data?.weakTopics?.[0]?.subject ?? "a subject"} dropped this week. Consider reviewing key concepts.
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-[10px] font-bold text-[hsl(var(--highlight))] uppercase tracking-wider mb-1">Action Plan</div>
                <p className="text-xs opacity-90">
                  Try a 30-min focused session on your weakest topic when your focus usually peaks.
                </p>
              </div>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm">
                <Link to="/timer">Start Recommended Session</Link>
              </Button>
            </>
          ) : (
            <p className="text-xs opacity-80">Complete more quizzes to receive personalized insights about your learning patterns.</p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-1">Day-wise Study Records (Last 30 Days)</h3>
        <p className="text-xs text-muted-foreground mb-4">Parents can monitor daily consistency from this log.</p>
        {(data?.dayWiseRecords ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.dayWiseRecords.map((entry: { date: string; minutes: number }) => (
              <div key={entry.date} className="rounded-lg border border-border px-4 py-3 bg-muted/30">
                <div className="text-sm font-medium text-foreground">{entry.date}</div>
                <div className="text-xs text-muted-foreground mt-1">{entry.minutes} minutes studied</div>
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
          {(data?.mastery ?? []).map((s) => (
            <div key={s.subject} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">{s.subject}</span>
                <span className="text-accent font-semibold">{s.pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.pct >= 80 ? "bg-accent" : s.pct >= 50 ? "bg-[hsl(var(--highlight))]" : "bg-destructive/60"
                  }`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
          {(data?.mastery ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No subjects found yet.</p>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Recent Sessions</h3>
          {(data?.recentQuizzes ?? []).length > 0 ? (
            <div className="space-y-3">
              {data?.recentQuizzes?.map((q, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-[hsl(var(--navy))]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{q.title}</div>
                    <div className="text-xs text-muted-foreground">{q.date}</div>
                    <span className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${
                      q.score >= 80 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                    }`}>
                      {q.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
          <Link to="/progress" className="text-xs text-accent hover:underline block">View Full History</Link>
        </div>
      </div>

      {/* Weak topics alert */}
      {(data?.weakTopics?.length ?? 0) > 0 && (
        <div className="bg-secondary/50 border border-accent/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <span className="font-semibold text-sm text-foreground">Needs Attention</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {data?.weakTopics?.map((t) => (
              <div key={t.subject} className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                {t.subject} — {t.pct}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
