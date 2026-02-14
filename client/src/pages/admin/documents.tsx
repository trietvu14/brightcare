import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Pencil, Trash2, Search, Upload, Loader2, FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

const documentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
});

type DocumentForm = z.infer<typeof documentFormSchema>;

const categories = [
  { value: "general", label: "General" },
  { value: "operations", label: "Operations" },
  { value: "tuition", label: "Tuition & Fees" },
  { value: "health", label: "Health & Safety" },
  { value: "nutrition", label: "Nutrition" },
  { value: "enrollment", label: "Enrollment" },
  { value: "curriculum", label: "Curriculum" },
  { value: "policies", label: "Policies" },
];

function DocumentDialog({
  document,
  open,
  onOpenChange,
}: {
  document?: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!document;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [preUploadTitle, setPreUploadTitle] = useState("");

  const form = useForm<DocumentForm>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: document?.title || "",
      content: document?.content || "",
      category: document?.category || "general",
      isActive: document?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: document?.title || "",
        content: document?.content || "",
        category: document?.category || "general",
        isActive: document?.isActive ?? true,
      });
      setUploadedFileName(null);
      setPreUploadTitle("");
    }
  }, [open, document]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data: { title: string; content: string; filename: string }) => {
      setPreUploadTitle(form.getValues("title"));
      if (!form.getValues("title")) {
        form.setValue("title", data.title);
      }
      form.setValue("content", data.content);
      setUploadedFileName(data.filename);
      toast({ title: "File processed", description: `Extracted text from ${data.filename}` });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DocumentForm) => {
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/documents/${document.id}`, values);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/documents", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      onOpenChange(false);
      form.reset();
      setUploadedFileName(null);
      toast({ title: isEditing ? "Document updated" : "Document created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setUploadedFileName(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Document" : "Add Document"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel>Upload a File (optional)</FormLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-file"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload PDF, DOC, or DOCX
                      </>
                    )}
                  </Button>
                  {uploadedFileName && (
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        <FileUp className="h-3 w-3 mr-1" />
                        {uploadedFileName}
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setUploadedFileName(null);
                          form.setValue("content", "");
                          form.setValue("title", preUploadTitle);
                        }}
                        data-testid="button-clear-upload"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a document to automatically extract its text content. You can also type or paste content directly below.
                </p>
              </div>
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Document title" data-testid="input-doc-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-doc-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Document content that the AI will use to answer questions..."
                      className="min-h-[200px]"
                      data-testid="input-doc-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel className="mt-0">Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-doc-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-doc">
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/documents/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  const filteredDocs = docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      operations: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      tuition: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      health: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      nutrition: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      enrollment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      curriculum: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
      policies: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    };
    return colors[cat] || "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-documents-title">Knowledge Base Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the documents that BrightBot uses to answer parent questions
          </p>
        </div>
        <Button
          onClick={() => { setEditingDoc(undefined); setDialogOpen(true); }}
          data-testid="button-add-document"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-documents"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchTerm ? "No documents match your search" : "No documents yet. Add your first knowledge base document."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="p-4" data-testid={`document-card-${doc.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-sm">{doc.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(doc.category)}`}>
                      {categories.find(c => c.value === doc.category)?.label || doc.category}
                    </span>
                    {!doc.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{doc.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={doc.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: doc.id, isActive: checked })}
                    data-testid={`switch-toggle-doc-${doc.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setEditingDoc(doc); setDialogOpen(true); }}
                    data-testid={`button-edit-doc-${doc.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-delete-doc-${doc.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(doc.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DocumentDialog
        document={editingDoc}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingDoc(undefined);
        }}
      />
    </div>
  );
}
