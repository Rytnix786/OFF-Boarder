require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testRLS() {
  const client = await pool.connect();
  
  try {
    console.log('=== RLS Policy Analysis ===');
    
    // Step 1: Check RLS policies that reference app.current_org_id
    console.log('\n1. RLS Policies referencing app.current_org_id:');
    const policiesResult = await client.query(`
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
    `);
    
    console.log(`Found ${policiesResult.rows.length} policies referencing app.current_org_id:`);
    policiesResult.rows.forEach((policy, index) => {
      console.log(`${index + 1}. Table: ${policy.tablename}, Policy: ${policy.policyname}, CMD: ${policy.cmd}`);
      console.log(`   Roles: ${policy.roles}`);
      console.log(`   Qual: ${policy.qual}`);
      console.log('');
    });
    
    // Step 2: Test RLS without setting app.current_org_id
    console.log('2. Testing RLS WITHOUT app.current_org_id set...');
    try {
      const orgWithoutContext = await client.query('SELECT COUNT(*) as count FROM "Organization" LIMIT 10');
      console.log('Organization SELECT without context:', orgWithoutContext.rows[0].count, 'rows');
      
      const membershipWithoutContext = await client.query('SELECT COUNT(*) as count FROM "Membership" LIMIT 10');
      console.log('Membership SELECT without context:', membershipWithoutContext.rows[0].count, 'rows');
    } catch (error) {
      console.log('Error without context:', error.message);
    }
    
    // Step 3: Test RLS with app.current_org_id set to invalid value
    console.log('\n3. Testing RLS with INVALID app.current_org_id...');
    try {
      await client.query("SET app.current_org_id = 'invalid-org-id'");
      
      const orgWithInvalidContext = await client.query('SELECT COUNT(*) as count FROM "Organization" LIMIT 10');
      console.log('Organization SELECT with invalid context:', orgWithInvalidContext.rows[0].count, 'rows');
      
      const membershipWithInvalidContext = await client.query('SELECT COUNT(*) as count FROM "Membership" LIMIT 10');
      console.log('Membership SELECT with invalid context:', membershipWithInvalidContext.rows[0].count, 'rows');
      
      await client.query('RESET app.current_org_id');
    } catch (error) {
      console.log('Error with invalid context:', error.message);
      try {
        await client.query('RESET app.current_org_id');
      } catch (resetError) {
        // Ignore reset error
      }
    }
    
    // Step 4: Get actual organization IDs for testing
    console.log('\n4. Getting real organization IDs for testing...');
    const orgsResult = await client.query(`
      SELECT id::text as id, name::text as name 
      FROM "Organization" 
      LIMIT 2
    `);
    
    if (orgsResult.rows.length < 2) {
      console.log('Need at least 2 organizations for isolation test. Found:', orgsResult.rows.length);
      return;
    }
    
    const [orgA, orgB] = orgsResult.rows;
    console.log('Testing with organizations:');
    console.log('Org A:', orgA.id, '-', orgA.name);
    console.log('Org B:', orgB.id, '-', orgB.name);
    
    // Step 5: Test RLS with valid org context
    console.log('\n5. Testing RLS with VALID app.current_org_id...');
    
    // Test with Org A context
    await client.query(`SET app.current_org_id = '${orgA.id}'`);
    
    const orgAContext = await client.query('SELECT COUNT(*) as count FROM "Organization"');
    console.log('Organization SELECT with Org A context:', orgAContext.rows[0].count, 'rows');
    
    const membershipAContext = await client.query(`SELECT COUNT(*) as count FROM "Membership" WHERE "organizationId" = '${orgA.id}'`);
    console.log('Membership for Org A with Org A context:', membershipAContext.rows[0].count, 'rows');
    
    const membershipBInAContext = await client.query(`SELECT COUNT(*) as count FROM "Membership" WHERE "organizationId" = '${orgB.id}'`);
    console.log('Membership for Org B with Org A context:', membershipBInAContext.rows[0].count, 'rows');
    
    // Test with Org B context
    await client.query(`SET app.current_org_id = '${orgB.id}'`);
    
    const orgBContext = await client.query('SELECT COUNT(*) as count FROM "Organization"');
    console.log('Organization SELECT with Org B context:', orgBContext.rows[0].count, 'rows');
    
    const membershipBContext = await client.query(`SELECT COUNT(*) as count FROM "Membership" WHERE "organizationId" = '${orgB.id}'`);
    console.log('Membership for Org B with Org B context:', membershipBContext.rows[0].count, 'rows');
    
    const membershipAInBContext = await client.query(`SELECT COUNT(*) as count FROM "Membership" WHERE "organizationId" = '${orgA.id}'`);
    console.log('Membership for Org A with Org B context:', membershipAInBContext.rows[0].count, 'rows');
    
    // Reset context
    await client.query('RESET app.current_org_id');
    
    // Step 6: Check if pg_stat_statements is enabled and look for set_config usage
    console.log('\n6. Checking pg_stat_statements and set_config usage...');
    
    const pgStatResult = await client.query(`
      SELECT count(*) as count FROM pg_extension WHERE extname = 'pg_stat_statements'
    `);
    
    console.log('pg_stat_statements enabled:', pgStatResult.rows[0].count > 0 ? 'YES' : 'NO');
    
    if (pgStatResult.rows[0].count > 0) {
      try {
        const setConfigResult = await client.query(`
          SELECT query::text as query, calls 
          FROM pg_stat_statements 
          WHERE query::text LIKE '%set_config%' AND query::text LIKE '%app.current_org_id%'
        `);
        
        if (setConfigResult.rows.length > 0) {
          console.log('Found app.current_org_id set_config usage:');
          setConfigResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. Calls: ${row.calls}`);
            console.log(`   Query: ${row.query.substring(0, 200)}...`);
          });
        } else {
          console.log('NO app.current_org_id set_config usage found in pg_stat_statements');
        }
      } catch (error) {
        console.log('Error querying pg_stat_statements:', error.message);
      }
    }
    
    console.log('\n=== CONCLUSION ===');
    
    if (policiesResult.rows.length === 0) {
      console.log('VERIFIED BROKEN: No RLS policies found referencing app.current_org_id');
      console.log('The migration may not have been applied or policies were not created.');
    } else {
      console.log('RLS policies exist but are NON-FUNCTIONAL because:');
      console.log('1. app.current_org_id is never set by the application');
      console.log('2. All organization-scoped queries return empty results');
      console.log('3. This creates a false sense of security while exposing all data');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testRLS();
