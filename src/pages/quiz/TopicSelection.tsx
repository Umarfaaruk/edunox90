import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, Search, Calculator, Atom, FlaskConical, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ReactNode> = {
  calculator:      <Calculator    className="h-5 w-5 text-primary" />,
  atom:            <Atom          className="h-5 w-5 text-primary" />,
  "flask-conical": <FlaskConical  className="h-5 w-5 text-primary" />,
  leaf:            <Leaf          className="h-5 w-5 text-primary" />,
};

const TopicSelection = () => {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Starter topics — these provide immediate functionality
  // Can be replaced with Firestore queries once the topics collection is set up
  const subjects = [
    { id: "math", name: "Mathematics" },
    { id: "science", name: "Science" },
    { id: "cs", name: "Computer Science" },
    { id: "english", name: "English" },
  ];
  const topics = [
    { id: "algebra", title: "Algebra Fundamentals", subjectName: "Mathematics", subjectIcon: "calculator" },
    { id: "calculus", title: "Calculus Basics", subjectName: "Mathematics", subjectIcon: "calculator" },
    { id: "geometry", title: "Geometry & Trigonometry", subjectName: "Mathematics", subjectIcon: "calculator" },
    { id: "physics-mechanics", title: "Physics: Mechanics", subjectName: "Science", subjectIcon: "atom" },
    { id: "physics-electro", title: "Physics: Electricity & Magnetism", subjectName: "Science", subjectIcon: "atom" },
    { id: "chemistry-basics", title: "Chemistry Fundamentals", subjectName: "Science", subjectIcon: "flask-conical" },
    { id: "biology-cells", title: "Biology: Cell Structure", subjectName: "Science", subjectIcon: "leaf" },
    { id: "python-basics", title: "Python Programming", subjectName: "Computer Science", subjectIcon: "calculator" },
    { id: "data-structures", title: "Data Structures", subjectName: "Computer Science", subjectIcon: "calculator" },
    { id: "essay-writing", title: "Essay Writing Skills", subjectName: "English", subjectIcon: "calculator" },
    { id: "grammar", title: "Grammar & Punctuation", subjectName: "English", subjectIcon: "calculator" },
    { id: "world-history", title: "World History Overview", subjectName: "English", subjectIcon: "calculator" },
  ];
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
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Practice Quiz</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a topic to start an AI-generated quiz
        </p>
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

      {/* Topic grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full mt-4" />
              </div>
            ))
          : filtered.map((t) => (
              <div
                key={t.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {iconMap[t.subjectIcon] ?? <Gamepad2 className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.subjectName}
                      {(t as { lesson_count?: number }).lesson_count
                        ? ` · ${(t as { lesson_count?: number }).lesson_count} lessons`
                        : ""}
                    </div>
                  </div>
                </div>
                {/* ✅ EduOnx: CTA = Amber */}
                <Link
                  to={`/quiz/${t.id}`}
                  state={{ topicTitle: t.title, subjectName: t.subjectName }}
                >
                  <Button
                    size="sm"
                    className="w-full bg-cta text-cta-foreground hover:bg-cta/90 text-xs font-semibold"
                  >
                    Start Quiz
                  </Button>
                </Link>
              </div>
            ))}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <Gamepad2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSelection;
