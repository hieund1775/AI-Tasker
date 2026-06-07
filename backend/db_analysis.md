# Cấu trúc cơ sở dữ liệu sau cập nhật (Dựa trên phản hồi)

Dưới đây là cấu trúc cơ sở dữ liệu đã được cập nhật chính thức trong mã nguồn dựa trên các ghi chú và phản hồi của bạn.

---

## 1. Các bảng được thêm mới / chỉnh sửa theo yêu cầu

* **`MiniTasks`** (Cập nhật): Đã tích hợp trực tiếp các trường phản hồi vào bảng `MiniTasks` để lưu feedback của Client/Expert (gồm `FeedbackContent`, `FeedbackSenderId`, `FeedbackSender`).
* **`Conversations`** (Cập nhật):
  * Thêm cột `OriginJobPostId` để lưu ngữ cảnh tin nhắn bắt nguồn từ bài đăng tuyển dụng nào.
  * Bỏ liên kết trực tiếp `ProjectId` (quan hệ đã đảo chiều).
* **`Projects`** (Cập nhật):
  * Thêm cột `ConversationId` để liên kết dự án với cuộc hội thoại.
* **`Messages`** (Cập nhật):
  * Thêm cột `IsRead` (bool, mặc định `false`) để kiểm tra trạng thái tin nhắn đã đọc.

---

## 2. Các bảng & cột được giữ nguyên theo thiết kế hiện tại (Bỏ qua các đề xuất DBML)

* **`Users`**: Giữ nguyên thiết kế đăng nhập bằng Email, không thêm lại cột `Username`.
* **`ExpertProfiles`**: Giữ nguyên cấu trúc chứa cột `Location` và `SuccessRate`.
* **`Skills`**: Giữ nguyên bảng danh mục kỹ năng độc lập liên kết nhiều-nhiều (không dùng chuỗi text thô).
* **`AICategoryDomains`**: Giữ nguyên bảng danh mục lĩnh vực AI riêng biệt.
* **`JobRequirements`**: Giữ nguyên bảng yêu cầu chi tiết.
* **`MiniTasks`**: Giữ nguyên cấu trúc chia nhỏ việc.
* **`Projects` & `Tasks`**: Không thêm các trường gia hạn hợp đồng phức tạp và giữ nguyên `ProjectLink`.
* **`TransactionLogs`**: Không thêm `ExternalTransactionId`.
* **`JobPosts`**: Không thêm `AttachmentUrl`.
