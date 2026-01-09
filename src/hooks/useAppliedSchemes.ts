import { useState, useEffect, useCallback, useRef } from 'react';
import { SchemePolicies } from './useSchemePolicies';

const STORAGE_KEY_PREFIX = 'applied_schemes:';

export interface ProductSchemeBasic {
  id: string;
  scheme_type: string;
}

/**
 * Hook to manage applied schemes for an order
 * Persists to localStorage for offline support
 * Each retailer/visit combination has independent scheme state
 */
export function useAppliedSchemes(visitId: string, retailerId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${visitId || 'temp'}:${retailerId || 'unknown'}`;
  
  const [appliedSchemeIds, setAppliedSchemeIds] = useState<string[]>([]);
  const isInitialSync = useRef(true);
  const previousStorageKey = useRef<string | null>(null);

  // Re-sync state when storage key changes (different retailer/visit)
  useEffect(() => {
    // Only sync if the key actually changed
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    isInitialSync.current = true;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setAppliedSchemeIds(parsed);
      console.log('[useAppliedSchemes] Synced for key:', storageKey, 'Schemes:', parsed.length);
    } catch {
      setAppliedSchemeIds([]);
    }
  }, [storageKey]);

  // Persist to localStorage whenever appliedSchemeIds changes
  useEffect(() => {
    // Skip first save after sync to prevent overwriting
    if (isInitialSync.current) {
      isInitialSync.current = false;
      return;
    }
    
    try {
      if (appliedSchemeIds.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(appliedSchemeIds));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[useAppliedSchemes] Error saving to localStorage:', error);
    }
  }, [appliedSchemeIds, storageKey]);

  /**
   * Apply a scheme with optional policy enforcement
   */
  const applyScheme = useCallback((
    schemeId: string,
    scheme?: ProductSchemeBasic,
    policies?: SchemePolicies,
    allSchemes?: ProductSchemeBasic[]
  ) => {
    setAppliedSchemeIds(prev => {
      if (prev.includes(schemeId)) return prev;
      
      // Enforce max schemes per order
      if (policies && prev.length >= policies.maxSchemesPerOrder) {
        console.log('[useAppliedSchemes] Max schemes reached:', policies.maxSchemesPerOrder);
        return prev;
      }
      
      // Enforce stacking rules - if stacking not allowed and already have schemes
      if (policies && !policies.allowSchemeStacking && prev.length > 0) {
        console.log('[useAppliedSchemes] Stacking not allowed, already have:', prev.length);
        return prev;
      }
      
      // Enforce same-type stacking
      if (policies && scheme && allSchemes && !policies.sameTypeStacking && policies.allowSchemeStacking) {
        const appliedTypes = prev.map(id => 
          allSchemes.find(s => s.id === id)?.scheme_type
        ).filter(Boolean);
        
        if (appliedTypes.includes(scheme.scheme_type)) {
          console.log('[useAppliedSchemes] Same-type stacking not allowed for:', scheme.scheme_type);
          return prev;
        }
      }
      
      const updated = [...prev, schemeId];
      console.log('[useAppliedSchemes] Applied scheme:', schemeId, 'Total:', updated.length);
      return updated;
    });
  }, []);

  const removeScheme = useCallback((schemeId: string) => {
    setAppliedSchemeIds(prev => {
      const updated = prev.filter(id => id !== schemeId);
      console.log('[useAppliedSchemes] Removed scheme:', schemeId, 'Remaining:', updated.length);
      return updated;
    });
  }, []);

  const clearSchemes = useCallback(() => {
    setAppliedSchemeIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    console.log('[useAppliedSchemes] Cleared all schemes');
  }, [storageKey]);

  const isSchemeApplied = useCallback((schemeId: string) => {
    return appliedSchemeIds.includes(schemeId);
  }, [appliedSchemeIds]);

  /**
   * Replace all applied schemes with a single best scheme
   * Used when stacking is not allowed
   */
  const setOnlyScheme = useCallback((schemeId: string) => {
    setAppliedSchemeIds([schemeId]);
    console.log('[useAppliedSchemes] Set only scheme:', schemeId);
  }, []);

  return {
    appliedSchemeIds,
    applyScheme,
    removeScheme,
    clearSchemes,
    isSchemeApplied,
    setOnlyScheme
  };
}
