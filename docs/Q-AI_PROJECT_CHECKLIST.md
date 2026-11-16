# Q-AI — Project Checklist & Progress

> Cập nhật: 16/11/2026  
> Phạm vi: toàn bộ fork tại `qai-fork/`. Không thay đổi `upstream-opencode/`.
>
> **Lưu ý phát hành:** các namespace/protocol/package kỹ thuật `opencode` / `@opencode/*` vẫn được giữ ở những nơi cần thiết để tương thích. Đây không phải nhận diện hiển thị cho người dùng.

## Trạng thái tổng quan

| Hạng mục | Trạng thái |
| --- | --- |
| Audit và khóa nền fork | ✅ Hoàn thành |
| Cài dependency tái lập | ✅ Hoàn thành |
| Nhận diện desktop / installer Q-AI | ✅ Hoàn thành |
| Logo, icon, splash, favicon | ✅ Hoàn thành |
| UI Việt hóa và Q-AI branding | 🟡 Đã làm phần lớn, cần rà soát cuối |
| Xóa wordmark/toy OpenCode ở trang Home | 🟡 Đã thay source, cần kiểm tra trực quan runtime |
| Kiểm tra build sau sweep rebrand | 🟡 Đang xác thực cuối |
| README/docs/website public Q-AI | 🟡 Đã rebrand 251 file; còn rà soát phát hành |
| GitHub repository | ✅ Đã tạo: `QuanLHK-FSC-HAG/Q-AI` |
| Push, release, domain/feed | ⬜ Chưa thực hiện |

---

## ✅ Đã hoàn thành

### 1. Audit, nền fork và dependencies
- [x] Hoàn thành M0 audit; lưu tại `M0_AUDIT_REPORT.md`.
- [x] Tạo working copy `qai-fork/` từ upstream pin `73abe63ac23224d88e739e7028882e547ef65a79`.
- [x] Không sửa thư mục `upstream-opencode/`.
- [x] `bun install --frozen-lockfile` đã pass.
- [x] Lưu danh sách thay đổi/pin tại `M1_FORK_PIN_AND_CHANGE_LIST.md`.

### 2. Desktop identity và installer
- [x] Đổi tên ứng dụng desktop thành **Q-AI**.
- [x] Đổi application IDs sang `com.quanlhk.qai.desktop` (bao gồm dev/beta).
- [x] Đổi deep-link hiển thị sang `qai://`.
- [x] Đổi artifact installer sang `Q-AI-Setup-*`.
- [x] Cập nhật metainfo, NSIS app IDs và tên executable theo Q-AI.
- [x] Tạo icon desktop/dev/beta/prod từ `Q-AI.png`: ICO, ICNS và favicon.
- [x] Đổi splash, error page, connect-server và side-region sang dùng logo/mark Q-AI.

### 3. Assets và nhận diện UI
- [x] Thêm `QaiLogo` và `QaiMark` trong `packages/ui/src/components/logo.tsx`.
- [x] Thêm assets renderer tại `packages/ui/src/assets/brand/qai-logo.png` và `qai-mark.png`.
- [x] Bản build renderer đã sinh các asset `qai-logo-*` và `qai-mark-*`.
- [x] Thay wordmark/trò chơi tương tác OpenCode ở Home bằng logo Q-AI tĩnh trong source.
- [x] Thêm watermark: **`Designed by QuanLHK with AI`**.
- [x] Cập nhật trang About dùng Q-AI mark và attribution mới.
- [x] Bỏ setting/interface sound cũ cùng row UI liên quan.

### 4. Copy, locale và provider display
- [x] Cập nhật copy hiển thị tiếng Anh và tiếng Việt theo thương hiệu Q-AI.
- [x] Thêm khóa `home.watermark` và attribution vào locale.
- [x] Profile local mặc định đã đặt locale `vi`; app từng xác nhận title `Q-AI | vi-VN`.
- [x] Đổi nhãn hosted display thành: `Q-AI Zen`, `Q-AI Go`, `Q-AI Console`.
- [x] Thay các text người dùng thấy `OpenCode` bằng `Q-AI` trên phần lớn app/desktop/site/docs thông qua sweep có kiểm soát.
- [x] Khôi phục các binding TypeScript nội bộ `OpenCode` bị sweep nhầm trong import/export/dynamic import để không phá code.

### 5. Tài liệu công khai và repository
- [x] Xác nhận public repository: `https://github.com/QuanLHK-FSC-HAG/Q-AI`.
- [x] Viết lại README chính (Anh + Việt) theo nhận diện Q-AI, hướng dẫn Windows local và attribution.
- [x] Rebrand 251 public README/MD/MDX: prose `OpenCode` → `Q-AI`; link trang chủ/docs/download/community/upstream → repository Q-AI, Releases hoặc Discussions.
- [x] Đổi 22 README đa ngôn ngữ sang dùng asset `.github/assets/qai-logo.png`.
- [x] Lưu báo cáo phạm vi tại `Q-AI_DOCUMENTATION_REBRAND.md`.
- [ ] Rà soát tài liệu trước phát hành: lệnh, endpoint, package/API identifier trong inline/fenced code vẫn giữ tương thích cho đến khi runtime được migrate.

### 6. Chạy local và kiểm tra đã pass
- [x] Xác định và xử lý lỗi Electron không tìm thấy Bun (`spawn bun ENOENT`): cần đặt Bun bin vào `PATH` khi dev local.
- [x] Khôi phục watcher local service dùng `opencode/service-local.json`; đây là đường dẫn kỹ thuật CLI hiện vẫn ghi.
- [x] Xác nhận sidecar local từng chạy thành công: `v2 CLI background service ready` tại `http://127.0.0.1:3084`.
- [x] `electron-builder.config.test.ts`: **11/11 pass**.
- [x] Deep-link tests: **21/21 pass**.
- [x] Update service tests: **30/30 pass**.
- [x] Site legacy tests: **7/7 pass**.
- [x] Desktop build đã từng pass trước sweep; build lại sau sweep đang ở bước xác thực cuối.

---

## 🟡 Đang làm / cần xác nhận ngay

### 1. Hoàn tất xác thực sau global rebrand sweep
- [x] Chạy script restore namespace nội bộ; đã khôi phục 88 file import/export.
- [x] Sửa các binding còn sót gây lỗi cú pháp, gồm:
  - `packages/client/src/pty-handoff.ts`
  - `packages/client/src/effect/client.ts`
  - `packages/gui-plugins/src/debug/server-heap.ts`
  - `packages/app/src/runtime/server/health.ts`
  - `packages/app/src/servers/connect/pairing.ts`
- [ ] Chạy lại `bun run build` trong `qai-fork/packages/desktop` và lưu kết quả pass cuối cùng đầy đủ.
- [ ] Rà source TS/TSX còn binding `Q-AI` không hợp lệ do sweep (chỉ giữ `Q-AI` trong chuỗi/copy UI; binding kỹ thuật phải là `OpenCode`).

### 2. Kiểm tra runtime trực quan
- [ ] Chạy desktop dev và chụp/xem Home qua CDP.
- [ ] Xác nhận Home có logo Q-AI + watermark `Designed by QuanLHK with AI`.
- [ ] Xác nhận không còn OpenCode wordmark, pin-board hoặc brick-breaker trong UI.
- [ ] Xác nhận các nhãn provider/model không còn lộ `OpenCode` cho người dùng.
- [ ] Xác nhận splash, About, error page, connect-server, menu và title đều là Q-AI.

### 3. Rà soát copy công khai
- [ ] Rà các text `OpenCode` còn lại trong app, desktop và CLI TUI: đổi nếu người dùng thấy; giữ nếu là identifier/protocol/package cần tương thích.
- [ ] Rà `services/site`, docs và template/codegen sau sweep để đảm bảo không đổi nhầm API/namespace.
- [ ] Rà legal/public copy: `LICENSE` và `NOTICE` upstream phải được giữ nguyên; các trang policy/terms mang Q-AI cần người sở hữu duyệt trước khi phát hành.

---

## ⬜ Chưa làm

### 1. Tài liệu và public repository
- [ ] Viết lại README gốc theo thương hiệu Q-AI: cài đặt, chạy local, kiến trúc, attribution, giới hạn fork.
- [ ] Cập nhật docs public và website copy theo Q-AI sau khi rà code hoàn tất.
- [ ] Thêm hướng dẫn chạy Windows dev chính thức, gồm yêu cầu Bun trong `PATH`.
- [ ] Viết changelog/release notes bản Q-AI đầu tiên.

### 2. GitHub, update và phát hành
- [ ] Khởi tạo/khôi phục Git metadata cho fork nếu cần.
- [ ] Cấu hình remote GitHub của Q-AI.
- [ ] Commit, push và tạo release — **chỉ thực hiện khi chủ dự án yêu cầu**.
- [ ] Cấu hình update feed/domain sau khi có domain/repository phát hành.
- [ ] Ký installer, cấu hình certificate/notarization theo từng nền tảng.
- [ ] Kiểm thử cài đặt, update và uninstall trên máy Windows sạch.

### 3. Kiểm thử phát hành
- [ ] Chạy full test suite sau khi build sạch.
- [ ] Chạy desktop e2e/smoke test: first launch, local service, tạo session, reconnect, deep link.
- [ ] Chạy build/package production Windows và kiểm tra metadata/icon/installer.
- [ ] Kiểm tra offline/error state và update UI không còn nhãn OpenCode.
- [ ] Kiểm tra accessibility cơ bản, tiếng Việt và các màn hình kích thước nhỏ.

---

## ⚠️ Blocker / ngoại lệ môi trường

- [ ] `git` CLI hiện không có trong môi trường; chưa thể commit/push từ đây.
- [ ] Một test NSIS Windows còn bị chặn do thiếu `pwsh`; kết quả trước đó **3/4 pass**.
- [ ] `bun typecheck` có lỗi upstream/pre-existing ở `packages/app/src/custom-elements.d.ts` (`TS1128`).
- [ ] Một số Bun test có lỗi môi trường pre-existing về `solid-js` không export `jsxDEV`; không phải lỗi branding Q-AI. Các test logic còn lại trong lượt chạy vẫn pass.
- [ ] Tên provider kỹ thuật/config local như `QuanLHK_OpenCode` có thể còn xuất hiện nếu nó đến từ profile/provider bên ngoài; cần đổi display/config provider tương ứng, không đổi mù protocol ID.

---

## Quy ước kỹ thuật bắt buộc giữ

- Giữ `LICENSE` và `NOTICE` upstream.
- Không đổi bừa `@opencode/*`, `OPENCODE_*`, protocol/storage/CLI identifiers nếu điều đó ảnh hưởng tương thích hoặc khởi động local service.
- Không để các identifier kỹ thuật này xuất hiện như thương hiệu trong UI người dùng.
- Trạng thái sidecar local hiện tương thích với `opencode/service-local.json`; không đổi sang `qai/service-local.json` cho tới khi CLI phía dưới được migrate đồng bộ.
- Không tự commit, push hoặc release nếu chưa có yêu cầu rõ ràng.

---

## Lệnh chạy local đã xác nhận

Từ `qai-fork/packages/desktop` trên Windows:

```powershell
$env:PATH = "C:\Users\LENOVO\AppData\Roaming\npm\node_modules\bun\bin;" + $env:PATH
bun run dev
```

Build desktop:

```powershell
bun run build
```

---

## Tài liệu liên quan

- `M0_AUDIT_REPORT.md`
- `M1_FORK_PIN_AND_CHANGE_LIST.md`
- `M1_IMPLEMENTATION_CHECKLIST.md` (checklist M1 lịch sử; file hiện tại là checklist tổng hợp mới nhất)
- `qai-fork/packages/desktop/`
