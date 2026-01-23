import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth.server";
import AdminPlatformClientLayout from "./AdminClientLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.isPlatformAdmin) {
    redirect("/app");
  }

  return <AdminPlatformClientLayout session={session}>{children}</AdminPlatformClientLayout>;
}
