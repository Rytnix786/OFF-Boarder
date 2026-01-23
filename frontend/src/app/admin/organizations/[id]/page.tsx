import React from "react";
import OrganizationDetailsClient from "./OrganizationDetailsClient";

export default async function OrganizationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganizationDetailsClient id={id} />;
}
