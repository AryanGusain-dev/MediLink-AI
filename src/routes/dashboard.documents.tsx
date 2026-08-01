import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  FileImage,
  FileText,
  Filter,
  FolderOpen,
  Pencil,
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
import { documents as seedDocuments } from "@/data/mock";
import type { DocumentCategory, MedicalDocument } from "@/types";
import { formatDate, formatSize } from "@/lib/format";

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

function DocumentsPage() {
  const [docs, setDocs] = useState<MedicalDocument[]>(seedDocuments);
  const [filter, setFilter] = useState<"all" | DocumentCategory>("all");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<MedicalDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => (filter === "all" ? docs : docs.filter((d) => d.category === filter)), [docs, filter]);

  const simulateUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = (prev ?? 0) + 12;
        if (next >= 100) {
          clearInterval(timer);
          const added: MedicalDocument[] = Array.from(files).map((file, i) => ({
            id: `doc_${Date.now()}_${i}`,
            name: file.name,
            category: "Other",
            sizeKb: Math.max(1, Math.round(file.size / 1024)),
            type: file.type.startsWith("image/") ? "image" : "pdf",
            uploadedAt: new Date().toISOString(),
            status: "uploaded",
          }));
          setDocs((prev2) => [...added, ...prev2]);
          toast.success(`${added.length} file(s) uploaded`);
          setTimeout(() => setProgress(null), 500);
          return 100;
        }
        return next;
      });
    }, 130);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    simulateUpload(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => simulateUpload(e.target.files);

  const remove = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted");
  };

  const changeCategory = (id: string, category: DocumentCategory) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, category } : d)));
    toast.success(`Moved to ${category}`);
  };

  const confirmRename = () => {
    if (!renaming) return;
    setDocs((prev) => prev.map((d) => (d.id === renaming.id ? { ...d, name: renameValue } : d)));
    setRenaming(null);
    toast.success("Document renamed");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Every report, prescription and scan — encrypted and categorised."
        icon={FolderOpen}
        actions={
          <Button className="rounded-xl" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> Upload files
          </Button>
        }
      />

      <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="sr-only" onChange={onPick} aria-label="Choose files to upload" />

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
        <h2 className="mt-4 font-display text-base font-semibold text-foreground">Drag & drop your medical files</h2>
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
                <span>Uploading & encrypting…</span>
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

      {/* List */}
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
                <Widget delay={0} className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      {doc.type === "image" ? <FileImage className="size-5" aria-hidden /> : <FileText className="size-5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatSize(doc.sizeKb)} · {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <StatusBadge tone={doc.status === "uploaded" ? "success" : doc.status === "processing" ? "warning" : "danger"}>
                      {doc.status}
                    </StatusBadge>
                  </div>

                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select value={doc.category} onValueChange={(v) => changeCategory(doc.id, v as DocumentCategory)}>
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
                      onClick={() => toast.info("Preview opens in the connected build")}
                    >
                      Preview
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg" aria-label={`Download ${doc.name}`} onClick={() => toast.success("Download started")}>
                      <Download className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
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
                      className="rounded-lg text-destructive hover:text-destructive"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => remove(doc.id)}
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

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>Give this record a name you'll recognise later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">Document name</Label>
            <Input id="rename" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="rounded-xl" />
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
