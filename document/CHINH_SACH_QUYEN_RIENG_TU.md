# Chính sách quyền riêng tư - AI-Q

**Cập nhật lần cuối:** 20/11/2026  
**Ứng dụng:** AI-Q  
**Tác giả/Nhà phát triển:** QuanLHK  
**Kho mã nguồn:** https://github.com/QuanLHK-FSC-HAG/AI-Q  
**Tài liệu (docs):** https://quanlhk-fsc-hag.github.io/AI-Q/

Chính sách này mô tả cách AI-Q ("Ứng dụng") xử lý dữ liệu khi bạn sử dụng. Vì Ứng dụng có thể kết nối tới các model/nhà cung cấp khác nhau thông qua cơ chế tự chọn/xoay (ví dụ `aiq/auto`), việc xử lý dữ liệu cũng có thể phụ thuộc vào từng model/nhà cung cấp, cấu hình và điều kiện mạng tại thời điểm sử dụng.

## 1. Dữ liệu được xử lý khi bạn sử dụng
Khi bạn gửi yêu cầu trong Ứng dụng, các dữ liệu sau có thể được xử lý để tạo phản hồi:
- **Nội dung bạn cung cấp:** tin nhắn, câu lệnh, và tệp/đính kèm (nếu bạn chọn gửi) cần thiết cho việc xử lý yêu cầu.
- **Dữ liệu kỹ thuật liên quan:** thông tin về phiên, model/lựa chọn định tuyến, trạng thái lỗi, thời gian, và metadata cần thiết để vận hành, chẩn đoán và xoay model khi gặp lỗi hoặc giới hạn (tùy cấu hình).

**Khuyến nghị:** Không gửi thông tin nhạy cảm (mật khẩu, khóa bí mật, dữ liệu cá nhân đặc biệt, bí mật kinh doanh) trừ khi thực sự cần thiết và bạn hiểu rủi ro.

## 2. Chia sẻ dữ liệu với nhà cung cấp/model
- Để xử lý yêu cầu, nội dung và dữ liệu kỹ thuật cần thiết có thể được truyền tới hạ tầng/model/nhà cung cấp phục vụ model được chọn tại thời điểm đó.
- Chính sách lưu trữ, sử dụng cho mục đích huấn luyện/cải thiện, và chia sẻ tiếp theo (nếu có) **phụ thuộc vào nhà cung cấp/model**. Ứng dụng định hướng hạn chế chia sẻ ngoài mục đích xử lý yêu cầu theo khả năng và cấu hình; tuy nhiên bạn nên cân nhắc khi gửi dữ liệu.
- Ứng dụng không yêu cầu tài khoản cho luồng sử dụng mặc định `aiq/auto` (theo thiết kế hiện tại).

## 3. Dữ liệu lưu trữ cục bộ trên thiết bị
Ứng dụng có thể lưu cục bộ trên PC của bạn (tùy phiên bản/cấu hình), ví dụ:
- **Hồ sơ & chấp thuận:** tên người dùng bạn nhập (để hiển thị phiên bản), trạng thái chấp thuận Điều khoản/Chính sách quyền riêng tư và thời điểm chấp thuận. Trên bản desktop Windows, thông tin này được ưu tiên lưu **gắn máy** bằng mã hóa an toàn của hệ điều hành/DPAPI thông qua `safeStorage` (Electron/main process) khi khả dụng. Khi cài đặt, trình cài đặt (NSIS) có thể thu thập tên người dùng và ghi nhận chấp thuận để Ứng dụng nhập vào lần chạy đầu.
- Lịch sử phiên/chat, bản nháp/cấu hình liên quan.
- Cấu hình ứng dụng, cache và dữ liệu vận hành.
- Nhật ký (log) ứng dụng/service phục vụ chẩn đoán.
- Một số thông tin mặc định/metadata (ví dụ tác giả, phiên bản, liên kết, điều khoản) có thể được đóng gói hoặc lưu mã hóa/che phủ trong Ứng dụng kèm kiểm tra toàn vẹn theo thiết kế bảo vệ.

Vị trí lưu trữ cụ thể phụ thuộc hệ điều hành và bản cài đặt. Nếu không thể giải mã dữ liệu gắn máy (ví dụ đổi máy, đổi người dùng Windows, cài lại hoặc lỗi), Ứng dụng có thể khôi phục giá trị mặc định và yêu cầu bạn nhập/chấp thuận lại.

## 4. Telemetry/analytics/báo cáo lỗi
- Ứng dụng có thể tạo/ghi **nhật ký kỹ thuật cục bộ** để chẩn đoán và cải thiện độ ổn định. Việc chia sẻ/thu thập dữ liệu ẩn danh từ xa (nếu có trong các phiên bản tương lai hoặc theo cấu hình) sẽ được thông báo và/hoặc cung cấp tùy chọn phù hợp; khi đó lựa chọn của bạn sẽ được ưu tiên áp dụng.
- Hiện tại, Ứng dụng không định hướng thu thập dữ liệu nhằm nhận dạng cá nhân bạn ngoài những gì cần thiết cho vận hành cục bộ và xử lý yêu cầu như mô tả ở trên.

## 5. Lưu giữ và xóa dữ liệu
- **Dữ liệu cục bộ:** bạn có thể xóa bằng cách xóa phiên/chat trong Ứng dụng (nếu có), xóa hồ sơ/đặt lại trong cài đặt (nếu có), hoặc xóa thư mục dữ liệu của Ứng dụng trên PC. Việc xóa có thể làm mất cấu hình, hồ sơ, trạng thái chấp thuận và phiên làm việc.
- **Dữ liệu phía nhà cung cấp/model:** thời gian lưu giữ và khả năng xóa phụ thuộc chính sách của nhà cung cấp/model xử lý yêu cầu tại thời điểm đó.

## 6. Bảo mật
- Chúng tôi áp dụng các biện pháp hợp lý trong phạm vi thiết kế Ứng dụng (ví dụ lưu hồ sơ/chấp thuận gắn máy bằng mã hóa của hệ điều hành/DPAPI qua `safeStorage` khi khả dụng, đóng gói tài nguyên, mã hóa/che phủ và kiểm tra toàn vẹn một số thông tin mặc định). Tuy nhiên, không có phương thức lưu trữ/truyền tải nào an toàn tuyệt đối.
- Bạn chịu trách nhiệm bảo vệ thiết bị, tài khoản hệ điều hành và dữ liệu bạn nhập vào Ứng dụng.

## 7. Trẻ em
Ứng dụng không hướng tới việc thu thập dữ liệu từ trẻ em. Nếu bạn là người giám hộ và cho rằng có dữ liệu không phù hợp được cung cấp, hãy ngừng sử dụng và xóa dữ liệu cục bộ liên quan.

## 8. Thay đổi chính sách
Chính sách này có thể được cập nhật để phản ánh thay đổi về tính năng, nhà cung cấp, lưu trữ/bảo mật, hoặc yêu cầu pháp lý. Phiên bản cập nhật sẽ được hiển thị/công bố trong Ứng dụng và/hoặc tại kho mã nguồn/docs. Khi thay đổi quan trọng, Ứng dụng có thể yêu cầu bạn chấp thuận lại.

## 9. Liên hệ
Mọi câu hỏi/phản hồi về quyền riêng tư và dữ liệu: vui lòng sử dụng **GitHub Issues** tại https://github.com/QuanLHK-FSC-HAG/AI-Q/issues (hoặc kênh được công bố tại https://quanlhk-fsc-hag.github.io/AI-Q/).
