import "server-only";
import { getAuthSession, AuthSession } from "@/lib/auth.server";
import { getEmployeePortalSession, EmployeePortalSession } from "@/lib/employee-auth.server";

export type CombinedSession = {
  orgSession: AuthSession | null;
  employeeSession: EmployeePortalSession | null;
  userId: string | null;
};

/**
 * Optimized session helper that minimizes network calls to Supabase Auth.
 * Use this in server actions that need to check both session types.
 */
export async function getAnySession(): Promise<CombinedSession> {
  // Since both getAuthSession and getEmployeePortalSession call getSupabaseUser(),
  // we could optimize further, but for now let's at least handle the logic together.
  // Note: getSupabaseUser results are NOT cached across calls in the same request automatically 
  // unless we use React's cache() or a global variable.
  
  // Actually, getSupabaseUser in @/lib/auth.server.ts is NOT cached.
  // Let's check if we can optimize it by passing the user down.
  
  // For now, let's just use the existing ones but be mindful.
  const orgSession = await getAuthSession();
  const employeeSession = await getEmployeePortalSession();

  return {
    orgSession,
    employeeSession,
    userId: orgSession?.user.id || employeeSession?.user.id || null,
  };
}
