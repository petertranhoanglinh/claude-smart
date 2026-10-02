// PreToolUse(Bash|PowerShell): block destructive commands; run the test suite before any `git commit`.
import { readInput, projectDir, loadConfig, run, tail, block, safe, isEnvFile, ENV_HELP } from './lib.mjs';

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
];

// Commands that print, copy or write file contents. Only these are checked against .env paths, so things like
// `docker compose --env-file .env up` or `ls -a` still work.
const FILE_VERBS =
  /(^|[\s;&|(])(cat|type|more|less|head|tail|bat|nl|strings|grep|egrep|rg|findstr|sed|awk|cut|xxd|od|base64|source|Get-Content|gc|Select-String|sls|cp|mv|copy|move|tee|Set-Content|Add-Content|Out-File|echo|printf|code|vi|vim|nano|notepad)(?=$|[\s;&|)])|>>?|<|^\s*\.\s/i;

function envFilesIn(cmd) {
  return [...cmd.matchAll(/(?:^|[\s"'=/\\])(\.env(?:\.[\w.-]+)?)(?=$|[\s"';|&)<>])/g)].map((m) => m[1]).filter((f) => isEnvFile(f));
}

// The env helper on its own (optionally after `cd <dir> &&`), never chained with anything else.
const ENV_HELPER = /^\s*(cd\s+("[^"]*"|\S+)\s*&&\s*)?node\s+["']?(\.\/)?\.claude[\\/]hooks[\\/]env\.mjs["']?(\s[^;&|<>`$]*)?$/;

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

  const dir = projectDir(input);
  const cfg = loadConfig(dir);

  if (cfg.envAccess !== 'full' && !ENV_HELPER.test(cmd) && FILE_VERBS.test(cmd)) {
    const files = envFilesIn(cmd);
    if (files.length) {
      block(
        `claude-smart: command blocked (reads or writes secrets file ${files.join(', ')}).\n` +
          (cfg.envAccess === 'block' ? '' : `${ENV_HELP}\n`) +
          'Do not try to work around this.',
      );
    }
  }

  if (!COMMIT.test(cmd)) return;
  if (!cfg.strict || !cfg.testBeforeCommit || !cfg.testCmd) return;

  const res = run(cfg.testCmd, dir, cfg.testTimeoutSec);
  if (res.code !== 0) {
    block(
      `claude-smart: commit blocked — tests fail (\`${cfg.testCmd}\` exited ${res.code}${res.timedOut ? ', timed out' : ''}).\n` +
        `Fix the code (not the tests) until they pass, then commit.\n\n${tail(res.out)}`,
    );
  }
});
