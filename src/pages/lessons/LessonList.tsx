import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Search, Calculator, Atom, FlaskConical, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const iconMap: Record<string, React.ReactNode> = {
  calculator:     <Calculator    className="h-5 w-5 text-primary" />,
  atom:           <Atom          className="h-5 w-5 text-primary" />,
  "flask-conical":<FlaskConical  className="h-5 w-5 text-primary" />,
  leaf:           <Leaf          className="h-5 w-5 text-primary" />,
};

const LessonList = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Stubbed data for Firebase migration
  const subjects: any[] = [];
  const topics: any[] = [];
  const isLoading = false;


  const subjectNames = ["All", ...(subjects?.map((s) => s.name) ?? [])];
  const filtered = (topics ?? []).filter(
    (t) =>
      (filter === "All" || t.subjectName === filter) &&
      t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Lessons</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse topics and continue learning</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjectNames.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Topic list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-card border border-border rounded-xl p-5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-1.5 w-full max-w-xs" />
                </div>
              </div>
            ))
          : filtered.map((t) => (
              <Link
                key={t.id}
                to={`/lessons/${t.id}`}
                className="flex items-center gap-4 bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {iconMap[t.subjectIcon] ?? <BookOpen className="h-5 w-5 text-primary" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.subjectName} · {t.completedLessons}/{t.totalLessons} lessons
                  </div>
                  {/* Progress bar — success green */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2 w-full max-w-xs">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>

                {/* Completion % */}
                <span className={`text-xs font-bold ${t.pct === 100 ? "text-success" : "text-muted-foreground"}`}>
                  {t.pct}%
                </span>

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics found for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonList;
