import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function testAPI() {
  const response = await fetch("http://localhost:3000/api/platform/overview");
  console.log("Platform API Status:", response.status);
  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testAPI();
