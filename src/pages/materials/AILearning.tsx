import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Send, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const QUERY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-material`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AILearning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: material } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("materials").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (material && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `I've analyzed **${material.file_name}**. Ask me anything about this document, or I can help you summarize, explain concepts, or create study notes!`,
      }]);
    }
  }, [material]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!question.trim() || streaming || !id || !session) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setStreaming(true);

    let full = "";
    const updateAssistant = (text: string) => {
      full = text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
        }
        return [...prev, { role: "assistant", content: text }];
      });
    };

    try {
      const resp = await fetch(QUERY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ materialId: id, question: userMsg.content }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "AI error");
      }

      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            if (content) updateAssistant(full + content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message);
      updateAssistant("Sorry, I encountered an error. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  if (!material) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto text-center py-20">
        <p className="text-muted-foreground text-sm">Material not found.</p>
        <Link to="/materials" className="text-accent hover:underline text-sm mt-2 inline-block">← Back to Materials</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link to="/materials" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Materials
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
          <FileText className="h-5 w-5 text-navy" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{material.file_name}</h1>
          <p className="text-xs text-muted-foreground">AI-powered Q&A</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 min-h-[400px] max-h-[500px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-muted text-foreground"
                : "bg-navy text-highlight"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_a]:text-accent [&_a]:underline">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-navy rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-highlight" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ask a question about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="h-10"
          disabled={streaming}
        />
        <Button
          onClick={handleSend}
          disabled={!question.trim() || streaming}
          size="icon"
          className="bg-navy text-highlight hover:bg-navy/90 h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AILearning;
