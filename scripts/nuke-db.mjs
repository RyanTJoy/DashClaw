import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function nuke() {
  console.log('☢️  NUKING DATABASE...');
  console.log('    (This will delete ALL data in the connected database)');
  
  // Wait 3 seconds to allow Ctrl+C
  await new Promise(r => setTimeout(r, 3000));

  try {
    // Disable triggers/constraints if possible or just drop cascading
    // Getting all table names
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    if (tables.length === 0) {
      console.log('✅ No tables found. Database is already clean.');
      return;
    }

    console.log(`Found ${tables.length} tables. Dropping...`);

    // Drop all tables with CASCADE
    for (const t of tables) {
      console.log(`   Dropping ${t.table_name}...`);
      await sql.unsafe(`DROP TABLE IF EXISTS "${t.table_name}" CASCADE`);
    }

    // Drop enums/types if needed? Drizzle usually handles them on push, but let's be thorough if we can.
    // For now, dropping tables is usually enough for Drizzle to re-create.

    console.log('✅ Database nuked successfully.');
  } catch (err) {
    console.error('❌ Error nuking database:', err);
  } finally {
    process.exit(0);
  }
}

nuke();
