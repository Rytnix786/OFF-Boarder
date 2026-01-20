import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const routes = [
  "/login",
  "/register",
  "/app",
  "/app/employee",
  "/pending",
  "/admin",
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
  "/app/settings/roles",
  "/app/settings/policies",
  "/app/settings/security",
  "/app/integrations",
  "/app/risk-radar",
  "/platform",
  "/platform/organizations",
  "/platform/audit",
  "/platform/policies",
  "/platform/signals",
];

async function testRoutes() {
  console.log("Testing routes (unauthenticated)...\n");
  
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:3000${route}`, {
        redirect: "manual",
      });
      const location = response.headers.get("location");
      console.log(`${route}: ${response.status}${location ? ` -> ${location}` : ""}`);
    } catch (error: any) {
      console.log(`${route}: ERROR - ${error.message}`);
    }
  }
}

testRoutes();
