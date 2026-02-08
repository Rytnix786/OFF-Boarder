import { NextResponse } from "next/server";

const APP_ROUTES = [
  "/app",
  "/app/offboardings",
  "/app/risk-radar",
  "/app/employees",
  "/app/assets",
  "/app/workflows",
  "/app/analytics",
  "/app/integrations",
  "/app/audit-logs",
  "/app/reports",
  "/app/reports/offboarding-summary",
  "/app/reports/task-completion",
  "/app/reports/compliance",
  "/app/reports/employee-directory",
  "/app/settings/organization",
  "/app/settings/members",
  "/app/settings/roles",
  "/app/settings/structure",
  "/app/settings/security",
  "/app/settings/profile",
];

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = searchParams.get("baseUrl") || "http://localhost:3000";
  const includeAuth = searchParams.get("includeAuth") === "true";
  
  const results: { route: string; status: number; ok: boolean; error?: string }[] = [];
  
  const routesToCheck = includeAuth ? [...APP_ROUTES, ...PUBLIC_ROUTES] : PUBLIC_ROUTES;

  for (const route of routesToCheck) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        method: "HEAD",
        redirect: "manual",
      });
      
      const isRedirect = response.status >= 300 && response.status < 400;
      const isOk = response.status === 200 || isRedirect;
      
      results.push({
        route,
        status: response.status,
        ok: isOk,
      });
    } catch (error) {
      results.push({
        route,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const failed = results.filter(r => !r.ok);
  const passed = results.filter(r => r.ok);

  return NextResponse.json({
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      allPassed: failed.length === 0,
    },
    results,
    failedRoutes: failed,
  });
}
