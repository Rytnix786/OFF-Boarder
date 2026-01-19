import { NextRequest, NextResponse } from "next/server";
import { checkIPBlockedForAnyOrg, recordBlockedAttempt } from "@/lib/ip-blocking";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipAddress, path, method, userAgent, userId } = body;

    if (!ipAddress) {
      return NextResponse.json({ blocked: false });
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
    console.error("IP check error:", error);
    return NextResponse.json({ blocked: false });
  }
}
