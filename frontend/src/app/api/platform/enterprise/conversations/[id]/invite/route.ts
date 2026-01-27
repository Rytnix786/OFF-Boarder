import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;

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

    // Check if we're in development mode and allow test emails
    const isDevelopment = process.env.NODE_ENV === "development";
    const isTestEmail = conversation.contactEmail.includes("test") || 
                       conversation.contactEmail.includes("demo") || 
                       conversation.contactEmail.match(/^[a-z]+\d*@gmail\.com$/);

    let data, inviteError;

    if (isDevelopment && isTestEmail) {
      // For development with test emails, create a mock user without real invitation
      console.log(`Development mode: Creating mock invitation for test email ${conversation.contactEmail}`);
      
      // Create a mock user response
      data = {
        user: {
          id: `mock-user-${Date.now()}`,
          email: conversation.contactEmail,
          created_at: new Date().toISOString(),
        }
      };
      inviteError = null;
    } else {
      // For production or real emails, use actual Supabase invitation
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(
        conversation.contactEmail,
        {
          data: {
            full_name: conversation.contactName || "Enterprise User",
            company_name: conversation.companyName || "Unknown",
            source: "enterprise_inquiry",
          },
        }
      );
      
      data = result.data;
      inviteError = result.error;
    }

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
        supabaseUserId: data.user?.id || "mock-user",
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
