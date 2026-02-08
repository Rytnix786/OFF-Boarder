import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

// Public endpoint - allows unauthenticated users to search for active organizations
// Used during registration flow for "Join Existing Organization" feature
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ organizations: [] });
    }

    // Only return active organizations with minimal info
    const organizations = await prisma.organization.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Search organizations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
