import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateUserFormData, Manager, SecurityProfile } from './types';

interface StepEmploymentProps {
  formData: CreateUserFormData;
  onUpdate: (field: keyof CreateUserFormData, value: string) => void;
  managers: Manager[];
  securityProfiles: SecurityProfile[];
}

const StepEmployment: React.FC<StepEmploymentProps> = ({ 
  formData, 
  onUpdate, 
  managers, 
  securityProfiles 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Employment Details</h2>
        <p className="text-sm text-muted-foreground">
          Configure the user's role, salary, and reporting structure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="emergency_contact_number">Emergency Contact</Label>
          <Input
            id="emergency_contact_number"
            value={formData.emergency_contact_number}
            onChange={(e) => onUpdate('emergency_contact_number', e.target.value)}
            placeholder="+91 9876543210"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_salary">Monthly Salary (₹)</Label>
          <Input
            id="monthly_salary"
            type="number"
            value={formData.monthly_salary}
            onChange={(e) => onUpdate('monthly_salary', e.target.value)}
            placeholder="50000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily_da_allowance">Daily DA Allowance (₹)</Label>
          <Input
            id="daily_da_allowance"
            type="number"
            value={formData.daily_da_allowance}
            onChange={(e) => onUpdate('daily_da_allowance', e.target.value)}
            placeholder="500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="security_profile_id">Role *</Label>
          <Select 
            value={formData.security_profile_id} 
            onValueChange={(value) => onUpdate('security_profile_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {securityProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager_id">Primary Manager (Reports To)</Label>
          <Select 
            value={formData.manager_id} 
            onValueChange={(value) => onUpdate('manager_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary manager" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.full_name} ({manager.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary_manager_id">Secondary Manager</Label>
          <Select 
            value={formData.secondary_manager_id} 
            onValueChange={(value) => onUpdate('secondary_manager_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select secondary manager" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.full_name} ({manager.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="band">Band</Label>
          <Select 
            value={formData.band} 
            onValueChange={(value) => onUpdate('band', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select band" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default StepEmployment;
