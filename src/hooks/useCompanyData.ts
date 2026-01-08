import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
  header_name: string | null;
  header_logo_url: string | null;
}

// Custom event name for header branding updates
export const HEADER_BRANDING_UPDATED_EVENT = 'header-branding-updated';

export const useCompanyData = () => {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, header_name, header_logo_url')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company:', error);
      }
      
      setCompany(data);
    } catch (err) {
      console.error('Error fetching company data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();

    // Listen for header branding updates
    const handleBrandingUpdate = () => {
      fetchCompany();
    };

    window.addEventListener(HEADER_BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    return () => {
      window.removeEventListener(HEADER_BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    };
  }, [fetchCompany]);

  // Return header-specific values with fallback to company details
  const headerName = company?.header_name || company?.name || null;
  const headerLogo = company?.header_logo_url || company?.logo_url || null;

  return { company, isLoading, headerName, headerLogo, refetch: fetchCompany };
};
