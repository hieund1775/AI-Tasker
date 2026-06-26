import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

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

export function EditExpertProfile() {
  const navigate = useNavigate();
  const { user, completeExpertProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    jobTitle: "",
    category: "",
    specialization: "",
    email: "",
    phone: "",
    location: "",
    portfolioUrls: "",
    hourlyRate: "",
    bio: "",
    website: "",
    industry: "",
  });

  const [skills, setSkills] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    if (user?.hasProfile === false) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
      return;
    }

    setLoading(true);
    api.users.getById(user.id)
      .then((res) => {
        if (res) {
          setFormData({
            name: res.fullName || "",
            email: res.email || "",
            phone: res.expertProfile?.phone || res.status || "",
            jobTitle: res.expertProfile?.jobTitle || "",
            category: res.expertProfile?.category || "",
            specialization: res.expertProfile?.specialization || res.expertProfile?.major || "",
            location: res.expertProfile?.location || "",
            portfolioUrls: res.expertProfile?.portfolioUrls || "",
            bio: res.expertProfile?.bio || "",
            hourlyRate: res.expertProfile?.hourlyRate || "",
            website: res.expertProfile?.website || "",
            industry: res.expertProfile?.industry || "",
          });
          if (res.expertProfile?.skills) {
            setSkills(res.expertProfile.skills);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load expert profile details:", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const toggleSkill = (skillName) => {
    setSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Vui lòng chọn ít nhất một kỹ năng.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const apiPayload = {
        jobTitle: formData.jobTitle || "Chưa cập nhật",
        major: formData.specialization || "Chưa cập nhật",
        category: formData.category,
        specialization: formData.specialization,
        skills: skills,
        bio: formData.bio || "Chưa có giới thiệu",
        portfolioUrls: formData.portfolioUrls || "",
        location: formData.location || "Chưa cập nhật",
        phone: formData.phone.trim(),
        hourlyRate: Number(formData.hourlyRate) || 0,
        website: formData.website || "",
        industry: formData.industry || "",
      };

      await Promise.all([
        api.users.update(user.id, { 
          fullName: formData.name.trim(),
          email: formData.email.trim(),
          status: formData.phone.trim()
        }),
        completeExpertProfile(apiPayload),
      ]);

      const storedUser = localStorage.getItem("aitasker_user_info");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.name = formData.name.trim();
        localStorage.setItem("aitasker_user_info", JSON.stringify(u));
      }

      alert("Hồ sơ đã được lưu thành công!");
      navigate("/expert/profile", { replace: true });
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi lưu. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        {user?.hasProfile !== false && (
          <Link
            to="/expert/profile"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}

        <h1 className="text-2xl font-bold text-gray-900">
          {user?.hasProfile === false
            ? "Hoàn thiện hồ sơ để bắt đầu"
            : "Edit Expert Profile"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Contact Person */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        {/* Professional Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Professional Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            placeholder="e.g. Senior ML Engineer"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        {/* Category & Specialization Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                const cat = e.target.value;
                setFormData(prev => ({ ...prev, category: cat, specialization: "" }));
                setSkills([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white"
              required
            >
              <option value="">-- Select Category --</option>
              {Object.keys(CATEGORY_DATA).map((catName) => (
                <option key={catName} value={catName}>
                  {catName}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.specialization}
              onChange={(e) => {
                const spec = e.target.value;
                setFormData(prev => ({ ...prev, specialization: spec }));
                setSkills([]);
              }}
              disabled={!formData.category}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-white disabled:bg-gray-50"
              required
            >
              <option value="">-- Select Specialization --</option>
              {formData.category &&
                CATEGORY_DATA[formData.category]?.specializations.map((specName) => (
                  <option key={specName} value={specName}>
                    {specName}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Skills Selector (Togglable buttons) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills <span className="text-red-500">*</span>
          </label>
          {!formData.category || !formData.specialization ? (
            <p className="text-sm text-gray-400">
              Please select a Category and Specialization to see available skills.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Select skills that apply to your specialization:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_DATA[formData.category]?.skills[formData.specialization]?.map((skName) => {
                  const isSelected = skills.includes(skName);
                  return (
                    <button
                      key={skName}
                      type="button"
                      onClick={() => toggleSkill(skName)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isSelected
                          ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                          : "bg-white border-gray-300 text-gray-700 hover:border-brand-primary"
                      }`}
                    >
                      {skName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Email & Phone side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
              required
            />
          </div>
        </div>

        {/* Location & Website side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. New York, NY"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="e.g. https://myportfolio.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Industry & Portfolio URL side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g. IT, Software"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio URL
            </label>
            <input
              type="url"
              value={formData.portfolioUrls}
              onChange={(e) => setFormData({ ...formData, portfolioUrls: e.target.value })}
              placeholder="e.g. https://github.com/myusername"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Hourly Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hourly Rate (USD/hr)
          </label>
          <input
            type="number"
            min="0"
            value={formData.hourlyRate}
            onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
            placeholder="e.g. 50"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            placeholder="Write a brief professional bio..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-5 text-[15px] rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover font-medium inline-flex items-center gap-2 justify-center disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {user?.hasProfile !== false && (
            <Link
              to="/expert/profile"
              className="h-11 px-5 text-[15px] rounded-xl border border-gray-300 hover:bg-gray-50 font-medium inline-flex items-center justify-center"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
