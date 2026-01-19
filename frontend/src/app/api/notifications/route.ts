import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { getNotificationsWithCount, invalidateUserCache } from "@/lib/cache.server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notifications, unreadCount } = await getNotificationsWithCount(
    session.user.id,
    session.currentOrgId!
  );

  const duration = Date.now() - startTime;
  
  return NextResponse.json(
    { notifications, unreadCount },
    {
      headers: {
        "X-Response-Time": `${duration}ms`,
        "Cache-Control": "private, max-age=10",
      },
    }
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notificationId, markAllRead } = body;

  const supabase = await createClient();

  if (markAllRead) {
    await supabase
      .from("Notification")
      .update({ read: true })
      .eq("userId", session.user.id)
      .eq("organizationId", session.currentOrgId!)
      .eq("read", false);
  } else if (notificationId) {
    await supabase
      .from("Notification")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("userId", session.user.id);
  }

  invalidateUserCache(session.user.id);

  return NextResponse.json({ success: true });
}
