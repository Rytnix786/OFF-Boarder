import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await logPlatformAction({
      action: "platform_admin.sign_out",
      entityType: "user",
      entityId: session.user.id,
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      severity: "INFO",
      ipAddress: ip,
      userAgent: userAgent,
      metadata: {
        method: "web_admin_interface"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // If not a platform admin or error, still allow sign out logic to proceed on client
    return NextResponse.json({ success: false, error: "Not logged in as platform admin" }, { status: 401 });
  }
}
