# claude-smart

Bộ quy trình chuẩn để Claude Code làm việc hiệu quả trên **mọi dự án**, kể cả repo hàng trăm nghìn dòng: không "mù" (luôn có bản đồ codebase), không "quên" (bộ nhớ nằm trong file, tự nạp lại sau `/clear`), không "sửa bừa" (hook bắt buộc test xanh mới được commit / kết thúc).

Cài một lần bằng 1 lệnh, áp dụng cho dự án mới hoặc dự án đang chạy, không cần dependency nào ngoài Node.

| Vấn đề | Giải pháp trong claude-smart |
|---|---|
| Không nắm được tổng thể dự án | `/bootstrap` dựng `docs/ai/architecture.md` (+ Repomix tùy chọn), subagent `explorer`, ast-grep, Serena / claude-context MCP |
| Quên quy chuẩn, quên đang làm gì | `CLAUDE.md` ngắn + `docs/ai/*` + `.claude/rules/` theo module; hook SessionStart tự nạp `PROGRESS.md` và plan đang làm |
| Loạn context sau 10–15 phút | Quy trình Explore → Plan → `/clear` → Implement từng bước; `/checkpoint` trước khi `/clear`; đẩy việc đào code & chạy test sang subagent |
| Sửa lung tung, sửa nhầm file | Plan liệt kê file được sửa; hook chặn file nhạy cảm & lệnh phá hoại; test chạy trước mỗi commit và trước khi kết thúc lượt |
| Bịa API, UI vỡ không biết | Context7 (docs thư viện mới nhất), Playwright MCP (tự mở trình duyệt kiểm tra) |
| Vi phạm kiến trúc | `/guardrails` biến luật kiến trúc thành ArchUnit / dependency-cruiser / import-linter chạy tự động |
| Sợ cho AI toàn quyền | `sandbox/` chạy Claude Code trong Docker cách ly |

---

## 1. Yêu cầu

- **Node.js ≥ 18** (hooks và installer viết bằng Node để chạy được trên Windows / macOS / Linux)
- **Git** (nên dùng bản mới; kiểm tra bằng `git --version`)
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`)
- Tùy chọn: `ast-grep`, `uv`, `docker`, `gh` — xem [Bộ công cụ mở rộng](#5-bộ-công-cụ-mở-rộng-x100)

Kiểm tra nhanh máy bạn có gì:

```bash
node install.mjs --doctor
```

## 2. Cài đặt nhanh

> Hướng dẫn chi tiết từng bước (dự án đã có code, monorepo, chia sẻ cho team, gỡ cài đặt…): xem **[INSTALL.md](INSTALL.md)**.

```bash
git clone https://github.com/petertranhoanglinh/claude-smart.git ~/tools/claude-smart

# Cài vào một dự án (mới hoặc đã có code)
node ~/tools/claude-smart/install.mjs /đường/dẫn/dự-án

# (Khuyến nghị) kèm MCP không cần khóa: trình duyệt + docs thư viện
node ~/tools/claude-smart/install.mjs /đường/dẫn/dự-án --mcp=playwright,context7

# Plan, PROGRESS, review và câu trả lời viết bằng tiếng Việt
node ~/tools/claude-smart/install.mjs /đường/dẫn/dự-án --lang=vi

# (Tùy chọn) cài agents + luật chung vào ~/.claude cho MỌI dự án
node ~/tools/claude-smart/install.mjs --global
```

Trên Windows dùng đường dẫn kiểu `node E:\tools\claude-smart\install.mjs E:\code\my-app`.

Sau đó:

```bash
cd /đường/dẫn/dự-án
claude            # lần đầu: chấp nhận hộp thoại "trust this folder" (bắt buộc để settings của dự án có hiệu lực)
> /bootstrap      # Claude tự đọc dự án, viết bản đồ kiến trúc, quy chuẩn, đặt lệnh test/lint
```

Installer **an toàn khi chạy lại** bao nhiêu lần cũng được:

- `CLAUDE.md` đã có → giữ nguyên, chỉ thêm 1 dòng import `@docs/ai/WORKFLOW.md`.
- `.claude/settings.json` đã có → gộp (merge) permissions và hooks, backup ra `settings.json.bak`.
- `PROGRESS.md`, `architecture.md`, `conventions.md` là của dự án → không bao giờ bị ghi đè.
- File "quản lý" (hooks, agents, skills) chỉ được cập nhật nếu bạn chưa tự sửa chúng (theo dõi bằng hash trong `.claude/smart.manifest.json`); đã sửa thì bỏ qua và cảnh báo, trừ khi thêm `--force`.
- `--dry-run` để xem trước sẽ thay đổi gì.

## 3. Sau khi cài, dự án có gì

```
your-project/
├── CLAUDE.md                    # ngắn (<80 dòng): lệnh, kiến trúc 1 màn hình, import workflow
├── .mcp.json                    # (nếu dùng --mcp) MCP servers của dự án
├── docs/ai/
│   ├── WORKFLOW.md              # luật làm việc (managed)
│   ├── TOOLS.md                 # khi nào dùng ast-grep / MCP / guardrails (managed)
│   ├── PROGRESS.md              # "bộ nhớ ngắn hạn": đang làm gì, bước tiếp theo — tự nạp mỗi phiên
│   ├── architecture.md          # bản đồ module + data flow (do /bootstrap điền)
│   ├── conventions.md           # quy chuẩn code thực tế của dự án
│   ├── plans/                   # mỗi task 1 file plan có checkbox
│   └── decisions/               # ADR — quyết định quan trọng, khỏi tranh luận lại
└── .claude/
    ├── settings.json            # permissions + đăng ký hooks
    ├── smart.config.json        # testCmd, lintCmd, formatCmd, strict… (được bảo vệ, sửa qua configure.mjs)
    ├── hooks/                   # 6 hook Node.js
    ├── agents/                  # explorer, planner, reviewer, test-runner
    ├── skills/                  # các slash command bên dưới
    └── rules/                   # luật riêng từng module, chỉ nạp khi Claude đụng vào file khớp `paths:`
```

Nên **commit** toàn bộ các file này để cả team (và Claude ở máy khác) dùng chung. `.claude/cache/` và `settings.local.json` đã được thêm vào `.gitignore`.

## 4. Quy trình hằng ngày

```
 lần đầu        mỗi task                                                      trước khi merge
┌──────────┐   ┌──────────────────┐   ┌────────┐   ┌───────────────────────┐   ┌──────────────┐
│/bootstrap│ → │/plan-task <task> │ → │ /clear │ → │ /implement  (lặp lại) │ → │ /review-diff │
└──────────┘   │ explore + plan,  │   └────────┘   │ 1 bước → test → commit│   └──────────────┘
               │ KHÔNG sửa code   │                │ context dài?          │
               └──────────────────┘                │ → /checkpoint → /clear│
                                                   └───────────────────────┘
```

1. **`/plan-task Thêm chức năng hoàn tiền`** — Claude dùng subagent dò code (không làm đầy context chính), viết `docs/ai/plans/2026-10-02-refund.md` với các bước nhỏ, mỗi bước có test. Bạn đọc và sửa plan nếu cần.
2. **`/clear`** — xóa sạch phần dò đường. Hook SessionStart tự nạp lại PROGRESS + plan đang làm, nên Claude biết ngay phải làm gì.
3. **`/implement`** — làm đúng **1 bước**: viết test → code → chạy test → tick checkbox → cập nhật PROGRESS → commit. Gõ lại `/implement` cho bước tiếp theo (hoặc `/implement all` để chạy liên tục, tự checkpoint mỗi 3 bước).
4. **`/checkpoint`** khi phiên dài hoặc cuối ngày, rồi `/clear`. Mai mở lại `claude` là làm tiếp.
5. **`/review-diff`** (tùy chọn `main...HEAD`) — subagent reviewer soi bug, thiếu test, sửa ngoài phạm vi plan.

### Slash commands

| Lệnh | Làm gì |
|---|---|
| `/bootstrap [khu vực]` | Dựng/làm mới bản đồ dự án, quy chuẩn, lệnh test/lint (chạy lần đầu hoặc khi kiến trúc đổi nhiều) |
| `/explore <câu hỏi>` | Điều tra chỉ đọc bằng subagent: "luồng thanh toán chạy thế nào?" |
| `/plan-task <task>` | Tạo file plan, không sửa code |
| `/implement [plan\|bước\|all]` | Làm 1 bước của plan, test, commit |
| `/checkpoint` | Lưu trạng thái ra file trước khi `/clear` |
| `/review-diff [range]` | Review thay đổi trước khi merge |
| `/guardrails [luật]` | Biến luật kiến trúc thành check tự động |
| `/e2e-setup [thư mục frontend]` | Cài Playwright e2e cho frontend (giả lập backend), nối vào `testCmd` |

> Tên `/plan-task` và `/review-diff` được chọn để không trùng lệnh có sẵn `/plan`, `/review` của Claude Code.

### Subagents

| Agent | Model | Vai trò |
|---|---|---|
| `explorer` | haiku | Dò codebase chỉ đọc, trả về bản đồ ngắn `path:line` thay vì nhồi file vào context |
| `planner` | inherit | Viết file plan theo template; chỉ được ghi trong `docs/ai/plans/` |
| `reviewer` | inherit | Review diff theo plan + conventions, chạy guardrails |
| `test-runner` | haiku | Chạy test, chỉ báo lại lỗi gọn — log dài không làm bẩn context chính |

## 4b. Hooks "nghiêm ngặt"

| Hook | Khi nào | Làm gì |
|---|---|---|
| `session-start.mjs` | mở phiên, `/clear`, `/compact`, resume | Nạp `PROGRESS.md`, các bước chưa xong của plan đang làm, git branch/status/5 commit gần nhất, nhắc chạy `/bootstrap` nếu chưa có bản đồ |
| `protect-files.mjs` | trước Edit/Write | Chặn sửa `.env*` (trừ `.env.example`), lockfile, `.git/`, file khóa/chứng chỉ, và `protectedPaths` (mặc định gồm chính hooks + settings để Claude không tự "nới luật") |
| `guard-bash.mjs` | trước Bash/PowerShell | Chặn `rm -rf /`, `git push --force`, `reset --hard`, `clean -f`, `--no-verify`, `curl \| bash`, ghi vào `.env`…; **trước `git commit` chạy `testCmd`, fail → không cho commit** |
| `post-edit.mjs` | sau Edit/Write | Chạy `formatCmd` rồi `lintCmd` trên đúng file vừa sửa; lint lỗi → báo lại để Claude tự sửa ngay |
| `stop-verify.mjs` | khi Claude định kết thúc lượt | Nếu có thay đổi code chưa commit: test phải xanh **và** `PROGRESS.md` phải được cập nhật, nếu không Claude buộc phải làm tiếp (tối đa `maxStopRetries` lần để không lặp vô hạn) |
| `configure.mjs` | công cụ | Đổi `smart.config.json` qua dòng lệnh; luôn hỏi bạn xác nhận |

Hook nào bị lỗi nội bộ (thiếu git, config hỏng…) sẽ **cho qua** chứ không chặn nhầm.

### `.claude/smart.config.json`

```jsonc
{
  "strict": true,                 // false = tắt mọi chặn liên quan test/lint
  "testCmd": "npm test",          // installer tự đoán: npm/pnpm/yarn/bun, pytest/uv/poetry, go, cargo, maven, gradle, dotnet
  "lintCmd": "npx eslint --no-warn-ignored {file}",
  "formatCmd": "npx prettier --write --log-level warn {file}",
  "fileGlobs": ["**/*.{js,ts,tsx}"],   // chỉ lint/format các file khớp
  "language": "Vietnamese",          // ngôn ngữ của plan/PROGRESS/review/trả lời; "" = theo ngôn ngữ bạn chat
  "testTimeoutSec": 600,
  "testBeforeCommit": true,
  "verifyOnStop": true,
  "maxStopRetries": 3,
  "requireProgressUpdate": true,
  "protectedPaths": [".claude/settings.json", ".claude/hooks/**", ".claude/smart.config.json"]
}
```

Đổi cấu hình (file này bị chặn sửa trực tiếp bởi Claude):

```bash
node .claude/hooks/configure.mjs                      # xem cấu hình hiện tại
node .claude/hooks/configure.mjs testCmd="pnpm test:unit" strict=true
node .claude/hooks/configure.mjs verifyOnStop=false   # tạm tắt kiểm tra khi kết thúc lượt
```

Bộ test chạy quá 3 phút? Đặt `testCmd` là tập test nhanh (unit), để test chậm cho CI.

---

## 5. Bộ công cụ mở rộng (x100)

Xem danh sách MCP có sẵn: `node install.mjs --list-mcp`. Thêm vào dự án đã cài:

```bash
node ~/tools/claude-smart/install.mjs . --mcp-only --mcp=serena,postgres,github
```

Server MCP của dự án nằm trong `.mcp.json`; Claude Code sẽ hỏi bạn cho phép ở lần đầu dùng. Giá trị kiểu `${DATABASE_URI}` được lấy từ biến môi trường — **không bao giờ ghi secret thẳng vào `.mcp.json`**. Hướng dẫn cho Claude khi nào dùng tool nào nằm ở `docs/ai/TOOLS.md`.

### 5.1 ast-grep — tìm kiếm theo cấu trúc cú pháp (AST)

`grep` tìm chuỗi; `ast-grep` tìm theo **hình dạng code** nên không sót, không nhầm comment/chuỗi.

```bash
npm install -g @ast-grep/cli
ast-grep run -l ts   -p 'console.log($$$ARGS)' src/
ast-grep run -l java -p '@PostMapping $$$ public $T $M($$$P)'   # rồi lọc handler thiếu @Valid
ast-grep run -l py   -p 'requests.get($URL)' app/              # gọi HTTP không có timeout
```

`docs/ai/TOOLS.md` và agent `explorer` đã dặn Claude ưu tiên ast-grep cho câu hỏi về cấu trúc code (và không bao giờ dùng `-U` tự ghi đè nếu plan không yêu cầu). Muốn biến pattern thành luật cố định → dùng `ast-grep scan` qua `/guardrails`.

### 5.2 MCP servers

| Tên (`--mcp=`) | Dùng để | Cần |
|---|---|---|
| `playwright` | Claude tự mở trình duyệt headless, click thử, chụp màn hình, xem lỗi console sau khi sửa UI | Node |
| `context7` | Lấy tài liệu **đúng phiên bản** của thư viện/framework → hết bịa API | Node |
| `serena` | Điều hướng theo symbol bằng language server: tìm định nghĩa, tham chiếu, tổng quan file | `uv` |
| `github` | Đọc issue, comment PR, review, release | biến `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `postgres` | Xem schema & query DB **local/dev** ở chế độ chỉ đọc (`--access-mode=restricted`) | `uv`, biến `DATABASE_URI` |
| `mongodb` | Như trên cho MongoDB (`--readOnly`) | Node, biến `MDB_MCP_CONNECTION_STRING` |
| `claude-context` | Tìm kiếm ngữ nghĩa bằng vector trên toàn codebase | Node, API key embedding + Milvus/Zilliz |

> ⚠️ Không bao giờ trỏ MCP database vào production. Dùng user DB chỉ có quyền đọc.
> Các package MCP thay đổi nhanh — nếu một server không chạy, xem README của chính package đó và sửa entry trong `.mcp.json` (hoặc `mcp/catalog.json` để sửa cho mọi dự án sau).

### 5.3 Tìm kiếm ngữ nghĩa cho repo rất lớn

Chọn theo kích thước repo, từ rẻ đến đắt:

1. **Bản đồ trong file** (`/bootstrap` → `architecture.md`, `.claude/rules/`) — luôn có, đủ cho đa số dự án.
2. **Repomix** — `/bootstrap` tự chạy `npx repomix --compress` ra `.claude/cache/repomix.xml` khi repo > ~200 file; `explorer` grep file này để định vị nhanh. Có thể cài plugin chính thức: `/plugin marketplace add yamadashy/repomix`.
3. **Serena MCP** — hiểu symbol thật sự qua language server, không cần vector DB. Khuyến nghị cho repo lớn.
4. **claude-context MCP** — vector index toàn repo (cần dịch vụ embedding + Milvus). Dùng khi repo hàng trăm nghìn dòng và câu hỏi thường ở dạng ngôn ngữ tự nhiên ("logic biến động giá nhà đất nằm ở đâu?").

Lưu ý: **Context7 không phải vector search cho code của bạn** — nó cung cấp tài liệu của thư viện bên ngoài.

### 5.4 Guardrails — luật kiến trúc chạy tự động (self-healing)

Đừng chỉ dặn "viết code sạch"; hãy để máy bắt lỗi. Chạy:

```
> /guardrails
> /guardrails service không được gọi repository của module khác
```

Claude sẽ đề xuất 3–8 luật từ `architecture.md`, chờ bạn duyệt, rồi cài công cụ hợp stack:

| Stack | Ranh giới / phân tầng | Quy tắc code |
|---|---|---|
| Java/Kotlin | ArchUnit | SpotBugs, Checkstyle, detekt |
| JS/TS | dependency-cruiser, ESLint `import/no-restricted-paths` | Biome / ESLint |
| Python | import-linter | Ruff |
| Go | golangci-lint `depguard` | golangci-lint |
| Mọi ngôn ngữ | ast-grep rules (`ast-grep scan`) | |

Các check được nối vào `testCmd`/`lintCmd`, nên hook `post-edit`, `guard-bash` (trước commit) và `stop-verify` sẽ bắn lỗi ngay khi Claude vi phạm → Claude tự sửa trước khi báo xong. Code cũ đang vi phạm được ghi thành baseline, không bị refactor ồ ạt.

### 5.5 Playwright: test giao diện bắt buộc

Với dự án có frontend (Next.js, React, Vue, Svelte, Angular…), claude-smart áp dụng luật **mọi thay đổi UI phải có test Playwright** (`.claude/rules/ui-e2e.md`, tự nạp khi Claude sửa file `.tsx/.jsx/.vue/.svelte`):

- `/implement` viết spec e2e cho mỗi bước UI; `/review-diff` báo lỗi `[test]` nếu UI đổi mà không có spec.
- Backend được **giả lập trong từng test** (`mockApi(page, {"GET /path": {body}})`), nên không cần DB hay backend thật; request nào quên mock làm test fail rõ ràng.
- `testCmd` chỉ chạy e2e khi frontend có thay đổi, nên commit backend vẫn nhanh.
- Có MCP `playwright` thì Claude còn tự mở trình duyệt xem giao diện sau khi sửa.

Cài cho dự án (1 lần, trong Claude):

```
/e2e-setup frontend
```

Installer tự báo khi phát hiện frontend chưa có Playwright. Chạy tay: `npm run test:e2e` (hoặc `npm run test:e2e:ui` để xem từng bước trên giao diện).

### 5.6 Docker sandbox — cho Claude toàn quyền mà không sợ hỏng máy

Dùng cho việc nặng: refactor cả module, nâng cấp dependency, chạy `/implement all` qua đêm.

```bash
# macOS / Linux / Git Bash
sandbox/run.sh ~/code/my-app
sandbox/run.sh ~/code/my-app -p "/implement all"

# Windows PowerShell
.\sandbox\run.ps1 E:\code\my-app
```

- Image gồm Node 22, Python + uv, git, ripgrep, ast-grep, Claude Code, Chromium cho Playwright.
- Chỉ thư mục dự án được mount vào `/workspace`; chạy bằng user thường (không root) với `--dangerously-skip-permissions` **chỉ bên trong container**.
- Đăng nhập Claude lưu trong docker volume `claude-smart-home` (đăng nhập 1 lần), hoặc truyền `ANTHROPIC_API_KEY`.
- Container vẫn có mạng và vẫn sửa được file dự án → luôn làm trên một branch git riêng; hooks claude-smart vẫn chạy bên trong nên test vẫn bắt buộc xanh.
- Muốn chặn mạng chặt hơn, tham khảo devcontainer tham chiếu của Anthropic (có firewall) trong tài liệu Claude Code.

---

## 6. Mẹo cho dự án lớn

- Giữ `CLAUDE.md` < 80 dòng. Chi tiết để ở `docs/ai/` và `.claude/rules/<module>.md` (có `paths:`), chỉ được nạp khi cần.
- Mỗi module lớn có 1 file rules ≤ 30 dòng: bất biến, cách test riêng module, bẫy thường gặp.
- Luôn bắt đầu bằng `/explore` hoặc `/plan-task`, đừng bảo thẳng "sửa bug X" trong phiên đã dài.
- Thấy Claude bắt đầu "ngáo" → `/checkpoint` → `/clear`. Bộ nhớ nằm trong file nên không mất gì.
- Commit nhỏ, mỗi bước 1 commit: dễ review, dễ `git revert`.
- Quyết định quan trọng → ADR trong `docs/ai/decisions/` để lần sau Claude không đề xuất ngược lại.

## 7. Cập nhật claude-smart

```bash
cd ~/tools/claude-smart && git pull
node install.mjs /đường/dẫn/dự-án          # cập nhật file managed chưa bị sửa, giữ nguyên phần của bạn
```

## 8. Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Hook / permissions không có tác dụng | Mở `claude` trong thư mục dự án 1 lần và chấp nhận hộp thoại trust. Kiểm tra bằng `/hooks`. |
| `node: command not found` trong hook | Node phải nằm trong PATH của shell mà Claude Code dùng. |
| Claude bị kẹt vì test fail mãi | Sau `maxStopRetries` lần hook tự cho qua; Claude sẽ ghi blocker vào PROGRESS. Tạm tắt: `configure.mjs verifyOnStop=false`. |
| Muốn Claude được sửa một file đang bị bảo vệ | Tự sửa tay, hoặc bỏ glob khỏi `protectedPaths` bằng `configure.mjs`. |
| Lint chạy trên file không liên quan | Đặt `fileGlobs` cho đúng phần mở rộng. |
| Installer báo "modified locally — skipped" | Bạn đã tùy biến file đó; giữ nguyên, hoặc chạy lại với `--force` để lấy bản mới. |

## 9. Phát triển repo này

```
claude-smart/
├── install.mjs          # installer + --doctor + --mcp
├── template/            # nội dung được cài vào dự án
├── global/CLAUDE.md     # luật cá nhân cho ~/.claude (--global)
├── mcp/catalog.json     # danh mục MCP servers
├── sandbox/             # Dockerfile + run.sh / run.ps1
└── tests/               # node --test, không dependency
```

```bash
npm test
```

Prompt (CLAUDE.md, agents, skills) viết bằng tiếng Anh để Claude tuân thủ tốt và tiết kiệm token; tài liệu cho người dùng viết bằng tiếng Việt.
