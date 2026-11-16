# Q-AI M1 — Implementation Checklist

> Cập nhật phiên thực thi 2026-11-16. Fork làm việc: `D:\codex\Q-AI\qai-fork` (từ commit pin `73abe63ac23224d88e739e7028882e547ef65a79`).

## ✅ Đã hoàn thành

### Fork & toolchain
- [x] Tạo fork working copy từ upstream commit pin (ngoài audit checkout `upstream-opencode/`)
- [x] `bun install --frozen-lockfile` ✅

### Source delta M1 (rebrand)
- [x] `packages/desktop/src/main/constants.ts` — app `Q-AI` / `Q-AI Dev` / `Q-AI Beta`, appId `com.quanlhk.qai.desktop(.dev/.beta)`
- [x] `packages/desktop/electron-builder.config.ts` — artifactName `Q-AI-Setup-${os}-${arch}.${ext}`, productName, protocol scheme `qai`, appId Q-AI, rpm packageName `qai`/`qai-dev`/`qai-beta`
- [x] Deep-link: `lifecycle/deep-link.ts` (scheme `qai:`), `environment.ts` (`setAsDefaultProtocolClient("qai")`), `lifecycle/index.ts` (argv `qai://`)
- [x] `service/background-service.ts` — service file `qai/service-local.json`
- [x] Window/page title → `Q-AI` (`windows/early.ts`, `windows/appearance.ts`, `renderer/index.html`)
- [x] i18n: fallback locale → `vi`, native copy → `Q-AI` (`packages/app/src/runtime/i18n/language.tsx`, `desktop-native.ts`)
- [x] `script/pack.ts` — artifact names `Q-AI-Setup-win-*` / `Q-AI-Setup-mac-*`
- [x] `script/copy-metainfo.ts` — appId/productName/description → Q-AI
- [x] `script/dev-electron.ts` — dev bundle `Q-AI Dev.app`, plist `Q-AI Dev` / `com.quanlhk.qai.desktop.dev`
- [x] **Attribution + notices Q-AI**: `en.ts` — `settings.about.description` → "Q-AI, the open source coding agent", `settings.about.notices.description` → "Q-AI includes…", thêm key `settings.about.attribution` = "Designed by QuanLHK with AI Vibe Coding"; `vi.ts` — mô tả → Q-AI + attribution "Thiết kế bởi QuanLHK cùng AI Vibe Coding"; `about.tsx` — hiển thị dòng attribution trong khối details. Giữ nguyên credits/copyright/trademark upstream (tuân thủ MIT).
- [x] **Brand assets Q-AI** (từ `Q-AI.png` 1600×1600):
  - OS icons tái tạo toàn bộ bộ `icons/{dev,beta,prod}` — mark (glyph Q) cho ≤128px, full logo cho ≥256px; `.ico` (16–256) và `.icns` (32→1024) đa kích thước khớp đúng bộ gốc; `dock.png`, linux PNGs, store logos, android/ios, `prod/icon.icon` (Icon Composer 1024)
  - Favicon: `ui/src/assets/favicon/*` sinh lại (nền `#131010`, SVG nhúng PNG mark), `site.webmanifest` → name/short_name Q-AI
  - `packages/app/public/*` (trước là các symlink stub 42-byte trên Windows) → copy file favicon thật để bản local Windows hiển thị đúng
  - UI mới: `QaiLogo`/`QaiMark` trong `ui/src/components/logo.tsx` (asset `ui/src/assets/brand/qai-logo.png`, `qai-mark.png`)
  - Thay thế: splash fallback (mark) + first-launch splash (logo, animation fade mới thay cho wordmark draw), side-region mark, error page logo, connect-server brand (aria-label `Q-AI`)
  - `resources/icons` refresh (dev), `bun run build` ✓, `bun run dev` khởi động sạch (cửa sổ + splash Q-AI hiện)

### Tests cập nhật theo delta (bun test <file>)
- [x] `electron-builder.config.test.ts` — 11/11 pass (channels → Q-AI appIds)
- [x] `lifecycle/deep-link.test.ts` + `deep-links/machine.test.ts` — 21/21 pass (scheme `qai://`)
- [x] `script/windows-installer.test.ts` — 3/4 pass (test "installs each channel into a directory named after its app ID" với Q-AI appId PASS; case còn lại fail do **môi trường thiếu `pwsh`**, không phải do M1)
- [x] `services/update/test/index.test.ts` — 30/30 pass (giữ nguyên upstream; đã thử đổi rồi revert)
- [x] `services/site/test/legacy.test.ts` — 7/7 pass (revert; không thuộc phạm vi M1)
- [x] `packages/app` i18n + about tests — 38 pass; 1 fail `language.test.ts` do lỗi **pre-existing** (`jsxDEV` của solid-js, xác nhận fail y hệt trên checkout upstream gốc)

### Verification
- [x] `bun run build` (packages/desktop, fork) — ✅ `built in 25.17s` (sau toàn bộ delta)
- [x] Typecheck: chặn bởi lỗi **pre-existing upstream** (`packages/app/src/custom-elements.d.ts` TS1128) — xuất hiện cả ở checkout gốc, không do M1

## ⏳ Còn lại (M1 follow-up / gate)

- [ ] **Publish/update feed Q-AI**: các URL `https://opencode.ai/update/api/...` trong electron-builder config chưa đổi — chủ dự án sẽ tính sau khi push GitHub (bản chạy local không cần domain)
- [ ] **New-session wordmark**: hình “lodger/pin board” tương tác (~1200 dòng, viewBox 234×42) vẫn là wordmark OpenCode — chờ quyết định thiết kế Q-AI cho header này
- [ ] Dọn còn sót brand upstream ngoài phạm vi delta nhỏ: tên CLI binary (`~/.opencode/bin/opencode`), storage key `opencode.global.dat`, MCP meta `ai.opencode/sessionID`, OpenCode provider icon (giữ nguyên — là brand nhà cung cấp OpenCode) — chờ quyết định (chuyển M2+ hoặc giữ tương thích)
- [ ] Gate M1: cài song song OpenCode/Q-AI trên Windows sạch; kiểm tra userData (`%APPDATA%\com.quanlhk.qai.desktop`) và deep-link `qai://` không chiếm của OpenCode
- [ ] Repo fork chưa có git (môi trường không có git CLI) — cần init/commit khi có (chủ dự án sẽ push GitHub sau)

## Gate chưa chốt (chủ dự án)

- D01 (Windows 10) — cần chốt trước M1 release
- Update feed domain (M5) — ảnh hưởng publish URL trong electron-builder config
