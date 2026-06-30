# Tài Liệu Đặc Tả Yêu Cầu API Cho Phía Backend (Đã Cập Nhật Theo Luồng FE Thực Tế)

Tài liệu này đặc tả danh sách các API còn thiếu trên Backend để phục vụ việc tích hợp dữ liệu thật của dự án **AI-Tasker**. 
> [!IMPORTANT]
> **LƯU Ý QUAN TRỌNG VỀ ĐƯỜNG DẪN (ROUTE ALIGNMENT)**:
> Để đảm bảo Frontend không bị lỗi đường dẫn khi chuyển đổi dữ liệu (`VITE_USE_MOCK_DB = false`), các API của phía Backend bắt buộc phải đặt tên route trùng khớp hoàn toàn với các yêu cầu HTTP bên dưới (thay vì dùng tên `/api/dispute` hay các route tự chế).

---

## MỤC LỤC
1. [Module 1: Ví Điện Tử & Giao Dịch (Wallets & Interactions)](#1-module-1-vi-dien-tu--giao-dich)
2. [Module 2: Luồng Hủy Hợp Đồng & Đàm Phán (Reports & Cancellation)](#2-module-2-luong-huy-hop-dong--dam-phan)
3. [Module 3: Hệ Thống Tin Nhắn (Peer-to-Peer Chat Messenger)](#3-module-3-he-thong-tin-nhan-p2p)
4. [Module 4: Hệ Thống Thông Báo (Notifications)](#4-module-4-he-thong-thong-bao)
5. [Module 5: Hợp Đồng Số (Contracts)](#5-module-5-hop-dong-so)

---

## 1. MODULE 1: VÍ ĐIỆN TỬ & GIAO DỊCH
*Hiện tại Frontend và Backend đang có sự lệch pha về định nghĩa dữ liệu (Data Mismatch) ở mục Lịch sử giao dịch.*

### 1.1 API Lịch Sử Giao Dịch (Bị Lệch Route)
* **Hiện trạng**: Frontend `api.payments.getTransactions` đang gọi `GET /api/interactions` để lấy lịch sử giao dịch ví. Tuy nhiên, Backend `InteractionController.cs` lại trả về danh sách đánh giá (`Reviews`) của dự án.
* **Giải pháp yêu cầu**:
  * Backend cần tạo API `GET /api/interactions` trả về danh sách lịch sử giao dịch (`TransactionLogs`) thay vì Reviews, hoặc cung cấp API riêng biệt và FE sẽ cấu hình lại.
* **Định dạng dữ liệu trả về yêu cầu (JSON List)**:
```json
[
  {
    "Id": "8f3b2351-efc8-47bc-9b21-499387a2a014",
    "ProjectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "Amount": 1500.00,
    "Type": "escrow_deposit",
    "CreatedAt": "2026-06-30T12:00:00Z"
  }
]
```

### 1.2 API Thực Thi Giao Dịch (Ví & Ký Quỹ)
* **Route**: `POST /api/interactions/transaction`
* **Xác thực**: Bearer Token
* **Body Request (JSON)**:
```json
{
  "ProjectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", // Có thể null
  "Amount": 1500.00,
  "Type": "deposit" // Gồm: "deposit" | "withdrawal" | "escrow_deposit" | "escrow_release"
}
```
* **Logic xử lý Backend**:
  * Lấy `UserId` từ Token để xác thực Wallet.
  * Thực hiện trừ/cộng số dư ví trong bảng `Wallets` và số dư dự án trong bảng `Projects.EscrowBalance`.
  * Ghi nhật ký vào bảng `TransactionLogs`.

---

## 2. MODULE 2: LUỒNG HỦY HỢP ĐỒNG & ĐÀM PHÁN (REPORTS MODULE)
*Toàn bộ các luồng hủy hợp đồng dưới đây bắt buộc phải được đặt trong một Controller mới là `ReportsController.cs` có route là `/api/reports` để khớp với cuộc gọi trên Frontend.*

### 2.1 Cập Nhật Cơ Sở Dữ Liệu
Tạo bảng `Reports` lưu trữ đơn khiếu nại/hủy hợp đồng:
```sql
CREATE TABLE [Reports] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [ProjectId] uniqueidentifier NOT NULL,
    [ReporterId] uniqueidentifier NOT NULL,
    [ReporterRole] nvarchar(50) NOT NULL, -- "client" | "expert"
    [ReportType] nvarchar(50) NOT NULL, -- "type1" | "type2" (hoặc "cancellation")
    
    -- Lưu vết thông tin khởi tạo đàm phán hủy
    [Reason] nvarchar(max) NOT NULL, 
    [Description] nvarchar(max) NULL,
    [DisputeType] nvarchar(100) NULL,
    [DesiredResolution] nvarchar(max) NULL,
    [EvidenceUrl] nvarchar(max) NULL,
    
    -- Trạng thái đàm phán hủy
    [Status] nvarchar(50) NOT NULL, -- "Pending" (Chờ Admin) | "Awaiting Partner" | "Returned" | "Accepted" | "Rejected"
    [EscrowRefundClient] decimal(18,2) NOT NULL DEFAULT 0,
    [EscrowPayExpert] decimal(18,2) NOT NULL DEFAULT 0,
    [PlatformFee] decimal(18,2) NOT NULL DEFAULT 0,
    
    -- Thông tin đối chứng từ bên bị hủy
    [PartnerRejectionReason] nvarchar(max) NULL,
    [PartnerExplanation] nvarchar(max) NULL,
    [PartnerEvidenceUrl] nvarchar(max) NULL,
    
    [AdminNote] nvarchar(max) NULL,
    [HistoryLogsJson] nvarchar(max) NULL, -- Lưu vết các vòng đàm phán cũ bằng chuỗi JSON
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL
);
```

### 2.2 Đặc Tả Chi Tiết Các Endpoints `/api/reports`

#### API 2.2.1: Gửi đơn yêu cầu hủy (Client/Expert gửi đơn)
* **Route**: `POST /api/reports`
* **Xác thực**: Bearer Token
* **Body Request**:
```json
{
  "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reporterRole": "client", // "client" hoặc "expert"
  "reportType": "cancellation",
  "reason": "Expert không làm việc",
  "description": "Chi tiết lý do...",
  "disputeType": "financial",
  "desiredResolution": "refund",
  "evidence": ["url_file_chung_minh.zip"]
}
```
* **Nghiệp vụ**: Đặt `Project.Status = "Awaiting_Cancellation"` (Khóa Workspace). Tính toán đền bù phạt 10% và phí sàn 5% rồi ghi nhận vào các trường `EscrowRefundClient`, `EscrowPayExpert`. Tạo bản ghi trạng thái `Pending`.

#### API 2.2.2: Admin kiểm duyệt đơn hủy (Approve / Bác bỏ)
* **Duyệt đơn và chuyển sang cho đối tác**:
  * **Route**: `PUT /api/reports/{id}/admin-approve-cancel`
  * **Nghiệp vụ**: Chuyển trạng thái đơn thành `"Awaiting Partner"`. Gửi thông báo đến bên bị hủy.
* **Bác bỏ đơn hủy**:
  * **Route**: `PUT /api/reports/{id}/admin-reject-cancel`
  * **Body Request**: `{ "adminNote": "Lý do bác bỏ..." }`
  * **Nghiệp vụ**: Đặt trạng thái đơn thành `"Rejected"`. Mở khóa dự án về `"in_progress"`.

#### API 2.2.3: Đối tác bị hủy phản hồi đơn (Đồng ý / Từ chối)
* **Đồng ý hủy (Accept)**:
  * **Route**: `PUT /api/reports/{id}/partner-accept-cancel`
  * **Nghiệp vụ**: Phân chia quỹ tiền ký quỹ thực tế vào ví Client và Expert theo thông số đền bù trong đơn. Đặt trạng thái dự án thành `"cancel_done"`. Đóng đơn hủy ở trạng thái `"Accepted"`.
* **Từ chối hủy (Reject)**:
  * **Route**: `PUT /api/reports/{id}/partner-reject-cancel`
  * **Body Request**: `{ "partnerRejectionReason": "Tôi không đồng ý vì đã làm 30%..." }`
  * **Nghiệp vụ**: Lưu lý do giải trình. Đổi trạng thái đơn thành `"Returned"`.

#### API 2.2.4: Người gửi đơn phản hồi đàm phán (Chấp nhận / Phản hồi lại)
* **Chấp nhận kết quả từ chối hủy (Revert chạy tiếp dự án)**:
  * **Route**: `PUT /api/reports/{id}/initiator-accept-rejection`
  * **Nghiệp vụ**: Đồng ý rút đơn hủy. Đặt trạng thái dự án về lại `"in_progress"` (Mở khóa Workspace). Đóng đơn hủy ở trạng thái `"Rejected"`.
* **Gửi phản hồi giải trình mới (Resubmit đơn hủy)**:
  * **Route**: `PUT /api/reports/{id}/initiator-respond-rejection`
  * **Body Request**: `{ "reason": "Bổ sung bằng chứng mới...", "evidenceFileName": "file_moi.zip" }`
  * **Nghiệp vụ**: Backup đơn hủy cũ vào `HistoryLogsJson`. Cập nhật thông tin bằng chứng mới. Đổi trạng thái đơn hủy quay lại `"Pending"` (Chờ Admin duyệt vòng mới).

---

## 3. MODULE 3: HỆ THỐNG TIN NHẮN P2P (CHAT MESSENGER)
* **Hiện trạng**: Trang `Messenger.jsx` đang gọi trực tiếp `GET /api/messages` để lấy danh sách tin nhắn.
* **Giải pháp yêu cầu**:
  * Backend cần ánh xạ route `/api/messages` trỏ về API lấy tin nhắn của người dùng hiện tại, hoặc cập nhật Frontend để gọi qua `GET /api/chat/conversations/{conversationId}/messages` của `ChatController.cs`.

---

## 4. MODULE 4: HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
* **Các route yêu cầu**:
  * Lấy danh sách thông báo: `GET /api/notifications`
  * Đánh dấu đã đọc: `PUT /api/notifications/{id}/read`
  * Đọc tất cả: `PUT /api/notifications/read-all`
* **Định dạng phản hồi yêu cầu (JSON)**:
```json
[
  {
    "Id": "8f3b2351-efc8-47bc-9b21-499387a2a014",
    "Title": "Yêu cầu hủy hợp đồng",
    "Content": "Client đã gửi yêu cầu hủy hợp đồng đối với dự án của bạn.",
    "LinkUrl": "/expert/projects/proj-017",
    "IsRead": false,
    "CreatedAt": "2026-06-30T12:00:00Z"
  }
]
```

---

## 5. MODULE 5: HỢP ĐỒNG SỐ (CONTRACTS)
* **Các route yêu cầu**:
  * Tạo hợp đồng ký kết: `POST /api/Contracts`
  * Lấy chi tiết hợp đồng: `GET /api/Contracts/{id}`
  * Lấy hợp đồng theo dự án: `GET /api/Contracts/project/{projectId}`
  * Lấy hợp đồng theo chuyên gia: `GET /api/Contracts/expert/{expertId}`
  * Cập nhật trạng thái hợp đồng: `PUT /api/Contracts/{id}/status?status=Active`
