"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth.server";

const ORG_VIEW_COOKIE = "pa_org_context";

export async function setOrgView(orgId: string) {
  await requirePlatformAdmin();

  const cookieStore = await cookies();
  cookieStore.set(ORG_VIEW_COOKIE, JSON.stringify({ orgId, mode: "ORG_VIEW" }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours
  });

  redirect(`/admin/org-view/${orgId}`);
}

export async function exitOrgView() {
  await requirePlatformAdmin();

  const cookieStore = await cookies();
  cookieStore.delete(ORG_VIEW_COOKIE);

  redirect("/admin");
}

export async function getOrgViewContext() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ORG_VIEW_COOKIE);

  if (!cookie) return null;

  try {
    return JSON.parse(cookie.value) as { orgId: string; mode: string };
  } catch {
    return null;
  }
}
