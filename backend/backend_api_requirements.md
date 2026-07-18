# Tài Liệu Yêu Cầu Phát Triển API (Dành cho Team Backend)

> [!IMPORTANT]
> **Gửi Team Backend (Hieu & Team):**
> Hiện tại Frontend (FE) đang phải tự "chữa cháy" (dùng data giả/hardcode) ở 5 chức năng do thiếu API thật. Dưới đây là danh sách **các API cần bổ sung** cùng với **cấu trúc JSON chính xác** mà FE đang mong đợi.
> Chỉ cần BE trả về đúng cấu trúc này, FE có thể nối vào và chạy ngay lập tức mà không cần sửa giao diện.

---

## 1. Nhóm API Thống kê Dashboard (Khẩn cấp - Tránh sai lệch tiền bạc)

Hiện tại FE đang phải tự gọi 3 API khác nhau để đếm số lượng dự án và đang **gắn cứng TotalSpent = 0**. BE cần viết 1 API duy nhất để xử lý.

### 📌 `GET /api/users/{userId}/dashboard-stats`
**Mô tả:** Lấy dữ liệu thống kê tổng quan cho màn hình Dashboard của Client/Expert.
**Response (200 OK):**
```json
{
  "posted": 5,        // Tổng số JobPost (dự án) đã đăng
  "active": 2,        // Số dự án đang chạy (Status: InProgress)
  "completed": 10,    // Số dự án hoàn thành (Status: Completed)
  "proposals": 8,     // Tổng số Proposal đã nhận (hoặc đã gửi nếu là Expert)
  "totalSpent": 15000 // Tổng số tiền đã tiêu (Client) hoặc Thu nhập (Expert)
}
```

---

## 2. Nhóm API Xin Gia hạn Thời gian (Extensions)

Hệ thống FE hiện đang khóa cứng nút "Gia hạn" vì không có luồng API này.

### 📌 `POST /api/Projects/{projectId}/extensions`
**Mô tả:** Expert tạo yêu cầu xin thêm ngày hoàn thành.
**Request Body:**
```json
{
  "taskId": "string (optional)", // Nếu xin gia hạn riêng cho 1 task
  "requestedDays": 3,
  "reason": "Cần thêm thời gian test bug"
}
```

### 📌 `PUT /api/Projects/extensions/{extensionId}/resolve`
**Mô tả:** Client duyệt (hoặc từ chối) yêu cầu gia hạn.
**Request Body:**
```json
{
  "status": "Accepted", // Hoặc "Rejected"
  "clientNote": "Đồng ý cho thêm 3 ngày"
}
```

---

## 3. Nhóm API Nhật ký hoạt động & Báo cáo (Activity Logs)

FE đang bị rỗng khu vực "Nhật ký dự án" và "Báo cáo công việc hàng ngày".

### 📌 `GET /api/Projects/{projectId}/activity-logs`
**Mô tả:** Lấy toàn bộ lịch sử hoạt động ("Ai vừa làm gì") của dự án.
**Response (200 OK):**
```json
[
  {
    "id": "log_123",
    "action": "ProjectCreated",
    "description": "Dự án chính thức bắt đầu",
    "createdAt": "2026-07-19T10:00:00Z",
    "actorName": "Hieu"
  }
]
```

### 📌 `POST /api/Projects/tasks/{taskId}/logs` (Báo cáo tiến độ ngày)
**Mô tả:** Expert viết log cập nhật tình hình làm việc trong ngày.
**Request Body:**
```json
{
  "content": "Đã code xong phần Login",
  "hoursWorked": 4
}
```

### 📌 `POST /api/Projects/tasks/{taskId}/feedback` (Client nhận xét)
**Mô tả:** Client viết nhận xét cho riêng 1 Task con.
**Request Body:**
```json
{
  "content": "Giao diện hơi lệch, em sửa lại nhé"
}
```

---

## 4. Nhóm API Xác thực & Bảo mật (Auth)

### 📌 `GET /api/users/me`
**Mô tả:** Mỗi khi F5 trang, FE sẽ gọi API này (kèm Bearer Token) để lấy lại thông tin user. Giúp bảo mật tốt hơn (thay vì FE tự nhớ bằng SessionStorage).
**Response (200 OK):**
```json
{
  "id": "user_123",
  "email": "abc@gmail.com",
  "fullName": "Nguyen Van A",
  "role": "Client",
  "isActive": true
}
```
*(Nếu Token hết hạn, BE trả về `401 Unauthorized`, FE sẽ tự động đá văng về trang Đăng nhập).*

---

> [!TIP]
> **Nhắn team Backend:** 
> Về phần "Thanh tiến độ (Progress Bar)", FE hiện tại đã viết logic tự tính toán thành công, nên BE **không cần** mất thời gian làm API Progress nữa. Hãy tập trung ưu tiên số 1 cho API **Dashboard Stats** và **Extensions**!
