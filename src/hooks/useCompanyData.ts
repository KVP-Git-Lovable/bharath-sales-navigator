import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
  header_name: string | null;
  header_logo_url: string | null;
}

export const useCompanyData = () => {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
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
    };

    fetchCompany();
  }, []);

  // Return header-specific values with fallback to company details
  const headerName = company?.header_name || company?.name || null;
  const headerLogo = company?.header_logo_url || company?.logo_url || null;

  return { company, isLoading, headerName, headerLogo };
};
