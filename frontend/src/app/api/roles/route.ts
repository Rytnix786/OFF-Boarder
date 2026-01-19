import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "role:read");

    const customRoles = await prisma.customRole.findMany({
      where: { organizationId: session.currentOrgId! },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles: customRoles });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "role:manage");

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: "Role name must be 50 characters or less" }, { status: 400 });
    }

    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return NextResponse.json({ error: "At least one permission is required" }, { status: 400 });
    }

    const existingRole = await prisma.customRole.findUnique({
      where: {
        organizationId_name: {
          organizationId: session.currentOrgId!,
          name: name.trim(),
        },
      },
    });

    if (existingRole) {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
    }

    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json({ error: "Some permissions are invalid" }, { status: 400 });
    }

    const role = await prisma.customRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: session.currentOrgId!,
        permissions: {
          create: permissionIds.map((permissionId: string) => ({
            permissionId,
          })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { assignments: true } },
      },
    });

    await createAuditLog({
      action: "ROLE_CREATED",
      entityType: "CustomRole",
      entityId: role.id,
      organizationId: session.currentOrgId!,
      userId: session.user.id,
      metadata: {
        name: role.name,
        description: role.description,
        permissions: permissions.map(p => p.code),
        permissionCount: permissions.length,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "role:manage");

    const body = await request.json();
    const { id, name, description, permissionIds } = body;

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const existingRole = await prisma.customRole.findFirst({
      where: {
        id,
        organizationId: session.currentOrgId!,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (name && name.trim() !== existingRole.name) {
      const duplicateRole = await prisma.customRole.findUnique({
        where: {
          organizationId_name: {
            organizationId: session.currentOrgId!,
            name: name.trim(),
          },
        },
      });

      if (duplicateRole) {
        return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
      }
    }

    const oldData = {
      name: existingRole.name,
      description: existingRole.description,
      permissions: existingRole.permissions.map(p => p.permission.code),
    };

    await prisma.customRolePermission.deleteMany({
      where: { customRoleId: id },
    });

    const role = await prisma.customRole.update({
      where: { id },
      data: {
        name: name?.trim() || existingRole.name,
        description: description !== undefined ? description?.trim() || null : existingRole.description,
        permissions: {
          create: permissionIds.map((permissionId: string) => ({
            permissionId,
          })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { assignments: true } },
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    await createAuditLog({
      action: "ROLE_UPDATED",
      entityType: "CustomRole",
      entityId: role.id,
      organizationId: session.currentOrgId!,
      userId: session.user.id,
      metadata: {
        oldData,
        newData: {
          name: role.name,
          description: role.description,
          permissions: permissions.map(p => p.code),
        },
      },
    });

    return NextResponse.json({ role });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "role:manage");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const existingRole = await prisma.customRole.findFirst({
      where: {
        id,
        organizationId: session.currentOrgId!,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { assignments: true } },
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existingRole._count.assignments > 0) {
      return NextResponse.json(
        { error: `Cannot delete role. It is assigned to ${existingRole._count.assignments} member(s). Remove assignments first.` },
        { status: 400 }
      );
    }

    await prisma.customRole.delete({
      where: { id },
    });

    await createAuditLog({
      action: "ROLE_DELETED",
      entityType: "CustomRole",
      entityId: id,
      organizationId: session.currentOrgId!,
      userId: session.user.id,
      metadata: {
        name: existingRole.name,
        description: existingRole.description,
        permissions: existingRole.permissions.map(p => p.permission.code),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
