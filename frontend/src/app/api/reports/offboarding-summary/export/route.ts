import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.currentOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const whereClause: any = { organizationId: session.currentOrgId };
    
    if (status) whereClause.status = status;
    if (from) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(from) };
    if (to) whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(to) };

    const offboardings = await prisma.offboarding.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        tasks: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Employee Name",
      "Employee ID",
      "Email",
      "Department",
      "Status",
      "Progress",
      "Created Date",
      "Scheduled Date",
      "Completed Date",
      "Total Tasks",
      "Completed Tasks",
    ];

    const rows = offboardings.map((o) => {
      const completedTasks = o.tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
      const progress = o.tasks.length > 0 ? Math.round((completedTasks / o.tasks.length) * 100) : 0;
      return [
        `${o.employee.firstName} ${o.employee.lastName}`,
        o.employee.employeeId,
        o.employee.email,
        o.employee.department?.name || "",
        o.status,
        `${progress}%`,
        o.createdAt.toISOString().split("T")[0],
        o.scheduledDate ? o.scheduledDate.toISOString().split("T")[0] : "",
        o.completedDate ? o.completedDate.toISOString().split("T")[0] : "",
        o.tasks.length.toString(),
        completedTasks.toString(),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="offboarding-summary-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting offboarding summary:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
