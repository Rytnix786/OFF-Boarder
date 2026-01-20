import { getAllOrganizations } from "@/lib/actions/organization";
import OrganizationsClient from "./OrganizationsClient";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tab?: string }>;
}) {
  const organizations = await getAllOrganizations();
  const params = await searchParams;
  return <OrganizationsClient organizations={organizations} initialStatus={params.status} initialTab={params.tab} />;
}
