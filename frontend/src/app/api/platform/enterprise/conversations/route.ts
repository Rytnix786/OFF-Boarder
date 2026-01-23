import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const enterpriseConversation = (prisma as any).enterpriseConversation;

    if (!enterpriseConversation) {
      console.warn("Prisma model 'enterpriseConversation' is not available in the current client.");
      return NextResponse.json([]);
    }

    const conversations = await enterpriseConversation.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Explicitly select metadata only to avoid PII leak
    const sanitizedConversations = conversations.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      orgName: c.organization.name,
      orgSlug: c.organization.slug,
      subject: c.subject,
      status: c.status,
      messageCount: c._count.messages,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    }));

    return NextResponse.json(sanitizedConversations);
  } catch (error) {
    console.error("Platform enterprise conversations error:", error);
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
