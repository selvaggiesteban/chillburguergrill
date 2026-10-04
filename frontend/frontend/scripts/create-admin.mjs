#!/usr/bin/env node
/**
 * Crea o actualiza un administrador en la base D1.
 *
 * Uso:
 *   node scripts/create-admin.mjs --local  admin@chill.com "password"
 *   node scripts/create-admin.mjs --remote admin@chill.com "password"
 *
 * El hash es SHA-256 (mismo esquema que auth.ts). La contraseña nunca
 * se escribe en el repo: solo vive en el comando que ejecutás.
 */
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const wranglerBin = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js');

const args = process.argv.slice(2);
const flag = args.find((a) => a.startsWith('--'));
const [email, password] = args.filter((a) => !a.startsWith('--'));

if (!email || !password || (flag !== '--local' && flag !== '--remote')) {
  console.error('Uso: node scripts/create-admin.mjs --local|--remote <email> <password>');
  process.exit(1);
}

const salt = randomBytes(8).toString('hex');
const hash = createHash('sha256').update(`${salt}.${password}`).digest('hex');
const stored = `${salt}:${hash}`;
const esc = (s) => s.replace(/'/g, "''");

const sql = `INSERT INTO admins (email, password_hash) VALUES ('${esc(email)}', '${stored}') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash;`;

const result = spawnSync(
  process.execPath,
  [wranglerBin, 'd1', 'execute', 'chill-menu', flag, '--command', sql],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
