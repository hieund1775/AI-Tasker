<<<<<<< Updated upstream
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Send, Plus, Trash2, BookOpen, Star, MapPin, CheckCircle2, AlertCircle, Sparkles, ChevronDown, Bot, MessageSquare } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { categoryTagService } from "../../../services/categoryTagService.js";
import { AIChatbox } from "../../components/ai/AIChatbox.jsx";

// Mapping Sectors to Specialized Majors & sub-skills in the frontend (English translation)
const ACADEMIC_MAP = {
  "Education & Pedagogy": {
    majors: ["Mathematics", "Literature", "Physics", "Chemistry", "English Pedagogy", "History", "Geography", "Basic IT Education"],
    skills: {
      "Mathematics": ["Space Geometry", "Calculus", "Algebra", "High School Math Prep"],
      "Literature": ["Literary Analysis", "Social Essay writing", "Creative Writing", "Poetry Reading"],
      "Physics": ["Mechanics", "AC Electricity", "Optics", "Quantum Physics"],
      "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Redox Reactions", "General Chemistry"],
      "English Pedagogy": ["IELTS Writing", "IELTS Speaking", "Advanced Grammar", "English Pronunciation"],
      "History": ["Vietnamese History", "World History", "Historical Methodology"],
      "Geography": ["Natural Geography", "Socio-Economic Geography", "Cartography"],
      "Basic IT Education": ["Pascal/C++ Programming", "MOS Office Suite", "Intro to Python"]
    }
  },
  "Finance & Accounting": {
    majors: ["Tax Accounting", "Financial Analysis", "Auditing", "Microsoft Excel", "Corporate Accounting"],
    skills: {
      "Tax Accounting": ["VAT Declaration", "Personal Income Tax", "Corporate Income Tax", "Tax Settlement"],
      "Financial Analysis": ["Business Valuation", "Cash Flow Forecasting", "Financial Statement Analysis", "Financial Modeling"],
      "Auditing": ["Internal Auditing", "External Auditing", "System Risk Assessment"],
      "Microsoft Excel": ["VLOOKUP/INDEX MATCH", "VBA & Macros", "Advanced Pivot Tables", "Power Query"],
      "Corporate Accounting": ["General Ledger", "MISA Software", "Double-Entry Bookkeeping", "Payroll Accounting"]
    }
  },
  "Languages & Translation": {
    majors: ["English Translation", "Chinese Interpretation", "Commercial Japanese", "Korean Translation"],
    skills: {
      "English Translation": ["Contract Translation", "Medical Translation", "Academic Translation", "Proofreading"],
      "Chinese Interpretation": ["Simultaneous Interpretation", "Chaperone Interpretation", "Business Chinese"],
      "Commercial Japanese": ["Business Email Writing", "Keigo Honorifics", "Business Transactions"],
      "Korean Translation": ["Subtitling", "Technical Translation", "Socio-Economic Korean"]
    }
  },
  "Design & Creative Art": {
    majors: ["Photoshop", "Illustrator", "Digital Illustration", "Presentation Pitchdeck", "UI/UX Design"],
    skills: {
      "Photoshop": ["Advanced Compositing", "Portrait Retouching", "Ad Banner Design", "Digital Painting"],
      "Illustrator": ["Vector Design", "Logo Design", "Flat Design & Icons", "Typography Design"],
      "Digital Illustration": ["Comic Book Drawing", "Book Cover Illustration", "Storyboarding", "Concept Art"],
      "Presentation Pitchdeck": ["Professional PowerPoint", "Keynote Design", "Startup Pitchdeck Design"],
      "UI/UX Design": ["Wireframing", "Figma Prototyping", "User Persona Research", "Design System Creation"]
    }
  },
  "Law & Legal Services": {
    majors: ["Contract Consulting", "Corporate Law", "Intellectual Property", "Litigation Support"],
    skills: {
      "Contract Consulting": ["Commercial Contract Review", "Employment Agreements", "Transfer Deeds", "Clause Disputes"],
      "Corporate Law": ["Business Registration", "Business License Changes", "M&A Legal Compliance"],
      "Intellectual Property": ["Trademark Registration", "Copyright Filings", "Patent Applications", "Brand Disputes"],
      "Litigation Support": ["Criminal Defense Prep", "Civil Case Preparation", "Lawsuit Filings", "Appeals Processes"]
    }
  },
  "Software Development": {
    majors: ["Frontend Development", "Backend Development", "Mobile App Development", "Database Administration"],
    skills: {
      "Frontend Development": ["React.js", "Vue.js", "Tailwind CSS", "HTML5/CSS3", "TypeScript"],
      "Backend Development": ["Node.js", "Express", "ASP.NET Core", "Python Django", "GoLang"],
      "Mobile App Development": ["React Native", "Flutter", "Swift/iOS", "Kotlin/Android"],
      "Database Administration": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQL Optimization"]
    }
  },
  "Marketing & Sales": {
    majors: ["Digital Marketing", "SEO Optimization", "Content Marketing", "Social Media Management", "Copywriting"],
    skills: {
      "Digital Marketing": ["Google Ads", "Facebook Ads Campaigns", "Email Marketing", "Google Analytics"],
      "SEO Optimization": ["On-Page SEO", "Off-Page Backlinking", "Keyword Research", "Technical SEO Audits"],
      "Content Marketing": ["Blogging Strategy", "Ebook Writing", "Lead Generation Funnels", "Newsletter Creation"],
      "Social Media Management": ["Instagram Content", "TikTok Video Strategy", "Community Engagement", "Social Scheduling"],
      "Copywriting": ["Sales Pages", "Landing Page Copy", "Ad Copies", "Slogan Writing"]
    }
  },
  "Writing & Content": {
    majors: ["Technical Writing", "Creative Writing", "Copy Editing", "Proofreading", "Content Strategy"],
    skills: {
      "Technical Writing": ["API Documentation", "User Guides", "Whitepapers", "Software Wiki"],
      "Creative Writing": ["Novel Editing", "Screenplay Formatting", "Story Development", "Ghostwriting"],
      "Copy Editing": ["Structural Editing", "Tone Adjustment", "Fact-Checking", "Readability Improvement"],
      "Proofreading": ["Grammar Checking", "Punctuation Correction", "Typo Detection", "Style Guide Consistency"],
      "Content Strategy": ["Editorial Calendar", "Brand Voice Guideline", "Audience Segmentation", "Content Audit"]
    }
  },
  "Engineering & Architecture": {
    majors: ["CAD Drafting", "Structural Engineering", "Mechanical Design", "Electrical Engineering", "Autocad"],
    skills: {
      "CAD Drafting": ["2D Blueprinting", "3D Modeling", "As-Built Drawings", "Detail Detailing"],
      "Structural Engineering": ["Concrete Design", "Steel Frame Analysis", "Load Calculations", "SAP2000 Pro"],
      "Mechanical Design": ["SolidWorks Parts", "Product Prototyping", "Thermal Systems", "Sheet Metal Design"],
      "Electrical Engineering": ["Circuit Diagrams", "PCB Layouts", "Power Distribution Plans", "Arduino Prototyping"],
      "Autocad": ["Civil Engineering Plans", "Floor Plan Layouts", "Revit BIM Integration"]
    }
  },
  "Healthcare & Medical Support": {
    majors: ["Medical Transcription", "Healthcare Administration", "Health Coaching", "Clinical Research"],
    skills: {
      "Medical Transcription": ["Doctor Dictation Typing", "EHR Record Updates", "Medical Terminology"],
      "Healthcare Administration": ["Billing & Coding", "Patient Scheduling", "Insurance Claim Followup"],
      "Health Coaching": ["Nutrition Planning", "Fitness Goal Setting", "Lifestyle Strategy", "Habit Coaching"],
      "Clinical Research": ["Literature Review", "Data Entry Protocols", "FDA Compliance Documentation", "Study Analysis"]
    }
  }
};

const MOCK_EXPERTS = [];
=======
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
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    sector: "",          // Sector (Category)
    major: "",           // Specialized Major
    title: "",
    description: "",
    budget: 0,
    durationValue: 1,
    durationUnit: "days",
=======
    category: "",
    specialization: "",
    title: "",
    description: "",
    budget: 0, // number — no $, no commas
    durationValue: 1, // number
    durationUnit: "days", // "days" | "weeks" | "months"
>>>>>>> Stashed changes
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [useCases, setUseCases] = useState([
    { nameAndDeadline: "", description: "", durationDays: 1, durationValue: 1, durationUnit: "days" },
  ]);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
<<<<<<< Updated upstream
  const [leftPanelMode, setLeftPanelMode] = useState("graphic"); // "graphic" | "ai_chat"

  // Match State
  const [searchMatching, setSearchMatching] = useState(false);
  const [matchingResults, setMatchingResults] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedExpert, setSelectedExpert] = useState(null);

  // Sidebar state
  const [viewingExpert, setViewingExpert] = useState(null);
=======
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
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
  const selectedSectorObj = categories.find((c) => c.id === formData.sector);
  const selectedSectorName = selectedSectorObj?.name || "";
  const academicGroup = ACADEMIC_MAP[selectedSectorName];

  // Derived lists based on selection
  const availableMajors = academicGroup?.majors || [];
  const availableSkillsList = academicGroup?.skills[formData.major] || [];

  const handleSectorChange = (sectorId) => {
    setFormData((prev) => ({
      ...prev,
      sector: sectorId,
      major: "", // reset major
    }));
    setSelectedSkills([]);
    setSelectedExpert(null);
  };

  const handleMajorChange = (majorName) => {
    setFormData((prev) => ({
      ...prev,
      major: majorName,
    }));
    setSelectedSkills([]);
    setSelectedExpert(null);
  };

  const toggleSkill = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
=======
  const toggleSkill = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName],
>>>>>>> Stashed changes
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
    if (!formData.title || !formData.description || !formData.sector || !formData.major) {
      alert("Please fill in all required fields!");
      return;
    }

    setSubmitting(true);
    let deadlineDays = Number(formData.durationValue) || 1;
    if (formData.durationUnit === "weeks") deadlineDays *= 7;
    if (formData.durationUnit === "months") deadlineDays *= 30;

<<<<<<< Updated upstream
    // Resolve Skill IDs from DB seeded tags if matched, or fallback
    const skillIdsToSubmit = [];
    selectedSkills.forEach((skillName) => {
      const matchDb = allAvailableSkills.find(
        (s) => s.name?.toLowerCase() === skillName.toLowerCase()
      );
      if (matchDb) {
        skillIdsToSubmit.push(matchDb.id);
      }
    });
=======
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
>>>>>>> Stashed changes

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
<<<<<<< Updated upstream
      aiCategoryDomainId: formData.sector || null,
      clientId: user?.id,
      skillIds: skillIdsToSubmit,
      useCases: [],
    };

    try {
      const response = await api.jobPosts.create(payload);
      const createdId = response?.id;

      if (!isPublic && selectedExpert && createdId) {
        // Save direct contract mapping to local storage
        const storedMapping = JSON.parse(localStorage.getItem("aitasker_chosen_experts") || "{}");
        storedMapping[createdId] = selectedExpert.id;
        localStorage.setItem("aitasker_chosen_experts", JSON.stringify(storedMapping));
        
        alert(`Project created and direct invitation sent to Expert ${selectedExpert.fullName} successfully! Awaiting expert confirmation.`);
      } else {
        alert("Project posted publicly successfully! Awaiting expert proposals.");
      }

=======
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
>>>>>>> Stashed changes
      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      alert(err.message || "Failed to create project. Please try again!");
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< Updated upstream
  const hasFilledBasicInfo = formData.title && formData.description && formData.sector && formData.major;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 border-b border-slate-200/50 flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-900 transition-colors">
=======
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
>>>>>>> Stashed changes
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
      </div>

<<<<<<< Updated upstream
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left column: Swappable AI illustration / Expert Profile / AI Chatbox */}
        <div className="lg:col-span-2 sticky top-36">
          {viewingExpert ? (
            // Expert Detail Profile view
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-900 to-purple-800"></div>
              
              <button 
                onClick={() => setViewingExpert(null)}
                className="mb-4 text-xs font-semibold text-blue-900 hover:text-purple-800 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-800 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-2xl">
                    {viewingExpert.fullName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewingExpert.fullName}</h3>
                  <p className="text-sm text-slate-500 font-medium">{viewingExpert.expertProfile?.major || "Expert"}</p>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {viewingExpert.expertProfile?.location || "N/A"}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {viewingExpert.avgRating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm leading-relaxed border-t border-slate-100 pt-4">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">About Me</h4>
                  <p className="text-slate-600 text-xs text-justify">
                    {viewingExpert.expertProfile?.bio || "No introduction bio provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Hourly Rate</span>
                    <span className="font-bold text-slate-800">${viewingExpert.expertProfile?.hourlyRate || 30}/hr</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Completed Tasks</span>
                    <span className="font-bold text-slate-800">{viewingExpert.expertProfile?.completedProjects || 12} projects</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Specialized Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingExpert.expertProfile?.skills?.map((skill, index) => (
                      <span key={index} className="px-2.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-md text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : leftPanelMode === "ai_chat" ? (
            // AI Chatbox view
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-[550px] flex flex-col relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-purple-800"></div>
              <button 
                type="button"
                onClick={() => setLeftPanelMode("graphic")}
                className="mb-2 text-xs font-semibold text-blue-900 hover:text-purple-800 flex items-center gap-1 transition-colors self-start animate-fadeIn"
              >
                ← Back
              </button>
              <div className="flex-1 min-h-0">
                <AIChatbox />
              </div>
            </div>
          ) : (
            // Default View: Pure Image with a small bottom-aligned interactive button
            <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white group">
              <img 
                src="/ai_assistant.png" 
                alt="AI Assistant" 
                className="w-full object-cover rounded-2xl hover:scale-[1.01] transition-transform duration-200 animate-fadeIn"
              />
              <div className="absolute bottom-6 inset-x-0 flex justify-center z-10">
                <button
                  type="button"
                  onClick={() => setLeftPanelMode("ai_chat")}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-900 to-purple-800 hover:from-blue-950 hover:to-purple-950 text-white rounded-full font-bold text-xs shadow-lg shadow-purple-900/40 hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-4 h-4" />
                  AI Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Project Form */}
        <div className="lg:col-span-3 space-y-6">
          <form className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-900" />
              Project Recruitment Information
            </h2>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm transition-all"
                placeholder="e.g., Grade 12 Calculus Tutor, Q2 Corporate Financial Report Preparation"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Detailed Requirements Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm transition-all"
                placeholder="Provide a detailed description of the study material or professional tasks, evaluation criteria, etc..."
                required
              />
            </div>

            {/* Sector (Category) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Category Domain <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm bg-white transition-all"
                required
              >
                <option value="" disabled>-- Select Category Domain --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialized Major (Dependent) */}
            {formData.sector && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specialized Major <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.major}
                  onChange={(e) => handleMajorChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm bg-white transition-all"
                  required
                >
                  <option value="" disabled>-- Select Specialized Major --</option>
                  {availableMajors.map((major) => (
                    <option key={major} value={major}>
                      {major}
=======
      <div
        className={`grid grid-cols-1 ${rightPanelMode ? "lg:grid-cols-10 gap-6 items-start" : "max-w-3xl mx-auto"}`}
      >
        <div
          className={
            rightPanelMode ? "lg:col-span-7 flex flex-col" : "w-full"
          }
        >
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col h-full"
          >
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
                  <option value="" disabled>
                    Select a category...
                  </option>
                  {categoriesList.map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
>>>>>>> Stashed changes
                    </option>
                  ))}
                </select>
              </div>
            )}

<<<<<<< Updated upstream
            {/* Skills based on selected Major */}
            {formData.major && availableSkillsList.length > 0 && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specific Specialized Skills (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSkillsList.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        selectedSkills.includes(skill)
                          ? "bg-blue-900 border-blue-900 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
=======
              {/* Specialization Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area of expertise or Specialization
                </label>
                <select
                  value={formData.specialization}
                  onChange={(e) =>
                    updateField("specialization", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white"
                  disabled={!formData.category}
                  required
                >
                  <option value="" disabled>
                    {formData.category
                      ? "Select a specialization..."
                      : "Please select a category first"}
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
                    Select a category and specialization to view matching
                    skills.
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

              {/* Relocated Budget & Timeline inputs row */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-150 pt-6 mt-6">
                {/* Budget — type="number" */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.budget || ""}
                    onChange={(e) =>
                      updateField(
                        "budget",
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="5000"
                  />
                </div>

                {/* Duration — read-only value with +/- adjusters + unit select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => updateField("durationValue", Math.max(minVal, (formData.durationValue || 0) - 1))}
                      disabled={formData.durationValue <= minVal}
                      className="h-10 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg select-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      readOnly
                      value={formData.durationValue || ""}
                      className="w-16 h-10 text-center px-1 py-2 border border-gray-300 bg-gray-50 rounded-lg cursor-not-allowed select-none font-medium"
                      placeholder="1"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("durationValue", (formData.durationValue || 0) + 1)}
                      className="h-10 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-bold text-lg select-none"
                    >
                      +
                    </button>
                    <select
                      value={formData.durationUnit}
                      onChange={(e) =>
                        updateField("durationUnit", e.target.value)
                      }
                      className="flex-1 h-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white text-sm"
>>>>>>> Stashed changes
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Budget + Duration row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Estimated Budget (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.budget || ""}
                  onChange={(e) => updateField("budget", e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm"
                  placeholder="e.g., 200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Estimated Duration
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
                     className="w-20 px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm"
                  />
                  <select
                    value={formData.durationUnit}
                    onChange={(e) => updateField("durationUnit", e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/25 focus:border-blue-900 text-sm bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            </div>

          </form>

          {/* Expert Matching Matching Section */}
          {hasFilledBasicInfo && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Match Suitable Experts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Search for top-rated experts or tutors based on your project description</p>
                </div>
                
                <button
                  type="button"
                  onClick={handleSearchExperts}
                  disabled={searchMatching}
                  className="px-4 py-2 bg-gradient-to-r from-blue-900 to-purple-800 text-white rounded-xl font-semibold text-xs shadow-md shadow-purple-900/10 hover:from-blue-950 hover:to-purple-950 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {searchMatching ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Match Recommended Experts
                    </>
                  )}
                </button>
              </div>

              {showMatches && (
                <div className="space-y-3 pt-2">
                  <div className="grid gap-3">
                    {matchingResults.slice(0, visibleCount).map((expert) => (
                      <div key={expert.id} className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                        selectedExpert?.id === expert.id 
                          ? "border-purple-600 bg-purple-50/20" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 text-blue-900 flex items-center justify-center flex-shrink-0 font-bold shadow-inner">
                          {expert.fullName?.[0]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingExpert(expert)}
                              className="font-semibold text-slate-900 text-sm hover:text-blue-900 hover:underline text-left"
                            >
                              {expert.fullName}
                            </button>
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                              {expert.matchPercent}% Match
                            </span>
                          </div>

                          <p className="text-xs text-slate-500">{expert.expertProfile.major}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {expert.avgRating}
                            </span>
                            <span>·</span>
                            <span>${expert.expertProfile.hourlyRate}/hr</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingExpert(expert)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            View Profile
                          </button>
                          
                          {selectedExpert?.id === expert.id ? (
                            <button
                              type="button"
                              onClick={() => setSelectedExpert(null)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Deselect
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExpert(expert);
                                setViewingExpert(expert); // display profile immediately
                              }}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Hire Expert
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {visibleCount < matchingResults.length && (
                    <button
                      type="button"
                      onClick={handleScanMore}
                      className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <ChevronDown className="w-4 h-4" /> Scan more experts (+3)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Real-time Final Review Form */}
          {formData.title && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn border-t-purple-600 border-t-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-purple-700" />
                Project Summary Draft
              </h3>
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60 space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Project Title</span>
                  <span className="col-span-2 font-semibold text-slate-800">{formData.title}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Domain & Major</span>
                  <span className="col-span-2 text-slate-800">
                    {selectedSectorName} {formData.major && `→ ${formData.major}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Selected Skills</span>
                  <span className="col-span-2 text-slate-800">
                    {selectedSkills.join(", ") || "No specific skills selected"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Estimated Budget</span>
                  <span className="col-span-2 text-slate-800 font-bold">${formData.budget || 0} USD</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Expected Timeline</span>
                  <span className="col-span-2 text-slate-800">
                    {formData.durationValue} {formData.durationUnit}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Assigned Expert</span>
                  <span className="col-span-2 font-bold">
                    {selectedExpert ? (
                      <span className="text-purple-700 flex items-center gap-1">
                        🌟 {selectedExpert.fullName} (Pending expert confirmation)
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Post publicly (Waiting for applicants to apply)</span>
                    )}
                  </span>
                </div>
              </div>

<<<<<<< Updated upstream
              {/* Submitting controls */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {selectedExpert ? (
                  // Hired flow submit
                  <>
                    <button
                      type="button"
                      onClick={() => handlePublish(false)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? "Sending request..." : "Confirm & Send Direct Invitation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExpert(null)}
                      className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                    >
                      Post Publicly Instead
                    </button>
                  </>
                ) : (
                  // Public flow submit
                  <>
                    <button
                      type="button"
                      onClick={() => handlePublish(true)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? "Creating..." : "Post Project Publicly & Await Bids"}
                    </button>
                  </>
                )}
=======
              {/* Warning/Status Info Box underneath the inputs */}
              <div className="rounded-xl border px-4 py-3 text-sm bg-blue-50 border-blue-100 text-blue-700 mt-4">
                Tổng timeline gốc Use Case: <strong>{totalUseCaseDays} ngày</strong>. Timeline dự án hiện tại: <strong>{configuredDeadlineDays || 0} ngày</strong>.
                <span className="block mt-1 font-medium text-xs text-blue-600">
                  * Bạn chỉ có thể giữ nguyên hoặc tăng thêm thời gian cho timeline dự án, không được giảm dưới tổng thời gian gốc của Use Case.
                </span>
>>>>>>> Stashed changes
              </div>

            </div>
<<<<<<< Updated upstream
          )}
=======

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
>>>>>>> Stashed changes
        </div>

        {/* AI Assistant Sidebar Section */}
        {rightPanelMode === "ai_planner" && (
          <aside className="lg:col-span-3 lg:sticky lg:top-20">
            <div
              id="ai-assistant-sidebar"
              className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden lg:h-[calc(100vh-8rem)]"
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
