import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import SetupWizard from "./SetupWizard";

export default async function SetupPage() {
  const session = await getAuthSession();
  
  if (!session) {
    redirect("/login");
  }

  if (!session.currentMembership) {
    redirect("/register");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.currentOrgId! },
  });

  if (!org) {
    redirect("/register");
  }

  if (org.isSetupComplete) {
    redirect("/app");
  }

  if (session.currentMembership.systemRole !== "OWNER") {
    redirect("/app/pending");
  }

  return (
    <SetupWizard 
      organization={{
        id: org.id,
        name: org.name,
        primaryLocation: org.primaryLocation,
        timezone: org.timezone,
        organizationType: org.organizationType,
      }} 
    />
  );
}
