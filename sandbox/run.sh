#!/usr/bin/env bash
# Usage: sandbox/run.sh <project-dir> [claude args...]
#   sandbox/run.sh ~/code/my-app                       # interactive, full autonomy
#   sandbox/run.sh ~/code/my-app -p "/implement all"   # headless
# Login is stored in the docker volume "claude-smart-home" (log in once inside the container),
# or pass ANTHROPIC_API_KEY in the environment.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(cd "${1:?project dir required}" && pwd)"; shift
IMAGE=claude-smart-sandbox

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -t "$IMAGE" "$HERE"

exec docker run --rm -it \
  -v "$PROJECT":/workspace \
  -v claude-smart-home:/home/dev/.claude \
  ${ANTHROPIC_API_KEY:+-e ANTHROPIC_API_KEY} \
  -e GIT_AUTHOR_NAME="$(git config user.name || echo claude)" \
  -e GIT_AUTHOR_EMAIL="$(git config user.email || echo claude@localhost)" \
  -e GIT_COMMITTER_NAME="$(git config user.name || echo claude)" \
  -e GIT_COMMITTER_EMAIL="$(git config user.email || echo claude@localhost)" \
  --memory 8g --cpus 4 \
  "$IMAGE" claude --dangerously-skip-permissions "$@"
