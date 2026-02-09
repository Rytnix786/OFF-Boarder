import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DEMO_PASSWORD = "Demo@123#";

const DEMO_ACCOUNTS = [
  {
    id: "usr-platform-admin-001",
    email: "admin@offboardhq.demo",
    name: "Platform Admin",
    isPlatformAdmin: true,
    orgRole: null, // not in org
  },
  {
    id: "usr-owner-001",
    email: "owner@acme.demo",
    name: "Acme Owner",
    isPlatformAdmin: false,
    orgRole: "OWNER" as const,
  },
  {
    id: "usr-admin-001",
    email: "orgadmin@acme.demo",
    name: "Acme Admin",
    isPlatformAdmin: false,
    orgRole: "ADMIN" as const,
  },
  {
    id: "usr-contributor-001",
    email: "contributor@acme.demo",
    name: "Acme Contributor",
    isPlatformAdmin: false,
    orgRole: "CONTRIBUTOR" as const,
  },
  {
    id: "usr-auditor-001",
    email: "auditor@acme.demo",
    name: "Acme Auditor",
    isPlatformAdmin: false,
    orgRole: "AUDITOR" as const,
  },
];

const DEMO_ORG = { id: "org-acme-001", name: "Acme Corporation", slug: "acme-corp" };

const TABLES_TO_TRUNCATE = [
  "TaskComment",
  "AssetEvidence",
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
  "EnterpriseMessage",
  "EnterpriseConversation",
  "EmailQueue",
  "EmailConfig",
  "User",
  "Organization",
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: Cannot run reset-to-demo in production environment!");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Starting reset-to-demo...\n");
  console.log("Environment:", process.env.NODE_ENV || "development");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool, { schema: "public" });
  const prisma = new PrismaClient({ adapter });

  try {
    // === Step 1: Delete all auth users ===
    console.log("\n=== Step 1: Deleting all auth.users ===");
    const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    console.log(`Found ${allUsers?.users?.length || 0} users to delete`);
    for (const user of allUsers?.users || []) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Failed to delete user ${user.email}:`, error.message);
      } else {
        console.log(`  Deleted: ${user.email}`);
      }
    }

    // === Step 2: Truncate all tables ===
    console.log("\n=== Step 2: Truncating all public schema tables ===");
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`  Truncated: ${table}`);
      } catch {
        console.log(`  Skip: ${table}`);
      }
    }

    // === Step 3: Create auth users in Supabase ===
    console.log("\n=== Step 3: Creating demo auth users ===");
    const supabaseIdMap: Record<string, string> = {};

    for (const account of DEMO_ACCOUNTS) {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error(`  Failed to create ${account.email}:`, error.message);
        continue;
      }

      supabaseIdMap[account.email] = newUser.user.id;
      console.log(`  Created: ${account.email} (supabase: ${newUser.user.id})`);
    }

    // === Step 4: Create User records ===
    console.log("\n=== Step 4: Creating User records ===");
    const now = new Date();

    for (const account of DEMO_ACCOUNTS) {
      const supabaseId = supabaseIdMap[account.email];
      if (!supabaseId) continue;

      await prisma.user.create({
        data: {
          id: account.id,
          supabaseId,
          email: account.email,
          name: account.name,
          isPlatformAdmin: account.isPlatformAdmin,
          updatedAt: now,
        },
      });
      console.log(`  User: ${account.email} (id: ${account.id}, platformAdmin: ${account.isPlatformAdmin})`);
    }

    // === Step 5: Create Organization ===
    console.log("\n=== Step 5: Creating Organization ===");
    const org = await prisma.organization.create({
      data: {
        id: DEMO_ORG.id,
        name: DEMO_ORG.name,
        slug: DEMO_ORG.slug,
        status: "ACTIVE",
        isSetupComplete: true,
        setupCompletedAt: now,
        updatedAt: now,
      },
    });
    console.log(`  Organization: ${org.name} (id: ${org.id}, slug: ${org.slug})`);

    // === Step 6: Create Memberships for org roles ===
    console.log("\n=== Step 6: Creating Memberships ===");
    const membershipIds: Record<string, string> = {};
    const orgAccounts = DEMO_ACCOUNTS.filter((a) => a.orgRole !== null);

    for (const account of orgAccounts) {
      const membership = await prisma.membership.create({
        data: {
          id: `mem-${account.orgRole!.toLowerCase()}-001`,
          userId: account.id,
          organizationId: org.id,
          systemRole: account.orgRole!,
          status: "ACTIVE",
          approvedAt: now,
          updatedAt: now,
        },
      });
      membershipIds[account.email] = membership.id;
      console.log(`  Membership: ${account.email} -> ${account.orgRole} (id: ${membership.id})`);
    }

    // === Step 7: Create Departments, JobTitles, Locations ===
    console.log("\n=== Step 7: Creating Departments, JobTitles, Locations ===");
    const deptEng = await prisma.department.create({
      data: {
        id: "dept-engineering-001",
        name: "Engineering",
        description: "Software development team",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`  Department: ${deptEng.name}`);

    const deptHR = await prisma.department.create({
      data: {
        id: "dept-hr-001",
        name: "Human Resources",
        description: "HR and people operations",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`  Department: ${deptHR.name}`);

    const deptFinance = await prisma.department.create({
      data: {
        id: "dept-finance-001",
        name: "Finance",
        description: "Finance and accounting",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`  Department: ${deptFinance.name}`);

    const jtSWE = await prisma.jobTitle.create({
      data: {
        id: "jt-swe-001",
        title: "Software Engineer",
        level: 3,
        organizationId: org.id,
        updatedAt: now,
      },
    });

    const jtMgr = await prisma.jobTitle.create({
      data: {
        id: "jt-eng-mgr-001",
        title: "Engineering Manager",
        level: 5,
        organizationId: org.id,
        updatedAt: now,
      },
    });

    const jtAnalyst = await prisma.jobTitle.create({
      data: {
        id: "jt-analyst-001",
        title: "Business Analyst",
        level: 3,
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`  JobTitles: Software Engineer, Engineering Manager, Business Analyst`);

    const locHQ = await prisma.location.create({
      data: {
        id: "loc-sf-hq-001",
        name: "San Francisco HQ",
        address: "123 Market Street",
        city: "San Francisco",
        country: "United States",
        timezone: "America/Los_Angeles",
        organizationId: org.id,
        updatedAt: now,
      },
    });

    const locNY = await prisma.location.create({
      data: {
        id: "loc-ny-001",
        name: "New York Office",
        address: "456 Broadway",
        city: "New York",
        country: "United States",
        timezone: "America/New_York",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`  Locations: San Francisco HQ, New York Office`);

    // === Step 8: Create Employees ===
    console.log("\n=== Step 8: Creating Employees ===");
    const managerMembershipId = membershipIds["orgadmin@acme.demo"] || null;

    const manager = await prisma.employee.create({
      data: {
        id: "emp-manager-001",
        employeeId: "ACME-001",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acme.com",
        phone: "+1-555-0100",
        hireDate: new Date("2020-01-15"),
        status: "ACTIVE",
        organizationId: org.id,
        departmentId: deptEng.id,
        jobTitleId: jtMgr.id,
        locationId: locHQ.id,
        updatedAt: now,
      },
    });
    console.log(`  Employee: Sarah Johnson (Manager, Engineering)`);

    const employees = [
      {
        id: "emp-active-001",
        employeeId: "ACME-002",
        firstName: "Alex",
        lastName: "Chen",
        email: "alex.chen@acme.com",
        departmentId: deptEng.id,
        jobTitleId: jtSWE.id,
        locationId: locHQ.id,
        status: "ACTIVE" as const,
      },
      {
        id: "emp-active-002",
        employeeId: "ACME-003",
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@acme.com",
        departmentId: deptHR.id,
        jobTitleId: jtAnalyst.id,
        locationId: locHQ.id,
        status: "ACTIVE" as const,
      },
      {
        id: "emp-active-003",
        employeeId: "ACME-004",
        firstName: "James",
        lastName: "Wilson",
        email: "james.wilson@acme.com",
        departmentId: deptFinance.id,
        jobTitleId: jtAnalyst.id,
        locationId: locNY.id,
        status: "ACTIVE" as const,
      },
    ];

    for (const emp of employees) {
      await prisma.employee.create({
        data: {
          id: emp.id,
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          hireDate: new Date("2022-06-01"),
          status: emp.status,
          organizationId: org.id,
          departmentId: emp.departmentId,
          jobTitleId: emp.jobTitleId,
          locationId: emp.locationId,
          managerMembershipId,
          updatedAt: now,
        },
      });
      console.log(`  Employee: ${emp.firstName} ${emp.lastName} (${emp.status})`);
    }

    // Offboarding employee
    const offboardEmp = await prisma.employee.create({
      data: {
        id: "emp-offboard-001",
        employeeId: "ACME-005",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@acme.com",
        hireDate: new Date("2021-05-01"),
        lastWorkingDay: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "OFFBOARDING",
        organizationId: org.id,
        departmentId: deptEng.id,
        jobTitleId: jtSWE.id,
        locationId: locHQ.id,
        managerMembershipId,
        updatedAt: now,
      },
    });
    console.log(`  Employee: John Doe (OFFBOARDING)`);

    // === Step 9: Create Offboarding with tasks ===
    console.log("\n=== Step 9: Creating Offboarding + Tasks ===");
    const offboarding = await prisma.offboarding.create({
      data: {
        id: "offb-001",
        employeeId: offboardEmp.id,
        organizationId: org.id,
        status: "IN_PROGRESS",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "Voluntary resignation",
        notes: "Employee accepted position at another company",
        riskLevel: "NORMAL",
        updatedAt: now,
      },
    });
    console.log(`  Offboarding: ${offboarding.id} (IN_PROGRESS)`);

    const tasks = [
      { id: "task-001", name: "Revoke email access", category: "ACCESS", status: "COMPLETED" as const, order: 1 },
      { id: "task-002", name: "Revoke Slack access", category: "ACCESS", status: "COMPLETED" as const, order: 2 },
      { id: "task-003", name: "Revoke GitHub access", category: "ACCESS", status: "IN_PROGRESS" as const, order: 3 },
      { id: "task-004", name: "Return laptop", category: "ASSETS", status: "PENDING" as const, order: 4 },
      { id: "task-005", name: "Exit interview", category: "HR", status: "PENDING" as const, order: 5 },
      { id: "task-006", name: "Knowledge transfer", category: "HANDOVER", status: "IN_PROGRESS" as const, order: 6 },
    ];

    for (const task of tasks) {
      await prisma.offboardingTask.create({
        data: {
          id: task.id,
          offboardingId: offboarding.id,
          name: task.name,
          category: task.category,
          status: task.status,
          order: task.order,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          completedAt: task.status === "COMPLETED" ? now : null,
          updatedAt: now,
        },
      });
    }
    console.log(`  Created ${tasks.length} offboarding tasks`);

    // === Step 10: Create Assets ===
    console.log("\n=== Step 10: Creating Assets ===");
    await prisma.asset.create({
      data: {
        id: "asset-laptop-001",
        organizationId: org.id,
        employeeId: offboardEmp.id,
        name: "MacBook Pro 16\" (M3 Max)",
        type: "LAPTOP",
        serialNumber: "SN-ACME-9921",
        assetTag: "ACME-IT-001",
        status: "ASSIGNED",
        value: 3499.0,
        purchaseDate: new Date("2023-06-15"),
        createdById: DEMO_ACCOUNTS.find((a) => a.orgRole === "ADMIN")!.id,
        updatedAt: now,
      },
    });

    await prisma.asset.create({
      data: {
        id: "asset-monitor-001",
        organizationId: org.id,
        employeeId: offboardEmp.id,
        name: "Dell UltraSharp 27\" Monitor",
        type: "MONITOR",
        serialNumber: "SN-ACME-5510",
        assetTag: "ACME-IT-002",
        status: "ASSIGNED",
        value: 649.0,
        purchaseDate: new Date("2023-06-15"),
        createdById: DEMO_ACCOUNTS.find((a) => a.orgRole === "ADMIN")!.id,
        updatedAt: now,
      },
    });

    await prisma.asset.create({
      data: {
        id: "asset-badge-001",
        organizationId: org.id,
        employeeId: offboardEmp.id,
        name: "Office Access Card",
        type: "ACCESS_CARD",
        assetTag: "ACME-SEC-001",
        status: "ASSIGNED",
        createdById: DEMO_ACCOUNTS.find((a) => a.orgRole === "ADMIN")!.id,
        updatedAt: now,
      },
    });
    console.log(`  Created 3 assets assigned to John Doe`);

    // === Done ===
    console.log("\n" + "=".repeat(60));
    console.log("  RESET TO DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log("\n  Password for ALL accounts: " + DEMO_PASSWORD);
    console.log("\n  Accounts:");
    console.log("  ─────────────────────────────────────────────────────");
    console.log("  Platform Admin   │ admin@offboardhq.demo");
    console.log("  Org Owner        │ owner@acme.demo");
    console.log("  Org Admin        │ orgadmin@acme.demo");
    console.log("  Org Contributor  │ contributor@acme.demo");
    console.log("  Org Auditor      │ auditor@acme.demo");
    console.log("  ─────────────────────────────────────────────────────");
    console.log(`\n  Organization: ${DEMO_ORG.name} (slug: ${DEMO_ORG.slug})`);
    console.log(`  Employees: 5 (1 offboarding, 4 active)`);
    console.log(`  Offboarding: 1 (IN_PROGRESS, 6 tasks)`);
    console.log(`  Assets: 3 (laptop, monitor, access card)\n`);
  } catch (error) {
    console.error("\nFATAL ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
