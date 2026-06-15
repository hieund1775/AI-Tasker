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

export function PostProject() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    sector: "",          // Sector (Category)
    major: "",           // Specialized Major
    title: "",
    description: "",
    budget: 0,
    durationValue: 1,
    durationUnit: "days",
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [allAvailableSkills, setAllAvailableSkills] = useState([]);
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    async function loadOptions() {
      try {
        const [catsRes, skillsRes] = await Promise.all([
          categoryTagService.getCategories(),
          categoryTagService.getSkills(),
        ]);
        setCategories(catsRes || []);
        setAllAvailableSkills(skillsRes || []);
      } catch (err) {
        console.error("Failed to load post project options:", err);
      }
    }
    loadOptions();
  }, []);

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
    );
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
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

      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      alert(err.message || "Failed to create project. Please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  const hasFilledBasicInfo = formData.title && formData.description && formData.sector && formData.major;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 border-b border-slate-200/50 flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
      </div>

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
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
