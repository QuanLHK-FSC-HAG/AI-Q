# AI-Q M1 — ADR Fork/Pin và Danh sách thay đổi nhỏ

> Bổ sung cho `M0_AUDIT_REPORT.md` §8. Đây là tài liệu khởi động M1 sau khi M0 audit xong.

## Trạng thái

- M0: **Hoàn thành** (2026-11-13) — audit commit pin, stack/licensing, mapping rebrand, toolchain.
- M1: **Chưa bắt đầu** — chờ chủ dự án chốt các quyết định cần thiết (gate).
- Người quyết định: QuanLHK (chủ dự án).
- Ngày: 2026-11-13.

## ADR đề xuất: fork AI-Q pin commit upstream

| Hạng mục | Đề xuất |
|---|---|
| Fork | AI-Q fork của `https://github.com/QuanLHK-FSC-HAG/AI-Q` |
| Commit pin | `73abe63ac23224d88e739e7028882e547ef65a79` (dev, v2.2.7) |
| License | MIT — giữ `LICENSE`, copyright, third-party notices bắt buộc |
| Runtime | Bun `1.4.4` (đã verified), không thêm Python/WebView2 cho MVP |
| Cập nhật | Manual (theo D09); installer AI-Q riêng; không phát hành chưa ký/kiểm thử |

## Danh sách thay đổi nhỏ cho M1 (theo thứ tự có thể kiểm thử)

1. **Identity/app:** `packages/desktop/src/main/constants.ts` — appNames/appIDs theo channel → `AI-Q` / `com.quanlhk.AIQ.desktop`.
2. **Build/artifact:** `packages/desktop/electron-builder.config.ts` — artifactName (`AI-Q-Setup-win-x64.exe`…), productName, protocol scheme `AIQ`, publish feed riêng.
3. **Deep-link:** `packages/desktop/src/main/lifecycle/deep-link.ts`, `environment.ts`, `index.ts`, `deep-links/` + tests — scheme `AIQ://`, argv prefix, event names.
4. **userData:** `packages/desktop/src/main/lifecycle/configure.ts` — `%APPDATA%\com.quanlhk.AIQ.desktop`.
5. **Background service:** `packages/desktop/src/main/service/background-service.ts` — service file `AIQ/service-local.json`.
6. **i18n/vi-VN:** default locale → `vi-VN`; native i18n rebrand copy (English source giữ nguyên).
7. **Installer/metadata:** NSIS, metainfo, About/splash/footer attribution `Designed by QuanLHK with AI Vibe Coding`; notices/license cho installer AI-Q.

## Task list M1 (sát với thay đổi)

- [ ] Fork checkout từ commit pin tại repo riêng; không sửa `upstream-AIQ/` audit checkout.
- [ ] Áp dụng các thay đổi M1 trên các mục 1–7; giữ delta nhỏ, tests sát thay đổi.
- [ ] Chạy `bun install --frozen-lockfile`, `bun test` package đã đổi, `bun run build` packages/desktop.
- [ ] Cài song song AI-Q/AI-Q trên Windows sạch; kiểm tra userData/deep-link không chiếm AI-Q.
- [ ] Gate M1: cài song song, khởi động cơ bản, giao diện vi-VN, notices đầy đủ.

## Gate trước khi M1

- D01: Windows 10 support — `Cần chốt trước M1 release`.
- D02: Runtime Bun — `Tạm chọn` (verified 1.4.4).
- Các gate còn lại D03–D11 thuộc M2 trở sau.
