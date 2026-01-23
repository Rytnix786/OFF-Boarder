import { NextRequest, NextResponse } from "next/server";
import { checkIPBlockedForAnyOrg, recordBlockedAttempt } from "@/lib/ip-blocking.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipAddress, path, method, userAgent, userId } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    const result = await checkIPBlockedForAnyOrg(ipAddress);

    if (result.blocked && result.blockedIP) {
      await recordBlockedAttempt({
        ipAddress,
        blockedIPId: result.blockedIP.id,
        path,
        method,
        userAgent,
        userId,
      });
    }

    return NextResponse.json({
      blocked: result.blocked,
    });
  } catch (error) {
    console.error("[IP Check API] Error:", error);
    // Return a 500 error so middleware can handle it (fail-closed)
    return NextResponse.json({ error: "Internal security check failed" }, { status: 500 });
  }
}
