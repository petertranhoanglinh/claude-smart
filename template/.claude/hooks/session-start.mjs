// SessionStart: re-inject working memory (PROGRESS, active plan, git state) so a fresh or /clear-ed
// session picks up exactly where the last one stopped.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { readInput, projectDir, loadConfig, git, safe } from './lib.mjs';

function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function head(text, n) {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.length <= n ? lines.join('\n') : `${lines.slice(0, n).join('\n')}\n…(truncated)`;
}

function activePlan(dir) {
  const plansDir = path.join(dir, 'docs', 'ai', 'plans');
  if (!existsSync(plansDir)) return null;
  const plans = readdirSync(plansDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => ({ f, t: statSync(path.join(plansDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of plans) {
    const text = read(path.join(plansDir, f));
    const open = text.split(/\r?\n/).filter((l) => /^\s*- \[ \]/.test(l));
    if (open.length) {
      const title = (text.match(/^#\s+(.*)$/m) || [, f])[1];
      return { file: `docs/ai/plans/${f}`, title, open };
    }
  }
  return null;
}

/** docs/ai/specs/*.md with `Status: approved` whose `Plan:` line has no plan path yet. */
function unplannedSpecs(dir) {
  const specsDir = path.join(dir, 'docs', 'ai', 'specs');
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .filter((f) => {
      const text = read(path.join(specsDir, f));
      return /^- Status:\s*approved\b/im.test(text) && !/^- Plan:.*docs\/ai\/plans\/\S+\.md/im.test(text);
    })
    .map((f) => `docs/ai/specs/${f}`);
}

safe(() => {
  const input = readInput();
  const dir = projectDir(input);
  const cfg = loadConfig(dir);
  const parts = ['# claude-smart: session context (auto-loaded)'];

  const progress = read(path.join(dir, 'docs', 'ai', 'PROGRESS.md'));
  if (progress) parts.push(`## docs/ai/PROGRESS.md\n${head(progress, 60)}`);

  const plan = activePlan(dir);
  if (plan) {
    parts.push(
      `## Active plan: ${plan.title} (${plan.file})\nRemaining steps:\n${plan.open.slice(0, 15).join('\n')}` +
        (plan.open.length > 15 ? `\n…and ${plan.open.length - 15} more` : ''),
    );
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
  if (branch !== null) {
    const status = git(['status', '--short'], dir) || '';
    const log = git(['log', '--oneline', '-5'], dir) || '';
    parts.push(
      `## Git\nBranch: ${branch.trim()}\n` +
        (status.trim() ? `Uncommitted:\n${head(status, 20)}\n` : 'Working tree clean.\n') +
        (log.trim() ? `Recent commits:\n${log.trim()}` : ''),
    );
  }

  const arch = read(path.join(dir, 'docs', 'ai', 'architecture.md'));
  const notes = [];
  if (!arch || arch.includes('_One paragraph: what the system does')) notes.push('Project map is empty: suggest the user runs `/bootstrap` first.');
  for (const spec of unplannedSpecs(dir)) {
    notes.push(`Spec approved but not planned yet: ${spec} — next step is \`/plan-task ${spec}\`.`);
  }
  if (existsSync(path.join(dir, '_bmad')) || existsSync(path.join(dir, '.bmad-core'))) {
    notes.push(
      'BMAD is installed: use it for planning only (PRD, architecture, stories in _bmad-output/ or docs/). ' +
        'Implement a story with `/plan-task <story file>` → `/implement`, not with BMAD\'s dev agent.',
    );
  }
  if (!cfg.testCmd) notes.push('No testCmd in .claude/smart.config.json: tests are not enforced until it is set (`/bootstrap` sets it).');
  if (cfg.language) {
    notes.push(
      `LANGUAGE: write everything the user reads in ${cfg.language} — chat replies, questions, plans (docs/ai/plans, headings included), PROGRESS.md, ADRs, review reports, docs/ai/*.md. Keep code, identifiers, file paths, commands, "- [ ]" checkboxes and commit messages as they are.`,
    );
  }
  notes.push('Follow docs/ai/WORKFLOW.md: Explore → Plan → Clear → Implement one step at a time.');
  parts.push(`## Notes\n- ${notes.join('\n- ')}`);

  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') } }),
  );
});
