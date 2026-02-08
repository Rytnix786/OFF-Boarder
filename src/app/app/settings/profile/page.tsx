import { requireActiveOrg } from "@/lib/auth.server";
import { getSecurityActivity } from "@/lib/actions/profile";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await requireActiveOrg();
  const securityActivity = await getSecurityActivity(10);
  
  return (
    <ProfileClient
      user={{
        ...session.user,
        createdAt: session.user.createdAt,
      }}
      membership={{
        systemRole: session.currentMembership!.systemRole,
        status: session.currentMembership!.status,
        organization: session.currentMembership!.organization,
      }}
      securityActivity={securityActivity}
    />
  );
}
