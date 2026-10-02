// PreToolUse(Read|Edit|Write|MultiEdit|NotebookEdit): protect secrets, lockfiles, .git and configured paths.
// .env handling follows `envAccess` in smart.config.json: block | keys (default) | full.
import { readInput, projectDir, loadConfig, relPath, globToRegExp, isEnvFile, ENV_HELP, block, safe } from './lib.mjs';

const KEY_MATERIAL = /\.(pem|key|p12|pfx|jks|keystore)$/i;
const EDIT_ONLY = [
  { re: /(^|\/)\.git\//, why: 'git internals' },
  {
    re: /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|composer\.lock|Gemfile\.lock|go\.sum|packages\.lock\.json)$/i,
    why: 'lockfile (regenerate it with the package manager instead)',
  },
];

function check(rel, cfg, reading) {
  if (isEnvFile(rel) && cfg.envAccess !== 'full') {
    return { why: 'secrets file', help: cfg.envAccess === 'block' ? '' : ENV_HELP };
  }
  if (KEY_MATERIAL.test(rel)) return { why: 'key/certificate material' };
  if (reading) return null;
  for (const rule of EDIT_ONLY) if (rule.re.test(rel)) return { why: rule.why };
  for (const glob of cfg.protectedPaths || []) {
    if (globToRegExp(glob).test(rel)) return { why: `protected by .claude/smart.config.json ("${glob}")` };
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
  const reading = input.tool_name === 'Read';
  const hit = check(rel, loadConfig(dir), reading);
  if (hit) {
    block(
      `claude-smart: ${reading ? 'reading' : 'editing'} "${rel}" is blocked (${hit.why}). ` +
        (hit.help ? `${hit.help} ` : '') +
        'Do not try to work around this. If the change is truly needed, tell the user exactly what to change and let them do it.',
    );
  }
});
