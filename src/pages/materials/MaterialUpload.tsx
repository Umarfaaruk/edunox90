import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X, ArrowRight, CheckCircle2, Loader2, Search, FolderOpen, Sparkles, HardDrive, LayoutGrid, List, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-material`;

const MaterialUpload = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user || !session) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file);
        if (uploadErr) throw uploadErr;

        const { data: material, error: insertErr } = await supabase
          .from("materials")
          .insert({
            user_id: user.id,
            file_name: file.name,
            storage_path: path,
            content_type: file.type,
            file_size: file.size,
            processing_status: "processing",
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;

        toast.success(`${file.name} uploaded. Processing...`);

        fetch(PROCESS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ materialId: material.id }),
        }).then(async (resp) => {
          if (resp.ok) {
            toast.success(`${file.name} processed and ready!`);
          } else {
            toast.error(`Failed to process ${file.name}`);
          }
          queryClient.invalidateQueries({ queryKey: ["materials"] });
        });
      } catch (e: any) {
        toast.error(`Upload failed: ${e.message}`);
      }
    }
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["materials"] });
  };

  const handleDelete = async (id: string, storagePath: string) => {
    await supabase.storage.from("materials").remove([storagePath]);
    await supabase.from("materials").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["materials"] });
    toast.success("File deleted");
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

  const totalFiles = materials?.length ?? 0;
  const readyFiles = materials?.filter((m) => m.processing_status === "ready" || m.processing_status === "completed").length ?? 0;
  const totalSize = (materials ?? []).reduce((s, m) => s + (m.file_size ?? 0), 0);

  const statusBadge = (status: string) => {
    if (status === "ready" || status === "completed")
      return <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase">AI Summary Ready</span>;
    if (status === "processing")
      return <span className="text-[10px] font-bold text-[hsl(var(--highlight))] bg-[hsl(var(--highlight))]/10 px-2 py-0.5 rounded-full uppercase">Processing</span>;
    return <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">{status}</span>;
  };

  const fileIcon = (contentType: string | null) => {
    if (contentType?.includes("pdf")) return <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><FileText className="h-5 w-5 text-destructive" /></div>;
    return <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center"><FileText className="h-5 w-5 text-[hsl(var(--navy))]" /></div>;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Resource Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your study materials and AI-generated summaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-56"
            />
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            disabled={uploading}
          >
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Total Files", value: totalFiles, color: "text-accent" },
          { icon: Sparkles, label: "AI Summaries", value: readyFiles, color: "text-accent" },
          { icon: FolderOpen, label: "Folders", value: 0, color: "text-destructive" },
          { icon: HardDrive, label: "Storage", value: formatSize(totalSize), color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold text-foreground mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone (visible when no files) */}
      {totalFiles === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-accent/50 transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 text-accent mx-auto mb-4 animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          )}
          <div className="text-sm font-medium text-foreground">{uploading ? "Uploading..." : "Drop files here or click to browse"}</div>
          <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</div>
        </div>
      )}

      {/* Materials list */}
      {totalFiles > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" /> Recent Materials
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMaterials.map((f) => (
                <div key={f.id} className="bg-card border border-border rounded-xl p-4 space-y-3 group relative">
                  <button
                    onClick={() => handleDelete(f.id, f.storage_path)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex justify-center py-2">
                    {fileIcon(f.content_type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground truncate">{f.file_name}</div>
                    {statusBadge(f.processing_status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Added {new Date(f.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span>{formatSize(f.file_size)}</span>
                  </div>
                  {(f.processing_status === "ready" || f.processing_status === "completed") && (
                    <Link to={`/materials/learn/${f.id}`}>
                      <Button size="sm" className="w-full bg-[hsl(var(--navy))] text-[hsl(var(--highlight))] hover:bg-[hsl(var(--navy))]/90 text-xs gap-1">
                        Learn <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
              {/* Add new card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent/50 transition-colors min-h-[180px]"
              >
                <Plus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">New Folder</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMaterials.map((f) => (
                <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                  {fileIcon(f.content_type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{f.file_name}</div>
                    <div className="text-xs text-muted-foreground">{formatSize(f.file_size)} · {new Date(f.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  {statusBadge(f.processing_status)}
                  {(f.processing_status === "ready" || f.processing_status === "completed") && (
                    <Link to={`/materials/learn/${f.id}`}>
                      <Button size="sm" className="bg-[hsl(var(--navy))] text-[hsl(var(--highlight))] hover:bg-[hsl(var(--navy))]/90 text-xs gap-1">
                        Learn <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                  <button onClick={() => handleDelete(f.id, f.storage_path)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload progress toast */}
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3 z-50">
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
          <span className="text-sm text-foreground">Uploading file...</span>
        </div>
      )}
    </div>
  );
};

export default MaterialUpload;
