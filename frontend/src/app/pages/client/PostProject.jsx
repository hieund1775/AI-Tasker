import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Send, Star, MapPin, Clock, CheckCircle, Briefcase } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";

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
      "Physics"
    ],
    skills: {
      "Aerospace Engineering": ["Aerodynamics", "Propulsion", "CAD/CAM", "MATLAB"],
      "Chemical Engineering": ["Process Simulation", "ASPEN Plus", "Thermodynamics", "Chemical Synthesis"],
      "Civil Engineering": ["AutoCAD", "Structural Analysis", "Revit", "GIS Mapping"],
      "Electrical Engineering": ["Circuit Design", "FPGA Programming", "Verilog", "Altium Designer"],
      "Mechanical Engineering": ["SolidWorks", "Finite Element Analysis (FEA)", "Thermodynamics", "Robotics"],
      "Environmental Science": ["Environmental Impact Assessment", "GIS Mapping", "Water Quality Analysis", "Ecology"],
      "Biotechnology": ["CRISPR Gene Editing", "Bioinformatics", "Cell Culture", "PCR Analysis"],
      "Physics": ["Quantum Mechanics", "Computational Physics", "Data Analysis", "LaTeX Documenting"]
    }
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
      "Market Research"
    ],
    skills: {
      "Digital Marketing": ["Google Ads", "Facebook Ads Manager", "Google Analytics", "PPC Campaigns"],
      "Search Engine Optimization (SEO)": ["Keyword Research", "On-Page SEO", "Link Building", "SEMrush/Ahrefs"],
      "Social Media Management": ["Content Scheduling", "Copywriting", "Canva Designing", "Community Management"],
      "Content Marketing": ["SEO Writing", "Blogging", "Content Strategy", "Copywriting"],
      "Email Marketing": ["Mailchimp", "HubSpot", "Email Copywriting", "A/B Testing Campaigns"],
      "Sales Strategy": ["Lead Generation", "Cold Calling", "CRM (Salesforce)", "Sales Pitch Negotiation"],
      "Brand Management": ["Brand Identity", "Public Relations", "Market Trend Analysis", "Visual Brand Book"],
      "Market Research": ["Data Collection", "Survey Design", "Competitive Analysis", "SPSS Statistics"]
    }
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
      "Project Management"
    ],
    skills: {
      "Financial Accounting": ["Quickbooks", "GAAP Compliance", "Financial Reporting", "Tax Preparation"],
      "Auditing": ["Internal Audit", "Risk Assessment", "SOX Compliance", "Financial Analysis"],
      "Corporate Law": ["Contract Drafting", "Due Diligence", "Mergers & Acquisitions", "Corporate Governance"],
      "Intellectual Property": ["Patent Filing", "Trademark Law", "Copyrights Law", "IP Strategy"],
      "Recruitment & Talent Acquisition": ["ATS Systems", "Candidate Sourcing", "Interviewing Techniques", "Executive Search"],
      "Employee Relations": ["Conflict Resolution", "HR Policy Design", "Onboarding Programs", "Performance Management"],
      "Business Strategy": ["Market Entry Strategy", "SWOT Analysis", "Financial Modeling", "Management Consulting"],
      "Project Management": ["Scrum Framework", "Agile Methodologies", "Jira/Asana Management", "PMP Standards"]
    }
  },
  "Product Sourcing & Manufacturing": {
    specializations: [
      "Supply Chain Management",
      "Logistics",
      "Product Design",
      "Quality Control",
      "Manufacturing Engineering",
      "Vendor Relations",
      "Inventory Management"
    ],
    skills: {
      "Supply Chain Management": ["ERP Systems", "Sales & Operations Planning (S&OP)", "Procurement", "Strategic Sourcing"],
      "Logistics": ["Freight Coordination", "Route Planning", "Third-Party Logistics (3PL)", "Warehouse Management"],
      "Product Design": ["CAD Prototyping", "Ergonomics Study", "Material Selection", "DFM (Design for Manufacturing)"],
      "Quality Control": ["Six Sigma", "Lean Manufacturing", "ISO 9001 Auditing", "QA Inspections"],
      "Manufacturing Engineering": ["CNC Programming", "Automation Systems", "PLC Programming", "Assembly Line Layout"],
      "Vendor Relations": ["Contract Negotiation", "Supplier Audit", "Global Sourcing", "Cost Estimation"],
      "Inventory Management": ["FIFO/LIFO Operations", "Demand Forecasting", "WMS Software", "Cycle Counting"]
    }
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
      "Computer Networks"
    ],
    skills: {
      "Software Engineering": ["Java", "C++", "Python", "Go", "Rust", "System Design", "Algorithms"],
      "Mobile App Development": ["Swift (iOS)", "Kotlin (Android)", "React Native", "Flutter", "Mobile SDKs"],
      "UI/UX Design": ["Figma", "Wireframing", "User Research", "Interactive Prototyping", "Adobe XD"],
      "Cloud Computing": ["AWS", "Google Cloud Platform (GCP)", "Microsoft Azure", "Cloud Architecture"],
      "Cyber Security": ["Penetration Testing", "Network Security", "Cryptography", "CISSP Standards", "Firewall Auditing"],
      "Database Administration": ["PostgreSQL", "MongoDB", "MySQL", "Query Performance Tuning", "Database Schema Design"],
      "Devops": ["Docker Containers", "CI/CD Pipelines", "Kubernetes Orchestration", "Terraform IaC", "Ansible Automation"],
      "Computer Networks": ["TCP/IP Protocols", "Cisco CCNA", "Virtual Private Networks (VPN)", "Network Troubleshooting"]
    }
  },
  "Translation & Languages": {
    specializations: [
      "English Translation",
      "Spanish Translation",
      "French Translation",
      "Chinese Translation",
      "Interpretation",
      "Localization",
      "Proofreading & Editing"
    ],
    skills: {
      "English Translation": ["English Grammar", "English-to-Vietnamese Translation", "Proofreading", "Localization Strategy"],
      "Spanish Translation": ["Spanish Grammar", "Spanish-to-English Translation", "Spanish Subtitling", "Localization"],
      "French Translation": ["French Grammar", "French-to-English Translation", "French Localization"],
      "Chinese Translation": ["Mandarin/Cantonese Translation", "Chinese-to-English Translation", "Document Translation"],
      "Interpretation": ["Consecutive Interpretation", "Simultaneous Interpretation", "Active Listening", "Medical/Legal Interpretation"],
      "Localization": ["CAT Tools (Trados)", "Software UI Localization", "Cultural Adaptation Strategy"],
      "Proofreading & Editing": ["Copy Editing", "Grammar & Syntax Correction", "Style Guide Compliance (APA/MLA)"]
    }
  },
  "Trades & Services": {
    specializations: [
      "Electrical Work",
      "Plumbing",
      "Carpentry",
      "HVAC Services",
      "Auto Repair",
      "Cleaning Services",
      "Landscaping"
    ],
    skills: {
      "Electrical Work": ["Electrical Wiring", "Circuit Troubleshooting", "Reading Blueprints", "Safety Compliance (NEC)"],
      "Plumbing": ["Pipe Fitting", "Drain Cleaning", "Leak Detection", "Commercial Piping Blueprints"],
      "Carpentry": ["Fine Woodworking", "Framing", "Cabinetry", "Power Tools Operation"],
      "HVAC Services": ["Air Conditioning Installation", "Heating Systems Repair", "Refrigerant Management", "HVAC Diagnostics"],
      "Auto Repair": ["Engine Diagnostics", "Brake Systems Repair", "Suspension Tuning", "Automotive Electrical Systems"],
      "Cleaning Services": ["Commercial Cleaning", "Deep Cleaning", "Sanitization Standards", "Eco-friendly Cleaning Products"],
      "Landscaping": ["Lawn Care", "Garden Design", "Irrigation Systems Setup", "Horticulture Expertise"]
    }
  },
  "Freight, Shipping & Transportation": {
    specializations: [
      "Freight Forwarding",
      "Fleet Management",
      "Customs Brokerage",
      "Warehouse Management",
      "Route Optimization",
      "Courier Services"
    ],
    skills: {
      "Freight Forwarding": ["Customs Regulations", "Bill of Lading Drafting", "International Shipping Compliance", "Carrier Booking"],
      "Fleet Management": ["GPS Tracking Systems", "Vehicle Maintenance Scheduling", "Driver Scheduling", "Fuel Management"],
      "Customs Brokerage": ["Import/Export Documentation", "Tariff Classification (HS Code)", "Regulatory Compliance"],
      "Warehouse Management": ["OSHA Safety Standards", "Material Handling", "Inventory Audits", "Forklift Operations"],
      "Route Optimization": ["Route Planning Software", "Last-Mile Delivery Logistics", "Cost Management"],
      "Courier Services": ["Local Delivery Management", "Time Management", "Customer Service Excellence"]
    }
  },
  "Telecommunications": {
    specializations: [
      "Network Engineering",
      "Wireless Communications",
      "Telephony Systems",
      "Fiber Optics",
      "Satellite Communications",
      "RF Engineering"
    ],
    skills: {
      "Network Engineering": ["VoIP", "SIP Protocols", "Cisco IOS", "Telecom Network Design"],
      "Wireless Communications": ["5G/4G Network Deployment", "LTE Architecture", "WiFi Protocols", "Antenna Engineering"],
      "Telephony Systems": ["PBX Systems Configuration", "Unified Communications (UCaaS)", "Call Center Routing"],
      "Fiber Optics": ["Optical Fiber Splicing", "OTDR Testing", "FTTH Installation"],
      "Satellite Communications": ["VSAT Systems Installation", "Link Budgets Calculation", "RF Systems Calibration"],
      "RF Engineering": ["RF Simulation", "Spectrum Analysis", "Microwave Link Systems"]
    }
  },
  "Education": {
    specializations: [
      "Curriculum Development",
      "Online Tutoring",
      "Special Education",
      "Language Instruction",
      "Instructional Design",
      "Educational Consulting"
    ],
    skills: {
      "Curriculum Development": ["Lesson Planning", "Learning Objectives Definition", "Educational Standards Alignment"],
      "Online Tutoring": ["Zoom Classroom Management", "Interactive Whiteboards", "Subject Matter Tutoring (Math/Science)"],
      "Special Education": ["IEP (Individualized Education Program) Development", "Behavioral Intervention", "Differentiated Instruction"],
      "Language Instruction": ["ESL/EFL Teaching", "Language Pedagogy", "Pronunciation Coaching"],
      "Instructional Design": ["E-Learning Development", "Articulate Storyline", "LMS Administration (Moodle/Canvas)"],
      "Educational Consulting": ["Academic Advising", "College Admissions Counseling", "Educational Technology Assessment"]
    }
  },
  "Health & Medicine": {
    specializations: [
      "General Medicine",
      "Nursing",
      "Physical Therapy",
      "Medical Writing",
      "Healthcare Administration",
      "Clinical Research",
      "Nutrition & Dietetics"
    ],
    skills: {
      "General Medicine": ["Medical Diagnostics", "Patient Care Protocols", "Medical Terminology"],
      "Nursing": ["Patient Monitoring", "IV Administration", "Wound Care", "Electronic Medical Records (EMR)"],
      "Physical Therapy": ["Physical Rehabilitation", "Therapeutic Exercise", "Patient Mobility Assessment"],
      "Medical Writing": ["Clinical Trial Reports", "Medical Copyediting", "Regulatory Document Prep", "AMA Style Compliance"],
      "Healthcare Administration": ["HIPAA Compliance", "Medical Billing & Coding", "Clinic Operations Management"],
      "Clinical Research": ["GCP Guidelines", "Protocol Design", "Data Collection", "Clinical Trials Management"],
      "Nutrition & Dietetics": ["Meal Planning", "Dietary Assessment", "Clinical Nutrition Programs"]
    }
  },
  "Artificial Intelligence": {
    specializations: [
      "Machine Learning",
      "Natural Language Processing",
      "Computer Vision",
      "Deep Learning",
      "Generative AI",
      "MLOps",
      "AI Agent Development"
    ],
    skills: {
      "Machine Learning": ["Python", "Scikit-Learn", "Regression Models", "Classification & Clustering"],
      "Natural Language Processing": ["Hugging Face Transformers", "BERT", "Text Tokenization", "Semantic Search"],
      "Computer Vision": ["OpenCV Library", "YOLO Object Detection", "Image Segmentation", "PyTorch Vision"],
      "Deep Learning": ["Deep Neural Networks", "TensorFlow Framework", "Keras API", "PyTorch Library", "CNN/RNN Architectures"],
      "Generative AI": ["OpenAI API Integration", "LangChain Framework", "RAG Systems Setup", "Vector Databases (Pinecone/Chroma)", "Prompt Engineering"],
      "MLOps": ["MLflow Experiment Tracking", "DVC (Data Version Control)", "AWS SageMaker", "Dockerizing ML Models"],
      "AI Agent Development": ["Semantic Kernel Framework", "AutoGen", "CrewAI Orchestration", "LangGraph", "AI Agent Tooling"]
    }
  }
};

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
<<<<<<< HEAD
    sector: "",          // Sector (Category)
    major: "",           // Specialized Major
=======
    category: "",
    specialization: "",
    title: "",
    description: "",
    budget: 0,
    durationValue: 1,
    durationUnit: "days",
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [useCases, setUseCases] = useState([{ nameAndDeadline: "", description: "" }]);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState("graphic"); // "graphic" | "ai_chat"

  // Match State
  const [searchMatching, setSearchMatching] = useState(false);
  const [matchingResults, setMatchingResults] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedExpert, setSelectedExpert] = useState(null);

  // Sidebar state
  const [viewingExpert, setViewingExpert] = useState(null);

  const formRef = useRef(null);
  const [formHeight, setFormHeight] = useState(0);

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
      prev.includes(skillName) ? prev.filter((name) => name !== skillName) : [...prev, skillName],
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

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
<<<<<<< HEAD
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
      aiCategoryDomain: formData.category ? { id: formData.category, name: formData.category } : null,
      specialization: formData.specialization || null,
      clientId: user?.id,
      skillIds: selectedSkills,
      jobPostSkills: selectedSkills.map((name) => ({ skill: { name } })),
      requiredSkills: selectedSkills,
      useCases: useCases,
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
>>>>>>> 41161e6efb778e83ce97fdf456f16d9d94b56309
      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      alert(err.message || "Failed to create project. Please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendExperts = async () => {
    setLoadingRecommendations(true);
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
          title: u.expertProfile.jobTitle || u.expertProfile.specialization || u.expertProfile.major || "AI Specialist",
          specialization: u.expertProfile.specialization || u.expertProfile.major || u.specialization || "AI Specialist",
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
        const hasSpec = formData.specialization && exp.specialization?.toLowerCase().includes(formData.specialization.toLowerCase());
        if (hasSpec) {
          score += 10;
        }
        
        // skills match count
        const matchSkills = selectedSkills.filter(s => exp.skills?.some(es => es.toLowerCase() === s.toLowerCase())).length;
        score += matchSkills * 2;

        // "ưu tiên nào có từ 3 trở xuống" completedProjects priority
        if (exp.completedProjects <= 3) {
          score += 15; // Give significant priority boost
        }
        
        return score;
      };

      const sortedExperts = [...expertsOnly].sort((a, b) => getScore(b) - getScore(a));
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
 
  const isFormValid =
    formData.title.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.category !== "" &&
    formData.specialization !== "" &&
    selectedSkills.length > 0 &&
    Number(formData.budget) > 0 &&
    Number(formData.durationValue) > 0 &&
    useCases.every(uc => uc.nameAndDeadline.trim() !== "" && uc.description.trim() !== "");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 border-b border-slate-200/50 flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
      </div>

      <div className={`grid grid-cols-1 ${showRecommendations ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-3xl mx-auto"}`}>
        <div className={showRecommendations ? "lg:col-span-7 flex flex-col" : "w-full"}>
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

            {/* Expert Field (Always displayed below budget & timeline, read-only) */}
            <div className="border-t border-gray-150 pt-6">
              <label className="block text-sm font-medium text-gray-750 mb-2">
                Expert
              </label>
              <input
                type="text"
                value={invitedExpert ? (invitedExpert.name || invitedExpert.fullName || "") : ""}
                disabled
                className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                placeholder=""
              />
            </div>

            {/* Use Cases Section (Shifted below budget and timeline row) */}
            <div className="space-y-4 border-t border-gray-150 pt-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-750">
                  Project Use Cases <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseCases([...useCases, { nameAndDeadline: "", description: "" }])}
                  className="h-11 px-4 bg-gray-100 hover:bg-gray-200 text-brand-primary rounded-xl text-sm font-semibold flex items-center gap-1 transition-colors"
                >
                  + Add Use Case
                </button>
              </div>
              
              <div className="space-y-4">
                {useCases.map((uc, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                    {useCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setUseCases(useCases.filter((_, i) => i !== index))}
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
          </div>

          {/* Submit & AI Recommend Buttons */}
          <div className="flex gap-4 pt-6 mt-8 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className={`w-[70%] py-3 text-white rounded-xl font-medium inline-flex items-center justify-center gap-2 transition-all ${
                submitting || !isFormValid
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-brand-primary hover:bg-brand-primary-hover"
              }`}
            >
              <Send className="w-4 h-4" /> {invitedExpert ? (submitting ? "Sending..." : "Send to Expert") : (submitting ? "Publishing..." : "Publish Project")}
            </button>
            <button
              type="button"
              onClick={handleRecommendExperts}
              disabled={submitting || !isFormValid}
              className={`w-[30%] py-3 text-white rounded-xl font-medium inline-flex items-center justify-center gap-2 transition-all ${
                submitting || !isFormValid
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-brand-primary hover:bg-brand-primary-hover font-semibold shadow-sm text-center"
              }`}
            >
              Recommend Expert by AI
            </button>
          </div>
        </form>
      </div>

      {/* AI Recommendations Section */}
      {showRecommendations && (
        <div
          id="ai-recommendations-section"
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-0 overflow-hidden"
          style={{ height: formHeight ? `${formHeight}px` : "100%" }}
        >
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">AI Recommendations</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Matching experts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
            >
              Close
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="animate-pulse space-y-3 py-4">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-20 bg-gray-200 rounded-xl" />
            </div>
          ) : !selectedRecommendExpert ? (
            /* Recommended Experts list */
            recommendedExperts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No experts found matching these criteria.</p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
                {recommendedExperts.slice(0, visibleCount).map((expert) => (
                  <div
                    key={expert.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* ── Top: name + rating badge ── */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
                          {expert.name}
                        </h3>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {expert.rating}
                        </span>
                      </div>

                      {/* ── Title + location ── */}
                      <p className="text-[11px] text-gray-500 mb-2 truncate">
                        {expert.title}
                        {expert.location ? ` · ${expert.location}` : ""}
                      </p>

                      {/* ── Bio ── */}
                      {expert.bio && (
                        <p className="text-sm text-gray-500 mb-2.5 line-clamp-2 leading-relaxed">
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
                        <span className="text-gray-500">
                          <span className="font-semibold text-gray-900">
                            {expert.completedProjects}
                          </span>{" "}
                          projects
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">
                          <span className="font-semibold text-gray-900">
                            ${expert.hourlyRate}
                          </span>
                          /hr
                        </span>
                      </div>
                    </div>

                    {/* ── Action ── */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecommendExpert(expert)}
                      className="block w-full h-11 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium text-center transition-colors mt-auto"
                    >
                      View Detail
                    </button>
                  </div>
                ))}

                {recommendedExperts.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 3)}
                    className="w-full h-11 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors text-center border border-gray-200 mt-2"
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wider mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-6">
                {/* Avatar + Name Info */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-brand-primary text-lg">
                    {selectedRecommendExpert.name?.split(" ").map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-gray-900 truncate">{selectedRecommendExpert.name}</h2>
                    <p className="text-gray-750 font-medium text-sm truncate">{selectedRecommendExpert.title}</p>
                    <p className="text-gray-500 text-xs truncate">{selectedRecommendExpert.email}</p>
                  </div>
                </div>

                {/* Meta Details */}
                <div className="flex flex-col gap-2 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  {selectedRecommendExpert.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {selectedRecommendExpert.location}
                    </span>
                  )}
                  {selectedRecommendExpert.category && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      Category: {selectedRecommendExpert.category}
                    </span>
                  )}
                  {selectedRecommendExpert.specialization && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ${selectedRecommendExpert.hourlyRate}/hr
                    </span>
                  )}
                </div>

                {/* Contact Details */}
                {(selectedRecommendExpert.email || selectedRecommendExpert.phone) && (
                  <div className="pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                    {selectedRecommendExpert.email && (
                      <p>
                        <span className="font-semibold text-gray-700">Email Address:</span> {selectedRecommendExpert.email}
                      </p>
                    )}
                    {selectedRecommendExpert.phone && (
                      <p>
                        <span className="font-semibold text-gray-750">Phone Number:</span> {selectedRecommendExpert.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Bio */}
                {selectedRecommendExpert.bio && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1.5">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedRecommendExpert.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedRecommendExpert.skills?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Skills</h3>
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
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Portfolio</h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.portfolio.map((item, i) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-lg p-2.5 hover:border-blue-200 transition-colors bg-white"
                        >
                          <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-655 mt-1 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Reviews */}
                {selectedRecommendExpert.clientReviews?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Client Reviews ({selectedRecommendExpert.clientReviews.length})
                    </h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.clientReviews.map((review, i) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-lg p-2.5 bg-white"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-gray-900 text-xs">
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
                          <p className="text-xs text-gray-655 leading-normal">{review.comment}</p>
                          {review.date && (
                            <p className="text-[9px] text-gray-400 mt-1">{review.date}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite Button */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setInvitedExpert(selectedRecommendExpert);
                      setShowRecommendations(false);
                      setSelectedRecommendExpert(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[15px]"
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
