import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma.server";

const DEMO_PASSWORD = "Demo123!@#";

const DEMO_ACCOUNTS = [
  {
    email: "admin@offboardhq.demo",
    name: "Platform Admin",
    isPlatformAdmin: true,
  },
  {
    email: "owner@acme.demo",
    name: "Acme Owner",
    isPlatformAdmin: false,
  },
  {
    email: "member@acme.demo",
    name: "Acme Member",
    isPlatformAdmin: false,
  },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { email: string; status: string; error?: string }[] = [];
  const createdUsers: { supabaseId: string; email: string; name: string; isPlatformAdmin: boolean }[] = [];

  for (const account of DEMO_ACCOUNTS) {
    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === account.email);

      let supabaseId: string;

      if (existingUser) {
        supabaseId = existingUser.id;
        results.push({ email: account.email, status: "exists" });
      } else {
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
        });

        if (error) {
          results.push({ email: account.email, status: "error", error: error.message });
          continue;
        }

        supabaseId = newUser.user.id;
        results.push({ email: account.email, status: "created" });
      }

      createdUsers.push({
        supabaseId,
        email: account.email,
        name: account.name,
        isPlatformAdmin: account.isPlatformAdmin,
      });
    } catch (error) {
      results.push({
        email: account.email,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const now = new Date();

  for (const user of createdUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: user.supabaseId },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          supabaseId: user.supabaseId,
          email: user.email,
          name: user.name,
          isPlatformAdmin: user.isPlatformAdmin,
          updatedAt: now,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { isPlatformAdmin: user.isPlatformAdmin, updatedAt: now },
      });
    }
  }

  let existingOrg = await prisma.organization.findUnique({
    where: { slug: "acme-corp" },
  });

  if (!existingOrg) {
    existingOrg = await prisma.organization.create({
      data: {
        name: "Acme Corporation",
        slug: "acme-corp",
        status: "ACTIVE",
        updatedAt: now,
      },
    });
  } else {
    await prisma.organization.update({
      where: { id: existingOrg.id },
      data: { status: "ACTIVE", updatedAt: now },
    });
  }

  const ownerUser = await prisma.user.findUnique({
    where: { email: "owner@acme.demo" },
  });

  const memberUser = await prisma.user.findUnique({
    where: { email: "member@acme.demo" },
  });

  if (ownerUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: ownerUser.id, organizationId: existingOrg.id },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: ownerUser.id,
          organizationId: existingOrg.id,
          systemRole: "OWNER",
          status: "ACTIVE",
          updatedAt: now,
        },
      });
    } else {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { systemRole: "OWNER", status: "ACTIVE", updatedAt: now },
      });
    }
  }

  if (memberUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: memberUser.id, organizationId: existingOrg.id },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: memberUser.id,
          organizationId: existingOrg.id,
          systemRole: "CONTRIBUTOR",
          status: "ACTIVE",
          updatedAt: now,
        },
      });
    } else {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { systemRole: "CONTRIBUTOR", status: "ACTIVE", updatedAt: now },
      });
    }
  }

  const department = await prisma.department.upsert({
    where: { id: "demo-eng-dept" },
    update: {},
    create: {
      id: "demo-eng-dept",
      name: "Engineering",
      description: "Software development team",
      organizationId: existingOrg.id,
      updatedAt: now,
    },
  });

  const department2 = await prisma.department.upsert({
    where: { id: "demo-hr-dept" },
    update: {},
    create: {
      id: "demo-hr-dept",
      name: "Human Resources",
      description: "HR and people operations",
      organizationId: existingOrg.id,
      updatedAt: now,
    },
  });

  const jobTitle = await prisma.jobTitle.upsert({
    where: { id: "demo-swe-title" },
    update: {},
    create: {
      id: "demo-swe-title",
      title: "Software Engineer",
      level: 3,
      organizationId: existingOrg.id,
      updatedAt: now,
    },
  });

  const jobTitle2 = await prisma.jobTitle.upsert({
    where: { id: "demo-mgr-title" },
    update: {},
    create: {
      id: "demo-mgr-title",
      title: "Engineering Manager",
      level: 5,
      organizationId: existingOrg.id,
      updatedAt: now,
    },
  });

  const location = await prisma.location.upsert({
    where: { id: "demo-sf-location" },
    update: {},
    create: {
      id: "demo-sf-location",
      name: "San Francisco HQ",
      address: "123 Market Street",
      city: "San Francisco",
      country: "United States",
      timezone: "America/Los_Angeles",
      organizationId: existingOrg.id,
      updatedAt: now,
    },
  });

  const manager = await prisma.employee.upsert({
    where: { id: "demo-manager" },
    update: {},
    create: {
      id: "demo-manager",
      employeeId: "ACME001",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@acme.com",
      phone: "+1-555-0100",
      hireDate: new Date("2020-01-15"),
      status: "ACTIVE",
      organizationId: existingOrg.id,
      departmentId: department.id,
      jobTitleId: jobTitle2.id,
      locationId: location.id,
      updatedAt: now,
    },
  });

  // Create membership for manager
  const managerUser = await prisma.user.findUnique({ where: { email: "sarah.johnson@acme.com" } });
  let managerMembershipId = null;
  if (managerUser) {
    const existingManagerMembership = await prisma.membership.findFirst({
      where: { userId: managerUser.id, organizationId: existingOrg.id },
    });
    
    if (!existingManagerMembership) {
      const managerMembership = await prisma.membership.create({
        data: {
          userId: managerUser.id,
          organizationId: existingOrg.id,
          systemRole: "ADMIN",
          status: "ACTIVE",
          updatedAt: now,
        },
      });
      managerMembershipId = managerMembership.id;
    } else {
      managerMembershipId = existingManagerMembership.id;
    }
  }

  const employees = [
    { id: "demo-emp-1", employeeId: "ACME002", firstName: "Alex", lastName: "Chen", email: "alex.chen@acme.com" },
    { id: "demo-emp-2", employeeId: "ACME003", firstName: "Maria", lastName: "Garcia", email: "maria.garcia@acme.com" },
    { id: "demo-emp-3", employeeId: "ACME004", firstName: "James", lastName: "Wilson", email: "james.wilson@acme.com" },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: {
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        hireDate: new Date("2022-06-01"),
        status: "ACTIVE",
        organizationId: existingOrg.id,
        departmentId: department.id,
        jobTitleId: jobTitle.id,
        locationId: location.id,
        managerMembershipId: managerMembershipId,
        updatedAt: now,
      },
    });
  }

  const offboardingEmployee = await prisma.employee.upsert({
    where: { id: "demo-offboard-emp" },
    update: { status: "OFFBOARDING" },
    create: {
      id: "demo-offboard-emp",
      employeeId: "ACME005",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@acme.com",
      hireDate: new Date("2021-05-01"),
      status: "OFFBOARDING",
      organizationId: existingOrg.id,
      departmentId: department.id,
      jobTitleId: jobTitle.id,
      locationId: location.id,
      managerMembershipId: managerMembershipId,
      updatedAt: now,
    },
  });

  const existingOffboarding = await prisma.offboarding.findFirst({
    where: { employeeId: offboardingEmployee.id },
  });

  if (!existingOffboarding) {
    const offboarding = await prisma.offboarding.create({
      data: {
        employeeId: offboardingEmployee.id,
        organizationId: existingOrg.id,
        status: "IN_PROGRESS",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "Voluntary resignation",
        notes: "Employee accepted position at another company",
        updatedAt: now,
      },
    });

    const tasks = [
      { name: "Revoke email access", status: "COMPLETED" },
      { name: "Revoke Slack access", status: "COMPLETED" },
      { name: "Revoke GitHub access", status: "IN_PROGRESS" },
      { name: "Return laptop", status: "PENDING" },
      { name: "Exit interview", status: "PENDING" },
      { name: "Knowledge transfer", status: "IN_PROGRESS" },
    ];

    for (const task of tasks) {
      await prisma.offboardingTask.create({
        data: {
          offboardingId: offboarding.id,
          name: task.name,
          status: (task.status === "BLOCKED" ? "PENDING" : task.status) as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          completedAt: task.status === "COMPLETED" ? now : null,
          updatedAt: now,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Demo accounts created successfully",
    accounts: results,
    credentials: {
      password: DEMO_PASSWORD,
      accounts: DEMO_ACCOUNTS.map((a) => ({
        email: a.email,
        role: a.isPlatformAdmin ? "Platform Admin" : a.email.includes("owner") ? "Organization Owner" : "Organization Member",
      })),
    },
    organization: {
      name: "Acme Corporation",
      slug: "acme-corp",
    },
  });
}
