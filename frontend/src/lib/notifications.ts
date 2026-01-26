import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend.server";

export type NotificationType =
  | "offboarding_started"
  | "task_completed"
  | "task_assigned"
  | "member_joined"
  | "integration_error"
  | "general"
  | "approval_required"
  | "high_risk_approval_required"
  | "monitoring_alert"
  | "security_alert"
  | "risk_level_changed"
  | "evidence_requested"
  | "evidence_rejected"
  | "attestation_required"
  | "offboarding_completed"
  | "task_comment"
  | "org_suspended"
  | "org_reactivated"
  | "enterprise_inquiry"
  | "enterprise_message";


interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = await createClient();
  
  const { error } = await supabase.from("Notification").insert({
    userId: params.userId,
    organizationId: params.organizationId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }

  // Try to send email notification
  try {
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true" && isEmailConfigured()) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true }
      });

      if (user?.email) {
        const emailResult = await sendEmail({
          to: user.email,
          subject: params.title,
          html: `
            <h2>${params.title}</h2>
            <p>${params.message}</p>
            ${params.link ? `<p><a href="${params.link}">View Details</a></p>` : ''}
          `
        });

        if (emailResult.success) {
          console.log(`Email notification sent: ${emailResult.id} to ${user.email}`);
        } else {
          console.error(`Email notification failed: ${emailResult.error}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

export async function notifyPlatformAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  fallbackOrganizationId?: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      include: {
        memberships: {
          take: 1,
          select: { organizationId: true },
        },
      },
    });

    if (admins.length === 0) return;

    // We need an organizationId for the Notification model.
    // Platform admins may not be in the "same" org as the inquiry.
    // We'll use their first membership or a fallback.
    const notifications = admins.map((admin) => ({
      userId: admin.id,
      organizationId: admin.memberships[0]?.organizationId || params.fallbackOrganizationId || "SYSTEM",
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
    }));

    const supabase = await createClient();
    const { error } = await supabase.from("Notification").insert(notifications);
    
    if (error) {
      console.error("Failed to notify platform admins:", error);
    }
  } catch (error) {
    console.error("Error in notifyPlatformAdmins:", error);
  }
}


export async function createEmployeeNotification(
  organizationId: string,
  employeeId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  const supabase = await createClient();

  const { data: employeeLink } = await supabase
    .from("EmployeeUserLink")
    .select("userId")
    .eq("organizationId", organizationId)
    .eq("employeeId", employeeId)
    .in("status", ["VERIFIED", "PENDING_VERIFICATION"])
    .single();

  if (!employeeLink?.userId) {
    return;
  }

  const { error } = await supabase.from("Notification").insert({
    userId: employeeLink.userId,
    organizationId,
    type,
    title,
    message,
    link: link || null,
  });

  if (error) {
    console.error("Failed to create employee notification:", error);
  }
}

export async function createNotificationForOrgMembers(
  organizationId: string,
  excludeUserId: string | null,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeOffboardingSubjectId?: string
) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("Membership")
    .select("userId")
    .eq("organizationId", organizationId);

  if (!memberships) return;

  const excludedUserIds: string[] = [];
  if (excludeUserId) {
    excludedUserIds.push(excludeUserId);
  }

  if (excludeOffboardingSubjectId) {
    const { data: employeeLink } = await supabase
      .from("EmployeeUserLink")
      .select("userId")
      .eq("organizationId", organizationId)
      .eq("employeeId", excludeOffboardingSubjectId)
      .in("status", ["VERIFIED", "PENDING_VERIFICATION"])
      .single();
    
    if (employeeLink?.userId) {
      excludedUserIds.push(employeeLink.userId);
    }
  }

  const notifications = memberships
    .filter((m) => !excludedUserIds.includes(m.userId))
    .map((m) => ({
      userId: m.userId,
      organizationId,
      type,
      title,
      message,
      link: link || null,
    }));

  if (notifications.length > 0) {
    const { error } = await supabase.from("Notification").insert(notifications);
    if (error) {
      console.error("Failed to create notifications:", error);
    }
  }
}
