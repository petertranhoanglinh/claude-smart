// Update .claude/smart.config.json from the command line (the file itself is edit-protected).
// Usage: node .claude/hooks/configure.mjs testCmd="npm test" lintCmd="npx eslint {file}" strict=true
// settings.json marks this command as "ask", so the user approves every change.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG } from './lib.mjs';

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const file = path.join(dir, '.claude', 'smart.config.json');
const cfg = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { ...DEFAULT_CONFIG };

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(JSON.stringify(cfg, null, 2));
  process.exit(0);
}
for (const arg of args) {
  const i = arg.indexOf('=');
  if (i < 1) {
    console.error(`Bad argument "${arg}", expected key=value`);
    process.exit(1);
  }
  const key = arg.slice(0, i);
  const raw = arg.slice(i + 1);
  if (!(key in DEFAULT_CONFIG)) {
    console.error(`Unknown key "${key}". Known: ${Object.keys(DEFAULT_CONFIG).join(', ')}`);
    process.exit(1);
  }
  if (key === 'envAccess' && !['block', 'keys', 'full'].includes(raw)) {
    console.error('envAccess must be one of: block, keys, full');
    process.exit(1);
  }
  const type = typeof DEFAULT_CONFIG[key];
  cfg[key] = Array.isArray(DEFAULT_CONFIG[key])
    ? JSON.parse(raw)
    : type === 'boolean'
      ? raw === 'true'
      : type === 'number'
        ? Number(raw)
        : raw;
}
writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
console.log(`Updated ${path.relative(dir, file)}:\n${JSON.stringify(cfg, null, 2)}`);
