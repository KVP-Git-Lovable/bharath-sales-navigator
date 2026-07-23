import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Eye, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationRuleFormProps {
  rule: {
    id: string;
    name: string;
    event_code: string;
    source_table: string;
    receiver_type: string;
    receiver_role: string | null;
    receiver_user_id: string | null;
    notification_channel: string;
    title_template: string;
    message_template: string;
  } | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const SOURCE_TABLES = [
  'orders', 'leave_applications', 'regularization_requests',
  'approval_requests', 'visits', 'activity_events', 'pm_tasks',
  'retailers', 'attendance', 'branding_requests',
];

// Plain-language "whom" options — sub-label maps to the stored receiver_type.
const WHOM_OPTIONS: Array<{ value: string; label: string; sub: string }> = [
  { value: 'employee',      label: 'The person themselves', sub: 'employee — the actor who triggered the event' },
  { value: 'manager',       label: 'Their manager',         sub: 'manager — direct reporting manager of the actor' },
  { value: 'hierarchy',     label: 'Whole hierarchy up',    sub: 'hierarchy — every manager above the actor' },
  { value: 'role',          label: 'A role',                sub: 'role — everyone assigned to a specific role' },
  { value: 'specific_user', label: 'Specific people',       sub: 'specific_user — one chosen person' },
  { value: 'admin',         label: 'All admins',            sub: 'admin — every system administrator' },
];

const CHANNELS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email',  label: 'Email' },
  { value: 'push',   label: 'Push' },
];

const PLACEHOLDERS = ['{user_name}', '{date}', '{time}', '{beat}', '{record_name}'];

export function NotificationRuleForm({ rule, userId, onClose, onSaved }: NotificationRuleFormProps) {
  const [name, setName] = useState(rule?.name || '');
  const [eventCode, setEventCode] = useState(rule?.event_code || '');
  const [sourceTable, setSourceTable] = useState(rule?.source_table || '');
  const [receiverType, setReceiverType] = useState(rule?.receiver_type || 'employee');
  const [receiverRole, setReceiverRole] = useState(rule?.receiver_role || '');
  const [receiverUserId, setReceiverUserId] = useState<string>(rule?.receiver_user_id || '');
  const [notification_channel, setChannel] = useState(rule?.notification_channel || 'in_app');
  const [titleTemplate, setTitleTemplate] = useState(rule?.title_template || '{user_name} - {record_name}');
  const [messageTemplate, setMessageTemplate] = useState(rule?.message_template || '{user_name} performed an action');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sampleActor, setSampleActor] = useState<string>(userId);
  const [sendingTest, setSendingTest] = useState(false);

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['notification-event-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_event_types')
        .select('*')
        .eq('is_active', true)
        .order('event_code');
      if (error) throw error;
      return data;
    },
  });

  // User picker used by "Specific people" and by the "preview as [rep]" control.
  const { data: pickUsers = [] } = useQuery({
    queryKey: ['notif-pick-users'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('notif_pick_users');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; role?: string | null }>;
    },
  });

  // Live "who will receive this" preview.
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['notif-preview', receiverType, receiverRole, receiverUserId, sampleActor],
    enabled: !!receiverType,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('notif_preview_recipients', {
        p_receiver_type: receiverType,
        p_receiver_role: receiverType === 'role' ? (receiverRole || null) : null,
        p_receiver_user_id: receiverType === 'specific_user' ? (receiverUserId || null) : null,
        p_sample_actor: sampleActor || null,
      });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const insertPlaceholder = (placeholder: string) => {
    setMessageTemplate((prev) => prev + placeholder);
  };

  const renderPreview = (template: string) => {
    const now = new Date();
    return template
      .replace('{user_name}', 'John Doe')
      .replace('{record_name}', 'Sample Record')
      .replace('{date}', now.toLocaleDateString())
      .replace('{time}', now.toLocaleTimeString())
      .replace('{beat}', 'Beat 12');
  };

  const handleSave = async () => {
    if (!name || !eventCode || !sourceTable) {
      toast.error('Give the rule a name, and pick an event and module.');
      return;
    }
    if (receiverType === 'role' && !receiverRole) {
      toast.error('Pick which role should receive this.');
      return;
    }
    if (receiverType === 'specific_user' && !receiverUserId) {
      toast.error('Pick which person should receive this.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        event_code: eventCode,
        source_table: sourceTable,
        receiver_type: receiverType,
        receiver_role: receiverType === 'role' ? receiverRole : null,
        receiver_user_id: receiverType === 'specific_user' ? receiverUserId : null,
        notification_channel,
        title_template: titleTemplate,
        message_template: messageTemplate,
        updated_at: new Date().toISOString(),
        ...(rule ? {} : { created_by: userId }),
      };

      if (rule) {
        const { error } = await supabase.from('notification_rules').update(payload).eq('id', rule.id);
        if (error) throw error;
        toast.success('Rule updated');
      } else {
        const { error } = await supabase.from('notification_rules').insert(payload);
        if (error) throw error;
        toast.success('Rule created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!eventCode || !sourceTable) {
      toast.error('Pick an event and a module before testing.');
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await (supabase as any).rpc('notify_send_test', {
        p_event_code: eventCode,
        p_source_table: sourceTable,
      });
      if (error) throw error;
      const names = ((data as any[]) || []).map((r) => r.name).filter(Boolean);
      toast.success(
        names.length ? `Test sent to: ${names.join(', ')}` : 'Test sent — no matching recipients.',
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  };

  const chip = 'inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[13px] font-medium text-primary';
  const showActorPreview = receiverType === 'employee' || receiverType === 'manager' || receiverType === 'hierarchy';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">{rule ? 'Edit Rule' : 'Create Notification Rule'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Rule name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notify manager on new order" />
        </div>

        {/* Sentence-style builder */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Rule</p>
          <div className="flex flex-wrap items-center gap-2 text-[14px] leading-8">
            <span>When</span>
            <Select value={eventCode} onValueChange={setEventCode}>
              <SelectTrigger className={`${chip} h-8 w-auto min-w-[140px]`}>
                <SelectValue placeholder="event" />
              </SelectTrigger>
              <SelectContent>
                {(eventTypes as any[]).map((et) => (
                  <SelectItem key={et.event_code} value={et.event_code}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>happens on</span>
            <Select value={sourceTable} onValueChange={setSourceTable}>
              <SelectTrigger className={`${chip} h-8 w-auto min-w-[140px]`}>
                <SelectValue placeholder="module" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TABLES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>, notify</span>
            <Select value={receiverType} onValueChange={setReceiverType}>
              <SelectTrigger className={`${chip} h-8 w-auto min-w-[180px]`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[320px]">
                {WHOM_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    <div className="flex flex-col">
                      <span>{w.label}</span>
                      <span className="text-[11px] text-muted-foreground">{w.sub}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>, via</span>
            <Select value={notification_channel} onValueChange={setChannel}>
              <SelectTrigger className={`${chip} h-8 w-auto min-w-[110px]`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>.</span>
          </div>

          {receiverType === 'role' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Label className="text-xs text-muted-foreground">Role name</Label>
              <Input
                value={receiverRole}
                onChange={(e) => setReceiverRole(e.target.value)}
                placeholder="e.g. admin, sales_manager"
                className="h-8 max-w-xs"
              />
            </div>
          )}
          {receiverType === 'specific_user' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Label className="text-xs text-muted-foreground">Person</Label>
              <Select value={receiverUserId} onValueChange={setReceiverUserId}>
                <SelectTrigger className="h-8 max-w-xs">
                  <SelectValue placeholder="Pick a person" />
                </SelectTrigger>
                <SelectContent>
                  {pickUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}{u.role ? ` — ${u.role}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Live recipients preview */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Who will receive this
              {previewLoading && <span className="text-xs text-muted-foreground">(refreshing…)</span>}
            </div>
            {showActorPreview && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>preview as</span>
                <Select value={sampleActor} onValueChange={setSampleActor}>
                  <SelectTrigger className="h-7 text-xs min-w-[160px]">
                    <SelectValue placeholder="pick a rep" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {preview && preview.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {preview.map((r) => (
                <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                ({preview.length} {preview.length === 1 ? 'person' : 'people'})
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No recipients match yet — adjust the sentence above.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Message tokens</Label>
          <p className="text-xs text-muted-foreground">Click to insert into the message.</p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => insertPlaceholder(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Title Template</Label>
          <Input value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} rows={3} />
        </div>

        {showPreview && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <p className="text-sm font-semibold">{renderPreview(titleTemplate)}</p>
            <p className="text-sm text-muted-foreground">{renderPreview(messageTemplate)}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
            <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button variant="outline" onClick={handleSendTest} disabled={sendingTest} className="gap-1.5">
            <Send size={14} /> {sendingTest ? 'Sending…' : 'Send test to me'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}