# Hướng dẫn thêm claude-smart vào dự án

Tài liệu này hướng dẫn từng bước cách đưa claude-smart vào một dự án: dự án mới, dự án đang chạy, monorepo, và cách để cả team dùng chung. Phần giới thiệu tổng quan xem trong [README.md](README.md); cách làm việc hằng ngày sau khi cài xem trong [USAGE.md](USAGE.md).

---

## Mục lục

1. [Chuẩn bị](#1-chuẩn-bị)
2. [Tải claude-smart về máy](#2-tải-claude-smart-về-máy)
3. [Cài vào dự án mới](#3-cài-vào-dự-án-mới)
4. [Cài vào dự án đã có code](#4-cài-vào-dự-án-đã-có-code)
5. [Lần chạy đầu tiên: trust và /bootstrap](#5-lần-chạy-đầu-tiên-trust-và-bootstrap)
6. [Kiểm tra cài đặt đã hoạt động](#6-kiểm-tra-cài-đặt-đã-hoạt-động)
7. [Tinh chỉnh cấu hình](#7-tinh-chỉnh-cấu-hình)
8. [Thêm MCP servers](#8-thêm-mcp-servers)
9. [Monorepo và dự án nhiều ngôn ngữ](#9-monorepo-và-dự-án-nhiều-ngôn-ngữ)
10. [Chia sẻ cho cả team](#10-chia-sẻ-cho-cả-team)
11. [Cập nhật phiên bản mới](#11-cập-nhật-phiên-bản-mới)
12. [Gỡ cài đặt](#12-gỡ-cài-đặt)
13. [Xử lý sự cố](#13-xử-lý-sự-cố)

---

## 1. Chuẩn bị

| Công cụ | Bắt buộc? | Kiểm tra | Cài đặt |
|---|---|---|---|
| Node.js ≥ 18 | Có | `node --version` | https://nodejs.org |
| Git | Có | `git --version` | https://git-scm.com (nên dùng bản mới) |
| Claude Code | Có | `claude --version` | `npm install -g @anthropic-ai/claude-code` |
| ast-grep | Nên có | `ast-grep --version` | `npm install -g @ast-grep/cli` |
| uv / uvx | Tùy chọn | `uvx --version` | Chỉ cần cho MCP serena, postgres. Windows: `winget install --id=astral-sh.uv -e` · macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker | Tùy chọn | `docker --version` | Chỉ cần nếu dùng `sandbox/` |

> Cài công cụ mới xong (Node, ast-grep, uv…) mà vẫn báo `is not recognized` / `command not found`: **đóng hết terminal và mở lại** (kể cả VS Code) để PATH được cập nhật.

Dự án đích **nên là một git repo** (`git init` nếu chưa có). Hooks dùng git để biết file nào đã thay đổi và chặn commit khi test fail.

## 2. Tải claude-smart về máy

Chỉ cần tải **một lần**, đặt ở một chỗ cố định rồi dùng cho mọi dự án.

```bash
# macOS / Linux
git clone https://github.com/petertranhoanglinh/claude-smart.git ~/tools/claude-smart

# Windows (PowerShell)
git clone https://github.com/petertranhoanglinh/claude-smart.git E:\tools\claude-smart
```

Kiểm tra máy đã có đủ công cụ chưa:

```bash
node ~/tools/claude-smart/install.mjs --doctor
```

Kết quả mẫu:

```
  ✔ git       git version 2.45.0
  ✔ node      v22.12.0
  ✔ claude    2.1.278 (Claude Code)
  ✘ ast-grep  missing — structural search — npm i -g @ast-grep/cli
  ...
```

> **Quy ước trong các ví dụ bên dưới:**
> - `CS` = đường dẫn tới thư mục claude-smart. **Thay bằng đường dẫn thật** trên máy bạn, ví dụ `~/tools/claude-smart` hoặc `E:\tools\claude-smart`.
> - `.` = thư mục hiện tại. Các lệnh `node CS/install.mjs .` phải được chạy **khi đang đứng trong thư mục dự án** (dùng `cd` vào đó trước). Muốn chạy từ chỗ khác thì thay `.` bằng đường dẫn dự án.
>
> Ví dụ cụ thể trên Windows:
> ```powershell
> cd E:\code\my-app
> node E:\tools\claude-smart\install.mjs .
> ```

## 3. Cài vào dự án mới

```bash
mkdir my-app && cd my-app
git init
# ... tạo khung dự án như bình thường (npm init, django-admin startproject, go mod init, ...)

node CS/install.mjs .
```

Installer tự nhận ra stack qua `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `*.csproj`. Từ đó nó điền sẵn `testCmd`, `lintCmd` và `formatCmd` vào `.claude/smart.config.json`. Nếu dự án chưa có test, `testCmd` để trống. Sau này `/bootstrap` sẽ điền lại.

Nên commit ngay sau khi cài:

```bash
git add -A
git commit -m "chore: add claude-smart"
```

## 4. Cài vào dự án đã có code

**Bước 1: xem trước những gì sẽ thay đổi.** Lệnh này không ghi gì cả:

```bash
cd path/to/existing-project
node CS/install.mjs . --dry-run
```

Ý nghĩa các nhãn:

| Nhãn | Ý nghĩa |
|---|---|
| `create` | Tạo file mới |
| `append` | Thêm vào cuối file đã có (`CLAUDE.md`, `.gitignore`) |
| `merge` | Gộp vào file JSON đã có (`settings.json`, `smart.config.json`, `.mcp.json`) |
| `backup` | Sao lưu file trước khi gộp (`.bak`) |
| `keep` | File thuộc về dự án, giữ nguyên |
| `ok` | Đã đúng, không cần làm gì |
| `skip` | Bạn đã tự sửa file này, bỏ qua (dùng `--force` để ghi đè) |

**Bước 2: tạo nhánh riêng rồi cài:**

```bash
git checkout -b chore/claude-smart
node CS/install.mjs .
git diff          # xem lại thay đổi
```

**Installer xử lý file đã có như sau:**

- **`CLAUDE.md` đã có:** giữ nguyên nội dung, chỉ thêm ở cuối một khối:
  ```markdown
  <!-- claude-smart:start -->
  ## Workflow (claude-smart)
  @docs/ai/WORKFLOW.md
  <!-- claude-smart:end -->
  ```
  Nên tự thêm dòng `@docs/ai/TOOLS.md` nếu bạn muốn Claude dùng hướng dẫn công cụ. Nên chuyển phần lệnh build/test cũ sang đúng mục, hoặc để `/bootstrap` sắp xếp lại.
- **`.claude/settings.json` đã có:** permissions và hooks của bạn được giữ nguyên, của claude-smart được thêm vào. Bản cũ được lưu tại `.claude/settings.json.bak`.
- **`.mcp.json` đã có** (khi dùng `--mcp`): server trùng tên được giữ nguyên, không bị thay.
- **Agent hoặc skill trùng tên** (ví dụ bạn đã có `.claude/agents/reviewer.md`): bỏ qua và cảnh báo `modified locally — skipped`.

**Bước 3: commit:**

```bash
git add -A
git commit -m "chore: add claude-smart workflow"
```

## 5. Lần chạy đầu tiên: trust và /bootstrap

```bash
cd my-app
claude
```

1. **Chấp nhận hộp thoại "Do you trust the files in this folder?"** Bước này **bắt buộc**: nếu chưa trust, Claude Code bỏ qua permissions và hooks của dự án.
2. Gõ:
   ```
   /bootstrap
   ```
   Claude sẽ:
   - dò toàn bộ dự án bằng subagent `explorer` (repo lớn thì chạy thêm Repomix),
   - viết `docs/ai/architecture.md` và `docs/ai/conventions.md`,
   - điền mục *Commands* và *Architecture* trong `CLAUDE.md`,
   - đề xuất `testCmd`/`lintCmd`/`formatCmd`. Claude sẽ **hỏi bạn duyệt** lệnh `configure.mjs`,
   - commit kết quả.
3. Đọc lại `docs/ai/architecture.md`. Đây là "bản đồ" Claude dùng mãi về sau, nên sửa tay nếu có chỗ sai.
4. **Có frontend?** Chạy `/e2e-setup` (hoặc `/e2e-setup frontend` với monorepo) để cài Playwright e2e. Từ đó mọi thay đổi giao diện bắt buộc có test. Installer sẽ nhắc nếu phát hiện frontend chưa có Playwright.
5. (Khuyến nghị) chạy `/guardrails` để biến luật kiến trúc thành check tự động.

## 6. Kiểm tra cài đặt đã hoạt động

Trong phiên `claude` của dự án:

| Kiểm tra | Cách làm | Kết quả mong đợi |
|---|---|---|
| Hooks đã đăng ký | Gõ `/hooks` | Có SessionStart, PreToolUse (2), PostToolUse, Stop trỏ tới `.claude/hooks/*.mjs` |
| Agents | Gõ `/agents` | Có explorer, planner, reviewer, test-runner |
| Skills | Gõ `/` | Có bootstrap, explore, plan-task, implement, checkpoint, review-diff, guardrails, e2e-setup, spec |
| Bộ nhớ tự nạp | Hỏi: *"Session context của claude-smart nói gì?"* | Claude trích được PROGRESS, branch git, các ghi chú |
| Chặn file nhạy cảm | Bảo Claude: *"Sửa file .env"* | Bị chặn với thông báo `claude-smart: editing ".env" is blocked` |
| Chặn commit khi test fail | Làm hỏng 1 test rồi bảo Claude commit | Bị chặn với thông báo `commit blocked — tests fail` |

Kiểm tra hooks ngay từ terminal, không cần Claude:

```bash
# Phải in ra lỗi "blocked" và exit code 2
echo '{"tool_input":{"file_path":".env"}}' | node .claude/hooks/protect-files.mjs; echo "exit=$?"

# Xem cấu hình hiện tại
node .claude/hooks/configure.mjs
```

## 7. Tinh chỉnh cấu hình

Cấu hình nằm trong `.claude/smart.config.json`. Claude bị chặn sửa trực tiếp file này, nên muốn đổi thì dùng `configure.mjs`:

```bash
node .claude/hooks/configure.mjs testCmd="npm run test:unit"
node .claude/hooks/configure.mjs lintCmd="npx eslint --no-warn-ignored {file}" formatCmd="npx prettier --write {file}"
node .claude/hooks/configure.mjs fileGlobs='["src/**/*.{ts,tsx}"]'
node .claude/hooks/configure.mjs strict=false          # tắt toàn bộ chặn liên quan test/lint
```

| Khóa | Mặc định | Ghi chú |
|---|---|---|
| `strict` | `true` | Bật/tắt chặn theo test và lint |
| `testCmd` | tự đoán | Nên chạy dưới khoảng 3 phút. Nếu chậm hơn, dùng tập test unit |
| `lintCmd`, `formatCmd` | tự đoán | `{file}` được thay bằng file vừa sửa |
| `fileGlobs` | theo stack | Chỉ lint/format các file khớp |
| `testBeforeCommit` | `true` | Chạy test trước mỗi `git commit` |
| `verifyOnStop` | `true` | Chạy test khi Claude định kết thúc lượt |
| `maxStopRetries` | `3` | Số lần tối đa Stop hook bắt Claude làm tiếp |
| `requireProgressUpdate` | `true` | Có sửa code thì phải cập nhật `PROGRESS.md` |
| `envAccess` | `keys` | Quyền với `.env`: `block` (cấm hẳn) · `keys` (chỉ xem tên biến, thêm biến mới qua `env.mjs`) · `full` (đọc/sửa tự do, chỉ nên dùng khi `.env` toàn giá trị dev) |
| `language` | `""` | Ngôn ngữ cho mọi thứ bạn đọc: plan, PROGRESS, ADR, review, câu trả lời. Đặt nhanh: `node CS/install.mjs . --lang=vi`. Code và commit message giữ nguyên |
| `protectedPaths` | hooks + settings | Thêm glob để bảo vệ, ví dụ `"migrations/**"` |

**Ví dụ lệnh theo stack:**

| Stack | testCmd | lintCmd | formatCmd |
|---|---|---|---|
| Node + Vitest | `npx vitest run` | `npx eslint --no-warn-ignored {file}` | `npx prettier --write {file}` |
| Node + Biome | `npm test` | `npx biome lint {file}` | `npx biome format --write {file}` |
| Python | `uv run pytest -q` | `ruff check {file}` | `ruff format {file}` |
| Go | `go test ./...` | `go vet ./...` | `gofmt -w {file}` |
| Java Maven | `mvn -q test` | — | — |
| Java Gradle | `./gradlew test -q` | — | — |
| .NET | `dotnet test --nologo -v q` | — | `dotnet format --include {file}` |

## 8. Thêm MCP servers

```bash
node CS/install.mjs --list-mcp                                  # xem danh sách
node CS/install.mjs . --mcp-only --mcp=playwright,context7      # thêm vào dự án đã cài
```

Sau đó mở lại `claude`, duyệt các server khi được hỏi, rồi gõ `/mcp` để xem trạng thái.

**Server cần biến môi trường** (github, postgres, mongodb, claude-context): đặt biến trong shell **trước khi** mở `claude`. **Không** ghi secret vào `.mcp.json`.

```bash
# macOS / Linux
export DATABASE_URI="postgresql://readonly:pass@localhost:5432/myapp_dev"

# Windows PowerShell
$env:DATABASE_URI = "postgresql://readonly:pass@localhost:5432/myapp_dev"
```

> Chỉ dùng database local hoặc dev, với user chỉ có quyền đọc.

## 9. Monorepo và dự án nhiều ngôn ngữ

- **Cài ở thư mục gốc** của monorepo, không cài từng package. Hooks dùng `$CLAUDE_PROJECT_DIR`, tức là thư mục gốc nơi bạn mở `claude`.
- `testCmd` nên là lệnh chạy test toàn repo nhưng nhanh, ví dụ `pnpm -r test`, `turbo run test`, `nx affected -t test`.
- Đặt `fileGlobs` gồm mọi ngôn ngữ cần lint, và dùng một lệnh lint chung. Nếu mỗi ngôn ngữ lint khác nhau, viết một script nhỏ nhận `{file}` rồi chọn linter theo đuôi file:
  ```bash
  node .claude/hooks/configure.mjs lintCmd="node scripts/lint-file.mjs {file}"
  ```
- Mỗi package hoặc service có một file luật riêng trong `.claude/rules/`. Ví dụ `.claude/rules/api.md`:
  ```markdown
  ---
  paths:
    - "services/api/**"
  ---
  # API service
  - Test riêng service: `pnpm --filter api test`
  - Mọi endpoint phải validate input bằng zod
  ```
  File này chỉ được nạp khi Claude làm việc với file trong `services/api/`, nên không làm tốn context.

## 10. Chia sẻ cho cả team

**Commit vào repo:**

- `CLAUDE.md`, `docs/ai/**`
- `.claude/settings.json`, `.claude/smart.config.json`, `.claude/smart.manifest.json`
- `.claude/hooks/**`, `.claude/agents/**`, `.claude/skills/**`, `.claude/rules/**`
- `.mcp.json` (chỉ chứa `${BIẾN}`, không chứa secret)

**Không commit** (installer đã thêm vào `.gitignore`):

- `.claude/cache/`
- `.claude/settings.local.json`, nơi mỗi người tự đặt quyền riêng
- `*.bak`

Thành viên khác **không cần cài claude-smart**: chỉ cần `git pull`, có Node, mở `claude` trong repo và chấp nhận trust.

Mỗi người có thể cài thêm phần dùng chung cho mọi dự án:

```bash
node CS/install.mjs --global
```

Lệnh này thêm 4 agent vào `~/.claude/agents/` và một khối luật chung vào `~/.claude/CLAUDE.md`. File `CLAUDE.md` cũ được backup thành `.bak`.

## 11. Cập nhật phiên bản mới

```bash
cd CS && git pull
cd path/to/project
node CS/install.mjs . --dry-run     # xem file nào sẽ được cập nhật
node CS/install.mjs .
git add -A && git commit -m "chore: update claude-smart"
```

Installer chỉ cập nhật các file mà bạn **chưa tự sửa**. File đã tùy biến hiện `skip`. Nếu muốn lấy bản mới cho file đó, so sánh với `CS/template/...` rồi gộp tay, hoặc chạy với `--force`. `--force` sẽ ghi đè mọi tùy biến của bạn.

## 12. Gỡ cài đặt

```bash
# Xóa các thành phần của claude-smart
rm -rf .claude/hooks .claude/agents .claude/skills .claude/rules/_example.md \
       .claude/smart.config.json .claude/smart.manifest.json .claude/cache
rm -f docs/ai/WORKFLOW.md docs/ai/TOOLS.md
```

Sau đó:

1. Mở `.claude/settings.json` và xóa các mục hooks trỏ tới `.claude/hooks/*.mjs`. Nếu trước đó bạn chưa có settings riêng, có thể khôi phục từ `settings.json.bak`.
2. Mở `CLAUDE.md` và xóa khối `<!-- claude-smart:start --> ... <!-- claude-smart:end -->`.
3. Giữ hoặc xóa `docs/ai/` tùy bạn. Đây là tài liệu của dự án và vẫn hữu ích cho người đọc.

## 13. Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `/hooks` không thấy hook nào | Chưa trust thư mục: mở `claude` và chấp nhận. Hoặc `settings.json` lỗi cú pháp: kiểm tra bằng `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`. |
| Thông báo "Ignoring permissions.allow entries… not been trusted" | Như trên: cần trust thư mục một lần ở chế độ interactive. |
| Hook báo `node: command not found` | Node chưa có trong PATH của shell mà Claude Code dùng. Mở terminal mới sau khi cài Node. |
| Commit luôn bị chặn | `testCmd` đang fail thật. Tự chạy lệnh đó để xem lỗi. Nếu test hỏng không liên quan, sửa test trước, hoặc tạm thời dùng `configure.mjs testBeforeCommit=false`. |
| Claude cứ làm tiếp, không chịu dừng | Stop hook thấy test fail hoặc PROGRESS chưa cập nhật. Sau `maxStopRetries` lần, hook sẽ tự cho dừng. |
| Lint báo lỗi trên file markdown/json | Đặt `fileGlobs` cho đúng đuôi file code. |
| Hook chạy quá chậm | `testCmd` quá nặng: dùng tập test nhanh hơn, tăng `testTimeoutSec`, hoặc tắt `verifyOnStop`. |
| Installer báo `modified locally — skipped` | Bạn đã sửa file đó. Giữ nguyên, hoặc dùng `--force` (ghi đè). |
| Muốn Claude sửa một file bị bảo vệ | Tự sửa tay, hoặc gỡ glob khỏi `protectedPaths` bằng `configure.mjs`. `.env` và lockfile luôn bị chặn. |

---

Gặp lỗi chưa có trong bảng? Mở issue tại https://github.com/petertranhoanglinh/claude-smart/issues. Nhớ kèm output của `node install.mjs --doctor` và `node .claude/hooks/configure.mjs`.
