import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "offboarding:read");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { 
      organizationId: session.currentOrgId!,
    };

    if (search) {
      where.employee = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const offboardings = await prisma.offboarding.findMany({
      where,
      select: {
        id: true,
        status: true,
        riskLevel: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(offboardings);
  } catch (error) {
    console.error("Offboarding search error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
