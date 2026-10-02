// Stop: when there are uncommitted code changes, tests must pass (and PROGRESS.md must be updated)
// before Claude may end its turn. Retries are capped per session so it can never loop forever.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { readInput, projectDir, loadConfig, run, git, tail, block, safe } from './lib.mjs';

// Planning/doc-only and agent-tooling changes (specs, plans, BMAD artifacts, Markdown, MCP/Serena/skills config)
// never require a test run or a PROGRESS update.
const DOC_ONLY =
  /^(docs\/|\.claude\/|\.agents\/|\.serena\/|_bmad(-output)?\/|\.bmad-core\/)|\.(md|mdx)$|^(\.mcp\.json|skills-lock\.json|\.gitignore)$/i;

function changedFiles(dir) {
  const out = git(['status', '--porcelain', '--untracked-files=all'], dir);
  if (out === null) return null; // not a git repo
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
}

function bumpAttempts(dir, sessionId) {
  const file = path.join(dir, '.claude', 'cache', 'stop-attempts.json');
  let state = {};
  try {
    state = JSON.parse(readFileSync(file, 'utf8'));
  } catch {}
  const key = sessionId || 'default';
  state = { [key]: (state[key] || 0) + 1 }; // keep only the current session
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state));
  } catch {}
  return state[key];
}

function resetAttempts(dir) {
  try {
    writeFileSync(path.join(dir, '.claude', 'cache', 'stop-attempts.json'), '{}');
  } catch {}
}

safe(() => {
  const input = readInput();
  const dir = projectDir(input);
  const cfg = loadConfig(dir);
  if (!cfg.strict || !cfg.verifyOnStop) return;

  const changed = changedFiles(dir);
  const codeChanged = changed === null ? true : changed.some((f) => !DOC_ONLY.test(f));
  if (!codeChanged) return resetAttempts(dir);

  if (bumpAttempts(dir, input.session_id) > cfg.maxStopRetries) {
    resetAttempts(dir);
    process.stderr.write('claude-smart: stop-verify retry limit reached; letting the turn end.\n');
    return;
  }

  const problems = [];
  if (cfg.testCmd) {
    const res = run(cfg.testCmd, dir, cfg.testTimeoutSec);
    if (res.code !== 0) {
      problems.push(`Tests fail (\`${cfg.testCmd}\` exited ${res.code}${res.timedOut ? ', timed out' : ''}). Fix the code, not the tests:\n\n${tail(res.out)}`);
    }
  }
  if (cfg.requireProgressUpdate && changed && !changed.some((f) => /^docs\/ai\/PROGRESS\.md$/i.test(f))) {
    problems.push('Code changed but docs/ai/PROGRESS.md was not updated. Record what was done and what is next.');
  }
  if (problems.length === 0) return resetAttempts(dir);

  block(
    `claude-smart: not done yet.\n\n${problems.join('\n\n')}\n\n` +
      'If you are blocked and cannot fix this, update PROGRESS.md with the blocker and tell the user clearly.',
  );
});
