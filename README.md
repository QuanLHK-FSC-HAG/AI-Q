<div align="center">

<img src="packages/desktop/resources/icons/icon.png" alt="AI-Q" width="120" />

# AI-Q

**Trợ lý lập trình AI cho Windows**  
Cài 1 file · Dùng `aiq/auto` · Không cần tài khoản AI · Hỗ trợ tiếng Việt

[![Website](https://img.shields.io/badge/Website-q--ai--six.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://q-ai-six.vercel.app)
[![Download](https://img.shields.io/badge/Download-Windows_.exe-2563EB?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/desktop-0.0.0-prod-202611180254/AI-Q-Setup-win-x64.exe)
[![Release](https://img.shields.io/badge/Release-desktop-16A34A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/tag/desktop-0.0.0-prod-202611180254)

<br/>

[🌐 Trang web](https://q-ai-six.vercel.app) · [⬇ Tải AI-Q cho Windows](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/desktop-0.0.0-prod-202611180254/AI-Q-Setup-win-x64.exe) · [📦 Tất cả bản phát hành](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases) · [🛠 Hướng dẫn cài đặt](document/CAI_DAT_VA_CLI.md)

</div>

---

## Giới thiệu

**AI-Q** là trợ lý lập trình AI dành cho Windows, được thiết kế để bạn có thể cài nhanh, mở lên và dùng ngay. AI-Q dùng `aiq/auto` làm model mặc định, hỗ trợ tiếng Việt và tập trung vào trải nghiệm đơn giản cho người dùng.

> **Lưu ý:** AI-Q hướng tới trải nghiệm sử dụng miễn phí thông qua `aiq/auto` khi có model khả dụng. Hạn mức/quota, tốc độ và khả năng truy cập phụ thuộc nhà cung cấp/model, thời điểm và điều kiện mạng/thiết bị; có thể thay đổi, bị giới hạn hoặc gián đoạn.

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **aiq/auto mặc định** | Tự động định tuyến đến model khả dụng, giảm cấu hình thủ công. |
| **Không cần tài khoản AI** | Mở app và bắt đầu dùng, không cần tạo tài khoản AI riêng. |
| **1 file cài đặt Windows** | Chỉ cần tải `AI-Q-Setup-win-x64.exe` và cài đặt. |
| **Cập nhật model/mix tại chỗ** | Bấm 1 nút trong Cài đặt để cập nhật model/mix, không cần cài lại app. |
| **Hỗ trợ tiếng Việt** | Giao diện và trải nghiệm thân thiện với người dùng Việt Nam. |
| **Tách biệt dữ liệu** | Dữ liệu AI-Q được cô lập khỏi OpenCode để tránh xung đột. |

## Tải xuống

- **Windows (khuyên dùng):** [AI-Q-Setup-win-x64.exe](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/desktop-0.0.0-prod-202611180254/AI-Q-Setup-win-x64.exe)
- **Trang web:** [q-ai-six.vercel.app](https://q-ai-six.vercel.app)
- **Releases:** [GitHub Releases](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases)

> Bộ cài cần Internet khi cài đặt để tự tải AI-Q CLI. Xem thêm: [Chi tiết & khắc phục](document/CAI_DAT_VA_CLI.md).

## Cài đặt nhanh

1. Tải file `AI-Q-Setup-win-x64.exe`.
2. Chạy bộ cài, chọn thư mục cài đặt và nhập tên người dùng.
3. Mở AI-Q và bắt đầu sử dụng với model mặc định `aiq/auto`.

## Build từ mã nguồn

```powershell
git clone https://github.com/QuanLHK-FSC-HAG/AI-Q.git
cd AI-Q
bun install
cd packages/desktop
bun run build
```

## Bảo mật & quyền riêng tư

- AI-Q có thể gửi dữ liệu đến nhà cung cấp AI để xử lý khi bạn sử dụng tính năng AI.
- Người dùng cần xem xét dữ liệu trước khi gửi và chịu trách nhiệm với nội dung gửi đi.
- Vui lòng xem thêm tài liệu/chính sách trong repo trước khi sử dụng.

## Tác giả

**QuanLHK** · Designed by QuanLHK with AI · © 2026 QuanLHK

---

<div align="center">
  <a href="https://q-ai-six.vercel.app"><strong>q-ai-six.vercel.app</strong></a> · <a href="https://github.com/QuanLHK-FSC-HAG/AI-Q/releases">Releases</a> · <a href="https://github.com/QuanLHK-FSC-HAG/AI-Q">GitHub</a>
</div>