import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = params;

    const conversation = await prisma.enterpriseConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!conversation.contactEmail) {
      return NextResponse.json({ error: "No contact email found in conversation" }, { status: 400 });
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createAdminClient();

    // Invite the user via Supabase
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      conversation.contactEmail,
      {
        data: {
          full_name: conversation.contactName || "Enterprise User",
          company_name: conversation.companyName || "Unknown",
          source: "enterprise_inquiry",
        },
      }
    );

    if (inviteError) {
      console.error("Supabase invite error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Log the action
    await logPlatformAction({
      action: "INVITE_ENTERPRISE_USER",
      entityType: "EnterpriseConversation",
      entityId: id,
      metadata: {
        email: conversation.contactEmail,
        supabaseUserId: data.user.id,
      },
      userId: admin.user.id,
      userName: admin.user.name || "Admin",
      severity: "INFO",
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${conversation.contactEmail}`,
      user: data.user,
    });
  } catch (error) {
    console.error("Invite enterprise user error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}
