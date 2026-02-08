import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const conversations = await prisma.enterpriseConversation.findMany({
      include: {
        organization: {
          select: {
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

    const formatted = conversations.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      orgName: c.organization?.name || "External Visitor",
      orgSlug: c.organization?.slug || "external",
      subject: c.subject,
      status: c.status,
      messageCount: c._count.messages,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      isExternal: !c.organizationId,
      contactName: c.contactName,
      contactEmail: c.contactEmail,
      source: c.source,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch enterprise conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
