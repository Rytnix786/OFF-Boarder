import { createClient } from "@/lib/supabase/server";

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
    | "org_reactivated";


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
    .eq("status", "VERIFIED")
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

  let excludedUserIds: string[] = [];
  if (excludeUserId) {
    excludedUserIds.push(excludeUserId);
  }

  if (excludeOffboardingSubjectId) {
    const { data: employeeLink } = await supabase
      .from("EmployeeUserLink")
      .select("userId")
      .eq("organizationId", organizationId)
      .eq("employeeId", excludeOffboardingSubjectId)
      .eq("status", "VERIFIED")
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
