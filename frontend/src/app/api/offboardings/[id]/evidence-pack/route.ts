import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isOwner, isAdmin, isAuditor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import crypto from "crypto";

const PHASE_MAP: Record<string, string> = {
  HR: "Pre-exit",
  IT: "Access Revocation",
  SECURITY: "Access Revocation",
  ASSETS: "Asset Recovery",
  FINANCE: "Post-exit",
  LEGAL: "Legal",
  OTHER: "Other",
};

function getPhase(category: string | null): string {
  return PHASE_MAP[category || "OTHER"] || "Other";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "offboarding:read");

    if (!isOwner(session) && !isAdmin(session) && !isAuditor(session)) {
      return NextResponse.json({ error: "Access denied. Only Owner, Admin, or Auditor can export Evidence Pack." }, { status: 403 });
    }

    const { id: offboardingId } = await params;
    const orgId = session.currentOrgId!;

    const offboarding = await prisma.offboarding.findFirst({
      where: { id: offboardingId, organizationId: orgId },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            location: true,
            manager: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        tasks: {
          orderBy: { order: "asc" },
          include: {
            evidence: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        approvals: {
          include: {
            approver: { select: { name: true, email: true } },
            task: true,
          },
        },
        assetReturns: {
          include: { asset: true },
        },
        accessRevocations: true,
        organization: true,
      },
    });

    if (!offboarding) {
      return NextResponse.json({ error: "Offboarding not found" }, { status: 404 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { entityType: "Offboarding", entityId: offboardingId },
          { entityType: "OffboardingTask", entityId: { in: offboarding.tasks.map(t => t.id) } },
          { entityType: "TaskEvidence", entityId: { in: offboarding.tasks.flatMap(t => t.evidence.map(e => e.id)) } },
          { entityType: "Approval", entityId: { in: offboarding.approvals.map(a => a.id) } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const generator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    let yPos = margin;

    const completedTasks = offboarding.tasks.filter(t => t.status === "COMPLETED" || t.status === "SKIPPED").length;
    const requiredEvidenceTasks = offboarding.tasks.filter(t => t.evidenceRequirement === "REQUIRED");
    const compliantEvidenceTasks = requiredEvidenceTasks.filter(t => t.evidence.length > 0);
    const nonCompliantTasks = requiredEvidenceTasks.filter(t => t.evidence.length === 0);

    const accessRevoked = offboarding.accessRevocations.filter(ar => ar.status === "CONFIRMED").length;
    const accessTotal = offboarding.accessRevocations.length;
    const assetsRecovered = offboarding.assetReturns.filter(ar => ar.status === "RETURNED").length;
    const assetsTotal = offboarding.assetReturns.length;
    const approvalsApproved = offboarding.approvals.filter(a => a.status === "APPROVED").length;
    const approvalsTotal = offboarding.approvals.length;

    const evidenceItemHashes: string[] = [];
    for (const task of offboarding.tasks) {
      for (const ev of task.evidence) {
        const hash = crypto.createHash("sha256")
          .update(`${ev.id}|${ev.createdAt.toISOString()}|${ev.createdByUserId}|${ev.fileHash || ""}`)
          .digest("hex");
        evidenceItemHashes.push(hash);
      }
    }
    const packContentHash = crypto.createHash("sha256")
      .update(evidenceItemHashes.join("|") + offboarding.updatedAt.toISOString())
      .digest("hex");

    const addHeader = () => {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(offboarding.organization.name, margin, 25);
      doc.text(`Offboarding ID: ${offboarding.id.slice(0, 8)}...`, pageWidth - margin, 25, { align: "right" });
    };

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 20, { align: "center" });
      doc.text(`Generated: ${new Date().toISOString()}`, margin, pageHeight - 20);
    };

    const addNewPage = () => {
      doc.addPage();
      yPos = margin;
      addHeader();
    };

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 60) {
        addNewPage();
      }
    };

    addHeader();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 40, pageWidth, 180, "F");

    doc.setTextColor(255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("EVIDENCE PACK", margin, 100);

    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text(`${offboarding.employee.firstName} ${offboarding.employee.lastName}`, margin, 130);

    doc.setFontSize(10);
    doc.setTextColor(180);
    doc.text(`${offboarding.organization.name}`, margin, 155);
    doc.text(`Offboarding ID: ${offboarding.id}`, margin, 170);
    doc.text(`Risk Level: ${offboarding.riskLevel || "NORMAL"}`, margin, 185);

    const statusColor = offboarding.status === "COMPLETED" ? [34, 197, 94] : offboarding.status === "CANCELLED" ? [239, 68, 68] : [251, 191, 36];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - margin - 120, 90, 120, 30, 3, 3, "F");
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(offboarding.status.replace("_", " "), pageWidth - margin - 60, 110, { align: "center" });

    doc.setTextColor(150);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`, pageWidth - margin, 155, { align: "right" });
    doc.text(`By: ${generator?.name || generator?.email || session.user.id}`, pageWidth - margin, 170, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("INTEGRITY CHECKSUM:", margin, 200);
    doc.setFont("helvetica", "bold");
    doc.text(packContentHash.slice(0, 32), margin + 100, 200);
    doc.setFont("helvetica", "normal");
    doc.text(`Pack Version: 1`, pageWidth - margin, 200, { align: "right" });

    yPos = 250;
    doc.setTextColor(30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", margin, yPos);
    yPos += 25;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const summaryData = [
      ["Employee", `${offboarding.employee.firstName} ${offboarding.employee.lastName}`],
      ["Department", offboarding.employee.department?.name || "—"],
      ["Job Title", offboarding.employee.jobTitle?.title || "—"],
      ["Scheduled Exit", offboarding.scheduledDate ? new Date(offboarding.scheduledDate).toLocaleDateString("en-US") : "—"],
      ["Completed", offboarding.completedDate ? new Date(offboarding.completedDate).toLocaleDateString("en-US") : "—"],
      ["Risk Level", offboarding.riskLevel || "NORMAL"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: summaryData,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 120 },
        1: { cellWidth: 200 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 80, 4, 4, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const colWidth = (pageWidth - margin * 2) / 4;

    doc.text("Access Revocation", margin + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${accessRevoked}/${accessTotal} confirmed`, margin + 15, yPos + 35);
    if (accessRevoked === accessTotal && accessTotal > 0) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(251, 191, 36);
    }
    doc.circle(margin + 15 + 60, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Asset Recovery", margin + colWidth + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${assetsRecovered}/${assetsTotal} returned`, margin + colWidth + 15, yPos + 35);
    if (assetsRecovered === assetsTotal) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(251, 191, 36);
    }
    doc.circle(margin + colWidth + 15 + 50, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Approvals", margin + colWidth * 2 + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${approvalsApproved}/${approvalsTotal} approved`, margin + colWidth * 2 + 15, yPos + 35);
    if (approvalsApproved === approvalsTotal) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(251, 191, 36);
    }
    doc.circle(margin + colWidth * 2 + 15 + 55, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Evidence Compliance", margin + colWidth * 3 + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${compliantEvidenceTasks.length}/${requiredEvidenceTasks.length} compliant`, margin + colWidth * 3 + 15, yPos + 35);
    if (nonCompliantTasks.length === 0) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(239, 68, 68);
    }
    doc.circle(margin + colWidth * 3 + 15 + 55, yPos + 55, 5, "F");

    yPos += 100;

    if (nonCompliantTasks.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 40, 4, 4, "F");
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("NON-COMPLIANT: Missing required evidence", margin + 15, yPos + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(nonCompliantTasks.map(t => t.name).join(", "), margin + 15, yPos + 32);
      yPos += 50;
    }

    doc.setTextColor(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const verdictText = offboarding.status === "COMPLETED" && nonCompliantTasks.length === 0
      ? "Offboarding completed successfully with full compliance."
      : offboarding.status === "COMPLETED" && nonCompliantTasks.length > 0
      ? "Offboarding completed with compliance gaps requiring review."
      : offboarding.status === "CANCELLED"
      ? "Offboarding was cancelled."
      : "Offboarding is in progress.";
    doc.text(`Final Status: ${verdictText}`, margin, yPos + 10);

    addNewPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("TIMELINE / ACTIVITY LOG", margin, yPos);
    yPos += 25;

    const timelineData = auditLogs.slice(0, 50).map(log => [
      new Date(log.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
      log.user?.name || log.user?.email || "System",
      log.action,
      log.entityType,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Time", "Actor", "Action", "Object"]],
      body: timelineData,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    addNewPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("TASK EVIDENCE", margin, yPos);
    yPos += 25;

    const groupedByPhase: Record<string, typeof offboarding.tasks> = {};
    for (const task of offboarding.tasks) {
      const phase = getPhase(task.category);
      if (!groupedByPhase[phase]) groupedByPhase[phase] = [];
      groupedByPhase[phase].push(task);
    }

    for (const [phase, tasks] of Object.entries(groupedByPhase)) {
      checkPageBreak(100);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text(phase.toUpperCase(), margin + 10, yPos + 16);
      yPos += 35;

      for (const task of tasks) {
        checkPageBreak(80 + task.evidence.length * 40);

        const statusIcon = task.status === "COMPLETED" ? "✓" : task.status === "SKIPPED" ? "—" : "○";
        const evidenceStatus = task.evidenceRequirement === "REQUIRED" && task.evidence.length === 0 ? " [NON-COMPLIANT]" : "";

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${statusIcon} ${task.name}${evidenceStatus}`, margin + 10, yPos);
        yPos += 12;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Status: ${task.status} | Evidence: ${task.evidenceRequirement} | Items: ${task.evidence.length}`, margin + 20, yPos);
        if (task.completedAt) {
          doc.text(`Completed: ${new Date(task.completedAt).toLocaleString("en-US")}`, margin + 280, yPos);
        }
        yPos += 15;
        doc.setTextColor(30);

        if (task.evidence.length > 0) {
          for (const ev of task.evidence) {
            checkPageBreak(40);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin + 20, yPos, pageWidth - margin * 2 - 30, 35, 2, 2, "F");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(`[${ev.type}] ${ev.title || "Untitled"}`, margin + 30, yPos + 12);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Added: ${new Date(ev.createdAt).toLocaleString("en-US")} | Immutable: ${ev.isImmutable ? "Yes" : "No"}`, margin + 30, yPos + 24);
            
            if (ev.linkUrl) {
              doc.text(`Link: ${ev.linkUrl.slice(0, 60)}${ev.linkUrl.length > 60 ? "..." : ""}`, margin + 30, yPos + 34);
            }
            if (ev.noteContent) {
              const truncated = ev.noteContent.slice(0, 100) + (ev.noteContent.length > 100 ? "..." : "");
              doc.text(`Note: ${truncated}`, margin + 30, yPos + 34);
            }
            if (ev.fileHash) {
              doc.text(`Checksum: ${ev.fileHash.slice(0, 24)}...`, margin + 350, yPos + 24);
            }

            doc.setTextColor(30);
            yPos += 42;
          }
        } else if (task.evidenceRequirement === "REQUIRED") {
          doc.setTextColor(185, 28, 28);
          doc.setFontSize(9);
          doc.text("⚠ Required evidence missing", margin + 30, yPos);
          doc.setTextColor(30);
          yPos += 15;
        }

        yPos += 10;
      }
    }

    addNewPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("APPENDIX", margin, yPos);
    yPos += 25;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("System Metadata", margin, yPos);
    yPos += 15;

    const metadataItems = [
      ["Platform Version", "1.0.0"],
      ["Organization ID", orgId],
      ["Offboarding ID", offboarding.id],
      ["Pack Generated At", new Date().toISOString()],
      ["Generated By User ID", session.user.id],
      ["Pack Integrity Hash", packContentHash],
      ["Evidence Items Count", offboarding.tasks.reduce((acc, t) => acc + t.evidence.length, 0).toString()],
      ["Audit Log Entries", auditLogs.length.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: metadataItems,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 150 },
        1: { cellWidth: 300, font: "courier" },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    checkPageBreak(150);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Evidence Item Checksums", margin, yPos);
    yPos += 15;

    const checksumData = offboarding.tasks.flatMap(t => 
      t.evidence.map(ev => [
        ev.id.slice(0, 8) + "...",
        ev.type,
        ev.fileHash?.slice(0, 32) || "N/A",
      ])
    ).slice(0, 30);

    if (checksumData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Evidence ID", "Type", "Hash"]],
        body: checksumData,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 3, font: "courier" },
        headStyles: { fillColor: [100, 116, 139], textColor: 255 },
        margin: { left: margin, right: margin },
      });
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i);
    }

    await prisma.evidencePack.upsert({
      where: { offboardingId },
      update: {
        generatedAt: new Date(),
        generatedBy: session.user.id,
        checksum: packContentHash,
        version: { increment: 1 },
        accessLog: {
          [new Date().toISOString()]: {
            userId: session.user.id,
            action: "pdf_exported",
          },
        },
      },
      create: {
        offboardingId,
        generatedBy: session.user.id,
        checksum: packContentHash,
        data: {},
        accessLog: {
          [new Date().toISOString()]: {
            userId: session.user.id,
            action: "pdf_generated",
          },
        },
      },
    });

    await createAuditLog(session, orgId, {
      action: "evidence.pdf_exported",
      entityType: "EvidencePack",
      entityId: offboardingId,
      newData: {
        employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
        checksum: packContentHash,
        pagesGenerated: totalPages,
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evidence-pack-${offboarding.employee.firstName}-${offboarding.employee.lastName}-${offboarding.id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Evidence Pack PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate Evidence Pack PDF" }, { status: 500 });
  }
}
