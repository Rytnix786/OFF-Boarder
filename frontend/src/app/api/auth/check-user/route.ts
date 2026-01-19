import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";

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
        employeeUserLinks: {
          where: { status: "VERIFIED" },
          include: {
            organization: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({
        isPlatformAdmin: false,
        hasOrganization: false,
        hasPendingOrg: false,
        hasEmployeePortalAccess: false,
        needsSetup: true,
      });
    }

    const activeOrg = dbUser.memberships.find(
      (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
    );
    
    const pendingOrg = dbUser.memberships.find(
      (m) => m.organization.status === "PENDING"
    );

    const activeEmployeeLink = dbUser.employeeUserLinks.find(
      (link) => link.status === "VERIFIED" && link.organization.status === "ACTIVE"
    );

    return NextResponse.json({
      isPlatformAdmin: dbUser.isPlatformAdmin,
      hasOrganization: !!activeOrg,
      hasPendingOrg: !!pendingOrg,
      hasEmployeePortalAccess: !!activeEmployeeLink,
      needsSetup: false,
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
