import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ClipboardCheck, 
  Edit, 
  ChevronDown, 
  ChevronUp,
  Paperclip,
  User,
  Calendar,
  Clock,
  Upload,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface EvaluationTask {
  id: string;
  task_key: string;
  task_label: string;
  status: string;
  owner_user_id: string | null;
  notes: string | null;
  attachment_urls: string[];
  due_date: string | null;
  completed_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

interface User {
  id: string;
  full_name: string | null;
}

interface Props {
  distributorId: string;
}

const EVALUATION_TASKS = [
  { key: "business_registration", label: "Business Registration Verified" },
  { key: "gst_certificate", label: "GST Certificate Collected" },
  { key: "bank_details", label: "Bank Details Verified" },
  { key: "address_verified", label: "Business Address Verified" },
  { key: "warehouse_visit", label: "Warehouse/Godown Visit Completed" },
  { key: "infrastructure_check", label: "Infrastructure Assessment Done" },
  { key: "fleet_verification", label: "Fleet/Vehicle Verification" },
  { key: "team_verification", label: "Sales Team Verification" },
  { key: "reference_check", label: "Reference Check Completed" },
  { key: "credit_check", label: "Credit/Financial Check Done" },
  { key: "contract_signed", label: "Distribution Agreement Signed" },
  { key: "training_completed", label: "Product Training Completed" },
  { key: "system_access", label: "System Access Provided" },
  { key: "first_order", label: "First Order Placed" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-800" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "blocked", label: "Blocked", color: "bg-red-100 text-red-800" },
  { value: "not_applicable", label: "N/A", color: "bg-gray-100 text-gray-600" },
];

export function DistributorEvaluationTasks({ distributorId }: Props) {
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editingTask, setEditingTask] = useState<EvaluationTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    status: "pending",
    owner_user_id: "",
    notes: "",
    due_date: "",
    attachment_urls: [] as string[],
  });

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [distributorId]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('distributor_evaluation_tasks')
        .select('*')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If no tasks exist, create them
      if (!data || data.length === 0) {
        await initializeTasks();
      } else {
        setTasks(data.map(t => ({
          ...t,
          attachment_urls: t.attachment_urls || []
        })));
      }
    } catch (error: any) {
      toast.error("Failed to load tasks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeTasks = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const tasksToCreate = EVALUATION_TASKS.map(task => ({
        distributor_id: distributorId,
        task_key: task.key,
        task_label: task.label,
        status: 'pending',
        created_by: userId,
      }));

      const { data, error } = await supabase
        .from('distributor_evaluation_tasks')
        .insert(tasksToCreate)
        .select();

      if (error) throw error;
      setTasks((data || []).map(t => ({
        ...t,
        attachment_urls: t.attachment_urls || []
      })));
    } catch (error: any) {
      toast.error("Failed to initialize tasks: " + error.message);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    setUsers(data || []);
  };

  const handleEdit = (task: EvaluationTask) => {
    setEditingTask(task);
    setFormData({
      status: task.status,
      owner_user_id: task.owner_user_id || "",
      notes: task.notes || "",
      due_date: task.due_date || "",
      attachment_urls: task.attachment_urls || [],
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTask) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${distributorId}/${editingTask.task_key}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('distributor-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('distributor-attachments')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        attachment_urls: [...prev.attachment_urls, publicUrl]
      }));
      toast.success("File uploaded");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (urlToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      attachment_urls: prev.attachment_urls.filter(url => url !== urlToRemove)
    }));
  };

  const handleSave = async () => {
    if (!editingTask) return;
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const updateData: any = {
        status: formData.status,
        owner_user_id: formData.owner_user_id || null,
        notes: formData.notes || null,
        due_date: formData.due_date || null,
        attachment_urls: formData.attachment_urls,
        updated_by: userId,
      };

      if (formData.status === 'completed' && editingTask.status !== 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      } else if (formData.status !== 'completed') {
        updateData.completed_date = null;
      }

      const { error } = await supabase
        .from('distributor_evaluation_tasks')
        .update(updateData)
        .eq('id', editingTask.id);

      if (error) throw error;

      toast.success("Task updated");
      setDialogOpen(false);
      loadTasks();
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption ? (
      <Badge className={statusOption.color}>{statusOption.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Onboarding Evaluation
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} ({progressPercent}%)
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {tasks.map(task => (
            <div 
              key={task.id} 
              className="border rounded-lg p-3 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleEdit(task)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{task.task_label}</span>
                  {getStatusBadge(task.status)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  {task.owner_user_id && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {getUserName(task.owner_user_id)}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {task.attachment_urls?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {task.attachment_urls.length} file(s)
                    </span>
                  )}
                  {task.updated_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated: {format(new Date(task.updated_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(task); }}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask?.task_label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Owner</Label>
              <Select 
                value={formData.owner_user_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, owner_user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this task..."
                rows={3}
              />
            </div>

            {/* Attachments */}
            <div>
              <Label>Attachments</Label>
              <div className="mt-2 space-y-2">
                {formData.attachment_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">
                      {url.split('/').pop()}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(url)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>

            {editingTask && (
              <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                <p>Created: {format(new Date(editingTask.created_at), 'MMM d, yyyy HH:mm')}</p>
                <p>Last Updated: {format(new Date(editingTask.updated_at), 'MMM d, yyyy HH:mm')}</p>
                {editingTask.completed_date && (
                  <p>Completed: {format(new Date(editingTask.completed_date), 'MMM d, yyyy')}</p>
                )}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
