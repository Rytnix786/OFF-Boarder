import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, getCurrentPlatformAdmin } from "@/lib/platform-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id: conversationId } = await params;

    const messages = await prisma.enterpriseMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Fetch enterprise messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentPlatformAdmin();
    const { id: conversationId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.enterpriseMessage.create({
        data: {
          conversationId,
          content,
          senderType: "PLATFORM_ADMIN",
          senderId: admin.id,
        },
      });

      await tx.enterpriseConversation.update({
        where: { id: conversationId },
        data: { 
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return msg;
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send enterprise message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
