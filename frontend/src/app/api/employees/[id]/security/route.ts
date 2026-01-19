import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  markEmployeeHighRisk,
  removeHighRiskStatus,
  suspendEmployeeAccess,
  unsuspendEmployeeAccess,
  lockEmployeeAccount,
  unlockEmployeeAccount,
  forceLogoutEmployee,
  blockEmployeeIP,
} from "@/lib/employee-security";
import { validateIPAddress } from "@/lib/ip-blocking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: employeeId } = await params;
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: session.currentOrgId,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, reason, ipAddress, offboardingOnly, suspendUntil } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "markHighRisk":
        result = await markEmployeeHighRisk(session, employeeId, session.currentOrgId, reason);
        break;

      case "removeHighRisk":
        result = await removeHighRiskStatus(session, employeeId, session.currentOrgId, reason);
        break;

      case "suspend":
        result = await suspendEmployeeAccess(
          session,
          employeeId,
          session.currentOrgId,
          reason,
          suspendUntil ? new Date(suspendUntil) : undefined
        );
        break;

      case "unsuspend":
        result = await unsuspendEmployeeAccess(session, employeeId, session.currentOrgId, reason);
        break;

      case "lock":
        result = await lockEmployeeAccount(session, employeeId, session.currentOrgId, reason);
        break;

      case "unlock":
        result = await unlockEmployeeAccount(session, employeeId, session.currentOrgId, reason);
        break;

      case "forceLogout":
        result = await forceLogoutEmployee(session, employeeId, session.currentOrgId, reason);
        break;

      case "blockIP":
        if (!ipAddress) {
          return NextResponse.json({ error: "IP address is required" }, { status: 400 });
        }
        if (!validateIPAddress(ipAddress)) {
          return NextResponse.json({ error: "Invalid IP address" }, { status: 400 });
        }
        result = await blockEmployeeIP(
          session,
          employeeId,
          session.currentOrgId,
          ipAddress,
          reason,
          offboardingOnly || false
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Security action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 }
    );
  }
}
