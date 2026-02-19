const postgres = require('postgres');

async function setup() {
  const sql = postgres('postgresql://neondb_owner:REDACTED@ep-polished-smoke-c4.us-east-1.aws.neon.tech/neondb?sslmode=require');
  
  try {
    const orgId = 'org_home';
    const userId = 'usr_368873ee-9605-48c2-9248-121f803f0a7b';

    console.log('Creating organization: Home...');
    await sql`INSERT INTO organizations (id, name, slug, plan) 
              VALUES (${orgId}, 'Home', 'home', 'free') 
              ON CONFLICT (id) DO NOTHING`;

    console.log('Linking user to organization...');
    await sql`INSERT INTO users (id, org_id, email, role) 
              VALUES (${userId}, ${orgId}, 'wes.sander.uc@gmail.com', 'admin')
              ON CONFLICT (id) DO UPDATE SET org_id = ${orgId}, role = 'admin'`;

    console.log('SUCCESS! Refresh your dashboard now.');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await sql.end();
  }
}

setup();
