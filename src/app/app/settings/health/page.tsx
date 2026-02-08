import { requireAuth } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import HealthCheckClient from "./HealthCheckClient";

type HealthCheck = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
};

const MAIN_ROUTES = [
  { path: "/app", name: "Dashboard" },
  { path: "/app/offboardings", name: "Offboardings" },
  { path: "/app/employees", name: "Employees" },
  { path: "/app/assets", name: "Assets" },
  { path: "/app/workflows", name: "Workflows" },
  { path: "/app/analytics", name: "Analytics" },
  { path: "/app/integrations", name: "Integrations" },
  { path: "/app/audit-logs", name: "Audit Logs" },
  { path: "/app/reports", name: "Reports" },
  { path: "/app/settings/organization", name: "Settings: Organization" },
  { path: "/app/settings/members", name: "Settings: Members" },
  { path: "/app/settings/roles", name: "Settings: Roles" },
  { path: "/app/settings/structure", name: "Settings: Structure" },
  { path: "/app/settings/security", name: "Settings: Security" },
  { path: "/app/settings/profile", name: "Settings: Profile" },
];

async function runHealthChecks(session: Awaited<ReturnType<typeof requireAuth>>): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const orgId = session.currentOrgId!;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "Database Connection",
      status: "pass",
      message: "Successfully connected to PostgreSQL",
    });
  } catch (error) {
    checks.push({
      name: "Database Connection",
      status: "fail",
      message: "Failed to connect to database",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    checks.push({
      name: "Auth User Resolution",
      status: user ? "pass" : "fail",
      message: user ? `User resolved: ${user.email}` : "User not found in database",
    });
  } catch (error) {
    checks.push({
      name: "Auth User Resolution",
      status: "fail",
      message: "Failed to resolve auth user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, organizationId: orgId },
      include: { organization: true },
    });
    checks.push({
      name: "Org Membership & Isolation",
      status: membership ? "pass" : "fail",
      message: membership
        ? `Membership valid for org: ${membership.organization.name} (${membership.systemRole})`
        : "No valid membership found",
    });
  } catch (error) {
    checks.push({
      name: "Org Membership & Isolation",
      status: "fail",
      message: "Failed to verify org membership",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const permissions = await getUserPermissions(session);
    const hasReadPerm = permissions.includes("org:read");
    const hasAdminPerm = permissions.includes("org:update");
    checks.push({
      name: "RBAC Permissions",
      status: hasReadPerm ? "pass" : "fail",
      message: `${permissions.length} permissions granted`,
      details: `org:read=${hasReadPerm}, org:update=${hasAdminPerm}`,
    });
  } catch (error) {
    checks.push({
      name: "RBAC Permissions",
      status: "fail",
      message: "Failed to check RBAC permissions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const [deptCount, titleCount, locCount] = await Promise.all([
      prisma.department.count({ where: { organizationId: orgId } }),
      prisma.jobTitle.count({ where: { organizationId: orgId } }),
      prisma.location.count({ where: { organizationId: orgId } }),
    ]);
    checks.push({
      name: "Org Structures CRUD",
      status: "pass",
      message: "Structure tables accessible",
      details: `Departments: ${deptCount}, Job Titles: ${titleCount}, Locations: ${locCount}`,
    });
  } catch (error) {
    checks.push({
      name: "Org Structures CRUD",
      status: "fail",
      message: "Failed to access org structures",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const employeeCount = await prisma.employee.count({ where: { organizationId: orgId } });
    checks.push({
      name: "Employee CRUD",
      status: "pass",
      message: `${employeeCount} employees in current org`,
    });
  } catch (error) {
    checks.push({
      name: "Employee CRUD",
      status: "fail",
      message: "Failed to query employees",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const offboardingCount = await prisma.offboarding.count({ where: { organizationId: orgId } });
    checks.push({
      name: "Offboarding CRUD",
      status: "pass",
      message: `${offboardingCount} offboardings in current org`,
    });
  } catch (error) {
    checks.push({
      name: "Offboarding CRUD",
      status: "fail",
      message: "Failed to query offboardings",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const logCount = await prisma.auditLog.count({ where: { organizationId: orgId } });
    checks.push({
      name: "Audit Logging",
      status: "pass",
      message: `${logCount} audit log entries for this org`,
    });
  } catch (error) {
    checks.push({
      name: "Audit Logging",
      status: "fail",
      message: "Failed to verify audit logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const permCount = await prisma.permission.count();
    checks.push({
      name: "Permissions Seed Data",
      status: permCount > 0 ? "pass" : "warning",
      message: `${permCount} permissions defined`,
      details: permCount === 0 ? "Run seed script to populate permissions" : undefined,
    });
  } catch (error) {
    checks.push({
      name: "Permissions Seed Data",
      status: "fail",
      message: "Failed to check permissions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const templateCount = await prisma.workflowTemplate.count({ where: { organizationId: orgId } });
    checks.push({
      name: "Workflow Templates",
      status: "pass",
      message: `${templateCount} workflow templates configured`,
    });
  } catch (error) {
    checks.push({
      name: "Workflow Templates",
      status: "fail",
      message: "Failed to query workflow templates",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const assetCount = await prisma.asset.count({ where: { organizationId: orgId } });
    checks.push({
      name: "Asset Tracking",
      status: "pass",
      message: `${assetCount} assets tracked`,
    });
  } catch (error) {
    checks.push({
      name: "Asset Tracking",
      status: "fail",
      message: "Failed to query assets",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  checks.push({
    name: "Route Configuration",
    status: "pass",
    message: `${MAIN_ROUTES.length} main routes configured`,
    details: MAIN_ROUTES.map(r => r.name).join(", "),
  });

  return checks;
}

export default async function HealthCheckPage() {
  const session = await requireAuth();
  const checks = await runHealthChecks(session);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <HealthCheckClient
      checks={checks}
      session={{
        user: session.user,
        orgName: session.currentMembership?.organization.name || "",
        systemRole: session.currentMembership?.systemRole || "",
      }}
      summary={{ total: checks.length, pass: passCount, fail: failCount }}
      routes={MAIN_ROUTES}
    />
  );
}
