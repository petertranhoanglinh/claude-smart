import { mkdtempSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HOOKS = path.join(ROOT, 'template', '.claude', 'hooks');

export function tempDir(prefix = 'cs-') {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export function write(dir, rel, content) {
  const file = path.join(dir, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return file;
}

export function sh(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8' });
}

/** A git repo with the claude-smart hooks copied in and the given config. */
export function project(config = {}) {
  const dir = tempDir();
  cpSync(HOOKS, path.join(dir, '.claude', 'hooks'), { recursive: true });
  write(dir, '.claude/smart.config.json', { strict: true, ...config });
  write(dir, '.gitignore', '.claude/cache/\n');
  sh('git', ['init', '-q'], dir);
  sh('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.'], dir);
  sh('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], dir);
  return dir;
}

export function runHook(name, dir, input) {
  const res = spawnSync(process.execPath, [path.join(dir, '.claude', 'hooks', name)], {
    input: JSON.stringify({ cwd: dir, session_id: 'test', ...input }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

export const PASS = `node -e "process.exit(0)"`;
export const FAIL = `node -e "console.log('expected 3 got 4'); process.exit(1)"`;
