import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  X,
} from "lucide-react";
import { AIFileUploadZone } from "./AIFileUploadZone.jsx";

// Helper function to mock AI requirements scanning
function generateClientUseCases(userMessage, fileNames) {
  const msg = (userMessage || "").toLowerCase();
  const hasFiles = fileNames.length > 0;
  const fileContext = hasFiles ? fileNames.join(", ") : "";

  let category = "Artificial Intelligence";
  let specialization = "Natural Language Processing";
  let skills = ["Hugging Face Transformers", "Semantic Search", "Python", "BERT"];
  let useCases = [
    { nameAndDeadline: "Use Case 1: Thiết lập cơ sở dữ liệu & Xác thực người dùng - Hạn chót: 5 ngày", description: "Cài đặt JWT Auth, lưu trữ phiên trò chuyện và thiết kế cơ sở dữ liệu lịch sử chat.", durationDays: 5, durationValue: 5, durationUnit: "days" },
    { nameAndDeadline: "Use Case 2: Phân tách & Nhúng tài liệu (Document Embedding) - Hạn chót: 7 ngày", description: "Xây dựng cổng upload tài liệu PDF/TXT, triển khai thuật toán phân tách câu và lưu vector embeddings.", durationDays: 7, durationValue: 7, durationUnit: "days" },
    { nameAndDeadline: "Use Case 3: Cấu hình LLM & Prompt RAG API - Hạn chót: 6 ngày", description: "Tích hợp thư viện LangChain để gọi LLM và triển khai hệ thống kiểm duyệt câu trả lời (guardrails).", durationDays: 6, durationValue: 6, durationUnit: "days" },
    { nameAndDeadline: "Use Case 4: Giao diện Chatbot Real-time & Stream Response - Hạn chót: 6 ngày", description: "Thiết kế giao diện chat responsive, hiệu ứng typing indicator, stream text từ API và định dạng markdown.", durationDays: 6, durationValue: 6, durationUnit: "days" }
  ];

  if (msg.includes("medical") || msg.includes("imaging") || msg.includes("lung") || msg.includes("scan") || msg.includes("x-ray")) {
    category = "Artificial Intelligence";
    specialization = "Computer Vision";
    skills = ["OpenCV Library", "YOLO Object Detection", "Image Segmentation", "PyTorch Vision"];
    useCases = [
      { nameAndDeadline: "Use Case 1: Đọc & Chuẩn hóa ảnh DICOM - Hạn chót: 5 ngày", description: "Phát triển bộ đọc tệp tin y tế DICOM, trích xuất metadata và lưu trữ thông tin ảnh vào cơ sở dữ liệu.", durationDays: 5, durationValue: 5, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Huấn luyện & Đánh giá Model PyTorch - Hạn chót: 12 ngày", description: "Huấn luyện mô hình phân loại tổn thương phổi trên PyTorch, tối ưu hóa độ nhạy đạt tối thiểu 94%.", durationDays: 12, durationValue: 12, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: Giao diện vẽ Box & Đánh dấu cho bác sĩ - Hạn chót: 8 ngày", description: "Thiết kế canvas vẽ bounding box và vùng phân đoạn ảnh trực quan trên giao diện web.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 4: Tự động xuất báo cáo chẩn đoán PDF - Hạn chót: 5 ngày", description: "Hệ thống tự động tổng hợp kết quả của AI và tạo tệp tin PDF báo cáo y tế chuẩn hóa.", durationDays: 5, durationValue: 5, durationUnit: "days" }
    ];
  } else if (msg.includes("fraud") || msg.includes("transaction") || msg.includes("payment") || msg.includes("risk")) {
    category = "Artificial Intelligence";
    specialization = "Machine Learning";
    skills = ["Python", "Scikit-Learn", "Regression Models", "Classification & Clustering"];
    useCases = [
      { nameAndDeadline: "Use Case 1: Pipeline thu thập giao dịch thời gian thực - Hạn chót: 8 ngày", description: "Thiết lập consumer Kafka xử lý dữ liệu giao dịch đầu vào với tốc độ 50K events/giây.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Huấn luyện Model phát hiện gian lận - Hạn chót: 10 ngày", description: "Xây dựng và tối ưu hóa mô hình phân lớp XGBoost/LightGBM dựa trên các đặc trưng hành vi giao dịch.", durationDays: 10, durationValue: 10, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: Dashboard giải thích quyết định của AI (XAI) - Hạn chót: 8 ngày", description: "Hiển thị giá trị đóng góp SHAP/LIME để giải thích lý do giao dịch bị đánh dấu gian lận cho nhân viên kiểm duyệt.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 4: Hệ thống cảnh báo & Tự động khóa thẻ - Hạn chót: 4 ngày", description: "Kích hoạt cảnh báo thời gian thực qua SMS/Email và tự động gửi lệnh khóa tài khoản/thẻ có dấu hiệu rủi ro cao.", durationDays: 4, durationValue: 4, durationUnit: "days" }
    ];
  } else if (msg.includes("recommend") || msg.includes("suggest") || msg.includes("recommender") || msg.includes("movie") || msg.includes("e-commerce")) {
    category = "Artificial Intelligence";
    specialization = "Generative AI";
    skills = ["OpenAI API Integration", "LangChain Framework", "Vector Databases (Pinecone/Chroma)", "Prompt Engineering"];
    useCases = [
      { nameAndDeadline: "Use Case 1: Thu thập hành vi tương tác của người dùng - Hạn chót: 6 ngày", description: "Ghi nhận lượt xem sản phẩm, đánh giá và lịch sử mua sắm theo thời gian thực.", durationDays: 6, durationValue: 6, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Huấn luyện mô hình Collaborative Filtering - Hạn chót: 8 ngày", description: "Xây dựng mô hình Matrix Factorization hoặc Two-Tower Neural Network để dự đoán sản phẩm gợi ý.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: Triển khai hạ tầng A/B Testing - Hạn chót: 6 ngày", description: "Phân luồng người dùng thử nghiệm và đo lường sự thay đổi của tỷ lệ chuyển đổi đơn hàng.", durationDays: 6, durationValue: 6, durationUnit: "days" },
      { nameAndDeadline: "Use Case 4: API gợi ý sản phẩm độ trễ thấp (<100ms) - Hạn chót: 5 ngày", description: "Xây dựng hệ thống cache Redis để phục vụ danh sách gợi ý sản phẩm ngay khi tải trang.", durationDays: 5, durationValue: 5, durationUnit: "days" }
    ];
  } else if (msg.includes("game") || msg.includes("npc") || msg.includes("unreal") || msg.includes("reinforcement")) {
    category = "Artificial Intelligence";
    specialization = "AI Agent Development";
    skills = ["Python", "AI Agent Tooling", "Deep Neural Networks", "PyTorch Library", "CNN/RNN Architectures"];
    useCases = [
      { nameAndDeadline: "Use Case 1: RL Environment & Wrapper - Hạn chót: 10 ngày", description: "Expose NPC states, actions, rewards into a Python training script wrapper.", durationDays: 10, durationValue: 10, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Multi-Agent Policy Training - Hạn chót: 14 ngày", description: "Train agents using PPO/SAC with attention models for social behaviors.", durationDays: 14, durationValue: 14, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: UE5 PyTorch C++ Plugin - Hạn chót: 10 ngày", description: "Create plugin wrapping PyTorch lib to load models and query actions at 60 FPS.", durationDays: 10, durationValue: 10, durationUnit: "days" }
    ];
  } else if (!msg.includes("chatbot") && !msg.includes("nlp") && !msg.includes("assistant")) {
    // Other categories fallback
    category = "Mobile Phones & Computing";
    specialization = "Software Engineering";
    skills = ["Python", "System Design", "Algorithms"];
    useCases = [
      { nameAndDeadline: "Use Case 1: Phân tích yêu cầu & Thiết kế kiến trúc - Hạn chót: 4 ngày", description: "Vẽ sơ đồ luồng nghiệp vụ, đặc tả cơ sở dữ liệu ERD và định nghĩa các tài liệu thiết kế.", durationDays: 4, durationValue: 4, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Triển khai Cơ sở dữ liệu & Viết Backend API - Hạn chót: 8 ngày", description: "Viết migrations, cấu hình database và hoàn thiện các API Endpoint CRUD cơ bản.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: Tích hợp giao diện Frontend - Hạn chót: 8 ngày", description: "Tạo các trang màn hình, kết nối form dữ liệu với API và quản lý state tập trung.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 4: Kiểm thử hệ thống & Bàn giao - Hạn chót: 5 ngày", description: "Chạy các bài kiểm thử tích hợp (Integration Tests) và deploy dự án lên môi trường staging để nghiệm thu.", durationDays: 5, durationValue: 5, durationUnit: "days" }
    ];
  }

  const fileText = hasFiles ? ` (Dựa trên tài liệu: ${fileContext})` : "";
  const introText = `Chào bạn! Tôi đã phân tích yêu cầu từ tin nhắn của bạn${fileText}. Dưới đây là đề xuất danh sách các **Project Use Cases** chuẩn hóa kèm theo thời gian thực hiện đề xuất để bạn đưa vào bài tuyển dụng:`;

  return { category, specialization, skills, useCases, introText };
}

export function AIClientsUseCasePlanner({ 
  onClose, 
  onApplyPlan, 
  existingFiles = [],
  initialTitle = "",
  initialDescription = ""
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState(existingFiles);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);

    const welcomeMsg = {
      role: "ai",
      text: `Chào bạn! Tôi là trợ lý lập kế hoạch Use Case bằng AI.\n\nHãy tải lên tài liệu mô tả yêu cầu (BRD/SRS) của bạn ở trên, hoặc mô tả ý tưởng dự án của bạn tại đây (ví dụ: "Tôi muốn làm một chatbot bán hàng tích hợp RAG").\n\nTập lệnh AI của tôi sẽ tiến hành phân tách và chuẩn hóa các Project Use Cases cùng timeline tối đa gốc cụ thể để bạn áp dụng vào form tuyển dụng!`,
      timestamp: Date.now()
    };
    setMessages([welcomeMsg]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generatedPlan]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && files.length === 0) return;
    if (loading) return;

    const userMsgText = trimmed || `Hãy phân tích tài liệu đính kèm để sinh Use Cases: ${files.map(f => f.name).join(", ")}`;
    const userMsg = { role: "user", text: userMsgText, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const fileNames = files.map((f) => f.name);
      const result = generateClientUseCases(userMsgText, fileNames);
      setGeneratedPlan(result);
      setApplied(false);

      const aiMsg = { 
        role: "ai", 
        text: result.introText, 
        plan: result, 
        timestamp: Date.now() 
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1200 + Math.random() * 800);
  }, [input, loading, files]);

  const handleApply = useCallback(() => {
    if (generatedPlan) {
      onApplyPlan(generatedPlan);
      setApplied(true);
    }
  }, [generatedPlan, onApplyPlan]);

  const handleFilesChange = useCallback((newFiles) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      const names = newFiles.map((f) => f.name).join(", ");
      setMessages((prev) => [
        ...prev, 
        { role: "user", text: `Đã đính kèm tài liệu: ${names}`, timestamp: Date.now() }
      ]);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/50">
        <div>
          <h2 className="text-sm font-bold text-gray-900">🤖 AI Use Case Planner</h2>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Lập kế hoạch Use Cases từ tài liệu & trò chuyện
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
        >
          Đóng
        </button>
      </div>

      {/* Upload Requirements */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📎 Tải lên BRD / SRS
        </p>
        <AIFileUploadZone files={files} onFilesChange={handleFilesChange} disabled={loading} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 bg-slate-50">
        <div className="space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-gray-350 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Hãy nhắn tin hoặc tải lên tài liệu để AI tự động lập luồng Use Cases dự án.</p>
              <p className="text-xs text-gray-400 mt-1 italic">Ví dụ: "Tôi muốn làm chatbot hỗ trợ khách hàng tích hợp RAG"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-primary text-white rounded-br-md shadow-sm"
                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                {/* Show details if generated plan is embedded inside AI response */}
                {msg.role === "ai" && msg.plan && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                    <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-2.5">
                      <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                        Phân loại dự đoán:
                      </p>
                      <p className="text-xs text-gray-700 font-semibold mt-0.5">
                        {msg.plan.category} ({msg.plan.specialization})
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Danh sách Use Cases đề xuất:
                      </p>
                      {msg.plan.useCases.map((uc, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-150 rounded-lg p-2.5 text-xs text-gray-700 space-y-1">
                          <p className="font-semibold text-gray-900">{uc.nameAndDeadline}</p>
                          <p className="text-gray-500 leading-normal">{uc.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-150 rounded-xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span className="text-sm text-gray-500 font-medium">AI đang phân tích tài liệu & yêu cầu...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Plan Applicator / Submit Footer */}
      {generatedPlan && !loading && (
        <div className="shrink-0 bg-white border-t border-gray-150 p-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={applied}
            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              applied
                ? "bg-emerald-50 text-emerald-700 border border-emerald-250 cursor-default"
                : "bg-brand-primary text-white hover:bg-brand-primary-hover"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {applied ? "✓ Đã áp dụng Use Cases vào Form" : "Áp dụng Use Cases này"}
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div className="shrink-0 p-3 bg-white border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Mô tả dự án hoặc đặt câu hỏi..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-primary"
          />
          <button
            type="submit"
            disabled={(!input.trim() && files.length === 0) || loading}
            className="h-10 w-10 shrink-0 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
