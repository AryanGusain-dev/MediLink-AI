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
      const fileExt = file.name.split(".").pop();
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const storagePath = `${user.id}/${uniqueName}`;

      setProgress(40 + Math.round(((i + 0.5) / fileList.length) * 40));

      // Attempt to upload to Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { upsert: true });

      if (storageErr) {
        console.warn("Storage bucket notice:", storageErr.message);
      }

      // Insert record into Supabase DB
      const { error: dbErr } = await supabase.from("documents").insert({
        profile_id: profileId,
        title: file.name,
        category: "Other",
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/png"),
        file_size: file.size,
        status: "uploaded",
      });

      if (dbErr) {
        console.error("DB insert error:", dbErr);
        toast.error(`Failed to save record for ${file.name}`);
      } else {
        toast.success(`Uploaded ${file.name}`);
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
  const handlePreview = (doc: AppMedicalDocument) => {
    if (doc.isDummy) {
      toast.info("This is a sample preview card demonstrating how your files will appear.");
      return;
    }

    if (doc.storagePath) {
      const { data } = supabase.storage.from("documents").getPublicUrl(doc.storagePath);
      if (data?.publicUrl) {
        window.open(data.publicUrl, "_blank");
        return;
      }
    }
    toast.info("Previewing document record");
  };

  // Handle Download
  const handleDownload = async (doc: AppMedicalDocument) => {
    if (doc.isDummy) {
      toast.info("Sample document cannot be downloaded.");
      return;
    }

    if (doc.storagePath) {
      const { data, error } = await supabase.storage.from("documents").download(doc.storagePath);
      if (data && !error) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Download started");
        return;
      }
    }
    toast.success("Download started");
  };

  // If user has 0 uploaded documents in DB, use the sample dummy card
  const hasNoRealDocs = !loading && docs.length === 0;
  const activeDocsList = useMemo(() => {
    if (hasNoRealDocs) {
      return [DUMMY_DOC];
    }
    return docs;
  }, [hasNoRealDocs, docs]);

  // Apply category filter
  const visible = useMemo(() => {
    if (filter === "all") return activeDocsList;
    return activeDocsList.filter((d) => d.category === filter);
  }, [activeDocsList, filter]);

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

      {/* Banner when user has 0 uploaded documents */}
      {hasNoRealDocs && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Sample Document Preview
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Demo
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                No uploaded records found in your database yet. Below is an example showing how your document cards will look.
              </p>
            </div>
          </div>
          <Button size="sm" className="rounded-xl shrink-0" onClick={() => inputRef.current?.click()}>
            <Upload className="size-3.5 mr-1.5" aria-hidden /> Upload your first document
          </Button>
        </motion.div>
      )}

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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((doc, i) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
              >
                <Widget delay={0} className={`h-full relative ${doc.isDummy ? "border-dashed border-primary/40 bg-card/60" : ""}`}>
                  {doc.isDummy && (
                    <div className="mb-3 flex items-center justify-between rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <span className="flex items-center gap-1.5">
                        <Info className="size-3.5" /> Sample Card Preview
                      </span>
                      <span>How cards look</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      {doc.type === "image" ? (
                        <FileImage className="size-5" aria-hidden />
                      ) : (
                        <FileText className="size-5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatSize(doc.sizeKb)} · {doc.isDummy ? "Sample Record" : formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    {doc.isDummy ? (
                      <StatusBadge tone="info">Sample</StatusBadge>
                    ) : (
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
                    )}
                  </div>

                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select
                      value={doc.category}
                      onValueChange={(v) => changeCategory(doc, v as DocumentCategory)}
                    >
                      <SelectTrigger className="mt-2 w-full rounded-xl" aria-label={`Category for ${doc.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handlePreview(doc)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label={`Download ${doc.name}`}
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label={`Rename ${doc.name}`}
                      onClick={() => {
                        if (doc.isDummy) {
                          toast.info("Sample document cannot be renamed.");
                          return;
                        }
                        setRenaming(doc);
                        setRenameValue(doc.name);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-destructive hover:text-destructive"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => remove(doc)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </Widget>
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
