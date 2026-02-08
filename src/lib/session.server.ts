import "server-only";
import { getAuthSession, AuthSession } from "@/lib/auth.server";
import { getEmployeePortalSession, EmployeePortalSession } from "@/lib/employee-auth.server";
import { cache } from "react";

export type CombinedSession = {
  orgSession: AuthSession | null;
  employeeSession: EmployeePortalSession | null;
  userId: string | null;
};

/**
 * Optimized session helper that minimizes network calls to Supabase Auth.
 * Use this in server actions that need to check both session types.
 */
export const getAnySession = cache(async (): Promise<CombinedSession> => {
  // Promise.all for parallel fetching
  const [orgSession, employeeSession] = await Promise.all([
    getAuthSession(),
    getEmployeePortalSession()
  ]);

  return {
    orgSession,
    employeeSession,
    userId: orgSession?.user.id || employeeSession?.user.id || null,
  };
});
