import { Resend } from "resend";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: React.ReactNode;
  from?: string;
}

let resendInstance: Resend | null = null;

function getResendInstance(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, email sending disabled");
    return null;
  }
  
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  
  return resendInstance;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendInstance();
  
  if (!resend) {
    const error = "Email service not configured";
    console.error("Resend email failed:", error);
    return { success: false, error };
  }

  try {
    const from = options.from || process.env.EMAIL_FROM;
    if (!from) {
      const error = "EMAIL_FROM not configured";
      console.error("Resend email failed:", error);
      return { success: false, error };
    }

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      react: options.react,
    });

    if (error) {
      console.error("Resend email failed:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      const error = "No data returned from Resend API";
      console.error("Resend email failed:", error);
      return { success: false, error };
    }

    console.log("Resend email sent successfully:", { id: data.id, to: options.to, subject: options.subject });
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Resend email error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
