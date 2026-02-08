import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";
import {
  blockIP,
  unblockIP,
  getBlockedIPs,
  validateIPAddress,
  getClientIP,
} from "@/lib/ip-blocking.server";
import { BlockScope } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get("scope") as BlockScope | null;
  const includeInactive = searchParams.get("includeInactive") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (scope === BlockScope.GLOBAL) {
    if (!session.user.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await getBlockedIPs({
      scope: BlockScope.GLOBAL,
      includeInactive,
      limit,
      offset,
    });
    return NextResponse.json(result);
  }

  if (!session.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  const membership = session.memberships.find(
    (m) => m.organizationId === session.currentOrgId
  );
  if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getBlockedIPs({
    scope: BlockScope.ORGANIZATION,
    organizationId: session.currentOrgId,
    includeInactive,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ipAddress, scope, reason, expiresAt, confirmOwnIP } = body;

  if (!ipAddress || !validateIPAddress(ipAddress)) {
    return NextResponse.json({ error: "Invalid IP address" }, { status: 400 });
  }

  const currentIP = await getClientIP();
  if (ipAddress === currentIP && !confirmOwnIP) {
    return NextResponse.json(
      {
        error: "CONFIRM_OWN_IP",
        message: "You are about to block your own IP address. Set confirmOwnIP to true to proceed.",
      },
      { status: 400 }
    );
  }

  if (scope === BlockScope.GLOBAL) {
    if (!session.user.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const blockedIP = await blockIP({
      ipAddress,
      scope: BlockScope.GLOBAL,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdById: session.user.id,
    });

    await createAuditLog(session, "PLATFORM", {
      action: "ip.blocked",
      entityType: "BlockedIP",
      entityId: blockedIP.id,
      newData: {
        ipAddress,
        scope: BlockScope.GLOBAL,
        reason,
        expiresAt,
      },
      ipAddress: currentIP,
    });

    return NextResponse.json(blockedIP);
  }

  if (!session.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  const membership = session.memberships.find(
    (m) => m.organizationId === session.currentOrgId
  );
  if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blockedIP = await blockIP({
    ipAddress,
    scope: BlockScope.ORGANIZATION,
    organizationId: session.currentOrgId,
    reason,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdById: session.user.id,
  });

  await createAuditLog(session, session.currentOrgId, {
    action: "ip.blocked",
    entityType: "BlockedIP",
    entityId: blockedIP.id,
    newData: {
      ipAddress,
      scope: BlockScope.ORGANIZATION,
      reason,
      expiresAt,
    },
    ipAddress: currentIP,
  });

  return NextResponse.json(blockedIP);
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma.server");
  const blockedIP = await prisma.blockedIP.findUnique({
    where: { id },
    include: { organization: { select: { id: true } } },
  });

  if (!blockedIP) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (blockedIP.scope === BlockScope.GLOBAL) {
    if (!session.user.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const membership = session.memberships.find(
      (m) => m.organizationId === blockedIP.organizationId
    );
    if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await unblockIP(id);

  const currentIP = await getClientIP();
  const orgId = blockedIP.organizationId || "PLATFORM";

  await createAuditLog(session, orgId, {
    action: "ip.unblocked",
    entityType: "BlockedIP",
    entityId: id,
    oldData: {
      ipAddress: blockedIP.ipAddress,
      scope: blockedIP.scope,
      reason: blockedIP.reason,
    },
    ipAddress: currentIP,
  });

  return NextResponse.json({ success: true });
}
