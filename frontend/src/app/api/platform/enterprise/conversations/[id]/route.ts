import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformAdmin();
    const { id } = params;

    const conversation = await prisma.enterpriseConversation.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Fetch enterprise conversation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformAdmin();
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    const updated = await prisma.enterpriseConversation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update enterprise conversation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
