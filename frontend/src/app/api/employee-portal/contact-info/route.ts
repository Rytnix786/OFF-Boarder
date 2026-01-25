import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Prisma user using the Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const employeeLink = await prisma.employeeUserLink.findFirst({
      where: { userId: dbUser.id, status: "VERIFIED" },
      include: { employee: true },
    });

    if (!employeeLink) {
      return NextResponse.json({ error: "No verified employee link found" }, { status: 403 });
    }

    const body = await request.json();
    const { personalPhone, personalEmail } = body;

    if (personalPhone !== undefined && typeof personalPhone !== "string") {
      return NextResponse.json({ error: "Invalid personalPhone" }, { status: 400 });
    }

    if (personalEmail !== undefined && typeof personalEmail !== "string") {
      return NextResponse.json({ error: "Invalid personalEmail" }, { status: 400 });
    }

    if (personalEmail && personalEmail.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employeeLink.employeeId },
      select: { personalPhone: true, personalEmail: true },
    });

    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || 
                      headersList.get("x-real-ip") || 
                      "unknown";

    const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = [];

    if (personalPhone !== undefined && personalPhone !== currentEmployee?.personalPhone) {
      changes.push({
        fieldName: "personalPhone",
        oldValue: currentEmployee?.personalPhone || null,
        newValue: personalPhone || null,
      });
    }

    if (personalEmail !== undefined && personalEmail !== currentEmployee?.personalEmail) {
      changes.push({
        fieldName: "personalEmail",
        oldValue: currentEmployee?.personalEmail || null,
        newValue: personalEmail || null,
      });
    }

    if (changes.length === 0) {
      return NextResponse.json({ message: "No changes detected" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeLink.employeeId },
        data: {
          ...(personalPhone !== undefined && { personalPhone: personalPhone || null }),
          ...(personalEmail !== undefined && { personalEmail: personalEmail || null }),
        },
      });

        for (const change of changes) {
          await tx.$executeRaw`
            INSERT INTO "EmployeeContactChangeLog" ("employeeId", "fieldName", "oldValue", "newValue", "changedByUserId", "ipAddress")
            VALUES (${employeeLink.employeeId}, ${change.fieldName}, ${change.oldValue}, ${change.newValue}, ${dbUser.id}, ${ipAddress})
          `;
        }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Contact information updated",
      changesLogged: changes.length,
    });
  } catch (error) {
    console.error("Error updating contact info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Prisma user using the Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const employeeLink = await prisma.employeeUserLink.findFirst({
      where: { userId: dbUser.id, status: "VERIFIED" },
      include: { employee: true },
    });

    if (!employeeLink) {
      return NextResponse.json({ error: "No verified employee link found" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeLink.employeeId },
      select: { personalPhone: true, personalEmail: true },
    });

    return NextResponse.json({
      personalPhone: employee?.personalPhone || "",
      personalEmail: employee?.personalEmail || "",
    });
  } catch (error) {
    console.error("Error fetching contact info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
