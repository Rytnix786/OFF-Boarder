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
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const prisma = createPrismaClient();

async function checkRLSPolicies() {
  try {
    console.log('=== RLS Policies referencing app.current_org_id ===');
    
    // Check RLS policies that reference app.current_org_id
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname::text as schemaname, 
        tablename::text as tablename, 
        policyname::text as policyname, 
        permissive::text as permissive, 
        roles::text as roles, 
        cmd::text as cmd, 
        qual::text as qual
      FROM pg_policies 
      WHERE qual LIKE '%app.current_org_id%' 
      ORDER BY tablename, policyname
    `;
    
    console.log('Found', policies.length, 'policies referencing app.current_org_id:');
    policies.forEach((policy, index) => {
      console.log(`${index + 1}. Table: ${policy.tablename}, Policy: ${policy.policyname}, CMD: ${policy.cmd}`);
      console.log(`   Roles: ${policy.roles}`);
      console.log(`   Qual: ${policy.qual}`);
      console.log('');
    });
    
    // Check if pg_stat_statements is enabled
    console.log('=== pg_stat_statements extension ===');
    const pgStat = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_extension WHERE extname = 'pg_stat_statements'
    `;
    
    console.log('pg_stat_statements enabled:', pgStat[0].count > 0 ? 'YES' : 'NO');
    
    // Check for set_config usage if pg_stat_statements is available
    if (pgStat[0].count > 0) {
      console.log('\n=== set_config usage in pg_stat_statements ===');
      const setConfigUsage = await prisma.$queryRaw`
        SELECT query::text as query, calls FROM pg_stat_statements 
        WHERE query::text LIKE '%set_config%' OR query::text LIKE '%app.current_org_id%'
      `;
      
      if (setConfigUsage.length > 0) {
        console.log('Found set_config usage:');
        setConfigUsage.forEach((row, index) => {
          console.log(`${index + 1}. Query: ${row.query}, Calls: ${row.calls}`);
        });
      } else {
        console.log('No set_config usage found in pg_stat_statements');
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRLSPolicies();
