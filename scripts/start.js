#!/usr/bin/env node
/**
 * Railway start command. Applies pending schema changes before the server
 * accepts traffic, then hands off to Next.
 */
const { execSync, spawn } = require('child_process');

try {
  console.log('[start] syncing database schema...');
  execSync('npx prisma db push --skip-generate --accept-data-loss=false', { stdio: 'inherit' });
} catch (error) {
  console.error('[start] schema sync failed:', error.message);
  process.exit(1);
}

const port = process.env.PORT || '3000';
const child = spawn('npx', ['next', 'start', '-p', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
