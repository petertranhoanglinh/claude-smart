// PreToolUse(Bash|PowerShell): block destructive commands; run the test suite before any `git commit`.
import { readInput, projectDir, loadConfig, run, tail, block, safe } from './lib.mjs';

const DANGEROUS = [
  { re: /\brm\s+(-\w*\s+)*-\w*[rR]\w*\s+(-\w+\s+)*(\/|~|\$HOME|\*|\.)(\/?\*?)?(\s|;|&|\||$)/, why: 'recursive delete of root/home/cwd' },
  { re: /\bRemove-Item\b(?=.*-Recurse)(?=.*\s(\/|\\|~|\*|\.|[A-Za-z]:\\?)(\s|;|$))/i, why: 'recursive delete of root/home/cwd' },
  { re: /\bgit\s+push\b(?=.*(\s--force(?!-with-lease)\b|\s-f\b|\s\+\S))/, why: 'force push (use --force-with-lease, and ask the user first)' },
  { re: /\bgit\s+reset\s+(\S+\s+)*--hard\b/, why: 'git reset --hard discards work' },
  { re: /\bgit\s+clean\s+(\S+\s+)*-\w*f/, why: 'git clean -f deletes untracked files' },
  { re: /\bgit\s+(checkout|restore)\s+(\S+\s+)*(--\s+)?\.(\s|$)/, why: 'discarding all working-tree changes' },
  { re: /\bgit\s+branch\s+(\S+\s+)*-D\b/, why: 'force-deleting a branch' },
  { re: /--no-verify\b/, why: '--no-verify skips the project\'s git hooks' },
  { re: /\b(curl|wget|iwr|Invoke-WebRequest)\b[^|]*\|\s*(ba|z)?sh\b|\biex\b.*\b(iwr|Invoke-WebRequest)\b/i, why: 'piping a download into a shell' },
  { re: /\b(mkfs|dd\s+if=|format\s+[a-z]:)/i, why: 'disk-level destructive command' },
  { re: /(>|\btee\b|\bcp\b|\bmv\b|Set-Content|Out-File)\s*\S*\.env(\s|$|\.(?!example|sample|template))/i, why: 'writing to a secrets file' },
];

const COMMIT = /\bgit\s+(-\S+\s+(\S+\s+)?)*commit\b/;

safe(() => {
  const input = readInput();
  const cmd = String(input.tool_input?.command || '');
  if (!cmd) return;

  for (const { re, why } of DANGEROUS) {
    if (re.test(cmd)) {
      block(`claude-smart: command blocked (${why}).\nCommand: ${cmd}\nIf this is really intended, explain why and ask the user to run it themselves.`);
    }
  }

  if (!COMMIT.test(cmd)) return;
  const dir = projectDir(input);
  const cfg = loadConfig(dir);
  if (!cfg.strict || !cfg.testBeforeCommit || !cfg.testCmd) return;

  const res = run(cfg.testCmd, dir, cfg.testTimeoutSec);
  if (res.code !== 0) {
    block(
      `claude-smart: commit blocked — tests fail (\`${cfg.testCmd}\` exited ${res.code}${res.timedOut ? ', timed out' : ''}).\n` +
        `Fix the code (not the tests) until they pass, then commit.\n\n${tail(res.out)}`,
    );
  }
});
