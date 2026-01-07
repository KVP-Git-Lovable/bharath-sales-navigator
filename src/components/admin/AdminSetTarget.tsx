import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSelector } from '@/components/UserSelector';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { UserFYPlanTarget } from '@/components/profile/UserFYPlanTarget';
import { Users, Target } from 'lucide-react';

export function AdminSetTarget() {
  const { user } = useAuth();
  const { subordinates, isManager } = useSubordinates();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const selectedUser = subordinates.find(s => s.subordinate_user_id === selectedUserId);

  // When a subordinate is selected (not 'self' or 'all'), pass their ID
  const effectiveUserId = selectedUserId && selectedUserId !== 'self' && selectedUserId !== 'all' 
    ? selectedUserId 
    : '';

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Select Team Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserSelector
            selectedUserId={selectedUserId || 'self'}
            onUserChange={(id) => setSelectedUserId(id === 'self' ? '' : id)}
            showAllOption={false}
            className="max-w-md"
          />
          
          {effectiveUserId && selectedUser && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Setting targets for: <span className="font-medium text-foreground">{selectedUser.full_name}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Form */}
      {effectiveUserId ? (
        <UserFYPlanTarget targetUserId={effectiveUserId} />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a Team Member</p>
              <p className="text-sm mt-1">Choose a team member from the dropdown above to set their targets</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
