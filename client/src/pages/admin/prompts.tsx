import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Plus, Terminal, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Prompt } from "@shared/schema";

const promptFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  type: z.string().min(1, "Type is required"),
  isActive: z.boolean().default(true),
});

type PromptForm = z.infer<typeof promptFormSchema>;

const promptTypes = [
  { value: "system", label: "System Prompt" },
  { value: "guardrail", label: "Guardrail" },
  { value: "evaluator", label: "Evaluator" },
  { value: "behavior", label: "Behavior" },
];

function PromptDialog({
  prompt,
  open,
  onOpenChange,
}: {
  prompt?: Prompt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!prompt;

  const form = useForm<PromptForm>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      name: prompt?.name || "",
      content: prompt?.content || "",
      type: prompt?.type || "system",
      isActive: prompt?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PromptForm) => {
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/prompts/${prompt.id}`, values);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/prompts", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      onOpenChange(false);
      form.reset();
      toast({ title: isEditing ? "Prompt updated" : "Prompt created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Prompt" : "Add Prompt"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Prompt name" data-testid="input-prompt-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-prompt-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {promptTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                      placeholder="Enter the prompt instructions..."
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="input-prompt-content"
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
                      data-testid="switch-prompt-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-prompt">
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PromptsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>();
  const { toast } = useToast();

  const { data: promptsList = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      toast({ title: "Prompt deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/prompts/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      guardrail: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      evaluator: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      behavior: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[type] || "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-prompts-title">Prompt Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure system prompts, guardrails, and evaluation criteria for BrightBot
          </p>
        </div>
        <Button
          onClick={() => { setEditingPrompt(undefined); setDialogOpen(true); }}
          data-testid="button-add-prompt"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Prompt
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : promptsList.length === 0 ? (
        <Card className="p-8 text-center">
          <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No prompts configured. Add prompts to customize BrightBot's behavior.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {promptsList.map((prompt) => (
            <Card key={prompt.id} className="p-4" data-testid={`prompt-card-${prompt.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-sm">{prompt.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getTypeColor(prompt.type)}`}>
                      {promptTypes.find(t => t.value === prompt.type)?.label || prompt.type}
                    </span>
                    {!prompt.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 font-mono">{prompt.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={prompt.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: prompt.id, isActive: checked })}
                    data-testid={`switch-toggle-prompt-${prompt.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setEditingPrompt(prompt); setDialogOpen(true); }}
                    data-testid={`button-edit-prompt-${prompt.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-delete-prompt-${prompt.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{prompt.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(prompt.id)}>
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

      <PromptDialog
        prompt={editingPrompt}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPrompt(undefined);
        }}
      />
    </div>
  );
}
