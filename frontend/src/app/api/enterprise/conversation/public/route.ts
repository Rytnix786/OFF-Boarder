import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const conversation = await prisma.enterpriseConversation.findUnique({
      where: { publicToken: token },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check expiration
    if (conversation.publicTokenExpires && new Date() > conversation.publicTokenExpires) {
      return NextResponse.json({ error: "This magic link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        contactName: conversation.contactName,
        messages: conversation.messages.map(m => ({
          id: m.id,
          content: m.content,
          senderType: m.senderType,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("[public/messages/GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { token, content } = await req.json();

    if (!token || !content) {
      return NextResponse.json({ error: "Token and content are required" }, { status: 400 });
    }

    const conversation = await prisma.enterpriseConversation.findUnique({
      where: { publicToken: token },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check expiration
    if (conversation.publicTokenExpires && new Date() > conversation.publicTokenExpires) {
      return NextResponse.json({ error: "This magic link has expired" }, { status: 410 });
    }

    if (conversation.status === "CLOSED") {
      return NextResponse.json({ error: "This conversation is closed" }, { status: 400 });
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.enterpriseMessage.create({
        data: {
          conversationId: conversation.id,
          content,
          senderType: "EXTERNAL_VISITOR",
        },
      });

      await tx.enterpriseConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      return msg;
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("[public/messages/POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
