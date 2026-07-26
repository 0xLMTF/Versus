/**
 * Enforce pnpm without relying on Unix `sh` (Windows-friendly).
 */
import { exit } from 'node:process';

const ua = process.env.npm_config_user_agent || '';
if (!ua.includes('pnpm')) {
  console.error('\n✖ Versus uses pnpm workspaces. Install then re-run:\n');
  console.error('  corepack enable');
  console.error('  corepack prepare pnpm@9.15.0 --activate');
  console.error('  pnpm install\n');
  exit(1);
}
