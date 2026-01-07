import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
}

export const useCompanyData = () => {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, logo_url')
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

  return { company, isLoading };
};
