"use server";

import { prisma } from "@/lib/prisma.server";

export type OnboardingTask = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  actionLabel: string;
  icon: string;
};

export type OnboardingStatus = {
  tasks: OnboardingTask[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};

export async function getOnboardingStatus(orgId: string): Promise<OnboardingStatus> {
  const [
    organization,
    employeeCount,
    employeeInviteCount,
    assetCount,
    workflowCount,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { isSetupComplete: true },
    }),
    prisma.employee.count({ where: { organizationId: orgId } }),
    prisma.employeePortalInvite.count({ where: { organizationId: orgId } }),
    prisma.asset.count({ where: { organizationId: orgId } }),
    prisma.workflowTemplate.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const tasks: OnboardingTask[] = [
    {
      id: "setup",
      title: "Complete Organization Setup",
      description: "Configure your organization's location, timezone, and type to personalize OffboardHQ.",
      completed: organization?.isSetupComplete ?? false,
      href: "/app/setup",
      actionLabel: "Complete Setup",
      icon: "settings",
    },
    {
      id: "employee",
      title: "Add Your First Employee",
      description: "Add an employee record so you can initiate offboardings and manage their access.",
      completed: employeeCount > 0,
      href: "/app/employees",
      actionLabel: "Add Employee",
      icon: "person_add",
    },
    {
      id: "invite",
      title: "Invite an Employee to Portal",
      description: "Send a portal invite so employees can complete offboarding tasks and submit evidence.",
      completed: employeeInviteCount > 0,
      href: "/app/employees",
      actionLabel: "Invite Employee",
      icon: "mail",
    },
    {
      id: "asset",
      title: "Create Your First Asset",
      description: "Track company assets like laptops, badges, and keys to ensure proper recovery during offboarding.",
      completed: assetCount > 0,
      href: "/app/assets",
      actionLabel: "Add Asset",
      icon: "devices",
    },
    {
      id: "workflow",
      title: "Set Up an Offboarding Workflow",
      description: "Create or customize workflows to standardize your offboarding process across the organization.",
      completed: workflowCount > 0,
      href: "/app/workflows",
      actionLabel: "Configure Workflow",
      icon: "account_tree",
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;

  return {
    tasks,
    completedCount,
    totalCount: tasks.length,
    isComplete: completedCount === tasks.length,
  };
}
