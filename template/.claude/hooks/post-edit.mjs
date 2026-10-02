// PostToolUse(Edit|Write|MultiEdit): format the edited file, then lint it. Lint errors go back to Claude.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readInput, projectDir, loadConfig, run, tail, block, safe, relPath, globToRegExp } from './lib.mjs';

function withFile(cmd, file) {
  const quoted = `"${file}"`;
  return cmd.includes('{file}') ? cmd.replaceAll('{file}', quoted) : `${cmd} ${quoted}`;
}

safe(() => {
  const input = readInput();
  const file = input.tool_input?.file_path;
  if (!file) return;
  const dir = projectDir(input);
  const abs = path.resolve(dir, file);
  if (!existsSync(abs) || path.relative(dir, abs).startsWith('..')) return;

  const cfg = loadConfig(dir);
  const rel = relPath(dir, abs);
  if (cfg.fileGlobs.length && !cfg.fileGlobs.some((g) => globToRegExp(g).test(rel))) return; // not a code file
  if (cfg.formatCmd) run(withFile(cfg.formatCmd, abs), dir, 60); // formatter failures are not Claude's problem
  if (!cfg.lintCmd) return;

  const res = run(withFile(cfg.lintCmd, abs), dir, 120);
  if (res.code !== 0 && cfg.strict) {
    block(`claude-smart: lint failed for ${path.relative(dir, abs)} — fix these before moving on:\n\n${tail(res.out, 40)}`);
  }
});
