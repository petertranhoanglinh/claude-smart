# claude-smart: install the tools Claude Code works best with (Windows, PowerShell 5.1+).
# Only installs what is missing. Safe to run again.
#
#   powershell -ExecutionPolicy Bypass -File tools\setup-tools.ps1            # core + recommended
#   powershell -ExecutionPolicy Bypass -File tools\setup-tools.ps1 -All       # + GitHub CLI, Docker Desktop
#   powershell -ExecutionPolicy Bypass -File tools\setup-tools.ps1 -DryRun    # only show what would be installed
param([switch]$All, [switch]$DryRun)

$ErrorActionPreference = 'Continue'

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Step($name, $check, $install) {
  if (& $check) { Write-Host "  [ok]      $name" -ForegroundColor Green; return }
  if ($DryRun) { Write-Host "  [missing] $name  ->  $install" -ForegroundColor Yellow; return }
  Write-Host "  [install] $name  ->  $install" -ForegroundColor Cyan
  Invoke-Expression $install
  Refresh-Path
  if (& $check) { Write-Host "            installed" -ForegroundColor Green }
  else { Write-Host "            not found on PATH yet: close and reopen the terminal / VS Code, then run this script again" -ForegroundColor Yellow }
}

if (-not (Has winget)) {
  Write-Host 'winget not found. Install "App Installer" from the Microsoft Store, then run this script again.' -ForegroundColor Red
  exit 1
}
Refresh-Path
$wg = 'winget install -e --accept-source-agreements --accept-package-agreements --disable-interactivity --id'

Write-Host "`nRequired"
Step 'Git'         { Has git }    "$wg Git.Git"
Step 'Node.js LTS' { Has node }   "$wg OpenJS.NodeJS.LTS"
Step 'Claude Code' { Has claude } 'npm install -g @anthropic-ai/claude-code'

Write-Host "`nRecommended (search & MCP)"
Step 'ast-grep (structural code search)'   { Has ast-grep } 'npm install -g @ast-grep/cli'
Step 'uv / uvx (Serena, Postgres MCP)'     { Has uvx }      "$wg astral-sh.uv"
if (Has go) {
  Step 'gopls (Go language server for Serena)' { Has gopls } 'go install golang.org/x/tools/gopls@latest'
}

if ($All) {
  Write-Host "`nOptional"
  Step 'GitHub CLI'     { Has gh }     "$wg GitHub.cli"
  Step 'Docker Desktop' { Has docker } "$wg Docker.DockerDesktop"
}

if ((Has git) -and ((git --version) -match '(\d+)\.(\d+)')) {
  $major = [int]$Matches[1]; $minor = [int]$Matches[2]
  if ($major -lt 2 -or ($major -eq 2 -and $minor -lt 30)) {
    Write-Host "`n  Git $major.$minor is very old (GitHub login often hangs); upgrade with: winget upgrade --id Git.Git -e" -ForegroundColor Yellow
  }
}

Write-Host "`nDone. If anything shows 'not found on PATH yet', reopen the terminal and VS Code."
Write-Host 'Check everything with:  node <claude-smart>\install.mjs --doctor'
