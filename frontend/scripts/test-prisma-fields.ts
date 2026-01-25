import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing EmployeeUserLink fields...');
    // We don't actually need to run it, just check if the type exists
    // But we can try to find one
    const link = await prisma.employeeUserLink.findFirst();
    if (link) {
      console.log('Fields in link:', Object.keys(link));
      if ('accessExpiresAt' in link) {
        console.log('SUCCESS: accessExpiresAt exists in types');
      } else {
        console.log('FAILURE: accessExpiresAt MISSING in types');
      }
    } else {
      console.log('No links found to test, but types are being checked by TS...');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
