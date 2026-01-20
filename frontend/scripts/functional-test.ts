import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function runTests() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log("\n=== PART A: AUTH/REDIRECT TESTS ===\n");
  
  console.log("1. Unauthenticated route tests:");
  const unauthRoutes = ["/login", "/register", "/app", "/app/employee", "/pending", "/admin"];
  for (const route of unauthRoutes) {
    const res = await fetch(`http://localhost:3000${route}`, { redirect: "manual" });
    const location = res.headers.get("location");
    console.log(`  ${route}: ${res.status}${location ? ` -> ${location}` : ""}`);
  }
  
  console.log("\n2. Login as Org Admin (owner@acme.demo):");
  const { data: adminAuth, error: adminError } = await supabase.auth.signInWithPassword({
    email: "owner@acme.demo",
    password: "Demo123!@#",
  });
  
  if (adminError) {
    console.log("  FAIL: Could not login as org admin:", adminError.message);
    return;
  }
  console.log("  PASS: Logged in successfully");
  
  const adminCookie = `sb-mcmqzwgaojgmrcmdsygh-auth-token=${adminAuth.session?.access_token}`;
  
  console.log("\n3. Authenticated route access as Org Admin:");
  const adminRoutes = [
    "/app",
    "/app/employees",
    "/app/offboardings",
    "/app/assets",
    "/app/workflows",
    "/app/analytics",
    "/app/audit-logs",
    "/app/reports",
    "/app/settings",
    "/app/settings/organization",
    "/app/settings/members",
    "/app/settings/structure",
    "/app/integrations",
    "/app/risk-radar",
  ];
  
  for (const route of adminRoutes) {
    const res = await fetch(`http://localhost:3000${route}`, {
      redirect: "manual",
      headers: { Cookie: adminCookie },
    });
    const location = res.headers.get("location");
    const status = res.status === 200 ? "PASS" : `FAIL(${res.status})`;
    console.log(`  ${route}: ${status}${location ? ` -> ${location}` : ""}`);
  }
  
  await supabase.auth.signOut();
  
  console.log("\n4. Login as Platform Admin (admin@offboardhq.demo):");
  const { data: platformAuth, error: platformError } = await supabase.auth.signInWithPassword({
    email: "admin@offboardhq.demo",
    password: "Demo123!@#",
  });
  
  if (platformError) {
    console.log("  FAIL: Could not login as platform admin:", platformError.message);
    return;
  }
  console.log("  PASS: Logged in successfully");
  
  const platformCookie = `sb-mcmqzwgaojgmrcmdsygh-auth-token=${platformAuth.session?.access_token}`;
  
  console.log("\n5. Platform Admin route access:");
  const platformRoutes = [
    "/platform",
    "/platform/organizations",
    "/platform/audit",
    "/platform/policies",
    "/platform/signals",
  ];
  
  for (const route of platformRoutes) {
    const res = await fetch(`http://localhost:3000${route}`, {
      redirect: "manual",
      headers: { Cookie: platformCookie },
    });
    const location = res.headers.get("location");
    const status = res.status === 200 ? "PASS" : `FAIL(${res.status})`;
    console.log(`  ${route}: ${status}${location ? ` -> ${location}` : ""}`);
  }
  
  console.log("\n=== PART B: API HEALTH TESTS ===\n");
  
  const apiTests = [
    { method: "GET", path: "/api/employees", cookie: adminCookie, name: "Get employees" },
    { method: "GET", path: "/api/offboardings", cookie: adminCookie, name: "Get offboardings" },
    { method: "GET", path: "/api/organizations", cookie: adminCookie, name: "Get organizations" },
    { method: "GET", path: "/api/notifications", cookie: adminCookie, name: "Get notifications" },
    { method: "GET", path: "/api/platform/overview", cookie: platformCookie, name: "Platform overview" },
  ];
  
  for (const test of apiTests) {
    try {
      const res = await fetch(`http://localhost:3000${test.path}`, {
        method: test.method,
        headers: { Cookie: test.cookie },
      });
      const status = res.status < 400 ? "PASS" : `FAIL(${res.status})`;
      console.log(`  ${test.name}: ${status}`);
    } catch (e: any) {
      console.log(`  ${test.name}: ERROR - ${e.message}`);
    }
  }
  
  console.log("\n=== PART C: PERFORMANCE SMOKE ===\n");
  
  const perfRoutes = ["/login", "/app", "/app/employees"];
  for (const route of perfRoutes) {
    const start = Date.now();
    await fetch(`http://localhost:3000${route}`, {
      redirect: "manual",
      headers: route !== "/login" ? { Cookie: adminCookie } : {},
    });
    const duration = Date.now() - start;
    const status = duration < 700 ? "PASS" : "SLOW";
    console.log(`  ${route}: ${duration}ms [${status}]`);
  }
  
  await supabase.auth.signOut();
  console.log("\n=== TESTS COMPLETE ===\n");
}

runTests().catch(console.error);
