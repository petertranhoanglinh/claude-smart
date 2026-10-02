# Quy trình sử dụng claude-smart hằng ngày

Tài liệu này dành cho người **đã cài xong** claude-smart vào dự án (xem [INSTALL.md](INSTALL.md)) và muốn biết mỗi ngày nên làm việc với Claude thế nào cho hiệu quả. Mọi ví dụ đều dùng được trong **panel Claude của VS Code** và trong **terminal** (`claude`).

---

## Mục lục

1. [Chọn cách làm theo loại việc](#1-chọn-cách-làm-theo-loại-việc)
2. [Bắt đầu một buổi làm việc](#2-bắt-đầu-một-buổi-làm-việc)
3. [Việc nhỏ: chat bình thường](#3-việc-nhỏ-chat-bình-thường)
4. [Việc lớn: quy trình đầy đủ](#4-việc-lớn-quy-trình-đầy-đủ)
5. [Làm theo một checklist dài](#5-làm-theo-một-checklist-dài)
6. [Làm giao diện (frontend + Playwright)](#6-làm-giao-diện-frontend--playwright)
7. [Hỏi về code mà không sửa gì](#7-hỏi-về-code-mà-không-sửa-gì)
8. [Khi phiên chat đã dài hoặc cuối ngày](#8-khi-phiên-chat-đã-dài-hoặc-cuối-ngày)
9. [Trước khi push / merge](#9-trước-khi-push--merge)
10. [Khi bị hook chặn: đọc và xử lý](#10-khi-bị-hook-chặn-đọc-và-xử-lý)
11. [Mẫu câu lệnh hay dùng](#11-mẫu-câu-lệnh-hay-dùng)
12. [Nên và không nên](#12-nên-và-không-nên)
13. [Cấu hình cơ bản](#13-cấu-hình-cơ-bản)
14. [Câu hỏi thường gặp](#14-câu-hỏi-thường-gặp)

---

## 1. Chọn cách làm theo loại việc

| Loại việc | Ví dụ | Cách làm |
|---|---|---|
| Hỏi, tìm hiểu | "API đăng bài Facebook nằm ở đâu?" | Chat bình thường, hoặc `/explore` nếu câu hỏi rộng |
| Việc nhỏ (< 15 phút, 1–3 file) | Đổi chữ nút, sửa một bug rõ ràng, thêm 1 field | **Chat bình thường** ([mục 3](#3-việc-nhỏ-chat-bình-thường)) |
| Việc vừa và lớn (nhiều bước, nhiều file, có quyết định thiết kế) | Tính năng kho ảnh R2, refactor một module | **`/plan-task` → `/clear` → `/implement`** ([mục 4](#4-việc-lớn-quy-trình-đầy-đủ)) |
| Cả một danh sách việc | `docs/TASKS.md`, checklist milestone | Sắp xếp thành roadmap, rồi từng phase một ([mục 5](#5-làm-theo-một-checklist-dài)) |
| Việc liên quan giao diện | Trang mới, form, bảng | Như trên, cộng spec Playwright ([mục 6](#6-làm-giao-diện-frontend--playwright)) |
| Việc cần bạn tự làm | Tạo bucket Cloudflare, xin quyền Facebook, sửa `.env` | Nhờ Claude **hướng dẫn từng bước**, bạn tự thao tác |

Không chắc việc to hay nhỏ? Cứ hỏi Claude: *"Việc này nên làm thẳng hay lập plan?"*

## 2. Bắt đầu một buổi làm việc

1. Mở VS Code ở **đúng thư mục gốc dự án** (`File → Open Folder`).
2. Mở panel Claude (hoặc gõ `claude` trong terminal).
3. Claude **tự nạp** `docs/ai/PROGRESS.md`, plan đang làm dở, branch git và các commit gần nhất. Bạn không cần kể lại hôm qua đã làm gì.
4. Muốn chắc chắn thì hỏi:
   ```
   Đang làm tới đâu rồi? Bước tiếp theo là gì?
   ```
5. Đang có plan dở thì gõ `/implement` để làm tiếp. Chưa có thì chọn cách làm theo [mục 1](#1-chọn-cách-làm-theo-loại-việc).

> ⚠️ **Mỗi dự án chỉ mở 1 phiên Claude tại một thời điểm.** Hai phiên (ví dụ panel VS Code và terminal) cùng sửa code sẽ ghi đè `PROGRESS.md` của nhau và commit lẫn lộn.

## 3. Việc nhỏ: chat bình thường

Cứ nói tự nhiên, càng cụ thể càng tốt:

```
Trang /dashboard/members: đổi nút "Xoá" thành màu đỏ và hỏi xác nhận trước khi xoá.
```

**Chuyện gì xảy ra phía sau:**

1. Claude đọc đúng file liên quan nhờ bản đồ dự án và luật của module (`.claude/rules/`).
2. Sau **mỗi lần sửa file**, hook tự **format và lint** file đó. Có lỗi lint thì Claude tự sửa ngay.
3. Trước khi **trả lời xong**, hook chạy `testCmd`:
   - backend đổi → `go test`
   - frontend đổi → `tsc` + Playwright e2e
   - test fail → Claude **bắt buộc sửa tiếp**, không được báo "xong".
4. Hook bắt Claude **ghi 1–2 dòng vào `PROGRESS.md`** về việc vừa làm.
5. Claude **không tự commit** trừ khi bạn bảo. Muốn commit thì nói: *"commit đi"* (test chạy lại trước khi commit).

**Bạn nên làm:** xem diff mà VS Code hiển thị, thấy ổn thì bảo commit.

> Một lượt sửa nhỏ có thể mất thêm 20 giây đến 1–2 phút vì phải chạy test. Đó là cái giá cho việc "sửa xong là chạy được". Muốn bỏ bắt buộc ghi PROGRESS cho việc nhỏ: `node .claude/hooks/configure.mjs requireProgressUpdate=false`.

## 4. Việc lớn: quy trình đầy đủ

Ví dụ xuyên suốt: **"Kho ảnh R2 — Phase 1: BE storage"**.

### Bước 1: Lập kế hoạch (Claude chỉ đọc, không sửa code)

```
/plan-task Phase 1 kho ảnh R2: package internal/storage cho Cloudflare R2, migration media library, API upload presigned + xác nhận + list
```

Claude sẽ:
- hỏi lại bạn tối đa 3 câu nếu yêu cầu còn mơ hồ (cứ trả lời ngắn gọn),
- cho subagent `explorer` dò code liên quan (không làm đầy bộ nhớ phiên chính),
- viết file `docs/ai/plans/2026-10-02-media-library-r2.md`,
- cập nhật PROGRESS và commit plan.

### Bước 2: Đọc và duyệt plan (bước quan trọng nhất, khoảng 5 phút)

Mở file plan và kiểm tra:

| Kiểm tra | Nếu sai |
|---|---|
| **Mục tiêu** đúng ý bạn chưa? | *"Sửa mục tiêu: chỉ ADMIN được xoá ảnh"* |
| **Danh sách file sẽ sửa** có file lạ không? | *"Không đụng vào internal/worker trong plan này"* |
| **Các bước** đủ nhỏ chưa? Mỗi bước có test chưa? | *"Tách bước 3 thành 2 bước"* |
| **Ngoài phạm vi** có ghi rõ chưa? | *"Thêm vào ngoài phạm vi: giao diện upload"* |
| **Câu hỏi mở** | Trả lời luôn: *"(a) dùng bucket công khai; (b) giới hạn 5MB"* |

Sửa xong, bảo Claude: *"Cập nhật plan theo các ý trên và commit."*

### Bước 3: Dọn bộ nhớ

```
/clear
```

Phần dò đường bị xoá khỏi bộ nhớ. Hook tự nạp lại PROGRESS và plan, nên Claude vẫn biết phải làm gì.

### Bước 4: Làm từng bước

```
/implement
```

Mỗi lần gõ, Claude làm **đúng 1 bước**:

1. Đọc bước chưa tick đầu tiên trong plan.
2. Viết test trước (bước UI thì viết spec Playwright).
3. Viết code.
4. Chạy test của bước, rồi chạy cả `testCmd`.
5. Tick `- [x]` trong plan, cập nhật PROGRESS.
6. Commit: `feat(storage): ...`.
7. Báo lại khoảng 5 dòng: đã làm gì, kết quả test, mã commit, bước tiếp theo.

Bạn xem nhanh diff của commit, ổn thì gõ tiếp `/implement`.

**Biến thể:**
- `/implement all`: chạy liền nhiều bước, tự checkpoint sau mỗi 3 bước. Dùng khi plan đã rất rõ.
- `/implement 4`: làm đúng bước 4.
- Claude dừng lại hỏi ý kiến giữa chừng (ví dụ "chọn cách A hay B?"): trả lời rồi bảo *"tiếp tục bước này"*.

### Bước 5: Kết thúc plan

```
/review-diff main...HEAD
```

Subagent reviewer soi bug, thiếu test, sửa ngoài plan. Chọn *"sửa hết"* hoặc *"chỉ sửa bug"*. Sau đó push.

## 5. Làm theo một checklist dài

**Không** bảo *"làm hết checklist giúp tôi"*. Context sẽ đầy và Claude làm sót hoặc làm sai. Thay vào đó:

**Lần đầu: sắp xếp thành roadmap**

```
Đọc docs/TASKS.md và docs/FRONTEND_TASKS.md. KHÔNG sửa code.
Liệt kê các mục chưa làm, nhóm thành các phase (mỗi phase khoảng 1 ngày), sắp theo thứ tự phụ thuộc,
đánh dấu mục nào là VIỆC CỦA TÔI (cần đăng nhập dịch vụ ngoài, quyết định kinh doanh),
ghi vào docs/ai/ROADMAP.md, mỗi phase trỏ về đúng dòng trong checklist gốc. Commit.
```

**Mỗi phase:**

```
/plan-task Phase 2 trong docs/ai/ROADMAP.md
→ duyệt plan → /clear → /implement (lặp lại) → /review-diff
```

**Xong phase:**

```
Phase 2 xong. Tick [x] các mục tương ứng trong checklist gốc và ROADMAP.md, cập nhật PROGRESS, commit.
```

Rồi `/clear` và sang phase tiếp theo.

## 6. Làm giao diện (frontend + Playwright)

Luật của claude-smart: **mọi thay đổi UI phải có spec Playwright trong cùng commit** (`.claude/rules/ui-e2e.md`).

- Dự án chưa có Playwright → chạy 1 lần: `/e2e-setup frontend`.
- Khi `/implement` một bước UI, Claude sẽ:
  - viết hoặc sửa `frontend/e2e/<tính-năng>.spec.ts`, với backend giả lập bằng `mockApi()`,
  - chạy spec, sửa giao diện cho tới khi pass,
  - nếu có MCP `playwright`: tự mở trình duyệt xem trang, kiểm tra layout và lỗi console.
- Muốn **xem tận mắt** Claude đã test gì:
  ```powershell
  cd frontend
  npm run test:e2e:ui       # mở giao diện Playwright, bấm từng test để xem từng bước
  ```
- Muốn xem ảnh chụp màn hình:
  ```
  Mở /dashboard/content-sources bằng Playwright MCP, chụp màn hình bản desktop và mobile cho tôi xem.
  ```

**Cách mô tả việc UI cho chuẩn:** nói rõ **người dùng thấy gì, bấm gì, kết quả là gì**:

```
Trang Kho ảnh: bảng ảnh có cột Ảnh, Nhãn, Trạng thái. Bấm "Tắt" thì hỏi lý do, gửi PATCH, dòng đó chuyển xám.
Danh sách rỗng hiện "Chưa có ảnh nào". Lỗi API thì hiện nguyên câu lỗi từ backend.
```

Mỗi câu như vậy sẽ thành một test.

## 7. Hỏi về code mà không sửa gì

```
/explore luồng từ lúc quét bài mới đến lúc đăng lên Facebook chạy qua những file nào?
```

Claude cho subagent đi dò rồi trả về bản tóm tắt có `file:dòng`. Câu hỏi đơn giản thì chat thẳng cũng được:

```
Hàm NormalizeTags làm gì? Chỉ giải thích, không sửa.
```

## 8. Khi phiên chat đã dài hoặc cuối ngày

**Dấu hiệu nên dọn:** đã chat hơn khoảng 30–40 phút, Claude bắt đầu quên điều đã thống nhất, trả lời chậm hoặc lan man.

```
/checkpoint
/clear
```

`/checkpoint` ghi lại vào file: đang ở bước nào, cái gì làm dở, quyết định nào đã chốt (ADR). Sau `/clear`, hoặc sáng hôm sau mở lại, Claude đọc lại các file đó và làm tiếp đúng chỗ.

> Đừng tắt VS Code giữa chừng khi Claude đang sửa code. Đợi nó xong lượt, hoặc bấm Esc rồi `/checkpoint`.

## 9. Trước khi push / merge

```
/review-diff main...HEAD
```

Sau đó tự kiểm tra nhanh:
- [ ] `git log --oneline`: các commit nhỏ, có mô tả rõ ràng
- [ ] Plan đã tick hết, hoặc phần còn lại đã ghi vào PROGRESS
- [ ] Không có file lạ trong `git status`
- [ ] Chạy tay `node scripts/claude-smart/test.mjs --all` (hoặc lệnh trong `testCmd`) nếu muốn chắc chắn

## 10. Khi bị hook chặn: đọc và xử lý

Thông báo của hook luôn bắt đầu bằng `claude-smart:`. Claude đọc được và thường tự xử lý. Bạn chỉ cần biết ý nghĩa:

| Thông báo | Nghĩa | Bạn làm gì |
|---|---|---|
| `reading/editing ".env" is blocked (secrets file)` | Claude định đọc/sửa giá trị bí mật | Bình thường: Claude chuyển sang `env.mjs list` để xem tên biến và `env.mjs set` để thêm biến (bạn duyệt). Giá trị bí mật thì bạn tự điền. Thấy vướng quá với `.env` dev local: `configure.mjs envAccess=full` |
| `editing "package-lock.json" is blocked (lockfile)` | Claude định sửa lockfile bằng tay | Bình thường: Claude sẽ dùng `npm install` thay vì sửa tay |
| `editing ".claude/smart.config.json" is blocked` | Claude định nới luật | Nếu thật sự cần đổi, Claude sẽ xin chạy `configure.mjs` và bạn duyệt |
| `command blocked (force push / reset --hard …)` | Lệnh nguy hiểm | Nếu bạn thật sự muốn, tự chạy trong terminal |
| `commit blocked — tests fail` | Test đang fail | Để Claude sửa. Nếu fail do việc không liên quan, bảo Claude ghi vào PROGRESS và hỏi bạn |
| `not done yet … Tests fail` | Claude định dừng khi test còn fail | Claude tự sửa tiếp, tối đa 3 lần rồi báo blocker cho bạn |
| `Code changed but docs/ai/PROGRESS.md was not updated` | Quên ghi tiến độ | Claude tự ghi |
| `lint failed for …` | File vừa sửa có lỗi lint | Claude tự sửa |
| Hộp thoại xin chạy `node .claude/hooks/configure.mjs …` | Claude muốn đổi cấu hình kiểm tra | **Đọc kỹ**: thấy `strict=false`, `testCmd=""` hay tắt kiểm tra mà bạn không yêu cầu thì chọn **No** |

**Claude cứ lặp mãi vì test fail?** Bấm Esc rồi nói:

```
Dừng lại. Ghi lỗi đang gặp vào PROGRESS, giải thích ngắn gọn nguyên nhân và đề xuất 2 cách xử lý.
```

## 11. Mẫu câu lệnh hay dùng

**Bắt đầu và tiếp tục**
```
Đang làm tới đâu rồi? Bước tiếp theo là gì?
/implement
Tiếp tục bước đang dở, đừng làm lại từ đầu.
```

**Kiểm soát phạm vi**
```
Chỉ sửa trong backend/internal/storage, không đụng file khác.
Chỉ giải thích, KHÔNG sửa code.
Trình bày thiết kế trước khi code, chờ tôi duyệt.
```

**Khi kết quả chưa đúng ý**
```
Hoàn tác thay đổi vừa rồi (git), giải thích lại cách bạn hiểu yêu cầu.
Cách này phức tạp quá, đề xuất cách đơn giản hơn trước khi sửa.
Viết test tái hiện bug này trước, chạy cho thấy fail, rồi mới sửa.
```

**Quyết định và ghi nhớ**
```
Ghi quyết định này vào docs/ai/decisions/ (ADR): <nội dung>.
Thêm vào .claude/rules/backend.md: <luật mới>.
```

**Việc của bạn (dịch vụ ngoài)**
```
Hướng dẫn tôi từng bước tạo bucket R2 và API token theo Phase 0, kèm những biến môi trường cần điền.
```

## 12. Nên và không nên

| Nên | Không nên |
|---|---|
| Mô tả **kết quả mong muốn** và ví dụ cụ thể | "Làm cho đẹp hơn", "tối ưu đi" |
| Đọc plan trước khi `/implement` | Duyệt plan mà không đọc |
| Mỗi lần 1 bước, xem diff từng commit | `/implement all` với plan còn mơ hồ |
| `/checkpoint` → `/clear` khi phiên dài | Chat một phiên từ sáng tới tối |
| Để test bắt lỗi, rồi Claude tự sửa | Tắt `strict` cho nhanh |
| Ghi quyết định vào ADR hoặc rules | Chỉ nói trong chat rồi để trôi mất |
| 1 phiên Claude cho mỗi dự án | Mở terminal và panel VS Code cùng sửa code |
| Tự làm việc cần đăng nhập hoặc secret | Dán token hay mật khẩu vào chat |

## 13. Cấu hình cơ bản

Mọi lệnh dưới đây chạy **trong terminal, ở thư mục gốc dự án**. Cấu hình của claude-smart nằm trong `.claude/smart.config.json`. Claude bị chặn sửa thẳng file này, nên mọi thay đổi đi qua `configure.mjs` (khi Claude chạy lệnh này, bạn sẽ được hỏi duyệt). Đổi xong, gõ `/clear` trong Claude để chắc chắn phiên đang chạy nhận cấu hình mới.

### 13.1 Xem cấu hình hiện tại

```powershell
node .claude/hooks/configure.mjs
```

### 13.2 Các thiết lập hay đổi

| Muốn | Lệnh |
|---|---|
| Claude viết plan/PROGRESS/trả lời bằng tiếng Việt | `node .claude/hooks/configure.mjs language=Vietnamese` |
| Trả lời theo ngôn ngữ bạn chat | `node .claude/hooks/configure.mjs language=` |
| Cho Claude đọc/sửa `.env` (chỉ khi toàn giá trị dev) | `node .claude/hooks/configure.mjs envAccess=full` |
| Claude chỉ được xem tên biến `.env` (mặc định) | `node .claude/hooks/configure.mjs envAccess=keys` |
| Cấm hẳn `.env` | `node .claude/hooks/configure.mjs envAccess=block` |
| Đổi lệnh test | `node .claude/hooks/configure.mjs testCmd="npm test"` |
| Việc nhỏ không bắt ghi PROGRESS | `node .claude/hooks/configure.mjs requireProgressUpdate=false` |
| Không chạy test mỗi khi Claude trả lời xong (vẫn chạy trước commit) | `node .claude/hooks/configure.mjs verifyOnStop=false` |
| Cho commit dù test fail (không khuyến khích) | `node .claude/hooks/configure.mjs testBeforeCommit=false` |
| Test chạy lâu, tăng thời gian chờ (giây) | `node .claude/hooks/configure.mjs testTimeoutSec=1200` |
| Claude được thử sửa tối đa N lần khi test fail rồi dừng | `node .claude/hooks/configure.mjs maxStopRetries=5` |
| Tắt hết kiểm tra test/lint (vẫn chặn file nhạy cảm và lệnh nguy hiểm) | `node .claude/hooks/configure.mjs strict=false` |
| Bật lại | `node .claude/hooks/configure.mjs strict=true` |

Đổi nhiều thứ một lúc cũng được:

```powershell
node .claude/hooks/configure.mjs language=Vietnamese envAccess=keys requireProgressUpdate=false
```

### 13.3 Thiết lập dạng danh sách (`protectedPaths`, `fileGlobs`)

Giá trị phải là mảng JSON và **ghi đè cả danh sách**, nên nhớ giữ lại các mục cũ.

```powershell
# Windows PowerShell 5.1: phải viết dấu " bên trong thành \"
node .claude/hooks/configure.mjs 'protectedPaths=[\".claude/settings.json\",\".claude/hooks/**\",\".claude/smart.config.json\",\"backend/migrations/**\"]'
```

```bash
# Git Bash / macOS / Linux / PowerShell 7
node .claude/hooks/configure.mjs 'protectedPaths=[".claude/settings.json",".claude/hooks/**",".claude/smart.config.json","backend/migrations/**"]'
```

> Ngại gõ? Nói với Claude: *"Thêm `backend/migrations/**` vào protectedPaths."* Claude sẽ tự chạy `configure.mjs` và bạn chỉ việc bấm duyệt.

### 13.4 Bộ cấu hình mẫu

**Nghiêm ngặt (mặc định, khuyến nghị cho code quan trọng):**
```powershell
node .claude/hooks/configure.mjs strict=true testBeforeCommit=true verifyOnStop=true requireProgressUpdate=true envAccess=keys
```

**Nhẹ (làm nhanh nhiều việc nhỏ, vẫn chặn commit khi test fail):**
```powershell
node .claude/hooks/configure.mjs verifyOnStop=false requireProgressUpdate=false
```

**Tạm tắt khi debug / thử nghiệm** (nhớ bật lại):
```powershell
node .claude/hooks/configure.mjs strict=false
# ... thử nghiệm xong ...
node .claude/hooks/configure.mjs strict=true
```

### 13.5 Quyền riêng của bạn (`.claude/settings.local.json`)

File này **không commit** (đã nằm trong `.gitignore`), chỉ áp dụng cho máy bạn. Dùng để bớt bị hỏi quyền cho các lệnh bạn tin tưởng. Tạo file `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(go test *)",
      "Bash(go build *)",
      "Bash(npx tsc *)",
      "Bash(npx playwright test*)",
      "Bash(docker compose ps*)"
    ]
  }
}
```

- `allow`: không hỏi nữa. `ask`: luôn hỏi. `deny`: cấm hẳn.
- **Đừng** thêm `Bash(node .claude/hooks/configure.mjs*)` vào `allow`. Đây là chốt để bạn kiểm soát việc nới luật.
- Cấu hình dùng chung cho cả team (`.claude/settings.json`) bị bảo vệ; muốn sửa thì sửa tay rồi commit.

### 13.6 MCP servers

```powershell
node E:\start-up\claude-smart\install.mjs --list-mcp                         # xem có gì
node E:\start-up\claude-smart\install.mjs . --mcp-only --mcp=playwright,context7
```

Trong Claude, gõ `/mcp` để xem server nào đang chạy. Server cần biến môi trường (`DATABASE_URI`, `GITHUB_PERSONAL_ACCESS_TOKEN`…) thì đặt biến trong terminal trước khi mở `claude`/VS Code.

### 13.7 Kiểm tra nhanh mọi thứ còn chạy đúng

```powershell
node .claude/hooks/configure.mjs                  # cấu hình
node .claude/hooks/env.mjs list                   # tên biến .env (không lộ giá trị)
node E:\start-up\claude-smart\install.mjs --doctor  # công cụ đã cài
node E:\start-up\claude-smart\install.mjs . --dry-run   # có bản claude-smart mới cần cập nhật không
```

Trong Claude: `/hooks` (hook đã bật), `/agents`, `/mcp`.

## 14. Câu hỏi thường gặp

**Chat bình thường có bị hạn chế gì không?**
Không. Bạn hỏi và sửa như trước. Khác biệt duy nhất là hook kiểm tra test và PROGRESS trước khi Claude trả lời xong ([mục 3](#3-việc-nhỏ-chat-bình-thường)).

**Claude trả lời bằng tiếng Anh?**
Kiểm tra `language` trong `.claude/smart.config.json` (`node .claude/hooks/configure.mjs` để xem). Đặt bằng `node .claude/hooks/configure.mjs language=Vietnamese`, rồi `/clear`.

**Claude cần biến môi trường mới (ví dụ `R2_BUCKET`)?**
Claude sẽ chạy `node .claude/hooks/env.mjs set R2_BUCKET --file backend/.env` (hiện hộp thoại để bạn duyệt), thêm luôn vào `.env.example`, rồi nhắc bạn điền giá trị. Muốn Claude đọc/sửa `.env` thoải mái (khi chỉ là giá trị dev): `node .claude/hooks/configure.mjs envAccess=full`.

**Plan cũ còn tiếng Anh?**
*"Dịch docs/ai/plans/<file>.md sang tiếng Việt, giữ nguyên checkbox, đường dẫn, tên hàm."*

**Muốn bỏ một bước trong plan?**
*"Bỏ bước 5 khỏi plan (ghi lý do vào mục Ngoài phạm vi), commit."*

**Muốn đổi kế hoạch giữa chừng?**
Đừng sửa miệng khi Claude đang code. Bấm Esc, rồi *"Cập nhật plan: … Chưa code."*, duyệt xong mới `/implement`.

**Test chạy lâu quá?**
Frontend lần đầu chậm (khởi động `next dev`), các lần sau khoảng 20 giây. Để mở sẵn `npm run dev` trên cổng 3100 thì e2e dùng lại server đó, nhanh hơn. Hoặc thu gọn `testCmd` ([INSTALL.md mục 7](INSTALL.md#7-tinh-chỉnh-cấu-hình)).

**Claude làm sai, muốn quay lại?**
Mỗi bước là 1 commit nên rất dễ: *"Revert commit <mã> và giải thích vì sao bước đó sai."*

**Khi nào chạy lại `/bootstrap`?**
Khi kiến trúc thay đổi lớn (thêm service mới, đổi framework). Việc thường ngày thì không cần.
