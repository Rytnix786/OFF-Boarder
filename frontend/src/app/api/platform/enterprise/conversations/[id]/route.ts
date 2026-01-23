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

    const enterpriseConversation = (prisma as any).enterpriseConversation;

    if (!enterpriseConversation) {
      console.warn("Prisma model 'enterpriseConversation' is not available in the current client.");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const conversation = await enterpriseConversation.findUnique({
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
      orgName: conversation.organization?.name || conversation.companyName || "External Inquiry",
      orgSlug: conversation.organization?.slug || "external",
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      isExternal: !conversation.organizationId,
      contactName: conversation.contactName,
      contactEmail: conversation.contactEmail,
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

    const enterpriseConversation = (prisma as any).enterpriseConversation;
    if (!enterpriseConversation) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const conversation = await enterpriseConversation.update({
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
