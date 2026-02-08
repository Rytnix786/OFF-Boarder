
const { PrismaClient } = require('./frontend/node_modules/@prisma/client');
const prisma = new PrismaClient();
console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
process.exit(0);
