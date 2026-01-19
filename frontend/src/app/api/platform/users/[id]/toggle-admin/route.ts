import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newAdminStatus = !user.isPlatformAdmin;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isPlatformAdmin: newAdminStatus },
    });

    await logPlatformAction({
      action: newAdminStatus ? "USER_MADE_ADMIN" : "USER_REMOVED_ADMIN",
      entityType: "User",
      entityId: id,
      oldData: { isPlatformAdmin: user.isPlatformAdmin },
      newData: { isPlatformAdmin: newAdminStatus },
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      severity: "WARNING",
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Toggle admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
