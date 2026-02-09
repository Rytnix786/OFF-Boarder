import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const accounts = [
  "admin@offboardhq.demo",
  "owner@acme.demo",
  "orgadmin@acme.demo",
  "contributor@acme.demo",
  "auditor@acme.demo",
];

async function main() {
  for (const email of accounts) {
    const { data, error } = await c.auth.signInWithPassword({
      email,
      password: "Demo@123#",
    });
    if (error) {
      console.log(`FAIL: ${email} - ${error.message}`);
    } else {
      console.log(`OK:   ${email} (uid: ${data.user.id})`);
    }
  }
}

main();
