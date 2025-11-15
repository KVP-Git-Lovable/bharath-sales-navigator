-- Add new fields to competition_contacts table
ALTER TABLE competition_contacts 
ADD COLUMN IF NOT EXISTS hq TEXT,
ADD COLUMN IF NOT EXISTS region_covered TEXT,
ADD COLUMN IF NOT EXISTS reporting_to TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('Junior', 'Middle', 'Senior')),
ADD COLUMN IF NOT EXISTS skill TEXT CHECK (skill IN ('Good', 'Average', 'Not sure')),
ADD COLUMN IF NOT EXISTS competitor_since INTEGER,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('Field Sales', 'Marketing', 'Product management', 'Supply chain', 'Manager', 'Leadership')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to competition_skus table
ALTER TABLE competition_skus 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;