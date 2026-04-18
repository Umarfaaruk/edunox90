import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const DoubtSession = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["doubt-session", id],
    queryFn: async () => {
      if (!user || !id) return [];
      const { data } = await supabase
        .from("doubt_messages")
        .select("*")
        .eq("doubt_session_id", id)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!user && !!id,
  });

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
      return <p key={i} className="text-sm text-muted-foreground mt-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link to="/doubts/history" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to History
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : messages?.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">No messages found for this session.</p>
      ) : (
        messages?.map((msg) => (
          <div key={msg.id} className={`bg-card border border-border rounded-xl p-5 space-y-2 ${msg.role === "user" ? "" : ""}`}>
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              {msg.role === "user" ? (
                <>
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Your Question</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-foreground">AI Solution</span>
                </>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {msg.role === "user" ? (
              <p className="text-sm text-foreground font-medium">{msg.message_text}</p>
            ) : (
              <div className="space-y-1">{renderMarkdown(msg.message_text)}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default DoubtSession;
