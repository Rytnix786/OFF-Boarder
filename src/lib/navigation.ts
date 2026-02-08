import { SystemRole } from "@prisma/client";
import { PermissionCode } from "./permissions";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  permissions: PermissionCode[];
  children?: NavItem[];
  badge?: "new" | "beta";
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export type RoutePermissionMap = {
  path: string;
  permissions: PermissionCode[];
  exact?: boolean;
};

export const MODULE_SECTIONS: NavSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      { 
        id: "dashboard",
        label: "Dashboard", 
        href: "/app", 
        icon: "grid_view",
        permissions: ["org:read"],
      },
      {
        id: "offboardings",
        label: "Offboardings",
        href: "/app/offboardings",
        icon: "group_remove",
        permissions: ["offboarding:read"],
      },
      {
        id: "employees",
        label: "Employees",
        href: "/app/employees",
        icon: "people",
        permissions: ["employee:read"],
      },
      {
        id: "assets",
        label: "Assets",
        href: "/app/assets",
        icon: "inventory_2",
        permissions: ["asset:read"],
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      {
        id: "risk-radar",
        label: "Risk Radar",
        href: "/app/risk-radar",
        icon: "radar",
        permissions: ["risk:read"],
      },
      {
        id: "workflows",
        label: "Workflows",
        href: "/app/workflows",
        icon: "account_tree",
        permissions: ["workflow:read"],
      },
      {
        id: "integrations",
        label: "Integrations",
        href: "/app/integrations",
        icon: "extension",
        permissions: ["integration:read"],
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    items: [
      {
        id: "audit-logs",
        label: "Audit Logs",
        href: "/app/audit-logs",
        icon: "receipt_long",
        permissions: ["audit:read"],
      },
      {
        id: "reports",
        label: "Reports",
        href: "/app/reports",
        icon: "summarize",
        permissions: ["audit:read"],
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/app/analytics",
        icon: "bar_chart",
        permissions: ["audit:read"],
      },
    ],
  },
];

export const SETTINGS_SECTIONS: NavSection[] = [
  {
    id: "organization",
    label: "Organization",
    items: [
      {
        id: "settings-organization",
        label: "General",
        href: "/app/settings/organization",
        icon: "business",
        permissions: ["org:read"],
      },
      {
        id: "settings-members",
        label: "Members",
        href: "/app/settings/members",
        icon: "group",
        permissions: ["member:read"],
      },
      {
        id: "settings-roles",
        label: "Roles & Permissions",
        href: "/app/settings/roles",
        icon: "admin_panel_settings",
        permissions: ["role:read"],
      },
      {
        id: "settings-structure",
        label: "Structure",
        href: "/app/settings/structure",
        icon: "apartment",
        permissions: ["department:manage"],
      },
    ],
  },
  {
    id: "security-settings",
    label: "Security",
    items: [
      {
        id: "settings-policies",
        label: "Policies",
        href: "/app/settings/policies",
        icon: "verified_user",
        permissions: ["security:manage"],
      },
      {
        id: "settings-security",
        label: "Authentication",
        href: "/app/settings/security",
        icon: "shield",
        permissions: ["security:read"],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "settings-health",
        label: "Health",
        href: "/app/settings/health",
        icon: "monitor_heart",
        permissions: ["org:update"],
      },
    ],
  },
];

export const MAIN_NAVIGATION: NavItem[] = MODULE_SECTIONS.flatMap(s => s.items);
export const SETTINGS_NAVIGATION: NavItem[] = SETTINGS_SECTIONS.flatMap(s => s.items);

export const ROUTE_PERMISSION_MAP: RoutePermissionMap[] = [
  { path: "/app", permissions: ["org:read"], exact: true },
  { path: "/app/portal", permissions: ["org:read"] },
  { path: "/app/offboardings", permissions: ["offboarding:read"] },
  { path: "/app/risk-radar", permissions: ["risk:read"] },
  { path: "/app/employees", permissions: ["employee:read"] },
  { path: "/app/assets", permissions: ["asset:read"] },
  { path: "/app/workflows", permissions: ["workflow:read"] },
  { path: "/app/analytics", permissions: ["audit:read"] },
  { path: "/app/integrations", permissions: ["integration:read"] },
  { path: "/app/audit-logs", permissions: ["audit:read"] },
  { path: "/app/reports", permissions: ["audit:read"] },
  { path: "/app/settings/organization", permissions: ["org:read"] },
  { path: "/app/settings/members", permissions: ["member:read"] },
  { path: "/app/settings/roles", permissions: ["role:read"] },
  { path: "/app/settings/structure", permissions: ["department:manage"] },
  { path: "/app/settings/policies", permissions: ["security:manage"] },
  { path: "/app/settings/security", permissions: ["security:read"] },
  { path: "/app/settings/health", permissions: ["org:update"] },
  { path: "/app/settings/profile", permissions: ["org:read"] },
  { path: "/app/settings/sessions", permissions: ["org:read"] },
  { path: "/app/access-denied", permissions: ["org:read"] },
];

export function filterNavigationByPermissions(
  items: NavItem[],
  userPermissions: PermissionCode[]
): NavItem[] {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return [];
  }
  return items.filter((item) => {
    if (item.permissions.length === 0) return true;
    return item.permissions.some((p) => userPermissions.includes(p));
  });
}

export function filterSectionsByPermissions(
  sections: NavSection[],
  userPermissions: PermissionCode[]
): NavSection[] {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return [];
  }
  return sections
    .map((section) => ({
      ...section,
      items: filterNavigationByPermissions(section.items, userPermissions),
    }))
    .filter((section) => section.items.length > 0);
}

export function canAccessRoute(
  pathname: string,
  userPermissions: PermissionCode[]
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  const route = ROUTE_PERMISSION_MAP.find((r) =>
    r.exact ? pathname === r.path : pathname.startsWith(r.path)
  );
  
  if (!route) return true;
  
  return route.permissions.some((p) => userPermissions.includes(p));
}

export function getRequiredPermissionsForRoute(pathname: string): PermissionCode[] {
  const route = ROUTE_PERMISSION_MAP.find((r) =>
    r.exact ? pathname === r.path : pathname.startsWith(r.path)
  );
  return route?.permissions || [];
}

export function getFirstAccessibleRoute(userPermissions: PermissionCode[]): string {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return "/app/access-denied";
  }
  for (const item of MAIN_NAVIGATION) {
    if (item.permissions.some((p) => userPermissions.includes(p))) {
      return item.href;
    }
  }
  return "/app/access-denied";
}

export function getRoleDisplayName(role: SystemRole): string {
  const names: Record<SystemRole, string> = {
    OWNER: "Owner",
    ADMIN: "Administrator",
    AUDITOR: "Auditor",
    CONTRIBUTOR: "Contributor",
  };
  return names[role];
}

export function getRoleColor(role: SystemRole): string {
  const colors: Record<SystemRole, string> = {
    OWNER: "#8b5cf6",
    ADMIN: "#3b82f6",
    AUDITOR: "#f59e0b",
    CONTRIBUTOR: "#22c55e",
  };
  return colors[role];
}
