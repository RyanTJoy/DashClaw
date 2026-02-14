import { neon } from '@neondatabase/serverless';
import { generateActionEmbedding } from '../app/lib/embeddings.js';
import 'dotenv/config';

async function backfill() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  console.log('Starting embedding backfill...');
  const sql = neon(url);

  try {
    // 1. Get actions without embeddings
    const actions = await sql`
      SELECT ar.*
      FROM action_records ar
      LEFT JOIN action_embeddings ae ON ar.action_id = ae.action_id
      WHERE ae.action_id IS NULL
      LIMIT 100
    `;

    if (actions.length === 0) {
      console.log('All actions already have embeddings. Nothing to do.');
      return;
    }

    console.log(`Found ${actions.length} actions to index.`);

    for (const action of actions) {
      process.stdout.write(`Indexing ${action.action_id}... `);
      try {
        const embedding = await generateActionEmbedding(action);
        if (embedding) {
          await sql`
            INSERT INTO action_embeddings (org_id, agent_id, action_id, embedding)
            VALUES (${action.org_id}, ${action.agent_id}, ${action.action_id}, ${JSON.stringify(embedding)}::vector)
          `;
          console.log('OK');
        } else {
          console.log('Skipped (no embedding)');
        }
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    }

    console.log('\nBackfill complete!');
  } catch (err) {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  }
}

backfill();
