#!/usr/bin/env node
/**
 * Railway start command. Applies pending schema changes before the server
 * accepts traffic, then hands off to Next.
 */
const { execSync, spawn } = require('child_process');

function fail(lines) {
  console.error('\n' + '='.repeat(64));
  for (const line of lines) console.error(line);
  console.error('='.repeat(64) + '\n');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fail([
    'FAST FORWARD cannot start: DATABASE_URL is not set.',
    '',
    'On Railway:',
    '  1. Add a PostgreSQL database to this project',
    '     (New -> Database -> Add PostgreSQL)',
    '  2. On THIS service, open Variables and add:',
    '',
    '       DATABASE_URL = ${{Postgres.DATABASE_URL}}',
    '',
    '     Type it exactly, including the ${{ }} - that is Railway',
    '     reference syntax, not a placeholder to fill in.',
    '  3. Redeploy.',
  ]);
}

/**
 * Railway can start this service before Postgres finishes booting, which makes
 * an otherwise-fine first deploy fail. Retry briefly before giving up.
 */
const MAX_ATTEMPTS = 5;
let synced = false;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    console.log(`[start] syncing database schema (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    synced = true;
    break;
  } catch {
    if (attempt === MAX_ATTEMPTS) break;
    const waitSeconds = attempt * 3;
    console.log(`[start] database not ready yet — retrying in ${waitSeconds}s`);
    execSync(`sleep ${waitSeconds}`);
  }
}

if (!synced) {
  fail([
    'FAST FORWARD could not reach the database after several attempts.',
    '',
    'Check that:',
    '  - The PostgreSQL service in this project is running',
    '  - DATABASE_URL points at it, ideally as ${{Postgres.DATABASE_URL}}',
    '    rather than a URL copied by hand',
    '',
    'The Prisma error above has the specific reason.',
  ]);
}

console.log('[start] schema is up to date — starting server');

const port = process.env.PORT || '3000';
const child = spawn('npx', ['next', 'start', '-p', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
