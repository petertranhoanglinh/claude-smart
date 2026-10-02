# Usage: .\sandbox\run.ps1 <project-dir> [claude args...]
#   .\sandbox\run.ps1 E:\code\my-app
#   .\sandbox\run.ps1 E:\code\my-app -p "/implement all"
# Login is stored in the docker volume "claude-smart-home" (log in once inside the container),
# or set $env:ANTHROPIC_API_KEY before running.
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Project,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$ClaudeArgs
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = (Resolve-Path $Project).Path
$image = 'claude-smart-sandbox'

docker image inspect $image *> $null
if ($LASTEXITCODE -ne 0) { docker build -t $image $here; if ($LASTEXITCODE -ne 0) { exit 1 } }

$name = git config user.name; if (-not $name) { $name = 'claude' }
$email = git config user.email; if (-not $email) { $email = 'claude@localhost' }

$dockerArgs = @('run', '--rm', '-it',
  '-v', "${projectPath}:/workspace",
  '-v', 'claude-smart-home:/home/dev/.claude',
  '-e', "GIT_AUTHOR_NAME=$name", '-e', "GIT_AUTHOR_EMAIL=$email",
  '-e', "GIT_COMMITTER_NAME=$name", '-e', "GIT_COMMITTER_EMAIL=$email",
  '--memory', '8g', '--cpus', '4')
if ($env:ANTHROPIC_API_KEY) { $dockerArgs += @('-e', 'ANTHROPIC_API_KEY') }
$dockerArgs += @($image, 'claude', '--dangerously-skip-permissions') + $ClaudeArgs

& docker @dockerArgs
exit $LASTEXITCODE
