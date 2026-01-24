import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { notifyPlatformAdmins } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(',')[0] : (req.headers.get("x-real-ip") || "unknown");

    // Rate limit: 1 message per IP every 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentInquiry = await prisma.enterpriseConversation.findFirst({
      where: {
        ipAddress: ip,
        createdAt: { gte: fifteenMinutesAgo }
      }
    });

    if (recentInquiry && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Too many requests. Please wait 15 minutes before sending another message." },
        { status: 429 }
      );
    }

    const { name, email, company, message } = await req.json();

    if (!name || !email || !company || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Try to get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let organizationId: string | null = null;
    let senderId: string | null = null;
    let senderType: "EXTERNAL_VISITOR" | "ORG_USER" = "EXTERNAL_VISITOR";

    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            take: 1
          }
        }
      });

      if (dbUser) {
        senderId = dbUser.id;
        senderType = "ORG_USER";
        if (dbUser.memberships.length > 0) {
          organizationId = dbUser.memberships[0].organizationId;
        }
      }
    }

    // Create conversation and initial message in a transaction
    const conversation = await prisma.$transaction(async (tx) => {
      // Generate public token for unauthenticated reply access
      const publicToken = crypto.randomUUID();
      const publicTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // 1. Create the conversation
      const conv = await tx.enterpriseConversation.create({
          data: {
            subject: `Security Inquiry: ${company}`,
            contactName: name,
            contactEmail: email,
            companyName: company,
            source: "Landing Page",
            status: "OPEN" as const,
            organizationId: organizationId || null,
            lastMessageAt: new Date(),
            ipAddress: ip,
            publicToken,
            publicTokenExpires,
          },
        });

      // 2. Create the initial message
      await tx.enterpriseMessage.create({
        data: {
          conversationId: conv.id,
          content: message,
          senderId: senderId || undefined,
          senderType: senderType,
        },
      });

      return conv;
    });

    // Notify platform admins about the new inquiry
    await notifyPlatformAdmins({
      type: "enterprise_inquiry",
      title: "New Enterprise Inquiry",
      message: `${name} from ${company} sent a new message.`,
      link: `/admin/enterprise`, // Assuming this is the path to view inquiries
      fallbackOrganizationId: organizationId || undefined,
    });

    console.log(`[enterprise/contact] Created conversation ${conversation.id} for ${email}`);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      publicToken: conversation.publicToken,
    });
  } catch (error) {
    console.error("Error creating enterprise inquiry:", error);
    
    // Check for specific Prisma errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to send message. Please try again later.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
