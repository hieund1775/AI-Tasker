# Chi Tiết Chức Năng Từng API Trong Hệ Thống Backend (AI-Tasker)

Tài liệu này tổng hợp toàn bộ các API của hệ thống Backend, chia nhóm theo các Module chức năng nghiệp vụ thực tế.

---

## 1. MODULE 1: VÍ ĐIỆN TỬ & GIAO DỊCH (TRANSACTIONS & WALLETS)
Quản lý số dư ví cá nhân, két sắt doanh thu hệ thống và ghi nhận lịch sử giao dịch.

* **`GET /api/interactions`**
  * **Chức năng**: Lấy danh sách lịch sử giao dịch toàn hệ thống (`TransactionLogs`).
* **`POST /api/interactions/transaction`**
  * **Chức năng**: Thực hiện giao dịch ví (Nạp tiền, rút tiền, ký quỹ, giải phóng tiền ký quỹ). Tự động trừ/cộng số dư ví trong bảng `Wallets` và số dư dự án trong bảng `Projects.EscrowBalance`.

---

## 2. MODULE 2: LUỒNG HỦY HỢP ĐỒNG & ĐÀM PHÁN (REPORTS & CANCELLATION)
Xử lý đề xuất hủy dự án, đàm phán đền bù giữa Client và Expert, và phân xử từ Admin.

* **`POST /api/reports`**
  * **Chức năng**: Khởi tạo yêu cầu hủy hợp đồng (Client hoặc Expert gửi đơn). Tự động khóa trạng thái dự án thành `Awaiting_Cancellation`.
* **`PUT /api/reports/{id}/admin-approve-cancel`**
  * **Chức năng**: Admin duyệt đơn hủy và chuyển trạng thái sang `Awaiting Partner` để chờ đối tác phản hồi.
* **`PUT /api/reports/{id}/admin-reject-cancel`**
  * **Chức năng**: Admin bác bỏ đơn hủy, đưa dự án trở lại trạng thái hoạt động bình thường `In Progress`.
* **`PUT /api/reports/{id}/partner-accept-cancel`**
  * **Chức năng**: Đối tác chấp nhận hủy. Giải ngân tiền ký quỹ thực tế về ví các bên theo đền bù, trích phế sàn nạp vào két sắt tổng, chuyển dự án sang `cancel_done`.
* **`PUT /api/reports/{id}/partner-reject-cancel`**
  * **Chức năng**: Đối tác từ chối hủy và đưa ra lý do giải trình. Đơn hủy được trả về trạng thái đàm phán `Returned`.
* **`PUT /api/reports/{id}/initiator-accept-rejection`**
  * **Chức năng**: Người gửi đơn đồng ý rút đơn hủy và tiếp tục thực hiện dự án (mở khóa trạng thái dự án về `In Progress`).
* **`PUT /api/reports/{id}/initiator-respond-rejection`**
  * **Chức năng**: Người gửi đơn gửi phản hồi giải trình mới (Resubmit). Backup thông tin cũ vào `HistoryLogsJson` và gửi lại Admin duyệt vòng mới (trạng thái quay về `Pending`).
* **`POST /api/reports/reset-test-data`**
  * **Chức năng**: Reset toàn bộ dữ liệu thử nghiệm của Module 2 về trạng thái ban đầu để kiểm thử.

---

## 3. MODULE 3: HỆ THỐNG TIN NHẮN P2P (CHAT MESSENGER)
Hệ thống nhắn tin trò chuyện trao đổi trực tiếp giữa Client và Expert.

* **`POST /api/chat/conversations`**
  * **Chức năng**: Lấy thông tin hoặc tạo mới một phòng hội thoại (Conversation) giữa Client và Expert.
* **`GET /api/chat/conversations/user/{userId}`**
  * **Chức năng**: Lấy danh sách các cuộc hội thoại hiện có của một người dùng.
* **`POST /api/chat/messages`**
  * **Chức năng**: Gửi tin nhắn mới vào phòng hội thoại.
* **`GET /api/chat/conversations/{conversationId}/messages`**
  * **Chức năng**: Lấy lịch sử tin nhắn của một cuộc hội thoại cụ thể.
* **`GET /api/messages`**
  * **Chức năng**: Xem toàn bộ danh sách tin nhắn hệ thống (dành cho Admin/kế toán đối soát).

---

## 4. MODULE 4: HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
Gửi thông tin cập nhật thời gian thực về trạng thái dự án, đàm phán, thanh toán cho người dùng.

* **`GET /api/notifications`**
  * **Chức năng**: Lấy toàn bộ danh sách thông báo của người dùng hiện tại.
* **`PUT /api/notifications/{id}/read`**
  * **Chức năng**: Đánh dấu một thông báo cụ thể là đã đọc.
* **`PUT /api/notifications/read-all`**
  * **Chức năng**: Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc.

---

## 5. MODULE 5: HỢP ĐỒNG SỐ (DIGITAL CONTRACTS)
Lưu trữ và ràng buộc pháp lý bằng chữ ký số giữa Client và Expert khi khởi tạo dự án.

* **`POST /api/contracts`**
  * **Chức năng**: Tạo mới một hợp đồng số ở trạng thái chờ ký kết `Pending`.
* **`GET /api/contracts/{id}`**
  * **Chức năng**: Lấy thông tin chi tiết của một hợp đồng cụ thể qua ID.
* **`GET /api/contracts/project/{projectId}`**
  * **Chức năng**: Lấy danh sách hợp đồng liên kết với dự án.
* **`GET /api/contracts/expert/{expertId}`**
  * **Chức năng**: Lấy danh sách hợp đồng của một chuyên gia cụ thể.
* **`PUT /api/contracts/{id}/status?status=Active`**
  * **Chức năng**: Ký kết/Cập nhật trạng thái hợp đồng thành `Active`.

---

## 6. MODULE 6: TUYỂN DỤNG & ĐẤU THẦU (JOBPOSTS & PROPOSALS)
Nghiệp vụ cốt lõi hỗ trợ đăng tin tuyển dụng và gửi hồ sơ đề xuất giải pháp kỹ thuật.

### 6.1 JobPosts Endpoints (`JobPostsController`)
* **`POST /api/jobposts/upload-file`**
  * **Chức năng**: Tải lên tập tin đính kèm cho bài đăng công việc (Giới hạn cứng 10MB).
* **`POST /api/jobposts/generate-milestone-md/{proposalId}`**
  * **Chức năng**: Xuất phân rã WBS và các Milestone ra file Markdown `.md`.
* **`GET /api/jobposts/search-filter`**
  * **Chức năng**: Tìm kiếm và lọc bài đăng tuyển dụng theo từ khóa, ngân sách, chuyên môn.
* **`GET /api/jobposts`**
  * **Chức năng**: Lấy toàn bộ danh sách bài đăng tuyển dụng trên hệ thống.
* **`GET /api/jobposts/{id}`**
  * **Chức năng**: Lấy chi tiết một bài đăng tuyển dụng qua ID.
* **`POST /api/jobposts`**
  * **Chức năng**: Đăng tuyển dụng mới.
* **`PUT /api/jobposts/{id}`**
  * **Chức năng**: Chỉnh sửa thông tin bài tuyển dụng.
* **`GET /api/jobposts/client/{clientId}`**
  * **Chức năng**: Lấy danh sách các bài tuyển dụng của một Client cụ thể.

### 6.2 Proposals Endpoints (`ProposalController`)
* **`POST /api/proposals/submit-proposal`**
  * **Chức năng**: Đăng ký đấu thầu một công việc, kèm theo file portfolio, file đính kèm và WBS giải pháp kỹ thuật.
* **`GET /api/proposals/job/{jobPostId}`**
  * **Chức năng**: Lấy danh sách hồ sơ đấu thầu của một công việc.
* **`GET /api/proposals/expert/{expertId}`**
  * **Chức năng**: Lấy danh sách hồ sơ đấu thầu của một Expert cụ thể.
* **`PUT /api/proposals/{id}/status`**
  * **Chức năng**: Duyệt hồ sơ đấu thầu (Chuyển thành `Accepted`). Tự động kích hoạt luồng khởi tạo dự án và copy WBS sang Project.
* **`PUT /api/proposals/{id}`**
  * **Chức năng**: Chỉnh sửa nội dung hồ sơ đấu thầu (Chỉ cho phép khi ở trạng thái `Pending`).
* **`POST /api/proposals/{id}/generate-milestone-md`**
  * **Chức năng**: Tạo file Milestone Markdown từ cấu trúc WBS của Proposal.
* **`POST /api/proposals/analyze-job-to-usecases/{jobPostId}`**
  * **Chức năng**: AI phân tích công việc và phân rã các Use Case gợi ý.
* **`POST /api/proposals/expert-ai-chat-session`**
  * **Chức năng**: Nhận phản hồi chat từ Expert để AI tự động tinh chỉnh WBS.
* **`GET /api/proposals/expert-ai-chat-history`**
  * **Chức năng**: Lấy lịch sử trò chuyện tương tác giữa Expert và AI phụ tá WBS.

---

## 7. MODULE 7: TRỢ LÝ AI & KHỚP CHUYÊN GIA (AI SERVICES)
Tích hợp trí tuệ nhân tạo để hỗ trợ người dùng xây dựng yêu cầu và đề xuất nhân sự phù hợp.

* **`POST /api/aichat/send-session`**
  * **Chức năng**: Trò chuyện với AI Assistant để phân rã yêu cầu bài tuyển dụng.
* **`POST /api/ai/recommend-experts`**
  * **Chức năng**: Chấm điểm và xếp hạng danh sách chuyên gia phù hợp nhất cho dự án bằng Gemini API.

---

## 8. MODULE 8: QUẢN LÝ DỰ ÁN & TIẾN ĐỘ WORKSPACE (PROJECTS & TASKS)
Quản lý quy trình thực hiện dự án thực tế bằng WBS, bao gồm Tasks và MiniTasks.

### 8.1 Dự Án & Workspace (`ProjectsController`)
* **`GET /api/projects/{id}`**
  * **Chức năng**: Lấy chi tiết thông tin dự án (Kèm các Task và MiniTask liên kết).
* **`GET /api/projects/client/{clientId}`**
  * **Chức năng**: Lấy danh sách dự án của Client.
* **`GET /api/projects/expert/{expertId}`**
  * **Chức năng**: Lấy danh sách dự án của Expert.
* **`PUT /api/projects/{id}/status`**
  * **Chức năng**: Cập nhật trạng thái dự án.
* **`PUT /api/projects/{id}/submit-work`**
  * **Chức năng**: Expert nộp sản phẩm hoàn thiện (Link sản phẩm).
* **`POST /api/projects/proposal/{proposalId}`**
  * **Chức năng**: Khởi tạo dự án trực tiếp từ Proposal đã được accepted.

### 8.2 Quản Lý Tasks & MiniTasks (`ProjectsController`)
* **`GET /api/projects/tasks/{taskId}`**
  * **Chức năng**: Lấy thông tin Task kèm theo các MiniTask con.
* **`POST /api/projects/{projectId}/tasks`**
  * **Chức năng**: Tạo mới một Task thuộc dự án.
* **`PUT /api/projects/tasks/{taskId}/status`**
  * **Chức năng**: Cập nhật trạng thái của Task.
* **`POST /api/projects/tasks/{taskId}/submit`**
  * **Chức năng**: Gửi Task lên để Client duyệt.
* **`POST /api/projects/tasks/{taskId}/review`**
  * **Chức năng**: Client duyệt/từ chối Task kèm theo phản hồi.
* **`POST /api/projects/tasks/{taskId}/minitasks`**
  * **Chức năng**: Tạo mới một MiniTask con trong Task (có trường `Duration` và `Deadline`).
* **`PUT /api/projects/minitasks/{miniTaskId}`**
  * **Chức năng**: Cập nhật thông tin MiniTask (bao gồm cập nhật `Deadline` và `IsCompleted`).
* **`DELETE /api/projects/minitasks/{miniTaskId}`**
  * **Chức năng**: Xóa MiniTask con.

---

## 9. MODULE 9: THÀNH VIÊN & DANH MỤC HỆ THỐNG (SYSTEM CONFIG)
Quản trị tài khoản người dùng và thiết lập danh mục hệ thống.

### 9.1 Tài khoản người dùng (`UsersController`)
* **`POST /api/users/register`**
  * **Chức năng**: Đăng ký tài khoản mới (Client hoặc Expert).
* **`POST /api/users/login`**
  * **Chức năng**: Đăng nhập hệ thống (Sinh JWT Token).
* **`PUT /api/users/{userId}/expert-profile`**
  * **Chức năng**: Cập nhật hồ sơ chuyên nghiệp của Expert.
* **`PUT /api/users/{id}`**
  * **Chức năng**: Chỉnh sửa thông tin cá nhân cơ bản.
* **`GET /api/users`**
  * **Chức năng**: Lấy toàn bộ danh sách thành viên hệ thống (Dành cho Staff/Owner).
* **`GET /api/users/{id}`**
  * **Chức năng**: Lấy thông tin chi tiết một người dùng cụ thể.
* **`PUT /api/users/{id}/set-active`**
  * **Chức năng**: Khóa hoặc kích hoạt lại tài khoản người dùng.

### 9.2 Danh mục hệ thống (`CategoryTagsController`)
* **`GET /api/category-tags`**
  * **Chức năng**: Lấy toàn bộ Categories, Domains, Specializations và Skills hệ thống.
* **`POST /api/category-tags/skills`**
  * **Chức năng**: Thêm kỹ năng mới vào hệ thống.
* **`GET /api/category-tags/skills`**
  * **Chức năng**: Lấy danh sách kỹ năng.
* **`DELETE /api/category-tags/skills/{id}`**
  * **Chức năng**: Xóa kỹ năng khỏi hệ thống.
* **`GET /api/category-tags/categories`**
  * **Chức năng**: Lấy danh sách Categories.
* **`POST /api/category-tags/categories`**
  * **Chức năng**: Thêm mới một Category (Domain).
* **`POST /api/category-tags/categories/{domainId}/specializations`**
  * **Chức năng**: Thêm chuyên ngành (Specialization) vào Category.
* **`GET /api/category-tags/categories/{domainId}/specializations`**
  * **Chức năng**: Lấy chuyên ngành thuộc Category.
* **`DELETE /api/category-tags/categories/{id}`**
  * **Chức năng**: Xóa Category.
* **`DELETE /api/category-tags/specializations/{id}`**
  * **Chức năng**: Xóa chuyên ngành.
