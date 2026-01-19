import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth.server";
import { isAdmin } from "@/lib/rbac.server";
import { 
  updateSecurityPolicy, 
  getAllPolicies, 
  getEnforcementLogs,
} from "@/lib/security-policies";
import { PolicyType, POLICY_DEFINITIONS } from "@/lib/policy-definitions";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get("includeLogs") === "true";

    const policies = await getAllPolicies(session.currentOrgId);
    
    let logs: Awaited<ReturnType<typeof getEnforcementLogs>> = [];
    if (includeLogs) {
      logs = await getEnforcementLogs(session.currentOrgId, 20);
    }

    return NextResponse.json({ 
      success: true, 
      policies,
      logs,
    });
  } catch (error) {
    console.error("Get security policies error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { policyType, config, isActive, scope } = body;

    if (!policyType) {
      return NextResponse.json({ error: "Policy type is required" }, { status: 400 });
    }

    const validPolicyTypes = Object.keys(POLICY_DEFINITIONS) as PolicyType[];

    if (!validPolicyTypes.includes(policyType)) {
      return NextResponse.json({ error: "Invalid policy type" }, { status: 400 });
    }

    const policy = await updateSecurityPolicy(
      session,
      session.currentOrgId,
      policyType,
      config || {},
      isActive ?? false,
      scope
    );

    return NextResponse.json({ success: true, policy });
  } catch (error) {
    console.error("Security policy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update policy" },
      { status: 500 }
    );
  }
}
