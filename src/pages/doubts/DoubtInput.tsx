import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, BookOpen, Calculator, Atom, History, Paperclip, Image, X, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf", "text/plain"];

const DoubtInput = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent doubts from Firestore
  const { data: history } = useQuery({
    queryKey: ["recent-doubts", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(
          collection(db, "doubt_sessions"),
          where("user_id", "==", user.uid),
          orderBy("created_at", "desc"),
          limit(5)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        } as {
          id: string;
          user_id: string;
          created_at: string;
          [key: string]: any;
        }));
      } catch (indexErr: any) {
        if (indexErr?.code === "failed-precondition" || indexErr?.message?.includes("index")) {
          console.warn("[DoubtInput] Composite index missing, falling back to client-side sort");
          try {
            const qFallback = query(
              collection(db, "doubt_sessions"),
              where("user_id", "==", user.uid)
            );
            const snapFallback = await getDocs(qFallback);
            return snapFallback.docs
              .map((d) => ({ id: d.id, ...d.data() } as { id: string; user_id: string; created_at: string; [key: string]: any }))
              .sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
              })
              .slice(0, 5);
          } catch {
            return [];
          }
        }
        console.error("[DoubtInput] Recent doubts fetch error:", indexErr);
        return [];
      }
    },
    enabled: !!user,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use images (JPEG, PNG, WebP) or PDF files.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setAttachedFile(file);

    // Generate preview for images
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!question.trim() && !attachedFile) return;

    // For image attachments, redirect to camera Q&A flow with the image
    if (attachedFile && ALLOWED_IMAGE_TYPES.includes(attachedFile.type) && filePreview) {
      navigate("/doubts/camera", { 
        state: { 
          preloadedImage: filePreview, 
          preloadedQuestion: question.trim() 
        } 
      });
      return;
    }

    // For text questions (with or without PDF context), use the standard solution flow
    if (question.trim()) {
      let fullQuestion = question.trim();
      
      // If a PDF is attached, note it in the question context
      if (attachedFile && attachedFile.type === "application/pdf") {
        fullQuestion = `[Attached file: ${attachedFile.name}]\n\n${fullQuestion}`;
      }
      
      navigate("/doubts/solution", { state: { question: fullQuestion } });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Ask a Doubt</h1>
          <p className="text-muted-foreground text-sm mt-1">Get step-by-step explanations from AI</p>
        </div>
        {(history?.length ?? 0) > 0 && (
          <Link to="/doubts/history" className="text-xs text-accent hover:underline flex items-center gap-1">
            <History className="h-3.5 w-3.5" /> View All
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-sm text-foreground">AI Doubt Solver</span>
        </div>

        <Textarea
          placeholder="Type your question here... e.g. 'How do I find the derivative of sin(x)?'"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-[120px] resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (question.trim() || attachedFile)) { e.preventDefault(); handleSubmit(); } }}
        />

        {/* File attachment preview */}
        {attachedFile && (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 border border-border">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-destructive/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-destructive" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{attachedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(attachedFile.size / 1024).toFixed(1)} KB · {attachedFile.type.split("/")[1]?.toUpperCase()}</p>
            </div>
            <button onClick={clearAttachment} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Attachment buttons */}
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
            className="hidden" 
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
            title="Attach image or PDF"
          >
            <Paperclip className="h-4 w-4" />
            <span className="hidden sm:inline">Attach</span>
          </button>
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
                fileInputRef.current.click();
                // Reset accept after click
                setTimeout(() => {
                  if (fileInputRef.current) fileInputRef.current.accept = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain";
                }, 100);
              }
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
            title="Upload image"
          >
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Image</span>
          </button>

          <div className="flex-1" />
          <Button
            onClick={handleSubmit}
            className="gap-2 bg-navy text-highlight hover:bg-navy/90 font-semibold"
            disabled={!question.trim() && !attachedFile}
          >
            <Send className="h-4 w-4" /> Get Solution
          </Button>
        </div>
      </div>

      {/* Quick subject shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Calculator, label: "Math", color: "bg-secondary text-navy" },
          { icon: Atom, label: "Science", color: "bg-accent/10 text-accent" },
          { icon: BookOpen, label: "English", color: "bg-secondary text-navy" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setQuestion(`Help me with ${s.label}: `)}
            className="bg-card border border-border rounded-xl p-4 text-center hover:border-accent/50 transition-colors"
          >
            <div className={`h-10 w-10 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Recent doubts from DB */}
      {(history?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Doubts</h3>
          {history?.map((d) => (
            <Link
              key={d.id}
              to={`/doubts/session/${d.id}`}
              className="block w-full text-left bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-accent/50 transition-colors"
            >
              {d.question_preview}
              <span className="block text-xs text-muted-foreground/60 mt-1">
                {new Date(d.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoubtInput;
