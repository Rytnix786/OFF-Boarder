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
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const whereClause: any = { organizationId: session.currentOrgId };
    
    if (department) whereClause.departmentId = department;
    if (status) whereClause.status = status;

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        department: { select: { name: true } },
        location: { select: { name: true } },
        jobTitle: { select: { title: true } },
        manager: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const headers = [
      "First Name",
      "Last Name",
      "Employee ID",
      "Email",
      "Phone",
      "Department",
      "Job Title",
      "Location",
      "Manager Name",
      "Manager Email",
      "Status",
      "Hire Date",
    ];

    const rows = employees.map((emp) => [
      emp.firstName,
      emp.lastName,
      emp.employeeId,
      emp.email,
      emp.phone || "",
      emp.department?.name || "",
      emp.jobTitle?.title || "",
      emp.location?.name || "",
      emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : "",
      emp.manager?.email || "",
      emp.status,
      emp.hireDate ? emp.hireDate.toISOString().split("T")[0] : "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="employee-directory-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting employee directory:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
