/**
 * Start API + web together without an extra concurrently dependency.
 * Usage: node scripts/dev.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

function run(name, args, color) {
  const child = spawn(pnpmCmd, args, {
    cwd: root,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWin,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const prefix = (line) => `${color}[${name}]\x1b[0m ${line}`;

  for (const stream of [child.stdout, child.stderr]) {
    stream?.on('data', (buf) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => console.log(prefix(line)));
    });
  }

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

console.log('\n🎮 Versus — démarrage API (3001) + Web (5173)\n');

const api = run('api', ['--filter', 'versus-backend', 'dev'], '\x1b[36m');
const web = run('web', ['--filter', '@workspace/versus', 'dev'], '\x1b[35m');

function shutdown() {
  api.kill();
  web.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
