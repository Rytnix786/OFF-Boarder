import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isOwner, isAdmin, isAuditor } from "@/lib/rbac.server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "offboarding:read");

    if (!isOwner(session) && !isAdmin(session) && !isAuditor(session)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id: offboardingId } = await params;
    const orgId = session.currentOrgId!;

    const evidencePack = await prisma.evidencePack.findUnique({
      where: { offboardingId },
      select: {
        id: true,
        generatedAt: true,
        generatedBy: true,
        statusAtGeneration: true,
        completedTasksCount: true,
        totalTasksCount: true,
        accessRevokedCount: true,
        accessTotalCount: true,
        assetsRecoveredCount: true,
        assetsTotalCount: true,
        approvalsApprovedCount: true,
        approvalsTotalCount: true,
        compliantEvidenceCount: true,
        requiredEvidenceCount: true,
        version: true,
      },
    });

    if (!evidencePack) {
      return NextResponse.json({ error: "Evidence pack not found" }, { status: 404 });
    }

    return NextResponse.json(evidencePack);
  } catch (error) {
    console.error("Error fetching evidence pack info:", error);
    return NextResponse.json({ error: "Failed to fetch evidence pack info" }, { status: 500 });
  }
}
