import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Eye } from 'lucide-react';
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

const RECEIVER_TYPES = [
  { value: 'employee', label: 'Employee (Actor)' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'All Admins' },
  { value: 'role', label: 'Specific Role' },
  { value: 'specific_user', label: 'Specific User' },
];

const CHANNELS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push (Future)' },
];

const PLACEHOLDERS = ['{user_name}', '{module_name}', '{record_name}', '{date}', '{points}'];

export function NotificationRuleForm({ rule, userId, onClose, onSaved }: NotificationRuleFormProps) {
  const [name, setName] = useState(rule?.name || '');
  const [eventCode, setEventCode] = useState(rule?.event_code || '');
  const [sourceTable, setSourceTable] = useState(rule?.source_table || '');
  const [receiverType, setReceiverType] = useState(rule?.receiver_type || 'employee');
  const [receiverRole, setReceiverRole] = useState(rule?.receiver_role || '');
  const [notification_channel, setChannel] = useState(rule?.notification_channel || 'in_app');
  const [titleTemplate, setTitleTemplate] = useState(rule?.title_template || '{user_name} - {module_name}');
  const [messageTemplate, setMessageTemplate] = useState(rule?.message_template || '{user_name} performed an action on {module_name}');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const insertPlaceholder = (placeholder: string, target: 'title' | 'message') => {
    if (target === 'title') setTitleTemplate(prev => prev + placeholder);
    else setMessageTemplate(prev => prev + placeholder);
  };

  const renderPreview = (template: string) => {
    return template
      .replace('{user_name}', 'John Doe')
      .replace('{module_name}', sourceTable ? sourceTable.replace(/_/g, ' ') : 'Module')
      .replace('{record_name}', 'Sample Record')
      .replace('{date}', new Date().toLocaleDateString())
      .replace('{points}', '100');
  };

  const handleSave = async () => {
    if (!name || !eventCode || !sourceTable) {
      toast.error('Please fill in all required fields');
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">{rule ? 'Edit Rule' : 'Create Notification Rule'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rule Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notify manager on new order" />
          </div>
          <div className="space-y-2">
            <Label>Event Type *</Label>
            <Select value={eventCode} onValueChange={setEventCode}>
              <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {eventTypes.map((et: any) => (
                  <SelectItem key={et.event_code} value={et.event_code}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source Table *</Label>
            <Select value={sourceTable} onValueChange={setSourceTable}>
              <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
              <SelectContent>
                {SOURCE_TABLES.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receiver</Label>
            <Select value={receiverType} onValueChange={setReceiverType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECEIVER_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {receiverType === 'role' && (
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={receiverRole} onChange={e => setReceiverRole(e.target.value)} placeholder="e.g. admin, moderator" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={notification_channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Placeholders</Label>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map(p => (
              <Badge
                key={p}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => insertPlaceholder(p, 'message')}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Title Template</Label>
          <Input value={titleTemplate} onChange={e => setTitleTemplate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Message Template</Label>
          <Textarea value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} rows={3} />
        </div>

        {showPreview && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <p className="text-sm font-semibold">{renderPreview(titleTemplate)}</p>
            <p className="text-sm text-muted-foreground">{renderPreview(messageTemplate)}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
            <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
