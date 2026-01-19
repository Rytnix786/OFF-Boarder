import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OrgBlockedContent } from "./OrgBlockedContent";

export default async function OrgBlockedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");
  
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  
  if (!dbUser) redirect("/register");

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id },
    include: { 
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          rejectionReason: true,
        }
      } 
    },
  });

  const activeMembership = memberships.find(
    (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
  );
  
  if (activeMembership) redirect("/app");

  const blockedMembership = memberships.find(
    (m) => m.status === "ACTIVE" && 
    (m.organization.status === "SUSPENDED" || m.organization.status === "REJECTED")
  );

  if (!blockedMembership) {
    redirect("/pending");
  }

  const org = blockedMembership.organization;

  return (
    <OrgBlockedContent 
      org={{
        id: org.id,
        name: org.name,
        status: org.status,
        rejectionReason: org.rejectionReason,
      }}
      userEmail={dbUser.email}
    />
  );
}
