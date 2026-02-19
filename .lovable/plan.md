

## Make Primary Manager and Phone Number Mandatory in Create User

Two fields need to be made required in the Create User wizard:

### Changes

**File: `src/components/admin/create-user/StepBasics.tsx`**
- Add a required asterisk (*) to the "Phone Number" label
- No other changes needed here since phone_number is already in this step

**File: `src/components/admin/create-user/StepEmployment.tsx`**
- Add a required asterisk (*) to the "Primary Manager (Reports To)" label

**File: `src/components/admin/create-user/CreateUserWizard.tsx`**
- Update `validateStep('basics')` to include `phone_number` in the required fields check
- Update `validateStep('employment')` to require `manager_id` (currently returns `true` with no validation)
- Update error messages to mention the newly required fields

### Validation Logic

```text
// basics step - add phone_number check
if (!formData.phone_number) -> show error "Phone Number is required"

// employment step - add manager_id check  
if (!formData.manager_id) -> show error "Primary Manager is required"
```

No database or edge function changes needed -- these are purely UI-level validations.

