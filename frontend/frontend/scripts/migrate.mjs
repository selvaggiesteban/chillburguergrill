#!/usr/bin/env node
/**
 * Migration script for applying SQL files from migrations/ to Cloudflare D1.
 *
 * Usage:
 *   node scripts/migrate.mjs --local
 *   node scripts/migrate.mjs --remote
 *
 * This script reads all .sql files in the migrations/ folder, sorts them,
 * and applies them in order to the D1 database.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const wranglerBin = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const args = process.argv.slice(2);
const flag = args.find((a) => a === '--local' || a === '--remote');

if (!flag) {
  console.error('Usage: node scripts/migrate.mjs --local|--remote');
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found in migrations/');
  process.exit(0);
}

console.log(`Found ${files.length} migrations. Applying to ${flag === '--remote' ? 'production' : 'local'} environment...`);

for (const file of files) {
  const filePath = join(migrationsDir, file);
  console.log(`Applying ${file}...`);

  const result = spawnSync(
    process.execPath,
    [wranglerBin, 'd1', 'execute', 'chill-menu', flag, '--file', filePath],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    console.error(`Migration ${file} failed. Stopping.`);
    process.exit(result.status ?? 1);
  }
}

console.log('All migrations applied successfully.');
