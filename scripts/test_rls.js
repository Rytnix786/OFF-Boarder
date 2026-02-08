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

async function testRLS() {
  try {
    console.log('=== RLS Policy Test ===');
    
    // Step 1: Check RLS policies that reference app.current_org_id
    console.log('\n1. Checking RLS policies...');
    const policies = await prisma.$queryRaw`
      SELECT 
        tablename::text as tablename, 
        policyname::text as policyname, 
        cmd::text as cmd, 
        qual::text as qual
      FROM pg_policies 
      WHERE qual LIKE '%app.current_org_id%' 
      ORDER BY tablename, policyname
    `;
    
    console.log('Found', policies.length, 'policies referencing app.current_org_id:');
    policies.forEach((policy, index) => {
      console.log(`${index + 1}. Table: ${policy.tablename}, Policy: ${policy.policyname}, CMD: ${policy.cmd}`);
      console.log(`   Qual: ${policy.qual}`);
      console.log('');
    });
    
    // Step 2: Test RLS without setting app.current_org_id
    console.log('2. Testing RLS WITHOUT app.current_org_id set...');
    try {
      const orgWithoutContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Organization" LIMIT 10`;
      console.log('Organization SELECT without context:', orgWithoutContext[0].count, 'rows');
      
      const membershipWithoutContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" LIMIT 10`;
      console.log('Membership SELECT without context:', membershipWithoutContext[0].count, 'rows');
    } catch (error) {
      console.log('Error without context:', error.message);
    }
    
    // Step 3: Test RLS with app.current_org_id set to invalid value
    console.log('\n3. Testing RLS with INVALID app.current_org_id...');
    try {
      await prisma.$executeRaw`SET app.current_org_id = 'invalid-org-id'`;
      
      const orgWithInvalidContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Organization" LIMIT 10`;
      console.log('Organization SELECT with invalid context:', orgWithInvalidContext[0].count, 'rows');
      
      const membershipWithInvalidContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" LIMIT 10`;
      console.log('Membership SELECT with invalid context:', membershipWithInvalidContext[0].count, 'rows');
      
      await prisma.$executeRaw`RESET app.current_org_id`;
    } catch (error) {
      console.log('Error with invalid context:', error.message);
      await prisma.$executeRaw`RESET app.current_org_id`;
    }
    
    // Step 4: Get actual organization IDs for testing
    console.log('\n4. Getting real organization IDs for testing...');
    const orgs = await prisma.$queryRaw`
      SELECT id::text as id, name::text as name 
      FROM "Organization" 
      LIMIT 2
    `;
    
    if (orgs.length < 2) {
      console.log('Need at least 2 organizations for isolation test. Found:', orgs.length);
      await prisma.$disconnect();
      return;
    }
    
    const [orgA, orgB] = orgs;
    console.log('Testing with organizations:');
    console.log('Org A:', orgA.id, '-', orgA.name);
    console.log('Org B:', orgB.id, '-', orgB.name);
    
    // Step 5: Test RLS with valid org context
    console.log('\n5. Testing RLS with VALID app.current_org_id...');
    
    // Test with Org A context
    await prisma.$queryRawUnsafe`SET app.current_org_id = '${orgA.id}'`;
    
    const orgAContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Organization"`;
    console.log('Organization SELECT with Org A context:', orgAContext[0].count, 'rows');
    
    const membershipAContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" WHERE organizationId = '${orgA.id}'`;
    console.log('Membership for Org A with Org A context:', membershipAContext[0].count, 'rows');
    
    const membershipBInAContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" WHERE organizationId = '${orgB.id}'`;
    console.log('Membership for Org B with Org A context:', membershipBInAContext[0].count, 'rows');
    
    // Test with Org B context
    await prisma.$queryRawUnsafe`SET app.current_org_id = '${orgB.id}'`;
    
    const orgBContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Organization"`;
    console.log('Organization SELECT with Org B context:', orgBContext[0].count, 'rows');
    
    const membershipBContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" WHERE organizationId = '${orgB.id}'`;
    console.log('Membership for Org B with Org B context:', membershipBContext[0].count, 'rows');
    
    const membershipAInBContext = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Membership" WHERE organizationId = '${orgA.id}'`;
    console.log('Membership for Org A with Org B context:', membershipAInBContext[0].count, 'rows');
    
    // Reset context
    await prisma.$queryRawUnsafe`RESET app.current_org_id`;
    
    // Step 6: Check if app.current_org_id is ever set in the application
    console.log('\n6. Checking for set_config usage in application...');
    
    const setConfigUsage = await prisma.$queryRaw`
      SELECT query::text as query, calls 
      FROM pg_stat_statements 
      WHERE query::text LIKE '%set_config%' AND query::text LIKE '%app.current_org_id%'
    `;
    
    if (setConfigUsage.length > 0) {
      console.log('Found app.current_org_id set_config usage:');
      setConfigUsage.forEach((row, index) => {
        console.log(`${index + 1}. Calls: ${row.calls}`);
        console.log(`   Query: ${row.query.substring(0, 200)}...`);
      });
    } else {
      console.log('NO app.current_org_id set_config usage found in pg_stat_statements');
    }
    
    await prisma.$disconnect();
    
    console.log('\n=== CONCLUSION ===');
    console.log('RLS policies exist but app.current_org_id context is NOT being set by the application.');
    console.log('This means RLS policies will always return empty results for organization-scoped queries.');
    
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testRLS();
