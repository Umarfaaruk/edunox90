import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X, ArrowRight, Loader2, Search, FolderOpen, Sparkles, HardDrive, LayoutGrid, List, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { aiComplete } from "@/lib/aiService";

/**
 * CLIENT-SIDE TEXT EXTRACTION
 * ===========================
 * Uses PDF.js (pdfjs-dist) for robust PDF text extraction.
 * Falls back to basic methods for .txt/.md files.
 */

/**
 * Extract text from a PDF file using pdfjs-dist.
 * Loads the worker from CDN to avoid bundling issues.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source to CDN (must match the installed version)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const textParts: string[] = [];

    console.log(`[PDF] Extracting text from ${totalPages} pages of "${file.name}"`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => {
            // Handle text items (they have a 'str' property)
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText.length > 0) {
          textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
        }
      } catch (pageErr) {
        console.warn(`[PDF] Error on page ${pageNum}:`, pageErr);
      }
    }

    const fullText = textParts.join('\n\n');

    if (fullText.trim().length > 50) {
      console.log(`[PDF] ✅ Extracted ${fullText.length} chars from "${file.name}"`);
      return fullText;
    }

    // If PDF.js couldn't extract meaningful text (e.g., scanned images),
    // return a descriptive fallback
    return `[PDF Document: ${file.name}] This PDF appears to contain scanned images or non-selectable text. ` +
      `The document has ${totalPages} pages. The AI tutor can help with questions about topics described in the filename.`;
  } catch (err) {
    console.error("[PDF] Extraction failed:", err);
    return `[PDF Document: ${file.name}] Unable to extract text. ` +
      `Please ensure the PDF is not password-protected. ` +
      `The AI tutor can still help with general questions.`;
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  // Plain text and markdown
  if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
    return await file.text();
  }

  // PDF: use pdfjs-dist for proper extraction
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return await extractTextFromPDF(file);
  }

  return `[Document: ${file.name}] This file type requires server-side processing for full text extraction.`;
}

/**
 * Generate simple key topics from extracted text
 */
function extractSimpleTopics(text: string, fileName: string): string[] {
  const topics: Set<string> = new Set();

  // Extract from filename (remove extension, split on common separators)
  const nameBase = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  if (nameBase.length > 2) topics.add(nameBase);

  // Extract capitalized phrases (likely headings/topics)
  const sentences = text.split(/[.!?\n]+/).slice(0, 30);
  for (const s of sentences) {
    const matches = s.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g);
    if (matches) {
      for (const m of matches) {
        if (m.length > 3 && !["The", "This", "What", "When", "Where", "How", "Why"].includes(m)) {
          topics.add(m);
        }
      }
    }
  }

  return Array.from(topics).slice(0, 8);
}

/**
 * Generate a simple summary from text
 */
function generateSimpleSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
  if (sentences.length === 0) return "Study material uploaded for AI-assisted learning.";

  const summary: string[] = [];
  if (sentences[0]) summary.push(sentences[0].trim());
  if (sentences.length > 2) summary.push(sentences[Math.floor(sentences.length / 2)].trim());
  if (sentences.length > 1) summary.push(sentences[sentences.length - 1].trim());

  return summary.map(s => s + ".").join(" ").substring(0, 500);
}

/**
 * AI-POWERED ANALYSIS via server AI proxy
 * Generates comprehensive summary, key topics, and concept hierarchy
 * Falls back to basic extraction if API unavailable
 */
async function analyzeWithAI(
  text: string,
  fileName: string
): Promise<{ summary: string; keyTopics: string[]; concepts: { name: string; importance: string }[] }> {
  const fallback = {
    summary: generateSimpleSummary(text),
    keyTopics: extractSimpleTopics(text, fileName),
    concepts: extractSimpleTopics(text, fileName).map((t, i) => ({
      name: t,
      importance: i < 3 ? "critical" : "important",
    })),
  };

  if (text.length < 50) return fallback;

  try {
    const truncated = text.substring(0, 15000);
    const prompt = `Analyze this study material and return a JSON object with:
1. "summary": A comprehensive 3-5 sentence summary
2. "keyTopics": An array of 5-10 key topics/concepts covered
3. "concepts": An array of objects with "name" and "importance" ("critical", "important", or "supplementary")

Material (from file "${fileName}"):
"""
${truncated}
"""

Return ONLY valid JSON, no markdown or other text.`;

    const raw = await aiComplete({
      messages: [
        { role: "system", content: "You are a document analysis assistant. Return ONLY valid JSON, no other text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 1024,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || fallback.summary,
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : fallback.keyTopics,
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : fallback.concepts,
    };
  } catch (e) {
    console.warn("[MaterialUpload] AI analysis fallback:", e);
    return fallback;
  }
}

const MaterialUpload = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "materials"),
        where("user_id", "==", user.uid),
        orderBy("uploaded_at", "desc")
      );
      const docs = await getDocs(q);
      return docs.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as { 
        id: string; 
        file_name: string; 
        content_type: string; 
        file_size: number; 
        processing_status: string; 
        extracted_text: string; 
        summary: string; 
        key_topics: string[]; 
        content_length: number;
        uploaded_at?: any;
        user_id: string;
      }));
    },
    enabled: !!user,
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 50MB)`);
          continue;
        }

        setUploadProgress(`Processing ${file.name}...`);
        toast.info(`Processing ${file.name}...`);

        // Step 1: Create Firestore doc with "processing" status
        const materialRef = await addDoc(collection(db, "materials"), {
          user_id: user.uid,
          file_name: file.name,
          content_type: file.type,
          file_size: file.size,
          processing_status: "processing",
          uploaded_at: new Date().toISOString(),
        });

        try {
          // Step 2: Extract text client-side (PDF.js for PDFs)
          setUploadProgress(`Extracting text from ${file.name}...`);
          const extractedText = await extractTextFromFile(file);

          setUploadProgress(`Analyzing ${file.name} with AI...`);
          const analysis = await analyzeWithAI(extractedText, file.name);
          const { summary, keyTopics } = analysis;

          // Step 3: Update Firestore doc with extracted content & mark as completed
          await updateDoc(doc(db, "materials", materialRef.id), {
            processing_status: "completed",
            extracted_text: extractedText.substring(0, 100000), // Cap at 100K chars for larger PDFs
            summary: summary,
            key_topics: keyTopics,
            content_length: extractedText.length,
            concepts: keyTopics.map((t, i) => ({
              name: t,
              importance: i < 3 ? "critical" : "important",
            })),
            processed_at: new Date().toISOString(),
          });

          toast.success(`${file.name} processed successfully! ${extractedText.length > 100 ? `(${Math.round(extractedText.length / 1000)}K chars extracted)` : ''}`);
        } catch (err: any) {
          console.error("[Upload] Processing error:", err);

          // Still mark as completed with minimal data so AI tutor can work
          try {
            await updateDoc(doc(db, "materials", materialRef.id), {
              processing_status: "completed",
              summary: `Study material: ${file.name}`,
              key_topics: [file.name.replace(/\.[^.]+$/, "")],
              content_length: file.size,
              processed_at: new Date().toISOString(),
            });
          } catch {}

          toast.warning(`${file.name} uploaded with limited processing.`);
        } finally {
          queryClient.invalidateQueries({ queryKey: ["materials", user.uid] });
        }
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "materials", id));
      queryClient.invalidateQueries({ queryKey: ["materials", user?.uid] });
      toast.success("File deleted");
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredMaterials = (materials ?? []).filter((m) =>
    m.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const styles = {
      ready: "text-accent bg-accent/10",
      completed: "text-accent bg-accent/10",
      processing: "text-[hsl(var(--highlight))] bg-[hsl(var(--highlight))]/10",
    };
    const currentStyle = styles[status as keyof typeof styles] || "text-muted-foreground bg-muted";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${currentStyle}`}>{status === 'ready' || status === 'completed' ? 'AI Ready' : status}</span>;
  };

  const fileIcon = (contentType: string | null) => (
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${contentType?.includes("pdf") ? "bg-destructive/10" : "bg-secondary"}`}>
      <FileText className={`h-5 w-5 ${contentType?.includes("pdf") ? "text-destructive" : "text-[hsl(var(--navy))]"}`} />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Resource Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload materials and start learning with AI.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-56" />
          </div>
          <Button onClick={() => fileInputRef.current?.click()} className="bg-accent gap-2" disabled={uploading}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} aria-label="Upload study materials" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Total Files", value: materials?.length ?? 0 },
          { icon: Sparkles, label: "AI Ready", value: materials?.filter(m => m.processing_status === "completed" || m.processing_status === "ready").length ?? 0 },
          { icon: FolderOpen, label: "Folders", value: 0 },
          { icon: HardDrive, label: "Storage", value: formatSize(materials?.reduce((s, m) => s + (m.file_size ?? 0), 0) ?? 0) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <s.icon className="h-5 w-5 text-accent mb-2" />
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Recent Materials
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-muted" : ""}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-muted" : ""}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaterials.map((f) => (
              <div key={f.id} className="bg-card border border-border rounded-xl p-4 space-y-3 group relative">
                <button onClick={() => handleDelete(f.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" title="Delete file" aria-label="Delete file">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex justify-center py-2">{fileIcon(f.content_type)}</div>
                <div className="text-sm font-medium truncate">{f.file_name}</div>
                {statusBadge(f.processing_status)}
                {(f.processing_status === "ready" || f.processing_status === "completed") && (
                  <Link to={`/materials/learn/${f.id}`}>
                    <Button size="sm" className="w-full bg-[hsl(var(--navy))] text-xs gap-1">Learn <ArrowRight className="h-3 w-3" /></Button>
                  </Link>
                )}
              </div>
            ))}
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent/50 min-h-[180px]">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add Material</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMaterials.map((f) => (
              <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                {fileIcon(f.content_type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.file_name}</div>
                  <div className="text-xs text-muted-foreground">{formatSize(f.file_size)}</div>
                </div>
                {statusBadge(f.processing_status)}
                {(f.processing_status === "ready" || f.processing_status === "completed") && (
                  <Link to={`/materials/learn/${f.id}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1">Learn <ArrowRight className="h-3 w-3" /></Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="fixed bottom-6 right-6 bg-card border p-4 shadow-lg flex items-center gap-3 z-50 rounded-xl">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-sm">{uploadProgress || "Processing file..."}</span>
        </div>
      )}
    </div>
  );
};

export default MaterialUpload;