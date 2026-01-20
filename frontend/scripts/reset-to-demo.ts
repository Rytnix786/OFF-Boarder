import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DEMO_PASSWORD = "Demo123!@#";

const DEMO_ACCOUNTS = [
  { email: "admin@offboardhq.demo", name: "Platform Admin", isPlatformAdmin: true },
  { email: "owner@acme.demo", name: "Acme Owner", isPlatformAdmin: false },
  { email: "member@acme.demo", name: "Acme Member", isPlatformAdmin: false },
];

const DEMO_ORG = { name: "Acme Corporation", slug: "acme-corp" };

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

    console.log("\n=== Step 3: Creating demo auth users ===");
    const userIdMap: Record<string, string> = {};

    for (const account of DEMO_ACCOUNTS) {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error(`Failed to create ${account.email}:`, error.message);
        continue;
      }

      userIdMap[account.email] = newUser.user.id;
      console.log(`Created auth user: ${account.email} (${newUser.user.id})`);
    }

    console.log("\n=== Step 4: Creating demo data in public schema ===");
    const now = new Date();

    for (const account of DEMO_ACCOUNTS) {
      const supabaseId = userIdMap[account.email];
      if (!supabaseId) continue;

      await prisma.user.create({
        data: {
          supabaseId,
          email: account.email,
          name: account.name,
          isPlatformAdmin: account.isPlatformAdmin,
          updatedAt: now,
        },
      });
      console.log(`Created User: ${account.email}`);
    }

    const org = await prisma.organization.create({
      data: {
        name: DEMO_ORG.name,
        slug: DEMO_ORG.slug,
        status: "ACTIVE",
        isSetupComplete: true,
        setupCompletedAt: now,
        updatedAt: now,
      },
    });
    console.log(`Created Organization: ${org.name} (${org.slug})`);

    const ownerUser = await prisma.user.findUnique({ where: { email: "owner@acme.demo" } });
    const memberUser = await prisma.user.findUnique({ where: { email: "member@acme.demo" } });

    if (ownerUser) {
      await prisma.membership.create({
        data: {
          userId: ownerUser.id,
          organizationId: org.id,
          systemRole: "OWNER",
          status: "ACTIVE",
          updatedAt: now,
        },
      });
      console.log(`Created Membership: owner@acme.demo -> OWNER`);
    }

    if (memberUser) {
      await prisma.membership.create({
        data: {
          userId: memberUser.id,
          organizationId: org.id,
          systemRole: "CONTRIBUTOR",
          status: "ACTIVE",
          updatedAt: now,
        },
      });
      console.log(`Created Membership: member@acme.demo -> CONTRIBUTOR`);
    }

    const department = await prisma.department.create({
      data: {
        id: "demo-eng-dept",
        name: "Engineering",
        description: "Software development team",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`Created Department: Engineering`);

    await prisma.department.create({
      data: {
        id: "demo-hr-dept",
        name: "Human Resources",
        description: "HR and people operations",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`Created Department: Human Resources`);

    const jobTitle = await prisma.jobTitle.create({
      data: {
        id: "demo-swe-title",
        title: "Software Engineer",
        level: 3,
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`Created JobTitle: Software Engineer`);

    const jobTitleMgr = await prisma.jobTitle.create({
      data: {
        id: "demo-mgr-title",
        title: "Engineering Manager",
        level: 5,
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`Created JobTitle: Engineering Manager`);

    const location = await prisma.location.create({
      data: {
        id: "demo-sf-location",
        name: "San Francisco HQ",
        address: "123 Market Street",
        city: "San Francisco",
        country: "United States",
        timezone: "America/Los_Angeles",
        organizationId: org.id,
        updatedAt: now,
      },
    });
    console.log(`Created Location: San Francisco HQ`);

    const manager = await prisma.employee.create({
      data: {
        id: "demo-manager",
        employeeId: "ACME001",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acme.com",
        phone: "+1-555-0100",
        hireDate: new Date("2020-01-15"),
        status: "ACTIVE",
        organizationId: org.id,
        departmentId: department.id,
        jobTitleId: jobTitleMgr.id,
        locationId: location.id,
        updatedAt: now,
      },
    });
    console.log(`Created Employee: Sarah Johnson (Manager)`);

    const employees = [
      { id: "demo-emp-1", employeeId: "ACME002", firstName: "Alex", lastName: "Chen", email: "alex.chen@acme.com" },
      { id: "demo-emp-2", employeeId: "ACME003", firstName: "Maria", lastName: "Garcia", email: "maria.garcia@acme.com" },
      { id: "demo-emp-3", employeeId: "ACME004", firstName: "James", lastName: "Wilson", email: "james.wilson@acme.com" },
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
          status: "ACTIVE",
          organizationId: org.id,
          departmentId: department.id,
          jobTitleId: jobTitle.id,
          locationId: location.id,
          managerId: manager.id,
          updatedAt: now,
        },
      });
      console.log(`Created Employee: ${emp.firstName} ${emp.lastName}`);
    }

    const offboardingEmployee = await prisma.employee.create({
      data: {
        id: "demo-offboard-emp",
        employeeId: "ACME005",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@acme.com",
        hireDate: new Date("2021-05-01"),
        status: "OFFBOARDING",
        organizationId: org.id,
        departmentId: department.id,
        jobTitleId: jobTitle.id,
        locationId: location.id,
        managerId: manager.id,
        updatedAt: now,
      },
    });
    console.log(`Created Employee: John Doe (Offboarding)`);

    const offboarding = await prisma.offboarding.create({
      data: {
        employeeId: offboardingEmployee.id,
        organizationId: org.id,
        status: "IN_PROGRESS",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "Voluntary resignation",
        notes: "Employee accepted position at another company",
        updatedAt: now,
      },
    });
    console.log(`Created Offboarding for John Doe`);

    const tasks = [
      { name: "Revoke email access", status: "COMPLETED" as const },
      { name: "Revoke Slack access", status: "COMPLETED" as const },
      { name: "Revoke GitHub access", status: "IN_PROGRESS" as const },
      { name: "Return laptop", status: "PENDING" as const },
      { name: "Exit interview", status: "PENDING" as const },
      { name: "Knowledge transfer", status: "IN_PROGRESS" as const },
    ];

    for (const task of tasks) {
      await prisma.offboardingTask.create({
        data: {
          offboardingId: offboarding.id,
          name: task.name,
          status: task.status,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          completedAt: task.status === "COMPLETED" ? now : null,
          updatedAt: now,
        },
      });
    }
    console.log(`Created ${tasks.length} Offboarding Tasks`);

    console.log("\n=== Reset Complete! ===");
    console.log("\nDemo Credentials:");
    console.log("Password for all accounts:", DEMO_PASSWORD);
    console.log("\nAccounts:");
    for (const account of DEMO_ACCOUNTS) {
      const role = account.isPlatformAdmin
        ? "Platform Admin"
        : account.email.includes("owner")
        ? "Organization Owner"
        : "Organization Member";
      console.log(`  ${account.email} - ${role}`);
    }
    console.log(`\nOrganization: ${DEMO_ORG.name} (${DEMO_ORG.slug})`);
  } catch (error) {
    console.error("\nFATAL ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
