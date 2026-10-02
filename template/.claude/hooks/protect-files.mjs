// PreToolUse(Edit|Write|MultiEdit|NotebookEdit): refuse edits to secrets, lockfiles, .git and configured paths.
import { readInput, projectDir, loadConfig, relPath, globToRegExp, block, safe } from './lib.mjs';

const ALWAYS = [
  { re: /(^|\/)\.env(\.[^/]*)?$/i, why: 'secrets file', allow: /\.(example|sample|template|dist)$/i },
  { re: /(^|\/)\.git\//, why: 'git internals' },
  {
    re: /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|composer\.lock|Gemfile\.lock|go\.sum|packages\.lock\.json)$/i,
    why: 'lockfile (regenerate it with the package manager instead)',
  },
  { re: /\.(pem|key|p12|pfx|jks|keystore)$/i, why: 'key/certificate material' },
];

function check(rel, cfg) {
  for (const rule of ALWAYS) {
    if (rule.re.test(rel) && !(rule.allow && rule.allow.test(rel))) return rule.why;
  }
  for (const glob of cfg.protectedPaths || []) {
    if (globToRegExp(glob).test(rel)) return `protected by .claude/smart.config.json ("${glob}")`;
  }
  return null;
}

safe(() => {
  const input = readInput();
  const file = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (!file) return;
  const dir = projectDir(input);
  const rel = relPath(dir, file);
  if (rel.startsWith('../') || /^[a-z]:/i.test(rel)) return; // outside the project: not our business
  const why = check(rel, loadConfig(dir));
  if (why) {
    block(
      `claude-smart: editing "${rel}" is blocked (${why}). ` +
        'Do not try to work around this. If the change is truly needed, tell the user exactly what to change and let them do it.',
    );
  }
});
