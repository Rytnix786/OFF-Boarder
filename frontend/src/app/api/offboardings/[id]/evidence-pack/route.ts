import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isOwner, isAdmin, isAuditor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import crypto from "crypto";
import { headers } from "next/headers";

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

function calculateSHA256(data: string | Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

interface EvidenceManifestItem {
  id: string;
  taskId: string;
  taskName: string;
  type: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  fileHash: string | null;
  calculatedHash: string;
  createdAt: string;
  createdBy: string;
  isImmutable: boolean;
  embeddedInPdf: boolean;
  embeddedSize: number | null;
}

interface ChainOfCustodyEntry {
  timestamp: string;
  actor: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
}

async function fetchFileAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { 
      headers: { "User-Agent": "OffBoarder-EvidencePack/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
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
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;

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
          include: { 
            asset: true,
            proofs: true,
          },
        },
        accessRevocations: true,
        organization: true,
        attestations: {
          include: {
            signedBy: { select: { name: true, email: true } },
          },
        },
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
          { entityType: "AssetReturn", entityId: { in: offboarding.assetReturns.map(ar => ar.id) } },
          { entityType: "AccessRevocation", entityId: { in: offboarding.accessRevocations.map(ar => ar.id) } },
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

    const existingPack = await prisma.evidencePack.findUnique({
      where: { offboardingId },
    });
    const currentVersion = (existingPack?.version || 0) + 1;

    const evidenceManifest: EvidenceManifestItem[] = [];
    const embeddedFiles: { name: string; data: Buffer; mimeType: string; hash: string }[] = [];

    for (const task of offboarding.tasks) {
      for (const ev of task.evidence) {
        const manifestItem: EvidenceManifestItem = {
          id: ev.id,
          taskId: task.id,
          taskName: task.name,
          type: ev.type,
          title: ev.title || "Untitled",
          fileName: ev.fileName,
          fileUrl: ev.fileUrl,
          fileHash: ev.fileHash,
          calculatedHash: calculateSHA256(`${ev.id}|${ev.createdAt.toISOString()}|${ev.createdByUserId}|${ev.fileHash || ""}`),
          createdAt: ev.createdAt.toISOString(),
          createdBy: ev.createdByUserId,
          isImmutable: ev.isImmutable,
          embeddedInPdf: false,
          embeddedSize: null,
        };

        if (ev.type === "FILE" && ev.fileUrl && ev.fileName) {
          const fileBuffer = await fetchFileAsBuffer(ev.fileUrl);
          if (fileBuffer) {
            manifestItem.embeddedInPdf = true;
            manifestItem.embeddedSize = fileBuffer.length;
            embeddedFiles.push({
              name: `evidence/${ev.id.slice(0, 8)}_${ev.fileName}`,
              data: fileBuffer,
              mimeType: ev.mimeType || "application/octet-stream",
              hash: ev.fileHash || calculateSHA256(fileBuffer),
            });
          }
        }

        if (ev.type === "NOTE" && ev.noteContent) {
          const noteBuffer = Buffer.from(ev.noteContent, "utf-8");
          manifestItem.embeddedInPdf = true;
          manifestItem.embeddedSize = noteBuffer.length;
          embeddedFiles.push({
            name: `evidence/${ev.id.slice(0, 8)}_note.txt`,
            data: noteBuffer,
            mimeType: "text/plain",
            hash: calculateSHA256(noteBuffer),
          });
        }

        evidenceManifest.push(manifestItem);
      }
    }

    for (const ar of offboarding.assetReturns) {
      for (const proof of ar.proofs) {
        if (proof.fileUrl && proof.fileName) {
          const fileBuffer = await fetchFileAsBuffer(proof.fileUrl);
          if (fileBuffer) {
            embeddedFiles.push({
              name: `asset-proofs/${ar.id.slice(0, 8)}_${proof.fileName}`,
              data: fileBuffer,
              mimeType: "application/octet-stream",
              hash: calculateSHA256(fileBuffer),
            });
          }
        }
      }
    }

    const chainOfCustody: ChainOfCustodyEntry[] = auditLogs.map(log => ({
      timestamp: log.createdAt.toISOString(),
      actor: log.user?.name || log.user?.email || "System",
      actorEmail: log.user?.email || null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.metadata ? JSON.stringify(log.metadata) : null,
      ipAddress: log.ipAddress,
    }));

    chainOfCustody.push({
      timestamp: new Date().toISOString(),
      actor: generator?.name || generator?.email || session.user.id,
      actorEmail: generator?.email || null,
      action: "evidence_pack.generated",
      entityType: "EvidencePack",
      entityId: offboardingId,
      details: JSON.stringify({ version: currentVersion, embeddedFilesCount: embeddedFiles.length }),
      ipAddress,
    });

    const contentHashInput = evidenceManifest.map(m => m.calculatedHash).join("|") + offboarding.updatedAt.toISOString();
    const contentHash = calculateSHA256(contentHashInput);

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

    const addHeader = () => {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(offboarding.organization.name, margin, 25);
      doc.text(`Case: ${offboarding.id.slice(0, 8)}... | v${currentVersion}`, pageWidth - margin, 25, { align: "right" });
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 20, { align: "center" });
      doc.text(`Generated: ${new Date().toISOString()}`, margin, pageHeight - 20);
      doc.text(`Hash: ${contentHash.slice(0, 16)}...`, pageWidth - margin, pageHeight - 20, { align: "right" });
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
    doc.rect(0, 40, pageWidth, 200, "F");

    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("AUDIT-GRADE", margin, 70);
    
    doc.setFontSize(32);
    doc.text("EVIDENCE PACK", margin, 105);

    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text(`${offboarding.employee.firstName} ${offboarding.employee.lastName}`, margin, 140);

    doc.setFontSize(10);
    doc.setTextColor(180);
    doc.text(`Organization: ${offboarding.organization.name}`, margin, 165);
    doc.text(`Offboarding ID: ${offboarding.id}`, margin, 180);
    doc.text(`Risk Level: ${offboarding.riskLevel || "NORMAL"}`, margin, 195);
    doc.text(`Version: ${currentVersion}`, margin, 210);

    const statusColor = offboarding.status === "COMPLETED" ? [34, 197, 94] : offboarding.status === "CANCELLED" ? [239, 68, 68] : [251, 191, 36];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - margin - 130, 80, 130, 35, 4, 4, "F");
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(offboarding.status.replace("_", " "), pageWidth - margin - 65, 102, { align: "center" });

    doc.setTextColor(150);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`, pageWidth - margin, 160, { align: "right" });
    doc.text(`By: ${generator?.name || generator?.email || session.user.id}`, pageWidth - margin, 175, { align: "right" });
    doc.text(`Embedded Files: ${embeddedFiles.length}`, pageWidth - margin, 190, { align: "right" });

    doc.setFillColor(31, 41, 55);
    doc.roundedRect(margin, 220, pageWidth - margin * 2, 20, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("CONTENT INTEGRITY HASH (SHA-256):", margin + 10, 233);
    doc.setFont("courier", "normal");
    doc.setTextColor(255);
    doc.text(contentHash, margin + 160, 233);

    yPos = 270;
    doc.setTextColor(30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", margin, yPos);
    yPos += 25;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const summaryData = [
      ["Employee", `${offboarding.employee.firstName} ${offboarding.employee.lastName}`],
      ["Employee ID", offboarding.employee.employeeId],
      ["Email", offboarding.employee.email],
      ["Department", offboarding.employee.department?.name || "—"],
      ["Job Title", offboarding.employee.jobTitle?.title || "—"],
      ["Location", offboarding.employee.location?.name || "—"],
      ["Manager", offboarding.employee.manager ? `${offboarding.employee.manager.firstName} ${offboarding.employee.manager.lastName}` : "—"],
      ["Scheduled Exit", offboarding.scheduledDate ? new Date(offboarding.scheduledDate).toLocaleDateString("en-US") : "—"],
      ["Completed", offboarding.completedDate ? new Date(offboarding.completedDate).toLocaleDateString("en-US") : "—"],
      ["Risk Level", offboarding.riskLevel || "NORMAL"],
      ["Offboarding Reason", offboarding.reason || "—"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: summaryData,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 120 },
        1: { cellWidth: 320 },
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
    doc.setFillColor(accessRevoked === accessTotal && accessTotal > 0 ? 34 : 251, accessRevoked === accessTotal && accessTotal > 0 ? 197 : 191, accessRevoked === accessTotal && accessTotal > 0 ? 94 : 36);
    doc.circle(margin + 75, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Asset Recovery", margin + colWidth + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${assetsRecovered}/${assetsTotal} returned`, margin + colWidth + 15, yPos + 35);
    doc.setFillColor(assetsRecovered === assetsTotal ? 34 : 251, assetsRecovered === assetsTotal ? 197 : 191, assetsRecovered === assetsTotal ? 94 : 36);
    doc.circle(margin + colWidth + 65, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Approvals", margin + colWidth * 2 + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${approvalsApproved}/${approvalsTotal} approved`, margin + colWidth * 2 + 15, yPos + 35);
    doc.setFillColor(approvalsApproved === approvalsTotal ? 34 : 251, approvalsApproved === approvalsTotal ? 197 : 191, approvalsApproved === approvalsTotal ? 94 : 36);
    doc.circle(margin + colWidth * 2 + 70, yPos + 55, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Evidence Compliance", margin + colWidth * 3 + 15, yPos + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${compliantEvidenceTasks.length}/${requiredEvidenceTasks.length} compliant`, margin + colWidth * 3 + 15, yPos + 35);
    doc.setFillColor(nonCompliantTasks.length === 0 ? 34 : 239, nonCompliantTasks.length === 0 ? 197 : 68, nonCompliantTasks.length === 0 ? 94 : 68);
    doc.circle(margin + colWidth * 3 + 70, yPos + 55, 5, "F");

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
      doc.text(nonCompliantTasks.map(t => t.name).join(", ").slice(0, 100), margin + 15, yPos + 32);
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
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("CHAIN OF CUSTODY", margin, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Complete audit trail of all actions taken during this offboarding process", margin, yPos + 18);
    yPos += 40;

    const cocData = chainOfCustody.slice(0, 100).map(entry => [
      new Date(entry.timestamp).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
      entry.actor.slice(0, 20),
      entry.action.replace(/_/g, " ").slice(0, 30),
      entry.entityType,
      entry.ipAddress?.slice(0, 15) || "—",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Timestamp", "Actor", "Action", "Entity", "IP Address"]],
      body: cocData,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    addNewPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("EVIDENCE MANIFEST", margin, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Total Evidence Items: ${evidenceManifest.length} | Embedded Files: ${embeddedFiles.length}`, margin, yPos + 18);
    yPos += 40;

    const manifestData = evidenceManifest.map((item, idx) => [
      (idx + 1).toString(),
      item.type,
      item.title.slice(0, 25),
      item.taskName.slice(0, 20),
      item.calculatedHash.slice(0, 16) + "...",
      item.embeddedInPdf ? "Yes" : "No",
      item.isImmutable ? "Yes" : "No",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Type", "Title", "Task", "SHA-256 Hash", "Embedded", "Immutable"]],
      body: manifestData,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 100 },
        3: { cellWidth: 90 },
        4: { cellWidth: 100, font: "courier" },
        5: { cellWidth: 50 },
        6: { cellWidth: 50 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    addNewPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("TASK EVIDENCE DETAILS", margin, yPos);
    yPos += 30;

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
        checkPageBreak(80 + task.evidence.length * 50);

        const statusIcon = task.status === "COMPLETED" ? "✓" : task.status === "SKIPPED" ? "—" : "○";
        const evidenceStatus = task.evidenceRequirement === "REQUIRED" && task.evidence.length === 0 ? " [NON-COMPLIANT]" : "";

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${statusIcon} ${task.name}${evidenceStatus}`, margin + 10, yPos);
        yPos += 14;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Status: ${task.status} | Evidence Req: ${task.evidenceRequirement} | Items: ${task.evidence.length}`, margin + 20, yPos);
        if (task.completedAt) {
          doc.text(`Completed: ${new Date(task.completedAt).toLocaleString("en-US")}`, margin + 320, yPos);
        }
        yPos += 18;
        doc.setTextColor(30);

        if (task.evidence.length > 0) {
          for (const ev of task.evidence) {
            checkPageBreak(55);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin + 20, yPos, pageWidth - margin * 2 - 30, 45, 2, 2, "F");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(`[${ev.type}] ${ev.title || "Untitled"}`, margin + 30, yPos + 12);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(`Added: ${new Date(ev.createdAt).toLocaleString("en-US")} | Immutable: ${ev.isImmutable ? "Yes" : "No"}`, margin + 30, yPos + 24);

            if (ev.type === "FILE" && ev.fileName) {
              doc.text(`File: ${ev.fileName} | Size: ${ev.fileSize ? `${(ev.fileSize / 1024).toFixed(1)}KB` : "—"}`, margin + 30, yPos + 35);
            }
            if (ev.linkUrl) {
              doc.text(`Link: ${ev.linkUrl.slice(0, 70)}${ev.linkUrl.length > 70 ? "..." : ""}`, margin + 30, yPos + 35);
            }
            if (ev.noteContent) {
              const truncated = ev.noteContent.slice(0, 80) + (ev.noteContent.length > 80 ? "..." : "");
              doc.text(`Note: ${truncated}`, margin + 30, yPos + 35);
            }

            const manifestItem = evidenceManifest.find(m => m.id === ev.id);
            if (manifestItem) {
              doc.setFont("courier", "normal");
              doc.text(`SHA-256: ${manifestItem.calculatedHash.slice(0, 32)}...`, margin + 300, yPos + 24);
              if (manifestItem.embeddedInPdf) {
                doc.setTextColor(34, 197, 94);
                doc.text("[EMBEDDED]", margin + 300, yPos + 35);
              }
            }

            doc.setTextColor(30);
            yPos += 52;
          }
        } else if (task.evidenceRequirement === "REQUIRED") {
          doc.setTextColor(185, 28, 28);
          doc.setFontSize(9);
          doc.text("⚠ Required evidence missing - NON-COMPLIANT", margin + 30, yPos);
          doc.setTextColor(30);
          yPos += 18;
        }

        yPos += 12;
      }
    }

    if (offboarding.attestations.length > 0) {
      addNewPage();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("EMPLOYEE ATTESTATIONS", margin, yPos);
      yPos += 30;

      for (const attestation of offboarding.attestations) {
        checkPageBreak(100);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, 70, 4, 4, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Signed by: ${attestation.signedBy?.name || attestation.signedBy?.email || "Unknown"}`, margin + 15, yPos + 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date(attestation.signedAt).toLocaleString("en-US")}`, margin + 15, yPos + 32);
        doc.text(`IP: ${attestation.ipAddress || "—"}`, margin + 200, yPos + 32);

        doc.setTextColor(30);
        doc.setFontSize(8);
        const statement = attestation.statement.slice(0, 200) + (attestation.statement.length > 200 ? "..." : "");
        const lines = doc.splitTextToSize(statement, pageWidth - margin * 2 - 40);
        doc.text(lines, margin + 15, yPos + 48);

        yPos += 80;
      }
    }

    addNewPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("SYSTEM METADATA & INTEGRITY", margin, yPos);
    yPos += 30;

    const metadataItems = [
      ["Pack Version", currentVersion.toString()],
      ["Organization ID", orgId],
      ["Offboarding ID", offboarding.id],
      ["Employee ID", offboarding.employeeId],
      ["Generated At (UTC)", new Date().toISOString()],
      ["Generated By User ID", session.user.id],
      ["Generated By Name", generator?.name || "—"],
      ["Generated By Email", generator?.email || "—"],
      ["Generator IP Address", ipAddress || "—"],
      ["Content Hash (SHA-256)", contentHash],
      ["Evidence Items Total", evidenceManifest.length.toString()],
      ["Embedded Files Count", embeddedFiles.length.toString()],
      ["Chain of Custody Entries", chainOfCustody.length.toString()],
      ["Audit Log Entries", auditLogs.length.toString()],
      ["Is Audit Grade", "Yes"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: metadataItems,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 150 },
        1: { cellWidth: 340, font: "courier" },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    checkPageBreak(150);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Embedded Files Checksums", margin, yPos);
    yPos += 20;

    if (embeddedFiles.length > 0) {
      const checksumData = embeddedFiles.slice(0, 50).map((file, idx) => [
        (idx + 1).toString(),
        file.name.slice(0, 40),
        file.mimeType.slice(0, 25),
        `${(file.data.length / 1024).toFixed(1)} KB`,
        file.hash.slice(0, 32) + "...",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "File Name", "MIME Type", "Size", "SHA-256 Hash"]],
        body: checksumData,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 3, font: "courier" },
        headStyles: { fillColor: [100, 116, 139], textColor: 255 },
        margin: { left: margin, right: margin },
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("No files embedded in this evidence pack.", margin, yPos);
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    const jspdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const pdfDoc = await PDFDocument.load(jspdfBuffer);

    for (const file of embeddedFiles) {
      await pdfDoc.attach(file.data, file.name, {
        mimeType: file.mimeType,
        description: `Evidence file: ${file.name}`,
        creationDate: new Date(),
        modificationDate: new Date(),
      });
    }

    const manifestJson = JSON.stringify({
      version: currentVersion,
      generatedAt: new Date().toISOString(),
      contentHash,
      evidenceManifest,
      chainOfCustody: chainOfCustody.slice(-100),
    }, null, 2);
    await pdfDoc.attach(Buffer.from(manifestJson), "evidence-manifest.json", {
      mimeType: "application/json",
      description: "Machine-readable evidence manifest with SHA-256 hashes",
    });

    const cocJson = JSON.stringify(chainOfCustody, null, 2);
    await pdfDoc.attach(Buffer.from(cocJson), "chain-of-custody.json", {
      mimeType: "application/json",
      description: "Complete chain of custody audit trail",
    });

    pdfDoc.setTitle(`Evidence Pack - ${offboarding.employee.firstName} ${offboarding.employee.lastName}`);
    pdfDoc.setAuthor(generator?.name || generator?.email || "OffBoarder System");
    pdfDoc.setSubject(`Offboarding Evidence Pack for ${offboarding.id}`);
    pdfDoc.setKeywords(["evidence", "offboarding", "audit", "compliance"]);
    pdfDoc.setProducer("OffBoarder Evidence Pack Generator v2.0");
    pdfDoc.setCreator("OffBoarder Platform");
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const finalPdfBytes = await pdfDoc.save();
    const finalPdfBuffer = Buffer.from(finalPdfBytes);
    const packChecksum = calculateSHA256(finalPdfBuffer);

    const evidencePack = await prisma.evidencePack.upsert({
      where: { offboardingId },
      update: {
        generatedAt: new Date(),
        generatedBy: session.user.id,
        checksum: packChecksum,
        contentHash,
        version: currentVersion,
        evidenceManifest: evidenceManifest as any,
        chainOfCustody: chainOfCustody.slice(-100) as any,
        embeddedFilesCount: embeddedFiles.length,
        totalEvidenceItems: evidenceManifest.length,
        accessLog: {
          ...(existingPack?.accessLog as Record<string, unknown> || {}),
          [new Date().toISOString()]: {
            userId: session.user.id,
            action: "pdf_generated",
            version: currentVersion,
            ipAddress,
          },
        },
      },
      create: {
        offboardingId,
        generatedBy: session.user.id,
        checksum: packChecksum,
        contentHash,
        data: {},
        evidenceManifest: evidenceManifest as any,
        chainOfCustody: chainOfCustody.slice(-100) as any,
        embeddedFilesCount: embeddedFiles.length,
        totalEvidenceItems: evidenceManifest.length,
        accessLog: {
          [new Date().toISOString()]: {
            userId: session.user.id,
            action: "pdf_generated",
            version: 1,
            ipAddress,
          },
        },
      },
    });

    await prisma.evidencePackGeneration.create({
      data: {
        evidencePackId: evidencePack.id,
        version: currentVersion,
        generatedBy: session.user.id,
        generatorName: generator?.name,
        generatorEmail: generator?.email,
        ipAddress,
        userAgent,
        checksum: packChecksum,
        contentHash,
        fileSize: finalPdfBuffer.length,
        pageCount: totalPages,
        evidenceItems: evidenceManifest as any,
        embeddedFiles: embeddedFiles.map(f => ({ name: f.name, mimeType: f.mimeType, size: f.data.length, hash: f.hash })) as any,
        chainOfCustody: chainOfCustody as any,
        isAuditGrade: true,
      },
    });

    await createAuditLog(session, orgId, {
      action: "evidence.audit_pack_generated",
      entityType: "EvidencePack",
      entityId: offboardingId,
      newData: {
        employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
        version: currentVersion,
        checksum: packChecksum,
        contentHash,
        pagesGenerated: totalPages,
        evidenceItemsCount: evidenceManifest.length,
        embeddedFilesCount: embeddedFiles.length,
        isAuditGrade: true,
      },
    });

    return new NextResponse(finalPdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evidence-pack-${offboarding.employee.firstName}-${offboarding.employee.lastName}-v${currentVersion}-${offboarding.id.slice(0, 8)}.pdf"`,
        "Content-Length": finalPdfBuffer.length.toString(),
        "X-Evidence-Pack-Version": currentVersion.toString(),
        "X-Content-Hash": contentHash,
        "X-Pack-Checksum": packChecksum,
        "X-Embedded-Files-Count": embeddedFiles.length.toString(),
        "X-Is-Audit-Grade": "true",
      },
    });
  } catch (error) {
    console.error("Evidence Pack PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate Evidence Pack PDF" }, { status: 500 });
  }
}
