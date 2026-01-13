import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  rightContent?: React.ReactNode;
}

export const AdminPageHeader = ({ 
  title, 
  subtitle, 
  backPath = '/admin-controls',
  rightContent 
}: AdminPageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Button 
        onClick={() => navigate(backPath)} 
        variant="ghost" 
        size="sm"
        className="p-2"
      >
        <ArrowLeft size={20} />
      </Button>
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
};
