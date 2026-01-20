import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: Cannot run dev-reset in production environment!");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Starting dev-reset (clean wipe, NO demo data)...\n");
  console.log("Environment:", process.env.NODE_ENV || "development");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool, { schema: "public" });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("\n=== Step 1: Deleting all auth.users ===");
    const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    console.log(`Found ${allUsers?.users?.length || 0} users to delete`);
    for (const user of allUsers?.users || []) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Failed to delete user ${user.email}:`, error.message);
      } else {
        console.log(`Deleted auth user: ${user.email}`);
      }
    }

    console.log("\n=== Step 2: Truncating all public schema tables ===");
    const tables = [
      "PolicyEnforcementLog",
      "SecurityPolicy",
      "EmployeeSecurityProfile",
      "UserSession",
      "EmployeeAttestation",
      "AssetReturnProof",
      "AnalyticsSnapshot",
      "Notification",
      "PlatformAuditLog",
      "PlatformSignal",
      "PlatformStatus",
      "GlobalSecurityPolicy",
      "SupportTicket",
      "TaskEvidence",
      "EvidencePack",
      "MonitoringEvent",
      "AccessRevocation",
      "SecurityEvent",
      "RiskScore",
      "UserLockdown",
      "AssetReturn",
      "Asset",
      "Approval",
      "OffboardingTask",
      "Offboarding",
      "EmployeePortalInvite",
      "EmployeeUserLink",
      "BlockedIPAttempt",
      "BlockedIP",
      "WorkflowTemplateTask",
      "WorkflowTemplate",
      "Employee",
      "Location",
      "JobTitle",
      "Department",
      "Integration",
      "MembershipRoleAssignment",
      "CustomRolePermission",
      "CustomRole",
      "Permission",
      "Invitation",
      "JoinRequest",
      "Membership",
      "AuditLog",
      "User",
      "Organization",
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`Truncated: ${table}`);
      } catch (err) {
        console.log(`Skip (doesn't exist or empty): ${table}`);
      }
    }

    console.log("\n=== Dev Reset Complete! ===");
    console.log("\nDatabase is now EMPTY:");
    console.log("  - All auth.users deleted");
    console.log("  - All public schema tables truncated");
    console.log("\nYou can now:");
    console.log("  1. Register a new user at /register");
    console.log("  2. Create organizations manually");
    console.log("  3. Add employees and offboardings");
    console.log("\nNo demo/seed data has been created.");
  } catch (error) {
    console.error("\nFATAL ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
