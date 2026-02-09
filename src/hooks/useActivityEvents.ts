import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityEvent {
  id: string;
  visit_id: string;
  user_id: string;
  activity_type: string;
  duration_type: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  half_day_type: string | null;
  from_date: string | null;
  to_date: string | null;
  total_days: number | null;
  retailer_id: string | null;
  retailer_name: string | null;
  remarks: string | null;
  created_at: string;
}

interface CreateActivityParams {
  activity_type: string;
  duration_type: string;
  activity_date: string;
  start_time?: string;
  end_time?: string;
  half_day_type?: string;
  from_date?: string;
  to_date?: string;
  total_days?: number;
  retailer_id?: string;
  retailer_name?: string;
  remarks?: string;
}

// Cache for activity events by visit_id
const activityCache = new Map<string, ActivityEvent>();

export const useActivityEvents = () => {
  const { user } = useAuth();

  const fetchActivityForVisit = async (visitId: string): Promise<ActivityEvent | null> => {
    // Check cache first
    if (activityCache.has(visitId)) {
      return activityCache.get(visitId) || null;
    }

    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('visit_id', visitId)
      .maybeSingle();

    if (error) {
      console.error('[useActivityEvents] Error fetching activity:', error);
      return null;
    }

    if (data) {
      const activity = data as unknown as ActivityEvent;
      activityCache.set(visitId, activity);
      return activity;
    }

    return null;
  };

  const createActivity = async (params: CreateActivityParams): Promise<{ visitId: string; activityId: string } | null> => {
    if (!user?.id) return null;

    try {
      // 1. Create the visit record first
      const plannedDate = params.duration_type === 'multiple_days' && params.from_date 
        ? params.from_date 
        : params.activity_date;

      // retailer_id is required in visits table - use a placeholder if none selected
      const retailerId = params.retailer_id;
      if (!retailerId) {
        console.error('[useActivityEvents] retailer_id is required for visits');
        throw new Error('Please select a customer/outlet for the activity');
      }

      const visitInsert: Record<string, unknown> = {
        user_id: user.id,
        retailer_id: retailerId,
        planned_date: plannedDate,
        status: 'planned',
        visit_type: 'activity',
      };

      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert(visitInsert as any)
        .select('id')
        .single();

      if (visitError) {
        console.error('[useActivityEvents] Error creating visit:', visitError);
        throw visitError;
      }

      const visitId = visitData.id;

      // 2. Create the activity_events record
      const activityInsert: Record<string, unknown> = {
        visit_id: visitId,
        user_id: user.id,
        activity_type: params.activity_type,
        duration_type: params.duration_type,
        activity_date: params.activity_date,
        start_time: params.start_time || null,
        end_time: params.end_time || null,
        half_day_type: params.half_day_type || null,
        from_date: params.from_date || null,
        to_date: params.to_date || null,
        total_days: params.total_days || null,
        retailer_id: params.retailer_id || null,
        retailer_name: params.retailer_name || null,
        remarks: params.remarks || null,
      };

      const { data: activityData, error: activityError } = await supabase
        .from('activity_events')
        .insert(activityInsert as any)
        .select('id')
        .single();

      if (activityError) {
        console.error('[useActivityEvents] Error creating activity event:', activityError);
        // Clean up the visit if activity insert fails
        await supabase.from('visits').delete().eq('id', visitId);
        throw activityError;
      }

      // Dispatch event for UI refresh
      window.dispatchEvent(new CustomEvent('visitDataChanged'));

      return { visitId, activityId: activityData.id };
    } catch (error) {
      console.error('[useActivityEvents] createActivity failed:', error);
      return null;
    }
  };

  const clearCache = () => {
    activityCache.clear();
  };

  return {
    fetchActivityForVisit,
    createActivity,
    clearCache,
  };
};

// Helper to format activity duration for display
export const formatActivityDuration = (activity: ActivityEvent): string => {
  switch (activity.duration_type) {
    case 'hour_based': {
      if (activity.start_time && activity.end_time) {
        const start = new Date(activity.start_time);
        const end = new Date(activity.end_time);
        const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const diffHrs = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
        return `${startStr} - ${endStr} (${diffHrs} hrs)`;
      }
      return 'Hour-based';
    }
    case 'half_day':
      return activity.half_day_type === 'first_half' ? 'First Half' : 'Second Half';
    case 'full_day':
      return 'Full Day';
    case 'multiple_days': {
      if (activity.from_date && activity.to_date) {
        const from = new Date(activity.from_date + 'T00:00:00');
        const to = new Date(activity.to_date + 'T00:00:00');
        const fromStr = from.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const toStr = to.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${fromStr} - ${toStr} (${activity.total_days || '?'} days)`;
      }
      return 'Multiple Days';
    }
    default:
      return activity.duration_type;
  }
};
