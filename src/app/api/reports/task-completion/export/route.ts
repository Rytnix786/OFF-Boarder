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
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const whereClause: any = { offboarding: { organizationId: session.currentOrgId } };
    
    if (status) whereClause.status = status;
    if (from) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(from) };
    if (to) whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(to) };

    const tasks = await prisma.offboardingTask.findMany({
      where: whereClause,
      include: {
        offboarding: {
          select: {
            employee: { select: { firstName: true, lastName: true, email: true, employeeId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Task Name",
      "Description",
      "Employee Name",
      "Employee ID",
      "Employee Email",
      "Status",
      "Due Date",
      "Completed Date",
      "Completed By",
      "Created At",
    ];

    const rows = tasks.map((task) => [
      task.name,
      task.description || "",
      `${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`,
      task.offboarding.employee.employeeId,
      task.offboarding.employee.email,
      task.status,
      task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
      task.completedAt ? task.completedAt.toISOString().split("T")[0] : "",
      task.completedBy || "",
      task.createdAt.toISOString().split("T")[0],
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="task-completion-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting task completion report:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
