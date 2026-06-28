import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Send, Star, MapPin, Clock, CheckCircle, Briefcase, Sparkles, Bot, Layers, Target, ReceiptText, Calendar } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import { AIClientsUseCasePlanner } from "../../components/ai/AIClientsUseCasePlanner.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";

// ── Timeline unit conversion helpers ──
const unitToDays = (value, unit) => {
  const n = Number(value) || 0;
  if (unit === "Months") return n * 30;
  if (unit === "Years") return n * 365;
  if (unit === "weeks") return n * 7;
  return n; // "Days" or legacy "days"
};

const daysToUnit = (days, unit) => {
  const n = Number(days) || 1;
  if (unit === "Months") return Math.ceil(n / 30);
  if (unit === "Years") return Math.ceil(n / 365);
  return n; // "Days" or legacy "days"/"weeks"
};

const unitLabel = (value, unit) => {
  if (unit === "Months") return `${value} month${value !== 1 ? "s" : ""}`;
  if (unit === "Years") return `${value} year${value !== 1 ? "s" : ""}`;
  return `${value} day${value !== 1 ? "s" : ""}`;
};

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
    budget: 0,          // number — no $, no commas
    durationValue: 1,   // number
    durationUnit: "Days", // "Days" | "Months" | "Years"
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [useCases, setUseCases] = useState([{ id: `uc-${Date.now()}-1`, title: "", description: "", originalDurationDays: 1 }]);
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

  // ── Auto-sync timeline with total use case duration ──
  const totalUseCaseDays = useMemo(() => {
    return useCases.reduce((sum, uc) => sum + (Number(uc.originalDurationDays) || 0), 0);
  }, [useCases]);

  useEffect(() => {
    const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
    if (currentDays < totalUseCaseDays) {
      updateField("durationValue", daysToUnit(totalUseCaseDays, formData.durationUnit));
    }
    // ponytail: only syncs up, never down. Only runs on useCase/unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalUseCaseDays, formData.durationUnit]);

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

  const handlePublish = async () => {
    let deadlineDays = unitToDays(formData.durationValue, formData.durationUnit);

    // Compute total use case duration
    const totalUseCaseDuration = useCases.reduce((sum, uc) => sum + (Number(uc.originalDurationDays) || 0), 0);

    // Validate: total deadline >= total use case duration
    if (deadlineDays < totalUseCaseDuration) {
      alert(`Total deadline (${deadlineDays} days) must be at least the sum of use case durations (${totalUseCaseDuration} days). Please increase the deadline or reduce use case durations.`);
      setSubmitting(false);
      return;
    }

    // Generate stable IDs for use cases without IDs
    const normalizedUseCases = useCases.map((uc, idx) => ({
      id: uc.id || `uc-${Date.now()}-${idx}`,
      title: uc.title || uc.nameAndDeadline || "",
      description: uc.description || "",
      originalDurationDays: Number(uc.originalDurationDays) || 1,
      requirements: uc.requirements || [],
      createdBy: "client",
      createdAt: uc.createdAt || new Date().toISOString(),
    }));

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
      originalTotalDurationDays: totalUseCaseDuration,
      originalBudget: Number(formData.budget) || 0,
      attachments: attachments.map((f) => ({ name: f.name, size: f.size, type: f.type })),
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

  const handleSubmit = async (e) => {
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
  const skillsList = formData.category && formData.specialization
    ? CATEGORY_DATA[formData.category].skills[formData.specialization] || []
    : [];

  // Computed timeline validation (totalUseCaseDays defined above with useEffect)
  const configuredDeadlineDays = useMemo(() => {
    return unitToDays(formData.durationValue, formData.durationUnit);
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
    useCases.every(uc => (uc.title || uc.nameAndDeadline || "").trim() !== "" && uc.description.trim() !== "" && Number(uc.originalDurationDays) > 0) &&
    isDeadlineValid;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Post a New AI Project"
        subtitle="Define your business use cases, timeline, and budget before matching with an expert."
        illustration={
          <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="120" cy="80" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3" />
            <circle cx="120" cy="80" r="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
            <circle cx="120" cy="50" r="6" fill="currentColor" opacity="0.6" />
            <circle cx="140" cy="70" r="4" fill="currentColor" opacity="0.4" />
            <circle cx="100" cy="65" r="5" fill="currentColor" opacity="0.5" />
            <circle cx="125" cy="90" r="3" fill="currentColor" opacity="0.35" />
            <line x1="120" y1="50" x2="140" y2="70" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="120" y1="50" x2="100" y2="65" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="140" y1="70" x2="125" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="100" y1="65" x2="125" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          </svg>
        }
      />

      <div className={`grid grid-cols-1 ${rightPanelMode || showRecommendations ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-3xl mx-auto"}`}>
        <div className={(rightPanelMode || showRecommendations) ? "lg:col-span-7 flex flex-col" : "w-full"}>
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
          <AnimatedReveal>
            <SectionCard title="Basic Information" icon={Layers} padding="lg">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="title" id="title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                    placeholder="e.g., AI Chatbot Development"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description" id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary resize-y"
                    placeholder="Describe your project requirements, goals, and expected outcomes..."
                    required
                  />
                </div>
                <FileUploadDropzone
                  files={attachments}
                  onFilesChange={setAttachments}
                  label="Project Attachments"
                  helperText="Upload requirement documents, references, screenshots, or supporting files for experts to review."
                />
              </div>
            </SectionCard>
          </AnimatedReveal>

          <AnimatedReveal delay={1}>
            <SectionCard title="Category & Required Skills" icon={Target} padding="lg">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Category</label>
                    <select
                      name="category" id="category"
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      required
                    >
                      <option value="" disabled>Select a category...</option>
                      {categoriesList.map((catName) => (
                        <option key={catName} value={catName}>{catName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Specialization</label>
                    <select
                      name="specialization" id="specialization"
                      value={formData.specialization}
                      onChange={(e) => updateField("specialization", e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      disabled={!formData.category}
                      required
                    >
                      <option value="" disabled>
                        {formData.category ? "Select a specialization..." : "Please select a category first"}
                      </option>
                      {specializationsList.map((specName) => (
                        <option key={specName} value={specName}>{specName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Required Skills</label>
                  {!formData.category || !formData.specialization ? (
                    <p className="text-sm text-muted-foreground italic">Select a category and specialization to view matching skills.</p>
                  ) : skillsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No specialized skills listed for this area.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skillName) => (
                        <button
                          key={skillName}
                          type="button"
                          onClick={() => toggleSkill(skillName)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedSkills.includes(skillName)
                              ? "bg-brand-primary text-brand-primary-foreground shadow-sm"
                              : "bg-secondary text-foreground/70 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {skillName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </AnimatedReveal>

          <AnimatedReveal delay={2}>
            <SectionCard
              title="Project Use Cases"
              icon={Layers}
              padding="lg"
              actions={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("ai_planner")}
                    disabled={rightPanelMode === "ai_planner"}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      rightPanelMode === "ai_planner"
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90 shadow-sm"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Parse with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCases([...useCases, { id: `uc-${Date.now()}-${useCases.length + 1}`, title: "", description: "", originalDurationDays: 1 }])}
                    className="h-9 px-3 bg-secondary hover:bg-muted text-brand-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    + Add Use Case
                  </button>
                </div>
              }
            >
              {useCases.length === 0 ? (
                <div className="py-8 text-center">
                  <Layers className="w-10 h-10 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No use cases yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add a use case or use AI to parse them automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {useCases.map((uc, index) => (
                    <div key={index} className="p-5 bg-secondary/40 border border-border rounded-xl space-y-3 relative">
                      {useCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setUseCases(useCases.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2.5 text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Use Case Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={uc.title || uc.nameAndDeadline || ""}
                          onChange={(e) => { const updated = [...useCases]; updated[index].title = e.target.value; setUseCases(updated); }}
                          placeholder="e.g., User Authentication System"
                          className="w-full px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={uc.description}
                          onChange={(e) => { const updated = [...useCases]; updated[index].description = e.target.value; setUseCases(updated); }}
                          placeholder="Detailed description of this use case..."
                          rows={2}
                          className="w-full px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card resize-y"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Duration (days) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number" min="1"
                          value={uc.originalDurationDays || 1}
                          onChange={(e) => { const updated = [...useCases]; updated[index].originalDurationDays = Math.max(1, parseInt(e.target.value) || 1); setUseCases(updated); }}
                          className="w-32 px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </AnimatedReveal>

          {/* Timeline Summary Box */}
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            isDeadlineValid
              ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              <Calendar className="w-4 h-4" />
              Timeline Summary
            </div>
            <p className="mt-1">
              Total Use Case Duration: <strong>{totalUseCaseDays} days</strong>
              {" · "}
              Project Timeline: <strong>
                {formData.durationUnit === "Days"
                  ? `${formData.durationValue} days`
                  : `${unitLabel(formData.durationValue, formData.durationUnit)} (~${configuredDeadlineDays} days)`}
              </strong>
            </p>
            <span className="block mt-1 font-medium text-xs opacity-80">
              {isDeadlineValid
                ? "✓ Timeline is valid. You can increase the project timeline but not reduce it below the total use case duration."
                : "✗ Project timeline must be at least the total use case duration. Increase the timeline or reduce use case durations."}
            </span>
          </div>

          <AnimatedReveal delay={3}>
            <SectionCard
              title="Budget & Timeline"
              icon={ReceiptText}
              padding="lg"
              actions={
                <span className="text-xs text-muted-foreground">
                  {invitedExpert ? "Expert invited" : "No expert invited yet"}
                </span>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Budget</label>
                    <input
                      type="number" name="budget" id="budget"
                      min="0" step="1"
                      value={formData.budget || ""}
                      onChange={(e) => updateField("budget", e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                      placeholder="5000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Total budget for this project</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Timeline</label>
                    <div className="flex gap-2">
                      <input
                        type="number" name="durationValue" id="durationValue"
                        min="1" step="1"
                        value={formData.durationValue || ""}
                        onChange={(e) => updateField("durationValue", e.target.value === "" ? 1 : Number(e.target.value))}
                        onBlur={() => {
                          const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
                          if (currentDays < totalUseCaseDays) {
                            updateField("durationValue", daysToUnit(totalUseCaseDays, formData.durationUnit));
                          }
                        }}
                        className="w-24 px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                        placeholder="1"
                      />
                      <select
                        name="durationUnit" id="durationUnit"
                        value={formData.durationUnit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
                          const newValue = daysToUnit(Math.max(currentDays, totalUseCaseDays), newUnit);
                          setFormData(prev => ({ ...prev, durationUnit: newUnit, durationValue: newValue }));
                        }}
                        className="flex-1 px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      >
                        <option value="Days">Days</option>
                        <option value="Months">Months</option>
                        <option value="Years">Years</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Must be ≥ total use case duration</p>
                  </div>
                </div>

                {invitedExpert ? (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Invited Expert</label>
                    <input
                      type="text"
                      value={invitedExpert.name || invitedExpert.fullName || ""}
                      disabled
                      className="w-full px-4 py-2.5 border border-border bg-secondary/60 text-muted-foreground rounded-xl cursor-not-allowed font-medium"
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </AnimatedReveal>

          {/* Submit & AI Recommend Buttons */}
          <div className="flex gap-4 pt-2 pb-2">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className={`flex-[7] py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 transition-all text-base ${
                submitting || !isFormValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover shadow-md"
              }`}
            >
              <Send className="w-4 h-4" /> {invitedExpert ? (submitting ? "Sending..." : "Send to Expert") : (submitting ? "Publishing..." : "Publish Project")}
            </button>
            <button
              type="button"
              onClick={handleRecommendExperts}
              disabled={submitting || !isFormValid}
              className={`flex-[3] py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                submitting || !isFormValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-accent-light text-accent hover:bg-accent/10 font-semibold shadow-sm"
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Recommend
            </button>
          </div>
        </form>
      </div>

      {/* AI Planner Sidebar */}
      {rightPanelMode === "ai_planner" && (
        <aside className="lg:col-span-3">
          <div
            id="ai-assistant-sidebar"
            className="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:max-h-none bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-0"
            style={{ height: formHeight ? `${formHeight}px` : "100%" }}
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

      {/* AI Recommendations Section */}
      {showRecommendations && (
        <div
          id="ai-recommendations-section"
          className="lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col min-h-0 overflow-hidden"
          style={{ height: formHeight ? `${formHeight}px` : "100%" }}
        >
          <div className="flex items-center justify-between mb-5 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Recommendations</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Matching experts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-muted-foreground hover:text-muted-foreground font-semibold transition-colors"
            >
              Close
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="animate-pulse space-y-3 py-4">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ) : !selectedRecommendExpert ? (
            /* Recommended Experts list */
            recommendedExperts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No experts found matching these criteria.</p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
                {recommendedExperts.slice(0, visibleCount).map((expert) => (
                  <div
                    key={expert.id}
                    className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* ── Top: name + rating badge ── */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground text-sm leading-snug truncate">
                          {expert.name}
                        </h3>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {expert.rating}
                        </span>
                      </div>

                      {/* ── Title + location ── */}
                      <p className="text-[11px] text-muted-foreground mb-2 truncate">
                        {expert.title}
                        {expert.location ? ` · ${expert.location}` : ""}
                      </p>

                      {/* ── Bio ── */}
                      {expert.bio && (
                        <p className="text-sm text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                          {expert.bio}
                        </p>
                      )}

                      {/* ── Skill tags ── */}
                      {expert.skills?.length > 0 && (
                        <div className="mb-2">
                          <SkillTags
                            skills={expert.skills}
                            maxVisible={3}
                          />
                        </div>
                      )}

                      {/* ── Stats ── */}
                      <div className="flex items-center gap-2 mb-3 text-[11px]">
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {expert.completedProjects}
                          </span>{" "}
                          projects
                        </span>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {expert.hourlyRate}
                          </span>
                          /hr
                        </span>
                      </div>
                    </div>

                    {/* ── Action ── */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecommendExpert(expert)}
                      className="block w-full h-11 px-4 border border-input text-foreground/80 rounded-xl hover:bg-secondary/60 text-sm font-medium text-center transition-colors mt-auto"
                    >
                      View Detail
                    </button>
                  </div>
                ))}

                {recommendedExperts.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 3)}
                    className="w-full h-11 px-4 bg-secondary hover:bg-muted text-foreground/80 rounded-xl text-sm font-bold transition-colors text-center border border-border mt-2"
                  >
                    Thêm chuyên gia
                  </button>
                )}
              </div>
            )
          ) : (
            /* Expert Profile Details (Vertical representation) */
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-left text-sm">
              <button
                type="button"
                onClick={() => setSelectedRecommendExpert(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>

              <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-6">
                {/* Avatar + Name Info */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-brand-primary text-lg">
                    {selectedRecommendExpert.name?.split(" ").map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground truncate">{selectedRecommendExpert.name}</h2>
                    <p className="text-foreground/80 font-medium text-sm truncate">{selectedRecommendExpert.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{selectedRecommendExpert.email}</p>
                  </div>
                </div>

                {/* Meta Details */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/60 text-sm text-muted-foreground">
                  {selectedRecommendExpert.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {selectedRecommendExpert.location}
                    </span>
                  )}
                  {selectedRecommendExpert.category && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      Category: {selectedRecommendExpert.category}
                    </span>
                  )}
                  {selectedRecommendExpert.specialization && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      Specialization: {selectedRecommendExpert.specialization}
                    </span>
                  )}
                  {selectedRecommendExpert.rating != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      {selectedRecommendExpert.rating} ({selectedRecommendExpert.clientReviews?.length || 0} reviews)
                    </span>
                  )}
                  {selectedRecommendExpert.hourlyRate != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {selectedRecommendExpert.hourlyRate}/hr
                    </span>
                  )}
                </div>

                {/* Contact Details */}
                {(selectedRecommendExpert.email || selectedRecommendExpert.phone) && (
                  <div className="pt-4 border-t border-border/60 space-y-2 text-sm text-muted-foreground">
                    {selectedRecommendExpert.email && (
                      <p>
                        <span className="font-semibold text-foreground/80">Email Address:</span> {selectedRecommendExpert.email}
                      </p>
                    )}
                    {selectedRecommendExpert.phone && (
                      <p>
                        <span className="font-semibold text-foreground/80">Phone Number:</span> {selectedRecommendExpert.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Bio */}
                {selectedRecommendExpert.bio && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-1.5">About</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{selectedRecommendExpert.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedRecommendExpert.skills?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecommendExpert.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio */}
                {selectedRecommendExpert.portfolio?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">Portfolio</h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.portfolio.map((item, i) => (
                        <div
                          key={i}
                          className="border border-border rounded-lg p-2.5 hover:border-blue-200 transition-colors bg-card"
                        >
                          <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Reviews */}
                {selectedRecommendExpert.clientReviews?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">
                      Client Reviews ({selectedRecommendExpert.clientReviews.length})
                    </h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.clientReviews.map((review, i) => (
                        <div
                          key={i}
                          className="border border-border rounded-lg p-2.5 bg-card"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-foreground text-xs">
                              {review.clientName}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: review.rating || 0 }, (_, j) => (
                                <Star
                                  key={j}
                                  className="w-3 h-3 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">{review.comment}</p>
                          {review.date && (
                            <p className="text-[9px] text-muted-foreground mt-1">{review.date}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite Button */}
                <div className="pt-4 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setInvitedExpert(selectedRecommendExpert);
                      setShowRecommendations(false);
                      setSelectedRecommendExpert(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[15px]"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
