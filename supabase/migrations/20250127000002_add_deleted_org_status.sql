-- Add DELETED status to OrgStatus enum
-- This migration adds the ability to soft delete organizations

-- First, we need to drop and recreate the enum with DELETED status
-- Note: This requires careful handling in production

-- Drop existing enum (PostgreSQL doesn't support adding to enums)
DROP TYPE IF EXISTS "OrgStatus";

-- Recreate enum with DELETED status
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DELETED');

-- Update any existing columns that use this enum
-- Organization table
ALTER TABLE "Organization" ALTER COLUMN "status" TYPE "OrgStatus" USING "status"::text::"OrgStatus";

-- Any other tables using OrgStatus will need similar updates
