#!/usr/bin/env node
// claude-smart installer.
//   node install.mjs <target-dir> [--dry-run] [--force]   install/update into a project
//   node install.mjs --global [--dry-run] [--force]       install agents + personal CLAUDE.md into ~/.claude
//   node install.mjs <target-dir> --mcp=playwright,context7  also add MCP servers from mcp/catalog.json
//   node install.mjs <target-dir> --lang=vi                write plans/PROGRESS/replies in Vietnamese
//   node install.mjs --doctor                              check which power tools are installed
//
// Safe by design: user-owned files are never overwritten; managed files are updated only if the user
// has not modified them since the last install (tracked by hash in .claude/smart.manifest.json).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(ROOT, 'template');
const VERSION = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

// Files the project owns after first install: created once, never touched again.
const USER_OWNED = new Set([
  'docs/ai/PROGRESS.md',
  'docs/ai/architecture.md',
  'docs/ai/conventions.md',
  '.claude/rules/_example.md',
]);
const WORKFLOW_IMPORT = '@docs/ai/WORKFLOW.md';
const GITIGNORE_LINES = ['.claude/cache/', '.claude/settings.local.json', '.claude/**/*.bak'];
const BLOCK_START = '<!-- claude-smart:start -->';
const BLOCK_END = '<!-- claude-smart:end -->';

// ---------- small utils ----------
const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs, base));
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

function createPlan(dryRun, base) {
  const show = (file) => (base ? path.relative(base, file).split(path.sep).join('/') : file);
  const actions = [];
  return {
    actions,
    write(file, content, label) {
      actions.push(`${label.padEnd(9)} ${show(file)}`);
      if (dryRun) return;
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    },
    note(label, file) {
      actions.push(`${label.padEnd(9)} ${file}`);
    },
  };
}

// ---------- merging ----------
// Entries older claude-smart versions added that are now handled by hooks (envAccess) — removed on update.
const LEGACY_DENY = ['Read(./.env)', 'Read(./.env.*)', 'Read(./**/.env)'];

export function mergeSettings(existing, incoming) {
  const out = structuredClone(existing);
  out.permissions ??= {};
  for (const kind of ['allow', 'ask', 'deny']) {
    let merged = [...(out.permissions[kind] || []), ...(incoming.permissions?.[kind] || [])];
    if (kind === 'deny') merged = merged.filter((e) => !LEGACY_DENY.includes(e));
    if (merged.length) out.permissions[kind] = [...new Set(merged)];
    else delete out.permissions[kind];
  }
  out.hooks ??= {};
  for (const [event, groups] of Object.entries(incoming.hooks || {})) {
    out.hooks[event] ??= [];
    for (const group of groups) {
      const mine = group.hooks.map((h) => h.command);
      const current = out.hooks[event].find((g) => (g.hooks || []).some((h) => mine.includes(h.command)));
      if (!current) out.hooks[event].push(group);
      else if (group.matcher !== undefined && current.matcher !== group.matcher) current.matcher = group.matcher; // our hook, newer matcher
    }
  }
  if (!out.$schema && incoming.$schema) out.$schema = incoming.$schema;
  return out;
}

export function upsertBlock(text, block) {
  const wrapped = `${BLOCK_START}\n${block.trim()}\n${BLOCK_END}`;
  const re = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
  if (re.test(text)) return text.replace(re, wrapped);
  return `${text.trimEnd()}${text.trim() ? '\n\n' : ''}${wrapped}\n`;
}

// ---------- stack detection ----------
/**
 * Detect one project. `sub` is '' for the repo root, or a subdirectory name for monorepo parts;
 * test commands for subdirectories are written cwd-independently (no `cd`), so they can be chained.
 */
function detectStack(root, sub = '') {
  const dir = path.join(root, sub);
  const has = (f) => existsSync(path.join(dir, f));
  const glob = (g) => (sub ? `${sub}/${g}` : g);
  const cfg = {};
  if (has('package.json')) {
    const pkg = readJson(path.join(dir, 'package.json'), {});
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm';
    const test = pkg.scripts?.test;
    if (test && !/no test specified/.test(test)) {
      const inDir = { npm: `npm --prefix ${sub} test`, pnpm: `pnpm --dir ${sub} test`, yarn: `yarn --cwd ${sub} test`, bun: `bun --cwd ${sub} test` };
      cfg.testCmd = sub ? inDir[pm] : pm === 'npm' ? 'npm test' : `${pm} test`;
    }
    if (deps.prettier) cfg.formatCmd = 'npx prettier --write --log-level warn {file}';
    if (deps.eslint) cfg.lintCmd = 'npx eslint --no-warn-ignored {file}';
    if (deps['@biomejs/biome']) {
      cfg.formatCmd ??= 'npx biome format --write {file}';
      cfg.lintCmd ??= 'npx biome lint {file}';
    }
    cfg.fileGlobs = [glob('**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte}')];
  } else if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) {
    const py = has('pyproject.toml') ? readFileSync(path.join(dir, 'pyproject.toml'), 'utf8') : '';
    if (has('uv.lock')) cfg.testCmd = sub ? `uv run --directory ${sub} pytest -q` : 'uv run pytest -q';
    else if (has('poetry.lock')) cfg.testCmd = sub ? `poetry -C ${sub} run pytest -q` : 'poetry run pytest -q';
    else cfg.testCmd = sub ? `pytest -q ${sub}` : 'pytest -q';
    if (/ruff/.test(py)) {
      cfg.formatCmd = 'ruff format {file}';
      cfg.lintCmd = 'ruff check {file}';
    } else if (/black/.test(py)) cfg.formatCmd = 'black -q {file}';
    cfg.fileGlobs = [glob('**/*.py')];
  } else if (has('go.mod')) {
    Object.assign(cfg, { testCmd: sub ? `go -C ${sub} test ./...` : 'go test ./...', formatCmd: 'gofmt -w {file}', fileGlobs: [glob('**/*.go')] });
  } else if (has('Cargo.toml')) {
    const testCmd = sub ? `cargo test --quiet --manifest-path ${sub}/Cargo.toml` : 'cargo test --quiet';
    Object.assign(cfg, { testCmd, formatCmd: 'rustfmt {file}', fileGlobs: [glob('**/*.rs')] });
  } else if (has('pom.xml')) {
    Object.assign(cfg, { testCmd: sub ? `mvn -q -f ${sub}/pom.xml test` : 'mvn -q test', fileGlobs: [glob('**/*.java'), glob('**/*.kt')] });
  } else if (has('build.gradle') || has('build.gradle.kts')) {
    const win = process.platform === 'win32';
    const wrapper = sub ? (win ? `${sub}\\gradlew.bat` : `./${sub}/gradlew`) : win ? 'gradlew.bat' : './gradlew';
    const testCmd = `${has('gradlew') ? wrapper : 'gradle'}${sub ? ` -p ${sub}` : ''} test -q`;
    Object.assign(cfg, { testCmd, fileGlobs: [glob('**/*.java'), glob('**/*.kt')] });
  } else if (readdirSync(dir).some((f) => /\.(sln|csproj)$/.test(f))) {
    Object.assign(cfg, { testCmd: sub ? `dotnet test ${sub} --nologo -v q` : 'dotnet test --nologo -v q', fileGlobs: [glob('**/*.cs')] });
  }
  return cfg;
}

export function detectCommands(dir) {
  const rootCfg = detectStack(dir);
  if (Object.keys(rootCfg).length) return rootCfg;

  // Monorepo without a root manifest: look one level down (backend/, frontend/, services/x is left to /bootstrap).
  const subs = readdirSync(dir).filter(
    (d) => !d.startsWith('.') && !['node_modules', 'docs', 'dist', 'build', 'vendor'].includes(d) && statSync(path.join(dir, d)).isDirectory(),
  );
  const parts = subs.map((d) => detectStack(dir, d)).filter((c) => Object.keys(c).length);
  if (!parts.length) return {};
  const cfg = { fileGlobs: parts.flatMap((c) => c.fileGlobs || []) };
  const tests = parts.map((c) => c.testCmd).filter(Boolean);
  if (tests.length) cfg.testCmd = tests.join(' && ');
  // Per-file lint/format differ per part and depend on each part's cwd/config: left for /bootstrap.
  return cfg;
}

const UI_DEPS = ['next', 'react', 'vue', 'svelte', '@sveltejs/kit', 'nuxt', '@angular/core', 'solid-js', 'astro'];

/** Web frontends at the root or one level down: [{ dir, playwright }] (dir '' = root). */
export function detectFrontends(root) {
  const dirs = [''];
  for (const d of readdirSync(root)) {
    if (!d.startsWith('.') && d !== 'node_modules' && statSync(path.join(root, d)).isDirectory()) dirs.push(d);
  }
  return dirs.flatMap((dir) => {
    const pkg = readJson(path.join(root, dir, 'package.json'), null);
    if (!pkg) return [];
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!UI_DEPS.some((d) => d in deps)) return [];
    const playwright = '@playwright/test' in deps || readdirSync(path.join(root, dir)).some((f) => /^playwright\.config\./.test(f));
    return [{ dir, playwright }];
  });
}

// ---------- project install ----------
const LANGUAGES = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', fr: 'French', de: 'German', es: 'Spanish', th: 'Thai', id: 'Indonesian' };
/** `vi` → `Vietnamese`; anything else is kept as written; empty means "match the user". */
export function languageName(code) {
  return LANGUAGES[String(code).toLowerCase()] ?? String(code);
}

export function installProject(target, { dryRun = false, force = false, lang } = {}) {
  target = path.resolve(target);
  if (!existsSync(target)) throw new Error(`Target does not exist: ${target}`);
  const plan = createPlan(dryRun, target);
  const manifestFile = path.join(target, '.claude', 'smart.manifest.json');
  const oldManifest = readJson(manifestFile, { files: {} });
  const manifest = { version: VERSION, files: {} };
  const warnings = [];

  for (const rel of walk(TEMPLATE)) {
    const src = readFileSync(path.join(TEMPLATE, rel));
    const dest = path.join(target, rel);
    const exists = existsSync(dest);

    if (rel === 'CLAUDE.md') {
      if (!exists) plan.write(dest, src, 'create');
      else {
        const text = readFileSync(dest, 'utf8');
        if (text.includes(WORKFLOW_IMPORT)) plan.note('ok', rel);
        else plan.write(dest, upsertBlock(text, `## Workflow (claude-smart)\n${WORKFLOW_IMPORT}`), 'append');
      }
      continue;
    }
    if (rel === '.claude/settings.json') {
      if (!exists) plan.write(dest, src, 'create');
      else {
        const current = readJson(dest, null);
        if (!current) {
          warnings.push(`${rel} is not valid JSON — left untouched; merge template/${rel} by hand.`);
          continue;
        }
        const merged = mergeSettings(current, JSON.parse(src.toString()));
        if (JSON.stringify(merged) === JSON.stringify(current)) plan.note('ok', rel);
        else {
          plan.write(`${dest}.bak`, readFileSync(dest), 'backup');
          plan.write(dest, `${JSON.stringify(merged, null, 2)}\n`, 'merge');
        }
      }
      continue;
    }
    if (rel === '.claude/smart.config.json') {
      const base = JSON.parse(src.toString());
      const langOpt = lang === undefined ? {} : { language: languageName(lang) };
      if (!exists) plan.write(dest, `${JSON.stringify({ ...base, ...detectCommands(target), ...langOpt }, null, 2)}\n`, 'create');
      else {
        const current = readJson(dest, {});
        const next = { ...base, ...current, ...langOpt };
        if (JSON.stringify(next) !== JSON.stringify({ ...base, ...current }) || Object.keys(base).some((k) => !(k in current))) {
          plan.write(dest, `${JSON.stringify(next, null, 2)}\n`, 'merge');
        } else plan.note('ok', rel);
      }
      continue;
    }
    if (USER_OWNED.has(rel)) {
      if (exists) plan.note('keep', rel);
      else plan.write(dest, src, 'create');
      continue;
    }

    // Managed file: update only if unchanged since our last install.
    manifest.files[rel] = sha(src);
    if (!exists) {
      plan.write(dest, src, 'create');
      continue;
    }
    const currentHash = sha(readFileSync(dest));
    if (currentHash === sha(src)) plan.note('ok', rel);
    else if (force || currentHash === oldManifest.files[rel]) plan.write(dest, src, 'update');
    else {
      manifest.files[rel] = oldManifest.files[rel] ?? currentHash;
      warnings.push(`${rel} was modified locally — skipped (use --force to overwrite).`);
      plan.note('skip', rel);
    }
  }

  const gi = path.join(target, '.gitignore');
  const giText = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  const missingLines = GITIGNORE_LINES.filter((l) => !giText.split(/\r?\n/).includes(l));
  if (missingLines.length) {
    plan.write(gi, `${giText.trimEnd()}${giText.trim() ? '\n\n' : ''}# claude-smart\n${missingLines.join('\n')}\n`, giText ? 'append' : 'create');
  }

  plan.write(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'manifest');
  return {
    actions: plan.actions,
    warnings,
    config: readJson(path.join(target, '.claude', 'smart.config.json'), null),
    frontends: detectFrontends(target),
  };
}

// ---------- MCP servers ----------
export function loadCatalog() {
  return JSON.parse(readFileSync(path.join(ROOT, 'mcp', 'catalog.json'), 'utf8'));
}

/** Merge selected catalog servers into <target>/.mcp.json. Existing server entries are never replaced. */
export function installMcp(target, names, { dryRun = false } = {}) {
  const catalog = loadCatalog();
  const unknown = names.filter((n) => !catalog[n]);
  if (unknown.length) throw new Error(`Unknown MCP server(s): ${unknown.join(', ')}. Available: ${Object.keys(catalog).join(', ')}`);
  const plan = createPlan(dryRun, path.resolve(target));
  const file = path.join(path.resolve(target), '.mcp.json');
  const current = readJson(file, { mcpServers: {} });
  current.mcpServers ??= {};
  const added = [];
  for (const n of names) {
    if (current.mcpServers[n]) plan.note('keep', `.mcp.json → ${n}`);
    else {
      current.mcpServers[n] = catalog[n].config;
      added.push(n);
    }
  }
  if (added.length) plan.write(file, `${JSON.stringify(current, null, 2)}\n`, existsSync(file) ? 'merge' : 'create');
  const warnings = added.filter((n) => /env /.test(catalog[n].needs)).map((n) => `${n} needs: ${catalog[n].needs}`);
  return { actions: plan.actions, warnings };
}

// ---------- doctor ----------
const TOOLS = [
  ['git', ['--version'], 'required'],
  ['node', ['--version'], 'required (hooks)'],
  ['claude', ['--version'], 'Claude Code CLI'],
  ['ast-grep', ['--version'], 'structural search — npm i -g @ast-grep/cli'],
  ['npx', ['--version'], 'MCP: playwright, context7, mongodb, claude-context; repomix'],
  ['uvx', ['--version'], `optional, MCP serena/postgres — ${process.platform === 'win32' ? 'winget install --id=astral-sh.uv -e' : 'curl -LsSf https://astral.sh/uv/install.sh | sh'} (then reopen the terminal)`],
  ['gh', ['--version'], 'optional, GitHub CLI (alternative to GitHub MCP)'],
  ['docker', ['--version'], 'sandbox/ — isolated autonomous runs'],
];

export function doctor() {
  return TOOLS.map(([cmd, args, why]) => {
    const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
    const ok = !r.error && r.status === 0;
    return { cmd, ok, version: ok ? (r.stdout || r.stderr).trim().split(/\r?\n/)[0] : '', why };
  });
}

// ---------- global install ----------
export function installGlobal({ dryRun = false, force = false, home = homedir() } = {}) {
  const claudeDir = path.join(home, '.claude');
  const plan = createPlan(dryRun, home);
  const warnings = [];
  const agentsSrc = path.join(TEMPLATE, '.claude', 'agents');

  for (const name of readdirSync(agentsSrc)) {
    const src = readFileSync(path.join(agentsSrc, name));
    const dest = path.join(claudeDir, 'agents', name);
    if (!existsSync(dest)) plan.write(dest, src, 'create');
    else if (sha(readFileSync(dest)) === sha(src)) plan.note('ok', dest);
    else if (force) plan.write(dest, src, 'update');
    else {
      warnings.push(`${dest} differs — skipped (use --force to overwrite).`);
      plan.note('skip', dest);
    }
  }

  const userMd = path.join(claudeDir, 'CLAUDE.md');
  const block = readFileSync(path.join(ROOT, 'global', 'CLAUDE.md'), 'utf8');
  const text = existsSync(userMd) ? readFileSync(userMd, 'utf8') : '';
  const next = upsertBlock(text, block);
  if (next === text) plan.note('ok', userMd);
  else {
    if (text) plan.write(`${userMd}.bak`, text, 'backup');
    plan.write(userMd, next, text ? 'update' : 'create');
  }
  return { actions: plan.actions, warnings };
}

// ---------- CLI ----------
const USAGE = `Usage:
  node install.mjs <project-dir> [--lang=vi] [--mcp=a,b] [--dry-run] [--force]
  node install.mjs <project-dir> --mcp-only --mcp=playwright,context7
  node install.mjs --global [--dry-run] [--force]
  node install.mjs --doctor
  node install.mjs --list-mcp`;

function main(argv) {
  const mcpArg = argv.find((a) => a.startsWith('--mcp='));
  const mcp = mcpArg ? mcpArg.slice(6).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const flags = new Set(argv.filter((a) => a.startsWith('--')).map((a) => a.split('=')[0]));
  const positional = argv.filter((a) => !a.startsWith('--'));
  const langArg = argv.find((a) => a.startsWith('--lang='));
  const opts = { dryRun: flags.has('--dry-run'), force: flags.has('--force'), lang: langArg ? langArg.slice(7) : undefined };

  if (flags.has('--doctor')) {
    for (const t of doctor()) console.log(`  ${t.ok ? '✔' : '✘'} ${t.cmd.padEnd(9)} ${t.ok ? t.version : `missing — ${t.why}`}`);
    return 0;
  }
  if (flags.has('--list-mcp')) {
    for (const [name, s] of Object.entries(loadCatalog())) console.log(`  ${name.padEnd(15)} ${s.about}\n  ${''.padEnd(15)} needs: ${s.needs}`);
    return 0;
  }
  if (flags.has('--help') || (!flags.has('--global') && positional.length === 0)) {
    console.log(USAGE);
    return flags.has('--help') ? 0 : 1;
  }

  const results = [];
  if (flags.has('--global')) results.push(['~/.claude', installGlobal(opts)]);
  for (const dir of positional) {
    if (!flags.has('--mcp-only')) results.push([path.resolve(dir), installProject(dir, opts)]);
    if (mcp.length) results.push([`${path.resolve(dir)} (MCP)`, installMcp(dir, mcp, opts)]);
  }

  for (const [where, res] of results) {
    console.log(`\nclaude-smart v${VERSION} → ${where}${opts.dryRun ? ' (dry run, nothing written)' : ''}`);
    for (const a of res.actions) console.log(`  ${a}`);
    for (const w of res.warnings) console.log(`  ! ${w}`);
    if (res.config) {
      const { testCmd, lintCmd, formatCmd } = res.config;
      console.log(`\n  testCmd:   ${testCmd || '(not detected — /bootstrap will set it)'}`);
      console.log(`  lintCmd:   ${lintCmd || '-'}`);
      console.log(`  formatCmd: ${formatCmd || '-'}`);
    }
    for (const fe of res.frontends || []) {
      const where = fe.dir || '(root)';
      console.log(
        fe.playwright
          ? `  frontend:  ${where} — Playwright found ✔`
          : `  frontend:  ${where} — no Playwright yet → in Claude run /e2e-setup${fe.dir ? ` ${fe.dir}` : ''}, and add --mcp=playwright`,
      );
    }
  }
  if (positional.length) {
    console.log('\nNext: open Claude Code in the project and run /bootstrap.');
    console.log('Then for each task: /plan-task <task> → review → /clear → /implement (repeat) → /review-diff');
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`claude-smart: ${err.message}`);
    process.exit(1);
  }
}
