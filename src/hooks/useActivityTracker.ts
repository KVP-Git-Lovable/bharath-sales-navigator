import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'activity_session_id';

export const useActivityTracker = () => {
  const { user } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const lastVisitTimeRef = useRef<number>(Date.now());
  const bytesRef = useRef({ uploaded: 0, downloaded: 0 });
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const creatingRef = useRef(false);
  const endingRef = useRef(false);

  const getModuleName = (path: string): string => {
    const segment = path.split('/').filter(Boolean)[0];
    return segment || 'home';
  };

  // Create session on login — with guards against duplicates
  const createSession = useCallback(async () => {
    if (!user) return;
    // Prevent concurrent creation (StrictMode double-mount)
    if (creatingRef.current) return;
    // Already have a session
    if (sessionIdRef.current) return;

    // Check localStorage for an existing session
    const existingId = localStorage.getItem(SESSION_KEY);
    if (existingId) {
      // Verify the session still exists and belongs to this user
      const { data: existing } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('id', existingId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        sessionIdRef.current = existing.id;
        return; // Reuse existing session
      }
      // Stale key — remove it
      localStorage.removeItem(SESSION_KEY);
    }

    creatingRef.current = true;
    try {
      // Close any prior orphaned sessions for this user before creating a new one
      await supabase
        .from('user_sessions')
        .update({ logout_at: new Date().toISOString(), is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (!error && data) {
        sessionIdRef.current = data.id;
        localStorage.setItem(SESSION_KEY, data.id);
      }
    } catch (e) {
      console.error('Failed to create activity session:', e);
    } finally {
      creatingRef.current = false;
    }
  }, [user]);

  // End session — with guard against double-ending
  const endSession = useCallback(async () => {
    if (endingRef.current) return;
    const sid = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sid) return;
    endingRef.current = true;
    try {
      await supabase
        .from('user_sessions')
        .update({ logout_at: new Date().toISOString(), is_active: false })
        .eq('id', sid);
    } catch (e) {
      console.error('Failed to end activity session:', e);
    }
    sessionIdRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    endingRef.current = false;
  }, []);

  // Log page view
  const logPageView = useCallback(async (path: string) => {
    if (!user || !sessionIdRef.current) return;
    // Update duration of previous page
    if (lastPathRef.current && lastPathRef.current !== path) {
      const duration = Math.round((Date.now() - lastVisitTimeRef.current) / 1000);
      supabase
        .from('user_page_views')
        .update({ duration_seconds: duration })
        .eq('session_id', sessionIdRef.current)
        .eq('page_path', lastPathRef.current)
        .is('duration_seconds', null)
        .order('visited_at', { ascending: false })
        .limit(1)
        .then(() => {});
    }

    lastPathRef.current = path;
    lastVisitTimeRef.current = Date.now();

    try {
      await supabase.from('user_page_views').insert({
        user_id: user.id,
        session_id: sessionIdRef.current,
        page_path: path,
        module_name: getModuleName(path),
      });
    } catch (e) {
      console.error('Failed to log page view:', e);
    }
  }, [user]);

  // Flush data usage
  const flushDataUsage = useCallback(async () => {
    const { uploaded, downloaded } = bytesRef.current;
    if ((uploaded === 0 && downloaded === 0) || !user || !sessionIdRef.current) return;
    bytesRef.current = { uploaded: 0, downloaded: 0 };
    try {
      await supabase.from('user_data_usage').insert({
        user_id: user.id,
        session_id: sessionIdRef.current,
        bytes_uploaded: uploaded,
        bytes_downloaded: downloaded,
      });
    } catch (e) {
      console.error('Failed to flush data usage:', e);
    }
  }, [user]);

  // Session lifecycle
  useEffect(() => {
    if (!user) return;
    createSession();

    const handleBeforeUnload = () => {
      flushDataUsage();
      endSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushDataUsage();
      endSession();
    };
  }, [user, createSession, endSession, flushDataUsage]);

  // Track route changes
  useEffect(() => {
    if (user && sessionIdRef.current) {
      logPageView(location.pathname);
    }
  }, [location.pathname, user, logPageView]);

  // PerformanceObserver for data usage estimation
  useEffect(() => {
    if (!user) return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const res = entry as PerformanceResourceTiming;
          bytesRef.current.downloaded += res.transferSize || 0;
          if (res.initiatorType === 'fetch' || res.initiatorType === 'xmlhttprequest') {
            bytesRef.current.uploaded += res.encodedBodySize || 0;
          }
        }
      });
      observer.observe({ type: 'resource', buffered: false });

      flushTimerRef.current = setInterval(flushDataUsage, 60_000);

      return () => {
        observer.disconnect();
        if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      };
    } catch {
      // PerformanceObserver not supported
    }
  }, [user, flushDataUsage]);
};
