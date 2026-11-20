# AI-Q: Báo cáo kỹ thuật chi tiết Milestone 0 (Audit & Chuẩn bị M1)

Thời gian hoàn thành: 2026-11-13 (phiên thực thi M0 — phân luồng audit cho subagent + tự xác minh toolchain); cập nhật nội dung báo cáo: 2026-11-13.
Trạng thái: Hoàn thành Audit kiến trúc mã nguồn upstream, cài đặt runtime và xác lập ranh giới an toàn.

---

## 1. Upstream & Ranh giới kỹ thuật

- **Nguồn:** `https://github.com/QuanLHK-FSC-HAG/AI-Q`
- **Commit cố định (Pinned Commit):** `73abe63ac23224d88e739e7028882e547ef65a79` (branch `dev`, package version `2.2.7`).
  - Xác nhận qua `.git/HEAD`, `.git/refs/heads/dev`, `.git/packed-refs`, `.git/logs/HEAD` → **verified** (HEAD = `refs/heads/dev` → `73abe63...`; origin/dev trùng commit).
  - `git` CLI không khả dụng trong môi trường audit → kiểm tra CLI là **untested**; dùng fallback đọc file git metadata.
- **Runtime / stack:** TypeScript, Bun `1.4.4` (`packageManager: bun@1.4.4`, verified qua `bun --version`), Node `v24.19.0`, Turbo, Effect-TS, SolidJS, Electron 44.9.1, electron-builder 26.15.7, electron-vite 6.0.0-beta.1; các package `@AIQ/*` ở version `2.2.7`, license MIT.
- **Desktop build stack:** Electron 44.9.1, app-builder-lib 26.15.7, electron-updater 6.8.9, electron-context-menu, electron-log, lighthouse, `@zip.js/zip.js` ([VERIFIED] từ `packages/desktop/package.json`).
- **Kiến trúc MVP:** không cần thêm Python/WebView2 cho MVP — tái sử dụng kiến trúc upstream ([INFERRED] từ PRD/F&V; M0 không thêm).

## 2. License & Release pipeline

- **License upstream:** MIT (`LICENSE` + `package.json` license MIT) — **verified**.
- **Third-party notices:** BetterOffice (Apache-2.0), eigenpal docx-editor (Apache-2.0), figma NOTICE (MIT không cấp phép lại tài sản third-party) — **verified**.
- **Release pipeline:** `.github/workflows/release.yml` (plan → verify → tag → build → sign → publish; NSIS/Win + macOS signing, R2 publish, Winget/GitHub/Homebrew/AUR/Docker publish), `deploy-update.yml` (update Worker production), `nightly-beta.yml`, `release-process-daemon.yml` — **verified** qua đọc workflow/scripts.

## 3. Bản đồ thay đổi nhận diện cho M1 (Rebranding Mapping) — **KẾT QUẢ AUDIT: CHƯA ÁP DỤNG**

Bảy vị trí mapping từ `M0_AUDIT_REPORT.md` §2 được kiểm tra lại tại commit đã pin — **đều xác nhận rằng giá trị gốc vẫn hiện hữu, chưa có giá trị AI-Q**:

| # | Thành phần | Vị trí mã nguồn | Giá trị gốc | Giá trị mới AI-Q | Kết quả |
|---|---|---|---|---|---|
| 1 | Tên ứng dụng | `packages/desktop/src/main/constants.ts` | `AI-Q` / `AI-Q Dev` | `AI-Q` / `AI-Q Dev` | **[VERIFIED]** chưa áp dụng |
| 2 | Application ID | `packages/desktop/src/main/constants.ts` | `ai.AIQ.desktop[.dev/.beta]` | `com.quanlhk.AIQ.desktop` | **[VERIFIED]** chưa áp dụng |
| 3 | Cấu hình Build / artifact | `packages/desktop/electron-builder.config.ts` | `AIQ-desktop-${os}-${arch}.${ext}`, scheme `AIQ` | `AI-Q-Setup-win-x64.exe`, scheme `AIQ://` | **[VERIFIED]** chưa áp dụng |
| 4 | Deep-link Scheme | `packages/desktop/src/main/lifecycle/deep-link.ts`, `environment.ts`, `index.ts`, `deep-links/` | `AIQ:` / `AIQ://` | `AIQ://` | **[VERIFIED]** chưa áp dụng |
| 5 | Thư mục dữ liệu (userData) | `packages/desktop/src/main/lifecycle/configure.ts` | `%APPDATA%\ai.AIQ.desktop` | `%APPDATA%\com.quanlhk.AIQ.desktop` | **[VERIFIED]** chưa áp dụng |
| 6 | Background Service file | `packages/desktop/src/main/service/background-service.ts` | `<state>/AIQ/service-local.json` | `<state>/AIQ/service-local.json` | **[VERIFIED]** chưa áp dụng |
| 7 | Ngôn ngữ mặc định | `packages/app/src/runtime/i18n/language.tsx`, `desktop-native.ts`, `packages/desktop/src/renderer/startup/locale.ts` | fallback `en` (vi-VN đã tồn tại) | `vi-VN` | **[VERIFIED]** mặc định hiện là `en` |

- Ngoài 7 vị trí trên, các chuỗi brand còn sót ở desktop: window titles (`windows/early.ts`, `windows/appearance.ts`), page title (`renderer/index.html`), native i18n copy (`desktop.menu.app`, recovery, CLI strings), favicon URL, IPC/storage namespaces (`AIQ.global.dat`, `AIQ.settings`), context IDs (`AIQ/desktop/*`), log filenames — **[VERIFIED]** qua grep đọc mã nguồn.
- Installer naming AI-Q (`AI-Q-Setup.exe`, executable `AI-Q.exe`) là [INFERRED] từ PRD vs. M0 table (`AI-Q-Setup-win-x64.exe`); `artifactName` là ống dẫn xuất duy nhất cho tên exe.

## 4. Computer Use & Browser plugin — điểm nối đã xác định

- **Browser plugin:** server owns tools/invocation/permissions; desktop owns tabs/CDP/captures/evaluations; RPC `experimental.browser` (attach/state/command/result + control), version 4; tunnel proxy localhost; DevTools hiện **disabled** ([VERIFIED]).
- **Computer Use:** các điểm nối tới permission/tool/stop/audit đã được xác định tại seams hiện có (`Permission` actions, `whollyDisabled`, tool hooks, interrupt/cancel) — design M3/M4 của AI-Q cần bổ sung emergency stop + audit chưa có sẵn ([VERIFIED] seams; design-driven gaps).
- **Lưu ý:** `FOUNDATION_AND_MVP.md` và `AI-Q_MASTER_PLAN_AND_CODEX_PROMPT.md` có sự khác biệt về số thứ tự milestone M3/M4 (browser vs Computer Use) — cần làm rõ khi lên kế hoạch.

## 5. Toolchain & kết quả kiểm thử (package-level, run/not run)

- **Bun:** `bun --version` → `1.4.4` ✅; `packageManager: bun@1.4.4` ✅; Node `v24.19.0` ✅.
- **`bun install --frozen-lockfile`** (upstream root): ✅ thành công (1658 installs, no changes; có warnings về stale patches/platform skip).
- **`bun test`** (package `packages/core`, `--timeout 30000`): ✅ chạy được qua Bun; 322 files / 7470 tests → **5849 pass, 1460 skip, 161 fail**. Fail chủ yếu nằm ở nhóm phụ thuộc git/môi trường (git CLI thiếu) — chưa rút ngắn là lỗi code.
- **`bun run build`** (package `packages/desktop`): ✅ **built in 32.59s** (electron-vite; renderer + main build thành công).
- **Chưa chạy:** `bun --cwd packages/desktop build/pack` (NSIS installer), `bun run dev:desktop`, E2E Windows, smoke install trên máy sạch, typecheck toàn repo.

## 6. Ma trận rủi ro (tóm tắt M0)

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| Rebrand chưa áp dụng (7 vị trí + chuỗi brand còn sót) | Cao | Đây là nền tảng cho M1 |
| NSIS installer / signing / update feed chưa verify thực tế | Cao | Cần M1 release |
| Computer Use mặc định off — chưa code | Trung bình | Design gate D08 |
| Bun install/test/build thành công; test fail do môi trường | Trung bình | Cần triage M2+ |
| Git CLI thiếu trong môi trường audit | Thấp/Trung bình | Ảnh hưởng test VCS + xác minh commit |

## 7. Danh sách quyết định cần người dùng xác nhận (gates trước khi M1/M2…)

- **D01** Windows 10: `Cần chốt trước M1 release`.
- **D02** Runtime: `Tạm chọn` (Bun 1.4.4 verified) — pin version cho build.
- **D03** Offline: `Tạm chọn` — cần test M2.
- **D04** Model/chi phí: `Tạm chọn` — cần chốt policy M2.
- **D05** Tài khoản/đồng bộ: `Tạm chọn` — cần chốt trước M4.
- **D06** Nguồn giáo dục: `Tạm chọn` — cần chốt trước M4.
- **D07** Duyệt Skill: `Cần xác nhận trước M4`.
- **D08** Computer Use: `Tạm chọn` (mặc định off) — cần chốt retention/UX trước M3.
- **D09** Cập nhật/ký số: `Cần chốt` trước M5.
- **D10** Skill đầu tiên: `Tạm chọn` — cần xác nhận M2.
- **D11** DOCX trong MVP: `Cần chốt` sau feasibility M0.

## 8. Kế hoạch M1 sau audit (đề xuất ADR fork/pin + danh sách thay đổi nhỏ)

- **ADR đề xuất:** fork AI-Q pin commit upstream `73abe63ac23224d88e739e7028882e547ef65a79` (dev, v2.2.7, MIT); giữ notices/copyright; phát hành thủ công; không auto-update.
- **Danh sách thay đổi nhỏ cho M1 (theo thứ tự có thể kiểm thử):**
  1. `packages/desktop/src/main/constants.ts`: appNames/appIDs theo channel → `AI-Q` / `com.quanlhk.AIQ.desktop`.
  2. `packages/desktop/electron-builder.config.ts`: artifactName (`AI-Q-Setup-win-x64.exe`…), productName, protocol scheme `AIQ`, publish feed riêng.
  3. Deep-link files + tests: scheme `AIQ`, argv prefix, event names.
  4. `packages/desktop/src/main/lifecycle/configure.ts`: userData `%APPDATA%\com.quanlhk.AIQ.desktop`.
  5. `packages/desktop/src/main/service/background-service.ts`: service file `AIQ/service-local.json`.
  6. Locale default → `vi-VN` + native i18n rebrand copy.
  7. Installer/metadata: NSIS, metainfo, About/splash/footer attribution `Designed by QuanLHK with AI Vibe Coding`.
  8. Kiểm tra notices/license cho installer AI-Q.

## 9. Bước tiếp theo

- M0 audit đã đủ đầu ra theo prompt: commit pin ✅, stack/licensing ✅, ma trận rủi ro ✅, test run/not run ✅ (build ✅, test có fail môi trường), danh sách quyết định cần xác nhận ✅, kế hoạch M1 ✅.
- Chờ chủ dự án chốt các gate (D01, D07–D11, …) → mới bắt đầu M1.
