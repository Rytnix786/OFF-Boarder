import { getAllOrganizations } from "@/lib/actions/organization";
import OrganizationsClient from "./OrganizationsClient";

export default async function OrganizationsPage() {
  const organizations = await getAllOrganizations();
  return <OrganizationsClient organizations={organizations} />;
}
