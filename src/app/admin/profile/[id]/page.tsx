import { redirect } from "next/navigation";

export default async function ProfileIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Redirect to the correct user details route
  redirect(`/admin/users/${id}`);
}
