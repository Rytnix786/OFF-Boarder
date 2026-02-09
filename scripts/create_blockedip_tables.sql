DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlockScope') THEN
    CREATE TYPE "BlockScope" AS ENUM ('GLOBAL', 'ORGANIZATION', 'EMPLOYEE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BlockedIP" (
  "id" TEXT PRIMARY KEY,
  "ipAddress" TEXT NOT NULL,
  "scope" "BlockScope" NOT NULL DEFAULT 'ORGANIZATION',
  "organizationId" TEXT,
  "employeeId" TEXT,
  "offboardingOnly" BOOLEAN NOT NULL DEFAULT FALSE,
  "reason" TEXT,
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BlockedIPAttempt" (
  "id" TEXT PRIMARY KEY,
  "ipAddress" TEXT NOT NULL,
  "blockedIPId" TEXT,
  "path" TEXT,
  "method" TEXT,
  "userId" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BlockedIP_ipAddress_idx" ON "BlockedIP" ("ipAddress");
CREATE INDEX IF NOT EXISTS "BlockedIP_organizationId_idx" ON "BlockedIP" ("organizationId");
CREATE INDEX IF NOT EXISTS "BlockedIP_employeeId_idx" ON "BlockedIP" ("employeeId");
CREATE INDEX IF NOT EXISTS "BlockedIP_scope_idx" ON "BlockedIP" ("scope");
CREATE INDEX IF NOT EXISTS "BlockedIP_isActive_idx" ON "BlockedIP" ("isActive");

CREATE INDEX IF NOT EXISTS "BlockedIPAttempt_ipAddress_idx" ON "BlockedIPAttempt" ("ipAddress");
CREATE INDEX IF NOT EXISTS "BlockedIPAttempt_createdAt_idx" ON "BlockedIPAttempt" ("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedIP_createdById_fkey') THEN
    ALTER TABLE "BlockedIP"
    ADD CONSTRAINT "BlockedIP_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedIP_employeeId_fkey') THEN
    ALTER TABLE "BlockedIP"
    ADD CONSTRAINT "BlockedIP_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedIP_organizationId_fkey') THEN
    ALTER TABLE "BlockedIP"
    ADD CONSTRAINT "BlockedIP_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedIPAttempt_blockedIPId_fkey') THEN
    ALTER TABLE "BlockedIPAttempt"
    ADD CONSTRAINT "BlockedIPAttempt_blockedIPId_fkey"
    FOREIGN KEY ("blockedIPId") REFERENCES "BlockedIP"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedIPAttempt_userId_fkey') THEN
    ALTER TABLE "BlockedIPAttempt"
    ADD CONSTRAINT "BlockedIPAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;
