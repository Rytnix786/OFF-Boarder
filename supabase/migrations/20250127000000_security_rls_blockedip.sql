-- Security Remediation: RLS policies for BlockedIP table
-- Migration for global IP blocks in middleware

-- Enable RLS on BlockedIP if not already enabled
ALTER TABLE "BlockedIP" ENABLE ROW LEVEL SECURITY;

-- Policy for global IP blocks ONLY (organizationId IS NULL)
-- Allows anonymous key to read only global blocks for middleware use
CREATE POLICY "global_ip_blocks_anon_read" ON "BlockedIP"
  FOR SELECT USING (
    "organizationId" IS NULL AND
    "isActive" = true
  )
  TO ANON;

-- Policy for authenticated users to read org-scoped blocks
-- Used in authenticated server routes, not middleware
CREATE POLICY "org_ip_blocks_auth_read" ON "BlockedIP"
  FOR SELECT USING (
    "organizationId" IS NOT NULL AND
    "isActive" = true AND
    "organizationId" = current_setting('app.current_org_id', true)::text
  )
  TO AUTHENTICATED;
