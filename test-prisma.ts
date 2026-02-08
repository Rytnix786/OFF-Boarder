
import { prisma } from "./frontend/src/lib/prisma.server";

async function main() {
  try {
    console.log("Prisma keys:", Object.keys(prisma).filter(k => !k.startsWith("_")));
    const count = await (prisma as any).taskComment.count();
    console.log("TaskComment count:", count);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

main();
