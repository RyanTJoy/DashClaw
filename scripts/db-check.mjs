import { createSqlFromEnv } from './_db.mjs';

async function check() {
  const sql = createSqlFromEnv();
  try {
    console.log('--- Database Diagnostic ---');
    
    const orgs = await sql`SELECT COUNT(*) as count FROM organizations`;
    console.log(`Organizations: ${orgs[0].count}`);

    const actions = await sql`SELECT COUNT(*) as count FROM action_records`;
    console.log(`Action Records: ${actions[0].count}`);

    if (parseInt(orgs[0].count) === 0) {
      console.log('⚠️ WARNING: No organizations found. The dashboard WILL fail.');
      console.log('Running emergency seed...');
      await sql`INSERT INTO organizations (id, name, slug, plan) VALUES ('org_default', 'Default Org', 'default', 'pro') ON CONFLICT DO NOTHING`;
      console.log('✅ Default organization created.');
    }

    // Test the signals query directly
    console.log('Testing signals query...');
    const testOrgId = 'org_default';
    const result = await sql`SELECT COUNT(*) FROM action_records WHERE org_id = ${testOrgId}`;
    console.log('✅ Query test successful.');

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
  } finally {
    if (sql.end) await sql.end();
  }
}

check();