import { SystemRole } from "@prisma/client";

export type PermissionCode =
  | "org:read"
  | "org:update"
  | "org:delete"
  | "member:read"
  | "member:invite"
  | "member:update"
  | "member:remove"
  | "member:approve"
  | "employee:read"
  | "employee:create"
  | "employee:update"
  | "employee:delete"
  | "offboarding:read"
  | "offboarding:create"
  | "offboarding:update"
  | "offboarding:delete"
  | "workflow:read"
  | "workflow:create"
  | "workflow:update"
  | "workflow:delete"
  | "integration:read"
  | "integration:manage"
  | "audit:read"
  | "audit:export"
  | "role:read"
  | "role:manage"
  | "security:read"
  | "security:manage"
  | "department:manage"
  | "jobtitle:manage"
  | "location:manage"
  | "asset:read"
  | "asset:create"
  | "asset:update"
  | "asset:delete"
  | "risk:read"
  | "risk:manage"
  | "task:read_own"
  | "task:read_all"
  | "task:complete_own"
  | "task:complete_all";

const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, PermissionCode[]> = {
  OWNER: [
    "org:read", "org:update", "org:delete",
    "member:read", "member:invite", "member:update", "member:remove", "member:approve",
    "employee:read", "employee:create", "employee:update", "employee:delete",
    "offboarding:read", "offboarding:create", "offboarding:update", "offboarding:delete",
    "workflow:read", "workflow:create", "workflow:update", "workflow:delete",
    "integration:read", "integration:manage",
    "audit:read", "audit:export",
    "role:read", "role:manage",
    "security:read", "security:manage",
    "department:manage", "jobtitle:manage", "location:manage",
    "asset:read", "asset:create", "asset:update", "asset:delete",
    "risk:read", "risk:manage",
    "task:read_all", "task:complete_all",
  ],
  ADMIN: [
    "org:read", "org:update",
    "member:read", "member:invite", "member:update", "member:remove", "member:approve",
    "employee:read", "employee:create", "employee:update", "employee:delete",
    "offboarding:read", "offboarding:create", "offboarding:update", "offboarding:delete",
    "workflow:read", "workflow:create", "workflow:update", "workflow:delete",
    "integration:read", "integration:manage",
    "audit:read", "audit:export",
    "role:read", "role:manage",
    "security:read", "security:manage",
    "department:manage", "jobtitle:manage", "location:manage",
    "asset:read", "asset:create", "asset:update", "asset:delete",
    "risk:read", "risk:manage",
    "task:read_all", "task:complete_all",
  ],
  AUDITOR: [
    "org:read",
    "member:read",
    "employee:read",
    "offboarding:read",
    "workflow:read",
    "integration:read",
    "audit:read", "audit:export",
    "role:read",
    "asset:read",
    "risk:read",
    "task:read_all",
  ],
  CONTRIBUTOR: [
    "org:read",
    "member:read",
    "offboarding:read",
    "employee:read",
    "asset:read",
    "task:read_own",
    "task:complete_own",
  ],
};

export function getSystemRolePermissions(role: SystemRole): PermissionCode[] {
  return SYSTEM_ROLE_PERMISSIONS[role] || [];
}

export type Permission =
  | "dashboard:admin"
  | "dashboard:auditor"
  | "dashboard:contributor"
  | "dashboard:portal"
  | "offboardings:view"
  | "offboardings:create"
  | "offboardings:manage"
  | "employees:view"
  | "employees:create"
  | "employees:manage"
  | "assets:view"
  | "assets:create"
  | "assets:manage"
  | "risk_radar:view"
  | "risk_radar:manage"
  | "workflows:view"
  | "workflows:manage"
  | "integrations:view"
  | "integrations:manage"
  | "audit_logs:view"
  | "audit_logs:export"
  | "members:view"
  | "members:invite"
  | "members:manage"
  | "roles:view"
  | "roles:manage"
  | "organization:view"
  | "organization:manage"
  | "structure:view"
  | "structure:manage"
  | "security:view"
  | "security:manage"
  | "billing:view"
  | "billing:manage"
  | "reports:view"
  | "reports:export"
  | "tasks:view_own"
  | "tasks:view_all"
  | "tasks:complete_own"
  | "tasks:complete_all"
  | "evidence:view"
  | "evidence:export";

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  OWNER: [
    "dashboard:admin",
    "offboardings:view",
    "offboardings:create",
    "offboardings:manage",
    "employees:view",
    "employees:create",
    "employees:manage",
    "assets:view",
    "assets:create",
    "assets:manage",
    "risk_radar:view",
    "risk_radar:manage",
    "workflows:view",
    "workflows:manage",
    "integrations:view",
    "integrations:manage",
    "audit_logs:view",
    "audit_logs:export",
    "members:view",
    "members:invite",
    "members:manage",
    "roles:view",
    "roles:manage",
    "organization:view",
    "organization:manage",
    "structure:view",
    "structure:manage",
    "security:view",
    "security:manage",
    "billing:view",
    "billing:manage",
    "reports:view",
    "reports:export",
    "tasks:view_all",
    "tasks:complete_all",
    "evidence:view",
    "evidence:export",
  ],
  ADMIN: [
    "dashboard:admin",
    "offboardings:view",
    "offboardings:create",
    "offboardings:manage",
    "employees:view",
    "employees:create",
    "employees:manage",
    "assets:view",
    "assets:create",
    "assets:manage",
    "risk_radar:view",
    "risk_radar:manage",
    "workflows:view",
    "workflows:manage",
    "integrations:view",
    "integrations:manage",
    "audit_logs:view",
    "audit_logs:export",
    "members:view",
    "members:invite",
    "members:manage",
    "roles:view",
    "roles:manage",
    "organization:view",
    "structure:view",
    "structure:manage",
    "security:view",
    "security:manage",
    "reports:view",
    "reports:export",
    "tasks:view_all",
    "tasks:complete_all",
    "evidence:view",
    "evidence:export",
  ],
  AUDITOR: [
    "dashboard:auditor",
    "offboardings:view",
    "employees:view",
    "assets:view",
    "risk_radar:view",
    "workflows:view",
    "audit_logs:view",
    "audit_logs:export",
    "reports:view",
    "reports:export",
    "tasks:view_all",
    "evidence:view",
    "evidence:export",
    "members:view",
    "organization:view",
    "structure:view",
  ],
  CONTRIBUTOR: [
    "dashboard:contributor",
    "offboardings:view",
    "employees:view",
    "assets:view",
    "members:view",
    "organization:view",
    "tasks:view_own",
    "tasks:complete_own",
  ],
};

export function hasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function isAdminRole(role: SystemRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isAuditorRole(role: SystemRole): boolean {
  return role === "AUDITOR";
}

export function isContributorRole(role: SystemRole): boolean {
  return role === "CONTRIBUTOR";
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

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiredPermissions?: Permission[];
  children?: NavItem[];
};

export const NAVIGATION_CONFIG: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: "grid_view" },
  {
    label: "Offboardings",
    href: "/app/offboardings",
    icon: "group_remove",
    requiredPermissions: ["offboardings:view"],
  },
  {
    label: "Risk Radar",
    href: "/app/risk-radar",
    icon: "radar",
    requiredPermissions: ["risk_radar:view"],
  },
  {
    label: "Employees",
    href: "/app/employees",
    icon: "people",
    requiredPermissions: ["employees:view"],
  },
  {
    label: "Assets",
    href: "/app/assets",
    icon: "inventory_2",
    requiredPermissions: ["assets:view"],
  },
  {
    label: "Workflows",
    href: "/app/workflows",
    icon: "account_tree",
    requiredPermissions: ["workflows:view"],
  },
  {
    label: "Analytics",
    href: "/app/analytics",
    icon: "bar_chart",
    requiredPermissions: ["reports:view"],
  },
  {
    label: "Integrations",
    href: "/app/integrations",
    icon: "extension",
    requiredPermissions: ["integrations:view"],
  },
  {
    label: "Audit Logs",
    href: "/app/audit-logs",
    icon: "receipt_long",
    requiredPermissions: ["audit_logs:view"],
  },
  {
    label: "Reports",
    href: "/app/reports",
    icon: "summarize",
    requiredPermissions: ["reports:view"],
  },
];

export const SETTINGS_CONFIG: NavItem[] = [
  {
    label: "Organization",
    href: "/app/settings/organization",
    icon: "business",
    requiredPermissions: ["organization:view"],
  },
  {
    label: "Members",
    href: "/app/settings/members",
    icon: "group",
    requiredPermissions: ["members:view"],
  },
  {
    label: "Roles",
    href: "/app/settings/roles",
    icon: "admin_panel_settings",
    requiredPermissions: ["roles:view"],
  },
  {
    label: "Structure",
    href: "/app/settings/structure",
    icon: "apartment",
    requiredPermissions: ["structure:view"],
  },
  {
    label: "Security Policies",
    href: "/app/settings/policies",
    icon: "verified_user",
    requiredPermissions: ["security:manage"],
  },
  {
    label: "Security",
    href: "/app/settings/security",
    icon: "shield",
    requiredPermissions: ["security:view"],
  },
  {
    label: "System Health",
    href: "/app/settings/health",
    icon: "monitor_heart",
    requiredPermissions: ["organization:manage"],
  },
];

export function getNavigationForRole(role: SystemRole): NavItem[] {
  return NAVIGATION_CONFIG.filter((item) => {
    if (!item.requiredPermissions) return true;
    return hasAnyPermission(role, item.requiredPermissions);
  });
}

export function getSettingsForRole(role: SystemRole): NavItem[] {
  return SETTINGS_CONFIG.filter((item) => {
    if (!item.requiredPermissions) return true;
    return hasAnyPermission(role, item.requiredPermissions);
  });
}

export type RoutePermission = {
  path: string;
  permissions: Permission[];
  exact?: boolean;
};

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: "/app/offboardings", permissions: ["offboardings:view"] },
  { path: "/app/risk-radar", permissions: ["risk_radar:view"] },
  { path: "/app/employees", permissions: ["employees:view"] },
  { path: "/app/assets", permissions: ["assets:view"] },
  { path: "/app/workflows", permissions: ["workflows:view"] },
  { path: "/app/integrations", permissions: ["integrations:view"] },
  { path: "/app/audit-logs", permissions: ["audit_logs:view"] },
  { path: "/app/reports", permissions: ["reports:view"] },
  { path: "/app/settings/organization", permissions: ["organization:view"] },
  { path: "/app/settings/members", permissions: ["members:view"] },
  { path: "/app/settings/roles", permissions: ["roles:view"] },
  { path: "/app/settings/structure", permissions: ["structure:view"] },
  { path: "/app/settings/policies", permissions: ["security:manage"] },
  { path: "/app/settings/security", permissions: ["security:view"] },
  { path: "/app/settings/health", permissions: ["organization:manage"] },
];

export function canAccessRoute(role: SystemRole, pathname: string): boolean {
  const routeConfig = ROUTE_PERMISSIONS.find((r) =>
    r.exact ? pathname === r.path : pathname.startsWith(r.path)
  );
  if (!routeConfig) return true;
  return hasAnyPermission(role, routeConfig.permissions);
}
