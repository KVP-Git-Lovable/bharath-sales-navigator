import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FeedbackQuestion {
  id: string;
  module: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  applies_to: string;
  retailer_ids: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const MODULES = [
  { value: 'visit', label: 'Visit' },
  { value: 'order', label: 'Order' },
  { value: 'retailer_feedback', label: 'Retailer Feedback' },
];

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'text', label: 'Text' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multi_choice', label: 'Multiple Choice' },
];

const defaultForm = {
  module: 'visit',
  question_text: '',
  question_type: 'rating',
  options: null as any,
  is_required: true,
  applies_to: 'all',
  retailer_ids: null as string[] | null,
  sort_order: 0,
  is_active: true,
};

export default function FeedbackQuestionConfig() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [multiChoiceOptions, setMultiChoiceOptions] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('feedback_questions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" });
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setMultiChoiceOptions("");
    setDialogOpen(true);
  };

  const openEdit = (q: FeedbackQuestion) => {
    setEditingId(q.id);
    setForm({
      module: q.module,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      is_required: q.is_required,
      applies_to: q.applies_to,
      retailer_ids: q.retailer_ids,
      sort_order: q.sort_order,
      is_active: q.is_active,
    });
    setMultiChoiceOptions(
      q.question_type === 'multi_choice' && Array.isArray(q.options)
        ? q.options.join(', ')
        : ''
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast({ title: "Error", description: "Question text is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      ...form,
      options: form.question_type === 'multi_choice'
        ? multiChoiceOptions.split(',').map(o => o.trim()).filter(Boolean)
        : null,
    };

    if (editingId) {
      payload.updated_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('feedback_questions')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        toast({ title: "Error", description: "Failed to update question", variant: "destructive" });
        return;
      }
      toast({ title: "Updated", description: "Question updated successfully" });
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      payload.created_by = session?.user?.id;
      const { error } = await (supabase as any)
        .from('feedback_questions')
        .insert(payload);
      if (error) {
        toast({ title: "Error", description: "Failed to create question", variant: "destructive" });
        return;
      }
      toast({ title: "Created", description: "Question created successfully" });
    }

    setDialogOpen(false);
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('feedback_questions')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: "Question deleted" });
    fetchQuestions();
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    await (supabase as any)
      .from('feedback_questions')
      .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchQuestions();
  };

  const filtered = moduleFilter === 'all'
    ? questions
    : questions.filter(q => q.module === moduleFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Feedback Questions</h3>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {MODULES.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No questions configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(q => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Badge variant="secondary">{q.module}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{q.question_text}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.question_type}</Badge>
                  </TableCell>
                  <TableCell>{q.is_required ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{q.applies_to === 'all' ? 'All Retailers' : 'Specific'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={q.is_active}
                      onCheckedChange={() => handleToggleActive(q.id, q.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={form.question_type} onValueChange={v => setForm(f => ({ ...f, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={form.question_text}
                onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                placeholder="Enter your question..."
              />
            </div>

            {form.question_type === 'multi_choice' && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={multiChoiceOptions}
                  onChange={e => setMultiChoiceOptions(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Retailers</SelectItem>
                    <SelectItem value="specific">Specific Retailers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_required}
                  onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))}
                />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
