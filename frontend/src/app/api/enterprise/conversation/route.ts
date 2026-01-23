import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { EnterpriseSenderType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveOrg();
    const organizationId = session.currentOrgId!;

    // Find or create the single security thread for this org
    let conversation = await prisma.enterpriseConversation.findFirst({
      where: { organizationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.enterpriseConversation.create({
        data: {
          organizationId,
          subject: "Security & Compliance Support",
        },
        include: {
          messages: true,
        },
      });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching enterprise conversation:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveOrg();
    const organizationId = session.currentOrgId!;
    const userId = session.user.id;

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    // Find the thread
    const conversation = await prisma.enterpriseConversation.findFirst({
      where: { organizationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status === "CLOSED") {
      return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });
    }

    // Create message (senderType: ORG_USER)
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.enterpriseMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          senderType: EnterpriseSenderType.ORG_USER,
          content,
        },
      });

      await tx.enterpriseConversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        },
      });

      return msg;
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error sending enterprise message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
