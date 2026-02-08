import { NextRequest, NextResponse } from "next/server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend.server";

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "org:read");

    const body = await request.json();
    const { to } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Valid email address required in 'to' field" },
        { status: 400 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { 
          error: "Email service not configured",
          details: {
            resendApiKey: !!process.env.RESEND_API_KEY,
            emailFrom: !!process.env.EMAIL_FROM
          }
        },
        { status: 503 }
      );
    }

    const result = await sendEmail({
      to,
      subject: "OffBoarder Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🧪 OffBoarder Test Email</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">This is a test email from the OffBoarder platform.</p>
            <p style="margin: 10px 0 0 0; color: #666;">
              <strong>Sent at:</strong> ${new Date().toISOString()}<br>
              <strong>To:</strong> ${to}
            </p>
          </div>
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
            <p style="margin: 0; color: #2e7d32;"><strong>✅ Success!</strong> Email service is working correctly.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated test email from OffBoarder.
          </p>
        </div>
      `
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        id: result.id,
        to,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send test email",
          details: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Test email endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
