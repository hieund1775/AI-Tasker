# AI-Tasker: Tài Liệu Cấu Trúc Mã Nguồn Frontend

Tài liệu này chi tiết hóa cấu trúc mã nguồn, cơ chế phân quyền (Routing), quản lý trạng thái (Authentication Context), và thiết lập kết nối API/Mock DB của ứng dụng Frontend **AI-Tasker**.

---

## 1. Công Nghệ Sử Dụng (Tech Stack)

- **Framework**: React 18 + Vite 6
- **Routing**: React Router v7 (Hỗ trợ phân quyền dựa trên Role)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Material UI (MUI)
- **State Management**: React Context (`AuthContext` kết hợp `useReducer`)
- **API Client**: `fetch` API kết hợp bộ quản lý lỗi tự định nghĩa (`ApiError`) và chế độ Mock DB chạy trực tiếp trên Client khi chưa có Backend.

---

## 2. Bản Đồ Cấu Trúc Thư Mục (Folder Structure Map)

Dự án được phân chia theo kiến trúc module hóa rõ ràng:

```
frontend/src/
├── main.jsx                 # Entry point khởi tạo ứng dụng React
├── app/
│   ├── App.jsx              # Component gốc, bọc AuthProvider và RouterProvider
│   ├── routes.jsx           # Định nghĩa toàn bộ cây định tuyến (Routes) & Phân quyền
│   ├── context/
│   │   └── AuthContext.jsx  # Quản lý đăng nhập, phiên (Token), thông tin User & Demo Mode
│   ├── hooks/
│   │   ├── useAuth.js       # Hook nhanh truy cập thông tin định danh
│   │   └── use-mobile.js    # Hook phát hiện kích thước màn hình
│   ├── components/
│   │   ├── ui/              # Chứa các component nguyên tử (shadcn/ui - hơn 50 UI primitives)
│   │   ├── layout/          # Header, Footer, RootLayout điều hướng giao diện chung
│   │   ├── auth/            # ProtectedRoute kiểm tra quyền truy cập (Role Guard)
│   │   └── shared/          # Các component dùng chung giữa Client và Expert (ví dụ: Expert Profile)
│   └── pages/
│       ├── public/          # Trang công cộng (Trang chủ, Đăng nhập, Đăng ký)
│       ├── client/          # Trang nghiệp vụ dành riêng cho Client (Dashboard, Đăng Job, Quản lý Project, Ví/Thanh toán)
│       ├── expert/          # Trang nghiệp vụ của Expert (Dashboard, Tìm việc, Đề xuất Proposal, Ví/Rút tiền)
│       ├── admin/           # Dashboard Admin điều phối Dispute, Quản lý User, Quản lý Reviews
│       └── common/          # Các trang dùng chung (Chat Messenger, Notifications, TaskUpdate)
├── services/
│   ├── api.js               # API Client giao tiếp backend qua fetch / mock API handler
│   └── authService.js       # Các dịch vụ mã hóa / gửi nhận dữ liệu đăng nhập
└── data/
    ├── mockDatabase.js      # Cơ sở dữ liệu in-memory đầy đủ 11 thực thể phục vụ Demo
    └── mockApiHandler.js    # Bộ đánh chặn yêu cầu API hướng vào Mock Database
```

---

## 3. Hệ Thống Định Tuyến & Phân Quyền (Routing & Auth Guards)

Tệp [routes.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker/AI-Tasker/frontend/src/app/routes.jsx) định nghĩa cơ chế bảo vệ Route dựa trên Component `<ProtectedRoute />`.

### 3.1 Bảng Phân Quyền Định Tuyến

| Đường dẫn (Route Path) | Component | Vai trò được phép (Allowed Role) | Mô tả |
| :--- | :--- | :--- | :--- |
| `/` | `HomePage` | Public | Trang giới thiệu dịch vụ |
| `/login` | `LoginPage` | Public | Đăng nhập hệ thống |
| `/signup` | `SignUpPage` | Public | Đăng ký tài khoản mới |
| **Nhóm Client** | | | |
| `/client/dashboard` | `ClientDashboard` | `client` | Tổng quan dự án đã đăng |
| `/client/post-project` | `PostProject` | `client` | Đăng bài tuyển dụng AI |
| `/client/my-projects` | `MyProjectsList` | `client` | Quản lý dự án đang chạy |
| `/client/projects/:id` | `ClientProjectDetail` | `client` | Không gian quản lý dự án đang hoạt động & giải ngân tiền ký quỹ |
| `/client/billing` | `Billing` | `client` | Quản lý hóa đơn & Ví tiền |
| **Nhóm Expert** | | | |
| `/expert/dashboard` | `ExpertDashboard` | `expert` | Tổng quan thu nhập & tiến độ |
| `/expert/find-jobs` | `JobList` | `expert` | Tìm kiếm dự án AI đang mở |
| `/expert/jobs/:id` | `JobDetail` | `expert` | Chi tiết dự án tuyển dụng |
| `/expert/jobs/:id/proposal` | `SendProposal` | `expert` | Thiết lập và gửi đề xuất ứng tuyển (bộ dựng Tasks & Milestones 2 cấp) |
| `/expert/proposals` | `ProposalStatus` | `expert` | Trạng thái các đơn ứng tuyển (2 nút View Proposal và View Detail) |
| `/expert/proposals/:id` | `ProposalDetail` | `expert` | Chi tiết đề xuất ứng tuyển của Expert |
| `/expert/projects/:id` | `ExpertProjectDetail` | `expert` | Không gian cập nhật tiến độ (MiniTasks checklist) & nộp dự án |
| `/expert/wallet` | `ExpertWallet` | `expert` | Quản lý thu nhập & rút tiền |
| **Nhóm Admin / Owner** | | | |
| `/admin/dashboard` | `AdminDashboard` | `admin` | Giao diện quản lý chung |
| `/admin/disputes` | `AdminDisputes` | `admin` | Xử lý khiếu nại giữa Client/Expert |
| `/owner/dashboard` | `OwnerDashboard` | `owner` | Quyền tối cao (Quản lý Admin) |
| **Nhóm Chung (Yêu cầu Login)**| | | |
| `/messenger` | `Messenger` | Bất kỳ role nào đã xác thực | Phòng chat thời gian thực |
| `/notifications` | `NotificationsPage`| Bất kỳ role nào đã xác thực | Danh sách thông báo hệ thống |

---

## 4. Quản Lý Đăng Nhập & Phiên Làm Việc (Authentication State)

Tệp [AuthContext.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker/AI-Tasker/frontend/src/app/context/AuthContext.jsx) quản lý luồng dữ liệu bảo mật bằng React Context:

- **State lưu trữ**:
  ```javascript
  {
    user: { id, email, name, role, hasProfile },
    token: "JWT_ACCESS_TOKEN",
    role: "client" | "expert" | "admin" | "owner",
    isAuthenticated: true | false,
    loading: true | false,
    error: "Thông báo lỗi nếu có",
    usingDemo: true | false // True nếu đang dùng tài khoản Demo ngoại tuyến
  }
  ```
- **Hai Chế Độ Xác Thực**:
  1. **Chế độ thật (Real API Mode)**: Gửi request đến ASP.NET Web API thông qua `services/authService.js`. Token được lưu tại `localStorage` và đính kèm vào header `Authorization: Bearer <Token>` cho các request tiếp theo.
  2. **Chế độ thử nghiệm (Demo Auth Mode)**: Kích hoạt khi `VITE_USE_DEMO_AUTH=true`. Hệ thống bỏ qua máy chủ, tự sinh ra một Token giả lập JWT (`.demo-signature`) dựa trên email nhập vào (ví dụ: email chứa từ `expert` sẽ được gán quyền `expert`, chứa `admin` gán quyền `admin`,...).

---

## 5. Kết Nối API & Trình Đánh Chặn Mock DB

Tệp [api.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker/AI-Tasker/frontend/src/services/api.js) đóng vai trò là Gateway kết nối trung gian:

- **Bỏ qua Cảnh báo Ngrok**: Header `ngrok-skip-browser-warning: "true"` được thêm vào mọi yêu cầu để tránh trang trung gian của Ngrok chặn kết nối API từ Client.
- **Cơ chế Đánh chặn Mock DB (Mock DB Guard)**:
  ```javascript
  if (import.meta.env.VITE_USE_MOCK_DB === "true") {
      const { handleMockRequest } = await import("../data/mockApiHandler.js");
      const method = options.method || (options.body ? "POST" : "GET");
      return handleMockRequest(endpoint, method, options.body, options.authenticated !== false, getToken());
  }
  ```
  Nếu biến môi trường `VITE_USE_MOCK_DB` là `"true"`, toàn bộ các lệnh gọi API qua `api.js` (ví dụ: `api.jobPosts.list()`, `api.projects.updateStatus()`,...) sẽ **không** gửi request mạng thật mà được chuyển hướng sang tệp `mockApiHandler.js` để đọc/ghi trực tiếp vào cơ sở dữ liệu giả lập `mockDatabase.js` trong bộ nhớ Client. Điều này giúp phát triển nhanh giao diện Frontend độc lập mà không lo Backend bị gián đoạn kết nối.

---

## 6. Hệ Thống Đồng Bộ & Thông Báo Định Hướng Đối Tượng (Mới Bổ Sung)

### 6.1 Ngăn Ngừa Trùng Lặp Dự Án (Single Source of Truth)
Khi Client bấm "Thuê" hoặc thực hiện "Ký quỹ thành công", hệ thống đảm bảo **chỉ tạo duy nhất một bản ghi Dự án** (`Project`) trong database bằng cách:
1. Trước khi thực hiện `createProject()`, hệ thống sẽ quét danh sách dự án hiện có bằng hàm tìm kiếm theo `jobPostId`.
2. Nếu dự án đã tồn tại (ví dụ: được tạo từ luồng chấp nhận đề xuất trước đó), hệ thống sẽ gọi `updateProject()` để cập nhật trạng thái dự án thành `"active"` thay vì tạo trùng lặp.
3. Ẩn ngay lập tức JobPost đã đóng tuyển dụng (trạng thái `"hired"` hoặc `"closed"`) khỏi trang danh sách **All Projects** của Client (`MyProjectsPage.jsx`).

### 6.2 Cơ Chế Custom Event Bus Cập Nhật React State
Hệ thống sử dụng Custom Event Bus của trình duyệt để lắng nghe các thay đổi dữ liệu từ tầng Mock API và thực hiện gọi lại hàm (re-fetch) để cập nhật giao diện ngay lập tức mà không cần F5 reload:
1. Khi có bất kỳ hành động thay đổi dữ liệu thô (tạo dự án, cập nhật đề xuất, nạp tiền ký quỹ, thay đổi trạng thái MiniTask), tệp `mockDatabase.js` hoặc `mockApiHandler.js` sẽ phát đi sự kiện:
   ```javascript
   window.dispatchEvent(new CustomEvent("aitasker_db_update"));
   ```
2. Các màn hình nghiệp vụ chính đăng ký lắng nghe sự kiện này:
   - `ClientDashboard.jsx` & `ExpertDashboard.jsx`: Cập nhật biểu đồ tiến độ và thống kê dự án.
   - `MyProjectsPage.jsx`: Cập nhật danh sách dự án client đang chạy.
   - `ProjectDetail.jsx`: Cập nhật chi tiết ngân sách, trạng thái ký quỹ, và giải ngân.
   - `ClientProjectManagement.jsx` & `ExpertProjectManagement.jsx`: Cập nhật tiến độ Tasks, mốc Milestones và danh sách MiniTasks của dự án.
   - `Header.jsx`: Cập nhật số dư ví (`balance` & `escrowBalance`) của người dùng ngay lập tức.

### 6.3 Quản Lý Thông Báo Đúng Đối Tượng (Targeted Notifications)
Hệ thống sử dụng helper [notificationHelper.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_NoLoad/frontend/src/services/notificationHelper.js) điều phối luồng bắn thông báo dựa trên các cặp tác động (Sender -> Receiver) cụ thể:
- **Proposal Triggers (Đấu thầu)**:
  - *Expert gửi đề xuất mới (`notifyNewProposal`)*: Chỉ Client nhận thông báo: *"Chuyên gia [Tên Expert] vừa gửi một đề xuất mới cho công việc của bạn."*
  - *Expert cập nhật đề xuất (`notifyUpdatedProposal`)*: Chỉ Client nhận: *"Chuyên gia [Tên Expert] đã cập nhật và gửi lại đề xuất theo yêu cầu."*
  - *Client chấp nhận đề xuất (`notifyProposalDecision`)*: Expert được chọn nhận: *"Chúc mừng! Đề xuất của bạn đã được khách hàng [Tên Client] chấp nhận."* Các Expert bị từ chối còn lại đồng loạt nhận: *"Rất tiếc, khách hàng [Tên Client] đã từ chối đề xuất của bạn cho dự án này."* và proposal status chuyển sang `"rejected"`.
  - *Client hoàn thành ký quỹ (`notifyEscrowFunded`)*: Chỉ Expert được chọn nhận: *"Khách hàng [Tên Client] đã nạp tiền ký quỹ thành công. Dự án chính thức bắt đầu!"* (Các Expert khác không liên quan hoàn toàn không nhận thông báo).
- **Task & MiniTask Triggers (Quản lý Tiến độ & Công việc)**:
  - *Expert nộp duyệt Task (`notifyTaskSubmittedForReview`)*: Gửi thông báo tới Client: *"Chuyên gia [Tên Expert] đã nộp duyệt task [Tên Task]."*
  - *Client duyệt Task (`notifyTaskApproved`)*: Gửi thông báo chúc mừng tới Expert: *"Khách hàng [Tên Client] đã phê duyệt công việc của bạn tại Task [Tên Task]."*
  - *Client yêu cầu sửa đổi Task (`notifyTaskRevisionRequested`)*: Gửi tới Expert kèm feedback chi tiết: *"Khách hàng [Tên Client] yêu cầu chỉnh sửa Task [Tên Task]. Lý do: [Nội dung phản hồi]"*
  - *Client yêu cầu sửa đổi MiniTask (`notifyMiniTaskRevisionRequested`)*: Gửi tới Expert chỉ rõ danh sách các đầu việc nhỏ cần sửa đổi.
  - *Task bị quá hạn (`notifyTaskOverdue`)*: Cảnh báo tới cả Client và Expert về mốc deadline bị quá hạn.
  - *Client yêu cầu nộp khẩn cấp (`notifyUrgentSubmissionRequested`)*: Bắn cảnh báo yêu cầu Expert ưu tiên hoàn thành gấp đầu việc đang bị trễ.

### 6.4 Bộ State và Hook Quản Lý Tiến Độ (useProjectProgress & projectTimelineStore)
- **Tệp [useProjectProgress.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_NoLoad/frontend/src/app/hooks/useProjectProgress.js)**:
  - Hook dùng chung giữa Client và Expert để đồng bộ hóa và quản lý logic nghiệp vụ của Project, Tasks và MiniTasks.
  - Tự động gọi lại `loadData()` khi nhận sự kiện `aitasker_db_update` từ Custom Event Bus.
  - Xuất ra các hàm đột phá trạng thái (mutation handlers) dành cho Expert: `handleToggleMiniTask`, `handleAddMiniTask`, `handleRemoveMiniTask`, `handleReorderMiniTasks`, `handleSubmitForReview`.
  - Xuất ra các hàm nghiệm thu/chỉnh sửa dành cho Client: `handleApproveTask`, `handleRequestRevision`, `handleRequestMiniTaskRevision`, `handleRequestReopen`, `handleRequestUrgentSubmission`.
- **Tệp [projectTimelineStore.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_NoLoad/frontend/src/app/lib/projectTimelineStore.js)**:
  - Chứa thuật toán tính toán tiến trình (progress):
    - Tiến độ từng Task = `completed mini tasks / total mini tasks` (%).
    - Tiến độ dự án tổng = `trung bình cộng tiến độ của toàn bộ các Task` (%).
  - Chứa logic xác định trạng thái hiển thị của Task (`deriveTaskDisplayStatus`) phân tách rạch ròi 6 trạng thái: *Not Started, In Progress, Waiting For Approval, Done, Needs Revision, Reopen Requested*.

---

## 7. Cấu Hình Trạng Thái Đề Xuất & Trợ Lý AI Use Case (Mới Bổ Sung)

### 7.1 Hệ Thống Quản Lý Trạng Thái Đề Xuất (proposalStatusConfig.js)
Tệp [proposalStatusConfig.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/lib/proposalStatusConfig.js) là "single source of truth" quản lý thông tin trạng thái đề xuất (`Proposal`) trong toàn bộ giao diện:
- **Các Trạng thái Đề xuất Hỗ trợ**:
  - `pending`: Đang chờ Client phê duyệt (màu vàng).
  - `accepted`: Đề xuất được chấp nhận (màu xanh lá).
  - `declined`: Đề xuất bị từ chối (màu đỏ).
  - `withdrawn`: Expert rút đơn trước khi phê duyệt (màu xám).
  - `under_review`: Client đang tích cực xem xét (màu xanh dương).
  - `pending_escrow`: Đã phê duyệt, đang chờ Client nạp tiền ký quỹ (màu cam).
  - `expired`: Đề xuất tự động hủy sau 7 ngày không phản hồi (màu xám đậm).
- **Hàm bổ trợ**: `getProposalStatusConfig(status)`, `getProposalStatusLabel(status)`, và `getProposalStatusClass(status)`.

### 7.2 Quét Hạn Đề Xuất Tự Động (Giai đoạn 2)
Tích hợp nghiệp vụ tự động hủy đề xuất sau 7 ngày trong [mockDatabase.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/data/mockDatabase.js) qua hàm `checkProposalDeadlines()`:
- Quét danh sách đề xuất ở trạng thái `pending` hoặc `submitted`.
- **Mốc 6 ngày**: Gửi thông báo khẩn cấp nhắc nhở Client duyệt đề xuất.
- **Mốc 7 ngày (Quá hạn)**: Tự động chuyển trạng thái đề xuất thành `"expired"`, đồng thời bắn thông báo hủy đề xuất tới cả Client và Expert.

### 7.3 Hộp thoại Chat AI Lập Kế Hoạch Use Cases (AIClientsUseCasePlanner.jsx)
Tích hợp trợ lý AI lập kế hoạch dạng chat trực tiếp tại [AIClientsUseCasePlanner.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/components/ai/AIClientsUseCasePlanner.jsx):
- **Cơ chế đọc tự động (Auto-trigger)**: Tự động trích xuất các thông tin hiện có trong Form đăng dự án (Tiêu đề, Mô tả và tài liệu đính kèm BRD/SRS) để chạy phân tích ngay khi Client mở bảng chat AI.
- **Nhận diện nghiệp vụ (AI Domain Recognition)**: Phân loại thông minh dựa trên heuristics để đề xuất Category, Specialization, Skills tương thích và phân rã các Project Use Cases chuẩn hóa.
- **Áp dụng tự động (Apply Plan)**: Cung cấp nút *"Áp dụng Use Cases này"* để đổ ngược dữ liệu đã phân tách vào form đăng tuyển.

### 7.4 Tái Cấu Trúc Sidebar Đăng Dự Án Tab Kép (PostProject.jsx)
Nâng cấp sidebar tại [PostProject.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/pages/client/PostProject.jsx) từ hiển thị danh sách tĩnh sang hệ thống **Tab kép linh hoạt**:
- **Tab 🤖 AI Use Cases**: Tích hợp khung chat của `AIClientsUseCasePlanner` để Client tương tác và lập Use Cases với AI.
- **Tab 👤 Recommended**: Chứa danh sách Chuyên gia AI phù hợp được tối ưu hóa theo số dự án đã hoàn thành (ưu tiên chuyên gia có từ 3 dự án trở xuống).
- Điều hướng mở Tab tương ứng khi Client bấm chọn nút *"Parse with AI"* hoặc *"Recommend Expert by AI"* bên trong form.

---

## 8. Đồng Bộ Use Cases Với Giao Diện Quản Lý Tiến Độ & Quản Lý Checklist Chi Tiết (Mới Bổ Sung)

### 8.1 Ánh Xạ Use Case Động Vào Tasks & Milestones (Dynamic Use Case Mapping)
- **Cơ chế**: Để đảm bảo tính nhất quán giữa mô tả công việc ban đầu của Client và các đầu việc của Expert, tiêu đề và mô tả của từng `Task` (Milestone lớn) hiển thị ở phía Client lẫn Expert được tự động lấy từ Use Case tương ứng thuộc dự án (`project.useCases[task.useCaseIndex]`).
- **Phạm vi tác động**: 
  - [TaskProgressCard.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/components/project/TaskProgressCard.jsx): Tự động đổi tiêu đề và mô tả, ẩn nút "Sửa mô tả" bên phía Expert.
  - [TaskDetailPage.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/pages/common/TaskDetailPage.jsx): Hiển thị đồng bộ Use Case info làm tiêu đề/mô tả của trang chi tiết công việc.

### 8.2 Nghiệm Thu Công Việc Inline Phía Client (Client Inline Review Panel)
- **Cơ chế**: Client không cần di chuyển sang trang chi tiết của từng Task để kiểm tra sản phẩm hoặc phê duyệt. Toàn bộ quy trình nghiệm thu được tích hợp trực tiếp ngay trên các thẻ Use Case ở trang quản lý tiến độ:
  - Khi một Task có checklist hoàn thành 100% hoặc ở trạng thái chờ duyệt (`pending_review`), Client sẽ thấy nút duyệt nhanh **Phê duyệt (Accept)** và nút đòi hỏi sản phẩm **Yêu cầu sản phẩm (Request Product)**.
  - Nếu Expert đã nộp liên kết/tài liệu sản phẩm, Client sẽ thấy nút **Xem sản phẩm (View Product)** để mở Modal đánh giá sản phẩm tổng quan và đưa ra lựa chọn duyệt hoặc yêu cầu sửa đổi (kèm lý do chi tiết) ngay tại chỗ.

### 8.3 Đếm Ngược Thời Gian Thực Tế Còn Lại (Remaining Timeline Countdown)
- **Hàm bổ trợ**: `getRemainingTimelineText(deadline)` trong [projectTimelineStore.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/lib/projectTimelineStore.js) thực hiện phân tích hạn chót và trả về thông tin thời gian còn lại (ưu tiên hiển thị 2 đơn vị lớn nhất như tháng & ngày, ngày & giờ, giờ & phút,...) hoặc cảnh báo quá hạn.
- **Vị trí hiển thị**:
  - Tiêu đề dự án ([ProjectHeaderCard.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/components/project/ProjectHeaderCard.jsx)): Cột **Timeline còn lại** trong bảng thông tin dự án.
  - Thẻ Task ([TaskProgressCard.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/components/project/TaskProgressCard.jsx)): Huy hiệu đếm ngược kế bên thời hạn deadline.
  - Trang chi tiết Task ([TaskDetailPage.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/pages/common/TaskDetailPage.jsx)): Hiển thị thời gian còn lại dưới mốc deadline.

### 8.4 Tinh Giản Xác Nhận Vượt Quá Chỉ Tiêu Phía Expert
- **Thay đổi**: Tại [SendProposal.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/pages/expert/SendProposal.jsx), loại bỏ hoàn toàn checkbox gia hạn timeline nằm trong danh sách Use Case:
  - *Đã xóa*: `Tôi xác nhận proposal có Use Case vượt thời gian gốc và đồng ý gửi kèm đề xuất xin Client gia hạn.`
  - *Giữ lại*: Checkbox ở cuối trang phía trên nút Gửi proposal (`Tôi xác nhận và đồng ý gửi đề xuất với mức chi phí/timeline vượt quá chỉ tiêu của khách hàng.`) để làm cổng xác nhận duy nhất khi gửi Proposal vượt định mức.

### 8.5 Modal Chi Tiết Use Case & Checklist Cho Expert (Expert Use Case Detail Modal)
- **Cơ chế**: Để giao diện trang chính gọn gàng hơn và tránh Expert vô tình tick nhầm tiến độ, danh sách các Tasks & Milestones con sẽ không được hiển thị trực tiếp trên trang quản lý tiến độ chính của Expert.
- **Thiết kế**:
  - Mỗi thẻ Use Case hiển thị thông tin chung và một nút **Detail** (Xem chi tiết).
  - Khi click vào nút **Detail**, một Dialog modal ([ProjectProgressPanel.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/components/project/ProjectProgressPanel.jsx)) sẽ mở ra hiển thị danh sách Task, Milestone & Checklist thuộc riêng Use Case đó. Expert có thể thực hiện kiểm tra tiến độ, sửa mô tả, check-off checklist và submit sản phẩm hoàn thành ngay tại đây.

---

## 9. Đánh Dấu Hoàn Thành & Nhật Ký Hoạt Động Của Expert (Mới Bổ Sung)

### 9.1 Đồng Bộ Hóa Và Tự Phục Hồi Nhiệm Vụ (Self-Healing Task Sync)
- **Cơ chế tự phục hồi**: Trong trường hợp các nhiệm vụ (`Tasks`) chỉ tồn tại trong danh sách nhúng của dự án (`project.tasks`) mà chưa được ghi nhận ở bảng `tasks` toàn cục (ví dụ sau khi chấp nhận đề xuất), hàm `_getById("tasks", id)` trong [mockDatabase.js](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/data/mockDatabase.js) sẽ tự động tìm kiếm trong danh sách của dự án và đồng bộ ngược trở lại bảng `tasks` trên bộ nhớ trình duyệt.
- **Đồng bộ hai chiều**: Mọi thao tác cập nhật (như `toggleMiniTaskCompletion`, `updateTask`) trên bảng `tasks` đều tự động đồng bộ ngược lại mảng `tasks` của `projects` tương ứng và ngược lại thông qua các hàm gốc `_create` và `_update` của Mock Database.

### 9.2 Hiển Thị Checkbox Màu Xanh Lá Và Đánh Dấu Thẻ Nhiệm Vụ
- **Checkbox màu xanh**: Thay đổi màu sắc biểu tượng Square/CheckSquare từ màu xanh dương thương hiệu sang màu xanh lá cây (`text-green-600`) khi nhiệm vụ đã hoàn thành.
- **Tô màu nền nổi bật**: Khi một nhiệm vụ (Task) đạt tiến độ 100% (hoặc tất cả milestones con hoàn thành) hoặc một milestone đơn lẻ được tích chọn, giao diện [ExpertUseCaseUpdatePage.jsx](file:///d:/FPT/FPTU_LearnAndTest/FPT_Learning_Lesson/Course5_Summer2026/SWP301/AI-Tasker_Root/frontend/src/app/pages/expert/ExpertUseCaseUpdatePage.jsx) sẽ tự động chuyển nền và viền thẻ nhiệm vụ sang màu xanh lá nhẹ (`bg-green-50/40 border-green-200`) để chuyên gia dễ dàng nhận biết các đầu việc đã hoàn thành.

### 9.3 Tự Động Ghi Nhật Ký Hoạt Động (Activity Logs) Theo Cú Pháp Yêu Cầu
- **Hoạt động hoàn thành**: Khi tích chọn, hệ thống ghi nhật ký dưới dạng: `[Expert] hoàn thành...`.
- **Hoạt động hủy hoàn thành (Bỏ tích)**: Khi Expert hủy chọn một checkbox, hệ thống sẽ ghi nhận hoạt động kèm cụm từ bắt buộc **đã thay đổi** để mô tả hành động (ví dụ: `[Expert] đã thay đổi trạng thái nhiệm vụ: hủy hoàn thành...`).
- **Hoạt động thay đổi tiêu đề**: Khi Expert sửa tên nhiệm vụ hoặc milestone, hệ thống ghi lại nhật ký chi tiết: `[Expert] đã thay đổi tiêu đề... từ "[Tên cũ]" thành "[Tên mới]"`.

---

## 10. Cập Nhật Các Tính Năng Nâng Cao Gần Đây (Checkpoint 3)

### 10.1 Liên Kết Theo UseCase_ID Tránh Sai Lệch Dữ Liệu
- **Tập tin**: `routes.jsx`, `ProjectProgressPanel.jsx`, `useProjectProgress.js`, `ExpertUseCaseUpdatePage.jsx`.
- **Cơ chế**: Đường dẫn cập nhật Use Case phía Expert đổi tham số định tuyến từ `:index` sang `:useCaseId` (ví dụ: `/expert/projects/:id/usecase/:useCaseId`). Hàm lọc Task lấy `useCaseId` làm khóa chính thay vì mảng chỉ mục động, giúp dự án duy trì tính toàn vẹn dữ liệu ngay cả khi thứ tự Use Case bị thay đổi.

### 10.2 Ràng Buộc Bằng Chứng Bàn Giao (Evidence Constraint)
- **Tập tin**: `useProjectProgress.js`, `ExpertUseCaseUpdatePage.jsx`, `TaskProgressCard.jsx`, `TaskDetailPage.jsx`.
- **Cơ chế**: Để Task đạt trạng thái nghiệm thu `"Checklist Completed"`, Expert phải điền và nộp bằng chứng bàn giao (Git commit SHA, link báo cáo...) trong Form trên trang cập nhật Use Case. Trình duyệt hiển thị hộp văn bản in rõ bằng chứng này ở cả góc nhìn Client và Expert.

### 10.3 Banner Đỏ Cho Đề Xuất Lệch Ngân Sách (Budget Deviation Checks)
- **Tập tin**: `SendProposal.jsx`.
- **Cơ chế**: Hiển thị banner màu đỏ (`bg-red-50 text-red-800`) cảnh báo khi Expert điền giá thầu vượt quá ngân sách gốc của dự án. Hiển thị rõ số tiền Budget Deviation bị âm. Chặn nộp proposal cho đến khi hộp kiểm xác nhận vượt chỉ tiêu được tích chọn.

### 10.4 Workspace Client Không Bị Khóa Cứng (Unblocked Workspace)
- **Tập tin**: `ClientProjectManagement.jsx`, `ProjectProgressPanel.jsx`.
- **Cơ chế**: Thiết lập `readOnly={false}` cho Progress Panel khi dự án bị tranh chấp. Khóa có chọn lọc (Scenario C) khi Use Case ở trạng thái `"waiting_expert_product"`. Nút Report (Báo cáo vi phạm) luôn hiển thị và khả dụng.

### 10.5 Dispute Timeout 48h Của Tranh Chấp
- **Tập tin**: `AdminReportDetail.jsx`.
- **Cơ chế**: Hiển thị banner màu tím cảnh báo kèm đồng hồ đếm ngược khi trạng thái báo cáo là `"Awaiting Evidence"`. Mở khóa phán quyết tự động của Admin khi hết thời gian 48 giờ.
