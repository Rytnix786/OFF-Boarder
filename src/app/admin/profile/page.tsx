import { getAuthSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function AdminProfilePage() {
  const session = await getAuthSession();

  if (!session || !session.user.isPlatformAdmin) {
    redirect("/login");
  }

  return <ProfileClient session={session} />;
}
