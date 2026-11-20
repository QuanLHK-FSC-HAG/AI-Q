# AI-Q M1 — Implementation Checklist

> Cập nhật phiên thực thi 2026-11-16. Fork làm việc: `D:\codex\AI-Q\AIQ-fork` (từ commit pin `73abe63ac23224d88e739e7028882e547ef65a79`).

## ✅ Đã hoàn thành

### Fork & toolchain
- [x] Tạo fork working copy từ upstream commit pin (ngoài audit checkout `upstream-AIQ/`)
- [x] `bun install --frozen-lockfile` ✅

### Source delta M1 (rebrand)
- [x] `packages/desktop/src/main/constants.ts` — app `AI-Q` / `AI-Q Dev` / `AI-Q Beta`, appId `com.quanlhk.AIQ.desktop(.dev/.beta)`
- [x] `packages/desktop/electron-builder.config.ts` — artifactName `AI-Q-Setup-${os}-${arch}.${ext}`, productName, protocol scheme `AIQ`, appId AI-Q, rpm packageName `AIQ`/`AIQ-dev`/`AIQ-beta`
- [x] Deep-link: `lifecycle/deep-link.ts` (scheme `AIQ:`), `environment.ts` (`setAsDefaultProtocolClient("AIQ")`), `lifecycle/index.ts` (argv `AIQ://`)
- [x] `service/background-service.ts` — service file `AIQ/service-local.json`
- [x] Window/page title → `AI-Q` (`windows/early.ts`, `windows/appearance.ts`, `renderer/index.html`)
- [x] i18n: fallback locale → `vi`, native copy → `AI-Q` (`packages/app/src/runtime/i18n/language.tsx`, `desktop-native.ts`)
- [x] `script/pack.ts` — artifact names `AI-Q-Setup-win-*` / `AI-Q-Setup-mac-*`
- [x] `script/copy-metainfo.ts` — appId/productName/description → AI-Q
- [x] `script/dev-electron.ts` — dev bundle `AI-Q Dev.app`, plist `AI-Q Dev` / `com.quanlhk.AIQ.desktop.dev`
- [x] **Attribution + notices AI-Q**: `en.ts` — `settings.about.description` → "AI-Q, the open source coding agent", `settings.about.notices.description` → "AI-Q includes…", thêm key `settings.about.attribution` = "Designed by QuanLHK with AI Vibe Coding"; `vi.ts` — mô tả → AI-Q + attribution "Thiết kế bởi QuanLHK cùng AI Vibe Coding"; `about.tsx` — hiển thị dòng attribution trong khối details. Giữ nguyên credits/copyright/trademark upstream (tuân thủ MIT).
- [x] **Brand assets AI-Q** (từ `AI-Q.png` 1600×1600):
  - OS icons tái tạo toàn bộ bộ `icons/{dev,beta,prod}` — mark (glyph Q) cho ≤128px, full logo cho ≥256px; `.ico` (16–256) và `.icns` (32→1024) đa kích thước khớp đúng bộ gốc; `dock.png`, linux PNGs, store logos, android/ios, `prod/icon.icon` (Icon Composer 1024)
  - Favicon: `ui/src/assets/favicon/*` sinh lại (nền `#131010`, SVG nhúng PNG mark), `site.webmanifest` → name/short_name AI-Q
  - `packages/app/public/*` (trước là các symlink stub 42-byte trên Windows) → copy file favicon thật để bản local Windows hiển thị đúng
  - UI mới: `AIQLogo`/`AIQMark` trong `ui/src/components/logo.tsx` (asset `ui/src/assets/brand/AIQ-logo.png`, `AIQ-mark.png`)
  - Thay thế: splash fallback (mark) + first-launch splash (logo, animation fade mới thay cho wordmark draw), side-region mark, error page logo, connect-server brand (aria-label `AI-Q`)
  - `resources/icons` refresh (dev), `bun run build` ✓, `bun run dev` khởi động sạch (cửa sổ + splash AI-Q hiện)

### Tests cập nhật theo delta (bun test <file>)
- [x] `electron-builder.config.test.ts` — 11/11 pass (channels → AI-Q appIds)
- [x] `lifecycle/deep-link.test.ts` + `deep-links/machine.test.ts` — 21/21 pass (scheme `AIQ://`)
- [x] `script/windows-installer.test.ts` — 3/4 pass (test "installs each channel into a directory named after its app ID" với AI-Q appId PASS; case còn lại fail do **môi trường thiếu `pwsh`**, không phải do M1)
- [x] `services/update/test/index.test.ts` — 30/30 pass (giữ nguyên upstream; đã thử đổi rồi revert)
- [x] `services/site/test/legacy.test.ts` — 7/7 pass (revert; không thuộc phạm vi M1)
- [x] `packages/app` i18n + about tests — 38 pass; 1 fail `language.test.ts` do lỗi **pre-existing** (`jsxDEV` của solid-js, xác nhận fail y hệt trên checkout upstream gốc)

### Verification
- [x] **AI-Q Mix (native quota mixing) verification**: `packages/core` typecheck **pass** (1,986 files, 0 errors); `packages/server` typecheck **pass** after adding `mix.get`/`mix.set` handler + routes (+ `Mix` in Context.pick); client `bun run generate` re-run after `/api/experimental/mix` HTTP API additions; `packages/core` mix/model-resolver/credential/integration/plugin tests **pass** (78 + 101 + 140 + 54 pass, 0 fail); `bunx oxlint` on touched areas **0 errors** (1 pre-existing warning in `packages/app/src/settings/workspaces/project-lsp.ts`); new `test/mix.test.ts` **5/5 pass**.
- [x] `bun run build` (packages/desktop, fork) — ✅ `built in 25.17s` (sau toàn bộ delta)
- [x] Typecheck: chặn bởi lỗi **pre-existing upstream** (`packages/app/src/custom-elements.d.ts` TS1128) — xuất hiện cả ở checkout gốc, không do M1

## ⏳ Còn lại (M1 follow-up / gate)

- [ ] **Publish/update feed AI-Q**: các URL `https://AIQ.example/update/api/...` trong electron-builder config chưa đổi — chủ dự án sẽ tính sau khi push GitHub (bản chạy local không cần domain)
- [ ] **New-session wordmark**: hình “lodger/pin board” tương tác (~1200 dòng, viewBox 234×42) vẫn là wordmark AI-Q — chờ quyết định thiết kế AI-Q cho header này
- [ ] Dọn còn sót brand upstream ngoài phạm vi delta nhỏ: tên CLI binary (`~/.AIQ/bin/AIQ`), storage key `AIQ.global.dat`, MCP meta `ai.AIQ/sessionID`, AI-Q provider icon (giữ nguyên — là brand nhà cung cấp AI-Q) — chờ quyết định (chuyển M2+ hoặc giữ tương thích)
- [ ] Gate M1: cài song song AI-Q/AI-Q trên Windows sạch; kiểm tra userData (`%APPDATA%\com.quanlhk.AIQ.desktop`) và deep-link `AIQ://` không chiếm của AI-Q
- [ ] Repo fork chưa có git (môi trường không có git CLI) — cần init/commit khi có (chủ dự án sẽ push GitHub sau)

## Gate chưa chốt (chủ dự án)

- D01 (Windows 10) — cần chốt trước M1 release
- Update feed domain (M5) — ảnh hưởng publish URL trong electron-builder config
