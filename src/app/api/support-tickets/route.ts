import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@/lib/supabase/server";
import { SupportCategory, SupportPriority } from "@prisma/client";

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

function getCategoryPriority(category: SupportCategory): SupportPriority {
  switch (category) {
    case "ORGANIZATION_SUSPENDED":
    case "ORGANIZATION_BLOCKED":
    case "SECURITY_CONCERN":
      return "HIGH";
    case "ORGANIZATION_REJECTED":
    case "ACCOUNT_ACCESS":
      return "MEDIUM";
    default:
      return "MEDIUM";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { category, subject, message, email, organizationId, context } = body;

    if (!category || !subject || !message || !email) {
      return NextResponse.json(
        { error: "Missing required fields: category, subject, message, email" },
        { status: 400 }
      );
    }

    if (!Object.values(SupportCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    let dbUser = null;
    if (user) {
      dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    }

    const ticketNumber = generateTicketNumber();
    const priority = getCategoryPriority(category as SupportCategory);

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        organizationId: organizationId || null,
        userId: dbUser?.id || null,
        email,
        category: category as SupportCategory,
        subject,
        message,
        priority,
        context: context || null,
      },
    });

    if (organizationId && dbUser) {
      try {
        await prisma.auditLog.create({
          data: {
            action: "SUPPORT_TICKET_CREATED",
            entityType: "SupportTicket",
            entityId: ticket.id,
            organizationId,
            userId: dbUser.id,
            metadata: {
              ticketNumber: ticket.ticketNumber,
              category: ticket.category,
              subject: ticket.subject,
              priority: ticket.priority,
            },
          },
        });
      } catch {
        // Non-critical, continue
      }
    }

    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      message: `Support ticket ${ticket.ticketNumber} created successfully`,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { error: "Failed to create support ticket" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const ticketNumber = searchParams.get("ticketNumber");

    if (ticketNumber) {
      const ticket = await prisma.supportTicket.findUnique({
        where: { ticketNumber },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      if (ticket.userId !== dbUser.id && !dbUser.isPlatformAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json({ ticket });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: dbUser.isPlatformAdmin ? {} : { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}
