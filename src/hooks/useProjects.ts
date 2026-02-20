import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskType = 'epic' | 'story' | 'task' | 'bug' | 'idea' | 'milestone';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type MemberRole = 'owner' | 'manager' | 'developer' | 'designer' | 'tester' | 'viewer';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  logged_hours?: number;
  budget?: number;
  color: string;
  is_template: boolean;
  template_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string; profile_picture_url?: string };
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  start_date?: string;
  end_date?: string;
  velocity?: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  sprint_id?: string;
  milestone_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assignee_id?: string;
  reporter_id?: string;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  logged_hours?: number;
  story_points?: number;
  sort_order: number;
  tags?: string[];
  is_blocked: boolean;
  block_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string; profile_picture_url?: string };
  subtasks?: Task[];
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  probability: string;
  impact: string;
  status: string;
  mitigation_plan?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  date: string;
  hours: number;
  description?: string;
  created_at: string;
  user?: { full_name: string };
}

// ─── PROJECTS ───────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ['pm_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_projects')
        .select(`*, owner:profiles!pm_projects_owner_id_fkey(full_name, profile_picture_url)`)
        .eq('is_template', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['pm_projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_projects')
        .select(`*, owner:profiles!pm_projects_owner_id_fkey(full_name, profile_picture_url)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Partial<Project>) => {
      const { data, error } = await supabase
        .from('pm_projects')
        .insert([{ ...values, created_by: user!.id }] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_projects'] });
      toast.success('Project created successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('pm_projects')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_projects'] });
      queryClient.invalidateQueries({ queryKey: ['pm_projects', data.id] });
      toast.success('Project updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pm_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_projects'] });
      toast.success('Project deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['pm_tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_tasks')
        .select(`*, assignee:profiles!pm_tasks_assignee_id_fkey(full_name, profile_picture_url)`)
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Partial<Task>) => {
      const { data, error } = await supabase
        .from('pm_tasks')
        .insert([{ ...values, created_by: user!.id }] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_tasks', data.project_id] });
      toast.success('Task created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('pm_tasks')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_tasks', data.project_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('pm_tasks').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['pm_tasks', projectId] });
      toast.success('Task deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── SPRINTS ─────────────────────────────────────────────────────────────────

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: ['pm_sprints', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_sprints')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Sprint[];
    },
    enabled: !!projectId,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Sprint>) => {
      const { data, error } = await supabase.from('pm_sprints').insert([values] as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_sprints', data.project_id] });
      toast.success('Sprint created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── MILESTONES ──────────────────────────────────────────────────────────────

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['pm_milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Milestone>) => {
      const { data, error } = await supabase.from('pm_milestones').insert([values] as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_milestones', data.project_id] });
      toast.success('Milestone created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── RISKS ───────────────────────────────────────────────────────────────────

export function useRisks(projectId: string) {
  return useQuery({
    queryKey: ['pm_risks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_risks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Risk[];
    },
    enabled: !!projectId,
  });
}

export function useCreateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Risk>) => {
      const { data, error } = await supabase.from('pm_risks').insert([values] as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_risks', data.project_id] });
      toast.success('Risk added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── TIME LOGS ────────────────────────────────────────────────────────────────

export function useTimeLogs(projectId: string) {
  return useQuery({
    queryKey: ['pm_time_logs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_time_logs')
        .select(`*, user:profiles!pm_time_logs_user_id_fkey(full_name)`)
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as TimeLog[];
    },
    enabled: !!projectId,
  });
}

export function useLogTime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { task_id: string; project_id: string; hours: number; date: string; description?: string }) => {
      const { data, error } = await supabase
        .from('pm_time_logs')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_time_logs', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['pm_tasks', data.project_id] });
      toast.success('Time logged');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── TASK ATTACHMENTS ─────────────────────────────────────────────────────────

export function useTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ['pm_task_attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { task_id: string; file_name: string; file_url: string; file_size?: number; file_type?: string; note?: string | null }) => {
      const { data, error } = await supabase
        .from('pm_task_attachments')
        .insert({ ...values, uploaded_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_task_attachments', data.task_id] });
      toast.success('Attachment added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId, fileUrl }: { id: string; taskId: string; fileUrl: string }) => {
      await supabase.storage.from('pm-attachments').remove([fileUrl]);
      const { error } = await supabase.from('pm_task_attachments').delete().eq('id', id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['pm_task_attachments', taskId] });
      toast.success('Attachment removed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── TASK DEPENDENCIES ────────────────────────────────────────────────────────

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['pm_task_dependencies', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_task_dependencies')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { task_id: string; depends_on_task_id: string; dependency_type: string }) => {
      const { data, error } = await supabase
        .from('pm_task_dependencies')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_task_dependencies', data.task_id] });
      toast.success('Dependency added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTaskDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('pm_task_dependencies').delete().eq('id', id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['pm_task_dependencies', taskId] });
      toast.success('Dependency removed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
