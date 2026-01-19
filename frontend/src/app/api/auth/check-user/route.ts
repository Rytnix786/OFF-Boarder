import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, status: true, name: true },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({
        isPlatformAdmin: false,
        hasOrganization: false,
        hasPendingOrg: false,
        needsSetup: true,
      });
    }

    const activeOrg = dbUser.memberships.find(
      (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
    );
    
    const pendingOrg = dbUser.memberships.find(
      (m) => m.organization.status === "PENDING"
    );

    return NextResponse.json({
      isPlatformAdmin: dbUser.isPlatformAdmin,
      hasOrganization: !!activeOrg,
      hasPendingOrg: !!pendingOrg,
      needsSetup: false,
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
