import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";
import { EnterpriseSenderType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await (params as any); // Next.js 15+ params handling

    const enterpriseMessage = (prisma as any).enterpriseMessage;

    if (!enterpriseMessage) {
      console.warn("Prisma model 'enterpriseMessage' is not available in the current client.");
      return NextResponse.json([]);
    }

    const messages = await enterpriseMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Platform enterprise messages error:", error);
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await (params as any);
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const enterpriseConversation = (prisma as any).enterpriseConversation;
    const enterpriseMessage = (prisma as any).enterpriseMessage;

    if (!enterpriseConversation || !enterpriseMessage) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const conversation = await enterpriseConversation.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Create message (senderType: PLATFORM_ADMIN)
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.enterpriseMessage.create({
        data: {
          conversationId: id,
          senderId: session.user.id,
          senderType: EnterpriseSenderType.PLATFORM_ADMIN,
          content,
        },
      });

      await tx.enterpriseConversation.update({
        where: { id },
        data: { 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        },
      });

      return msg;
    });

    // Log the platform action
    await logPlatformAction({
      action: "ENTERPRISE_MESSAGE_SENT",
      entityType: "EnterpriseConversation",
      entityId: id,
      organizationId: conversation.organizationId,
      targetOrgName: conversation.organization.name,
      newData: { messageId: message.id },
      userId: session.user.id,
      userName: session.user.name || session.user.email,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Platform enterprise reply error:", error);
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
