#!/usr/bin/env bash
# claude-smart: install the tools Claude Code works best with (macOS / Linux / WSL).
# Only installs what is missing. Safe to run again.
#   bash tools/setup-tools.sh            core + recommended
#   bash tools/setup-tools.sh --all      + GitHub CLI
#   bash tools/setup-tools.sh --dry-run  only show what would be installed
set -u
ALL=0; DRY=0
for a in "$@"; do case "$a" in --all) ALL=1 ;; --dry-run) DRY=1 ;; esac; done

export PATH="$HOME/.local/bin:$HOME/go/bin:$HOME/.cargo/bin:$PATH" # where uv / go install put binaries
has() { command -v "$1" >/dev/null 2>&1; }
step() { # name, check-cmd, install-cmd
  if has "$2"; then printf '  [ok]      %s\n' "$1"; return; fi
  if [ "$DRY" = 1 ]; then printf '  [missing] %s  ->  %s\n' "$1" "$3"; return; fi
  printf '  [install] %s  ->  %s\n' "$1" "$3"
  eval "$3"
  export PATH="$HOME/.local/bin:$HOME/go/bin:$PATH"
  has "$2" && printf '            installed\n' || printf '            not on PATH yet: open a new shell and run again\n'
}

if ! has git || ! has node; then
  echo "Install Git and Node.js (LTS) first:"
  echo "  macOS:  brew install git node"
  echo "  Ubuntu: sudo apt install git && curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install -y nodejs"
  [ "$DRY" = 1 ] || exit 1
fi

echo; echo "Required"
step "Claude Code" claude "npm install -g @anthropic-ai/claude-code"

echo; echo "Recommended (search & MCP)"
step "ast-grep (structural code search)" ast-grep "npm install -g @ast-grep/cli"
step "uv / uvx (Serena, Postgres MCP)" uvx "curl -LsSf https://astral.sh/uv/install.sh | sh"
if has go; then step "gopls (Go language server for Serena)" gopls "go install golang.org/x/tools/gopls@latest"; fi

if [ "$ALL" = 1 ]; then
  echo; echo "Optional"
  if has brew; then step "GitHub CLI" gh "brew install gh"; else step "GitHub CLI" gh "echo 'see https://cli.github.com'"; fi
fi

echo; echo "Done. Check everything with: node <claude-smart>/install.mjs --doctor"
