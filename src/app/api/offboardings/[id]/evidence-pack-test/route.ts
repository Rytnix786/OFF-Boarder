import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offboardingId } = await params;

    const offboarding = await prisma.offboarding.findFirst({
        where: { id: offboardingId },
        include: {
          employee: {
            include: {
              department: true,
              jobTitle: true,
              location: true,
              managerMembership: { select: { user: { select: { name: true, email: true } } } },
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

    // Determine status at generation time based on actual completion metrics
    const statusAtGeneration = offboarding.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";

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

    const statusColor = statusAtGeneration === "COMPLETED" ? [34, 197, 94] : [251, 191, 36];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - margin - 120, 90, 120, 30, 3, 3, "F");
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(statusAtGeneration.replace("_", " "), pageWidth - margin - 60, 110, { align: "center" });

    doc.setTextColor(150);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`, pageWidth - margin, 155, { align: "right" });
    doc.text(`By: Test User`, pageWidth - margin, 170, { align: "right" });

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
      ["Status", statusAtGeneration],
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

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i);
    }

    // Create evidence pack record without snapshot fields
    await prisma.evidencePack.upsert({
        where: { offboardingId },
        update: {
          generatedAt: new Date(),
          generatedBy: "test-user",
          checksum: packContentHash,
          version: { increment: 1 },
        },
        create: {
          offboardingId,
          organizationId: offboarding.organizationId,
          generatedBy: "test-user",
          checksum: packContentHash,
          data: {},
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
