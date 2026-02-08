import { createClient } from "@/lib/supabase/server";

interface EmailConfig {
  from: string;
  fromName: string;
  replyTo?: string;
}

interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email configuration exists
    const emailConfig = await getEmailConfig();
    if (!emailConfig) {
      return { success: false, error: "Email not configured" };
    }

    // For now, we'll use a simple email service via Resend or similar
    // For production, this should be replaced with a proper email service
    console.log("Email would be sent:", JSON.stringify(emailData, null, 2));
    
    // Store email in database for tracking
    const supabase = await createClient();
    const { error } = await supabase.from("EmailQueue").insert({
      to: Array.isArray(emailData.to) ? emailData.to.join(",") : emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      from: `${emailConfig.fromName} <${emailConfig.from}>`,
      replyTo: emailData.replyTo || emailConfig.replyTo,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to queue email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("EmailConfig")
      .select("from, fromName, replyTo")
      .eq("active", true)
      .single();

    return data;
  } catch (error) {
    console.error("No email configuration found:", error);
    return null;
  }
}

export async function createEmailConfig(config: Omit<EmailConfig, "id" | "createdAt" | "updatedAt">) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("EmailConfig").insert({
      ...config,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to create email config:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating email config:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function processEmailQueue(): Promise<{ processed: number; errors: string[] }> {
  try {
    const supabase = await createClient();
    const { data: emails, error } = await supabase
      .from("EmailQueue")
      .select("*")
      .eq("status", "pending")
      .limit(10)
      .order("createdAt", { ascending: true });

    if (error) {
      return { processed: 0, errors: [error.message] };
    }

    const errors: string[] = [];
    let processed = 0;

    for (const email of emails) {
      try {
        // In a real implementation, this would call an email service
        console.log(`Processing email: ${email.subject} to ${email.to}`);
        
        // Mark as processed for now
        await supabase
          .from("EmailQueue")
          .update({ 
            status: "sent", 
            sentAt: new Date().toISOString() 
          })
          .eq("id", email.id);

        processed++;
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        errors.push(`Email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { processed, errors };
  } catch (error) {
    return { processed: 0, errors: [error instanceof Error ? error.message : "Unknown error"] };
  }
}
