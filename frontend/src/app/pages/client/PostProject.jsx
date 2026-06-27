import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  Send,
  Star,
  MapPin,
  Clock,
  CheckCircle,
  Briefcase,
  Sparkles,
  Bot,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import { AIClientsUseCasePlanner } from "../../components/ai/AIClientsUseCasePlanner.jsx";

const CATEGORY_DATA = {
  "Engineering & Science": {
    specializations: [
      "Aerospace Engineering",
      "Chemical Engineering",
      "Civil Engineering",
      "Electrical Engineering",
      "Mechanical Engineering",
      "Environmental Science",
      "Biotechnology",
      "Physics",
    ],
    skills: {
      "Aerospace Engineering": [
        "Aerodynamics",
        "Propulsion",
        "CAD/CAM",
        "MATLAB",
      ],
      "Chemical Engineering": [
        "Process Simulation",
        "ASPEN Plus",
        "Thermodynamics",
        "Chemical Synthesis",
      ],
      "Civil Engineering": [
        "AutoCAD",
        "Structural Analysis",
        "Revit",
        "GIS Mapping",
      ],
      "Electrical Engineering": [
        "Circuit Design",
        "FPGA Programming",
        "Verilog",
        "Altium Designer",
      ],
      "Mechanical Engineering": [
        "SolidWorks",
        "Finite Element Analysis (FEA)",
        "Thermodynamics",
        "Robotics",
      ],
      "Environmental Science": [
        "Environmental Impact Assessment",
        "GIS Mapping",
        "Water Quality Analysis",
        "Ecology",
      ],
      Biotechnology: [
        "CRISPR Gene Editing",
        "Bioinformatics",
        "Cell Culture",
        "PCR Analysis",
      ],
      Physics: [
        "Quantum Mechanics",
        "Computational Physics",
        "Data Analysis",
        "LaTeX Documenting",
      ],
    },
  },
  "Sales & Marketing": {
    specializations: [
      "Digital Marketing",
      "Search Engine Optimization (SEO)",
      "Social Media Management",
      "Content Marketing",
      "Email Marketing",
      "Sales Strategy",
      "Brand Management",
      "Market Research",
    ],
    skills: {
      "Digital Marketing": [
        "Google Ads",
        "Facebook Ads Manager",
        "Google Analytics",
        "PPC Campaigns",
      ],
      "Search Engine Optimization (SEO)": [
        "Keyword Research",
        "On-Page SEO",
        "Link Building",
        "SEMrush/Ahrefs",
      ],
      "Social Media Management": [
        "Content Scheduling",
        "Copywriting",
        "Canva Designing",
        "Community Management",
      ],
      "Content Marketing": [
        "SEO Writing",
        "Blogging",
        "Content Strategy",
        "Copywriting",
      ],
      "Email Marketing": [
        "Mailchimp",
        "HubSpot",
        "Email Copywriting",
        "A/B Testing Campaigns",
      ],
      "Sales Strategy": [
        "Lead Generation",
        "Cold Calling",
        "CRM (Salesforce)",
        "Sales Pitch Negotiation",
      ],
      "Brand Management": [
        "Brand Identity",
        "Public Relations",
        "Market Trend Analysis",
        "Visual Brand Book",
      ],
      "Market Research": [
        "Data Collection",
        "Survey Design",
        "Competitive Analysis",
        "SPSS Statistics",
      ],
    },
  },
  "Business, Accounting, Human Resources & Legal": {
    specializations: [
      "Financial Accounting",
      "Auditing",
      "Corporate Law",
      "Intellectual Property",
      "Recruitment & Talent Acquisition",
      "Employee Relations",
      "Business Strategy",
      "Project Management",
    ],
    skills: {
      "Financial Accounting": [
        "Quickbooks",
        "GAAP Compliance",
        "Financial Reporting",
        "Tax Preparation",
      ],
      Auditing: [
        "Internal Audit",
        "Risk Assessment",
        "SOX Compliance",
        "Financial Analysis",
      ],
      "Corporate Law": [
        "Contract Drafting",
        "Due Diligence",
        "Mergers & Acquisitions",
        "Corporate Governance",
      ],
      "Intellectual Property": [
        "Patent Filing",
        "Trademark Law",
        "Copyrights Law",
        "IP Strategy",
      ],
      "Recruitment & Talent Acquisition": [
        "ATS Systems",
        "Candidate Sourcing",
        "Interviewing Techniques",
        "Executive Search",
      ],
      "Employee Relations": [
        "Conflict Resolution",
        "HR Policy Design",
        "Onboarding Programs",
        "Performance Management",
      ],
      "Business Strategy": [
        "Market Entry Strategy",
        "SWOT Analysis",
        "Financial Modeling",
        "Management Consulting",
      ],
      "Project Management": [
        "Scrum Framework",
        "Agile Methodologies",
        "Jira/Asana Management",
        "PMP Standards",
      ],
    },
  },
  "Product Sourcing & Manufacturing": {
    specializations: [
      "Supply Chain Management",
      "Logistics",
      "Product Design",
      "Quality Control",
      "Manufacturing Engineering",
      "Vendor Relations",
      "Inventory Management",
    ],
    skills: {
      "Supply Chain Management": [
        "ERP Systems",
        "Sales & Operations Planning (S&OP)",
        "Procurement",
        "Strategic Sourcing",
      ],
      Logistics: [
        "Freight Coordination",
        "Route Planning",
        "Third-Party Logistics (3PL)",
        "Warehouse Management",
      ],
      "Product Design": [
        "CAD Prototyping",
        "Ergonomics Study",
        "Material Selection",
        "DFM (Design for Manufacturing)",
      ],
      "Quality Control": [
        "Six Sigma",
        "Lean Manufacturing",
        "ISO 9001 Auditing",
        "QA Inspections",
      ],
      "Manufacturing Engineering": [
        "CNC Programming",
        "Automation Systems",
        "PLC Programming",
        "Assembly Line Layout",
      ],
      "Vendor Relations": [
        "Contract Negotiation",
        "Supplier Audit",
        "Global Sourcing",
        "Cost Estimation",
      ],
      "Inventory Management": [
        "FIFO/LIFO Operations",
        "Demand Forecasting",
        "WMS Software",
        "Cycle Counting",
      ],
    },
  },
  "Mobile Phones & Computing": {
    specializations: [
      "Software Engineering",
      "Mobile App Development",
      "UI/UX Design",
      "Cloud Computing",
      "Cyber Security",
      "Database Administration",
      "Devops",
      "Computer Networks",
    ],
    skills: {
      "Software Engineering": [
        "Java",
        "C++",
        "Python",
        "Go",
        "Rust",
        "System Design",
        "Algorithms",
      ],
      "Mobile App Development": [
        "Swift (iOS)",
        "Kotlin (Android)",
        "React Native",
        "Flutter",
        "Mobile SDKs",
      ],
      "UI/UX Design": [
        "Figma",
        "Wireframing",
        "User Research",
        "Interactive Prototyping",
        "Adobe XD",
      ],
      "Cloud Computing": [
        "AWS",
        "Google Cloud Platform (GCP)",
        "Microsoft Azure",
        "Cloud Architecture",
      ],
      "Cyber Security": [
        "Penetration Testing",
        "Network Security",
        "Cryptography",
        "CISSP Standards",
        "Firewall Auditing",
      ],
      "Database Administration": [
        "PostgreSQL",
        "MongoDB",
        "MySQL",
        "Query Performance Tuning",
        "Database Schema Design",
      ],
      Devops: [
        "Docker Containers",
        "CI/CD Pipelines",
        "Kubernetes Orchestration",
        "Terraform IaC",
        "Ansible Automation",
      ],
      "Computer Networks": [
        "TCP/IP Protocols",
        "Cisco CCNA",
        "Virtual Private Networks (VPN)",
        "Network Troubleshooting",
      ],
    },
  },
  "Translation & Languages": {
    specializations: [
      "English Translation",
      "Spanish Translation",
      "French Translation",
      "Chinese Translation",
      "Interpretation",
      "Localization",
      "Proofreading & Editing",
    ],
    skills: {
      "English Translation": [
        "English Grammar",
        "English-to-Vietnamese Translation",
        "Proofreading",
        "Localization Strategy",
      ],
      "Spanish Translation": [
        "Spanish Grammar",
        "Spanish-to-English Translation",
        "Spanish Subtitling",
        "Localization",
      ],
      "French Translation": [
        "French Grammar",
        "French-to-English Translation",
        "French Localization",
      ],
      "Chinese Translation": [
        "Mandarin/Cantonese Translation",
        "Chinese-to-English Translation",
        "Document Translation",
      ],
      Interpretation: [
        "Consecutive Interpretation",
        "Simultaneous Interpretation",
        "Active Listening",
        "Medical/Legal Interpretation",
      ],
      Localization: [
        "CAT Tools (Trados)",
        "Software UI Localization",
        "Cultural Adaptation Strategy",
      ],
      "Proofreading & Editing": [
        "Copy Editing",
        "Grammar & Syntax Correction",
        "Style Guide Compliance (APA/MLA)",
      ],
    },
  },
  "Trades & Services": {
    specializations: [
      "Electrical Work",
      "Plumbing",
      "Carpentry",
      "HVAC Services",
      "Auto Repair",
      "Cleaning Services",
      "Landscaping",
    ],
    skills: {
      "Electrical Work": [
        "Electrical Wiring",
        "Circuit Troubleshooting",
        "Reading Blueprints",
        "Safety Compliance (NEC)",
      ],
      Plumbing: [
        "Pipe Fitting",
        "Drain Cleaning",
        "Leak Detection",
        "Commercial Piping Blueprints",
      ],
      Carpentry: [
        "Fine Woodworking",
        "Framing",
        "Cabinetry",
        "Power Tools Operation",
      ],
      "HVAC Services": [
        "Air Conditioning Installation",
        "Heating Systems Repair",
        "Refrigerant Management",
        "HVAC Diagnostics",
      ],
      "Auto Repair": [
        "Engine Diagnostics",
        "Brake Systems Repair",
        "Suspension Tuning",
        "Automotive Electrical Systems",
      ],
      "Cleaning Services": [
        "Commercial Cleaning",
        "Deep Cleaning",
        "Sanitization Standards",
        "Eco-friendly Cleaning Products",
      ],
      Landscaping: [
        "Lawn Care",
        "Garden Design",
        "Irrigation Systems Setup",
        "Horticulture Expertise",
      ],
    },
  },
  "Freight, Shipping & Transportation": {
    specializations: [
      "Freight Forwarding",
      "Fleet Management",
      "Customs Brokerage",
      "Warehouse Management",
      "Route Optimization",
      "Courier Services",
    ],
    skills: {
      "Freight Forwarding": [
        "Customs Regulations",
        "Bill of Lading Drafting",
        "International Shipping Compliance",
        "Carrier Booking",
      ],
      "Fleet Management": [
        "GPS Tracking Systems",
        "Vehicle Maintenance Scheduling",
        "Driver Scheduling",
        "Fuel Management",
      ],
      "Customs Brokerage": [
        "Import/Export Documentation",
        "Tariff Classification (HS Code)",
        "Regulatory Compliance",
      ],
      "Warehouse Management": [
        "OSHA Safety Standards",
        "Material Handling",
        "Inventory Audits",
        "Forklift Operations",
      ],
      "Route Optimization": [
        "Route Planning Software",
        "Last-Mile Delivery Logistics",
        "Cost Management",
      ],
      "Courier Services": [
        "Local Delivery Management",
        "Time Management",
        "Customer Service Excellence",
      ],
    },
  },
  Telecommunications: {
    specializations: [
      "Network Engineering",
      "Wireless Communications",
      "Telephony Systems",
      "Fiber Optics",
      "Satellite Communications",
      "RF Engineering",
    ],
    skills: {
      "Network Engineering": [
        "VoIP",
        "SIP Protocols",
        "Cisco IOS",
        "Telecom Network Design",
      ],
      "Wireless Communications": [
        "5G/4G Network Deployment",
        "LTE Architecture",
        "WiFi Protocols",
        "Antenna Engineering",
      ],
      "Telephony Systems": [
        "PBX Systems Configuration",
        "Unified Communications (UCaaS)",
        "Call Center Routing",
      ],
      "Fiber Optics": [
        "Optical Fiber Splicing",
        "OTDR Testing",
        "FTTH Installation",
      ],
      "Satellite Communications": [
        "VSAT Systems Installation",
        "Link Budgets Calculation",
        "RF Systems Calibration",
      ],
      "RF Engineering": [
        "RF Simulation",
        "Spectrum Analysis",
        "Microwave Link Systems",
      ],
    },
  },
  Education: {
    specializations: [
      "Curriculum Development",
      "Online Tutoring",
      "Special Education",
      "Language Instruction",
      "Instructional Design",
      "Educational Consulting",
    ],
    skills: {
      "Curriculum Development": [
        "Lesson Planning",
        "Learning Objectives Definition",
        "Educational Standards Alignment",
      ],
      "Online Tutoring": [
        "Zoom Classroom Management",
        "Interactive Whiteboards",
        "Subject Matter Tutoring (Math/Science)",
      ],
      "Special Education": [
        "IEP (Individualized Education Program) Development",
        "Behavioral Intervention",
        "Differentiated Instruction",
      ],
      "Language Instruction": [
        "ESL/EFL Teaching",
        "Language Pedagogy",
        "Pronunciation Coaching",
      ],
      "Instructional Design": [
        "E-Learning Development",
        "Articulate Storyline",
        "LMS Administration (Moodle/Canvas)",
      ],
      "Educational Consulting": [
        "Academic Advising",
        "College Admissions Counseling",
        "Educational Technology Assessment",
      ],
    },
  },
  "Health & Medicine": {
    specializations: [
      "General Medicine",
      "Nursing",
      "Physical Therapy",
      "Medical Writing",
      "Healthcare Administration",
      "Clinical Research",
      "Nutrition & Dietetics",
    ],
    skills: {
      "General Medicine": [
        "Medical Diagnostics",
        "Patient Care Protocols",
        "Medical Terminology",
      ],
      Nursing: [
        "Patient Monitoring",
        "IV Administration",
        "Wound Care",
        "Electronic Medical Records (EMR)",
      ],
      "Physical Therapy": [
        "Physical Rehabilitation",
        "Therapeutic Exercise",
        "Patient Mobility Assessment",
      ],
      "Medical Writing": [
        "Clinical Trial Reports",
        "Medical Copyediting",
        "Regulatory Document Prep",
        "AMA Style Compliance",
      ],
      "Healthcare Administration": [
        "HIPAA Compliance",
        "Medical Billing & Coding",
        "Clinic Operations Management",
      ],
      "Clinical Research": [
        "GCP Guidelines",
        "Protocol Design",
        "Data Collection",
        "Clinical Trials Management",
      ],
      "Nutrition & Dietetics": [
        "Meal Planning",
        "Dietary Assessment",
        "Clinical Nutrition Programs",
      ],
    },
  },
  "Artificial Intelligence": {
    specializations: [
      "Machine Learning",
      "Natural Language Processing",
      "Computer Vision",
      "Deep Learning",
      "Generative AI",
      "MLOps",
      "AI Agent Development",
    ],
    skills: {
      "Machine Learning": [
        "Python",
        "Scikit-Learn",
        "Regression Models",
        "Classification & Clustering",
      ],
      "Natural Language Processing": [
        "Hugging Face Transformers",
        "BERT",
        "Text Tokenization",
        "Semantic Search",
      ],
      "Computer Vision": [
        "OpenCV Library",
        "YOLO Object Detection",
        "Image Segmentation",
        "PyTorch Vision",
      ],
      "Deep Learning": [
        "Deep Neural Networks",
        "TensorFlow Framework",
        "Keras API",
        "PyTorch Library",
        "CNN/RNN Architectures",
      ],
      "Generative AI": [
        "OpenAI API Integration",
        "LangChain Framework",
        "RAG Systems Setup",
        "Vector Databases (Pinecone/Chroma)",
        "Prompt Engineering",
      ],
      MLOps: [
        "MLflow Experiment Tracking",
        "DVC (Data Version Control)",
        "AWS SageMaker",
        "Dockerizing ML Models",
      ],
      "AI Agent Development": [
        "Semantic Kernel Framework",
        "AutoGen",
        "CrewAI Orchestration",
        "LangGraph",
        "AI Agent Tooling",
      ],
    },
  },
};

// Helper function to mock AI requirements scanning
function analyzeRequirementsWithAI(title = "", description = "", files = []) {
  const text = (title + " " + description + " " + files.map(f => f.name).join(" ")).toLowerCase();
  
  if (text.includes("chatbot") || text.includes("rag") || text.includes("assistant") || text.includes("nlp") || text.includes("langchain")) {
    return {
      category: "Artificial Intelligence",
      specialization: "Natural Language Processing",
      skills: ["Hugging Face Transformers", "Semantic Search", "Python", "BERT"],
      useCases: [
        { nameAndDeadline: "Use Case 1: Thiết lập cơ sở dữ liệu & Xác thực người dùng - Hạn chót: 5 ngày", description: "Cài đặt JWT Auth, lưu trữ phiên trò chuyện và thiết kế cơ sở dữ liệu lịch sử chat.", durationDays: 5, durationValue: 5, durationUnit: "days" },
        { nameAndDeadline: "Use Case 2: Phân tách & Nhúng tài liệu (Document Embedding) - Hạn chót: 7 ngày", description: "Xây dựng cổng upload tài liệu PDF/TXT, triển khai thuật toán phân tách câu và lưu vector embeddings.", durationDays: 7, durationValue: 7, durationUnit: "days" },
        { nameAndDeadline: "Use Case 3: Cấu hình LLM & Prompt RAG API - Hạn chót: 6 ngày", description: "Tích hợp thư viện LangChain để gọi LLM và triển khai hệ thống kiểm duyệt câu trả lời (guardrails).", durationDays: 6, durationValue: 6, durationUnit: "days" },
        { nameAndDeadline: "Use Case 4: Giao diện Chatbot Real-time & Stream Response - Hạn chót: 6 ngày", description: "Thiết kế giao diện chat responsive, hiệu ứng typing indicator, stream text từ API và định dạng markdown.", durationDays: 6, durationValue: 6, durationUnit: "days" }
      ]
    };
  }
  
  if (text.includes("medical") || text.includes("imaging") || text.includes("lung") || text.includes("scan") || text.includes("x-ray")) {
    return {
      category: "Artificial Intelligence",
      specialization: "Computer Vision",
      skills: ["OpenCV Library", "YOLO Object Detection", "Image Segmentation", "PyTorch Vision"],
      useCases: [
        { nameAndDeadline: "Use Case 1: Đọc & Chuẩn hóa ảnh DICOM - Hạn chót: 5 ngày", description: "Phát triển bộ đọc tệp tin y tế DICOM, trích xuất metadata và lưu trữ thông tin ảnh vào cơ sở dữ liệu.", durationDays: 5, durationValue: 5, durationUnit: "days" },
        { nameAndDeadline: "Use Case 2: Huấn luyện & Đánh giá Model PyTorch - Hạn chót: 12 ngày", description: "Huấn luyện mô hình phân loại tổn thương phổi trên PyTorch, tối ưu hóa độ nhạy đạt tối thiểu 94%.", durationDays: 12, durationValue: 12, durationUnit: "days" },
        { nameAndDeadline: "Use Case 3: Giao diện vẽ Box & Đánh dấu cho bác sĩ - Hạn chót: 8 ngày", description: "Thiết kế canvas vẽ bounding box và vùng phân đoạn ảnh trực quan trên giao diện web.", durationDays: 8, durationValue: 8, durationUnit: "days" },
        { nameAndDeadline: "Use Case 4: Tự động xuất báo cáo chẩn đoán PDF - Hạn chót: 5 ngày", description: "Hệ thống tự động tổng hợp kết quả của AI và tạo tệp tin PDF báo cáo y tế chuẩn hóa.", durationDays: 5, durationValue: 5, durationUnit: "days" }
      ]
    };
  }
  
  if (text.includes("fraud") || text.includes("transaction") || text.includes("payment") || text.includes("risk")) {
    return {
      category: "Artificial Intelligence",
      specialization: "Machine Learning",
      skills: ["Python", "Scikit-Learn", "Regression Models", "Classification & Clustering"],
      useCases: [
        { nameAndDeadline: "Use Case 1: Pipeline thu thập giao dịch thời gian thực - Hạn chót: 8 ngày", description: "Thiết lập consumer Kafka xử lý dữ liệu giao dịch đầu vào với tốc độ 50K events/giây.", durationDays: 8, durationValue: 8, durationUnit: "days" },
        { nameAndDeadline: "Use Case 2: Huấn luyện Model phát hiện gian lận - Hạn chót: 10 ngày", description: "Xây dựng và tối ưu hóa mô hình phân lớp XGBoost/LightGBM dựa trên các đặc trưng hành vi giao dịch.", durationDays: 10, durationValue: 10, durationUnit: "days" },
        { nameAndDeadline: "Use Case 3: Dashboard giải thích quyết định của AI (XAI) - Hạn chót: 8 ngày", description: "Hiển thị giá trị đóng góp SHAP/LIME để giải thích lý do giao dịch bị đánh dấu gian lận cho nhân viên kiểm duyệt.", durationDays: 8, durationValue: 8, durationUnit: "days" },
        { nameAndDeadline: "Use Case 4: Hệ thống cảnh báo & Tự động khóa thẻ - Hạn chót: 4 ngày", description: "Kích hoạt cảnh báo thời gian thực qua SMS/Email và tự động gửi lệnh khóa tài khoản/thẻ có dấu hiệu rủi ro cao.", durationDays: 4, durationValue: 4, durationUnit: "days" }
      ]
    };
  }

  if (text.includes("recommend") || text.includes("suggest") || text.includes("recommender") || text.includes("movie") || text.includes("e-commerce")) {
    return {
      category: "Artificial Intelligence",
      specialization: "Generative AI",
      skills: ["OpenAI API Integration", "LangChain Framework", "Vector Databases (Pinecone/Chroma)", "Prompt Engineering"],
      useCases: [
        { nameAndDeadline: "Use Case 1: Thu thập hành vi tương tác của người dùng - Hạn chót: 6 ngày", description: "Ghi nhận lượt xem sản phẩm, đánh giá và lịch sử mua sắm theo thời gian thực.", durationDays: 6, durationValue: 6, durationUnit: "days" },
        { nameAndDeadline: "Use Case 2: Huấn luyện mô hình Collaborative Filtering - Hạn chót: 8 ngày", description: "Xây dựng mô hình Matrix Factorization hoặc Two-Tower Neural Network để dự đoán sản phẩm gợi ý.", durationDays: 8, durationValue: 8, durationUnit: "days" },
        { nameAndDeadline: "Use Case 3: Triển khai hạ tầng A/B Testing - Hạn chót: 6 ngày", description: "Phân luồng người dùng thử nghiệm và đo lường sự thay đổi của tỷ lệ chuyển đổi đơn hàng.", durationDays: 6, durationValue: 6, durationUnit: "days" },
        { nameAndDeadline: "Use Case 4: API gợi ý sản phẩm độ trễ thấp (<100ms) - Hạn chót: 5 ngày", description: "Xây dựng hệ thống cache Redis để phục vụ danh sách gợi ý sản phẩm ngay khi tải trang.", durationDays: 5, durationValue: 5, durationUnit: "days" }
      ]
    };
  }

  // General Fallback
  return {
    category: "Mobile Phones & Computing",
    specialization: "Software Engineering",
    skills: ["Python", "System Design", "Algorithms"],
    useCases: [
      { nameAndDeadline: "Use Case 1: Phân tích yêu cầu & Thiết kế kiến trúc - Hạn chót: 4 ngày", description: "Vẽ sơ đồ luồng nghiệp vụ, đặc tả cơ sở dữ liệu ERD và định nghĩa các tài liệu thiết kế.", durationDays: 4, durationValue: 4, durationUnit: "days" },
      { nameAndDeadline: "Use Case 2: Triển khai Cơ sở dữ liệu & Viết Backend API - Hạn chót: 8 ngày", description: "Viết migrations, cấu hình database và hoàn thiện các API Endpoint CRUD cơ bản.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 3: Tích hợp giao diện Frontend - Hạn chót: 8 ngày", description: "Tạo các trang màn hình, kết nối form dữ liệu với API và quản lý state tập trung.", durationDays: 8, durationValue: 8, durationUnit: "days" },
      { nameAndDeadline: "Use Case 4: Kiểm thử hệ thống & Bàn giao - Hạn chót: 5 ngày", description: "Chạy các bài kiểm thử tích hợp (Integration Tests) và deploy dự án lên môi trường staging để nghiệm thu.", durationDays: 5, durationValue: 5, durationUnit: "days" }
    ]
  };
}

export function PostProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialInvitedExpert = location.state?.inviteExpert || null;
  const [invitedExpert, setInvitedExpert] = useState(initialInvitedExpert);

  // States for recommendations
  const [recommendedExperts, setRecommendedExperts] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedRecommendExpert, setSelectedRecommendExpert] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  const [formData, setFormData] = useState({
    category: "",
    specialization: "",
    title: "",
    description: "",
    budget: 0, // number — no $, no commas
    durationValue: 1, // number
    durationUnit: "days", // "days" | "weeks" | "months"
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [useCases, setUseCases] = useState([
    { nameAndDeadline: "", description: "", durationDays: 1, durationValue: 1, durationUnit: "days" },
  ]);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState(null); // null | "recommendations" | "ai_planner"
  const isAnalyzingAI = rightPanelMode === "ai_planner";

  const handleAIParseRequirements = () => {
    setRightPanelMode("ai_planner");
  };

  const handleApplyAIPlan = (result) => {
    if (!result) return;

    // Update form fields
    setFormData((prev) => ({
      ...prev,
      category: result.category,
      specialization: result.specialization,
    }));

    // Update selected skills
    setSelectedSkills(result.skills || []);

    // Update use cases
    if (result.useCases) {
      const mappedUseCases = result.useCases.map(uc => {
        const val = uc.durationValue || uc.durationDays || 1;
        const unit = uc.durationUnit || "days";
        const days = val * (unit === "weeks" ? 7 : unit === "months" ? 30 : unit === "years" ? 365 : 1);
        return {
          ...uc,
          durationValue: val,
          durationUnit: unit,
          durationDays: days
        };
      });
      setUseCases(mappedUseCases);
    }
  };

  const formRef = useRef(null);
  const [formHeight, setFormHeight] = useState(0);

  useEffect(() => {
    if (formRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setFormHeight(entry.target.clientHeight);
        }
      });
      resizeObserver.observe(formRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const toggleSkill = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName],
    );
  };

  const updateField = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "category") {
        updated.specialization = "";
        setSelectedSkills([]);
      } else if (field === "specialization") {
        setSelectedSkills([]);
      }
      return updated;
    });
  };

  // Milestones logic removed

  // Perform expert matching matching
  const handleSearchExperts = async () => {
    if (!formData.sector || !formData.major) {
      alert("Please fill in Category Domain and Specialized Major first!");
      return;
    }
    setSearchMatching(true);
    setShowMatches(false);
    
    // Simulate AI loading spinner
    setTimeout(async () => {
      try {
        let dbExperts = [];
        try {
          const res = await api.experts.list();
          dbExperts = (res || [])
            .filter((u) => u.role?.toLowerCase() === "expert" && u.expertProfile)
            .map((u) => ({
              id: u.id,
              fullName: u.fullName,
              expertProfile: {
                major: u.expertProfile.major,
                location: u.expertProfile.location || "N/A",
                bio: u.expertProfile.bio || "",
                hourlyRate: 35,
                completedProjects: 8,
                skills: u.expertProfile.skills || []
              },
              avgRating: 4.8
            }));
        } catch (err) {
          console.warn("Using mock fallback for experts:", err);
        }

        // Combine DB & Mock fallback to ensure robust results
        const combinedList = [...dbExperts, ...MOCK_EXPERTS];
        
        // Remove duplicates by ID
        const uniqueExperts = [];
        const seen = new Set();
        combinedList.forEach((item) => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueExperts.push(item);
          }
        });

        // Heuristics mapping score
        const scored = uniqueExperts.map((exp) => {
          let score = 50; // Base match score
          
          // Match specialized major
          if (exp.expertProfile.major?.toLowerCase() === formData.major.toLowerCase()) {
            score += 30;
          }

          // Match sub-skills
          const expSkills = exp.expertProfile.skills || [];
          const matchedSkills = selectedSkills.filter(s => 
            expSkills.some(es => es.toLowerCase().includes(s.toLowerCase()))
          );
          score += matchedSkills.length * 5;

          // Limit score between 80% and 99%
          const matchPercent = Math.min(99, Math.max(80, score));

          return {
            ...exp,
            matchPercent,
            matchedSkills
          };
        });

        // Sort by match score and rating
        scored.sort((a, b) => b.matchPercent - a.matchPercent || b.avgRating - a.avgRating);
        
        setMatchingResults(scored);
        setShowMatches(true);
      } catch (err) {
        console.error("Match search failed:", err);
      } finally {
        setSearchMatching(false);
      }
    }, 1500);
  };

  const handleScanMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  // Submit flow
  const handlePublish = async (isPublic = true) => {
    if (!formData.title || !formData.description || !formData.category || !formData.specialization) {
      alert("Please fill in all required fields!");
      return;
    }

    setSubmitting(true);
    let deadlineDays = Number(formData.durationValue) || 1;
    if (formData.durationUnit === "weeks") deadlineDays *= 7;
    if (formData.durationUnit === "months") deadlineDays *= 30;

    const normalizedUseCases = useCases.map((uc, index) => ({
      ...uc,
      index,
      title: uc.nameAndDeadline,
      durationDays: Number(uc.durationDays) || 1,
    }));
    const totalUseCaseDays = normalizedUseCases.reduce(
      (sum, uc) => sum + uc.durationDays,
      0,
    );

    if (deadlineDays < totalUseCaseDays) {
      alert(
        `Deadline tổng phải >= tổng timeline gốc của Use Case (${totalUseCaseDays} ngày).`,
      );
      setSubmitting(false);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
      aiCategoryDomainId: formData.category || null,
      aiCategoryDomain: formData.category
        ? { id: formData.category, name: formData.category }
        : null,
      specialization: formData.specialization || null,
      clientId: user?.id,
      skillIds: selectedSkills,
      jobPostSkills: selectedSkills.map((name) => ({ skill: { name } })),
      requiredSkills: selectedSkills,
      useCases: normalizedUseCases,
      originalUseCaseDays: totalUseCaseDays,
      attachments: attachments.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      createdAt: new Date().toISOString(),
    };

    try {
      console.log("Submitting project to API:", payload);
      const createdJob = await api.jobPosts.create(payload);

      if (invitedExpert && createdJob?.id) {
        const coverLetterObj = {
          proposalTitle: "",
          professionalIntro: "",
          technicalApproach: "",
          timelineMilestones: "",
          dependencies: "",
          durationDays: deadlineDays,
          useCases: normalizedUseCases,
          attachments: [],
        };
        await api.proposals.create({
          jobPostId: createdJob.id,
          expertId: invitedExpert.id,
          bidAmount: 0,
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: false,
        });
      }

      alert("Đăng dự án thành công!");
      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      alert(err.message || "Failed to create project. Please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handlePublish();
  };

  const handleRecommendExperts = async () => {
    setLoadingRecommendations(true);
    setRightPanelMode("recommendations");
    setShowRecommendations(true);
    setSelectedRecommendExpert(null);
    setVisibleCount(3);
    try {
      const res = await api.experts.list();
      const expertsOnly = (res || [])
        .filter((u) => u.role?.toLowerCase() === "expert" && u.expertProfile)
        .map((u) => ({
          id: u.id,
          name: u.fullName,
          title:
            u.expertProfile.jobTitle ||
            u.expertProfile.specialization ||
            u.expertProfile.major ||
            "AI Specialist",
          specialization:
            u.expertProfile.specialization ||
            u.expertProfile.major ||
            u.specialization ||
            "AI Specialist",
          category: u.expertProfile.category || u.category || "AI & Computing",
          location: u.expertProfile.location || "N/A",
          bio: u.expertProfile.bio || u.bio || "No biography provided.",
          rating: u.rating || 4.8,
          completedProjects: u.expertProfile.completedProjects || 8,
          hourlyRate: u.expertProfile.hourlyRate || 65,
          skills: u.expertProfile.skills || ["Python", "Semantic Kernel"],
          email: u.email || "",
          phone: u.expertProfile.phone || "",
          portfolio: u.portfolio || [],
          clientReviews: (u.clientReviews || []).map((r) => ({
            clientName: r.clientName || r.name || "Client",
            rating: r.rating || 5,
            comment: r.comment || r.review || "Great work!",
            date: r.date,
          })),
        }));

      // Sort experts based on category, specialization, skills match, and completedProjects <= 3
      const getScore = (exp) => {
        let score = 0;

        // category/specialization match
        const hasSpec =
          formData.specialization &&
          exp.specialization
            ?.toLowerCase()
            .includes(formData.specialization.toLowerCase());
        if (hasSpec) {
          score += 10;
        }

        // skills match count
        const matchSkills = selectedSkills.filter((s) =>
          exp.skills?.some((es) => es.toLowerCase() === s.toLowerCase()),
        ).length;
        score += matchSkills * 2;

        // "ưu tiên nào có từ 3 trở xuống" completedProjects priority
        if (exp.completedProjects <= 3) {
          score += 15; // Give significant priority boost
        }

        return score;
      };

      const sortedExperts = [...expertsOnly].sort(
        (a, b) => getScore(b) - getScore(a),
      );
      setRecommendedExperts(sortedExperts);

      // Scroll to recommendations container
      setTimeout(() => {
        const el = document.getElementById("ai-recommendations-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Failed to load recommended experts:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const categoriesList = Object.keys(CATEGORY_DATA);
  const specializationsList = formData.category
    ? CATEGORY_DATA[formData.category].specializations
    : [];
  const skillsList =
    formData.category && formData.specialization
      ? CATEGORY_DATA[formData.category].skills[formData.specialization] || []
      : [];

  const totalUseCaseDays = useMemo(
    () => useCases.reduce((sum, uc) => sum + (Number(uc.durationDays) || 0), 0),
    [useCases],
  );

  const minVal = useMemo(() => {
    const total = totalUseCaseDays;
    if (formData.durationUnit === "weeks") return Math.ceil(total / 7);
    if (formData.durationUnit === "months") return Math.ceil(total / 30);
    return total;
  }, [totalUseCaseDays, formData.durationUnit]);

  useEffect(() => {
    if (formData.durationValue < minVal) {
      setFormData(prev => ({ ...prev, durationValue: minVal }));
    }
  }, [minVal, formData.durationValue]);

  const configuredDeadlineDays = useMemo(() => {
    let days = Number(formData.durationValue) || 0;
    if (formData.durationUnit === "weeks") days *= 7;
    if (formData.durationUnit === "months") days *= 30;
    return days;
  }, [formData.durationValue, formData.durationUnit]);

  const isDeadlineValid = configuredDeadlineDays >= totalUseCaseDays;

  const isFormValid =
    formData.title.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.category !== "" &&
    formData.specialization !== "" &&
    selectedSkills.length > 0 &&
    Number(formData.budget) > 0 &&
    Number(formData.durationValue) > 0 &&
    useCases.every(
      (uc) =>
        uc.nameAndDeadline.trim() !== "" &&
        uc.description.trim() !== "" &&
        Number(uc.durationDays) > 0,
    ) &&
    isDeadlineValid;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
      </div>

      <div className={`grid grid-cols-1 ${rightPanelMode ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-3xl mx-auto"}`}>
        <div className={rightPanelMode ? "lg:col-span-7 flex flex-col" : "w-full"}>
          <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col h-full">
          <div className="space-y-6 flex-1">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                placeholder="e.g., AI Chatbot Development"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                placeholder="Describe your project requirements..."
                required
              />
            </div>

            {/* Project Attachments */}
            <FileUploadDropzone
              files={attachments}
              onFilesChange={setAttachments}
              label="Project Attachments"
              helperText="Upload requirement documents, references, screenshots, or supporting files for experts to review."
            />

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select A category
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white"
                required
              >
                <option value="" disabled>Select a category...</option>
                {categoriesList.map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area of expertise or Specialization
              </label>
              <select
                value={formData.specialization}
                onChange={(e) => updateField("specialization", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white"
                disabled={!formData.category}
                required
              >
                <option value="" disabled>
                  {formData.category ? "Select a specialization..." : "Please select a category first"}
                </option>
                {specializationsList.map((specName) => (
                  <option key={specName} value={specName}>
                    {specName}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              {!formData.category || !formData.specialization ? (
                <p className="text-base text-gray-400 italic">
                  Select a category and specialization to view matching skills.
                </p>
              ) : skillsList.length === 0 ? (
                <p className="text-base text-gray-400">
                  No specialized skills listed for this area.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skillName) => (
                    <button
                      key={skillName}
                      type="button"
                      onClick={() => toggleSkill(skillName)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedSkills.includes(skillName)
                          ? "bg-brand-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {skillName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Use Cases Section */}
            <div className="space-y-4 border-t border-gray-150 pt-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-750">
                  Project Use Cases <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAIParseRequirements}
                    disabled={isAnalyzingAI}
                    className={`h-11 px-4 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isAnalyzingAI
                        ? "bg-purple-400 cursor-not-allowed animate-pulse"
                        : "bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-700"
                    }`}
                  >
                    {isAnalyzingAI ? (
                      <>
                        <Bot className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Parse with AI
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setUseCases([
                        ...useCases,
                        {
                          nameAndDeadline: "",
                          description: "",
                          durationDays: 1,
                          durationValue: 1,
                          durationUnit: "days",
                        },
                      ])
                    }
                    className="h-11 px-4 bg-gray-100 hover:bg-gray-200 text-brand-primary rounded-xl text-sm font-semibold flex items-center gap-1 transition-colors"
                  >
                    + Add Use Case
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {useCases.map((uc, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative"
                  >
                    {useCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setUseCases(useCases.filter((_, i) => i !== index))
                        }
                        className="absolute top-2 right-2.5 text-xs font-medium text-gray-400 hover:text-red-650 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-left">
                        Tên Use Case &amp; Hạn chót
                      </label>
                      <input
                        type="text"
                        value={uc.nameAndDeadline}
                        onChange={(e) => {
                          const updated = [...useCases];
                          updated[index].nameAndDeadline = e.target.value;
                          setUseCases(updated);
                        }}
                        placeholder="Ví dụ: Làm toán câu 1 - Hạn chót: 2 ngày"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-primary bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-left">
                        Timeline gốc
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={uc.durationValue || ""}
                          onChange={(e) => {
                            const updated = [...useCases];
                            const val = e.target.value === "" ? 1 : Number(e.target.value);
                            updated[index].durationValue = val;
                            
                            const unit = uc.durationUnit || "days";
                            updated[index].durationDays = val * (unit === "weeks" ? 7 : unit === "months" ? 30 : unit === "years" ? 365 : 1);
                            setUseCases(updated);
                          }}
                          placeholder="Ví dụ: 2"
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-primary bg-white"
                          required
                        />
                        <select
                          value={uc.durationUnit || "days"}
                          onChange={(e) => {
                            const updated = [...useCases];
                            const unit = e.target.value;
                            updated[index].durationUnit = unit;
                            
                            const val = Number(uc.durationValue) || 1;
                            updated[index].durationDays = val * (unit === "weeks" ? 7 : unit === "months" ? 30 : unit === "years" ? 365 : 1);
                            setUseCases(updated);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-primary bg-white"
                        >
                          <option value="days">Ngày (Days)</option>
                          <option value="weeks">Tuần (Weeks)</option>
                          <option value="months">Tháng (Months)</option>
                          <option value="years">Năm (Years)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-left">
                        Miêu tả cụ thể
                      </label>
                      <textarea
                        value={uc.description}
                        onChange={(e) => {
                          const updated = [...useCases];
                          updated[index].description = e.target.value;
                          setUseCases(updated);
                        }}
                        placeholder="Ví dụ: Làm toán đệ quy"
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-primary bg-white"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget + Duration row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Budget — type="number" */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.budget || ""}
                  onChange={(e) => updateField("budget", e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                  placeholder="5000"
                />
              </div>

              {/* Duration — number + unit select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.durationValue || ""}
                    onChange={(e) =>
                      updateField("durationValue", e.target.value === "" ? 1 : Number(e.target.value))
                    }
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="1"
                  />
                  <select
                    value={formData.durationUnit}
                    onChange={(e) => updateField("durationUnit", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            </div>

              {/* Warning/Status Info Box underneath the inputs */}
              <div className="rounded-xl border px-4 py-3 text-sm bg-blue-50 border-blue-100 text-blue-700 mt-4">
                Tổng timeline gốc Use Case: <strong>{totalUseCaseDays} ngày</strong>. Timeline dự án hiện tại: <strong>{configuredDeadlineDays || 0} ngày</strong>.
                <span className="block mt-1 font-medium text-xs text-blue-600">
                  * Bạn chỉ có thể giữ nguyên hoặc tăng thêm thời gian cho timeline dự án, không được giảm dưới tổng thời gian gốc của Use Case.
                </span>
              </div>

            </div>

            {/* Submit & AI Recommend Buttons */}
            <div className="flex gap-4 pt-6 mt-8 border-t border-gray-100">
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className={`w-full py-3 text-white rounded-xl font-medium inline-flex items-center justify-center gap-2 transition-all ${
                  submitting || !isFormValid
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-brand-primary hover:bg-brand-primary-hover"
                }`}
              >
                <Send className="w-4 h-4" />{" "}
                {invitedExpert
                  ? submitting
                    ? "Sending..."
                    : "Send to Expert"
                  : submitting
                    ? "Publishing..."
                    : "Publish Project"}
              </button>
            </div>
          </form>
        </div>

        {/* AI Assistant Sidebar Section */}
        {rightPanelMode === "ai_planner" && (
          <aside className="lg:col-span-3">
            <div
              id="ai-assistant-sidebar"
              className="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:max-h-none bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0"
            >
              <AIClientsUseCasePlanner
                onClose={() => setRightPanelMode(null)}
                onApplyPlan={(plan) => {
                  handleApplyAIPlan(plan);
                  setRightPanelMode(null);
                }}
                existingFiles={attachments}
                initialTitle={formData.title}
                initialDescription={formData.description}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
