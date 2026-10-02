# claude-smart sandbox: run Claude Code with full autonomy inside an isolated container.
# The project is bind-mounted at /workspace; nothing else from the host is visible.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ripgrep jq curl ca-certificates python3 python3-venv python3-pip build-essential less procps \
    && rm -rf /var/lib/apt/lists/*

# uv / uvx (for Python projects and the serena / postgres MCP servers)
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# Claude Code + structural search + Playwright browser deps for the playwright MCP
# (browsers in a shared path so the non-root user can use them)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm install -g @anthropic-ai/claude-code @ast-grep/cli \
    && npx -y playwright@latest install --with-deps chromium

# Non-root user: --dangerously-skip-permissions refuses to run as root.
RUN useradd -m -s /bin/bash dev && mkdir -p /workspace && chown dev:dev /workspace
USER dev
ENV PATH="/home/dev/.local/bin:${PATH}"
WORKDIR /workspace

CMD ["claude"]
