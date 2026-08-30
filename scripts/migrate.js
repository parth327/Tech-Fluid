// scripts/migrate.js
// Runs every .sql file in /migrations, in filename order, against
// DATABASE_URL. Safe to re-run — each migration uses IF NOT EXISTS.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration(s) in /migrations`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`  -> applying ${file} ... `);
    await pool.query(sql);
    console.log('done');
  }

  console.log('All migrations applied successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
