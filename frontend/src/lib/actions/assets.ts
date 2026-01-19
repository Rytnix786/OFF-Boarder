"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { AssetType, AssetStatus, AssetReturnStatus } from "@prisma/client";

export interface AssetFilters {
  search?: string;
  type?: AssetType;
  status?: AssetStatus;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export async function getAssets(filters: AssetFilters = {}) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const orgId = session.currentOrgId!;
  const { search, type, status, employeeId, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = { organizationId: orgId };
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { assetTag: { contains: search, mode: "insensitive" } },
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }
  
  if (type) where.type = type;
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return { assets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAssetById(assetId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const orgId = session.currentOrgId!;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, email: true, employeeId: true } },
      assetReturns: {
        include: { offboarding: { select: { id: true, status: true, employee: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!asset) {
    return { error: "Asset not found" };
  }

  return { asset };
}

export async function getAssetHistory(assetId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const orgId = session.currentOrgId!;

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      entityType: "Asset",
      entityId: assetId,
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { logs };
}

export async function createAsset(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:create");

  const orgId = session.currentOrgId!;
  const data = {
    name: formData.get("name") as string,
    type: (formData.get("type") as AssetType) || "OTHER",
    serialNumber: (formData.get("serialNumber") as string) || null,
    assetTag: (formData.get("assetTag") as string) || null,
    description: (formData.get("description") as string) || null,
    value: formData.get("value") ? parseFloat(formData.get("value") as string) : null,
    purchaseDate: formData.get("purchaseDate") ? new Date(formData.get("purchaseDate") as string) : null,
    employeeId: (formData.get("employeeId") as string) || null,
    status: (formData.get("employeeId") ? "ASSIGNED" : "RETURNED") as AssetStatus,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.name) {
    return { error: "Asset name is required" };
  }

  if (data.serialNumber) {
    const existing = await prisma.asset.findFirst({
      where: { organizationId: orgId, serialNumber: data.serialNumber },
    });
    if (existing) {
      return { error: "An asset with this serial number already exists" };
    }
  }

  if (data.assetTag) {
    const existing = await prisma.asset.findFirst({
      where: { organizationId: orgId, assetTag: data.assetTag },
    });
    if (existing) {
      return { error: "An asset with this asset tag already exists" };
    }
  }

  const asset = await prisma.asset.create({
    data: { ...data, organizationId: orgId },
  });

  await createAuditLog(session, orgId, {
    action: "asset.created",
    entityType: "Asset",
    entityId: asset.id,
    newData: { name: data.name, type: data.type, serialNumber: data.serialNumber, assetTag: data.assetTag },
  });

  revalidatePath("/app/assets");
  return { success: true, asset };
}

export async function updateAsset(assetId: string, formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:update");

  const orgId = session.currentOrgId!;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
  });

  if (!asset) {
    return { error: "Asset not found" };
  }

  const oldData = { ...asset };
  const data = {
    name: (formData.get("name") as string) || asset.name,
    type: (formData.get("type") as AssetType) || asset.type,
    serialNumber: formData.has("serialNumber") ? (formData.get("serialNumber") as string) || null : asset.serialNumber,
    assetTag: formData.has("assetTag") ? (formData.get("assetTag") as string) || null : asset.assetTag,
    description: formData.has("description") ? (formData.get("description") as string) || null : asset.description,
    value: formData.has("value") ? (formData.get("value") ? parseFloat(formData.get("value") as string) : null) : asset.value,
    purchaseDate: formData.has("purchaseDate") ? (formData.get("purchaseDate") ? new Date(formData.get("purchaseDate") as string) : null) : asset.purchaseDate,
    notes: formData.has("notes") ? (formData.get("notes") as string) || null : asset.notes,
  };

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data,
  });

  await createAuditLog(session, orgId, {
    action: "asset.updated",
    entityType: "Asset",
    entityId: assetId,
    oldData: { name: oldData.name, type: oldData.type },
    newData: { name: data.name, type: data.type },
  });

  revalidatePath("/app/assets");
  revalidatePath(`/app/assets/${assetId}`);
  return { success: true, asset: updated };
}

export async function assignAssetToEmployee(assetId: string, employeeId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:update");

  const orgId = session.currentOrgId!;

  const [asset, employee] = await Promise.all([
    prisma.asset.findFirst({ where: { id: assetId, organizationId: orgId } }),
    prisma.employee.findFirst({ where: { id: employeeId, organizationId: orgId } }),
  ]);

  if (!asset) return { error: "Asset not found" };
  if (!employee) return { error: "Employee not found" };

  const oldEmployeeId = asset.employeeId;

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: { employeeId, status: "ASSIGNED" },
  });

  await createAuditLog(session, orgId, {
    action: "asset.assigned",
    entityType: "Asset",
    entityId: assetId,
    oldData: { employeeId: oldEmployeeId },
    newData: { employeeId, employeeName: `${employee.firstName} ${employee.lastName}` },
  });

  revalidatePath("/app/assets");
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath(`/app/employees/${employeeId}`);
  return { success: true, asset: updated };
}

export async function unassignAsset(assetId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:update");

  const orgId = session.currentOrgId!;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });

  if (!asset) return { error: "Asset not found" };

  const oldEmployeeId = asset.employeeId;
  const oldEmployeeName = asset.employee ? `${asset.employee.firstName} ${asset.employee.lastName}` : null;

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: { employeeId: null, status: "RETURNED" },
  });

  await createAuditLog(session, orgId, {
    action: "asset.unassigned",
    entityType: "Asset",
    entityId: assetId,
    oldData: { employeeId: oldEmployeeId, employeeName: oldEmployeeName },
    newData: { employeeId: null },
  });

  revalidatePath("/app/assets");
  revalidatePath(`/app/assets/${assetId}`);
  if (oldEmployeeId) revalidatePath(`/app/employees/${oldEmployeeId}`);
  return { success: true, asset: updated };
}

export async function updateAssetReturnStatus(assetId: string, status: AssetStatus, notes?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:update");

  const orgId = session.currentOrgId!;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
  });

  if (!asset) return { error: "Asset not found" };

  const oldStatus = asset.status;

  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === "RETURNED") updateData.employeeId = null;

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: updateData,
  });

  await createAuditLog(session, orgId, {
    action: "asset.status_changed",
    entityType: "Asset",
    entityId: assetId,
    oldData: { status: oldStatus },
    newData: { status, notes },
  });

  revalidatePath("/app/assets");
  revalidatePath(`/app/assets/${assetId}`);
  return { success: true, asset: updated };
}

export async function deleteAsset(assetId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:delete");

  const orgId = session.currentOrgId!;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
  });

  if (!asset) return { error: "Asset not found" };

  if (asset.status === "ASSIGNED" && asset.employeeId) {
    return { error: "Cannot delete an asset that is currently assigned to an employee" };
  }

  await prisma.asset.delete({ where: { id: assetId } });

  await createAuditLog(session, orgId, {
    action: "asset.deleted",
    entityType: "Asset",
    entityId: assetId,
    oldData: { name: asset.name, type: asset.type, serialNumber: asset.serialNumber },
  });

  revalidatePath("/app/assets");
  return { success: true };
}

export async function getAssetsSummary() {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const orgId = session.currentOrgId!;

  const [total, assigned, pendingReturn, returned, lost, writtenOff] = await Promise.all([
    prisma.asset.count({ where: { organizationId: orgId } }),
    prisma.asset.count({ where: { organizationId: orgId, status: "ASSIGNED" } }),
    prisma.asset.count({ where: { organizationId: orgId, status: "PENDING_RETURN" } }),
    prisma.asset.count({ where: { organizationId: orgId, status: "RETURNED" } }),
    prisma.asset.count({ where: { organizationId: orgId, status: "LOST" } }),
    prisma.asset.count({ where: { organizationId: orgId, status: "WRITTEN_OFF" } }),
  ]);

  const recoveryRate = total > 0 ? Math.round(((returned + assigned) / total) * 100) : 100;

  return {
    total,
    assigned,
    pendingReturn,
    returned,
    lost,
    writtenOff,
    recoveryRate,
  };
}

export async function getEmployeeAssets(employeeId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const orgId = session.currentOrgId!;

  const assets = await prisma.asset.findMany({
    where: { organizationId: orgId, employeeId },
    orderBy: { createdAt: "desc" },
  });

  return { assets };
}

export async function updateAssetReturnForOffboarding(
  offboardingId: string,
  assetId: string,
  status: AssetReturnStatus,
  notes?: string
) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) return { error: "Offboarding not found" };

  const assetReturn = await prisma.assetReturn.findFirst({
    where: { offboardingId, assetId },
  });

  if (!assetReturn) return { error: "Asset return record not found" };

  const oldStatus = assetReturn.status;

  const updated = await prisma.assetReturn.update({
    where: { id: assetReturn.id },
    data: {
      status,
      notes: notes || assetReturn.notes,
      returnedAt: status === "RETURNED" ? new Date() : null,
      receivedBy: status === "RETURNED" ? session.user.id : null,
    },
  });

  if (status === "RETURNED") {
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "RETURNED", employeeId: null },
    });
  } else if (status === "LOST" || status === "NOT_RETURNED") {
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: status === "LOST" ? "LOST" : "ASSIGNED" },
    });
  }

  await createAuditLog(session, orgId, {
    action: "asset_return.status_changed",
    entityType: "AssetReturn",
    entityId: assetReturn.id,
    oldData: { status: oldStatus },
    newData: { status, notes },
    metadata: { offboardingId, assetId },
  });

  revalidatePath(`/app/offboardings/${offboardingId}`);
  revalidatePath(`/app/assets/${assetId}`);
  return { success: true, assetReturn: updated };
}

export async function checkOffboardingAssetBlockers(offboardingId: string) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const assetReturns = await prisma.assetReturn.findMany({
    where: { offboardingId },
    include: { asset: { select: { id: true, name: true, type: true, serialNumber: true } } },
  });

  const unresolved = assetReturns.filter(ar => 
    ar.status !== "RETURNED" && ar.status !== "LOST"
  );

  return {
    canComplete: unresolved.length === 0,
    unresolvedAssets: unresolved.map(ar => ({
      id: ar.asset.id,
      name: ar.asset.name,
      type: ar.asset.type,
      serialNumber: ar.asset.serialNumber,
      status: ar.status,
    })),
  };
}
