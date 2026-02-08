import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
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
      return NextResponse.redirect(`${origin}/register`);
    }

    if (dbUser.isPlatformAdmin) {
      return NextResponse.redirect(`${origin}/admin`);
    }

    const activeOrg = dbUser.memberships.find(
      (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
    );

    if (activeOrg) {
      return NextResponse.redirect(`${origin}/app`);
    }

    const activeEmployeeLink = dbUser.employeeUserLinks.find(
      (link) => link.status === "VERIFIED" && link.organization.status === "ACTIVE"
    );

    if (activeEmployeeLink) {
      return NextResponse.redirect(`${origin}/app/employee`);
    }

    const pendingOrg = dbUser.memberships.find(
      (m) => m.organization.status === "PENDING"
    );

    if (pendingOrg) {
      return NextResponse.redirect(`${origin}/pending`);
    }

    return NextResponse.redirect(`${origin}/register`);
  } catch (error) {
    console.error("Auth redirect error:", error);
    return NextResponse.redirect(`${origin}/login?error=redirect_failed`);
  }
}
