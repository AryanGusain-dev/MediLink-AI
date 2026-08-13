import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  FileImage,
  FileText,
  Filter,
  FolderOpen,
  Info,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentCategory, DocumentStatus, MedicalDocument } from "@/types";
import { formatDate, formatSize } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/dashboard/documents")({
  head: () => ({
    meta: [
      { title: "Documents — MediLink AI" },
      { name: "description", content: "Upload, categorise and manage medical documents: blood tests, prescriptions, MRI, CT, X-Ray and insurance files." },
      { property: "og:title", content: "Documents — MediLink AI" },
      { property: "og:description", content: "Your encrypted medical document vault with drag-and-drop upload." },
    ],
  }),
  component: DocumentsPage,
});

const categories: DocumentCategory[] = ["Blood Test", "Prescription", "MRI", "CT Scan", "X-Ray", "Insurance", "Other"];

interface AppMedicalDocument extends MedicalDocument {
  storagePath?: string;
  isDummy?: boolean;
}

const DUMMY_DOC: AppMedicalDocument = {
  id: "dummy_sample_1",
  name: "Example: Complete Blood Count (CBC) Report.pdf",
  category: "Blood Test",
  sizeKb: 1240,
  type: "pdf",
  uploadedAt: new Date().toISOString(),
  status: "uploaded",
  isDummy: true,
};

function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<AppMedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | DocumentCategory>("all");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<AppMedicalDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load documents from Supabase
  const fetchUserDocuments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // 1. Find profile ID for auth user
      let pId = profileId;
      if (!pId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profile?.id) {
          pId = profile.id;
        } else {
          // Create profile if missing
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              auth_user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              email: user.email || "",
            })
            .select("id")
            .single();

          pId = newProfile?.id || null;
        }
        setProfileId(pId);
      }

      if (!pId) {
        setLoading(false);
        return;
      }

      // 2. Fetch documents from Supabase DB table
      const { data: dbDocs, error } = await supabase
        .from("documents")
        .select("*")
        .eq("profile_id", pId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Supabase documents query error:", error);
        toast.error("Could not fetch documents from database");
      } else if (dbDocs) {
        const mapped: AppMedicalDocument[] = dbDocs.map((d) => ({
          id: d.id,
          name: d.title || d.file_name,
          category: (d.category as DocumentCategory) || "Other",
          sizeKb: Math.max(1, Math.round((d.file_size || 0) / 1024)),
          type: (d.mime_type?.startsWith("image/") || d.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? "image" : "pdf",
          uploadedAt: d.uploaded_at || new Date().toISOString(),
          status: (d.status as DocumentStatus) || "uploaded",
          storagePath: d.storage_path,
        }));
        setDocs(mapped);
      }
    } catch (err) {
      console.error("Document fetch exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user, profileId]);

  useEffect(() => {
    fetchUserDocuments();
  }, [fetchUserDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = docs.filter(d => d.status === "processing");
    if (processingDocs.length === 0) return;

    const interval = setInterval(() => {
      fetchUserDocuments();
    }, 5000);

    return () => clearInterval(interval);
  }, [docs, fetchUserDocuments]);

  // Handle uploading files
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user || !profileId) {
      toast.error("Please sign in to upload documents.");
      return;
    }

    setProgress(15);
    const fileList = Array.from(files);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      setProgress(40 + Math.round(((i + 0.5) / fileList.length) * 40));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile_id", profileId);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/documents/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
        
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setProgress(100);
    setTimeout(() => setProgress(null), 400);
    fetchUserDocuments();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => handleUpload(e.target.files);

  // Handle document deletion
  const remove = async (doc: AppMedicalDocument) => {
    if (doc.isDummy) {
      toast.info("This is a sample document preview. Upload a real file to manage records.");
      return;
    }

    setDocs((prev) => prev.filter((d) => d.id !== doc.id));

    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Failed to delete document from database");
      fetchUserDocuments();
    } else {
      if (doc.storagePath) {
        await supabase.storage.from("documents").remove([doc.storagePath]);
      }
      toast.success("Document deleted");
    }
  };

  // Handle category change
  const changeCategory = async (doc: AppMedicalDocument, category: DocumentCategory) => {
    if (doc.isDummy) {
      toast.info("Sample document cannot be modified. Upload your own document to set categories.");
      return;
    }

    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, category } : d)));

    const { error } = await supabase.from("documents").update({ category }).eq("id", doc.id);
    if (error) {
      toast.error("Failed to update category in database");
      fetchUserDocuments();
    } else {
      toast.success(`Moved to ${category}`);
    }
  };

  // Handle rename
  const confirmRename = async () => {
    if (!renaming) return;

    if (renaming.isDummy) {
      toast.info("Sample document cannot be renamed.");
      setRenaming(null);
      return;
    }

    const docId = renaming.id;
    const newTitle = renameValue.trim();
    if (!newTitle) return;

    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, name: newTitle } : d)));
    setRenaming(null);

    const { error } = await supabase.from("documents").update({ title: newTitle }).eq("id", docId);
    if (error) {
      toast.error("Failed to update document title");
      fetchUserDocuments();
    } else {
      toast.success("Document renamed");
    }
  };

  // Handle Preview
  const handlePreview = async (doc: AppMedicalDocument) => {
    if (doc.isDummy) {
      toast.info("This is a sample preview card demonstrating how your files will appear.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

    if (doc.storagePath) {
      // 1. Try creating a 1-hour signed URL (works for private & public buckets)
      const { data: signedData } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storagePath, 3600);

      if (signedData?.signedUrl) {
        window.open(signedData.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }

      // 2. Fallback to public URL
      const { data: pubData } = supabase.storage.from("documents").getPublicUrl(doc.storagePath);
      if (pubData?.publicUrl) {
        window.open(pubData.publicUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    // 3. Fallback to backend streaming URL
    window.open(`${apiUrl}/documents/${doc.id}/download`, "_blank", "noopener,noreferrer");
  };

  // Handle Download
  const handleDownload = async (doc: AppMedicalDocument) => {
    if (doc.isDummy) {
      toast.info("Sample document cannot be downloaded.");
      return;
    }

    toast.info(`Downloading "${doc.name}"...`);

    if (doc.storagePath) {
      const { data, error } = await supabase.storage.from("documents").download(doc.storagePath);
      if (data && !error) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${doc.name}`);
        return;
      }
    }

    // Fallback to backend download endpoint
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/documents/${doc.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${doc.name}`);
        return;
      }
    } catch {
      // ignore
    }

    toast.error("Could not download file. Please verify file storage.");
  };

  // Apply category filter
  const visible = useMemo(() => {
    if (filter === "all") return docs;
    return docs.filter((d) => d.category === filter);
  }, [docs, filter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Every report, prescription and scan — encrypted and stored in your medical vault."
        icon={FolderOpen}
        actions={
          <Button className="rounded-xl" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> Upload files
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        className="sr-only"
        onChange={onPick}
        aria-label="Choose files to upload"
      />

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border bg-card"
        }`}
      >
        <motion.span
          animate={{ y: dragging ? -6 : 0 }}
          className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground"
        >
          <UploadCloud className="size-6" aria-hidden />
        </motion.span>
        <h2 className="mt-4 font-display text-base font-semibold text-foreground">
          Drag & drop your medical files
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">PDF, JPG or PNG up to 25 MB each</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>

        <AnimatePresence>
          {progress !== null ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-auto mt-6 max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading to database & storage…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2 h-2" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" aria-hidden /> Category
        </span>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter("all")}
        >
          All ({docs.length})
        </Button>
        {categories.map((cat) => {
          const count = docs.filter((d) => d.category === cat).length;
          return (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setFilter(cat)}
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      {/* Document Grid / Empty State */}
      {visible.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents in this category"
          description="Upload a file or switch category to see your existing records."
          action={
            <Button className="rounded-xl" onClick={() => inputRef.current?.click()}>
              Upload a document
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((doc, i) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
                className="h-full"
              >
                <div className="group relative rounded-2xl border border-border/80 bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-xs flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-4">
                    {/* Header Row: Icon + Title & Meta + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                          {doc.type === "image" ? (
                            <FileImage className="size-5" aria-hidden />
                          ) : (
                            <FileText className="size-5" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-bold font-display text-foreground leading-snug tracking-tight" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {formatSize(doc.sizeKb)} · {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge
                        tone={
                          doc.status === "uploaded"
                            ? "success"
                            : doc.status === "processing"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {doc.status}
                      </StatusBadge>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Category
                      </Label>
                      <Select
                        value={doc.category}
                        onValueChange={(v) => changeCategory(doc, v as DocumentCategory)}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-background border-border/70 h-9 text-xs font-semibold text-foreground" aria-label={`Category for ${doc.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-semibold text-xs h-8 px-3.5"
                      onClick={() => handlePreview(doc)}
                    >
                      Preview
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        aria-label={`Download ${doc.name}`}
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        aria-label={`Rename ${doc.name}`}
                        onClick={() => {
                          setRenaming(doc);
                          setRenameValue(doc.name);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${doc.name}`}
                        onClick={() => remove(doc)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>Give this record a name you'll recognise later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">Document name</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={confirmRename}>
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
