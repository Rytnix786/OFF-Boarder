import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { getBlockedIPAttempts } from "@/lib/ip-blocking";
import { BlockScope } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const blockedIPId = searchParams.get("blockedIPId");
  const ipAddress = searchParams.get("ipAddress");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (blockedIPId) {
    const { prisma } = await import("@/lib/prisma");
    const blockedIP = await prisma.blockedIP.findUnique({
      where: { id: blockedIPId },
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
  } else {
    if (!session.user.isPlatformAdmin) {
      if (!session.currentOrgId) {
        return NextResponse.json({ error: "No organization selected" }, { status: 400 });
      }
      const membership = session.memberships.find(
        (m) => m.organizationId === session.currentOrgId
      );
      if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const result = await getBlockedIPAttempts({
    blockedIPId: blockedIPId || undefined,
    ipAddress: ipAddress || undefined,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
