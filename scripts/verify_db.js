require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const pool = new Pool({ 
    connectionString,
    max: 15,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    maxUses: 100,
  });
  const adapter = new PrismaPg(pool, {
    schema: "public",
  });
  
  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

const prisma = createPrismaClient();

async function verifyDatabase() {
  try {
    console.log('=== Step 1: Database Connection Verification ===');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Get database info
    const dbInfo = await prisma.$queryRaw`
      SELECT current_database() as database, 
             current_schema() as schema,
             current_user as user,
             version() as version
    `;
    
    console.log('Database Info:');
    console.table(dbInfo[0]);
    
    // Check if we can see organizations
    const orgCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Organization"`;
    console.log(`Organizations in database: ${orgCount[0].count}`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyDatabase();
