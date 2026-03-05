import React from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RetailerExternalDBLookup } from '@/components/admin/RetailerExternalDBLookup';

const RetailerExternalDBPage: React.FC = () => {
  const { hasAdminAccess, loading } = useAdminAccess();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <AdminPageHeader
            title="Retailer External Database"
            subtitle="Browse external grocery retailer data by state and city"
          />
          <RetailerExternalDBLookup />
        </div>
      </div>
    </Layout>
  );
};

export default RetailerExternalDBPage;
