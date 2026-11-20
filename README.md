# AI-Q

```text
01000001 01001001 00101101 01010001
```

```text
    █████╗ ██╗      ██████╗
   ██╔══██╗██║     ██╔═══██╗
   ███████║██║█████╗██║   ██║
   ██╔══██║██║╚════╝██║▄▄ ██║
   ██║  ██║██║     ╚██████╔╝
   ╚═╝  ╚═╝╚═╝      ╚══▀▀═╝

   [ AI-Q // INTELLIGENT CODING SYSTEM ]
   [ DESIGNED BY QUANLHK WITH AI      ]
```

**AI-Powered Coding Assistant · Smart Model Routing · Windows Desktop**  
*Designed by QuanLHK with AI*

[![Build](https://img.shields.io/badge/BUILD-20.11.2026-2563EB?style=for-the-badge)](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases)
![Router](https://img.shields.io/badge/ROUTER-AIQ%2FAUTO-16A34A?style=for-the-badge)
![Access](https://img.shields.io/badge/AI_ACCOUNT-NOT_REQUIRED-EA580C?style=for-the-badge)

> **Tải AI-Q cho Windows (1 file):** [**AI-Q-Setup-win-x64.exe**](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/desktop-0.0.0-prod-202611180254/AI-Q-Setup-win-x64.exe) — *cần Internet khi cài (tự tải AI-Q CLI)* · [Chi tiết & khắc phục](document/CAI_DAT_VA_CLI.md)

```text
> SYSTEM INITIALIZATION...

[01] Loading AI-Q Core .......... OK
[02] Initializing Model Router .. OK
[03] Default Model .............. aiq/auto
[04] AI Account ................. NOT REQUIRED
[05] Interface .................. VIETNAMESE
[06] Platform ................... WINDOWS

> READY TO CODE_
```

## 01 // SYSTEM OVERVIEW

AI-Q là trợ lý lập trình AI dành cho Windows, hỗ trợ tiếng Việt và tự động lựa chọn model khả dụng thông qua `aiq/auto`.

```text
USER INPUT
    |
    v
[ AI-Q ENGINE ]
    |
    v
[ AIQ/AUTO ROUTER ]
    |
    +---- MODEL_01 [AVAILABLE]
    |
    +---- MODEL_02 [QUOTA / ERROR]
    |          |
    |          +---- FALLBACK
    |
    +---- MODEL_03 [AVAILABLE]
    |
    v
AI RESPONSE
```

## 02 // INSTALLATION

**Tải bộ cài Windows (1 file)**

- **[⬇ Tải AI-Q-Setup-win-x64.exe](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/desktop-0.0.0-prod-202611180254/AI-Q-Setup-win-x64.exe)** (cần Internet khi cài — bộ cài tự tải AI-Q CLI). [Tất cả bản phát hành](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases) · [Chi tiết & khắc phục](document/CAI_DAT_VA_CLI.md)

**Build từ mã nguồn**

```powershell
git clone https://github.com/QuanLHK-FSC-HAG/AI-Q.git
cd AI-Q/aiq-fork
bun install
cd packages/desktop
bun run build
```

## 03 // ACCESS PROTOCOL

```text
[ FIRST LAUNCH ]

> ENTER USERNAME
> REVIEW TERMS OF SERVICE
> REVIEW PRIVACY POLICY
> ACCEPT TO CONTINUE
> START AI-Q

DEFAULT_MODEL = aiq/auto
AI_ACCOUNT    = NOT_REQUIRED
```

- **Bắt buộc trước khi sử dụng:** nhập tên người dùng và chấp thuận Điều khoản sử dụng & Chính sách quyền riêng tư.

## 04 // SECURITY & PRIVACY

```text
SECURITY PRINCIPLES
-------------------------------
[+] Informed User Consent
[+] Responsible AI Usage
[+] Third-Party Policy Awareness
[+] Open-Source License Compliance
[+] Sensitive Data Protection
```

AI-Q có thể gửi dữ liệu đến nhà cung cấp AI để xử lý. Người dùng cần xem xét dữ liệu trước khi gửi và chấp thuận chính sách liên quan.

**Lưu ý:** AI-Q hướng tới trải nghiệm sử dụng miễn phí thông qua `aiq/auto` khi có model khả dụng. Hạn mức/quota, tốc độ và khả năng truy cập phụ thuộc vào nhà cung cấp/model, thời điểm và điều kiện mạng/thiết bị; có thể thay đổi, bị giới hạn hoặc gián đoạn. AI-Q không cam kết miễn phí hay khả dụng liên tục trong mọi trường hợp.

## 05 // VERSION

```text
PRODUCT       : AI-Q
DISPLAY_BUILD : 20.11.2026
EDITION       : SPECIAL USER EDITION
USER          : {tên người dùng}
DEFAULT_MODEL : aiq/auto
PLATFORM      : WINDOWS
AUTHOR        : QuanLHK
```

## 06 // LICENSE

Copyright © 2026 QuanLHK. All rights reserved.

Xem [LICENSE](LICENSE) và [NOTICE](NOTICE) để biết quyền sử dụng và các giấy phép thành phần mã nguồn mở.

## 07 // LINKS

```text
SOURCE_CODE :
https://github.com/QuanLHK-FSC-HAG/AI-Q

DOCUMENTATION :
https://quanlhk-fsc-hag.github.io/AI-Q/

RELEASES :
https://github.com/QuanLHK-FSC-HAG/AI-Q/releases
```

---

```text
01000001 01001001 00101101 01010001

< CODE SMARTER. BUILD FREELY. >

Designed by QuanLHK with AI
```
