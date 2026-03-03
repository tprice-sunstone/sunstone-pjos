-- 021_admin_roles.sql
-- Add role-based access control to platform_admins table.
-- Roles: super_admin (4) > admin (3) > support (2) > viewer (1)
-- Existing rows default to 'super_admin'.

ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin';
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
