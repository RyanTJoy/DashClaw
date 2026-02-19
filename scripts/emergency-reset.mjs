import postgres from 'postgres';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';

// --- Helpers ---

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function banner(text) {
  const line = '='.repeat(60);
  console.log(`\n${line}\n  ${text}\n${line}\n`);
}

function step(msg) {
  console.log(`\n🔹 ${msg}...`);
}

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); process.exit(1); }

// --- Main ---

async function main() {
  banner('⚠️  DASHCLAW EMERGENCY DATABASE RESET  ⚠️');
  console.log('This script will:');
  console.log('  1. DROP the entire public schema (Delete ALL data)');
  console.log('  2. Delete local migration files (drizzle/ folder)');
  console.log('  3. Regenerate migrations from schema/schema.js');
  console.log('  4. Push new schema to the database');
  console.log('  5. Seed the "org_default" required for login');
  console.log('\nPRE-REQUISITE: You must have a valid DATABASE_URL.');
  
  // 1. Get Database URL
  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl && fs.existsSync('.env.local')) {
    const envConfig = fs.readFileSync('.env.local', 'utf8');
    const match = envConfig.match(/DATABASE_URL=(.*)/);
    if (match) dbUrl = match[1].trim().replace(/^["']|["']$/g, '');
  }

  if (!dbUrl) {
    console.log('\n❌ No DATABASE_URL found in environment or .env.local');
    console.log('Please copy your connection string from Vercel or Neon.');
    dbUrl = await ask('Paste DATABASE_URL here: ');
  }

  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    fail('Invalid DATABASE_URL. Must start with postgres...');
  }

  // 2. Confirm Nuke
  console.log(`\nTARGET DATABASE: ${dbUrl.replace(/\/\/.*@/, '//***@')}`);
  console.log('\n⚠️  WARNING: IRREVERSIBLE DATA LOSS  ⚠️');
  const confirm = await ask('Type "NUKE" to proceed with destroying this database: ');
  
  if (confirm !== 'NUKE') {
    console.log('Aborted.');
    process.exit(0);
  }

  // 3. Drop Schema
  step('Dropping public schema');
  const sql = postgres(dbUrl, { max: 1 });
  try {
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    ok('Schema dropped and recreated (with vector extension)');
  } catch (err) {
    fail(`Failed to drop schema: ${err.message}`);
  }

  // 4. Clean local migrations
  step('Cleaning local migration files');
  const drizzleDir = path.join(process.cwd(), 'drizzle');
  if (fs.existsSync(drizzleDir)) {
    fs.rmSync(drizzleDir, { recursive: true, force: true });
    ok('Deleted drizzle/ directory');
  } else {
    ok('No drizzle/ directory found (skipping)');
  }

  // 5. Generate Migrations
  step('Generating new migrations');
  try {
    // We need to pass the DB URL to drizzle-kit commands env
    const env = { ...process.env, DATABASE_URL: dbUrl };
    execSync('npx drizzle-kit generate', { stdio: 'inherit', env });
    ok('Migrations generated');
  } catch (err) {
    fail('Failed to generate migrations');
  }

  // 6. Push Schema
  step('Pushing schema to database');
  try {
    const env = { ...process.env, DATABASE_URL: dbUrl };
    execSync('npx drizzle-kit push', { stdio: 'inherit', env });
    ok('Schema pushed successfully');
  } catch (err) {
    fail('Failed to push schema');
  }

  // 7. Seed Default Data
  step('Seeding default data');
  try {
    // We need org_default for the auth flow to work (users.org_id -> organizations.id)
    await sql`
      INSERT INTO organizations (id, name, slug, plan, subscription_status)
      VALUES ('org_default', 'Default Organization', 'default', 'free', 'active')
    `;
    ok('Seeded "org_default" organization');

  } catch (err) {
    console.error(err);
    fail(`Failed to seed data: ${err.message}`);
  } finally {
    await sql.end();
  }

  banner('✅  RESET COMPLETE  ✅');
  console.log('You can now log in. The "org_default" is ready.');
  console.log('If you need to deploy, your database is now in sync with your schema.');
}

main();
