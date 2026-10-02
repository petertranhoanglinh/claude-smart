import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir, write } from './helpers.mjs';
import { installProject, installGlobal, installMcp, mergeSettings, detectCommands, detectFrontends, detectBmad } from '../install.mjs';

const read = (dir, rel) => readFileSync(path.join(dir, rel), 'utf8');

test('fresh install creates the full layout and detects npm commands', () => {
  const dir = tempDir();
  write(dir, 'package.json', { scripts: { test: 'node --test' }, devDependencies: { eslint: '9', prettier: '3' } });
  const { warnings } = installProject(dir);
  assert.deepEqual(warnings, []);
  for (const f of [
    'CLAUDE.md',
    'docs/ai/WORKFLOW.md',
    'docs/ai/PROGRESS.md',
    'docs/ai/plans/_TEMPLATE.md',
    '.claude/settings.json',
    '.claude/hooks/stop-verify.mjs',
    '.claude/agents/explorer.md',
    '.claude/skills/implement/SKILL.md',
    '.claude/skills/spec/SKILL.md',
    'docs/ai/specs/_TEMPLATE.md',
    '.claude/rules/_example.md',
    '.claude/smart.manifest.json',
  ]) assert.ok(existsSync(path.join(dir, f)), f);
  const cfg = JSON.parse(read(dir, '.claude/smart.config.json'));
  assert.equal(cfg.testCmd, 'npm test');
  assert.match(cfg.lintCmd, /eslint/);
  assert.match(cfg.formatCmd, /prettier/);
  assert.match(read(dir, '.gitignore'), /\.claude\/cache\//);
});

test('reinstall is idempotent', () => {
  const dir = tempDir();
  installProject(dir);
  const before = read(dir, '.claude/settings.json') + read(dir, '.gitignore') + read(dir, 'CLAUDE.md');
  const { actions } = installProject(dir);
  assert.equal(read(dir, '.claude/settings.json') + read(dir, '.gitignore') + read(dir, 'CLAUDE.md'), before);
  assert.ok(actions.every((a) => /^(ok|keep|manifest)\s/.test(a)), actions.join('\n'));
});

test('existing CLAUDE.md, settings.json and user docs are preserved', () => {
  const dir = tempDir();
  write(dir, 'CLAUDE.md', '# My project\nUse tabs.\n');
  write(dir, '.claude/settings.json', { permissions: { allow: ['Bash(make*)'] }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] } });
  write(dir, 'docs/ai/PROGRESS.md', 'my progress');
  installProject(dir);

  const md = read(dir, 'CLAUDE.md');
  assert.match(md, /Use tabs\./);
  assert.match(md, /@docs\/ai\/WORKFLOW\.md/);
  const s = JSON.parse(read(dir, '.claude/settings.json'));
  assert.ok(s.permissions.allow.includes('Bash(make*)'));
  assert.ok(s.permissions.allow.includes('Bash(git status*)'));
  assert.equal(s.hooks.Stop.length, 2);
  assert.ok(s.hooks.PreToolUse.length >= 2);
  assert.ok(existsSync(path.join(dir, '.claude/settings.json.bak')));
  assert.equal(read(dir, 'docs/ai/PROGRESS.md'), 'my progress');
});

test('locally modified managed files are skipped unless --force', () => {
  const dir = tempDir();
  installProject(dir);
  const f = path.join(dir, '.claude/agents/explorer.md');
  writeFileSync(f, 'customised');
  const { warnings } = installProject(dir);
  assert.equal(readFileSync(f, 'utf8'), 'customised');
  assert.ok(warnings.some((w) => w.includes('explorer.md')));
  installProject(dir, { force: true });
  assert.notEqual(readFileSync(f, 'utf8'), 'customised');
});

test('dry run writes nothing', () => {
  const dir = tempDir();
  const { actions } = installProject(dir, { dryRun: true });
  assert.ok(actions.length > 10);
  assert.ok(!existsSync(path.join(dir, 'CLAUDE.md')));
});

test('mergeSettings migrates old installs: drops legacy .env denies, updates our matchers', () => {
  const tpl = JSON.parse(readFileSync(new URL('../template/.claude/settings.json', import.meta.url), 'utf8'));
  const cmd = tpl.hooks.PreToolUse[0].hooks[0].command;
  const old = {
    permissions: { deny: ['Read(./.env)', 'Read(./**/.env)', 'Bash(rm -rf /)'] },
    hooks: { PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: cmd }] }] },
  };
  const merged = mergeSettings(old, tpl);
  assert.ok(!merged.permissions.deny.includes('Read(./.env)'));
  assert.ok(merged.permissions.deny.includes('Bash(rm -rf /)'));
  const group = merged.hooks.PreToolUse.find((g) => g.hooks[0].command === cmd);
  assert.match(group.matcher, /^Read\|/);
  assert.equal(merged.hooks.PreToolUse.filter((g) => g.hooks[0].command === cmd).length, 1);
});

test('mergeSettings does not duplicate hooks', () => {
  const tpl = JSON.parse(readFileSync(new URL('../template/.claude/settings.json', import.meta.url), 'utf8'));
  const once = mergeSettings({}, tpl);
  assert.deepEqual(mergeSettings(once, tpl), once);
});

test('detectCommands for other stacks', () => {
  const py = tempDir();
  write(py, 'pyproject.toml', '[tool.ruff]\n');
  assert.equal(detectCommands(py).testCmd, 'pytest -q');
  assert.equal(detectCommands(py).lintCmd, 'ruff check {file}');
  const go = tempDir();
  write(go, 'go.mod', 'module x');
  assert.equal(detectCommands(go).testCmd, 'go test ./...');
  const npmDefault = tempDir();
  write(npmDefault, 'package.json', { scripts: { test: 'echo "Error: no test specified" && exit 1' } });
  assert.equal(detectCommands(npmDefault).testCmd, undefined);
});

test('installMcp merges servers without replacing existing ones', () => {
  const dir = tempDir();
  write(dir, '.mcp.json', { mcpServers: { playwright: { command: 'mine' } } });
  const { warnings } = installMcp(dir, ['playwright', 'context7', 'github']);
  const cfg = JSON.parse(read(dir, '.mcp.json'));
  assert.equal(cfg.mcpServers.playwright.command, 'mine');
  assert.deepEqual(cfg.mcpServers.context7.args.slice(-1), ['@upstash/context7-mcp@latest']);
  assert.equal(cfg.mcpServers.github.type, 'http');
  assert.ok(warnings.some((w) => w.includes('GITHUB_PERSONAL_ACCESS_TOKEN')));
  assert.throws(() => installMcp(dir, ['nope']), /Unknown MCP/);
});

test('detectCommands for a monorepo without root manifest', () => {
  const dir = tempDir();
  write(dir, 'backend/go.mod', 'module x');
  write(dir, 'frontend/package.json', { scripts: { dev: 'next dev' }, devDependencies: { eslint: '9' } });
  write(dir, 'web/package.json', { scripts: { test: 'vitest run' } });
  write(dir, 'docs/package.json', { scripts: { test: 'x' } });
  const cfg = detectCommands(dir);
  assert.equal(cfg.testCmd, 'go -C backend test ./... && npm --prefix web test');
  assert.deepEqual(cfg.fileGlobs, ['backend/**/*.go', 'frontend/**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte}', 'web/**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte}']);
  assert.equal(cfg.lintCmd, undefined);
});

test('--lang sets language on fresh and existing installs', () => {
  const dir = tempDir();
  installProject(dir, { lang: 'vi' });
  assert.equal(JSON.parse(read(dir, '.claude/smart.config.json')).language, 'Vietnamese');
  installProject(dir, { lang: 'English' });
  assert.equal(JSON.parse(read(dir, '.claude/smart.config.json')).language, 'English');
  installProject(dir);
  assert.equal(JSON.parse(read(dir, '.claude/smart.config.json')).language, 'English', 'kept without --lang');
});

test('detectFrontends finds UI packages and whether Playwright is set up', () => {
  const dir = tempDir();
  write(dir, 'backend/go.mod', 'module x');
  write(dir, 'frontend/package.json', { dependencies: { next: '16', react: '19' } });
  write(dir, 'admin/package.json', { dependencies: { vue: '3' }, devDependencies: { '@playwright/test': '1' } });
  write(dir, 'tools/package.json', { dependencies: { lodash: '4' } });
  assert.deepEqual(
    detectFrontends(dir).sort((a, b) => a.dir.localeCompare(b.dir)),
    [
      { dir: 'admin', playwright: true },
      { dir: 'frontend', playwright: false },
    ],
  );
  assert.deepEqual(installProject(dir, { dryRun: true }).frontends.length, 2);
});

test('detectBmad recognises v6 and v4 layouts', () => {
  const v6 = tempDir();
  write(v6, '_bmad/core/config.yaml', 'x: 1');
  const v4 = tempDir();
  write(v4, '.bmad-core/core-config.yaml', 'x: 1');
  assert.ok(detectBmad(v6));
  assert.ok(detectBmad(v4));
  assert.ok(!detectBmad(tempDir()));
  assert.equal(installProject(v6, { dryRun: true }).bmad, true);
});

test('global install writes agents and a managed block in ~/.claude/CLAUDE.md', () => {
  const home = tempDir();
  write(home, '.claude/CLAUDE.md', '# mine\n');
  installGlobal({ home });
  const md = read(home, '.claude/CLAUDE.md');
  assert.match(md, /# mine/);
  assert.match(md, /claude-smart:start/);
  assert.ok(existsSync(path.join(home, '.claude/agents/explorer.md')));
  installGlobal({ home });
  assert.equal(read(home, '.claude/CLAUDE.md').match(/claude-smart:start/g).length, 1);
});
