import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.currentOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const whereClause: any = { organizationId: session.currentOrgId };
    
    if (action) whereClause.action = action;
    if (from) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(from) };
    if (to) whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(to) };

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Timestamp",
      "User Name",
      "User Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
      "User Agent",
    ];

    const rows = auditLogs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name || "",
      log.user?.email || "",
      log.action,
      log.entityType,
      log.entityId || "",
      log.ipAddress || "",
      log.userAgent || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="compliance-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting compliance report:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
