"use client";

import React, { useState, useTransition } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  alpha,
  useTheme,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { getSystemRolePermissions } from "@/lib/permissions";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: { id: string; code: string; name: string; category: string | null } }[];
  _count: { assignments: number };
};

type Permission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
};

interface RolesClientProps {
  customRoles: CustomRole[];
  permissions: Permission[];
}

const SYSTEM_ROLES = [
  {
    name: "OWNER",
    displayName: "Owner",
    description: "Full organizational authority with complete system access and deletion rights",
    color: "#8b5cf6",
    icon: "shield_person",
    authority: "Supreme Authority",
    capabilities: [
      "Delete organization",
      "Transfer ownership",
      "All administrative actions",
      "Unrestricted access",
    ],
  },
  {
    name: "ADMIN",
    displayName: "Administrator",
    description: "Comprehensive management access without organizational deletion capabilities",
    color: "#3b82f6",
    icon: "admin_panel_settings",
    authority: "Full Management",
    capabilities: [
      "Manage all members",
      "Configure security policies",
      "Manage workflows",
      "Full audit access",
    ],
  },
  {
    name: "MEMBER",
    displayName: "Member",
    description: "Standard operational access for day-to-day offboarding management",
    color: "#10b981",
    icon: "person",
    authority: "Operational",
    capabilities: [
      "Create offboardings",
      "View employees",
      "Complete assigned tasks",
      "Basic reporting",
    ],
  },
  {
    name: "AUDITOR",
    displayName: "Auditor",
    description: "Read-only access for compliance monitoring and audit verification",
    color: "#f59e0b",
    icon: "policy",
    authority: "Read-Only",
    capabilities: [
      "View all data",
      "Export audit logs",
      "Generate reports",
      "Compliance review",
    ],
  },
];

const PERMISSION_CATEGORIES: Record<string, { name: string; icon: string; description: string }> = {
  employees: {
    name: "Employees",
    icon: "people",
    description: "Employee records and management",
  },
  offboardings: {
    name: "Offboardings",
    icon: "group_remove",
    description: "Offboarding processes and tasks",
  },
  assets: {
    name: "Assets",
    icon: "inventory_2",
    description: "Asset tracking and recovery",
  },
  security: {
    name: "Security",
    icon: "shield",
    description: "Security policies and controls",
  },
  audit: {
    name: "Audit & Compliance",
    icon: "receipt_long",
    description: "Audit logs and compliance records",
  },
  organization: {
    name: "Organization",
    icon: "business",
    description: "Organization settings and structure",
  },
  members: {
    name: "Members",
    icon: "group",
    description: "Team member management",
  },
  workflows: {
    name: "Workflows",
    icon: "account_tree",
    description: "Workflow templates and automation",
  },
  integrations: {
    name: "Integrations",
    icon: "extension",
    description: "Third-party integrations",
  },
  roles: {
    name: "Roles",
    icon: "admin_panel_settings",
    description: "Role and permission management",
  },
  risk: {
    name: "Risk Management",
    icon: "warning",
    description: "Risk assessment and monitoring",
  },
  Other: {
    name: "Other",
    icon: "more_horiz",
    description: "Miscellaneous permissions",
  },
};

const PERMISSION_LABELS: Record<string, string> = {
  "employee:read": "View Employees",
  "employee:create": "Create Employees",
  "employee:update": "Edit Employees",
  "employee:delete": "Delete Employees",
  "offboarding:read": "View Offboardings",
  "offboarding:create": "Create Offboardings",
  "offboarding:update": "Manage Offboardings",
  "offboarding:delete": "Delete Offboardings",
  "asset:read": "View Assets",
  "asset:create": "Add Assets",
  "asset:update": "Edit Assets",
  "asset:delete": "Remove Assets",
  "audit:read": "View Audit Logs",
  "audit:export": "Export Audit Data",
  "org:read": "View Organization",
  "org:update": "Edit Organization",
  "org:delete": "Delete Organization",
  "member:read": "View Members",
  "member:invite": "Invite Members",
  "member:update": "Manage Members",
  "member:remove": "Remove Members",
  "member:approve": "Approve Members",
  "workflow:read": "View Workflows",
  "workflow:create": "Create Workflows",
  "workflow:update": "Edit Workflows",
  "workflow:delete": "Delete Workflows",
  "integration:read": "View Integrations",
  "integration:manage": "Manage Integrations",
  "role:read": "View Roles",
  "role:manage": "Manage Roles",
  "security:read": "View Security Settings",
  "security:manage": "Manage Security",
  "department:manage": "Manage Departments",
  "jobtitle:manage": "Manage Job Titles",
  "location:manage": "Manage Locations",
  "risk:read": "View Risk Data",
  "risk:manage": "Manage Risk Settings",
};

function getPermissionLabel(code: string): string {
  return PERMISSION_LABELS[code] || code.replace(/[_:]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getPermissionCategory(code: string): string {
  const prefix = code.split(":")[0];
  const categoryMap: Record<string, string> = {
    employee: "employees",
    offboarding: "offboardings",
    asset: "assets",
    audit: "audit",
    org: "organization",
    member: "members",
    workflow: "workflows",
    integration: "integrations",
    role: "roles",
    security: "security",
    department: "organization",
    jobtitle: "organization",
    location: "organization",
    risk: "risk",
  };
  return categoryMap[prefix] || "Other";
}

export default function RolesClient({ customRoles, permissions }: RolesClientProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<CustomRole | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = getPermissionCategory(perm.code);
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const resetForm = () => {
    setFormData({ name: "", description: "", permissionIds: [] });
    setError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingRole(null);
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (role: CustomRole) => {
    setFormData({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions.map((p) => p.permission.id),
    });
    setEditingRole(role);
    setCreateDialogOpen(true);
  };

  const handleClose = () => {
    setCreateDialogOpen(false);
    setEditingRole(null);
    resetForm();
  };

  const handleTogglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleToggleCategory = (categoryPerms: Permission[]) => {
    const categoryIds = categoryPerms.map((p) => p.id);
    const allSelected = categoryIds.every((id) => formData.permissionIds.includes(id));

    setFormData((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !categoryIds.includes(id))
        : [...new Set([...prev.permissionIds, ...categoryIds])],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Role name is required");
      return;
    }
    if (formData.permissionIds.length === 0) {
      setError("Select at least one permission");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/roles", {
        method: editingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingRole && { id: editingRole.id }),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          permissionIds: formData.permissionIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save role");
      }

      handleClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmRole) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/roles?id=${deleteConfirmRole.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete role");
      }

      setDeleteConfirmRole(null);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: alpha("#8b5cf6", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#8b5cf6" }}>
              admin_panel_settings
            </span>
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Roles & Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Access control authority panel
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#64748b" }}>
            lock
          </span>
          <Typography variant="subtitle1" fontWeight={700}>
            System Roles
          </Typography>
          <Chip
            label="IMMUTABLE"
            size="small"
            sx={{
              ml: 1,
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 700,
              bgcolor: isDark ? alpha("#64748b", 0.2) : "#e2e8f0",
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {SYSTEM_ROLES.map((role) => {
            const perms = getSystemRolePermissions(role.name as "OWNER" | "ADMIN" | "CONTRIBUTOR" | "AUDITOR");
            return (
              <Card
                key={role.name}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
                  borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                  transition: "border-color 0.2s ease",
                  "&:hover": {
                    borderColor: alpha(role.color, 0.5),
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha(role.color, 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: role.color }}>
                          {role.icon}
                        </span>
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {role.displayName}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, color: "#94a3b8" }}>
                            lock
                          </span>
                          <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.65rem" }}>
                            System Role
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Chip
                    label={role.authority}
                    size="small"
                    sx={{
                      mb: 1.5,
                      height: 20,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      bgcolor: alpha(role.color, 0.1),
                      color: role.color,
                      border: `1px solid ${alpha(role.color, 0.2)}`,
                    }}
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 2, lineHeight: 1.5, minHeight: 40 }}
                  >
                    {role.description}
                  </Typography>

                  <Box sx={{ borderTop: "1px solid", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0", pt: 2 }}>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.6rem" }}
                    >
                      Key Capabilities
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {role.capabilities.map((cap, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, color: role.color }}>
                            check
                          </span>
                          <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "0.7rem" }}>
                            {cap}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>
                tune
              </span>
              <Typography variant="subtitle1" fontWeight={700}>
                Custom Roles
              </Typography>
              <Chip
                label={`${customRoles.length} role${customRoles.length !== 1 ? "s" : ""}`}
                size="small"
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  bgcolor: isDark ? alpha("#10b981", 0.15) : alpha("#10b981", 0.1),
                  color: "#10b981",
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create fine-grained access control for specific organizational needs
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleOpenCreate}
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>}
            sx={{
              px: 2.5,
              py: 1,
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
              bgcolor: "#1e293b",
              "&:hover": { bgcolor: "#0f172a" },
            }}
          >
            Create Role
          </Button>
        </Box>

        {customRoles.length === 0 ? (
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderStyle: "dashed",
              bgcolor: isDark ? t.colors.background.surfaceLight : "#fafafa",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <CardContent sx={{ p: 6, textAlign: "center" }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  bgcolor: isDark ? alpha("#10b981", 0.1) : alpha("#10b981", 0.08),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#10b981" }}>
                  person_add
                </span>
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                No Custom Roles Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
                Custom roles let you create specialized access profiles for different teams like HR specialists, IT administrators, or compliance officers.
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
                {["HR Manager", "IT Support", "Compliance Officer"].map((example) => (
                  <Chip
                    key={example}
                    label={example}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontSize: "0.75rem",
                    }}
                  />
                ))}
              </Box>
              <Button
                variant="outlined"
                onClick={handleOpenCreate}
                startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                  borderColor: "#10b981",
                  color: "#10b981",
                  "&:hover": {
                    borderColor: "#10b981",
                    bgcolor: alpha("#10b981", 0.08),
                  },
                }}
              >
                Create Your First Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {customRoles.map((role) => (
              <Card
                key={role.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
                  borderColor: expandedRole === role.id
                    ? alpha("#10b981", 0.4)
                    : isDark
                    ? t.colors.border.subtle
                    : "#e2e8f0",
                  transition: "border-color 0.2s ease",
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: alpha("#10b981", 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#10b981" }}>
                          badge
                        </span>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography variant="body1" fontWeight={700}>
                            {role.name}
                          </Typography>
                          <Chip
                            label="Custom"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              bgcolor: alpha("#10b981", 0.1),
                              color: "#10b981",
                            }}
                          />
                          <Chip
                            label={`${role.permissions.length} permission${role.permissions.length !== 1 ? "s" : ""}`}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: "0.6rem",
                              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                              color: isDark ? "#94a3b8" : "#64748b",
                            }}
                          />
                        </Box>
                        {role.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            {role.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={`${role._count.assignments} assigned`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                          color: isDark ? "#94a3b8" : "#64748b",
                        }}
                      />
                      <Tooltip title="View permissions">
                        <IconButton
                          size="small"
                          onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                          sx={{ color: isDark ? "#94a3b8" : "#64748b" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                            {expandedRole === role.id ? "expand_less" : "expand_more"}
                          </span>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit role">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(role)}
                          sx={{ color: isDark ? "#94a3b8" : "#64748b" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete role">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmRole(role)}
                          disabled={role._count.assignments > 0}
                          sx={{ color: role._count.assignments > 0 ? "#cbd5e1" : "#ef4444" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Collapse in={expandedRole === role.id}>
                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: "1px solid",
                        borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}
                      >
                        Granted Permissions
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
                        {role.permissions.map((p) => (
                          <Chip
                            key={p.permission.id}
                            label={getPermissionLabel(p.permission.code)}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: "0.7rem",
                              fontWeight: 500,
                              bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                              color: isDark ? "#e2e8f0" : "#334155",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            cursor: "pointer",
          }}
          onClick={() => setShowPermissions(!showPermissions)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#64748b" }}>
              key
            </span>
            <Typography variant="subtitle1" fontWeight={700}>
              Permission Reference
            </Typography>
            <Chip
              label={`${permissions.length} permissions`}
              size="small"
              sx={{
                ml: 1,
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 600,
                bgcolor: isDark ? t.colors.glass.hover : "#e2e8f0",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            />
          </Box>
          <IconButton size="small">
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#64748b" }}>
              {showPermissions ? "expand_less" : "expand_more"}
            </span>
          </IconButton>
        </Box>

        <Collapse in={showPermissions}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              {Object.entries(groupedPermissions).map(([category, categoryPerms]) => (
                <Box key={category} sx={{ mb: 3, "&:last-child": { mb: 0 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: "#64748b" }}
                    >
                      {PERMISSION_CATEGORIES[category]?.icon || "more_horiz"}
                    </span>
                    <Typography variant="caption" fontWeight={700} sx={{ color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {PERMISSION_CATEGORIES[category]?.name || category}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {categoryPerms.map((perm) => (
                      <Tooltip key={perm.id} title={perm.description || perm.code}>
                        <Chip
                          label={getPermissionLabel(perm.code)}
                          size="small"
                          sx={{
                            height: 26,
                            fontSize: "0.7rem",
                            fontWeight: 500,
                            bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                            color: isDark ? "#e2e8f0" : "#334155",
                            cursor: "help",
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Collapse>
      </Box>

      <Dialog
        open={createDialogOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: alpha("#10b981", 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#10b981" }}>
                {editingRole ? "edit" : "add"}
              </span>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {editingRole ? "Edit Role" : "Create Custom Role"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editingRole ? "Modify role permissions and details" : "Define a new access control role"}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., HR Manager, IT Support"
              required
              inputProps={{ maxLength: 50 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this role's purpose"
              multiline
              rows={2}
            />
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            Select Permissions
          </Typography>

          {Object.entries(groupedPermissions).map(([category, categoryPerms]) => {
            const allSelected = categoryPerms.every((p) => formData.permissionIds.includes(p.id));
            const someSelected = categoryPerms.some((p) => formData.permissionIds.includes(p.id));

            return (
              <Box
                key={category}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: isDark ? t.colors.glass.hover : "#f8fafc",
                  border: "1px solid",
                  borderColor: someSelected ? alpha("#10b981", 0.3) : isDark ? t.colors.border.subtle : "#e2e8f0",
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={() => handleToggleCategory(categoryPerms)}
                      sx={{ color: "#10b981", "&.Mui-checked": { color: "#10b981" } }}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>
                        {PERMISSION_CATEGORIES[category]?.icon || "more_horiz"}
                      </span>
                      <Typography variant="body2" fontWeight={600}>
                        {PERMISSION_CATEGORIES[category]?.name || category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({categoryPerms.length})
                      </Typography>
                    </Box>
                  }
                />
                <Box sx={{ ml: 4, mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {categoryPerms.map((perm) => (
                    <FormControlLabel
                      key={perm.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={formData.permissionIds.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          sx={{ p: 0.5, color: "#10b981", "&.Mui-checked": { color: "#10b981" } }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ color: isDark ? "#e2e8f0" : "#334155" }}>
                          {getPermissionLabel(perm.code)}
                        </Typography>
                      }
                      sx={{ mr: 2 }}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: alpha("#3b82f6", isDark ? 0.1 : 0.05),
              border: "1px solid",
              borderColor: alpha("#3b82f6", 0.2),
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#3b82f6" }}>
              info
            </span>
            <Typography variant="caption" sx={{ color: isDark ? "#93c5fd" : "#1e40af" }}>
              Role changes are logged to Audit Logs for compliance tracking.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            {formData.permissionIds.length} permission{formData.permissionIds.length !== 1 ? "s" : ""} selected
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button onClick={handleClose} sx={{ fontWeight: 600, minWidth: 80 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || isPending || !formData.name.trim() || formData.permissionIds.length === 0}
              sx={{
                fontWeight: 600,
                minWidth: 120,
                bgcolor: "#1e293b",
                "&:hover": { bgcolor: "#0f172a" },
              }}
            >
              {loading ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteConfirmRole}
        onClose={() => setDeleteConfirmRole(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle fontWeight={700}>Delete Role</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
            Are you sure you want to delete the role <strong>{deleteConfirmRole?.name}</strong>? This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setDeleteConfirmRole(null)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            {loading ? "Deleting..." : "Delete Role"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
