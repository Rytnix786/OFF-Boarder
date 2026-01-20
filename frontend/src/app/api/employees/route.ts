import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "employee:read");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { 
      organizationId: session.currentOrgId!,
      status: { not: "ARCHIVED" },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        department: { select: { name: true } },
      },
      orderBy: { lastName: "asc" },
      take: limit,
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Employee search error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
