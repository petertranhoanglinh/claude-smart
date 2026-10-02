// Shared helpers for claude-smart hooks. No dependencies; Node >= 18.
// Contract: a hook must never block because of its own bug. Internal errors -> exit 0.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const DEFAULT_CONFIG = {
  strict: true,
  testCmd: '',
  lintCmd: '',
  formatCmd: '',
  testTimeoutSec: 600,
  testBeforeCommit: true,
  verifyOnStop: true,
  maxStopRetries: 3,
  requireProgressUpdate: true,
  fileGlobs: [],
  language: '',
  protectedPaths: [],
};

export function readInput() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function projectDir(input = {}) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

export function loadConfig(dir) {
  const file = path.join(dir, '.claude', 'smart.config.json');
  if (!existsSync(file)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function run(cmd, cwd, timeoutSec = 600) {
  const res = spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutSec * 1000,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI || '1', FORCE_COLOR: '0' },
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (res.error) return { code: 1, out: `${out}\n${res.error.message}`, timedOut: res.error.code === 'ETIMEDOUT' };
  return { code: res.status ?? 1, out };
}

export function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.error || res.status !== 0) return null;
  return res.stdout;
}

export function tail(text, lines = 60) {
  const all = String(text).trimEnd().split(/\r?\n/);
  return all.length <= lines ? all.join('\n') : `…(${all.length - lines} lines omitted)\n${all.slice(-lines).join('\n')}`;
}

/** Path relative to the project, with forward slashes. */
export function relPath(dir, file) {
  const abs = path.resolve(dir, file);
  return path.relative(dir, abs).split(path.sep).join('/');
}

/** Minimal glob: `**` any depth, `*` within a segment, `?` one char, `{a,b}` alternatives. Matches whole relative path. */
export function globToRegExp(glob) {
  let re = '';
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') (re += '(?:'), depth++;
    else if (c === '}' && depth) (re += ')'), depth--;
    else if (c === ',' && depth) re += '|';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

export function block(message) {
  process.stderr.write(`${message.trim()}\n`);
  process.exit(2);
}

/** Run a hook body; any thrown error is reported but never blocks. */
export async function safe(main) {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`[claude-smart hook error, ignored] ${err?.stack || err}\n`);
    process.exit(0);
  }
}
