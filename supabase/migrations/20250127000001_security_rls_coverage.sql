-- Security Remediation: RLS Policy Coverage Verification and Implementation
-- This migration enables RLS on key security-sensitive tables and adds policies

-- Check existing RLS policies first
-- This will be logged for audit purposes
DO $$
DECLARE 
    table_name text;
    rls_enabled boolean;
    policy_count integer;
BEGIN
    RAISE NOTICE '=== RLS Policy Coverage Audit ===';
    
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('Organization', 'Membership', 'Employee', 'User', 'AuditLog', 'Offboarding', 'Asset')
    LOOP
        SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE relname = table_name;
        SELECT count(*) INTO policy_count FROM pg_policies WHERE tablename = table_name;
        
        RAISE NOTICE 'Table: %, RLS Enabled: %, Policy Count: %', table_name, rls_enabled, policy_count;
    END LOOP;
END $$;

-- Enable RLS on critical tables if not already enabled
DO $$
BEGIN
    -- Organization table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Organization' AND relrowsecurity = true) THEN
        ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on Organization table';
    END IF;
    
    -- Membership table  
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Membership' AND relrowsecurity = true) THEN
        ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on Membership table';
    END IF;
    
    -- Employee table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Employee' AND relrowsecurity = true) THEN
        ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on Employee table';
    END IF;
    
    -- User table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'User' AND relrowsecurity = true) THEN
        ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on User table';
    END IF;
    
    -- AuditLog table
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AuditLog' AND relrowsecurity = true) THEN
        ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on AuditLog table';
    END IF;
END $$;

-- Add organization-scoped policies for key tables
-- Organization table - users can only see their own org
CREATE POLICY "users_view_own_org" ON "Organization"
  FOR SELECT USING (
    id = current_setting('app.current_org_id', true)::text
  )
  TO AUTHENTICATED;

-- Membership table - users can only see memberships for their org
CREATE POLICY "users_view_org_memberships" ON "Membership"
  FOR SELECT USING (
    organizationId = current_setting('app.current_org_id', true)::text
  )
  TO AUTHENTICATED;

-- Employee table - users can only see employees for their org
CREATE POLICY "users_view_org_employees" ON "Employee"
  FOR SELECT USING (
    organizationId = current_setting('app.current_org_id', true)::text
  )
  TO AUTHENTICATED;

-- User table - users can only see their own profile
CREATE POLICY "users_view_own_profile" ON "User"
  FOR SELECT USING (
    supabaseId = auth.uid()
  )
  TO AUTHENTICATED;

-- AuditLog table - organization-scoped access
CREATE POLICY "users_view_org_audit_logs" ON "AuditLog"
  FOR SELECT USING (
    organizationId = current_setting('app.current_org_id', true)::text OR
    organizationId IS NULL -- System-level logs
  )
  TO AUTHENTICATED;
