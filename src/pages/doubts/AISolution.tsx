import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Gamepad2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SOLVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solve-doubt`;

const AISolution = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const question = (location.state as any)?.question as string | undefined;
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamed = useRef(false);

  useEffect(() => {
    if (!question) {
      navigate("/doubts", { replace: true });
      return;
    }
    if (streamed.current) return;
    streamed.current = true;

    const run = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        // Send user's auth token so edge function can persist
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        } else {
          headers["Authorization"] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
        }

        const resp = await fetch(SOLVE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ question }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "AI service error" }));
          throw new Error(err.error || `Error ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                full += content;
                setAnswer(full);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // flush
        if (buffer.trim()) {
          for (const raw of buffer.split("\n")) {
            if (!raw.startsWith("data: ")) continue;
            const json = raw.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const p = JSON.parse(json);
              const c = p.choices?.[0]?.delta?.content;
              if (c) { full += c; setAnswer(full); }
            } catch {}
          }
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [question, navigate, session]);

  const renderMarkdown = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("## 💡")) return <h3 key={i} className="text-base font-semibold text-foreground mt-6 flex items-center gap-2">💡 {line.slice(5).trim()}</h3>;
      if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-semibold text-foreground mt-6">{line.slice(3)}</h3>;
      if (line.startsWith("### ")) return <h4 key={i} className="text-base font-semibold text-foreground mt-4">{line.slice(4)}</h4>;
      if (line.startsWith("```")) return null;
      if (line.trim() === "") return <br key={i} />;
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)?.[1];
        const rest = line.replace(/^\d+\.\s*/, "");
        return (
          <div key={i} className="flex gap-3 mt-2">
            <div className="h-6 w-6 rounded-full bg-navy text-highlight flex items-center justify-center flex-shrink-0 text-xs font-bold">{num}</div>
            <span className="text-sm text-muted-foreground">{rest}</span>
          </div>
        );
      }
      if (line.startsWith("- ")) return <li key={i} className="text-sm text-muted-foreground ml-4 mt-1">• {line.slice(2)}</li>;
      if (/^[A-Za-z].*[=+\-*/]/.test(line.trim()) && line.trim().length < 60) {
        return <div key={i} className="font-mono text-sm text-accent bg-muted px-3 py-1 rounded mt-1">{line}</div>;
      }
      return <p key={i} className="text-sm text-muted-foreground mt-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link to="/doubts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Ask another doubt
      </Link>

      {question && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs text-muted-foreground mb-2">Your Question</div>
          <p className="text-sm text-foreground font-medium">{question}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-sm text-foreground">Step-by-Step Solution</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : answer ? (
          <div className="space-y-1">{renderMarkdown(answer)}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Thinking...
          </div>
        ) : null}
      </div>

      {!loading && !error && (
        <div className="flex gap-3">
          <Link to="/doubts" className="flex-1">
            <Button variant="outline" className="w-full">Ask Another Doubt</Button>
          </Link>
          <Link to="/quiz" className="flex-1">
            <Button className="w-full bg-navy text-highlight hover:bg-navy/90 gap-2">
              <Gamepad2 className="h-4 w-4" /> Practice This Topic
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AISolution;
