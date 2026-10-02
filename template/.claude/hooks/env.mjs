// Safe access to .env files for Claude (envAccess = "keys"): see variable NAMES, add missing variables.
//   node .claude/hooks/env.mjs list                         names in every .env file (values never printed)
//   node .claude/hooks/env.mjs set KEY [value] [--file p]   append KEY=value if KEY is missing (default file: .env)
// "set" is an "ask" permission in settings.json, so the user approves every write.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { isEnvFile } from './lib.mjs';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const SKIP = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', '.next', 'target']);

function findEnvFiles(dir, depth = 0, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (depth < 3 && !SKIP.has(name)) findEnvFiles(abs, depth + 1, out);
    } else if (/^\.env/i.test(name)) out.push(path.relative(root, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

function parseKeys(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map(([, key, value]) => ({ key, empty: value.trim() === '' || /^(""|'')$/.test(value.trim()) }));
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'list' || !cmd) {
  const files = findEnvFiles(root);
  if (!files.length) console.log('No .env files found.');
  for (const f of files) {
    const keys = parseKeys(readFileSync(path.join(root, f), 'utf8'));
    const tag = isEnvFile(f) ? 'secret file — values hidden' : 'example — safe to read directly';
    console.log(`\n${f}  (${tag})`);
    for (const { key, empty } of keys) console.log(`  ${key}${empty ? '   (empty)' : '   (set)'}`);
  }
  process.exit(0);
}

if (cmd === 'set') {
  const fileIdx = rest.indexOf('--file');
  const file = fileIdx >= 0 ? rest.splice(fileIdx, 2)[1] : '.env';
  const [key, ...valueParts] = rest;
  const value = valueParts.join(' ');
  if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    console.error('Usage: node .claude/hooks/env.mjs set KEY [value] [--file path/.env]');
    process.exit(1);
  }
  const abs = path.resolve(root, file);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..') || !/^\.env/i.test(path.basename(abs))) {
    console.error(`Refusing: "${file}" is not a .env file inside the project.`);
    process.exit(1);
  }
  const text = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  if (parseKeys(text).some((k) => k.key === key)) {
    console.error(`${key} already exists in ${rel} — not changed. Ask the user to edit its value.`);
    process.exit(1);
  }
  const needsQuotes = /[\s#"']/.test(value);
  const line = `${key}=${needsQuotes ? JSON.stringify(value) : value}`;
  writeFileSync(abs, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`);
  console.log(`Added ${key} to ${rel}${value ? '' : ' (empty — the user must fill in the value)'}.`);
  process.exit(0);
}

console.error(`Unknown command "${cmd}". Use: list | set`);
process.exit(1);
