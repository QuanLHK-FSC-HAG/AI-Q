# Cài đặt AI-Q Desktop và AI-Q CLI

## Cài đặt (Windows)

- Tải **1 file duy nhất**: `AI-Q-Setup-win-x64.exe` từ [GitHub Releases](https://github.com/QuanLHK-FSC-HAG/AI-Q/releases).
- **Bắt buộc có Internet khi cài đặt.** Bộ cài sẽ tự tải AI-Q CLI (thành phần chạy AI) từ GitHub Release của tác giả trong quá trình cài.
  - Windows 10 1809+ / Windows 11 / Server 2019+: tải bản CLI chuẩn.
  - Windows 10 1607–1803 / Server 2016: tự tải thêm bản CLI Node (dự phòng cho hệ thống cũ).
- Nếu mất mạng hoặc tải lỗi, bộ cài sẽ báo lỗi và cho phép thử lại. Cài đặt sẽ không hoàn tất khi chưa tải được CLI.
- Bộ cài chưa ký số: Windows SmartScreen/Defender có thể cảnh báo. Chỉ tải từ nguồn chính thức của dự án.

## Sau khi cập nhật ứng dụng

- Bản cập nhật trong ứng dụng có thể thay thế file cài đặt nhưng không bao gồm AI-Q CLI.
- Khi mở ứng dụng, nếu thiếu CLI, AI-Q sẽ tự kiểm tra và tải lại từ đúng bản phát hành CLI tương ứng (cần Internet).
- Nếu không tải được, hãy kiểm tra kết nối mạng, tường lửa/antivirus rồi mở lại AI-Q.

## Máy không có Internet / khắc phục thủ công

1. Trên máy có Internet, tải file zip CLI đúng phiên bản từ GitHub Release có tag `cli-<phiên_bản>` (xem `resources/cli-manifest.json` trong thư mục cài AI-Q để biết phiên bản và tên file).
2. Giải nén và đặt file vào thư mục:
   - `%LOCALAPPDATA%\Programs\com.quanlhk.AIQ.desktop\resources\aiq-cli.exe`
   - `%LOCALAPPDATA%\Programs\com.quanlhk.AIQ.desktop\resources\aiq-cli.version` (nội dung là chuỗi phiên bản CLI)
3. Nếu dùng Windows 10 cũ (trước 1809), đặt thêm:
   - `%LOCALAPPDATA%\Programs\com.quanlhk.AIQ.desktop\resources\aiq-cli-node.exe`
   - `%LOCALAPPDATA%\Programs\com.quanlhk.AIQ.desktop\resources\aiq-cli-node.version`
4. Mở lại AI-Q.

> Lưu ý: Chỉ sử dụng CLI từ nguồn phát hành chính thức của AI-Q. File sai phiên bản hoặc bị hỏng có thể khiến ứng dụng không khởi động được.
