import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SupportTicketStatus, SupportCategory } from "@prisma/client";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser?.isPlatformAdmin) {
    return null;
  }

  return dbUser;
}

const REACTIVATION_CATEGORIES: SupportCategory[] = [
  "ORGANIZATION_SUSPENDED",
  "ORGANIZATION_REJECTED",
  "ORGANIZATION_BLOCKED",
];

export async function GET(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

    const orgs = await prisma.organization.findMany({
      where: {
        id: { in: tickets.filter(t => t.organizationId).map(t => t.organizationId!) },
      },
      select: { id: true, name: true, status: true },
    });

    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));

    const ticketsWithOrg = tickets.map(t => ({
      ...t,
      organization: t.organizationId ? orgMap[t.organizationId] : null,
    }));

    const stats = await prisma.supportTicket.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statsMap = Object.fromEntries(stats.map(s => [s.status, s._count.id]));

    return NextResponse.json({
      tickets: ticketsWithOrg,
      stats: {
        open: statsMap.OPEN || 0,
        inProgress: statsMap.IN_PROGRESS || 0,
        waitingOnUser: statsMap.WAITING_ON_USER || 0,
        resolved: statsMap.RESOLVED || 0,
        closed: statsMap.CLOSED || 0,
        total: tickets.length,
      },
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, status, resolution, assignedTo } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status as SupportTicketStatus;
      if (status === "RESOLVED" || status === "CLOSED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = admin.id;
      }
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await prisma.platformAuditLog.create({
      data: {
        action: "SUPPORT_TICKET_UPDATED",
        entityType: "SupportTicket",
        entityId: ticketId,
        organizationId: ticket.organizationId,
        userId: admin.id,
        userName: admin.name || admin.email,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          oldStatus: ticket.status,
          newStatus: status || ticket.status,
          resolution: resolution || null,
        },
        severity: "INFO",
      },
    });

      return NextResponse.json({ success: true, ticket: updated });
    } catch (error) {
      console.error("Error updating support ticket:", error);
      return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, action, decisionReason } = body;

    if (!ticketId || !action) {
      return NextResponse.json({ error: "Ticket ID and action required" }, { status: 400 });
    }

    if (!["approve_reactivation", "deny_reactivation"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'approve_reactivation' or 'deny_reactivation'" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!REACTIVATION_CATEGORIES.includes(ticket.category)) {
      return NextResponse.json({ 
        error: "This ticket is not a reactivation request. Only suspended/rejected organization tickets can be processed." 
      }, { status: 400 });
    }

    if (!ticket.organizationId) {
      return NextResponse.json({ error: "Ticket has no associated organization" }, { status: 400 });
    }

    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      return NextResponse.json({ error: "Ticket is already resolved or closed" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: ticket.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Associated organization not found" }, { status: 404 });
    }

    if (org.status !== "SUSPENDED" && org.status !== "REJECTED") {
      return NextResponse.json({ 
        error: `Organization is currently ${org.status}. Only SUSPENDED or REJECTED organizations can be reactivated.` 
      }, { status: 400 });
    }

    const previousStatus = org.status;

    if (action === "approve_reactivation") {
      await prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: { id: org.id },
          data: {
            status: "ACTIVE",
            approvedAt: new Date(),
            approvedBy: admin.id,
            rejectionReason: null,
          },
        });

        await tx.membership.updateMany({
          where: { organizationId: org.id, status: "SUSPENDED" },
          data: { status: "ACTIVE" },
        });

        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: "RESOLVED",
            resolution: decisionReason || `Organization ${previousStatus === "REJECTED" ? "accepted" : "reactivated"} by platform admin`,
            resolvedAt: new Date(),
            resolvedBy: admin.id,
          },
        });

        const auditAction = previousStatus === "REJECTED" ? "ORG_REJECTION_OVERRIDDEN" : "ORG_REACTIVATED";
        
        await tx.platformAuditLog.create({
          data: {
            action: auditAction,
            entityType: "Organization",
            entityId: org.id,
            organizationId: org.id,
            targetOrgName: org.name,
            oldData: { status: previousStatus },
            newData: { 
              status: "ACTIVE", 
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              reason: decisionReason 
            },
            metadata: {
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              previousStatus,
              decisionReason,
              category: ticket.category,
            },
            userId: admin.id,
            userName: admin.name || admin.email,
            severity: "WARNING",
          },
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `Organization "${org.name}" has been ${previousStatus === "REJECTED" ? "accepted" : "reactivated"} successfully.`,
        organization: { id: org.id, name: org.name, status: "ACTIVE" },
      });

    } else {
      await prisma.$transaction(async (tx) => {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: "RESOLVED",
            resolution: decisionReason || "Reactivation request denied by platform admin",
            resolvedAt: new Date(),
            resolvedBy: admin.id,
          },
        });

        await tx.platformAuditLog.create({
          data: {
            action: "ORG_REACTIVATION_DENIED",
            entityType: "Organization",
            entityId: org.id,
            organizationId: org.id,
            targetOrgName: org.name,
            oldData: { status: previousStatus },
            newData: { 
              status: previousStatus,
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              denialReason: decisionReason 
            },
            metadata: {
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              decisionReason,
              category: ticket.category,
            },
            userId: admin.id,
            userName: admin.name || admin.email,
            severity: "INFO",
          },
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `Reactivation request for "${org.name}" has been denied.`,
        organization: { id: org.id, name: org.name, status: previousStatus },
      });
    }
  } catch (error) {
    console.error("Error processing reactivation request:", error);
    return NextResponse.json({ error: "Failed to process reactivation request" }, { status: 500 });
  }
}
