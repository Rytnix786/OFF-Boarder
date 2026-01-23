import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await (params as any);

    const conversation = await prisma.enterpriseConversation.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Explicitly return metadata only to avoid PII leak
    const sanitizedConversation = {
      id: conversation.id,
      organizationId: conversation.organizationId,
      orgName: conversation.organization.name,
      orgSlug: conversation.organization.slug,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
    };

    return NextResponse.json(sanitizedConversation);
  } catch (error) {
    console.error("Platform enterprise conversation detail error:", error);
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await (params as any);
    const { status } = await req.json();

    if (!["OPEN", "CLOSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const conversation = await prisma.enterpriseConversation.update({
      where: { id },
      data: { status },
      include: { organization: true },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Platform enterprise conversation update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
