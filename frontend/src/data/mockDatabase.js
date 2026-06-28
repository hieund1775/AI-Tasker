// =============================================================================
// AITasker Mock Database
// =============================================================================
// Complete in-memory mock database for frontend-only development.
// 11 entities, all 10+ records, realistic hand-authored data with proper FK refs.
//
// Architecture:
//   - _baseData contains the original seed data (immutable reference)
//   - _runtimeOverlay tracks session mutations (creates, updates, deletes)
//   - get* / list* helpers merge base + overlay, overlay wins
//   - resetMockDatabase() restores to base state
//
// Versioning:
//   - MOCK_DB_VERSION is bumped when the data model changes significantly
//   - On load, if localStorage version doesn't match, stale overlay is cleared
// =============================================================================

const MOCK_DB_VERSION = 3; // bump when data model changes — auto-clears stale overlay

// ---------------------------------------------------------------------------
// 1. USERS — 20 records (1 owner, 3 admins, 8 experts, 8 clients)
// ---------------------------------------------------------------------------

const _baseUsers = [
  // ── Owner ──
  {
    id: "user-001",
    email: "owner@aitasker.com",
    fullName: "Alex Reynolds",
    role: "owner",
    password: "owner123",
    avatar: null,
    bio: "Platform owner and founder of AI Tasker. Dedicated to connecting businesses with top AI talent worldwide.",
    phone: "+1-555-0100",
    status: "active",
    wallet: { balance: 50000, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-01-15T08:00:00.000Z",
    updatedAt: "2026-06-01T10:30:00.000Z",
  },
  // ── Admins ──
  {
    id: "user-002",
    email: "admin1@aitasker.com",
    fullName: "Sarah Chen",
    role: "admin",
    password: "admin123",
    avatar: null,
    bio: "Senior platform administrator with 8 years experience in marketplace operations.",
    phone: "+1-555-0101",
    status: "active",
    wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-02-20T09:00:00.000Z",
    updatedAt: "2026-05-15T14:00:00.000Z",
  },
  {
    id: "user-003",
    email: "admin2@aitasker.com",
    fullName: "Mike Rodriguez",
    role: "admin",
    password: "admin123",
    avatar: null,
    bio: "Platform moderator specializing in dispute resolution and quality assurance.",
    phone: "+1-555-0102",
    status: "active",
    wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-03-10T08:30:00.000Z",
    updatedAt: "2026-06-05T11:00:00.000Z",
  },
  {
    id: "user-004",
    email: "admin3@aitasker.com",
    fullName: "Lisa Wang",
    role: "admin",
    password: "admin123",
    avatar: null,
    bio: "Community manager handling user verification and content moderation.",
    phone: "+1-555-0103",
    status: "active",
    wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-05-01T07:00:00.000Z",
    updatedAt: "2026-06-10T09:00:00.000Z",
  },
  // ── Experts ──
  {
    id: "user-005",
    email: "alice.expert@example.com",
    fullName: "Alice Johnson",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Machine learning engineer with 6+ years building production ML systems. Passionate about NLP and recommendation engines.",
    phone: "+1-555-0201",
    status: "active",
    wallet: { balance: 28500, pendingBalance: 3500, totalEarned: 142000 },
    expertProfile: {
      jobTitle: "Senior ML Engineer",
      category: "Artificial Intelligence",
      specialization: "Machine Learning",
      skills: ["Python", "PyTorch", "TensorFlow", "Scikit-Learn"],
      location: "San Francisco, CA",
      website: "https://alicejohnson.dev",
      industry: "Technology",
      phone: "+1-555-0201",
      bio: "Specialized in building end-to-end ML pipelines from data collection to deployment. Experienced with transformer models and LLM fine-tuning.",
      hourlyRate: 95,
      completedProjects: 24,
      education: "Ph.D. Computer Science, Stanford University",
      certifications: ["AWS Machine Learning Specialty", "TensorFlow Developer Certificate"],
    },
    hasProfile: true,
    createdAt: "2024-06-01T10:00:00.000Z",
    updatedAt: "2026-06-10T16:00:00.000Z",
  },
  {
    id: "user-006",
    email: "bob.expert@example.com",
    fullName: "Bob Williams",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Full-stack developer turned AI specialist. Expert in building AI-powered web applications with React and Node.js.",
    phone: "+1-555-0202",
    status: "active",
    wallet: { balance: 15200, pendingBalance: 8000, totalEarned: 98000 },
    expertProfile: {
      jobTitle: "AI Full-Stack Developer",
      category: "Mobile Phones & Computing",
      specialization: "Software Engineering",
      skills: ["Java", "C++", "Python", "System Design"],
      location: "Austin, TX",
      website: "https://bobwilliams.codes",
      industry: "Software",
      phone: "+1-555-0202",
      bio: "Bridging the gap between AI models and production web apps. Expert in React, Node.js, and cloud deployment of ML services.",
      hourlyRate: 75,
      completedProjects: 18,
      education: "M.S. Software Engineering, UT Austin",
      certifications: ["AWS Solutions Architect", "Google Professional Cloud Developer"],
    },
    hasProfile: true,
    createdAt: "2024-06-15T11:00:00.000Z",
    updatedAt: "2026-06-08T14:30:00.000Z",
  },
  {
    id: "user-007",
    email: "carol.expert@example.com",
    fullName: "Carol Zhang",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "NLP researcher specializing in text analytics, sentiment analysis, and conversational AI systems.",
    phone: "+1-555-0203",
    status: "active",
    wallet: { balance: 34200, pendingBalance: 0, totalEarned: 175000 },
    expertProfile: {
      jobTitle: "NLP Research Scientist",
      category: "Artificial Intelligence",
      specialization: "Natural Language Processing",
      skills: ["Hugging Face Transformers", "BERT", "Text Tokenization", "Semantic Search"],
      location: "New York, NY",
      website: "https://carolzhang.ai",
      industry: "Research",
      phone: "+1-555-0203",
      bio: "5+ years of NLP research and development. Expert in transformer architectures, RAG systems, and multilingual models.",
      hourlyRate: 110,
      completedProjects: 31,
      education: "Ph.D. Computational Linguistics, MIT",
      certifications: ["Deep Learning Specialization", "NLP with Transformers"],
    },
    hasProfile: true,
    createdAt: "2024-07-01T08:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
  },
  {
    id: "user-008",
    email: "david.expert@example.com",
    fullName: "David Park",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Computer vision engineer experienced in object detection, image segmentation, and video analytics.",
    phone: "+1-555-0204",
    status: "active",
    wallet: { balance: 18900, pendingBalance: 6000, totalEarned: 112000 },
    expertProfile: {
      jobTitle: "Computer Vision Engineer",
      category: "Artificial Intelligence",
      specialization: "Computer Vision",
      skills: ["OpenCV Library", "YOLO Object Detection", "Image Segmentation", "PyTorch Vision"],
      location: "Seattle, WA",
      website: "https://davidpark.vision",
      industry: "Automotive",
      phone: "+1-555-0204",
      bio: "Building vision AI systems for autonomous vehicles, medical imaging, and retail analytics. Proficient in PyTorch and OpenCV.",
      hourlyRate: 85,
      completedProjects: 20,
      education: "M.S. Electrical Engineering, University of Washington",
      certifications: ["NVIDIA DLI Certificate", "AWS Machine Learning Specialty"],
    },
    hasProfile: true,
    createdAt: "2024-07-20T13:00:00.000Z",
    updatedAt: "2026-05-28T15:00:00.000Z",
  },
  {
    id: "user-009",
    email: "emma.expert@example.com",
    fullName: "Emma Brown",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "DevOps & MLOps engineer focused on CI/CD pipelines, model monitoring, and scalable cloud infrastructure.",
    phone: "+1-555-0205",
    status: "active",
    wallet: { balance: 22100, pendingBalance: 4500, totalEarned: 135000 },
    expertProfile: {
      jobTitle: "Senior MLOps Engineer",
      category: "Mobile Phones & Computing",
      specialization: "Devops",
      skills: ["Docker Containers", "CI/CD Pipelines", "Kubernetes Orchestration", "Terraform IaC"],
      location: "Denver, CO",
      website: "https://emmabrown.io",
      industry: "Cloud Services",
      phone: "+1-555-0205",
      bio: "Specializing in Kubernetes-based ML platforms, automated training pipelines, and model serving at scale.",
      hourlyRate: 100,
      completedProjects: 22,
      education: "B.S. Computer Engineering, Colorado School of Mines",
      certifications: ["CKA (Certified Kubernetes Administrator)", "AWS DevOps Professional"],
    },
    hasProfile: true,
    createdAt: "2024-08-10T09:30:00.000Z",
    updatedAt: "2026-06-03T12:00:00.000Z",
  },
  {
    id: "user-010",
    email: "frank.expert@example.com",
    fullName: "Frank Mueller",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Data engineer building robust ETL pipelines and data warehouses for AI/ML workloads.",
    phone: "+1-555-0206",
    status: "active",
    wallet: { balance: 16700, pendingBalance: 0, totalEarned: 89000 },
    expertProfile: {
      jobTitle: "Data Engineering Lead",
      category: "Mobile Phones & Computing",
      specialization: "Database Administration",
      skills: ["PostgreSQL", "MongoDB", "MySQL", "Database Schema Design"],
      location: "Chicago, IL",
      website: "https://frankmueller.db",
      industry: "Data Analytics",
      phone: "+1-555-0206",
      bio: "Designing scalable data architectures for ML platforms. Expert in Spark, Airflow, dbt, and cloud data warehouses.",
      hourlyRate: 80,
      completedProjects: 15,
      education: "M.S. Data Science, Northwestern University",
      certifications: ["Google Professional Data Engineer", "Databricks Certified Developer"],
    },
    hasProfile: true,
    createdAt: "2024-09-01T10:00:00.000Z",
    updatedAt: "2026-06-07T08:00:00.000Z",
  },
  {
    id: "user-011",
    email: "grace.expert@example.com",
    fullName: "Grace Kim",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Mobile AI developer building on-device ML experiences with CoreML, TensorFlow Lite, and React Native.",
    phone: "+1-555-0207",
    status: "active",
    wallet: { balance: 19800, pendingBalance: 7000, totalEarned: 105000 },
    expertProfile: {
      jobTitle: "Mobile AI Developer",
      category: "Mobile Phones & Computing",
      specialization: "Mobile App Development",
      skills: ["Swift (iOS)", "Kotlin (Android)", "React Native", "Flutter"],
      location: "Los Angeles, CA",
      website: "https://gracekim.mobile",
      industry: "Mobile Apps",
      phone: "+1-555-0207",
      bio: "Creating AI-powered mobile experiences. Expert in on-device inference, model optimization, and cross-platform development.",
      hourlyRate: 70,
      completedProjects: 17,
      education: "B.S. Computer Science, UCLA",
      certifications: ["Google Associate Android Developer", "React Native Certification"],
    },
    hasProfile: true,
    createdAt: "2024-09-15T14:00:00.000Z",
    updatedAt: "2026-06-14T11:00:00.000Z",
  },
  {
    id: "user-012",
    email: "henry.expert@example.com",
    fullName: "Henry Davis",
    role: "expert",
    password: "expert123",
    avatar: null,
    bio: "Generative AI specialist building custom LLM applications, RAG systems, and AI agents for enterprise clients.",
    phone: "+1-555-0208",
    status: "active",
    wallet: { balance: 41000, pendingBalance: 12000, totalEarned: 210000 },
    expertProfile: {
      jobTitle: "Generative AI Architect",
      category: "Artificial Intelligence",
      specialization: "Generative AI",
      skills: ["OpenAI API Integration", "Prompt Engineering", "RAG Systems", "LangChain Framework"],
      location: "Boston, MA",
      website: "https://henrydavis.genai",
      industry: "Consulting",
      phone: "+1-555-0208",
      bio: "Building production-grade generative AI systems. Expert in LLM fine-tuning, RAG pipelines, and multi-agent architectures.",
      hourlyRate: 120,
      completedProjects: 28,
      education: "Ph.D. Artificial Intelligence, Carnegie Mellon University",
      certifications: ["Stanford AI Professional Certificate", "LangChain Certified Developer"],
    },
    hasProfile: true,
    createdAt: "2024-10-01T07:00:00.000Z",
    updatedAt: "2026-06-15T13:00:00.000Z",
  },
  // ── Clients ──
  {
    id: "user-013",
    email: "john.client@example.com",
    fullName: "John Smith",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "CTO at HealthTech Innovations. Looking for AI talent to build next-gen healthcare solutions.",
    phone: "+1-555-0301",
    status: "active",
    wallet: { balance: 25000, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-11-01T08:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "user-014",
    email: "kate.client@example.com",
    fullName: "Kate Wilson",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "VP of Engineering at FinTech Corp. Building AI-driven risk assessment and fraud detection systems.",
    phone: "+1-555-0302",
    status: "active",
    wallet: { balance: 45000, pendingBalance: 8000, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2024-11-15T10:00:00.000Z",
    updatedAt: "2026-06-05T14:00:00.000Z",
  },
  {
    id: "user-015",
    email: "liam.client@example.com",
    fullName: "Liam O'Brien",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "Founder of ShopSmart E-commerce. Need AI solutions for personalization and inventory optimization.",
    phone: "+1-555-0303",
    status: "active",
    wallet: { balance: 18000, pendingBalance: 3500, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2026-06-08T11:00:00.000Z",
  },
  {
    id: "user-016",
    email: "mia.client@example.com",
    fullName: "Mia Garcia",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "Director at EduLearn Platform. Developing AI-powered adaptive learning and automated grading systems.",
    phone: "+1-555-0304",
    status: "active",
    wallet: { balance: 32000, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-02-01T08:30:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
  },
  {
    id: "user-017",
    email: "noah.client@example.com",
    fullName: "Noah Taylor",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "Game Studio Lead at PixelForge Games. Building AI-powered NPC behavior and procedural content generation.",
    phone: "+1-555-0305",
    status: "active",
    wallet: { balance: 28000, pendingBalance: 6000, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-03-15T11:00:00.000Z",
    updatedAt: "2026-05-20T15:00:00.000Z",
  },
  {
    id: "user-018",
    email: "olivia.client@example.com",
    fullName: "Olivia Martinez",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "CEO at PropTech Solutions. Using AI for property valuation, market analysis, and virtual tours.",
    phone: "+1-555-0306",
    status: "active",
    wallet: { balance: 38000, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-04-01T07:00:00.000Z",
    updatedAt: "2026-06-12T13:00:00.000Z",
  },
  {
    id: "user-019",
    email: "paul.client@example.com",
    fullName: "Paul Anderson",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "Managing Partner at LegalTech Associates. Building AI contract analysis and legal document automation.",
    phone: "+1-555-0307",
    status: "active",
    wallet: { balance: 55000, pendingBalance: 12000, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-05-10T10:00:00.000Z",
    updatedAt: "2026-06-14T09:00:00.000Z",
  },
  {
    id: "user-020",
    email: "quinn.client@example.com",
    fullName: "Quinn Thomas",
    role: "client",
    password: "client123",
    avatar: null,
    bio: "CMO at BrandPulse Agency. Leveraging AI for marketing analytics, content generation, and campaign optimization.",
    phone: "+1-555-0308",
    status: "active",
    wallet: { balance: 22000, pendingBalance: 0, totalEarned: 0 },
    expertProfile: null,
    hasProfile: true,
    createdAt: "2025-06-01T09:00:00.000Z",
    updatedAt: "2026-06-08T16:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// 2. CATEGORIES — 10 categories + 12 skills = 22 total
// ---------------------------------------------------------------------------

const _baseCategories = [
  // Categories (type: "category")
  { id: "cat-001", name: "Machine Learning", type: "category", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "cat-002", name: "Web Development", type: "category", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "cat-003", name: "Natural Language Processing", type: "category", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "cat-004", name: "Computer Vision", type: "category", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "cat-005", name: "DevOps & MLOps", type: "category", createdAt: "2024-02-01T09:00:00.000Z" },
  { id: "cat-006", name: "Data Engineering", type: "category", createdAt: "2024-02-01T09:00:00.000Z" },
  { id: "cat-007", name: "Mobile Development", type: "category", createdAt: "2024-03-01T10:00:00.000Z" },
  { id: "cat-008", name: "AI Consulting", type: "category", createdAt: "2024-03-15T11:00:00.000Z" },
  { id: "cat-009", name: "Cloud Architecture", type: "category", createdAt: "2024-04-01T08:00:00.000Z" },
  { id: "cat-010", name: "Generative AI", type: "category", createdAt: "2024-05-01T07:00:00.000Z" },
  // Skills (type: "skill")
  { id: "skill-001", name: "Python", type: "skill", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "skill-002", name: "PyTorch", type: "skill", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "skill-003", name: "TensorFlow", type: "skill", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "skill-004", name: "React", type: "skill", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "skill-005", name: "Node.js", type: "skill", createdAt: "2024-01-15T08:00:00.000Z" },
  { id: "skill-006", name: "Kubernetes", type: "skill", createdAt: "2024-02-01T09:00:00.000Z" },
  { id: "skill-007", name: "Docker", type: "skill", createdAt: "2024-02-01T09:00:00.000Z" },
  { id: "skill-008", name: "AWS", type: "skill", createdAt: "2024-02-01T09:00:00.000Z" },
  { id: "skill-009", name: "SQL", type: "skill", createdAt: "2024-03-01T10:00:00.000Z" },
  { id: "skill-010", name: "RAG", type: "skill", createdAt: "2024-05-01T07:00:00.000Z" },
  { id: "skill-011", name: "Fine-tuning", type: "skill", createdAt: "2024-05-01T07:00:00.000Z" },
  { id: "skill-012", name: "LangChain", type: "skill", createdAt: "2024-05-01T07:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// 3. JOB POSTS — 15 records across 6 clients
// ---------------------------------------------------------------------------

const _baseJobPosts = [
  {
    id: "job-001",
    title: "Fine-tune a customer support chatbot with company knowledge base",
    description: "We need an NLP expert to fine-tune an LLM-based chatbot using our internal knowledge base of 50,000+ support tickets. The bot should handle tier-1 queries with 90%+ accuracy and escalate complex issues to human agents. Must implement RAG for real-time knowledge retrieval.",
    budget: 8500,
    deadline: 30,
    durationValue: 4,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-003",
    clientId: "user-013",
    skillIds: ["skill-001", "skill-002", "skill-010", "skill-011"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning"],
    useCases: [
      { id: "uc-001-1", title: "Knowledge Base Ingestion & RAG Setup", description: "Ingest 50K support tickets, build document chunking strategy, create vector embeddings, and set up RAG retrieval pipeline with hybrid search (vector + keyword).", originalDurationDays: 10, createdBy: "client", createdAt: "2026-05-01T09:00:00.000Z", tasks: [
        { id: "task-001-1", useCaseId: "uc-001-1", title: "Data Ingestion Pipeline", description: "Build pipeline to ingest and clean 50K support tickets", source: "client", locked: true },
        { id: "task-001-2", useCaseId: "uc-001-1", title: "Vector Embedding & Indexing", description: "Create embeddings and set up vector search index", source: "client", locked: true },
        { id: "task-001-3", useCaseId: "uc-001-1", title: "Hybrid Search RAG Pipeline", description: "Implement hybrid search combining vector and keyword retrieval", source: "client", locked: true },
      ]},
      { id: "uc-001-2", title: "Model Fine-Tuning & Evaluation", description: "Fine-tune the base LLM on domain-specific support data, implement automated evaluation metrics, and achieve 90%+ accuracy on tier-1 queries.", originalDurationDays: 14, createdBy: "client", createdAt: "2026-05-01T09:00:00.000Z", tasks: [
        { id: "task-001-4", useCaseId: "uc-001-2", title: "Fine-Tuning Pipeline", description: "Set up fine-tuning pipeline with LoRA/QLoRA", source: "client", locked: true },
        { id: "task-001-5", useCaseId: "uc-001-2", title: "Evaluation Framework", description: "Build automated evaluation with BLEU, ROUGE, and custom metrics", source: "client", locked: true },
      ]},
    ],
    originalTotalDurationDays: 30,
    originalBudget: 8500,
    status: "open",
    client: "John Smith",
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "job-002",
    legacy: true,
    title: "Build a medical image classification system for X-ray analysis",
    description: "Develop a deep learning model to classify chest X-rays into 14 pathology categories with high sensitivity. Must include data preprocessing pipeline, model training with DenseNet/ResNet architectures, and a web-based demo for radiologists to test.",
    budget: 15000,
    deadline: 45,
    durationValue: 8,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-004",
    clientId: "user-013",
    skillIds: ["skill-001", "skill-002", "skill-003", "skill-008"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "AWS"],
    status: "open",
    client: "John Smith",
    createdAt: "2026-05-15T10:00:00.000Z",
  },
  {
    id: "job-003",
    legacy: true,
    title: "Develop AI fraud detection system for real-time transactions",
    description: "Build a real-time fraud detection engine that analyzes transaction patterns and flags suspicious activity within 100ms. Must handle 10,000+ transactions/second. Include anomaly detection models, rule engine, and explainable AI dashboard.",
    budget: 22000,
    deadline: 60,
    durationValue: 12,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-014",
    skillIds: ["skill-001", "skill-002", "skill-008", "skill-009"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "AWS", "SQL"],
    status: "open",
    client: "Kate Wilson",
    createdAt: "2026-05-20T08:00:00.000Z",
  },
  {
    id: "job-004",
    legacy: true,
    title: "Create a product recommendation engine for e-commerce platform",
    description: "Design and implement a hybrid recommendation system (collaborative filtering + content-based) for our e-commerce platform with 2M+ products. Should include real-time personalization, A/B testing framework, and performance metrics dashboard.",
    budget: 12000,
    deadline: 35,
    durationValue: 6,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-015",
    skillIds: ["skill-001", "skill-002", "skill-005", "skill-009"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "Node.js", "SQL"],
    status: "open",
    client: "Liam O'Brien",
    createdAt: "2026-05-25T11:00:00.000Z",
  },
  {
    id: "job-005",
    legacy: true,
    title: "Build AI-powered adaptive learning platform with automated grading",
    description: "Develop an adaptive learning system that personalizes curriculum paths based on student performance. Must include NLP-based automated essay grading, knowledge tracing models, and real-time difficulty adjustment. Integrate with existing LMS via API.",
    budget: 18000,
    deadline: 60,
    durationValue: 10,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-003",
    clientId: "user-016",
    skillIds: ["skill-001", "skill-002", "skill-010", "skill-012"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "LangChain"],
    status: "open",
    client: "Mia Garcia",
    createdAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: "job-006",
    legacy: true,
    title: "Develop AI-driven NPC behavior system for open-world game",
    description: "Create a reinforcement learning-based NPC decision system for our upcoming open-world RPG. NPCs should learn from player interactions, exhibit realistic daily routines, and adapt behavior based on game state. Must integrate with Unreal Engine 5.",
    budget: 25000,
    deadline: 90,
    durationValue: 16,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-017",
    skillIds: ["skill-001", "skill-002", "skill-003"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow"],
    status: "open",
    client: "Noah Taylor",
    createdAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: "job-007",
    legacy: true,
    title: "Build ML pipeline for automated property valuation",
    description: "Develop a machine learning pipeline to estimate property values using historical sales data, neighborhood features, and market trends. Must handle 500K+ properties with daily updates. Include feature engineering, model selection, and REST API for integration.",
    budget: 14000,
    deadline: 40,
    durationValue: 8,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-006",
    clientId: "user-018",
    skillIds: ["skill-001", "skill-008", "skill-009", "skill-007"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
    ],
    requiredSkills: ["Python", "AWS", "SQL", "Docker"],
    status: "open",
    client: "Olivia Martinez",
    createdAt: "2026-06-05T09:00:00.000Z",
  },
  {
    id: "job-008",
    legacy: true,
    title: "Create AI contract analysis tool for legal documents",
    description: "Build an NLP tool that analyzes legal contracts to identify key clauses, risks, and anomalies. Must support multiple document formats (PDF, DOCX), provide clause-level classification, and generate risk summaries. Target accuracy: 95%+ on clause identification.",
    budget: 20000,
    deadline: 55,
    durationValue: 10,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-003",
    clientId: "user-019",
    skillIds: ["skill-001", "skill-002", "skill-010", "skill-011", "skill-012"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning", "LangChain"],
    status: "open",
    client: "Paul Anderson",
    createdAt: "2026-06-08T10:00:00.000Z",
  },
  {
    id: "job-009",
    legacy: true,
    title: "Deploy ML model on AWS with auto-scaling and monitoring",
    description: "Take our existing PyTorch model and deploy it to production on AWS with Kubernetes. Must include auto-scaling (based on request volume), model versioning, A/B testing capability, real-time monitoring dashboards, and CI/CD pipeline for model updates.",
    budget: 10000,
    deadline: 30,
    durationValue: 5,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-005",
    clientId: "user-014",
    skillIds: ["skill-001", "skill-006", "skill-007", "skill-008"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-006", skill: { name: "Kubernetes" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
    ],
    requiredSkills: ["Python", "Kubernetes", "Docker", "AWS"],
    status: "closed",
    client: "Kate Wilson",
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "job-010",
    legacy: true,
    title: "Build an AI marketing content generator with brand voice control",
    description: "Create a generative AI tool that produces marketing copy across channels (social media, email, blog) while maintaining consistent brand voice. Must support tone adjustment, A/B variant generation, and performance prediction. Integrate with our CMS and social media scheduler.",
    budget: 9500,
    deadline: 35,
    durationValue: 6,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-010",
    clientId: "user-020",
    skillIds: ["skill-001", "skill-002", "skill-010", "skill-011"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning"],
    status: "open",
    client: "Quinn Thomas",
    createdAt: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "job-011",
    legacy: true,
    title: "Develop a computer vision system for retail inventory tracking",
    description: "Build a CV system using shelf-mounted cameras to track inventory levels in real-time. Must detect out-of-stock items, misplaced products, and pricing label errors. Include dashboard for store managers and alert system for low stock.",
    budget: 13500,
    deadline: 50,
    durationValue: 8,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-004",
    clientId: "user-015",
    skillIds: ["skill-001", "skill-002", "skill-003", "skill-004"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
      { skillsId: "skill-004", skill: { name: "React" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "React"],
    status: "closed",
    client: "Liam O'Brien",
    createdAt: "2026-04-01T09:00:00.000Z",
  },
  {
    id: "job-012",
    legacy: true,
    title: "Create an AI tutor chatbot for programming education",
    description: "Build an interactive AI tutor that helps students learn Python programming. Must provide code review, explain concepts at varying difficulty levels, generate practice exercises, and track student progress. Should use RAG with our curriculum content.",
    budget: 7500,
    deadline: 30,
    durationValue: 5,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-010",
    clientId: "user-016",
    skillIds: ["skill-001", "skill-010", "skill-012", "skill-005"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
    ],
    requiredSkills: ["Python", "RAG", "LangChain", "Node.js"],
    status: "closed",
    client: "Mia Garcia",
    createdAt: "2026-02-15T11:00:00.000Z",
  },
  {
    id: "job-013",
    legacy: true,
    title: "Set up cloud ML infrastructure with cost optimization",
    description: "Design and implement cost-optimized cloud ML infrastructure on AWS. Must include spot instance strategy for training, model registry, feature store, and automated resource scaling. Target: reduce current ML infrastructure costs by 40%.",
    budget: 11500,
    deadline: 25,
    durationValue: 4,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-009",
    clientId: "user-014",
    skillIds: ["skill-006", "skill-007", "skill-008", "skill-001"],
    jobPostSkills: [
      { skillsId: "skill-006", skill: { name: "Kubernetes" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-001", skill: { name: "Python" } },
    ],
    requiredSkills: ["Kubernetes", "Docker", "AWS", "Python"],
    status: "closed",
    client: "Kate Wilson",
    createdAt: "2026-03-20T08:00:00.000Z",
  },
  {
    id: "job-014",
    legacy: true,
    title: "Build a virtual staging AI for real estate photos",
    description: "Develop a generative AI system that virtually stages empty rooms with furniture and decor. Must support multiple interior design styles and produce photorealistic results. Include a simple web interface for real estate agents to upload and process photos.",
    budget: 16000,
    deadline: 45,
    durationValue: 8,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-010",
    clientId: "user-018",
    skillIds: ["skill-001", "skill-002", "skill-004", "skill-005"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-004", skill: { name: "React" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
    ],
    requiredSkills: ["Python", "PyTorch", "React", "Node.js"],
    status: "open",
    client: "Olivia Martinez",
    createdAt: "2026-05-28T13:00:00.000Z",
  },
  {
    id: "job-015",
    legacy: true,
    title: "Implement sentiment analysis pipeline for social media monitoring",
    description: "Build a real-time sentiment analysis pipeline that monitors brand mentions across Twitter, Reddit, and Instagram. Must classify sentiment (positive/negative/neutral), detect emerging trends, identify crisis situations, and generate daily brand health reports.",
    budget: 8500,
    deadline: 28,
    durationValue: 5,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-003",
    clientId: "user-020",
    skillIds: ["skill-001", "skill-002", "skill-005", "skill-009"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "Node.js", "SQL"],
    status: "open",
    client: "Quinn Thomas",
    createdAt: "2026-06-12T09:00:00.000Z",
  },
  {
    id: "job-016",
    title: "Procedural content generation for open world game using ML",
    description: "Build a machine learning-based procedural content generation system for our open world game. Must generate diverse terrain types (mountains, forests, deserts, oceans), place vegetation and structures logically, and create coherent biome transitions. Include a Unreal Engine 5 plugin for real-time generation and artist-friendly tuning parameters.",
    budget: 18000,
    deadline: 60,
    durationValue: 10,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-017",
    skillIds: ["skill-001", "skill-002", "skill-003"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow"],
    status: "closed",
    client: "Noah Taylor",
    createdAt: "2026-05-15T09:00:00.000Z",
  },
  // ── Additional jobs for richer demo coverage ──
  {
    id: "job-017",
    title: "AI Healthcare Pipeline Demo",
    description: "Build an intelligent appointment scheduling system that optimizes doctor schedules using ML, predicts no-shows based on patient history patterns, and sends automated reminders. Must integrate with existing EMR system via HL7/FHIR APIs. Include a patient-facing web portal for self-scheduling and a clinic admin dashboard.",
    budget: 12000,
    deadline: 45,
    durationValue: 6,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-013",
    skillIds: ["skill-001", "skill-002", "skill-005", "skill-009"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "Node.js", "SQL"],
    useCases: [
      { id: "uc-017-1", title: "Patient Scheduling Optimization Engine", description: "Build ML-based scheduling engine that optimizes doctor time slots, predicts no-shows, and reduces patient wait times.", originalDurationDays: 20, createdBy: "client", createdAt: "2026-06-10T08:00:00.000Z", tasks: [
        { id: "task-017-1", useCaseId: "uc-017-1", title: "No-Show Prediction Model", description: "Train ML model to predict patient no-show probability based on historical patterns", source: "client", locked: true },
        { id: "task-017-2", useCaseId: "uc-017-1", title: "Schedule Optimization Algorithm", description: "Implement constraint-based scheduling optimizer with provider preferences", source: "client", locked: true },
      ]},
      { id: "uc-017-2", title: "EMR Integration & HL7/FHIR API", description: "Integrate with existing hospital EMR system via HL7/FHIR standards for real-time patient data exchange.", originalDurationDays: 15, createdBy: "client", createdAt: "2026-06-10T08:00:00.000Z", tasks: [
        { id: "task-017-3", useCaseId: "uc-017-2", title: "HL7/FHIR Data Pipeline", description: "Build ETL pipeline for HL7/FHIR patient data ingestion and transformation", source: "client", locked: true },
      ]},
      { id: "uc-017-3", title: "Patient Portal & Admin Dashboard", description: "Build patient-facing self-scheduling portal and clinic admin dashboard with analytics.", originalDurationDays: 10, createdBy: "client", createdAt: "2026-06-10T08:00:00.000Z", tasks: [
        { id: "task-017-4", useCaseId: "uc-017-3", title: "Patient Self-Scheduling Portal", description: "React-based web portal for patients to book, reschedule, and cancel appointments", source: "client", locked: true },
        { id: "task-017-5", useCaseId: "uc-017-3", title: "Clinic Admin Analytics Dashboard", description: "Interactive dashboard with schedule analytics, no-show trends, and provider utilization metrics", source: "client", locked: true },
      ]},
    ],
    originalTotalDurationDays: 45,
    originalBudget: 12000,
    status: "open",
    client: "John Smith",
    createdAt: "2026-06-10T08:00:00.000Z",
  },
  {
    id: "job-018",
    title: "Build real-time risk assessment dashboard for financial transactions",
    description: "Create an interactive dashboard that visualizes risk scores in real-time across transaction streams. Must support drill-down into individual transactions, risk trend analysis over time windows, and customizable alert thresholds. Integrate with existing fraud detection API and support role-based access control.",
    budget: 9500,
    deadline: 30,
    durationValue: 5,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-001",
    clientId: "user-014",
    skillIds: ["skill-004", "skill-005", "skill-008", "skill-009"],
    jobPostSkills: [
      { skillsId: "skill-004", skill: { name: "React" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["React", "Node.js", "AWS", "SQL"],
    status: "hired",
    client: "Kate Wilson",
    createdAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "job-019",
    title: "Fallback Task Demo — PHI De-identification Pipeline",
    description: "Build an NLP pipeline that automatically identifies and redacts Protected Health Information (PHI) from unstructured clinical notes and medical records. Must handle PDF, DOCX, and HL7 message formats, support 12+ PHI categories, and achieve 98%+ recall. Full HIPAA compliance documentation required.",
    budget: 15000,
    deadline: 55,
    durationValue: 8,
    durationUnit: "weeks",
    aiCategoryDomainId: "cat-003",
    clientId: "user-013",
    skillIds: ["skill-001", "skill-002", "skill-010", "skill-011"],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning"],
    useCases: [
      { id: "uc-019-1", title: "Clinical Document Parsing & PHI Detection", description: "Parse multiple document formats (PDF, DOCX, HL7) and detect 12+ PHI categories with 98%+ recall.", originalDurationDays: 25, createdBy: "client", createdAt: "2026-06-18T11:00:00.000Z", tasks: [] },
      { id: "uc-019-2", title: "HIPAA-Compliant Redaction & Audit Trail", description: "Implement redaction engine with full audit trail for compliance reporting.", originalDurationDays: 15, createdBy: "client", createdAt: "2026-06-18T11:00:00.000Z", tasks: [] },
      { id: "uc-019-3", title: "Review Interface & Deployment", description: "Build human-in-the-loop review interface for low-confidence detections and deploy to hospital infrastructure.", originalDurationDays: 15, createdBy: "client", createdAt: "2026-06-18T11:00:00.000Z", tasks: [] },
    ],
    originalTotalDurationDays: 55,
    originalBudget: 15000,
    status: "open",
    client: "John Smith",
    createdAt: "2026-06-18T11:00:00.000Z",
  },
  // ── New modern JobPosts for full account coverage ──
  { id: "job-020", title: "AI-Powered Inventory Demand Forecasting System", description: "Build ML-based demand forecasting for 50K+ SKUs across 200 retail locations. Must handle seasonality, promotions, and supply chain disruptions.", budget: 11000, deadline: 40, durationValue: 6, durationUnit: "weeks", aiCategoryDomainId: "cat-001", clientId: "user-015", skillIds: ["skill-001", "skill-002", "skill-009"], jobPostSkills: [{ skillsId: "skill-001", skill: { name: "Python" } }, { skillsId: "skill-002", skill: { name: "PyTorch" } }, { skillsId: "skill-009", skill: { name: "SQL" } }], requiredSkills: ["Python", "PyTorch", "SQL"], useCases: [{ id: "uc-020-1", title: "Demand Data Pipeline & Feature Engineering", description: "Ingest 3 years of historical sales, promotions, weather, and holiday data. Build feature store with 100+ engineered features.", originalDurationDays: 14, createdBy: "client", createdAt: "2026-06-20T09:00:00.000Z", tasks: [{ id: "task-020-1", useCaseId: "uc-020-1", title: "Data Pipeline & ETL", description: "Build ETL pipeline for sales, inventory, and external data sources", source: "client", locked: true }, { id: "task-020-2", useCaseId: "uc-020-1", title: "Feature Engineering", description: "Create 100+ time-series features for demand prediction", source: "client", locked: true }] }, { id: "uc-020-2", title: "Forecasting Model & Optimization", description: "Train ensemble of time-series models (XGBoost, Prophet, LSTM) with hyperparameter tuning. Achieve <15% MAPE.", originalDurationDays: 16, createdBy: "client", createdAt: "2026-06-20T09:00:00.000Z", tasks: [{ id: "task-020-3", useCaseId: "uc-020-2", title: "Model Training Pipeline", description: "Train and evaluate ensemble of forecasting models", source: "client", locked: true }, { id: "task-020-4", useCaseId: "uc-020-2", title: "Hyperparameter Optimization", description: "Run Bayesian optimization for model hyperparameters", source: "client", locked: true }] }, { id: "uc-020-3", title: "Dashboard & Alert System", description: "Build real-time inventory dashboard with forecast visualizations and automated reorder recommendations.", originalDurationDays: 10, createdBy: "client", createdAt: "2026-06-20T09:00:00.000Z", tasks: [{ id: "task-020-5", useCaseId: "uc-020-3", title: "Inventory Analytics Dashboard", description: "React dashboard with forecast charts and reorder alerts", source: "client", locked: true }] }], originalTotalDurationDays: 40, originalBudget: 11000, status: "open", client: "Liam O'Brien", createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "job-021", title: "AI Adaptive Learning Path Generator (Fallback Test)", description: "Build an AI system that generates personalized learning paths based on student diagnostic assessments. Note: Use cases defined but no client tasks — tests fallback task creation.", budget: 13500, deadline: 50, durationValue: 8, durationUnit: "weeks", aiCategoryDomainId: "cat-001", clientId: "user-016", skillIds: ["skill-001", "skill-002", "skill-010"], jobPostSkills: [{ skillsId: "skill-001", skill: { name: "Python" } }, { skillsId: "skill-002", skill: { name: "PyTorch" } }, { skillsId: "skill-010", skill: { name: "RAG" } }], requiredSkills: ["Python", "PyTorch", "RAG"], useCases: [{ id: "uc-021-1", title: "Student Diagnostic Assessment Engine", description: "Build assessment engine evaluating student knowledge across 8 subject areas.", originalDurationDays: 18, createdBy: "client", createdAt: "2026-06-22T10:00:00.000Z", tasks: [] }, { id: "uc-021-2", title: "Adaptive Path Generation & Recommendation", description: "Generate personalized learning paths with content recommendations based on diagnostic results.", originalDurationDays: 20, createdBy: "client", createdAt: "2026-06-22T10:00:00.000Z", tasks: [] }, { id: "uc-021-3", title: "Teacher Analytics Dashboard", description: "Build dashboard showing class-wide learning progress and intervention recommendations.", originalDurationDays: 12, createdBy: "client", createdAt: "2026-06-22T10:00:00.000Z", tasks: [] }], originalTotalDurationDays: 50, originalBudget: 13500, status: "open", client: "Mia Garcia", createdAt: "2026-06-22T10:00:00.000Z" },
  { id: "job-022", title: "Legal Contract Clause Analysis & Risk Scoring", description: "Build NLP pipeline analyzing legal contracts, extracting key clauses (indemnification, liability, termination, IP), and assigning risk scores. Must handle 20+ contract types.", budget: 16000, deadline: 60, durationValue: 9, durationUnit: "weeks", aiCategoryDomainId: "cat-003", clientId: "user-019", skillIds: ["skill-001", "skill-002", "skill-010", "skill-011"], jobPostSkills: [{ skillsId: "skill-001", skill: { name: "Python" } }, { skillsId: "skill-002", skill: { name: "PyTorch" } }, { skillsId: "skill-010", skill: { name: "RAG" } }, { skillsId: "skill-011", skill: { name: "Fine-tuning" } }], requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning"], useCases: [{ id: "uc-022-1", title: "Contract Parsing & Clause Extraction", description: "Parse PDF/DOCX contracts, extract 15+ clause types with NER. Achieve >95% accuracy.", originalDurationDays: 22, createdBy: "client", createdAt: "2026-06-25T08:00:00.000Z", tasks: [{ id: "task-022-1", useCaseId: "uc-022-1", title: "Document Parser Multi-Format", description: "Build parser supporting PDF, DOCX, and scanned documents via OCR", source: "client", locked: true }, { id: "task-022-2", useCaseId: "uc-022-1", title: "Clause Extraction NER Model", description: "Fine-tune legal NER model for 15+ clause categories", source: "client", locked: true }] }, { id: "uc-022-2", title: "Risk Scoring Engine & Recommendations", description: "Develop risk scoring model based on 10K+ annotated contracts.", originalDurationDays: 20, createdBy: "client", createdAt: "2026-06-25T08:00:00.000Z", tasks: [{ id: "task-022-3", useCaseId: "uc-022-2", title: "Risk Scoring ML Model", description: "Train risk classification model on annotated contract dataset", source: "client", locked: true }, { id: "task-022-4", useCaseId: "uc-022-2", title: "Recommendation Generator", description: "Build template-based recommendation engine with risk summaries", source: "client", locked: true }] }, { id: "uc-022-3", title: "Lawyer Review Interface", description: "Build web interface for lawyers to review AI-extracted clauses and risk assessments.", originalDurationDays: 18, createdBy: "client", createdAt: "2026-06-25T08:00:00.000Z", tasks: [{ id: "task-022-5", useCaseId: "uc-022-3", title: "Review Interface UI", description: "React interface with clause highlighting, risk badges, and approval workflow", source: "client", locked: true }] }], originalTotalDurationDays: 60, originalBudget: 16000, status: "open", client: "Paul Anderson", createdAt: "2026-06-25T08:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// 4. PROPOSALS — 25 records
//    Experts propose on jobs that match their skills
// ---------------------------------------------------------------------------

const _baseProposals = [
  // ── Proposals for job-001 (Chatbot) — Alice, Carol, Henry apply ──
  { id: "proposal-001", jobPostId: "job-001", expertId: "user-005", coverLetter: "I've fine-tuned 10+ customer support chatbots using RAG architectures. My approach combines domain-adaptive pretraining with curated prompt engineering. I can deliver a prototype within 2 weeks.", bidAmount: 8000, estimatedDays: 28, status: "pending", createdAt: "2026-05-03T10:00:00.000Z" },
  { id: "proposal-002", jobPostId: "job-001", expertId: "user-007", coverLetter: "As an NLP research scientist, I specialize in exactly this type of project. I've built RAG systems handling 100K+ documents. My solution will include automated evaluation metrics and human-in-the-loop feedback collection.", bidAmount: 8500, estimatedDays: 30, status: "pending", createdAt: "2026-05-04T14:00:00.000Z" },
  { id: "proposal-003", jobPostId: "job-001", expertId: "user-012", coverLetter: "I've architected enterprise RAG systems for Fortune 500 companies. My proposal includes: (1) document chunking strategy, (2) hybrid search (vector + keyword), (3) guardrails for safe responses, and (4) analytics dashboard for bot performance.", bidAmount: 9000, estimatedDays: 25, status: "under_review", createdAt: "2026-05-05T09:00:00.000Z" },

  // ── Proposals for job-002 (Medical imaging) — David, Alice, Henry apply ──
  { id: "proposal-004", jobPostId: "job-002", expertId: "user-008", coverLetter: "I have direct experience building medical imaging systems — I developed a pneumonia detection model that achieved 94% sensitivity in clinical trials. I understand HIPAA compliance and medical AI validation requirements.", bidAmount: 14000, estimatedDays: 42, status: "pending", createdAt: "2026-05-17T11:00:00.000Z" },
  { id: "proposal-005", jobPostId: "job-002", expertId: "user-005", coverLetter: "While my primary focus is NLP, I have strong PyTorch skills applicable to vision tasks. I'd partner with a radiologist advisor to ensure clinical validity. Budget-friendly option with high-quality engineering.", bidAmount: 12000, estimatedDays: 45, status: "accepted", createdAt: "2026-05-18T08:00:00.000Z" },
  { id: "proposal-006", jobPostId: "job-002", expertId: "user-012", coverLetter: "I can bring my generative AI expertise to medical imaging — my proposed architecture uses vision transformers with attention maps for model interpretability, which radiologists will appreciate. Full MLOps pipeline included.", bidAmount: 15500, estimatedDays: 40, status: "pending", createdAt: "2026-05-19T15:00:00.000Z" },

  // ── Proposals for job-003 (Fraud detection) — Alice, Bob, Frank apply ──
  { id: "proposal-007", jobPostId: "job-003", expertId: "user-005", coverLetter: "I've built real-time ML systems processing 50K+ events/second. My approach uses gradient-boosted trees for initial filtering and a deep learning model for complex pattern detection, all within your latency budget.", bidAmount: 21000, estimatedDays: 55, status: "rejected", createdAt: "2026-05-22T09:00:00.000Z" },
  { id: "proposal-008", jobPostId: "job-003", expertId: "user-006", coverLetter: "Full-stack approach: I'll build both the ML models and the real-time serving infrastructure. My solution includes an explainable AI dashboard so your fraud analysts can understand every flagged transaction.", bidAmount: 20000, estimatedDays: 60, status: "pending", createdAt: "2026-05-23T11:00:00.000Z" },
  { id: "proposal-009", jobPostId: "job-003", expertId: "user-010", coverLetter: "Data engineering is the foundation of fraud detection. I'll design the feature store, real-time data pipeline, and model monitoring infrastructure. Partner with me for a production-grade system that won't fail under load.", bidAmount: 22000, estimatedDays: 60, status: "pending", createdAt: "2026-05-24T14:00:00.000Z" },

  // ── Proposals for job-004 (Recommendation engine) — Alice, Bob, Grace apply ──
  { id: "proposal-010", jobPostId: "job-004", expertId: "user-005", coverLetter: "I designed the recommendation system for a major streaming platform serving 10M+ users. My hybrid approach combines matrix factorization, two-tower neural models, and real-time feature serving via a feature store.", bidAmount: 11500, estimatedDays: 32, status: "pending", createdAt: "2026-05-27T10:00:00.000Z" },
  { id: "proposal-011", jobPostId: "job-004", expertId: "user-006", coverLetter: "I'll build both the ML models and the Node.js API integration your platform needs. My solution includes an A/B testing framework so you can measure the revenue impact of recommendations.", bidAmount: 12000, estimatedDays: 35, status: "pending", createdAt: "2026-05-28T08:00:00.000Z" },
  { id: "proposal-012", jobPostId: "job-004", expertId: "user-011", coverLetter: "Mobile-first recommendation: I'll optimize the models for low-latency inference on mobile devices as well as server-side. Cross-platform experience means your app users get the same great experience.", bidAmount: 10000, estimatedDays: 30, status: "pending", createdAt: "2026-05-29T13:00:00.000Z" },

  // ── Proposals for job-005 (Adaptive learning) — Carol, Henry, Alice apply ──
  { id: "proposal-013", jobPostId: "job-005", expertId: "user-007", coverLetter: "I built an automated essay scoring system that achieved 0.85 correlation with human graders. I understand both the NLP and pedagogical aspects of this project. My approach includes Bayesian Knowledge Tracing for student modeling.", bidAmount: 17500, estimatedDays: 55, status: "pending", createdAt: "2026-06-03T09:00:00.000Z" },
  { id: "proposal-014", jobPostId: "job-005", expertId: "user-012", coverLetter: "Gen AI meets education: I'll use LLMs for essay grading with rubric-based evaluation chains. My proposal includes a teacher review interface, fine-grained feedback generation, and curriculum gap analysis.", bidAmount: 18000, estimatedDays: 50, status: "pending", createdAt: "2026-06-04T11:00:00.000Z" },
  { id: "proposal-015", jobPostId: "job-005", expertId: "user-005", coverLetter: "I've built NLP grading systems for a university. My solution includes multi-task learning for simultaneous scoring and feedback generation. Deliverable includes a comprehensive evaluation report comparing model vs. human scores.", bidAmount: 16500, estimatedDays: 60, status: "pending", createdAt: "2026-06-05T14:00:00.000Z" },

  // ── Proposals for job-009 (AWS Deploy) — Emma, Bob, Frank apply — CLOSED job ──
  { id: "proposal-016", jobPostId: "job-009", expertId: "user-009", coverLetter: "This is my core expertise. I've deployed 50+ ML models to production on AWS with Kubernetes. I'll set up KFServing, Istio for traffic splitting, Prometheus/Grafana for monitoring, and a GitOps CI/CD pipeline with ArgoCD.", bidAmount: 9500, estimatedDays: 28, status: "accepted", createdAt: "2026-03-12T10:00:00.000Z" },
  { id: "proposal-017", jobPostId: "job-009", expertId: "user-006", coverLetter: "Full-stack deployment: I'll handle both the AWS infrastructure and the Node.js API layer for model serving. My solution includes canary deployments for safe model updates.", bidAmount: 10000, estimatedDays: 30, status: "declined", createdAt: "2026-03-13T09:00:00.000Z" },

  // ── Proposals for job-011 (Retail CV) — David, Grace, Bob apply — CLOSED job ──
  { id: "proposal-018", jobPostId: "job-011", expertId: "user-008", coverLetter: "I built a similar shelf-monitoring system for a major retailer with 200+ stores. My solution uses YOLOv8 for product detection and a custom classifier for SKU recognition. I'll reuse proven architectures to deliver faster.", bidAmount: 13000, estimatedDays: 45, status: "accepted", createdAt: "2026-04-03T11:00:00.000Z" },
  { id: "proposal-019", jobPostId: "job-011", expertId: "user-011", coverLetter: "Mobile integration specialist: I'll build both the CV models and the React Native store associate app with barcode scanning fallback. End-to-end solution from camera to dashboard.", bidAmount: 13500, estimatedDays: 50, status: "declined", createdAt: "2026-04-04T08:00:00.000Z" },

  // ── Proposals for job-012 (AI Tutor) — Carol, Henry, Alice apply — CLOSED job ──
  { id: "proposal-020", jobPostId: "job-012", expertId: "user-007", coverLetter: "I've published research on AI tutoring systems. My approach uses Socratic questioning patterns generated by LLMs, combined with knowledge tracing to adapt difficulty. I can integrate with your existing curriculum content seamlessly.", bidAmount: 7500, estimatedDays: 28, status: "accepted", createdAt: "2026-02-17T10:00:00.000Z" },
  { id: "proposal-021", jobPostId: "job-012", expertId: "user-012", coverLetter: "I'll build a state-of-the-art AI tutor using chain-of-thought prompting for step-by-step code explanations. Includes interactive coding exercises with real-time feedback and a student progress analytics dashboard.", bidAmount: 8000, estimatedDays: 25, status: "declined", createdAt: "2026-02-18T14:00:00.000Z" },
  { id: "proposal-022", jobPostId: "job-012", expertId: "user-005", coverLetter: "Combining my NLP expertise with educational technology experience. I'll use a RAG architecture with your curriculum as the knowledge base, ensuring accurate, curriculum-aligned responses every time.", bidAmount: 7000, estimatedDays: 30, status: "withdrawn", createdAt: "2026-02-19T09:00:00.000Z" },

  // ── Proposals for job-013 (Cloud ML Infra) — Emma, Frank, Bob apply — CLOSED job ──
  { id: "proposal-023", jobPostId: "job-013", expertId: "user-009", coverLetter: "I'll design your ML infrastructure using Karpenter for intelligent spot instance management, MLflow for experiment tracking, and Feast for feature serving. Estimated cost savings: 45-50% based on similar projects I've done.", bidAmount: 11000, estimatedDays: 24, status: "accepted", createdAt: "2026-03-22T10:00:00.000Z" },
  { id: "proposal-024", jobPostId: "job-013", expertId: "user-010", coverLetter: "Data engineering meets cloud optimization. I'll set up your feature store, data lake, and ETL pipelines alongside the ML infrastructure. Data and models in one coherent architecture.", bidAmount: 11500, estimatedDays: 25, status: "declined", createdAt: "2026-03-23T08:00:00.000Z" },

  // ── Proposals for job-006 (Game AI) — David, Grace, Henry apply ──
  { id: "proposal-025", jobPostId: "job-006", expertId: "user-008", coverLetter: "While CV is my specialty, the RL techniques for NPC behavior are closely related. I'll use multi-agent reinforcement learning with attention mechanisms for social dynamics between NPCs. Experience with UE5 integration via plugin development.", bidAmount: 24000, estimatedDays: 85, status: "pending", createdAt: "2026-05-12T09:00:00.000Z" },
  // ── Proposal for job-016 (PCG for Noah) — David Park accepted ──
  { id: "proposal-026", jobPostId: "job-016", expertId: "user-008", coverLetter: "Procedural generation meets ML! I'll combine WaveFunctionCollapse for terrain with GAN-based detail generation for realistic biomes. My approach includes a UE5 plugin with real-time preview and artist parameter tuning. I have experience shipping PCG systems in 2 commercial titles.", bidAmount: 17500, estimatedDays: 55, status: "accepted", createdAt: "2026-05-17T10:00:00.000Z" },
  // ── Proposals for job-017 (Healthcare Pipeline) — Alice, Henry, Carol apply ──
  { id: "proposal-027", jobPostId: "job-017", expertId: "user-005", bidAmount: 11500, estimatedDays: 42, status: "pending", createdAt: "2026-06-12T09:00:00.000Z", coverLetter: JSON.stringify({
    professionalIntro: "I've built ML optimization systems for hospital operations before — my patient flow prediction model reduced wait times by 35% at a major Bay Area hospital. I'll combine time-series forecasting with constraint-based scheduling optimization. HIPAA-compliant architecture included.",
    durationDays: 42,
    totalBidAmount: 11500,
    tasks: [
      {
        id: "task-017-1", useCaseId: "uc-017-1", useCaseTitle: "Patient Scheduling Optimization Engine",
        title: "No-Show Prediction Model", description: "Train ML model to predict patient no-show probability based on historical patterns",
        source: "client", approvalStatus: "accepted", locked: true, price: 4000, completionDays: 14,
        miniTasks: [
          { id: "mt-prop-027-1", taskId: "task-017-1", title: "Data exploration & feature engineering on 2 years of appointment history", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-2", taskId: "task-017-1", title: "Train XGBoost baseline with cross-validation", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-3", taskId: "task-017-1", title: "Calibrate probability scores for no-show risk tiers", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-4", taskId: "task-017-1", title: "Deploy model with daily retraining pipeline", description: "", status: "pending", isCompleted: false },
        ]
      },
      {
        id: "task-017-2", useCaseId: "uc-017-1", useCaseTitle: "Patient Scheduling Optimization Engine",
        title: "Schedule Optimization Algorithm", description: "Implement constraint-based scheduling optimizer with provider preferences",
        source: "client", approvalStatus: "accepted", locked: true, price: 3000, completionDays: 10,
        miniTasks: [
          { id: "mt-prop-027-5", taskId: "task-017-2", title: "Define optimization constraints (provider hours, room availability, urgency tiers)", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-6", taskId: "task-017-2", title: "Implement OR-Tools constraint solver with no-show risk weighting", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-7", taskId: "task-017-2", title: "Build schedule simulation for what-if analysis", description: "", status: "pending", isCompleted: false },
        ]
      },
      {
        id: "task-017-3", useCaseId: "uc-017-2", useCaseTitle: "EMR Integration & HL7/FHIR API",
        title: "HL7/FHIR Data Pipeline", description: "Build ETL pipeline for HL7/FHIR patient data ingestion and transformation",
        source: "client", approvalStatus: "accepted", locked: true, price: 2000, completionDays: 8,
        miniTasks: [
          { id: "mt-prop-027-8", taskId: "task-017-3", title: "Map HL7/FHIR message types to internal data model", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-9", taskId: "task-017-3", title: "Build ETL pipeline with error handling and retry logic", description: "", status: "pending", isCompleted: false },
        ]
      },
      {
        id: "task-017-4", useCaseId: "uc-017-3", useCaseTitle: "Patient Portal & Admin Dashboard",
        title: "Patient Self-Scheduling Portal", description: "React-based web portal for patients to book, reschedule, and cancel appointments",
        source: "client", approvalStatus: "accepted", locked: true, price: 1500, completionDays: 7,
        miniTasks: [
          { id: "mt-prop-027-10", taskId: "task-017-4", title: "Build appointment booking flow with calendar widget", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-11", taskId: "task-017-4", title: "Add SMS/email confirmation and reminder integration", description: "", status: "pending", isCompleted: false },
        ]
      },
      {
        id: "task-017-5", useCaseId: "uc-017-3", useCaseTitle: "Patient Portal & Admin Dashboard",
        title: "Clinic Admin Analytics Dashboard", description: "Interactive dashboard with schedule analytics, no-show trends, and provider utilization metrics",
        source: "client", approvalStatus: "accepted", locked: true, price: 1000, completionDays: 5,
        miniTasks: [
          { id: "mt-prop-027-12", taskId: "task-017-5", title: "Build no-show trend charts and provider utilization heatmaps", description: "", status: "pending", isCompleted: false },
        ]
      },
      {
        id: "task-prop-017-1", useCaseId: "uc-017-3", useCaseTitle: "Patient Portal & Admin Dashboard",
        title: "Automated Patient Satisfaction Survey System", description: "Post-appointment NPS survey with sentiment analysis on free-text feedback",
        source: "expert", approvalStatus: "pending_client_approval", locked: false, price: 2500, completionDays: 7,
        miniTasks: [
          { id: "mt-prop-027-13", taskId: "task-prop-017-1", title: "Integrate NPS survey widget into patient portal", description: "", status: "pending", isCompleted: false },
          { id: "mt-prop-027-14", taskId: "task-prop-017-1", title: "Build sentiment analysis pipeline for survey feedback", description: "", status: "pending", isCompleted: false },
        ]
      },
    ],
    proposedTasks: [
      {
        id: "task-prop-017-1", title: "Automated Patient Satisfaction Survey System",
        description: "Post-appointment NPS survey with sentiment analysis on free-text feedback",
        source: "expert", approvalStatus: "pending_client_approval",
        miniTasks: [
          { id: "mt-prop-027-13", taskId: "task-prop-017-1", title: "Integrate NPS survey widget into patient portal" },
          { id: "mt-prop-027-14", taskId: "task-prop-017-1", title: "Build sentiment analysis pipeline for survey feedback" },
        ]
      }
    ],
    useCaseBreakdown: [
      { useCaseId: "uc-017-1", useCaseTitle: "Patient Scheduling Optimization Engine", originalDuration: 20, tasks: [
        { id: "task-017-1", title: "No-Show Prediction Model", source: "client", approvalStatus: "accepted", locked: true, price: 4000, completionDays: 14 },
        { id: "task-017-2", title: "Schedule Optimization Algorithm", source: "client", approvalStatus: "accepted", locked: true, price: 3000, completionDays: 10 },
      ]},
      { useCaseId: "uc-017-2", useCaseTitle: "EMR Integration & HL7/FHIR API", originalDuration: 15, tasks: [
        { id: "task-017-3", title: "HL7/FHIR Data Pipeline", source: "client", approvalStatus: "accepted", locked: true, price: 2000, completionDays: 8 },
      ]},
      { useCaseId: "uc-017-3", useCaseTitle: "Patient Portal & Admin Dashboard", originalDuration: 10, tasks: [
        { id: "task-017-4", title: "Patient Self-Scheduling Portal", source: "client", approvalStatus: "accepted", locked: true, price: 1500, completionDays: 7 },
        { id: "task-017-5", title: "Clinic Admin Analytics Dashboard", source: "client", approvalStatus: "accepted", locked: true, price: 1000, completionDays: 5 },
        { id: "task-prop-017-1", title: "Automated Patient Satisfaction Survey System", source: "expert", approvalStatus: "pending_client_approval", locked: false, price: 2500, completionDays: 7 },
      ]},
    ],
    acknowledged: false,
  }) },
  { id: "proposal-028", jobPostId: "job-017", expertId: "user-012", coverLetter: "My generative AI expertise transfers well to scheduling optimization. I'll use a transformer-based architecture to model complex appointment constraints and patient preferences. Includes a patient-facing chatbot for self-scheduling powered by the same model.", bidAmount: 12000, estimatedDays: 40, status: "pending", createdAt: "2026-06-13T14:00:00.000Z" },
  { id: "proposal-029", jobPostId: "job-017", expertId: "user-007", coverLetter: "NLP + healthcare = my sweet spot. I'll build an intelligent scheduling system with natural language understanding for patient requests. The system learns from historical no-show patterns and sends personalized reminders via SMS and email.", bidAmount: 12500, estimatedDays: 45, status: "under_review", createdAt: "2026-06-14T10:00:00.000Z" },
  // ── Proposals for job-018 (Risk Dashboard) — Bob, Grace, Frank apply ──
  { id: "proposal-030", jobPostId: "job-018", expertId: "user-006", coverLetter: "Full-stack AI dev here! I'll build a blazing-fast React dashboard with real-time WebSocket data streams from your fraud detection API. Interactive charts with drill-down, customizable alerting, and role-based views for analysts vs. managers.", bidAmount: 9200, estimatedDays: 28, status: "accepted", createdAt: "2026-06-16T11:00:00.000Z" },
  { id: "proposal-031", jobPostId: "job-018", expertId: "user-011", coverLetter: "I'll create a responsive, mobile-friendly risk dashboard that works beautifully on tablets and phones. Real-time data visualization with D3.js, exportable reports, and a clean modern UI that your analysts will love. Design-first approach.", bidAmount: 9000, estimatedDays: 30, status: "rejected", createdAt: "2026-06-17T08:00:00.000Z" },
  { id: "proposal-032", jobPostId: "job-018", expertId: "user-010", coverLetter: "Data engineering meets visualization. I'll connect your fraud detection pipeline directly to the dashboard with sub-second latency. My solution includes anomaly highlighting, trend prediction overlays, and automated weekly summary reports.", bidAmount: 9500, estimatedDays: 25, status: "rejected", createdAt: "2026-06-17T15:00:00.000Z" },
  // ── Proposals for job-019 (PHI De-identification) — Alice, Carol, Henry apply ──
  { id: "proposal-033", jobPostId: "job-019", expertId: "user-005", coverLetter: "This is exactly my expertise — NLP for healthcare. I built a PHI detection system for Stanford Medical that achieved 99.1% recall across 18 PHI categories. I'll use a fine-tuned clinical BERT model with custom token classification for your specific document types.", bidAmount: 14500, estimatedDays: 52, status: "pending", createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "proposal-034", jobPostId: "job-019", expertId: "user-007", coverLetter: "My NLP research includes named entity recognition for clinical text. I'll build a multi-stage pipeline: document parsing → clinical NER → PHI classification → redaction with audit trail. Includes a confidence score for each redaction decision.", bidAmount: 15000, estimatedDays: 50, status: "pending", createdAt: "2026-06-21T11:00:00.000Z" },
  { id: "proposal-035", jobPostId: "job-019", expertId: "user-012", coverLetter: "I'll build a production-grade de-identification pipeline using ensemble models for maximum recall. My system includes a human-in-the-loop review interface for low-confidence detections, and generates full HIPAA compliance reports automatically.", bidAmount: 15500, estimatedDays: 48, status: "pending", createdAt: "2026-06-22T08:00:00.000Z" },
  // ── New proposals for full account coverage ──
  { id: "proposal-036", jobPostId: "job-020", expertId: "user-010", coverLetter: JSON.stringify({ professionalIntro: "As a data engineering lead, I've built demand forecasting pipelines for major retailers. My approach combines time-series feature engineering with ensemble ML models for 90%+ forecast accuracy.", tasks: [{ id: "task-020-1", useCaseId: "uc-020-1", title: "Data Pipeline & ETL", source: "client", approvalStatus: "accepted", locked: true, price: 2500, completionDays: 7, miniTasks: [{ id: "mt-prop-036-1", taskId: "task-020-1", title: "Ingest 3 years of sales data", status: "pending" }, { id: "mt-prop-036-2", taskId: "task-020-1", title: "Set up incremental data refresh", status: "pending" }] }, { id: "task-020-2", useCaseId: "uc-020-1", title: "Feature Engineering", source: "client", approvalStatus: "accepted", locked: true, price: 2000, completionDays: 7, miniTasks: [{ id: "mt-prop-036-3", taskId: "task-020-2", title: "Build 100+ time-series features", status: "pending" }] }, { id: "task-020-3", useCaseId: "uc-020-2", title: "Model Training Pipeline", source: "client", approvalStatus: "accepted", locked: true, price: 3000, completionDays: 8, miniTasks: [{ id: "mt-prop-036-4", taskId: "task-020-3", title: "Train XGBoost + Prophet ensemble", status: "pending" }] }, { id: "task-020-4", useCaseId: "uc-020-2", title: "Hyperparameter Optimization", source: "client", approvalStatus: "accepted", locked: true, price: 1500, completionDays: 4, miniTasks: [{ id: "mt-prop-036-5", taskId: "task-020-4", title: "Bayesian optimization sweep", status: "pending" }] }, { id: "task-020-5", useCaseId: "uc-020-3", title: "Inventory Analytics Dashboard", source: "client", approvalStatus: "accepted", locked: true, price: 2000, completionDays: 10, miniTasks: [{ id: "mt-prop-036-6", taskId: "task-020-5", title: "React dashboard with forecast charts", status: "pending" }] }], acknowledged: false }), bidAmount: 11000, estimatedDays: 36, status: "pending", createdAt: "2026-06-21T10:00:00.000Z" },
  { id: "proposal-037", jobPostId: "job-021", expertId: "user-008", coverLetter: JSON.stringify({ professionalIntro: "I've built adaptive learning systems for EdTech platforms. My computer vision and ML expertise transfers well to knowledge tracing and personalized content recommendation.", tasks: [{ id: "task-fb-uc-021-1", useCaseId: "uc-021-1", title: "Student Diagnostic Assessment Engine", source: "client_use_case_fallback", approvalStatus: "accepted", locked: true, price: 4000, completionDays: 18, miniTasks: [{ id: "mt-prop-037-1", taskId: "task-fb-uc-021-1", title: "Build diagnostic assessment framework", status: "pending" }, { id: "mt-prop-037-2", taskId: "task-fb-uc-021-1", title: "Implement knowledge gap analysis", status: "pending" }] }, { id: "task-fb-uc-021-2", useCaseId: "uc-021-2", title: "Adaptive Path Generation", source: "client_use_case_fallback", approvalStatus: "accepted", locked: true, price: 5000, completionDays: 20, miniTasks: [{ id: "mt-prop-037-3", taskId: "task-fb-uc-021-2", title: "Content recommendation algorithm", status: "pending" }] }, { id: "task-fb-uc-021-3", useCaseId: "uc-021-3", title: "Teacher Analytics Dashboard", source: "client_use_case_fallback", approvalStatus: "accepted", locked: true, price: 3000, completionDays: 12, miniTasks: [{ id: "mt-prop-037-4", taskId: "task-fb-uc-021-3", title: "Class-wide progress dashboard", status: "pending" }] }, { id: "task-prop-037-1", useCaseId: "uc-021-2", title: "Real-time Student Intervention Alert System", source: "expert", approvalStatus: "pending_client_approval", locked: false, price: 1500, completionDays: 5, miniTasks: [{ id: "mt-prop-037-5", taskId: "task-prop-037-1", title: "Alert when student falls behind", status: "pending" }] }], acknowledged: false }), bidAmount: 13500, estimatedDays: 50, status: "pending", createdAt: "2026-06-23T09:00:00.000Z" },
  { id: "proposal-038", jobPostId: "job-022", expertId: "user-009", coverLetter: JSON.stringify({ professionalIntro: "My MLOps expertise ensures a production-grade legal NLP pipeline. I've deployed NLP systems processing millions of documents with 99.9% uptime. Includes CI/CD, monitoring, and lawyer review workflow.", tasks: [{ id: "task-022-1", useCaseId: "uc-022-1", title: "Document Parser Multi-Format", source: "client", approvalStatus: "accepted", locked: true, price: 3500, completionDays: 10, miniTasks: [{ id: "mt-prop-038-1", taskId: "task-022-1", title: "PDF/DOCX/OCR parsing pipeline", status: "pending" }] }, { id: "task-022-2", useCaseId: "uc-022-1", title: "Clause Extraction NER Model", source: "client", approvalStatus: "accepted", locked: true, price: 3000, completionDays: 12, miniTasks: [{ id: "mt-prop-038-2", taskId: "task-022-2", title: "Fine-tune legal NER model", status: "pending" }] }, { id: "task-022-3", useCaseId: "uc-022-2", title: "Risk Scoring ML Model", source: "client", approvalStatus: "accepted", locked: true, price: 3500, completionDays: 10, miniTasks: [{ id: "mt-prop-038-3", taskId: "task-022-3", title: "Train risk classification model", status: "pending" }] }, { id: "task-022-4", useCaseId: "uc-022-2", title: "Recommendation Generator", source: "client", approvalStatus: "accepted", locked: true, price: 2500, completionDays: 10, miniTasks: [{ id: "mt-prop-038-4", taskId: "task-022-4", title: "Template-based recommendation engine", status: "pending" }] }, { id: "task-022-5", useCaseId: "uc-022-3", title: "Review Interface UI", source: "client", approvalStatus: "accepted", locked: true, price: 3500, completionDays: 18, miniTasks: [{ id: "mt-prop-038-5", taskId: "task-022-5", title: "Lawyer review interface with approval workflow", status: "pending" }] }], acknowledged: false }), bidAmount: 16000, estimatedDays: 60, status: "pending", createdAt: "2026-06-26T11:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// 5. PROJECTS — 12 records (from accepted proposals or direct creation)
//    Statuses: 6 in_progress, 4 completed, 2 cancelled
// ---------------------------------------------------------------------------

const _baseProjects = [
  // ── in_progress ──
  {
    id: "proj-001", jobPostId: "job-009", clientId: "user-014", assignedExpertId: "user-009",
    title: "Deploy ML model on AWS with auto-scaling and monitoring",
    description: "Take our existing PyTorch model and deploy it to production on AWS with Kubernetes. Must include auto-scaling, model versioning, A/B testing, real-time monitoring, and CI/CD pipeline.",
    budget: 10000, deadline: "2026-05-10T00:00:00.000Z", escrowAmount: 10000,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-006", skill: { name: "Kubernetes" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
    ],
    requiredSkills: ["Python", "Kubernetes", "Docker", "AWS"],
    client: "Kate Wilson",
    createdAt: "2026-03-24T10:00:00.000Z",
    updatedAt: "2026-06-14T16:00:00.000Z",
  },
  {
    id: "proj-002", jobPostId: "job-011", clientId: "user-015", assignedExpertId: "user-008",
    title: "Develop a computer vision system for retail inventory tracking",
    description: "Build a CV system using shelf-mounted cameras to track inventory levels in real-time. Must detect out-of-stock items, misplaced products, and pricing label errors.",
    budget: 13500, deadline: "2026-06-20T00:00:00.000Z", escrowAmount: 13500,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
      { skillsId: "skill-004", skill: { name: "React" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "React"],
    client: "Liam O'Brien",
    createdAt: "2026-04-05T09:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
  },
  {
    id: "proj-003", jobPostId: "job-012", clientId: "user-016", assignedExpertId: "user-007",
    title: "Create an AI tutor chatbot for programming education",
    description: "Build an interactive AI tutor that helps students learn Python programming. Must provide code review, explain concepts, generate practice exercises, and track student progress.",
    budget: 7500, deadline: "2026-04-15T00:00:00.000Z", escrowAmount: 7500,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
    ],
    requiredSkills: ["Python", "RAG", "LangChain", "Node.js"],
    client: "Mia Garcia",
    createdAt: "2026-02-20T11:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
  },
  {
    id: "proj-004", jobPostId: "job-013", clientId: "user-014", assignedExpertId: "user-009",
    title: "Set up cloud ML infrastructure with cost optimization",
    description: "Design and implement cost-optimized cloud ML infrastructure on AWS. Must include spot instance strategy, model registry, feature store, and automated resource scaling.",
    budget: 11500, deadline: "2026-05-15T00:00:00.000Z", escrowAmount: 11500,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-006", skill: { name: "Kubernetes" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-001", skill: { name: "Python" } },
    ],
    requiredSkills: ["Kubernetes", "Docker", "AWS", "Python"],
    client: "Kate Wilson",
    createdAt: "2026-03-25T08:00:00.000Z",
    updatedAt: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "proj-005", jobPostId: "job-001", clientId: "user-013", assignedExpertId: "user-012",
    title: "Fine-tune a customer support chatbot with company knowledge base",
    description: "We need an NLP expert to fine-tune an LLM-based chatbot using our internal knowledge base of 50,000+ support tickets. The bot should handle tier-1 queries with 90%+ accuracy.",
    budget: 8500, deadline: "2026-07-15T00:00:00.000Z", escrowAmount: 8500,
    status: "disputed",
  },
  {
    id: "proj-006", jobPostId: "job-008", clientId: "user-019", assignedExpertId: "user-007",
    title: "Create AI contract analysis tool for legal documents",
    description: "Build an NLP tool that analyzes legal contracts to identify key clauses, risks, and anomalies. Must support multiple document formats and provide clause-level classification.",
    budget: 20000, deadline: "2026-08-15T00:00:00.000Z", escrowAmount: 20000,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning", "LangChain"],
    client: "Paul Anderson",
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-06-16T08:00:00.000Z",
  },
  // ── completed ──
  {
    id: "proj-007", jobPostId: "job-014", clientId: "user-018", assignedExpertId: "user-011",
    title: "Build a virtual staging AI for real estate photos",
    description: "Develop a generative AI system that virtually stages empty rooms with furniture and decor. Must support multiple interior design styles and produce photorealistic results.",
    budget: 16000, deadline: "2026-05-01T00:00:00.000Z", escrowAmount: 16000,
    status: "completed",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-004", skill: { name: "React" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
    ],
    requiredSkills: ["Python", "PyTorch", "React", "Node.js"],
    client: "Olivia Martinez",
    createdAt: "2025-12-01T09:00:00.000Z",
    updatedAt: "2026-04-28T15:00:00.000Z",
  },
  {
    id: "proj-008", jobPostId: "job-015", clientId: "user-020", assignedExpertId: "user-005",
    title: "Implement sentiment analysis pipeline for social media monitoring",
    description: "Build a real-time sentiment analysis pipeline that monitors brand mentions across social media. Classify sentiment, detect trends, and generate daily brand health reports.",
    budget: 8500, deadline: "2026-04-01T00:00:00.000Z", escrowAmount: 8500,
    status: "completed",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "Node.js", "SQL"],
    client: "Quinn Thomas",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-03-28T14:00:00.000Z",
  },
  {
    id: "proj-009", jobPostId: "job-003", clientId: "user-014", assignedExpertId: "user-010",
    title: "Develop AI fraud detection system for real-time transactions (Phase 1)",
    description: "Phase 1 of fraud detection system: data pipeline, feature engineering, and initial model training. Delivered anomaly detection models with 85% precision on test data.",
    budget: 12000, deadline: "2026-05-01T00:00:00.000Z", escrowAmount: 12000,
    status: "completed",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["Python", "PyTorch", "AWS", "SQL"],
    client: "Kate Wilson",
    createdAt: "2026-01-20T08:00:00.000Z",
    updatedAt: "2026-04-20T16:00:00.000Z",
  },
  {
    id: "proj-010", jobPostId: "job-005", clientId: "user-016", assignedExpertId: "user-012",
    title: "Build AI-powered adaptive learning platform with automated grading (MVP)",
    description: "MVP of adaptive learning system: knowledge tracing models, basic NLP essay grading, and curriculum path personalization. Deployed as pilot to 5 schools.",
    budget: 10000, deadline: "2026-05-15T00:00:00.000Z", escrowAmount: 10000,
    status: "completed",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-012", skill: { name: "LangChain" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "LangChain"],
    client: "Mia Garcia",
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-05-10T12:00:00.000Z",
  },
  // ── cancelled ──
  {
    id: "proj-011", jobPostId: "job-007", clientId: "user-018", assignedExpertId: "user-006",
    title: "Build ML pipeline for automated property valuation",
    description: "Develop a machine learning pipeline to estimate property values using historical sales data, neighborhood features, and market trends.",
    budget: 14000, deadline: "2026-07-01T00:00:00.000Z", escrowAmount: 14000,
    status: "cancelled",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
      { skillsId: "skill-007", skill: { name: "Docker" } },
    ],
    requiredSkills: ["Python", "AWS", "SQL", "Docker"],
    client: "Olivia Martinez",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "proj-012", jobPostId: "job-010", clientId: "user-020", assignedExpertId: "user-011",
    title: "Build an AI marketing content generator with brand voice control",
    description: "Create a generative AI tool that produces marketing copy while maintaining consistent brand voice. Support tone adjustment and A/B variant generation.",
    budget: 9500, deadline: "2026-08-01T00:00:00.000Z", escrowAmount: 9500,
    status: "cancelled",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-010", skill: { name: "RAG" } },
      { skillsId: "skill-011", skill: { name: "Fine-tuning" } },
    ],
    requiredSkills: ["Python", "PyTorch", "RAG", "Fine-tuning"],
    client: "Quinn Thomas",
    createdAt: "2026-05-10T11:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
  },
  // ── proj-013: PCG for Noah (in_progress) ──
  {
    id: "proj-013", jobPostId: "job-016", clientId: "user-017", assignedExpertId: "user-008",
    title: "Procedural content generation for open world game using ML",
    description: "Build a machine learning-based procedural content generation system for our open world game. Generate diverse terrain types, place vegetation and structures logically, and create coherent biome transitions.",
    budget: 18000, deadline: "2026-07-20T00:00:00.000Z", escrowAmount: 18000,
    status: "in_progress",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow"],
    client: "Noah Taylor",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-06-15T14:00:00.000Z",
  },
  // ── proj-014: Medical X-ray Classification — Alice for John (active, from accepted proposal-005)
  //     Scenarios 5-8: checklist_completed, waiting_expert_product, rework.
  {
    id: "proj-014", jobPostId: "job-002", clientId: "user-013", assignedExpertId: "user-005",
    title: "Build a medical image classification system for X-ray analysis",
    description: "Develop a deep learning model to classify chest X-rays into 14 pathology categories with high sensitivity. Must include data preprocessing pipeline, model training with DenseNet/ResNet architectures, and a web-based demo for radiologists to test.",
    budget: 12000, deadline: "2026-08-01T00:00:00.000Z", escrowAmount: 12000,
    originalClientBudget: 15000,
    originalClientDeadline: "45",
    finalDeliveryStatus: null,
    status: "active",
    useCases: [
      { id: "uc-014-1", title: "Data Preprocessing Pipeline", description: "Build chest X-ray preprocessing pipeline with augmentation for 14 pathology categories", originalDurationDays: 14 },
      { id: "uc-014-2", title: "Model Training & Evaluation", description: "Train DenseNet-121 on NIH ChestX-ray14 dataset with transfer learning", originalDurationDays: 20 },
      { id: "uc-014-3", title: "Web Demo & Deployment", description: "Build web interface for radiologists to upload and classify X-rays", originalDurationDays: 10 },
    ],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "AWS"],
    client: "John Smith",
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-27T14:00:00.000Z",
  },
  // ── proj-015: Disputed — Healthcare Scheduling AI (Alice for Noah), Client reported Expert ──
  {
    id: "proj-015", jobPostId: "job-017", clientId: "user-017", assignedExpertId: "user-005",
    title: "AI-Powered Healthcare Appointment Scheduling Optimization",
    description: "Build an AI-powered healthcare appointment scheduling system that optimizes provider schedules, predicts no-shows, and reduces patient wait times using ML-based time-series forecasting.",
    budget: 11500, deadline: "2026-08-15T00:00:00.000Z", escrowAmount: 11500,
    originalClientBudget: 11500,
    originalClientDeadline: "42",
    finalDeliveryStatus: null,
    status: "disputed",
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
      { skillsId: "skill-003", skill: { name: "TensorFlow" } },
    ],
    requiredSkills: ["Python", "PyTorch", "TensorFlow"],
    client: "Noah Taylor",
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-26T09:00:00.000Z",
  },
  // ── proj-016: Risk Dashboard — Bob for Kate (all tasks done, final delivery submitted)
  //     For testing final delivery accept/decline and release payment flows.
  {
    id: "proj-016", jobPostId: "job-018", clientId: "user-014", assignedExpertId: "user-006",
    title: "Build real-time risk assessment dashboard for financial transactions",
    description: "Create an interactive dashboard that visualizes risk scores in real-time across transaction streams. Must support drill-down, risk trend analysis, and customizable alert thresholds.",
    budget: 9200, deadline: "2026-07-15T00:00:00.000Z", escrowAmount: 9200,
    originalClientBudget: 9500,
    originalClientDeadline: "28",
    finalDeliveryStatus: "Final Product Submitted",
    finalWorkSubmitted: true,
    finalProjectLink: "https://risk-dash-demo.vercel.app",
    finalProjectFile: "risk-dashboard-source.zip",
    status: "active",
    jobPostSkills: [
      { skillsId: "skill-004", skill: { name: "React" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
      { skillsId: "skill-008", skill: { name: "AWS" } },
      { skillsId: "skill-009", skill: { name: "SQL" } },
    ],
    requiredSkills: ["React", "Node.js", "AWS", "SQL"],
    client: "Kate Wilson",
    createdAt: "2026-06-18T09:00:00.000Z",
    updatedAt: "2026-06-27T10:00:00.000Z",
  },
  // ── proj-017: Contract Cancellation Demo — 30% Progress (John=client, Alice=expert) ──
  {
    id: "proj-017", jobPostId: null, clientId: "user-013", assignedExpertId: "user-005",
    title: "Contract Cancellation Demo — 30% Progress",
    description: "Seed project for testing contract cancellation at 30% project progress. Expected: Expert=400,000, Platform=50,000, Client refund=550,000.",
    budget: 1000000, deadline: "2026-09-01T00:00:00.000Z", escrowAmount: 1000000,
    finalDeliveryStatus: null,
    status: "active",
    useCases: [{"id":"uc-017-1","title":"Patient Scheduling Optimization Engine","originalDurationDays":20,"tasks":[{"id":"task-017-1","title":"No-Show Prediction Model","description":"Train ML model to predict patient no-show probability","source":"client","locked":true,"approvalStatus":"accepted","price":4000,"completionDays":14,"status":"in_progress","miniTasks":[{"title":"Data exploration on 2 years of appointment history"},{"title":"Train XGBoost baseline"},{"title":"Calibrate probability scores"},{"title":"Deploy model with retraining pipeline"}]},{"id":"task-017-2","title":"Schedule Optimization Algorithm","description":"Implement constraint-based scheduling optimizer","source":"client","locked":true,"approvalStatus":"accepted","price":3000,"completionDays":10,"status":"not_started","miniTasks":[{"title":"Define optimization constraints"},{"title":"Implement OR-Tools solver"},{"title":"Build schedule simulation"}]}]},{"id":"uc-017-2","title":"EMR Integration & HL7/FHIR API","originalDurationDays":15,"tasks":[{"id":"task-017-3","title":"HL7/FHIR Data Pipeline","description":"Build ETL pipeline for HL7/FHIR data","source":"client","locked":true,"approvalStatus":"accepted","price":2000,"completionDays":8,"status":"not_started","miniTasks":[{"title":"Map HL7/FHIR message types"},{"title":"Build ETL pipeline with error handling"}]}]},{"id":"uc-017-3","title":"Patient Portal & Admin Dashboard","originalDurationDays":10,"tasks":[{"id":"task-017-4","title":"Patient Self-Scheduling Portal","description":"React-based web portal for patients","source":"client","locked":true,"approvalStatus":"accepted","price":1500,"completionDays":7,"status":"not_started","miniTasks":[{"title":"Build appointment booking flow"},{"title":"Add SMS/email confirmation"}]},{"id":"task-017-5","title":"Clinic Admin Analytics Dashboard","description":"Interactive dashboard with schedule analytics","source":"client","locked":true,"approvalStatus":"accepted","price":1000,"completionDays":5,"status":"not_started","miniTasks":[{"title":"Build no-show trend charts"}]}]}],
    tasks: [{"id":"task-017-1","projectId":"proj-017","useCaseId":"uc-017-1","title":"No-Show Prediction Model","description":"Train ML model to predict patient no-show probability","source":"client","approvalStatus":"accepted","locked":true,"status":"in_progress","price":4000,"completionDays":14,"miniTasks":[{"id":"mt-proj-017-uc-017-1-0-0","taskId":"task-017-1","title":"Data exploration on 2 years of appointment history","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-017-uc-017-1-0-1","taskId":"task-017-1","title":"Train XGBoost baseline","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-017-uc-017-1-0-2","taskId":"task-017-1","title":"Calibrate probability scores","description":"","status":"pending","isCompleted":false,"completedAt":null},{"id":"mt-proj-017-uc-017-1-0-3","taskId":"task-017-1","title":"Deploy model with retraining pipeline","description":"","status":"pending","isCompleted":false,"completedAt":null}]},{"id":"task-017-2","projectId":"proj-017","useCaseId":"uc-017-1","title":"Schedule Optimization Algorithm","description":"Implement constraint-based scheduling optimizer","source":"client","approvalStatus":"accepted","locked":true,"status":"not_started","price":3000,"completionDays":10,"miniTasks":[{"id":"mt-proj-017-uc-017-1-1-0","taskId":"task-017-2","title":"Define optimization constraints","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-017-uc-017-1-1-1","taskId":"task-017-2","title":"Implement OR-Tools solver","description":"","status":"pending","isCompleted":false,"completedAt":null},{"id":"mt-proj-017-uc-017-1-1-2","taskId":"task-017-2","title":"Build schedule simulation","description":"","status":"pending","isCompleted":false,"completedAt":null}]},{"id":"task-017-3","projectId":"proj-017","useCaseId":"uc-017-2","title":"HL7/FHIR Data Pipeline","description":"Build ETL pipeline for HL7/FHIR data","source":"client","approvalStatus":"accepted","locked":true,"status":"not_started","price":2000,"completionDays":8,"miniTasks":[{"id":"mt-proj-017-uc-017-2-0-0","taskId":"task-017-3","title":"Map HL7/FHIR message types","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-017-uc-017-2-0-1","taskId":"task-017-3","title":"Build ETL pipeline with error handling","description":"","status":"pending","isCompleted":false,"completedAt":null}]},{"id":"task-017-4","projectId":"proj-017","useCaseId":"uc-017-3","title":"Patient Self-Scheduling Portal","description":"React-based web portal for patients","source":"client","approvalStatus":"accepted","locked":true,"status":"not_started","price":1500,"completionDays":7,"miniTasks":[{"id":"mt-proj-017-uc-017-3-0-0","taskId":"task-017-4","title":"Build appointment booking flow","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-017-uc-017-3-0-1","taskId":"task-017-4","title":"Add SMS/email confirmation","description":"","status":"pending","isCompleted":false,"completedAt":null}]},{"id":"task-017-5","projectId":"proj-017","useCaseId":"uc-017-3","title":"Clinic Admin Analytics Dashboard","description":"Interactive dashboard with schedule analytics","source":"client","approvalStatus":"accepted","locked":true,"status":"not_started","price":1000,"completionDays":5,"miniTasks":[{"id":"mt-proj-017-uc-017-3-1-0","taskId":"task-017-5","title":"Build no-show trend charts","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"}]}],
    jobPostSkills: [
      { skillsId: "skill-001", skill: { name: "Python" } },
      { skillsId: "skill-002", skill: { name: "PyTorch" } },
    ],
    requiredSkills: ["Python", "PyTorch"],
    client: "John Smith",
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-25T08:00:00.000Z",
  },
  // ── proj-018: Contract Cancellation Demo — 80% Progress (Kate=client, Bob=expert) ──
  {
    id: "proj-018", jobPostId: null, clientId: "user-014", assignedExpertId: "user-006",
    title: "Contract Cancellation Demo — 80% Progress",
    description: "Seed project for testing contract cancellation at 80% project progress. Expected: Expert=900,000, Platform=50,000, Client refund=50,000.",
    budget: 1000000, deadline: "2026-09-15T00:00:00.000Z", escrowAmount: 1000000,
    finalDeliveryStatus: null,
    status: "active",
    useCases: [{"id":"uc-018-1","title":"Risk Data Pipeline & Integration","originalDurationDays":12,"tasks":[{"id":"task-018-1","title":"Data Pipeline Setup","description":"Set up real-time data ingestion from fraud API","source":"client","locked":true,"approvalStatus":"accepted","price":2500,"completionDays":6,"status":"completed","miniTasks":[{"title":"Connect to fraud detection API"},{"title":"Build streaming data pipeline"},{"title":"Set up data validation layer"}]},{"id":"task-018-2","title":"Data Warehouse Schema","description":"Design and implement analytics data warehouse","source":"client","locked":true,"approvalStatus":"accepted","price":2000,"completionDays":6,"status":"completed","miniTasks":[{"title":"Design star schema"},{"title":"Implement ETL transformations"}]}]},{"id":"uc-018-2","title":"Risk Dashboard UI & Visualization","originalDurationDays":10,"tasks":[{"id":"task-018-3","title":"Dashboard Core UI","description":"Build main dashboard with drill-down capability","source":"client","locked":true,"approvalStatus":"accepted","price":2700,"completionDays":5,"status":"completed","miniTasks":[{"title":"Build risk score overview page"},{"title":"Implement drill-down navigation"},{"title":"Add transaction detail view"}]},{"id":"task-018-4","title":"Alert & Notification System","description":"Customizable alert thresholds and notifications","source":"client","locked":true,"approvalStatus":"accepted","price":2000,"completionDays":5,"status":"in_progress","miniTasks":[{"title":"Configure alert threshold UI"},{"title":"Build notification service"},{"title":"Add email/Slack integration"}]}]}],
    tasks: [{"id":"task-018-1","projectId":"proj-018","useCaseId":"uc-018-1","title":"Data Pipeline Setup","description":"Set up real-time data ingestion from fraud API","source":"client","approvalStatus":"accepted","locked":true,"status":"completed","price":2500,"completionDays":6,"miniTasks":[{"id":"mt-proj-018-uc-018-1-0-0","taskId":"task-018-1","title":"Connect to fraud detection API","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-1-0-1","taskId":"task-018-1","title":"Build streaming data pipeline","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-1-0-2","taskId":"task-018-1","title":"Set up data validation layer","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"}]},{"id":"task-018-2","projectId":"proj-018","useCaseId":"uc-018-1","title":"Data Warehouse Schema","description":"Design and implement analytics data warehouse","source":"client","approvalStatus":"accepted","locked":true,"status":"completed","price":2000,"completionDays":6,"miniTasks":[{"id":"mt-proj-018-uc-018-1-1-0","taskId":"task-018-2","title":"Design star schema","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-1-1-1","taskId":"task-018-2","title":"Implement ETL transformations","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"}]},{"id":"task-018-3","projectId":"proj-018","useCaseId":"uc-018-2","title":"Dashboard Core UI","description":"Build main dashboard with drill-down capability","source":"client","approvalStatus":"accepted","locked":true,"status":"completed","price":2700,"completionDays":5,"miniTasks":[{"id":"mt-proj-018-uc-018-2-0-0","taskId":"task-018-3","title":"Build risk score overview page","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-2-0-1","taskId":"task-018-3","title":"Implement drill-down navigation","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-2-0-2","taskId":"task-018-3","title":"Add transaction detail view","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"}]},{"id":"task-018-4","projectId":"proj-018","useCaseId":"uc-018-2","title":"Alert & Notification System","description":"Customizable alert thresholds and notifications","source":"client","approvalStatus":"accepted","locked":true,"status":"in_progress","price":2000,"completionDays":5,"miniTasks":[{"id":"mt-proj-018-uc-018-2-1-0","taskId":"task-018-4","title":"Configure alert threshold UI","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-2-1-1","taskId":"task-018-4","title":"Build notification service","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"},{"id":"mt-proj-018-uc-018-2-1-2","taskId":"task-018-4","title":"Add email/Slack integration","description":"","status":"completed","isCompleted":true,"completedAt":"2026-06-26T10:00:00.000Z"}]}],
    jobPostSkills: [
      { skillsId: "skill-004", skill: { name: "React" } },
      { skillsId: "skill-005", skill: { name: "Node.js" } },
    ],
    requiredSkills: ["React", "Node.js"],
    client: "Kate Wilson",
    createdAt: "2026-06-22T09:00:00.000Z",
    updatedAt: "2026-06-26T10:00:00.000Z",
  },
  // ── proj-019: Final Delivery Submitted (John, Alice) — ready for client accept/decline ──
  { id: "proj-019", jobPostId: "job-002", clientId: "user-013", assignedExpertId: "user-005", title: "Medical Image Classification System (Delivery Ready)", description: "AI system classifying chest X-rays into 14 pathology categories. All tasks completed, final delivery submitted.", budget: 15000, deadline: "2026-08-01T00:00:00.000Z", escrowAmount: 15000, originalClientBudget: 15000, originalClientDeadline: "42", finalDeliveryStatus: "Final Product Submitted", finalWorkSubmitted: true, finalProjectLink: "https://medimg-demo.vercel.app", finalProjectFile: "medical-imaging-model.zip", status: "active", jobPostSkills: [{ skillsId: "skill-002", skill: { name: "PyTorch" } }], requiredSkills: ["Python", "PyTorch"], client: "John Smith", createdAt: "2026-06-15T08:00:00.000Z", updatedAt: "2026-06-27T16:00:00.000Z", useCases: [{ id: "uc-019-1", title: "X-Ray Classification Model", originalDurationDays: 30 }], tasks: [{ id: "task-019-1", projectId: "proj-019", useCaseId: "uc-019-1", title: "Data Preprocessing Pipeline", source: "client", approvalStatus: "accepted", locked: true, status: "completed", price: 5000, completionDays: 12, miniTasks: [{ id: "mt-019-1", taskId: "task-019-1", title: "DICOM parser", status: "completed", isCompleted: true }, { id: "mt-019-2", taskId: "task-019-1", title: "Normalization pipeline", status: "completed", isCompleted: true }] }, { id: "task-019-2", projectId: "proj-019", useCaseId: "uc-019-1", title: "Model Training & Validation", source: "client", approvalStatus: "accepted", locked: true, status: "completed", price: 7000, completionDays: 14, miniTasks: [{ id: "mt-019-3", taskId: "task-019-2", title: "DenseNet training", status: "completed", isCompleted: true }, { id: "mt-019-4", taskId: "task-019-2", title: "Cross-validation", status: "completed", isCompleted: true }] }, { id: "task-019-3", projectId: "proj-019", useCaseId: "uc-019-1", title: "Web Demo Interface", source: "client", approvalStatus: "accepted", locked: true, status: "completed", price: 3000, completionDays: 6, miniTasks: [{ id: "mt-019-5", taskId: "task-019-3", title: "Upload + inference UI", status: "completed", isCompleted: true }] }] },
  // ── proj-020: Checklist Completed (Liam, Frank) — all miniTasks done, waiting for expert product ──
  { id: "proj-020", jobPostId: "job-004", clientId: "user-015", assignedExpertId: "user-010", title: "E-Commerce Product Recommendation Engine", description: "AI recommendation system. All checklist items completed. Expert needs to submit product.", budget: 10000, deadline: "2026-08-10T00:00:00.000Z", escrowAmount: 10000, originalClientBudget: 10000, originalClientDeadline: "35", status: "active", jobPostSkills: [{ skillsId: "skill-001", skill: { name: "Python" } }], requiredSkills: ["Python"], client: "Liam O'Brien", createdAt: "2026-06-05T10:00:00.000Z", updatedAt: "2026-06-26T14:00:00.000Z", useCases: [{ id: "uc-020-1", title: "Recommendation Pipeline", originalDurationDays: 20 }], tasks: [{ id: "task-020-1", projectId: "proj-020", useCaseId: "uc-020-1", title: "Collaborative Filtering Model", source: "client", approvalStatus: "accepted", locked: true, status: "checklist_completed", price: 5000, completionDays: 12, miniTasks: [{ id: "mt-020-1", taskId: "task-020-1", title: "ALS matrix factorization", status: "completed", isCompleted: true }, { id: "mt-020-2", taskId: "task-020-1", title: "Neural CF model", status: "completed", isCompleted: true }] }, { id: "task-020-2", projectId: "proj-020", useCaseId: "uc-020-1", title: "Real-time Feature Serving", source: "client", approvalStatus: "accepted", locked: true, status: "checklist_completed", price: 5000, completionDays: 8, miniTasks: [{ id: "mt-020-3", taskId: "task-020-2", title: "Redis feature store", status: "completed", isCompleted: true }, { id: "mt-020-4", taskId: "task-020-2", title: "<50ms inference API", status: "completed", isCompleted: true }] }] },
  // ── proj-021: Waiting Expert Product (Mia, David) — client requested product ──
  { id: "proj-021", jobPostId: "job-012", clientId: "user-016", assignedExpertId: "user-008", title: "AI-Powered Online Tutoring Platform", description: "Adaptive learning platform. Client requested the expert to submit product for review.", budget: 7500, deadline: "2026-09-01T00:00:00.000Z", escrowAmount: 7500, originalClientBudget: 7500, originalClientDeadline: "60", status: "active", jobPostSkills: [{ skillsId: "skill-001", skill: { name: "Python" } }], requiredSkills: ["Python"], client: "Mia Garcia", createdAt: "2026-06-10T12:00:00.000Z", updatedAt: "2026-06-25T15:00:00.000Z", useCases: [{ id: "uc-021-1", title: "AI Tutoring Engine", originalDurationDays: 35 }], tasks: [{ id: "task-021-1", projectId: "proj-021", useCaseId: "uc-021-1", title: "Subject Knowledge Base", source: "client", approvalStatus: "accepted", locked: true, status: "in_progress", price: 4000, completionDays: 18, productRequested: true, miniTasks: [{ id: "mt-021-1", taskId: "task-021-1", title: "RAG pipeline setup", status: "completed", isCompleted: true }, { id: "mt-021-2", taskId: "task-021-1", title: "QA accuracy validation", status: "pending", isCompleted: false }] }, { id: "task-021-2", projectId: "proj-021", useCaseId: "uc-021-1", title: "Student Progress Tracking", source: "client", approvalStatus: "accepted", locked: true, status: "not_started", price: 3500, completionDays: 17, miniTasks: [{ id: "mt-021-3", taskId: "task-021-2", title: "Diagnostic quiz engine", status: "pending", isCompleted: false }] }] },
  // ── proj-022: Waiting for Client Approval (Paul, Emma) — expert submitted, client reviewing ──
  { id: "proj-022", jobPostId: "job-008", clientId: "user-019", assignedExpertId: "user-009", title: "AI Contract Clause Analysis Tool", description: "NLP tool for legal contract analysis. Expert submitted work for review. Client needs to approve.", budget: 20000, deadline: "2026-07-30T00:00:00.000Z", escrowAmount: 20000, originalClientBudget: 20000, originalClientDeadline: "45", status: "active", jobPostSkills: [{ skillsId: "skill-005", skill: { name: "Node.js" } }], requiredSkills: ["Node.js"], client: "Paul Anderson", createdAt: "2026-06-12T09:00:00.000Z", updatedAt: "2026-06-26T14:00:00.000Z", useCases: [{ id: "uc-022-1", title: "Contract Analysis Engine", originalDurationDays: 45 }], tasks: [{ id: "task-022-1", projectId: "proj-022", useCaseId: "uc-022-1", title: "Clause Extraction Pipeline", source: "client", approvalStatus: "accepted", locked: true, status: "waiting_for_approval", price: 8000, completionDays: 20, handoverEvidence: "clause-extraction-demo.mp4", miniTasks: [{ id: "mt-022-1", taskId: "task-022-1", title: "Legal NER model", status: "completed", isCompleted: true }, { id: "mt-022-2", taskId: "task-022-1", title: "Clause classification pipeline", status: "completed", isCompleted: true }] }, { id: "task-022-2", projectId: "proj-022", useCaseId: "uc-022-1", title: "Risk Scoring", source: "client", approvalStatus: "accepted", locked: true, status: "waiting_for_approval", price: 7000, completionDays: 15, handoverEvidence: "risk-model-report.pdf", miniTasks: [{ id: "mt-022-3", taskId: "task-022-2", title: "Risk classification model", status: "completed", isCompleted: true }] }, { id: "task-022-3", projectId: "proj-022", useCaseId: "uc-022-1", title: "Lawyer Review Dashboard", source: "client", approvalStatus: "accepted", locked: true, status: "in_progress", price: 5000, completionDays: 10, miniTasks: [{ id: "mt-022-4", taskId: "task-022-3", title: "Clause highlighting UI", status: "completed", isCompleted: true }] }] },
  // ── proj-023: Rework (Olivia, Grace) — client declined, expert reworking ──
  { id: "proj-023", jobPostId: "job-014", clientId: "user-018", assignedExpertId: "user-011", title: "RAG-Powered Customer Support Chatbot", description: "Enterprise RAG chatbot. Client reviewed and declined — requires rework on response accuracy.", budget: 16000, deadline: "2026-08-05T00:00:00.000Z", escrowAmount: 16000, originalClientBudget: 16000, originalClientDeadline: "40", status: "active", jobPostSkills: [{ skillsId: "skill-010", skill: { name: "RAG" } }], requiredSkills: ["Python", "RAG"], client: "Olivia Martinez", createdAt: "2026-06-08T11:00:00.000Z", updatedAt: "2026-06-27T09:00:00.000Z", useCases: [{ id: "uc-023-1", title: "RAG Chatbot System", originalDurationDays: 40 }], tasks: [{ id: "task-023-1", projectId: "proj-023", useCaseId: "uc-023-1", title: "Knowledge Base RAG Pipeline", source: "client", approvalStatus: "accepted", locked: true, status: "rework", price: 6000, completionDays: 15, clientFeedback: "Response accuracy only 72%. Improve chunking strategy.", miniTasks: [{ id: "mt-023-1", taskId: "task-023-1", title: "Document chunking optimization", status: "pending", isCompleted: false }, { id: "mt-023-2", taskId: "task-023-1", title: "Hybrid search with re-ranking", status: "pending", isCompleted: false }] }, { id: "task-023-2", projectId: "proj-023", useCaseId: "uc-023-1", title: "Conversation Flow & Guardrails", source: "client", approvalStatus: "accepted", locked: true, status: "in_progress", price: 5000, completionDays: 12, miniTasks: [{ id: "mt-023-3", taskId: "task-023-2", title: "Multi-turn context management", status: "completed", isCompleted: true }] }] },
];

// ---------------------------------------------------------------------------
// 6. TRANSACTIONS — 21 records
//    Tied to projects, users, and escrow flows
// ---------------------------------------------------------------------------

const _baseTransactions = [
  // ── proj-001: AWS Deploy (Emma for Kate) ──
  { id: "txn-001", projectId: "proj-001", fromUserId: "user-014", toUserId: "user-009", amount: 10000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for AWS ML deployment", createdAt: "2026-03-24T10:30:00.000Z" },
  // ── proj-002: Retail CV (David for Liam) ──
  { id: "txn-002", projectId: "proj-002", fromUserId: "user-015", toUserId: "user-008", amount: 13500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for retail inventory CV system", createdAt: "2026-04-05T10:00:00.000Z" },
  // ── proj-003: AI Tutor (Carol for Mia) ──
  { id: "txn-003", projectId: "proj-003", fromUserId: "user-016", toUserId: "user-007", amount: 7500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for AI tutor chatbot", createdAt: "2026-02-20T12:00:00.000Z" },
  // ── proj-004: Cloud ML Infra (Emma for Kate) ──
  { id: "txn-004", projectId: "proj-004", fromUserId: "user-014", toUserId: "user-009", amount: 11500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for cloud ML infrastructure", createdAt: "2026-03-25T09:00:00.000Z" },
  // ── proj-005: Support Chatbot (Henry for John) ──
  { id: "txn-005", projectId: "proj-005", fromUserId: "user-013", toUserId: "user-012", amount: 8500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for support chatbot fine-tuning", createdAt: "2026-06-05T14:30:00.000Z" },
  // ── proj-006: Contract Analysis (Carol for Paul) ──
  { id: "txn-006", projectId: "proj-006", fromUserId: "user-019", toUserId: "user-007", amount: 20000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for AI contract analysis tool", createdAt: "2026-06-10T09:30:00.000Z" },
  // ── proj-007: Virtual Staging (Grace for Olivia) — completed, released ──
  { id: "txn-007", projectId: "proj-007", fromUserId: "user-018", toUserId: "user-011", amount: 16000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for virtual staging AI", createdAt: "2025-12-01T10:00:00.000Z" },
  { id: "txn-008", projectId: "proj-007", fromUserId: "user-018", toUserId: "user-011", amount: 16000, type: "escrow_release", status: "completed", description: "Escrow released to expert upon project completion", createdAt: "2026-04-28T15:30:00.000Z" },
  // ── proj-008: Sentiment Analysis (Alice for Quinn) — completed, released ──
  { id: "txn-009", projectId: "proj-008", fromUserId: "user-020", toUserId: "user-005", amount: 8500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for sentiment analysis pipeline", createdAt: "2026-01-15T11:00:00.000Z" },
  { id: "txn-010", projectId: "proj-008", fromUserId: "user-020", toUserId: "user-005", amount: 8500, type: "escrow_release", status: "completed", description: "Escrow released to expert upon project completion", createdAt: "2026-03-28T14:30:00.000Z" },
  // ── proj-009: Fraud Detection Phase 1 (Frank for Kate) — completed, released ──
  { id: "txn-011", projectId: "proj-009", fromUserId: "user-014", toUserId: "user-010", amount: 12000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for fraud detection system", createdAt: "2026-01-20T09:00:00.000Z" },
  { id: "txn-012", projectId: "proj-009", fromUserId: "user-014", toUserId: "user-010", amount: 12000, type: "escrow_release", status: "completed", description: "Escrow released to expert upon Phase 1 completion", createdAt: "2026-04-20T16:30:00.000Z" },
  // ── proj-010: Adaptive Learning MVP (Henry for Mia) — completed, released ──
  { id: "txn-013", projectId: "proj-010", fromUserId: "user-016", toUserId: "user-012", amount: 10000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for adaptive learning MVP", createdAt: "2026-02-01T10:00:00.000Z" },
  { id: "txn-014", projectId: "proj-010", fromUserId: "user-016", toUserId: "user-012", amount: 10000, type: "escrow_release", status: "completed", description: "Escrow released to expert upon MVP completion", createdAt: "2026-05-10T12:30:00.000Z" },
  // ── proj-011: Property Valuation (Bob for Olivia) — cancelled, refunded ──
  { id: "txn-015", projectId: "proj-011", fromUserId: "user-018", toUserId: "user-006", amount: 14000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for property valuation ML", createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "txn-016", projectId: "proj-011", fromUserId: "user-018", toUserId: "user-006", amount: 14000, type: "dispute_refund", status: "completed", description: "Full refund to client due to project cancellation", createdAt: "2026-06-10T14:30:00.000Z" },
  // ── proj-012: Marketing Content (Grace for Quinn) — cancelled, refunded ──
  { id: "txn-017", projectId: "proj-012", fromUserId: "user-020", toUserId: "user-011", amount: 9500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for marketing content generator", createdAt: "2026-05-10T12:00:00.000Z" },
  { id: "txn-018", projectId: "proj-012", fromUserId: "user-020", toUserId: "user-011", amount: 9500, type: "dispute_refund", status: "completed", description: "Full refund to client due to project cancellation", createdAt: "2026-06-15T09:30:00.000Z" },
  // ── Expert withdrawals ──
  { id: "txn-019", projectId: null, fromUserId: "user-005", toUserId: null, amount: 5000, type: "withdrawal", status: "completed", description: "Withdrawal to bank account", createdAt: "2026-05-01T10:00:00.000Z" },
  { id: "txn-020", projectId: null, fromUserId: "user-012", toUserId: null, amount: 8000, type: "withdrawal", status: "pending", description: "Withdrawal request to bank account", createdAt: "2026-06-14T08:00:00.000Z" },
  // ── proj-013: PCG for Noah — escrow deposit ──
  { id: "txn-021", projectId: "proj-013", fromUserId: "user-017", toUserId: "user-008", amount: 18000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for procedural content generation", createdAt: "2026-05-20T10:30:00.000Z" },
  // ── proj-014: X-ray Classification (Alice for John) ──
  { id: "txn-022", projectId: "proj-014", fromUserId: "user-013", toUserId: "user-005", amount: 12000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for medical X-ray classification system", createdAt: "2026-06-20T14:30:00.000Z" },
  // ── proj-016: Risk Dashboard (Bob for Kate) — escrow deposit ──
  { id: "txn-023", projectId: "proj-016", fromUserId: "user-014", toUserId: "user-006", amount: 9200, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for risk assessment dashboard", createdAt: "2026-06-18T09:30:00.000Z" },
  // ── proj-015: Healthcare Scheduling (Alice for Noah, Disputed) ──
  { id: "txn-026", projectId: "proj-015", fromUserId: "user-017", toUserId: "user-005", amount: 11500, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for healthcare scheduling AI — escrow locked pending dispute resolution", createdAt: "2026-06-20T15:00:00.000Z" },
  // ── proj-017: Contract Cancellation 30% Demo (John for Alice) ──
  { id: "txn-024", projectId: "proj-017", fromUserId: "user-013", toUserId: "user-005", amount: 1000000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for contract cancellation demo — 30% progress", createdAt: "2026-06-20T08:30:00.000Z" },
  // ── proj-018: Contract Cancellation 80% Demo (Kate for Bob) ──
  { id: "txn-025", projectId: "proj-018", fromUserId: "user-014", toUserId: "user-006", amount: 1000000, type: "escrow_deposit", status: "completed", description: "Full project escrow deposit for contract cancellation demo — 80% progress", createdAt: "2026-06-22T09:30:00.000Z" },
];

// ---------------------------------------------------------------------------
// 7. REPORTS / DISPUTES — 10 records
// ---------------------------------------------------------------------------

const _baseReports = [
  {
    id: "report-001", projectId: "proj-011", reporterId: "user-006",
    reportName: "Client unresponsive — project stalled",
    reason: "Client has not responded to messages for 10 days while waiting for data access approval.",
    description: "I've been unable to proceed with the property valuation pipeline because the client needs to provide access to their historical sales database. I've sent 5 follow-up messages over 10 days with no response. I'm requesting admin intervention to either get the client to respond or allow me to withdraw without penalty.",
    disputeType: "communication",
    desiredResolution: "Admin contacts client to resolve communication gap, or allows withdrawal",
    evidence: [{ fileName: "message_screenshots.pdf", note: "Screenshots of 5 unresponded messages over 10 days" }],
    status: "Pending Admin",
    adminNote: null,
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "report-002", projectId: "proj-012", reporterId: "user-011",
    reportName: "Scope creep beyond original agreement",
    reason: "Client keeps adding new requirements beyond the original project scope without additional compensation.",
    description: "The original scope was a basic marketing content generator. The client has now requested: multi-language support, video script generation, SEO optimization, and social media scheduling integration. None of these were in the original requirements. I've asked twice for a scope adjustment or additional budget, but the client insists these are 'minor additions.'",
    disputeType: "financial",
    desiredResolution: "Official scope renegotiation with additional budget or removal of out-of-scope requirements",
    evidence: [{ fileName: "original_scope.pdf", note: "Original project agreement" }, { fileName: "new_requests.pdf", note: "List of additional scope requests" }],
    status: "Resolved",
    adminNote: "Resolved after scope mediation.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-05T14:00:00.000Z",
  },
  {
    id: "report-003", projectId: "proj-003", reporterId: "user-007",
    reportName: "Late milestone payment affecting project timeline",
    reason: "Milestone 2 payment is 5 days overdue, blocking work on milestone 3.",
    description: "Our contract specifies milestone payments. I completed and delivered milestone 2 on time, but the client hasn't released the milestone payment. I cannot start milestone 3 without the agreed-upon payment. The client claims 'accounting is processing it' but it's been 5 business days.",
    disputeType: "financial",
    desiredResolution: "Immediate release of milestone 2 payment so work can continue",
    evidence: [{ fileName: "milestone_schedule.pdf", note: "Agreed milestone schedule" }, { fileName: "delivery_confirmation.pdf", note: "Proof of milestone 2 delivery" }],
    status: "Pending Admin",
    adminNote: null,
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-12T10:00:00.000Z",
  },
  {
    id: "report-004", projectId: "proj-004", reporterId: "user-009",
    reportName: "AWS access revoked mid-project",
    reason: "Client accidentally revoked my AWS access, halting all infrastructure work.",
    description: "I was making good progress on the cloud ML infrastructure when my AWS IAM access was suddenly revoked. The client says it was an automated security policy change. I've been waiting 3 days for access to be restored. I can't deploy, test, or demonstrate any work without access.",
    disputeType: "other",
    desiredResolution: "Immediate restoration of AWS access with proper permissions",
    evidence: [{ fileName: "aws_error.pdf", note: "Screenshot of access denied errors" }],
    status: "Pending Admin",
    adminNote: null,
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-14T08:00:00.000Z",
  },
  {
    id: "report-005", projectId: "proj-002", reporterId: "user-008",
    reportName: "Hardware data quality issues affecting model accuracy",
    reason: "Client-provided camera hardware produces low-quality images that the model wasn't designed for.",
    description: "My CV model achieves 94% accuracy on test data, but the client's in-store cameras produce significantly lower resolution images than what was specified in the requirements. The client refuses to upgrade cameras, insisting the model should work with existing hardware.",
    disputeType: "quality",
    desiredResolution: "Either client upgrades to specified camera quality, or we adjust accuracy targets",
    evidence: [{ fileName: "image_comparison.pdf", note: "Side-by-side comparison of specified vs actual image quality" }, { fileName: "accuracy_report.pdf", note: "Model accuracy on specified vs actual hardware" }],
    status: "Resolved",
    adminNote: "After investigation, the hardware specs were indeed misrepresented. Client agreed to upgrade cameras.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-05-15T11:00:00.000Z",
  },
  {
    id: "report-006", projectId: "proj-001", reporterId: "user-009",
    reportName: "Unexpected compliance requirements delaying deployment",
    reason: "Client's legal team added SOC2 compliance requirements mid-project not in original scope.",
    description: "When I started the deployment, the client's security team flagged that the AWS architecture needs SOC2 compliance. This requires significant rearchitecture — adding WAF, CloudTrail, Config rules, and audit logging. This adds approximately 2 weeks of work beyond the original timeline.",
    disputeType: "deadline",
    desiredResolution: "2-week deadline extension and 2,000 additional budget for compliance work",
    evidence: [{ fileName: "compliance_checklist.pdf", note: "SOC2 requirements from security team" }],
    status: "Resolved",
    adminNote: "SOC2 requirements were legitimate. 2-week extension and 2,000 budget increase approved.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2024-04-10T09:00:00.000Z",
  },
  {
    id: "report-007", projectId: "proj-008", reporterId: "user-005",
    reportName: "Client unhappy with sentiment accuracy on sarcasm",
    reason: "Client claims the model 'doesn't understand sarcasm' and wants a full refund.",
    description: "The sentiment analysis pipeline achieves 92% accuracy overall, which meets our agreement (target was 90%). However, the client is specifically unhappy with sarcasm detection accuracy (75%). Sarcasm detection was listed as a 'nice-to-have stretch goal' in our contract, not a deliverable.",
    disputeType: "quality",
    desiredResolution: "Project should be accepted as meeting specs. If sarcasm detection is now required, it should be a separate Phase 2 project.",
    evidence: [{ fileName: "contract.pdf", note: "Original contract showing sarcasm as stretch goal" }, { fileName: "accuracy_report.pdf", note: "92% overall accuracy report" }],
    status: "Resolved",
    adminNote: "Project met agreed specifications. Sarcasm detection is a stretch goal per contract. No refund warranted.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-03-30T14:00:00.000Z",
  },
  {
    id: "report-008", projectId: "proj-009", reporterId: "user-010",
    reportName: "Requested additional data engineering budget",
    reason: "Data cleaning took 3x estimated time due to poor data quality not disclosed upfront.",
    description: "The client provided transaction data that was significantly dirtier than described — 40% missing values, inconsistent date formats, and duplicate records. I had to build extensive data cleaning pipelines that took 3 weeks instead of the estimated 1 week. Requesting 3,000 additional compensation.",
    disputeType: "financial",
    desiredResolution: "3,000 additional budget for data cleaning work",
    evidence: [{ fileName: "data_quality_report.pdf", note: "Initial data quality assessment vs. client description" }],
    status: "Rejected",
    adminNote: "Fraud detection data inherently requires cleaning. This was foreseeable and should have been scoped. Rejected.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-02-15T08:00:00.000Z",
  },
  {
    id: "report-009", projectId: "proj-010", reporterId: "user-012",
    reportName: "Demand for additional features outside MVP scope",
    reason: "Client wants full production features for MVP pricing.",
    description: "The client agreed to an MVP scope but is now demanding: support for 10 languages (scope was English only), mobile apps (scope was web only), and SSO integration with 5 school districts. These are clearly Phase 2 features.",
    disputeType: "financial",
    desiredResolution: "Feature requests should be scoped as Phase 2 with separate budget",
    evidence: [{ fileName: "mvp_scope.pdf", note: "Signed MVP scope document" }, { fileName: "additional_requests.pdf", note: "List of out-of-scope feature requests" }],
    status: "Rejected",
    adminNote: "MVP scope was clearly defined. These are Phase 2 features. Expert is correct.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-03-01T09:00:00.000Z",
  },
  {
    id: "report-010", projectId: "proj-005", reporterId: "user-012",
    reportName: "Client providing incorrect knowledge base format",
    reason: "The support ticket knowledge base is in a proprietary format that requires custom parsing.",
    description: "The client described their knowledge base as 'standard JSON/PDF documents' but it's actually in a proprietary CRM export format with embedded HTML, custom tags, and inconsistent structure. I need to build a custom parser, which adds about 1 week.",
    disputeType: "deadline",
    desiredResolution: "1-week deadline extension to build custom parser for proprietary data format",
    evidence: [{ fileName: "data_sample.pdf", note: "Sample of actual data format vs. described format" }],
    status: "Rejected",
    adminNote: "The expert should have requested a data sample before accepting the project. Deadline stays as-is.",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-10T15:00:00.000Z",
  },
  {
    id: "report-011", projectId: "proj-002", reporterId: "user-015",
    reportName: "Expert failed to deliver responsive layouts",
    reason: "The milestone delivery does not support mobile viewports as specified in contract.",
    description: "Expert delivered the React prototype, but it is completely broken on screens smaller than 1024px. The contract explicitly lists responsive layouts down to 320px width. I've requested revisions but Expert insists mobile support requires a budget increase.",
    disputeType: "quality",
    desiredResolution: "Expert fixes responsive layout issues without additional payment, or we terminate and refund.",
    evidence: [{ fileName: "responsive_issues.pdf", note: "Mobile view screenshots showing broken layouts" }],
    status: "Pending Admin",
    adminNote: null,
    reporterRole: "client",
    reportType: "type1",
    createdAt: "2026-06-20T10:00:00.000Z",
  },
  // ── report-012: Disputed project (proj-015) — Client reported Expert, Admin accepted ──
  {
    id: "report-012", projectId: "proj-015", reporterId: "user-017",
    reportName: "Expert deliverables do not meet medical compliance requirements",
    reason: "The scheduling AI lacks HIPAA-compliant data handling as specified in the contract.",
    description: "The delivered scheduling optimization model stores patient names and appointment times in plain text logs and transmits data without encryption. HIPAA compliance was explicitly in the requirements. I've raised this twice with the expert but received no concrete remediation plan.",
    disputeType: "quality",
    desiredResolution: "Expert implements HIPAA-compliant data handling immediately, or full refund and project termination.",
    evidence: [{ fileName: "hipaa_requirements.pdf", note: "Original contract with HIPAA requirements highlighted" }, { fileName: "security_audit.pdf", note: "Security audit showing plain-text patient data and unencrypted transmission" }],
    status: "Awaiting Expert",
    adminNote: "Report accepted by Admin. Expert has 48h to respond with explanation.",
    replyDeadline: "2026-06-30T09:00:00.000Z",
    reporterRole: "client",
    reportType: "type1",
    createdAt: "2026-06-25T14:00:00.000Z",
    acceptedAt: "2026-06-26T09:00:00.000Z",
  },
  // ── report-013: Disputed project (proj-005) — Expert reported Client, Admin accepted ──
  {
    id: "report-013", projectId: "proj-005", reporterId: "user-012",
    reportName: "Client refusing to release milestone payment after delivery approval",
    reason: "The client verbally approved milestone 2 delivery in chat but is now withholding the milestone payment, claiming the fine-tuning accuracy is 'not good enough' despite meeting our agreed 90% threshold.",
    description: "Our contract specifies 90%+ accuracy on tier-1 queries as the success criteria. My model achieved 92.3% on the blind test set. The client verbally approved the delivery in our chat, then 3 days later filed a complaint that 'the chatbot sometimes gives vague answers'. This is subjective and not covered by our quantitative success criteria.",
    disputeType: "financial",
    desiredResolution: "Release the milestone 2 payment as per our quantitative agreement, or move to binding arbitration with Admin ruling.",
    evidence: [{ fileName: "accuracy_report.pdf", note: "Blind test results showing 92.3% accuracy" }, { fileName: "chat_approval.pdf", note: "Screenshot of client verbal approval in chat" }],
    status: "Awaiting Client",
    adminNote: "Report accepted by Admin. Client has 48h to respond with explanation.",
    replyDeadline: "2026-06-29T15:00:00.000Z",
    reporterRole: "expert",
    reportType: "type2",
    createdAt: "2026-06-24T09:00:00.000Z",
    acceptedAt: "2026-06-25T15:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// 8. REVIEWS — 12 records
// ---------------------------------------------------------------------------

const _baseReviews = [
  { id: "review-001", projectId: "proj-007", reviewerId: "user-018", targetUserId: "user-011", rating: 5, comment: "Grace delivered an incredible virtual staging AI. The photorealism is stunning, and our real estate agents love it. She was responsive, professional, and actually delivered ahead of schedule. Will definitely hire again!", createdAt: "2026-05-01T10:00:00.000Z" },
  { id: "review-002", projectId: "proj-008", reviewerId: "user-020", targetUserId: "user-005", rating: 4, comment: "Alice built a solid sentiment analysis pipeline. Accuracy is good at 92% and the dashboard is intuitive. Took a bit longer than expected but the quality justifies it. Would recommend for NLP projects.", createdAt: "2026-04-01T11:00:00.000Z" },
  { id: "review-003", projectId: "proj-009", reviewerId: "user-014", targetUserId: "user-010", rating: 4, comment: "Frank is an excellent data engineer. The fraud detection pipeline handles our transaction volume effortlessly. Communication could have been more frequent, but the technical quality more than makes up for it.", createdAt: "2026-04-25T09:00:00.000Z" },
  { id: "review-004", projectId: "proj-010", reviewerId: "user-016", targetUserId: "user-012", rating: 5, comment: "Henry is the best AI expert I've worked with. The adaptive learning MVP exceeded our expectations. He thought of edge cases we hadn't even considered. The pilot schools reported 30% better student engagement. Outstanding work!", createdAt: "2026-05-15T14:00:00.000Z" },
  { id: "review-005", projectId: "proj-007", reviewerId: "user-018", targetUserId: "user-011", rating: 5, comment: "Second project with Grace — just as impressive as the first. She built mobile AI features flawlessly. Great at translating complex ML concepts into terms stakeholders understand.", createdAt: "2026-05-20T08:00:00.000Z" },
  { id: "review-006", projectId: "proj-008", reviewerId: "user-020", targetUserId: "user-005", rating: 3, comment: "The sentiment analysis works but struggles with industry-specific jargon from the marketing domain. We had to do significant post-processing. Alice was professional but the domain expertise wasn't quite there for marketing-specific language.", createdAt: "2026-04-05T13:00:00.000Z" },
  { id: "review-007", projectId: "proj-009", reviewerId: "user-014", targetUserId: "user-006", rating: 4, comment: "Bob came in as a substitute for a task mid-project and delivered solid work on the API integration layer. Good React skills and clean code. Would work with again for web development tasks.", createdAt: "2026-06-01T10:00:00.000Z" },
  { id: "review-008", projectId: "proj-010", reviewerId: "user-016", targetUserId: "user-012", rating: 5, comment: "Third project with Henry. He's become our go-to AI expert. Consistent quality, always thinks ahead about production concerns, and genuinely cares about the educational impact of his work.", createdAt: "2026-06-10T12:00:00.000Z" },
  { id: "review-009", projectId: "proj-007", reviewerId: "user-011", targetUserId: "user-018", rating: 5, comment: "Olivia is a dream client — clear requirements, prompt feedback, and reasonable expectations. She provided excellent reference images for the virtual staging styles. A pleasure to work with.", createdAt: "2026-05-02T09:00:00.000Z" },
  { id: "review-010", projectId: "proj-010", reviewerId: "user-012", targetUserId: "user-016", rating: 4, comment: "Mia has a great vision for educational technology. Sometimes the feedback cycle was slow due to her busy schedule, but she was always fair about deadlines and scope. Would collaborate again.", createdAt: "2026-05-16T10:00:00.000Z" },
  { id: "review-011", projectId: "proj-008", reviewerId: "user-005", targetUserId: "user-020", rating: 3, comment: "Quinn knows marketing well but had unrealistic expectations about sarcasm detection — that's still a research-level problem. Otherwise, the project went smoothly and requirements were clear.", createdAt: "2026-04-02T15:00:00.000Z" },
  { id: "review-012", projectId: "proj-009", reviewerId: "user-010", targetUserId: "user-014", rating: 4, comment: "Kate is a technical VP who understands the challenges. She provided clean data (mostly) and was responsive to questions. Good collaborative working relationship.", createdAt: "2026-04-26T11:00:00.000Z" },
  // ── Noah's review for David on a prior completed game AI project ──
  { id: "review-013", projectId: "proj-013", reviewerId: "user-017", targetUserId: "user-008", rating: 5, comment: "David is a rare talent who understands both ML and game development. The procedural terrain generation exceeded our art director's expectations. He delivered working UE5 integration ahead of schedule. Already planning our next project together.", createdAt: "2026-06-15T14:00:00.000Z" },
  // ── John's review of Henry on proj-005 ──
  { id: "review-014", projectId: "proj-005", reviewerId: "user-013", targetUserId: "user-012", rating: 4, comment: "Henry is doing great work on the support chatbot. His RAG architecture is solid and he's been very responsive to our feedback. The custom CRM parser he built saved us weeks of manual data cleaning. Looking forward to seeing the fine-tuned model results.", createdAt: "2026-06-18T10:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// 9. NOTIFICATIONS — 30 records
// ---------------------------------------------------------------------------

const _baseNotifications = [
  // ── Alice (user-005) ──
  { id: "notif-001", userId: "user-005", title: "Proposal Accepted!", message: "Your proposal for 'Deploy ML model on AWS' has been accepted. The client has funded escrow.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-016", createdAt: "2026-03-24T11:00:00.000Z" },
  { id: "notif-002", userId: "user-005", title: "Payment Released", message: "8,500 has been released from escrow for 'Sentiment Analysis Pipeline'.", type: "payment", isRead: true, linkTo: "/expert/wallet", createdAt: "2026-03-28T15:00:00.000Z" },
  { id: "notif-003", userId: "user-005", title: "New Job Match", message: "A new job 'AI Tutor Chatbot' matches your NLP skills. 3 experts have already applied.", type: "system", isRead: false, linkTo: "/expert/jobs/job-012", createdAt: "2026-06-15T09:00:00.000Z" },
  { id: "notif-004", userId: "user-005", title: "Withdrawal Processed", message: "Your withdrawal of $5,000 has been processed and will arrive in 2-3 business days.", type: "payment", isRead: true, linkTo: "/expert/wallet", createdAt: "2026-05-02T10:00:00.000Z" },
  // ── Bob (user-006) ──
  { id: "notif-005", userId: "user-006", title: "Proposal Declined", message: "Your proposal for 'Deploy ML model on AWS' was declined. The client chose another expert.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-017", createdAt: "2026-03-24T14:00:00.000Z" },
  { id: "notif-006", userId: "user-006", title: "Project Cancelled", message: "Project 'Property Valuation ML Pipeline' has been cancelled. Escrow will be refunded to client.", type: "system", isRead: false, linkTo: "/expert/projects/proj-011", createdAt: "2026-06-10T15:00:00.000Z" },
  { id: "notif-007", userId: "user-006", title: "Dispute Report Filed", message: "Your report 'Client unresponsive' has been submitted. An admin will review it within 48 hours.", type: "dispute", isRead: true, linkTo: "/expert/proposals/proposal-017", createdAt: "2026-06-01T09:30:00.000Z" },
  // ── Carol (user-007) ──
  { id: "notif-008", userId: "user-007", title: "Proposal Accepted!", message: "Your proposal for 'AI Tutor Chatbot' has been accepted. Escrow funded.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-020", createdAt: "2026-02-20T13:00:00.000Z" },
  { id: "notif-009", userId: "user-007", title: "New Message", message: "Paul Anderson sent you a message about the contract analysis project.", type: "message", isRead: false, linkTo: "/messenger", createdAt: "2026-06-16T08:30:00.000Z" },
  { id: "notif-010", userId: "user-007", title: "Task Approved", message: "Client approved Task 2 of 'AI Tutor Chatbot'. Proceed to Task 3.", type: "task", isRead: true, linkTo: "/expert/projects/proj-003", createdAt: "2026-03-15T14:00:00.000Z" },
  { id: "notif-011", userId: "user-007", title: "Dispute Filed", message: "Your dispute 'Late milestone payment' has been registered. Admin will respond soon.", type: "dispute", isRead: false, linkTo: "/expert/proposals/proposal-020", createdAt: "2026-06-12T10:30:00.000Z" },
  // ── David (user-008) ──
  { id: "notif-012", userId: "user-008", title: "Proposal Accepted!", message: "Your proposal for 'Retail Inventory CV System' has been accepted.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-018", createdAt: "2026-04-05T11:00:00.000Z" },
  { id: "notif-013", userId: "user-008", title: "Dispute Resolved", message: "Your dispute 'Hardware data quality' was resolved in your favor. Client will upgrade cameras.", type: "dispute", isRead: true, linkTo: "/expert/projects/proj-002", createdAt: "2026-05-20T14:00:00.000Z" },
  // ── Emma (user-009) ──
  { id: "notif-014", userId: "user-009", title: "Proposal Accepted!", message: "Your proposal for 'Cloud ML Infrastructure' has been accepted.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-023", createdAt: "2026-03-25T10:00:00.000Z" },
  { id: "notif-015", userId: "user-009", title: "Extension Approved", message: "Client approved your 2-week extension for SOC2 compliance work on 'Deploy ML Model'.", type: "extension", isRead: true, linkTo: "/expert/projects/proj-001", createdAt: "2026-04-15T09:00:00.000Z" },
  { id: "notif-016", userId: "user-009", title: "Dispute Filed", message: "Your dispute 'AWS access revoked' has been submitted. Awaiting admin review.", type: "dispute", isRead: false, linkTo: "/expert/projects/proj-004", createdAt: "2026-06-14T08:30:00.000Z" },
  // ── Frank (user-010) ──
  { id: "notif-017", userId: "user-010", title: "Payment Released", message: "$12,000 has been released for 'Fraud Detection Phase 1'.", type: "payment", isRead: true, linkTo: "/expert/wallet", createdAt: "2026-04-20T17:00:00.000Z" },
  { id: "notif-018", userId: "user-010", title: "New Job Match", message: "A new 'Real-time Transaction Analytics' job matches your data engineering skills.", type: "system", isRead: false, linkTo: "/expert/jobs/job-003", createdAt: "2026-05-22T08:00:00.000Z" },
  // ── Henry (user-012) ──
  { id: "notif-019", userId: "user-012", title: "Proposal Accepted!", message: "Your proposal for 'Support Chatbot Fine-tuning' has been accepted.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-003", createdAt: "2026-06-05T15:00:00.000Z" },
  { id: "notif-020", userId: "user-012", title: "Payment Released", message: "$10,000 has been released for 'Adaptive Learning MVP'. Great work!", type: "payment", isRead: true, linkTo: "/expert/wallet", createdAt: "2026-05-10T13:00:00.000Z" },
  { id: "notif-021", userId: "user-012", title: "Withdrawal Pending", message: "Your withdrawal request of $8,000 is being processed.", type: "payment", isRead: false, linkTo: "/expert/wallet", createdAt: "2026-06-14T08:30:00.000Z" },
  { id: "notif-022", userId: "user-012", title: "Dispute Resolved", message: "Admin rejected your extension request for 'Support Chatbot'. Deadline remains unchanged.", type: "dispute", isRead: false, linkTo: "/expert/projects/proj-005", createdAt: "2026-06-12T10:00:00.000Z" },
  // ── John (user-013, client) ──
  { id: "notif-023", userId: "user-013", title: "New Proposal Received", message: "Henry Davis submitted a proposal for 'Support Chatbot Fine-tuning'.", type: "proposal", isRead: false, linkTo: "/client/projects/proj-005/proposals", createdAt: "2026-06-05T15:00:00.000Z" },
  { id: "notif-024", userId: "user-013", title: "Expert Started Working", message: "Henry Davis has started working on 'Support Chatbot Fine-tuning'.", type: "task", isRead: true, linkTo: "/client/projects/proj-005", createdAt: "2026-06-06T09:00:00.000Z" },
  // ── Kate (user-014, client) ──
  { id: "notif-025", userId: "user-014", title: "Project Completed", message: "Fraud Detection Phase 1 has been marked as complete. Please review and release payment.", type: "task", isRead: true, linkTo: "/client/projects/proj-009", createdAt: "2026-04-20T16:00:00.000Z" },
  // ── Paul (user-019, client) ──
  { id: "notif-026", userId: "user-019", title: "Expert Assigned", message: "Carol Zhang has been assigned to your 'AI Contract Analysis' project.", type: "system", isRead: true, linkTo: "/client/projects/proj-006", createdAt: "2026-06-10T10:00:00.000Z" },
  // ── Admin notifications ──
  { id: "notif-027", userId: "user-002", title: "New Dispute Filed", message: "Expert Bob Williams filed a dispute: 'Client unresponsive — project stalled'.", type: "dispute", isRead: true, linkTo: "/admin/disputes/report-001", createdAt: "2026-06-01T09:05:00.000Z" },
  { id: "notif-028", userId: "user-002", title: "New Dispute Filed", message: "Expert Grace Kim filed a dispute: 'Scope creep beyond original agreement'.", type: "dispute", isRead: false, linkTo: "/admin/disputes/report-002", createdAt: "2026-06-05T14:05:00.000Z" },
  { id: "notif-029", userId: "user-002", title: "New Dispute Filed", message: "Expert Carol Zhang filed a dispute: 'Late milestone payment affecting project timeline'.", type: "dispute", isRead: false, linkTo: "/admin/disputes/report-003", createdAt: "2026-06-12T10:05:00.000Z" },
  { id: "notif-030", userId: "user-002", title: "New Dispute Filed", message: "Expert Emma Brown filed a dispute: 'AWS access revoked mid-project'.", type: "dispute", isRead: false, linkTo: "/admin/disputes/report-004", createdAt: "2026-06-14T08:05:00.000Z" },
  // ── Owner (user-001) ──
  { id: "notif-031", userId: "user-001", title: "Platform Growth Milestone", message: "AI Tasker has reached 20 registered users and 12 active projects! Platform is growing steadily.", type: "system", isRead: false, linkTo: "/owner/dashboard", createdAt: "2026-06-15T08:00:00.000Z" },
  { id: "notif-032", userId: "user-001", title: "New Admin Account Created", message: "Admin 'Lisa Wang' has joined the platform. Review their activity in the admin management page.", type: "system", isRead: true, linkTo: "/owner/manage-admins", createdAt: "2024-05-01T07:30:00.000Z" },
  { id: "notif-033", userId: "user-001", title: "Revenue Report Ready", message: "Monthly revenue report for June 2026 is ready. Total platform revenue: $156,500 with 8 completed projects.", type: "system", isRead: false, linkTo: "/owner/dashboard", createdAt: "2026-06-16T09:00:00.000Z" },
  // ── Admin2 (user-003) ──
  { id: "notif-034", userId: "user-003", title: "Dispute Assigned to You", message: "Dispute 'Late milestone payment affecting project timeline' has been assigned to you for review.", type: "dispute", isRead: false, linkTo: "/admin/disputes/report-003", createdAt: "2026-06-12T10:10:00.000Z" },
  { id: "notif-035", userId: "user-003", title: "Review Moderation Queue", message: "There are 3 new reviews pending moderation. Please review them within 24 hours.", type: "system", isRead: true, linkTo: "/admin/reviews", createdAt: "2026-06-10T08:00:00.000Z" },
  // ── Admin3 (user-004) ──
  { id: "notif-036", userId: "user-004", title: "User Verification Needed", message: "2 new expert profiles need verification. Check their credentials and certifications.", type: "system", isRead: false, linkTo: "/admin/users", createdAt: "2026-06-14T10:00:00.000Z" },
  { id: "notif-037", userId: "user-004", title: "Category Update Request", message: "A user suggested adding 'Reinforcement Learning' as a new skill category. Review and approve.", type: "system", isRead: true, linkTo: "/admin/category-tags", createdAt: "2026-06-08T11:00:00.000Z" },
  // ── Grace (user-011) ──
  { id: "notif-038", userId: "user-011", title: "Payment Released", message: "$16,000 has been released from escrow for 'Virtual Staging AI'. Great work!", type: "payment", isRead: true, linkTo: "/expert/wallet", createdAt: "2026-04-28T15:30:00.000Z" },
  { id: "notif-039", userId: "user-011", title: "New Message", message: "Quinn Thomas sent you a message about a potential AI mobile app project.", type: "message", isRead: false, linkTo: "/messenger", createdAt: "2026-06-16T09:30:00.000Z" },
  { id: "notif-040", userId: "user-011", title: "New Job Match", message: "A new 'AI-powered mobile marketing app' job matches your skills perfectly.", type: "system", isRead: false, linkTo: "/expert/jobs/job-010", createdAt: "2026-06-12T08:00:00.000Z" },
  // ── Liam (user-015) ──
  { id: "notif-041", userId: "user-015", title: "Expert Started Working", message: "David Park has started working on 'Retail Inventory CV System'. Track progress in project dashboard.", type: "task", isRead: true, linkTo: "/client/projects/proj-002", createdAt: "2026-04-06T09:00:00.000Z" },
  { id: "notif-042", userId: "user-015", title: "Task Completed", message: "Task 'Camera integration and data pipeline' has been marked as complete. Review and approve.", type: "task", isRead: false, linkTo: "/client/projects/proj-002", createdAt: "2026-04-20T14:00:00.000Z" },
  // ── Mia (user-016) ──
  { id: "notif-043", userId: "user-016", title: "Project Completed", message: "Adaptive Learning MVP has been completed. Please review and release payment to Henry Davis.", type: "task", isRead: true, linkTo: "/client/projects/proj-010", createdAt: "2026-05-10T12:00:00.000Z" },
  { id: "notif-044", userId: "user-016", title: "Payment Released", message: "$10,000 escrow has been released to Henry Davis for 'Adaptive Learning MVP'.", type: "payment", isRead: true, linkTo: "/client/billing", createdAt: "2026-05-10T13:00:00.000Z" },
  { id: "notif-045", userId: "user-016", title: "New Expert Available", message: "Top-rated NLP expert Carol Zhang is now available for new projects. Her rate: $110/hr.", type: "system", isRead: false, linkTo: "/client/experts/user-007", createdAt: "2026-06-14T08:00:00.000Z" },
  // ── Noah (user-017) ──
  { id: "notif-046", userId: "user-017", title: "Proposals Received", message: "You have 3 new proposals for 'AI-driven NPC behavior system'. Review them now.", type: "proposal", isRead: false, linkTo: "/client/projects/proj-006/proposals", createdAt: "2026-05-15T09:00:00.000Z" },
  { id: "notif-047", userId: "user-017", title: "Project Started", message: "Your 'Procedural Content Generation' project has been assigned to David Park. Escrow funded.", type: "system", isRead: true, linkTo: "/client/projects/proj-013", createdAt: "2026-05-20T10:00:00.000Z" },
  { id: "notif-048", userId: "user-017", title: "Handover Evidence Submitted", message: "David Park submitted handover evidence for 'PCG algorithm development'. Please review the checklist and decide.", type: "task", isRead: false, linkTo: "/client/projects/proj-013", createdAt: "2026-06-15T14:00:00.000Z" },
  // ── Olivia (user-018) ──
  { id: "notif-049", userId: "user-018", title: "Project Completed", message: "Virtual Staging AI has been completed by Grace Kim. Review the final delivery.", type: "task", isRead: true, linkTo: "/client/projects/proj-007", createdAt: "2026-04-28T14:00:00.000Z" },
  { id: "notif-050", userId: "user-018", title: "New Proposal Received", message: "Bob Williams submitted a proposal for 'ML Pipeline for Property Valuation'.", type: "proposal", isRead: true, linkTo: "/client/projects/proj-011/proposals", createdAt: "2026-05-02T09:00:00.000Z" },
  { id: "notif-051", userId: "user-018", title: "Refund Processed", message: "$14,000 has been refunded to your wallet from cancelled project 'Property Valuation ML'.", type: "payment", isRead: false, linkTo: "/client/billing", createdAt: "2026-06-10T14:45:00.000Z" },
  // ── Quinn (user-020) ──
  { id: "notif-052", userId: "user-020", title: "Payment Released", message: "$8,500 escrow has been released to Alice Johnson for 'Sentiment Analysis Pipeline'.", type: "payment", isRead: true, linkTo: "/client/billing", createdAt: "2026-03-28T14:30:00.000Z" },
  { id: "notif-053", userId: "user-020", title: "New Expert Match", message: "Grace Kim is available for your 'AI Marketing Content Generator' project. 92% skill match.", type: "system", isRead: false, linkTo: "/client/experts/user-011", createdAt: "2026-06-13T10:00:00.000Z" },
  { id: "notif-054", userId: "user-020", title: "Refund Processed", message: "$9,500 has been refunded from cancelled project 'Marketing Content Generator'.", type: "payment", isRead: false, linkTo: "/client/billing", createdAt: "2026-06-15T09:45:00.000Z" },
  // ── John (user-013) — additional ──
  { id: "notif-055", userId: "user-013", title: "New Proposals Received", message: "You have 3 new proposals for 'AI Healthcare Appointment Scheduling System'. Review them now.", type: "proposal", isRead: false, linkTo: "/client/projects/job-017/proposals", createdAt: "2026-06-14T11:00:00.000Z" },
  { id: "notif-056", userId: "user-013", title: "Project Started", message: "Alice Johnson has started working on 'Medical X-ray Classification System'. Escrow funded — track progress in your dashboard.", type: "task", isRead: false, linkTo: "/client/projects/proj-014", createdAt: "2026-06-20T14:30:00.000Z" },
  { id: "notif-057", userId: "user-013", title: "Task Completed", message: "Alice Johnson completed 'Data preprocessing and augmentation pipeline' for X-ray Classification. Review the submission.", type: "task", isRead: true, linkTo: "/client/projects/proj-014", createdAt: "2026-06-22T10:00:00.000Z" },
  { id: "notif-058", userId: "user-013", title: "Payment Confirmed", message: "$12,000 escrow deposit confirmed for 'Medical X-ray Classification System'. Funds held securely until project completion.", type: "payment", isRead: true, linkTo: "/client/billing", createdAt: "2026-06-20T14:35:00.000Z" },
  // ── Alice (user-005) — additional ──
  { id: "notif-059", userId: "user-005", title: "Proposal Accepted!", message: "Your proposal for 'Medical X-ray Classification System' has been accepted! John Smith has funded escrow. Start the project now.", type: "proposal", isRead: false, linkTo: "/expert/projects/proj-014", createdAt: "2026-06-20T14:00:00.000Z" },
  { id: "notif-060", userId: "user-005", title: "Proposal Rejected", message: "Your proposal for 'AI Fraud Detection System' was not selected. Kate Wilson chose another expert with more fraud-specific experience.", type: "proposal", isRead: true, linkTo: "/expert/proposals/proposal-007", createdAt: "2026-05-25T10:00:00.000Z" },
  { id: "notif-061", userId: "user-005", title: "New Message", message: "Quinn Thomas sent you a message about Spanish language support for the sentiment pipeline.", type: "message", isRead: false, linkTo: "/messenger", createdAt: "2026-03-03T09:05:00.000Z" },
  { id: "notif-062", userId: "user-005", title: "Task Approved", message: "John Smith approved 'Data preprocessing pipeline' for X-ray Classification. Proceed to model training.", type: "task", isRead: true, linkTo: "/expert/projects/proj-014", createdAt: "2026-06-22T11:00:00.000Z" },
  // ── Kate (user-014) — additional ──
  { id: "notif-063", userId: "user-014", title: "New Proposals Received", message: "You have 3 new proposals for 'Real-time Risk Assessment Dashboard'. Review them now.", type: "proposal", isRead: false, linkTo: "/client/projects/job-018/proposals", createdAt: "2026-06-17T16:00:00.000Z" },
  { id: "notif-064", userId: "user-014", title: "Task Completed", message: "Emma Brown completed 'CI/CD pipeline' for AWS ML Deployment. Review and approve the submission.", type: "task", isRead: true, linkTo: "/client/projects/proj-001", createdAt: "2026-06-18T15:00:00.000Z" },
  { id: "notif-065", userId: "user-014", title: "Milestone Reached", message: "Cloud ML Infrastructure project has reached 75% completion. $3,200 in projected monthly savings confirmed.", type: "system", isRead: false, linkTo: "/client/projects/proj-004", createdAt: "2026-06-20T08:00:00.000Z" },
  { id: "notif-066", userId: "user-014", title: "Payment Released", message: "$12,000 escrow has been released to Frank Mueller for 'Fraud Detection Phase 1'.", type: "payment", isRead: true, linkTo: "/client/billing", createdAt: "2026-04-20T16:30:00.000Z" },
  // ── proj-016: Risk Dashboard (Bob for Kate) — final delivery test scenario ──
  { id: "notif-067", userId: "user-014", title: "Project Started", message: "Bob Williams has started working on 'Risk Assessment Dashboard'. Escrow funded — track progress in your dashboard.", type: "task", isRead: true, linkTo: "/client/projects/proj-016", createdAt: "2026-06-18T09:30:00.000Z" },
  { id: "notif-068", userId: "user-014", title: "Final Delivery Submitted", message: "Bob Williams has submitted the final project deliverables for 'Risk Assessment Dashboard'. View and accept the delivery to release payment.", type: "task", isRead: false, linkTo: "/client/projects/proj-016", createdAt: "2026-06-27T10:00:00.000Z" },
  { id: "notif-069", userId: "user-006", title: "Proposal Accepted!", message: "Your proposal for 'Risk Assessment Dashboard' has been accepted! Kate Wilson has funded escrow. Start the project now.", type: "proposal", isRead: true, linkTo: "/expert/projects/proj-016", createdAt: "2026-06-18T09:00:00.000Z" },
  { id: "notif-070", userId: "user-006", title: "All Tasks Completed", message: "All tasks for 'Risk Assessment Dashboard' are done. Submit the final project delivery to complete.", type: "task", isRead: false, linkTo: "/expert/projects/proj-016", createdAt: "2026-06-26T15:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// 10. MESSAGES — 20 records
// ---------------------------------------------------------------------------

const _baseMessages = [
  // ── Thread: proj-005, John (user-013) ↔ Henry (user-012) ──
  { id: "msg-001", senderId: "user-013", receiverId: "user-012", projectId: "proj-005", content: "Hi Henry, excited to work with you! I've uploaded the knowledge base to the shared drive. Let me know if you have any questions about the ticket categorization system.", isRead: true, createdAt: "2026-06-06T09:00:00.000Z" },
  { id: "msg-002", senderId: "user-012", receiverId: "user-013", projectId: "proj-005", content: "Thanks John! I've reviewed the knowledge base — very comprehensive. I notice the tickets use a custom CRM format. Do you have an API for extracting them or should I build a custom parser?", isRead: true, createdAt: "2026-06-06T10:30:00.000Z" },
  { id: "msg-003", senderId: "user-013", receiverId: "user-012", projectId: "proj-005", content: "The CRM has a REST API — I'll send you the API keys. It should be straightforward to export in JSON format.", isRead: true, createdAt: "2026-06-06T11:00:00.000Z" },
  { id: "msg-004", senderId: "user-012", receiverId: "user-013", projectId: "proj-005", content: "The API's JSON output has a lot of embedded HTML in the ticket bodies. I'll need to build an HTML stripper as well. This adds some complexity but I'll handle it. ETA for prototype: end of this week.", isRead: true, createdAt: "2026-06-07T08:00:00.000Z" },
  { id: "msg-005", senderId: "user-013", receiverId: "user-012", projectId: "proj-005", content: "Understandable. If you need an extra week for the parser, that's fine — let's keep quality as priority.", isRead: false, createdAt: "2026-06-07T14:00:00.000Z" },
  // ── Thread: proj-006, Paul (user-019) ↔ Carol (user-007) ──
  { id: "msg-006", senderId: "user-019", receiverId: "user-007", projectId: "proj-006", content: "Hi Carol, I've uploaded 50 sample contracts in the shared folder — these cover the main contract types we need analyzed.", isRead: true, createdAt: "2026-06-10T10:00:00.000Z" },
  { id: "msg-007", senderId: "user-007", receiverId: "user-019", projectId: "proj-006", content: "Thanks Paul! Quick question: should the tool handle scanned/image-based PDFs (requiring OCR) or just born-digital documents?", isRead: true, createdAt: "2026-06-10T14:00:00.000Z" },
  { id: "msg-008", senderId: "user-019", receiverId: "user-007", projectId: "proj-006", content: "About 30% of our contracts are scanned. If OCR adds too much time, we can handle those separately for now and focus on digital-first.", isRead: true, createdAt: "2026-06-11T09:00:00.000Z" },
  { id: "msg-009", senderId: "user-007", receiverId: "user-019", projectId: "proj-006", content: "I'd recommend Phase 1: digital documents only (faster delivery, higher accuracy). Phase 2: add OCR support for scanned docs.", isRead: false, createdAt: "2026-06-11T11:00:00.000Z" },
  // ── Thread: proj-001, Kate (user-014) ↔ Emma (user-009) ──
  { id: "msg-010", senderId: "user-009", receiverId: "user-014", projectId: "proj-001", content: "Kate, the Kubernetes cluster is set up and auto-scaling is configured. I'm starting on the model serving layer now. Quick demo available if you want to see progress.", isRead: true, createdAt: "2026-04-01T10:00:00.000Z" },
  { id: "msg-011", senderId: "user-014", receiverId: "user-009", projectId: "proj-001", content: "Great progress, Emma! Yes, I'd love a quick demo. Also, our security team just flagged SOC2 requirements — can we discuss the implications tomorrow?", isRead: true, createdAt: "2026-04-01T15:00:00.000Z" },
  { id: "msg-012", senderId: "user-009", receiverId: "user-014", projectId: "proj-001", content: "SOC2 compliance will require additional architecture work — WAF, CloudTrail, audit logging. I've prepared a scope document.", isRead: true, createdAt: "2026-04-02T08:00:00.000Z" },
  // ── Thread: proj-002, Liam (user-015) ↔ David (user-008) ──
  { id: "msg-013", senderId: "user-008", receiverId: "user-015", projectId: "proj-002", content: "Liam, I've set up the first store's camera feeds and the object detection is working. However, the image quality from your cameras is lower than expected. Can we discuss?", isRead: true, createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "msg-014", senderId: "user-015", receiverId: "user-008", projectId: "proj-002", content: "What quality are you getting? We installed these cameras last year specifically for this kind of application. They should be 1080p.", isRead: true, createdAt: "2026-05-01T11:00:00.000Z" },
  { id: "msg-015", senderId: "user-008", receiverId: "user-015", projectId: "proj-002", content: "The feeds are actually 720p with significant compression artifacts. I've attached comparisons. At 720p, SKU recognition drops to ~82% vs 94% at 1080p.", isRead: true, createdAt: "2026-05-01T14:00:00.000Z" },
  // ── General thread (no project) — Grace (user-011) ↔ Quinn (user-020) ──
  { id: "msg-016", senderId: "user-020", receiverId: "user-011", projectId: null, content: "Hi Grace, I saw your portfolio — your mobile AI work is impressive. We might have a project coming up for an AI-powered mobile marketing app. Would you be interested?", isRead: true, createdAt: "2026-06-15T10:00:00.000Z" },
  { id: "msg-017", senderId: "user-011", receiverId: "user-020", projectId: null, content: "Hi Quinn, definitely interested! I love combining mobile dev with AI. Could you share more about the project scope? I'd be happy to put together an initial proposal.", isRead: true, createdAt: "2026-06-15T14:00:00.000Z" },
  { id: "msg-018", senderId: "user-020", receiverId: "user-011", projectId: null, content: "We're looking at an AI content assistant for our mobile app — personalized push notifications, in-app content recommendations, and visual search. Budget around $12-15K.", isRead: false, createdAt: "2026-06-16T09:00:00.000Z" },
  // ── Admin communication ──
  { id: "msg-019", senderId: "user-002", receiverId: "user-006", projectId: "proj-011", content: "Hi Bob, I'm reviewing your dispute about client unresponsiveness. I've sent a notice to Olivia. Please give her 48 more hours to respond before we take further action.", isRead: true, createdAt: "2026-06-02T10:00:00.000Z" },
  { id: "msg-020", senderId: "user-006", receiverId: "user-002", projectId: "proj-011", content: "Thank you Sarah, I appreciate the quick response. I'll wait for the 48-hour window.", isRead: true, createdAt: "2026-06-02T11:00:00.000Z" },
  // ── Thread: proj-010, Mia (user-016) ↔ Henry (user-012) ──
  { id: "msg-021", senderId: "user-016", receiverId: "user-012", projectId: "proj-010", content: "Henry, the pilot schools are reporting great results! Student engagement is up 30%. Can we discuss Phase 2 features?", isRead: true, createdAt: "2026-05-20T09:00:00.000Z" },
  { id: "msg-022", senderId: "user-012", receiverId: "user-016", projectId: "proj-010", content: "That's wonderful to hear Mia! I'd love to discuss Phase 2. I've prepared a scope document with multi-language support and mobile apps as we discussed.", isRead: true, createdAt: "2026-05-20T10:30:00.000Z" },
  { id: "msg-023", senderId: "user-016", receiverId: "user-012", projectId: "proj-010", content: "Perfect! Let's schedule a call next week to go through the scope. Budget for Phase 2 is approved at $25K.", isRead: false, createdAt: "2026-05-21T14:00:00.000Z" },
  // ── Thread: proj-011, Olivia (user-018) ↔ Bob (user-006) ──
  { id: "msg-024", senderId: "user-018", receiverId: "user-006", projectId: "proj-011", content: "Bob, I've requested database access from our IT team. They said it should be ready by end of week. Apologies for the delay.", isRead: true, createdAt: "2026-05-15T09:00:00.000Z" },
  { id: "msg-025", senderId: "user-006", receiverId: "user-018", projectId: "proj-011", content: "Thanks Olivia. I'll start on the ETL pipeline design in the meantime. Can you share the database schema documentation so I can prepare?", isRead: true, createdAt: "2026-05-15T11:00:00.000Z" },
  { id: "msg-026", senderId: "user-018", receiverId: "user-006", projectId: "proj-011", content: "I've uploaded the schema docs to the shared drive. Let me know if you need anything else to get started.", isRead: false, createdAt: "2026-05-16T08:00:00.000Z" },
  // ── Thread: proj-013, Noah (user-017) ↔ David (user-008) ──
  { id: "msg-027", senderId: "user-017", receiverId: "user-008", projectId: "proj-013", content: "David, excited to have you on the procedural content generation project! I've shared our game design doc — it outlines the terrain types and biome rules.", isRead: true, createdAt: "2026-05-21T10:00:00.000Z" },
  { id: "msg-028", senderId: "user-008", receiverId: "user-017", projectId: "proj-013", content: "Thanks Noah! The design doc is really detailed. I'm thinking a WaveFunctionCollapse algorithm for terrain and L-systems for vegetation. Does that align with your engine?", isRead: true, createdAt: "2026-05-21T14:00:00.000Z" },
  { id: "msg-029", senderId: "user-017", receiverId: "user-008", projectId: "proj-013", content: "WFC is perfect — we already have tile sets ready. For L-systems, our engine supports them natively. Can't wait to see the first terrain prototypes!", isRead: false, createdAt: "2026-05-22T09:00:00.000Z" },
  // ── Thread: proj-008, Alice (user-005) ↔ Quinn (user-020) ──
  { id: "msg-030", senderId: "user-005", receiverId: "user-020", projectId: "proj-008", content: "Quinn, the sentiment pipeline is processing 10K+ mentions per day now. I've added trend detection — it surfaced an emerging PR issue yesterday that your team caught early.", isRead: true, createdAt: "2026-03-01T10:00:00.000Z" },
  { id: "msg-031", senderId: "user-020", receiverId: "user-005", projectId: "proj-008", content: "That trend detection feature already paid for itself — we caught a competitor's negative campaign before it gained traction. Can you add Spanish language support as a next step?", isRead: true, createdAt: "2026-03-02T14:00:00.000Z" },
  { id: "msg-032", senderId: "user-005", receiverId: "user-020", projectId: "proj-008", content: "Spanish support is definitely doable with multilingual BERT. I'll scope it as a Phase 2 add-on — about 2 weeks of work for training and validation on Spanish social media data.", isRead: false, createdAt: "2026-03-03T09:00:00.000Z" },
  // ── Thread: proj-014, Alice (user-005) ↔ John (user-013) ──
  { id: "msg-033", senderId: "user-013", receiverId: "user-005", projectId: "proj-014", content: "Hi Alice, really excited to work with you on the X-ray classification project! I've uploaded 10K annotated chest X-rays from our PACS system to the shared drive.", isRead: true, createdAt: "2026-06-20T10:30:00.000Z" },
  { id: "msg-034", senderId: "user-005", receiverId: "user-013", projectId: "proj-014", content: "Thanks John! The data quality looks excellent — DICOM headers are clean and annotations are consistent. I've started the preprocessing pipeline. Quick question: should the system prioritize sensitivity (fewer false negatives) or specificity?", isRead: true, createdAt: "2026-06-20T14:00:00.000Z" },
  { id: "msg-035", senderId: "user-013", receiverId: "user-005", projectId: "proj-014", content: "Definitely sensitivity for now — we want to catch everything and let radiologists rule out false positives. 95%+ sensitivity is our clinical requirement. The radiologist team is available for validation consults if you need them.", isRead: false, createdAt: "2026-06-21T09:00:00.000Z" },
  // ── Thread: proj-004, Kate (user-014) ↔ Emma (user-009) ──
  { id: "msg-036", senderId: "user-014", receiverId: "user-009", projectId: "proj-004", content: "Emma, the cost optimization report looks promising! 45% savings would be huge for our board presentation. Can we expedite the feature store setup?", isRead: true, createdAt: "2026-04-25T10:00:00.000Z" },
  { id: "msg-037", senderId: "user-009", receiverId: "user-014", projectId: "proj-004", content: "Absolutely Kate — I've prioritized the Feast deployment this week. Quick update: the spot instance strategy is working well, we're already seeing a 38% cost reduction in training jobs.", isRead: true, createdAt: "2026-04-25T15:00:00.000Z" },
  { id: "msg-038", senderId: "user-014", receiverId: "user-009", projectId: "proj-004", content: "That's fantastic news! Please include those real savings numbers in the final documentation — the CFO will want to see concrete ROI before approving Phase 2 budget.", isRead: false, createdAt: "2026-04-26T08:00:00.000Z" },
  // ── Thread: proj-016, Kate (user-014) ↔ Bob (user-006) ──
  { id: "msg-039", senderId: "user-014", receiverId: "user-006", projectId: "proj-016", content: "Hi Bob, really looking forward to the risk dashboard! Our fraud analysts currently use a clunky internal tool — this will be a game-changer for them.", isRead: true, createdAt: "2026-06-18T10:00:00.000Z" },
  { id: "msg-040", senderId: "user-006", receiverId: "user-014", projectId: "proj-016", content: "Thanks Kate! I've started on the WebSocket integration to your fraud detection API. The real-time data pipeline is looking solid — sub-100ms latency on the feed.", isRead: true, createdAt: "2026-06-19T14:00:00.000Z" },
  { id: "msg-041", senderId: "user-014", receiverId: "user-006", projectId: "proj-016", content: "Great progress! The drill-down on individual transactions is the feature our analysts are most excited about. Let me know when you have a preview ready.", isRead: true, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "msg-042", senderId: "user-006", receiverId: "user-014", projectId: "proj-016", content: "All tasks are done and I've just submitted the final deliverables! View them at the project dashboard — the source code zip is also attached. Let me know if anything needs tweaking before you release payment.", isRead: false, createdAt: "2026-06-27T10:15:00.000Z" },
];

// ---------------------------------------------------------------------------
// 11. TASKS / TIMELINE — 30 records
// ---------------------------------------------------------------------------

const _baseTasks = [
  // ── proj-001: AWS Deploy (4 tasks) ──
  { id: "task-001", projectId: "proj-001", title: "Kubernetes cluster setup", description: "Set up EKS cluster with node groups, networking, and IAM roles", status: "completed", assignedTo: "user-009", approval: "Approved", deadline: "2026-04-01T00:00:00.000Z", createdAt: "2026-03-24T10:00:00.000Z", miniTasks: [{ id: "mt-001", title: "Provision EKS cluster", description: "Create EKS cluster with appropriate instance types", status: "done", order: 1 }, { id: "mt-002", title: "Configure VPC networking", description: "Set up VPC, subnets, and security groups", status: "done", order: 2 }, { id: "mt-003", title: "Set up IAM roles", description: "Create service accounts and IAM roles for pods", status: "done", order: 3 }] },
  { id: "task-002", projectId: "proj-001", title: "Model serving infrastructure", description: "Deploy KFServing with model versioning and traffic splitting", status: "completed", assignedTo: "user-009", approval: "Approved", deadline: "2026-04-15T00:00:00.000Z", createdAt: "2026-04-02T09:00:00.000Z", miniTasks: [{ id: "mt-004", title: "Install KFServing", description: "Deploy KFServing on EKS cluster", status: "done", order: 1 }, { id: "mt-005", title: "Configure model registry", description: "Set up model versioning in S3", status: "done", order: 2 }, { id: "mt-006", title: "Set up traffic splitting", description: "Configure Istio for A/B testing", status: "done", order: 3 }, { id: "mt-007", title: "Deploy first model version", description: "Deploy v1 of the PyTorch model", status: "done", order: 4 }] },
  { id: "task-003", projectId: "proj-001", title: "Monitoring and alerting", description: "Set up Prometheus, Grafana, and CloudWatch dashboards", status: "in_progress", assignedTo: "user-009", approval: null, deadline: "2026-05-01T00:00:00.000Z", createdAt: "2026-04-16T10:00:00.000Z", miniTasks: [{ id: "mt-008", title: "Deploy Prometheus", description: "Install Prometheus for metrics collection", status: "done", order: 1 }, { id: "mt-009", title: "Create Grafana dashboards", description: "Design monitoring dashboards", status: "in_progress", order: 2 }, { id: "mt-010", title: "Configure alerts", description: "Set up alert rules for latency and errors", status: "pending", order: 3 }] },
  { id: "task-004", projectId: "proj-001", title: "CI/CD pipeline", description: "Build GitOps pipeline with ArgoCD for model updates", status: "pending", assignedTo: "user-009", approval: null, deadline: "2026-05-15T00:00:00.000Z", createdAt: "2026-04-20T08:00:00.000Z", miniTasks: [{ id: "mt-011", title: "Set up GitHub Actions", description: "Create CI workflow for testing", status: "pending", order: 1 }, { id: "mt-012", title: "Install ArgoCD", description: "Deploy ArgoCD for GitOps", status: "pending", order: 2 }, { id: "mt-013", title: "Create deployment pipeline", description: "End-to-end pipeline from commit to deploy", status: "pending", order: 3 }] },
  // ── proj-002: Retail CV (3 tasks) ──
  { id: "task-005", projectId: "proj-002", title: "Camera integration and data pipeline", description: "Set up camera feeds and image preprocessing pipeline", status: "completed", assignedTo: "user-008", approval: "Approved", deadline: "2026-04-20T00:00:00.000Z", createdAt: "2026-04-05T10:00:00.000Z", miniTasks: [{ id: "mt-014", title: "Camera API integration", description: "Connect to store camera systems", status: "done", order: 1 }, { id: "mt-015", title: "Image preprocessing", description: "Build normalization and augmentation pipeline", status: "done", order: 2 }, { id: "mt-016", title: "Data validation", description: "Validate image quality and format", status: "done", order: 3 }] },
  { id: "task-006", projectId: "proj-002", title: "Object detection model", description: "Train and evaluate YOLOv8 for product detection", status: "in_progress", assignedTo: "user-008", approval: null, deadline: "2026-05-15T00:00:00.000Z", createdAt: "2026-04-21T09:00:00.000Z", miniTasks: [{ id: "mt-017", title: "Data annotation", description: "Label 5000 product images", status: "done", order: 1 }, { id: "mt-018", title: "Model training", description: "Train YOLOv8 on labeled data", status: "done", order: 2 }, { id: "mt-019", title: "Model evaluation", description: "Evaluate mAP and precision/recall", status: "in_progress", order: 3 }, { id: "mt-020", title: "Model optimization", description: "Optimize for edge deployment", status: "pending", order: 4 }] },
  { id: "task-007", projectId: "proj-002", title: "Dashboard and alerting", description: "Build store manager dashboard with inventory alerts", status: "pending", assignedTo: "user-008", approval: null, deadline: "2026-06-15T00:00:00.000Z", createdAt: "2026-05-10T08:00:00.000Z", miniTasks: [{ id: "mt-021", title: "React dashboard", description: "Build inventory monitoring UI", status: "pending", order: 1 }, { id: "mt-022", title: "Alert system", description: "Low stock and misplaced item alerts", status: "pending", order: 2 }] },
  // ── proj-003: AI Tutor (3 tasks) ──
  { id: "task-008", projectId: "proj-003", title: "Curriculum integration", description: "Ingest and structure curriculum content for RAG", status: "completed", assignedTo: "user-007", approval: "Approved", deadline: "2026-03-01T00:00:00.000Z", createdAt: "2026-02-20T12:00:00.000Z", miniTasks: [{ id: "mt-023", title: "Content parsing", description: "Parse curriculum PDFs and docs", status: "done", order: 1 }, { id: "mt-024", title: "Chunking strategy", description: "Design document chunking for RAG", status: "done", order: 2 }, { id: "mt-025", title: "Vector embedding", description: "Generate and store embeddings", status: "done", order: 3 }] },
  { id: "task-009", projectId: "proj-003", title: "Conversational AI engine", description: "Build RAG-based tutoring conversation system", status: "completed", assignedTo: "user-007", approval: "Approved", deadline: "2026-03-20T00:00:00.000Z", createdAt: "2026-03-02T09:00:00.000Z", miniTasks: [{ id: "mt-026", title: "LLM integration", description: "Set up LLM with RAG pipeline", status: "done", order: 1 }, { id: "mt-027", title: "Socratic questioning", description: "Implement guided questioning patterns", status: "done", order: 2 }, { id: "mt-028", title: "Code review system", description: "Build code analysis and feedback", status: "done", order: 3 }, { id: "mt-029", title: "Exercise generator", description: "Auto-generate practice problems", status: "done", order: 4 }] },
  { id: "task-010", projectId: "proj-003", title: "Student progress tracking", description: "Build knowledge tracing and analytics", status: "in_progress", assignedTo: "user-007", approval: null, deadline: "2026-04-10T00:00:00.000Z", createdAt: "2026-03-21T10:00:00.000Z", miniTasks: [{ id: "mt-030", title: "Knowledge tracing model", description: "Implement BKT model", status: "done", order: 1 }, { id: "mt-031", title: "Progress dashboard", description: "Student and teacher analytics", status: "in_progress", order: 2 }, { id: "mt-032", title: "Adaptive difficulty", description: "Adjust content based on performance", status: "pending", order: 3 }] },
  // ── proj-004: Cloud ML Infra (4 tasks) ──
  { id: "task-011", projectId: "proj-004", title: "Cost analysis and architecture design", description: "Analyze current costs and design target architecture", status: "completed", assignedTo: "user-009", approval: "Approved", deadline: "2026-04-05T00:00:00.000Z", createdAt: "2026-03-25T09:00:00.000Z", miniTasks: [{ id: "mt-033", title: "Current cost audit", description: "Analyze existing AWS spend", status: "done", order: 1 }, { id: "mt-034", title: "Architecture design", description: "Design optimized architecture", status: "done", order: 2 }, { id: "mt-035", title: "Cost projection", description: "Project savings with new architecture", status: "done", order: 3 }] },
  { id: "task-012", projectId: "proj-004", title: "Spot instance strategy", description: "Implement Karpenter for intelligent spot management", status: "completed", assignedTo: "user-009", approval: "Approved", deadline: "2026-04-20T00:00:00.000Z", createdAt: "2026-04-06T10:00:00.000Z", miniTasks: [{ id: "mt-036", title: "Karpenter deployment", description: "Install and configure Karpenter", status: "done", order: 1 }, { id: "mt-037", title: "Spot instance policies", description: "Define spot fallback policies", status: "done", order: 2 }, { id: "mt-038", title: "Testing and validation", description: "Validate spot instance handling", status: "done", order: 3 }] },
  { id: "task-013", projectId: "proj-004", title: "Feature store and model registry", description: "Set up Feast feature store and MLflow registry", status: "in_progress", assignedTo: "user-009", approval: null, deadline: "2026-05-10T00:00:00.000Z", createdAt: "2026-04-21T08:00:00.000Z", miniTasks: [{ id: "mt-039", title: "Feast deployment", description: "Deploy Feast on EKS", status: "done", order: 1 }, { id: "mt-040", title: "MLflow setup", description: "Set up MLflow tracking server", status: "in_progress", order: 2 }, { id: "mt-041", title: "Integration testing", description: "Test feature serving latency", status: "pending", order: 3 }, { id: "mt-042", title: "Documentation", description: "Write setup and usage docs", status: "pending", order: 4 }] },
  // ── proj-005: Support Chatbot (3 tasks) ──
  { id: "task-014", projectId: "proj-005", title: "Knowledge base processing", description: "Extract and structure support ticket knowledge base", status: "in_progress", assignedTo: "user-012", approval: null, deadline: "2026-06-20T00:00:00.000Z", createdAt: "2026-06-05T15:00:00.000Z", miniTasks: [{ id: "mt-043", title: "CRM API extraction", description: "Pull data from CRM API", status: "done", order: 1 }, { id: "mt-044", title: "HTML stripping", description: "Clean embedded HTML from tickets", status: "done", order: 2 }, { id: "mt-045", title: "Content chunking", description: "Chunk tickets for RAG retrieval", status: "in_progress", order: 3 }, { id: "mt-046", title: "Vector embedding", description: "Generate embeddings for search", status: "pending", order: 4 }] },
  { id: "task-015", projectId: "proj-005", title: "Model fine-tuning", description: "Fine-tune LLM on support domain data", status: "pending", assignedTo: "user-012", approval: null, deadline: "2026-07-01T00:00:00.000Z", createdAt: "2026-06-05T15:00:00.000Z", miniTasks: [{ id: "mt-047", title: "Base model selection", description: "Evaluate and select base LLM", status: "pending", order: 1 }, { id: "mt-048", title: "Fine-tuning run", description: "Fine-tune on domain data", status: "pending", order: 2 }, { id: "mt-049", title: "Evaluation", description: "Measure accuracy on test queries", status: "pending", order: 3 }] },
  { id: "task-016", projectId: "proj-005", title: "Chat interface and deployment", description: "Build chat widget and deploy to production", status: "pending", assignedTo: "user-012", approval: null, deadline: "2026-07-10T00:00:00.000Z", createdAt: "2026-06-05T15:00:00.000Z", miniTasks: [{ id: "mt-050", title: "Chat UI", description: "Build customer-facing chat widget", status: "pending", order: 1 }, { id: "mt-051", title: "Escalation logic", description: "Implement human escalation flow", status: "pending", order: 2 }, { id: "mt-052", title: "Deployment", description: "Deploy to production environment", status: "pending", order: 3 }] },
  // ── proj-006: Contract Analysis (3 tasks) ──
  { id: "task-017", projectId: "proj-006", title: "Document processing pipeline", description: "Build PDF parsing and text extraction pipeline", status: "in_progress", assignedTo: "user-007", approval: null, deadline: "2026-06-25T00:00:00.000Z", createdAt: "2026-06-10T10:00:00.000Z", miniTasks: [{ id: "mt-053", title: "PDF parser", description: "Build digital PDF text extraction", status: "done", order: 1 }, { id: "mt-054", title: "Document structure analysis", description: "Identify sections and clauses", status: "in_progress", order: 2 }, { id: "mt-055", title: "Entity extraction", description: "Extract parties, dates, amounts", status: "pending", order: 3 }] },
  { id: "task-018", projectId: "proj-006", title: "Clause classification model", description: "Train NLP model to classify contract clauses", status: "pending", assignedTo: "user-007", approval: null, deadline: "2026-07-15T00:00:00.000Z", createdAt: "2026-06-10T10:00:00.000Z", miniTasks: [{ id: "mt-056", title: "Annotation guidelines", description: "Create clause annotation schema", status: "pending", order: 1 }, { id: "mt-057", title: "Model training", description: "Fine-tune legal BERT model", status: "pending", order: 2 }, { id: "mt-058", title: "Evaluation", description: "Evaluate on test set (target 95%)", status: "pending", order: 3 }] },
  { id: "task-019", projectId: "proj-006", title: "Risk analysis and reporting", description: "Build risk scoring and summary generation", status: "pending", assignedTo: "user-007", approval: null, deadline: "2026-08-01T00:00:00.000Z", createdAt: "2026-06-10T10:00:00.000Z", miniTasks: [{ id: "mt-059", title: "Risk scoring model", description: "Define and implement risk metrics", status: "pending", order: 1 }, { id: "mt-060", title: "Summary generation", description: "Generate risk summary reports", status: "pending", order: 2 }] },
  // ── proj-007: Virtual Staging (completed, 2 tasks) ──
  { id: "task-020", projectId: "proj-007", title: "Generative model development", description: "Build GAN-based virtual staging model", status: "completed", assignedTo: "user-011", approval: "Approved", deadline: "2026-02-01T00:00:00.000Z", createdAt: "2025-12-01T10:00:00.000Z", miniTasks: [{ id: "mt-061", title: "Data collection", description: "Gather room and furniture datasets", status: "done", order: 1 }, { id: "mt-062", title: "Model architecture", description: "Design GAN architecture", status: "done", order: 2 }, { id: "mt-063", title: "Training", description: "Train on 50K room images", status: "done", order: 3 }, { id: "mt-064", title: "Style control", description: "Add style conditioning", status: "done", order: 4 }] },
  { id: "task-021", projectId: "proj-007", title: "Web application", description: "Build agent-facing web interface", status: "completed", assignedTo: "user-011", approval: "Approved", deadline: "2026-03-15T00:00:00.000Z", createdAt: "2026-02-02T09:00:00.000Z", miniTasks: [{ id: "mt-065", title: "React frontend", description: "Build upload and preview UI", status: "done", order: 1 }, { id: "mt-066", title: "API integration", description: "Connect frontend to model API", status: "done", order: 2 }, { id: "mt-067", title: "Image processing", description: "Add result download and sharing", status: "done", order: 3 }] },
  // ── proj-008: Sentiment Analysis (completed, 2 tasks) ──
  { id: "task-022", projectId: "proj-008", title: "Data collection and annotation", description: "Gather social media data and annotate sentiment", status: "completed", assignedTo: "user-005", approval: "Approved", deadline: "2026-02-01T00:00:00.000Z", createdAt: "2026-01-15T11:00:00.000Z", miniTasks: [{ id: "mt-068", title: "API integration", description: "Connect to Twitter/Reddit APIs", status: "done", order: 1 }, { id: "mt-069", title: "Data labeling", description: "Annotate 20K posts for sentiment", status: "done", order: 2 }, { id: "mt-070", title: "Data validation", description: "Validate annotation quality", status: "done", order: 3 }] },
  { id: "task-023", projectId: "proj-008", title: "Model training and deployment", description: "Train sentiment model and deploy dashboard", status: "completed", assignedTo: "user-005", approval: "Approved", deadline: "2026-03-15T00:00:00.000Z", createdAt: "2026-02-02T10:00:00.000Z", miniTasks: [{ id: "mt-071", title: "Model training", description: "Fine-tune BERT for sentiment", status: "done", order: 1 }, { id: "mt-072", title: "Trend detection", description: "Add emerging trend identification", status: "done", order: 2 }, { id: "mt-073", title: "Dashboard", description: "Build analytics dashboard", status: "done", order: 3 }, { id: "mt-074", title: "Deployment", description: "Deploy to production", status: "done", order: 4 }] },
  // ── proj-009: Fraud Detection (completed, 2 tasks) ──
  { id: "task-024", projectId: "proj-009", title: "Data pipeline engineering", description: "Build streaming data pipeline for transactions", status: "completed", assignedTo: "user-010", approval: "Approved", deadline: "2026-02-15T00:00:00.000Z", createdAt: "2026-01-20T09:00:00.000Z", miniTasks: [{ id: "mt-075", title: "Data cleaning", description: "Handle missing values and duplicates", status: "done", order: 1 }, { id: "mt-076", title: "Feature engineering", description: "Create transaction features", status: "done", order: 2 }, { id: "mt-077", title: "Streaming pipeline", description: "Set up real-time data pipeline", status: "done", order: 3 }] },
  { id: "task-025", projectId: "proj-009", title: "Fraud detection models", description: "Train anomaly detection and classification models", status: "completed", assignedTo: "user-010", approval: "Approved", deadline: "2026-04-01T00:00:00.000Z", createdAt: "2026-02-16T08:00:00.000Z", miniTasks: [{ id: "mt-078", title: "Anomaly detection", description: "Build isolation forest model", status: "done", order: 1 }, { id: "mt-079", title: "Classification model", description: "Train fraud classifier", status: "done", order: 2 }, { id: "mt-080", title: "Model evaluation", description: "Evaluate on historical data", status: "done", order: 3 }, { id: "mt-081", title: "XAI dashboard", description: "Build explainability dashboard", status: "done", order: 4 }] },
  // ── proj-010: Adaptive Learning (completed, 2 tasks) ──
  { id: "task-026", projectId: "proj-010", title: "Knowledge tracing system", description: "Build Bayesian Knowledge Tracing for student modeling", status: "completed", assignedTo: "user-012", approval: "Approved", deadline: "2026-03-01T00:00:00.000Z", createdAt: "2026-02-01T10:00:00.000Z", miniTasks: [{ id: "mt-082", title: "BKT implementation", description: "Implement Bayesian Knowledge Tracing", status: "done", order: 1 }, { id: "mt-083", title: "Student modeling", description: "Build student skill profiles", status: "done", order: 2 }, { id: "mt-084", title: "Validation", description: "Validate against student data", status: "done", order: 3 }] },
  { id: "task-027", projectId: "proj-010", title: "NLP essay grading", description: "Build automated essay scoring system", status: "completed", assignedTo: "user-012", approval: "Approved", deadline: "2026-04-01T00:00:00.000Z", createdAt: "2026-03-02T09:00:00.000Z", miniTasks: [{ id: "mt-085", title: "Rubric design", description: "Define scoring rubrics", status: "done", order: 1 }, { id: "mt-086", title: "Grading model", description: "Fine-tune for essay scoring", status: "done", order: 2 }, { id: "mt-087", title: "Feedback generation", description: "Generate detailed feedback", status: "done", order: 3 }] },
  // ── proj-011: Property Valuation (cancelled, 1 task) ──
  { id: "task-028", projectId: "proj-011", title: "Data infrastructure setup", description: "Set up data pipeline and feature store", status: "cancelled", assignedTo: "user-006", approval: null, deadline: "2026-06-01T00:00:00.000Z", createdAt: "2026-05-01T09:00:00.000Z", miniTasks: [{ id: "mt-088", title: "Database access", description: "Get access to sales database", status: "cancelled", order: 1 }, { id: "mt-089", title: "ETL pipeline", description: "Build data extraction pipeline", status: "cancelled", order: 2 }] },
  // ── proj-012: Marketing Content (cancelled, 1 task) ──
  { id: "task-029", projectId: "proj-012", title: "Content generation model", description: "Fine-tune LLM for marketing copy", status: "cancelled", assignedTo: "user-011", approval: null, deadline: "2026-07-01T00:00:00.000Z", createdAt: "2026-05-10T12:00:00.000Z", miniTasks: [{ id: "mt-090", title: "Brand voice analysis", description: "Analyze brand voice from samples", status: "cancelled", order: 1 }, { id: "mt-091", title: "Model fine-tuning", description: "Fine-tune on marketing data", status: "cancelled", order: 2 }, { id: "mt-092", title: "Tone control", description: "Implement tone adjustment", status: "cancelled", order: 3 }] },
  // ── Extra task for proj-004 ──
  { id: "task-030", projectId: "proj-004", title: "Documentation and handover", description: "Create comprehensive documentation for the ML platform", status: "pending", assignedTo: "user-009", approval: null, deadline: "2026-05-20T00:00:00.000Z", createdAt: "2026-05-01T09:00:00.000Z", miniTasks: [{ id: "mt-093", title: "Architecture docs", description: "Document system architecture", status: "in_progress", order: 1 }, { id: "mt-094", title: "Runbooks", description: "Create operational runbooks", status: "pending", order: 2 }, { id: "mt-095", title: "Training session", description: "Conduct handover training", status: "pending", order: 3 }] },
  // ── proj-013: PCG for Noah (2 tasks) ──
  { id: "task-031", projectId: "proj-013", title: "PCG algorithm development", description: "Implement WaveFunctionCollapse and GAN-based terrain generation", status: "in_progress", assignedTo: "user-008", approval: null, deadline: "2026-06-30T00:00:00.000Z", createdAt: "2026-05-20T10:00:00.000Z", miniTasks: [{ id: "mt-096", title: "WFC terrain generation", description: "Implement WaveFunctionCollapse for terrain tiles", status: "done", order: 1 }, { id: "mt-097", title: "GAN detail generation", description: "Train GAN for terrain detail enhancement", status: "in_progress", order: 2 }, { id: "mt-098", title: "Biome transitions", description: "Implement coherent biome blending", status: "pending", order: 3 }, { id: "mt-099", title: "Performance optimization", description: "Optimize for real-time generation", status: "pending", order: 4 }] },
  { id: "task-032", projectId: "proj-013", title: "UE5 plugin integration", description: "Build Unreal Engine 5 plugin with artist tuning UI", status: "pending", assignedTo: "user-008", approval: null, deadline: "2026-07-15T00:00:00.000Z", createdAt: "2026-05-20T10:00:00.000Z", miniTasks: [{ id: "mt-100", title: "UE5 plugin structure", description: "Create plugin skeleton and build system", status: "pending", order: 1 }, { id: "mt-101", title: "Real-time preview", description: "Implement real-time generation preview", status: "pending", order: 2 }, { id: "mt-102", title: "Artist tuning UI", description: "Build parameter tuning panel for artists", status: "pending", order: 3 }] },
  // ── proj-014: Medical X-ray Classification — Alice for John (3 tasks for scenarios 5-8) ──
  { id: "task-033", projectId: "proj-014", useCaseId: "uc-014-1", title: "Data preprocessing and augmentation pipeline", description: "Build chest X-ray preprocessing pipeline with augmentation for 14 pathology categories", source: "client", approvalStatus: "accepted", status: "checklist_completed", assignedTo: "user-005", price: 4000, completionDays: 14, handoverEvidence: "Preprocessing pipeline processed 10K DICOM images. Augmentation suite handles rotation, flip, contrast, and intensity variations. Validation against radiologist annotations shows <2% discrepancy. Pipeline config and test report attached.", deadline: "2026-07-05T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-103", taskId: "task-033", title: "DICOM parsing", description: "Parse DICOM format X-rays from hospital PACS", status: "done", order: 1, isCompleted: true }, { id: "mt-104", taskId: "task-033", title: "Image normalization", description: "Normalize contrast and resolution across sources", status: "done", order: 2, isCompleted: true }, { id: "mt-105", taskId: "task-033", title: "Augmentation pipeline", description: "Build rotation, flip, and intensity augmentations", status: "done", order: 3, isCompleted: true }, { id: "mt-106", taskId: "task-033", title: "Data validation", description: "Validate against radiologist annotations", status: "done", order: 4, isCompleted: true }] },
  { id: "task-034", projectId: "proj-014", useCaseId: "uc-014-2", title: "DenseNet model training and evaluation", description: "Train DenseNet-121 on NIH ChestX-ray14 dataset with transfer learning", source: "client", approvalStatus: "accepted", status: "waiting_expert_product", assignedTo: "user-005", price: 5000, completionDays: 20, productRequested: true, deadline: "2026-07-20T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-107", taskId: "task-034", title: "Transfer learning setup", description: "Load pretrained DenseNet and adapt for 14 classes", status: "done", order: 1, isCompleted: true }, { id: "mt-108", taskId: "task-034", title: "Training run", description: "Train on 100K+ chest X-rays with class balancing", status: "done", order: 2, isCompleted: true }, { id: "mt-109", taskId: "task-034", title: "ROC analysis", description: "Compute AUC per pathology class", status: "done", order: 3, isCompleted: true }, { id: "mt-110", taskId: "task-034", title: "Sensitivity tuning", description: "Tune for 95%+ sensitivity target", status: "done", order: 4, isCompleted: true }] },
  { id: "task-035", projectId: "proj-014", useCaseId: "uc-014-3", title: "Radiologist web demo and deployment", description: "Build web interface for radiologists to upload and classify X-rays", source: "client", approvalStatus: "accepted", status: "rework", assignedTo: "user-005", price: 3000, completionDays: 10, clientFeedback: "The upload interface works well, but the Grad-CAM heatmap overlay is too faint — radiologists can't easily see the highlighted regions. Please increase the heatmap opacity and add a toggle between heatmap on/off. Also, the auto-generated report uses too much medical jargon — please add a 'Patient-Friendly Summary' section at the bottom.", deadline: "2026-08-01T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-111", taskId: "task-035", title: "Upload interface", description: "Build drag-and-drop X-ray upload UI", status: "done", order: 1, isCompleted: true }, { id: "mt-112", taskId: "task-035", title: "Heatmap overlay", description: "Add Grad-CAM heatmaps with opacity toggle", status: "in_progress", order: 2, isCompleted: false }, { id: "mt-113", taskId: "task-035", title: "Report generation", description: "Auto-generate findings report with patient-friendly summary", status: "pending", order: 3, isCompleted: false }] },
  // ── Revision tasks (tasks returned to expert for revision by client) ──
  { id: "task-036", projectId: "proj-001", title: "Grafana dashboard polish (Revision)", description: "Client requested revision on Grafana dashboards — needs additional panels for model latency percentiles and error budget tracking", status: "needs_revision", assignedTo: "user-009", approval: null, deadline: "2026-05-10T00:00:00.000Z", createdAt: "2026-05-01T09:00:00.000Z", revisionReason: "Please add p95/p99 latency panels, error budget tracking per SLO, and a weekly summary view. The current layout is too focused on real-time and doesn't serve our ops team's weekly review needs.", revisionRequestedBy: "Kate Wilson", revisionRequestedAt: "2026-06-18T11:00:00.000Z", miniTasks: [{ id: "mt-114", title: "Add latency percentile panels", description: "p50, p95, p99 latency charts per endpoint", status: "pending", order: 1 }, { id: "mt-115", title: "Error budget dashboard", description: "SLO-based error budget tracking with burn rate alerts", status: "pending", order: 2 }, { id: "mt-116", title: "Weekly summary view", description: "Aggregated weekly metrics for ops team review", status: "pending", order: 3 }] },
  { id: "task-037", projectId: "proj-003", title: "Progress dashboard UX improvements (Revision)", description: "Client requested revision on student progress tracking dashboard — teachers reported the UI is confusing for non-technical staff", status: "needs_revision", assignedTo: "user-007", approval: null, deadline: "2026-04-20T00:00:00.000Z", createdAt: "2026-04-01T10:00:00.000Z", revisionReason: "The progress dashboard uses too many technical terms. Please simplify: replace 'BKT probability' with 'Mastery Level %', add visual progress bars per student, and create a one-click downloadable class report card. Teachers are struggling to interpret the current analytics.", revisionRequestedBy: "Mia Garcia", revisionRequestedAt: "2026-06-15T14:00:00.000Z", miniTasks: [{ id: "mt-117", title: "Simplify terminology", description: "Replace technical labels with teacher-friendly terms", status: "done", order: 1 }, { id: "mt-118", title: "Visual progress bars", description: "Add color-coded progress bars per student/skill", status: "pending", order: 2 }, { id: "mt-119", title: "Class report card export", description: "One-click PDF download of class-wide progress summary", status: "pending", order: 3 }] },
  { id: "task-038", projectId: "proj-006", title: "Document structure analysis refinement (Revision)", description: "Client requested revision on clause identification — false positives on boilerplate disclaimer text", status: "needs_revision", assignedTo: "user-007", approval: null, deadline: "2026-07-10T00:00:00.000Z", createdAt: "2026-06-20T09:00:00.000Z", revisionReason: "The section analysis is flagging standard disclaimer clauses as 'risk items'. Please refine: (1) create a whitelist of standard boilerplate disclaimers, (2) reduce false positive rate below 5%, (3) add a confidence score next to each flagged clause so reviewers can prioritize.", revisionRequestedBy: "Paul Anderson", revisionRequestedAt: "2026-06-25T10:00:00.000Z", miniTasks: [{ id: "mt-120", title: "Boilerplate whitelist", description: "Compile and apply standard disclaimer patterns", status: "pending", order: 1 }, { id: "mt-121", title: "False positive reduction", description: "Tune model thresholds for <5% false positive rate", status: "pending", order: 2 }, { id: "mt-122", title: "Confidence scoring", description: "Add per-clause confidence score display", status: "pending", order: 3 }] },
  // ── proj-015: Healthcare Scheduling (Disputed, 3 tasks) ──
  { id: "task-039", projectId: "proj-015", title: "Patient data pipeline & scheduling model", description: "Build data pipeline ingesting appointment history and train time-series forecasting model", status: "completed", assignedTo: "user-005", approval: "Approved", deadline: "2026-07-05T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-123", title: "Data ingestion from EMR", description: "Connect to hospital EMR system for historical appointments", status: "done", order: 1 }, { id: "mt-124", title: "No-show prediction model", description: "Train XGBoost model for no-show prediction", status: "done", order: 2 }, { id: "mt-125", title: "Schedule optimization", description: "Implement constraint-based scheduling optimizer", status: "done", order: 3 }] },
  { id: "task-040", projectId: "proj-015", title: "HIPAA-compliant data handling layer", description: "Implement encryption at rest and in transit for all patient data", status: "in_progress", assignedTo: "user-005", approval: null, deadline: "2026-07-20T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-126", title: "Encryption at rest", description: "Add AES-256 encryption for stored patient records", status: "done", order: 1 }, { id: "mt-127", title: "TLS for API", description: "Enforce TLS 1.3 for all API communication", status: "in_progress", order: 2 }, { id: "mt-128", title: "Audit logging", description: "Add HIPAA-compliant access audit trail", status: "pending", order: 3 }, { id: "mt-129", title: "PHI de-identification", description: "Remove PHI from debug logs and analytics", status: "pending", order: 4 }] },
  { id: "task-041", projectId: "proj-015", title: "Provider dashboard & patient portal", description: "Build scheduling dashboard for providers and self-service portal for patients", status: "pending", assignedTo: "user-005", approval: null, deadline: "2026-08-10T00:00:00.000Z", createdAt: "2026-06-20T10:00:00.000Z", miniTasks: [{ id: "mt-130", title: "Provider schedule view", description: "Build drag-and-drop provider schedule UI", status: "pending", order: 1 }, { id: "mt-131", title: "Patient self-scheduling", description: "Build patient-facing appointment booking", status: "pending", order: 2 }, { id: "mt-132", title: "HIPAA-compliant notifications", description: "Add encrypted SMS/email reminders", status: "pending", order: 3 }] },
  // ── proj-016: Risk Dashboard — Bob for Kate (3 tasks, all completed for final delivery testing) ──
  { id: "task-042", projectId: "proj-016", title: "Dashboard architecture and real-time data pipeline", description: "Design dashboard component tree and set up WebSocket-based real-time data feed from fraud detection API", status: "completed", assignedTo: "user-006", approval: "Approved", deadline: "2026-07-01T00:00:00.000Z", createdAt: "2026-06-18T10:00:00.000Z", miniTasks: [{ id: "mt-133", title: "WebSocket integration", description: "Connect to fraud detection API stream", status: "done", order: 1 }, { id: "mt-134", title: "Component architecture", description: "Design reusable chart and table components", status: "done", order: 2 }, { id: "mt-135", title: "Real-time data pipeline", description: "Set up sub-second data processing pipe", status: "done", order: 3 }] },
  { id: "task-043", projectId: "proj-016", title: "Risk visualization and drill-down UI", description: "Build interactive charts with transaction drill-down, risk trend analysis, and customizable alert thresholds", status: "completed", assignedTo: "user-006", approval: "Quick Accepted", deadline: "2026-07-08T00:00:00.000Z", createdAt: "2026-06-18T10:00:00.000Z", miniTasks: [{ id: "mt-136", title: "Risk score charts", description: "Real-time risk score visualization with D3.js", status: "done", order: 1 }, { id: "mt-137", title: "Drill-down modal", description: "Click-through to individual transaction detail", status: "done", order: 2 }, { id: "mt-138", title: "Alert configuration", description: "Customizable threshold-based alert system", status: "done", order: 3 }] },
  { id: "task-044", projectId: "proj-016", title: "Role-based access and deployment", description: "Implement role-based views for analysts vs managers, deploy to production with monitoring", status: "completed", assignedTo: "user-006", approval: "Approved", deadline: "2026-07-15T00:00:00.000Z", createdAt: "2026-06-18T10:00:00.000Z", miniTasks: [{ id: "mt-139", title: "RBAC implementation", description: "Analyst vs manager view permissions", status: "done", order: 1 }, { id: "mt-140", title: "Production deployment", description: "Deploy to AWS with CDN", status: "done", order: 2 }, { id: "mt-141", title: "Monitoring setup", description: "Add Sentry and CloudWatch monitoring", status: "done", order: 3 }] },
  // ── proj-017: Contract Cancellation Demo 30% (John / Alice) — 3 tasks → 30% overall ──
  { id: "task-045", projectId: "proj-017", title: "Requirements analysis and architecture", description: "Define project scope, technical architecture, and data model", status: "in_progress", assignedTo: "user-005", approval: null, deadline: "2026-08-01T00:00:00.000Z", createdAt: "2026-06-20T08:00:00.000Z", miniTasks: [{ id: "mt-142", title: "Stakeholder interviews", description: "Interview key stakeholders", status: "done", order: 1 }, { id: "mt-143", title: "Architecture diagram", description: "Create system architecture diagram", status: "done", order: 2 }, { id: "mt-144", title: "Data model design", description: "Design database schema", status: "pending", order: 3 }, { id: "mt-145", title: "API contract", description: "Define REST API endpoints", status: "pending", order: 4 }, { id: "mt-146", title: "Deployment plan", description: "Plan CI/CD pipeline", status: "pending", order: 5 }] },
  { id: "task-046", projectId: "proj-017", title: "Core development — Phase 1", description: "Implement core features and backend services", status: "in_progress", assignedTo: "user-005", approval: null, deadline: "2026-08-20T00:00:00.000Z", createdAt: "2026-06-20T08:00:00.000Z", miniTasks: [{ id: "mt-147", title: "User auth module", description: "Implement authentication", status: "done", order: 1 }, { id: "mt-148", title: "Database setup", description: "Provision and configure database", status: "pending", order: 2 }, { id: "mt-149", title: "Core API", description: "Build main API endpoints", status: "pending", order: 3 }, { id: "mt-150", title: "Unit tests", description: "Write unit tests for core", status: "pending", order: 4 }] },
  { id: "task-047", projectId: "proj-017", title: "Frontend development", description: "Build the user interface and client-side logic", status: "in_progress", assignedTo: "user-005", approval: null, deadline: "2026-09-01T00:00:00.000Z", createdAt: "2026-06-20T08:00:00.000Z", miniTasks: [{ id: "mt-151", title: "Component library", description: "Set up component library", status: "done", order: 1 }, { id: "mt-152", title: "Dashboard page", description: "Build main dashboard", status: "pending", order: 2 }, { id: "mt-153", title: "Settings page", description: "Build settings page", status: "pending", order: 3 }, { id: "mt-154", title: "E2E tests", description: "Write end-to-end tests", status: "pending", order: 4 }] },
  // ── proj-018: Contract Cancellation Demo 80% (Kate / Bob) — 3 tasks → 80% overall ──
  { id: "task-048", projectId: "proj-018", title: "System design and infrastructure", description: "Design system architecture and set up cloud infrastructure", status: "in_progress", assignedTo: "user-006", approval: null, deadline: "2026-08-10T00:00:00.000Z", createdAt: "2026-06-22T09:00:00.000Z", miniTasks: [{ id: "mt-155", title: "Cloud provisioning", description: "Provision AWS/GCP resources", status: "done", order: 1 }, { id: "mt-156", title: "Network setup", description: "Configure VPC and security groups", status: "done", order: 2 }, { id: "mt-157", title: "Container orchestration", description: "Set up Kubernetes cluster", status: "done", order: 3 }, { id: "mt-158", title: "Monitoring stack", description: "Deploy Prometheus + Grafana", status: "done", order: 4 }, { id: "mt-159", title: "Disaster recovery plan", description: "Document DR procedures", status: "pending", order: 5 }] },
  { id: "task-049", projectId: "proj-018", title: "Backend services implementation", description: "Build all backend microservices and APIs", status: "in_progress", assignedTo: "user-006", approval: null, deadline: "2026-08-25T00:00:00.000Z", createdAt: "2026-06-22T09:00:00.000Z", miniTasks: [{ id: "mt-160", title: "Auth service", description: "Implement OAuth2/JWT auth", status: "done", order: 1 }, { id: "mt-161", title: "Data ingestion pipeline", description: "Build ETL pipeline", status: "done", order: 2 }, { id: "mt-162", title: "API gateway", description: "Set up API gateway with rate limiting", status: "done", order: 3 }, { id: "mt-163", title: "Caching layer", description: "Implement Redis caching", status: "done", order: 4 }, { id: "mt-164", title: "Performance tuning", description: "Optimize query performance", status: "pending", order: 5 }] },
  { id: "task-050", projectId: "proj-018", title: "Frontend and user experience", description: "Develop the web application UI", status: "in_progress", assignedTo: "user-006", approval: null, deadline: "2026-09-15T00:00:00.000Z", createdAt: "2026-06-22T09:00:00.000Z", miniTasks: [{ id: "mt-165", title: "Design system", description: "Create design tokens and theme", status: "done", order: 1 }, { id: "mt-166", title: "Core layouts", description: "Build main layout components", status: "done", order: 2 }, { id: "mt-167", title: "Data visualizations", description: "Build chart components", status: "done", order: 3 }, { id: "mt-168", title: "Responsive design", description: "Ensure mobile responsiveness", status: "done", order: 4 }, { id: "mt-169", title: "Accessibility audit", description: "Run WCAG compliance check", status: "pending", order: 5 }] },
];

// ---------------------------------------------------------------------------
// 12. AUDIT LOGS — 25 records
//    Activity logs for project timelines tied to existing task/workflow events
// ---------------------------------------------------------------------------

const _baseAuditLogs = [
  // ── proj-001: AWS Deploy (Emma Brown for Kate Wilson) ──
  { id: "audit-001", projectId: "proj-001", taskId: "task-001", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Emma Brown", timestamp: "2026-04-01T10:00:00.000Z", details: "Completed Kubernetes cluster setup — EKS provisioned with auto-scaling node groups" },
  { id: "audit-002", projectId: "proj-001", taskId: "task-001", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-02T14:00:00.000Z", details: "Approved Kubernetes cluster setup. Proceed to model serving." },
  { id: "audit-003", projectId: "proj-001", taskId: "task-002", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Emma Brown", timestamp: "2026-04-15T09:00:00.000Z", details: "Completed model serving infrastructure — KFServing with Istio traffic splitting" },
  { id: "audit-004", projectId: "proj-001", taskId: "task-002", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-16T11:00:00.000Z", details: "Approved model serving setup. Starting monitoring phase." },
  { id: "audit-005", projectId: "proj-001", taskId: null, miniTaskId: null, action: "extension_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-15T09:00:00.000Z", details: "Approved 2-week extension for SOC2 compliance architecture work" },
  { id: "audit-006", projectId: "proj-001", taskId: "task-003", miniTaskId: "mt-009", action: "mini_task_progress", actor: "expert", actorName: "Emma Brown", timestamp: "2026-06-14T10:00:00.000Z", details: "Creating Grafana dashboards for model latency and throughput monitoring" },

  // ── proj-002: Retail CV (David Park for Liam O'Brien) ──
  { id: "audit-007", projectId: "proj-002", taskId: "task-005", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "David Park", timestamp: "2026-04-18T14:00:00.000Z", details: "Completed camera integration — all 6 store camera feeds connected to preprocessing pipeline" },
  { id: "audit-008", projectId: "proj-002", taskId: "task-005", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Liam O'Brien", timestamp: "2026-04-20T10:00:00.000Z", details: "Approved camera integration and data pipeline. Moving to object detection." },
  { id: "audit-009", projectId: "proj-002", taskId: "task-006", miniTaskId: "mt-019", action: "mini_task_progress", actor: "expert", actorName: "David Park", timestamp: "2026-06-15T08:00:00.000Z", details: "Evaluating YOLOv8 model — mAP at 87.3% on test set, tuning for edge deployment" },

  // ── proj-003: AI Tutor (Carol Zhang for Mia Garcia) ──
  { id: "audit-010", projectId: "proj-003", taskId: "task-008", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Carol Zhang", timestamp: "2026-03-01T14:00:00.000Z", details: "Completed curriculum integration — 500+ lessons chunked and embedded for RAG retrieval" },
  { id: "audit-011", projectId: "proj-003", taskId: "task-008", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Mia Garcia", timestamp: "2026-03-02T10:00:00.000Z", details: "Approved curriculum ingestion. Content retrieval accuracy at 96%." },
  { id: "audit-012", projectId: "proj-003", taskId: "task-009", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Carol Zhang", timestamp: "2026-03-18T09:00:00.000Z", details: "Completed conversational AI engine — Socratic questioning with automated exercise generation" },
  { id: "audit-013", projectId: "proj-003", taskId: "task-009", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Mia Garcia", timestamp: "2026-03-20T11:00:00.000Z", details: "Approved conversational engine. Students love the interactive code review!" },

  // ── proj-004: Cloud ML Infra (Emma Brown for Kate Wilson) ──
  { id: "audit-014", projectId: "proj-004", taskId: "task-011", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Emma Brown", timestamp: "2026-04-04T14:00:00.000Z", details: "Completed cost analysis — projected 45% savings ($4,200/month) with spot instances and resource scaling" },
  { id: "audit-015", projectId: "proj-004", taskId: "task-011", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-05T10:00:00.000Z", details: "Approved architecture design. Moving to spot instance implementation." },
  { id: "audit-016", projectId: "proj-004", taskId: "task-012", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Emma Brown", timestamp: "2026-04-19T16:00:00.000Z", details: "Completed Karpenter deployment — spot instance handling validated with fallback policies" },
  { id: "audit-017", projectId: "proj-004", taskId: "task-012", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-20T09:00:00.000Z", details: "Approved spot instance strategy. Already seeing 38% reduction in training costs." },

  // ── proj-005: Support Chatbot (Henry Davis for John Smith) ──
  { id: "audit-018", projectId: "proj-005", taskId: "task-014", miniTaskId: "mt-044", action: "mini_task_completed", actor: "expert", actorName: "Henry Davis", timestamp: "2026-06-09T15:00:00.000Z", details: "Completed HTML stripping from CRM export — cleaned 50K+ support tickets" },
  { id: "audit-019", projectId: "proj-005", taskId: null, miniTaskId: null, action: "project_started", actor: "system", actorName: "AI Tasker", timestamp: "2026-06-05T14:30:00.000Z", details: "Project started. Escrow of $8,500 funded by John Smith. Expert: Henry Davis." },

  // ── proj-006: Contract Analysis (Carol Zhang for Paul Anderson) ──
  { id: "audit-020", projectId: "proj-006", taskId: "task-017", miniTaskId: null, action: "task_started", actor: "expert", actorName: "Carol Zhang", timestamp: "2026-06-10T12:00:00.000Z", details: "Started document processing pipeline. Digital PDF parsing operational." },
  { id: "audit-021", projectId: "proj-006", taskId: null, miniTaskId: null, action: "project_started", actor: "system", actorName: "AI Tasker", timestamp: "2026-06-10T09:30:00.000Z", details: "Project started. Escrow of $20,000 funded by Paul Anderson. Expert: Carol Zhang." },

  // ── proj-007: Virtual Staging (Grace Kim for Olivia Martinez) — completed ──
  { id: "audit-022", projectId: "proj-007", taskId: "task-020", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Grace Kim", timestamp: "2026-02-01T10:00:00.000Z", details: "Completed GAN model development — photorealistic virtual staging with 5 interior design styles" },
  { id: "audit-023", projectId: "proj-007", taskId: null, miniTaskId: null, action: "project_completed", actor: "client", actorName: "Olivia Martinez", timestamp: "2026-04-28T15:00:00.000Z", details: "Project completed. Payment of $16,000 released to Grace Kim. Rating: 5/5." },

  // ── proj-008: Sentiment Analysis (Alice Johnson for Quinn Thomas) — completed ──
  { id: "audit-024", projectId: "proj-008", taskId: "task-022", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Alice Johnson", timestamp: "2026-01-30T11:00:00.000Z", details: "Completed data collection and annotation — 20K social media posts labeled for sentiment" },
  { id: "audit-025", projectId: "proj-008", taskId: null, miniTaskId: null, action: "project_completed", actor: "client", actorName: "Quinn Thomas", timestamp: "2026-03-28T14:00:00.000Z", details: "Project completed. Payment of $8,500 released to Alice Johnson. Overall accuracy: 92%." },

  // ── proj-009: Fraud Detection (Frank Mueller for Kate Wilson) — completed ──
  { id: "audit-026", projectId: "proj-009", taskId: "task-024", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Frank Mueller", timestamp: "2026-02-14T09:00:00.000Z", details: "Completed data pipeline — streaming pipeline handles 10K+ transactions/second" },
  { id: "audit-027", projectId: "proj-009", taskId: null, miniTaskId: null, action: "project_completed", actor: "client", actorName: "Kate Wilson", timestamp: "2026-04-20T16:00:00.000Z", details: "Phase 1 completed. Payment of $12,000 released to Frank Mueller. Fraud detection precision: 85%." },

  // ── proj-010: Adaptive Learning (Henry Davis for Mia Garcia) — completed ──
  { id: "audit-028", projectId: "proj-010", taskId: "task-026", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Henry Davis", timestamp: "2026-02-28T14:00:00.000Z", details: "Completed Bayesian Knowledge Tracing — student skill profiles validated against 3 school datasets" },
  { id: "audit-029", projectId: "proj-010", taskId: null, miniTaskId: null, action: "project_completed", actor: "client", actorName: "Mia Garcia", timestamp: "2026-05-10T12:00:00.000Z", details: "MVP completed. Payment of $10,000 released to Henry Davis. Pilot schools report 30% better engagement." },

  // ── proj-011: Property Valuation (Bob Williams for Olivia Martinez) — cancelled ──
  { id: "audit-030", projectId: "proj-011", taskId: null, miniTaskId: null, action: "project_cancelled", actor: "admin", actorName: "Sarah Chen", timestamp: "2026-06-10T14:30:00.000Z", details: "Project cancelled due to client unresponsiveness. $14,000 refunded to Olivia Martinez." },

  // ── proj-012: Marketing Content (Grace Kim for Quinn Thomas) — cancelled ──
  { id: "audit-031", projectId: "proj-012", taskId: null, miniTaskId: null, action: "project_cancelled", actor: "admin", actorName: "Sarah Chen", timestamp: "2026-06-15T09:30:00.000Z", details: "Project cancelled due to scope creep beyond agreement. $9,500 refunded to Quinn Thomas." },

  // ── proj-013: PCG for Game (David Park for Noah Taylor) — in_progress ──
  { id: "audit-032", projectId: "proj-013", taskId: "task-031", miniTaskId: "mt-096", action: "mini_task_completed", actor: "expert", actorName: "David Park", timestamp: "2026-06-05T14:00:00.000Z", details: "WFC terrain generation complete — 12 terrain tile types with coherent transitions" },
  { id: "audit-033", projectId: "proj-013", taskId: null, miniTaskId: null, action: "project_started", actor: "system", actorName: "AI Tasker", timestamp: "2026-05-20T10:30:00.000Z", details: "Project started. Escrow of $18,000 funded by Noah Taylor. Expert: David Park." },

  // ── proj-014: Medical X-ray (Alice Johnson for John Smith) — active ──
  { id: "audit-034", projectId: "proj-014", taskId: "task-033", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Alice Johnson", timestamp: "2026-06-22T10:00:00.000Z", details: "Completed DICOM preprocessing pipeline — 10K chest X-rays normalized and augmented" },
  { id: "audit-035", projectId: "proj-014", taskId: "task-033", miniTaskId: null, action: "task_approved", actor: "client", actorName: "John Smith", timestamp: "2026-06-22T11:00:00.000Z", details: "Approved data preprocessing. Pipeline handles all 14 pathology categories. Proceeding to model training." },
  { id: "audit-036", projectId: "proj-014", taskId: null, miniTaskId: null, action: "project_started", actor: "system", actorName: "AI Tasker", timestamp: "2026-06-20T14:30:00.000Z", details: "Project started. Escrow of $12,000 funded by John Smith. Expert: Alice Johnson." },

  // ── Revision request audit entries ──
  { id: "audit-037", projectId: "proj-001", taskId: "task-036", miniTaskId: null, action: "task_revision_requested", actor: "client", actorName: "Kate Wilson", timestamp: "2026-06-18T11:00:00.000Z", details: "Requested revision on Grafana dashboards — needs latency percentile panels, error budget tracking, and weekly summary view" },
  { id: "audit-038", projectId: "proj-003", taskId: "task-037", miniTaskId: null, action: "task_revision_requested", actor: "client", actorName: "Mia Garcia", timestamp: "2026-06-15T14:00:00.000Z", details: "Requested revision on progress dashboard — simplify terminology, add visual progress bars, and class report card export" },
  { id: "audit-039", projectId: "proj-006", taskId: "task-038", miniTaskId: null, action: "task_revision_requested", actor: "client", actorName: "Paul Anderson", timestamp: "2026-06-25T10:00:00.000Z", details: "Requested revision on document structure analysis — create boilerplate whitelist, reduce false positives, add confidence scoring" },

  // ── proj-016: Risk Dashboard (Bob Williams for Kate Wilson) — final delivery submitted ──
  { id: "audit-040", projectId: "proj-016", taskId: null, miniTaskId: null, action: "project_started", actor: "system", actorName: "AI Tasker", timestamp: "2026-06-18T09:30:00.000Z", details: "Project started. Escrow of $9,200 funded by Kate Wilson. Expert: Bob Williams." },
  { id: "audit-041", projectId: "proj-016", taskId: "task-042", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Bob Williams", timestamp: "2026-06-22T10:00:00.000Z", details: "Completed dashboard architecture and real-time WebSocket data pipeline" },
  { id: "audit-042", projectId: "proj-016", taskId: "task-042", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-06-22T14:00:00.000Z", details: "Approved dashboard architecture. Proceed to visualization and drill-down." },
  { id: "audit-043", projectId: "proj-016", taskId: "task-043", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Bob Williams", timestamp: "2026-06-24T16:00:00.000Z", details: "Completed risk visualization with D3.js charts, drill-down modals, and alert configuration" },
  { id: "audit-044", projectId: "proj-016", taskId: "task-043", miniTaskId: null, action: "task_quick_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-06-25T09:00:00.000Z", details: "Quick-accepted risk visualization task — excellent drill-down UX." },
  { id: "audit-045", projectId: "proj-016", taskId: "task-044", miniTaskId: null, action: "task_completed", actor: "expert", actorName: "Bob Williams", timestamp: "2026-06-26T14:00:00.000Z", details: "Completed RBAC implementation, production deployment to AWS, and monitoring setup" },
  { id: "audit-046", projectId: "proj-016", taskId: "task-044", miniTaskId: null, action: "task_approved", actor: "client", actorName: "Kate Wilson", timestamp: "2026-06-26T16:00:00.000Z", details: "Approved role-based access and deployment. All tasks done." },
  { id: "audit-047", projectId: "proj-016", taskId: null, miniTaskId: null, action: "final_work_submitted", actor: "expert", actorName: "Bob Williams", timestamp: "2026-06-27T10:00:00.000Z", details: "Expert submitted final deliverables. Link: https://risk-dash-demo.vercel.app, File: risk-dashboard-source.zip" },
];

// =============================================================================
// BASE DATA — immutable seed; overlay for session mutations
// =============================================================================

const _baseData = Object.freeze({
  users: Object.freeze([..._baseUsers]),
  categories: Object.freeze([..._baseCategories]),
  jobPosts: Object.freeze([..._baseJobPosts]),
  proposals: Object.freeze([..._baseProposals]),
  projects: Object.freeze([..._baseProjects]),
  transactions: Object.freeze([..._baseTransactions]),
  reports: Object.freeze([..._baseReports]),
  reviews: Object.freeze([..._baseReviews]),
  notifications: Object.freeze([..._baseNotifications]),
  messages: Object.freeze([..._baseMessages]),
  tasks: Object.freeze([..._baseTasks]),
  auditLogs: Object.freeze([..._baseAuditLogs]),
});

function _buildLookupMap(array) {
  const map = {};
  for (const item of array) map[item.id] = item;
  return map;
}

const _baseById = {
  users: _buildLookupMap(_baseUsers),
  categories: _buildLookupMap(_baseCategories),
  jobPosts: _buildLookupMap(_baseJobPosts),
  proposals: _buildLookupMap(_baseProposals),
  projects: _buildLookupMap(_baseProjects),
  transactions: _buildLookupMap(_baseTransactions),
  reports: _buildLookupMap(_baseReports),
  reviews: _buildLookupMap(_baseReviews),
  notifications: _buildLookupMap(_baseNotifications),
  messages: _buildLookupMap(_baseMessages),
  tasks: _buildLookupMap(_baseTasks),
  auditLogs: _buildLookupMap(_baseAuditLogs),
};

const _runtimeOverlay = {
  users: new Map(), categories: new Map(), jobPosts: new Map(),
  proposals: new Map(), projects: new Map(), transactions: new Map(),
  reports: new Map(), reviews: new Map(), notifications: new Map(),
  messages: new Map(), tasks: new Map(), auditLogs: new Map(),
  _deleted: new Set(),
};

function loadOverlay() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const storedVersion = window.localStorage.getItem("aitasker_mock_db_version");
    if (storedVersion && Number(storedVersion) !== MOCK_DB_VERSION) {
      console.warn(`[MockDB] Version mismatch (stored: ${storedVersion}, current: ${MOCK_DB_VERSION}). Clearing stale overlay.`);
      window.localStorage.removeItem("aitasker_mock_db");
      window.localStorage.setItem("aitasker_mock_db_version", String(MOCK_DB_VERSION));
      return; // overlay stays empty — fresh base data
    }
    window.localStorage.setItem("aitasker_mock_db_version", String(MOCK_DB_VERSION));

    const dataStr = window.localStorage.getItem("aitasker_mock_db");
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      for (const table of Object.keys(_runtimeOverlay)) {
        if (table === "_deleted") {
          _runtimeOverlay._deleted = new Set(parsed._deleted || []);
        } else {
          _runtimeOverlay[table] = new Map(Object.entries(parsed[table] || {}));
        }
      }
    }
  } catch (e) {
    console.error("Failed to load mock DB from local storage:", e);
  }
}

function saveOverlay() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const backup = {};
    for (const table of Object.keys(_runtimeOverlay)) {
      if (table === "_deleted") {
        backup._deleted = Array.from(_runtimeOverlay._deleted);
      } else {
        backup[table] = Object.fromEntries(_runtimeOverlay[table]);
      }
    }
    window.localStorage.setItem("aitasker_mock_db", JSON.stringify(backup));
  } catch (e) {
    console.error("Failed to save mock DB to local storage:", e);
  }
}

// Initial load
loadOverlay();

// Listen for cross-tab updates
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "aitasker_mock_db") {
      loadOverlay();
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    }
  });
}

function triggerDbUpdate() {
  saveOverlay();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aitasker_db_update"));
  }
}


// =============================================================================
// PUBLIC HELPERS
// =============================================================================

// ponytail: global counter avoids Date.now collisions in loops
let _idCounter = 0;
export function generateId(prefix) {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// DATA NORMALIZATION — safe fallbacks for old/new field shapes
// ---------------------------------------------------------------------------

/** Normalize a task record to always have useCaseId, handoverEvidence, productRequested, etc. */
export function normalizeTask(t) {
  if (!t) return t;
  return {
    ...t,
    useCaseId: t.useCaseId || null,
    handoverEvidence: t.handoverEvidence || null,
    productRequested: t.productRequested || false,
    productLink: t.productLink || null,
    productFile: t.productFile || null,
    clientFeedback: t.clientFeedback || null,
    completionDays: t.completionDays || 0,
    price: t.price || 0,
  };
}

/** Normalize a job post to always have useCases array */
export function normalizeJobPost(jp) {
  if (!jp) return jp;
  return {
    ...jp,
    useCases: Array.isArray(jp.useCases) ? jp.useCases : [],
    originalTotalDurationDays: jp.originalTotalDurationDays || 0,
    originalBudget: jp.originalBudget || jp.budget || 0,
  };
}

function _baseTable(name) { return _baseData[name] || []; }

function _getById(table, id) {
  const overlay = _runtimeOverlay[table];
  if (overlay && overlay.has(id)) return overlay.get(id);
  if (_runtimeOverlay._deleted.has(`${table}:${id}`)) return null;
  return _baseById[table]?.[id] || null;
}

function _list(table, filterFn) {
  const base = _baseTable(table);
  const overlay = _runtimeOverlay[table];
  const all = [...base];
  if (overlay) {
    for (const [id, item] of overlay) {
      const idx = all.findIndex((i) => i.id === id);
      if (idx >= 0) all[idx] = item; else all.push(item);
    }
  }
  const result = all.filter((i) => !_runtimeOverlay._deleted.has(`${table}:${i.id}`));
  return filterFn ? result.filter(filterFn) : result;
}

function _create(table, item) {
  const overlay = _runtimeOverlay[table];
  if (!overlay) throw new Error("Unknown table: " + table);
  const id = item.id || generateId(table.replace(/s$/, ""));
  const record = { ...item, id, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  overlay.set(id, record);
  triggerDbUpdate();
  return record;
}

function enrichJobPost(job) {
  if (!job) return null;
  if (job.specialization && job.aiCategoryDomain && Array.isArray(job.useCases)) return job;

  // ponytail: auto-generate default use cases if none present
  if (!Array.isArray(job.useCases) || job.useCases.length === 0) {
    const defaultDuration = Math.ceil((job.deadline || 30) / 2);
    job.useCases = [{
      id: generateId("uc"),
      title: "Core Implementation",
      description: job.description || "Main project implementation",
      originalDurationDays: defaultDuration,
      requirements: [],
      createdBy: "client",
      createdAt: job.createdAt || new Date().toISOString(),
    }];
    job.originalTotalDurationDays = defaultDuration;
    job.originalBudget = job.budget;
  }

  let category = "Artificial Intelligence";
  let specialization = "Machine Learning";
  let skills = job.requiredSkills || [];

  const id = job.id || job.jobPostId || "";
  if (id === "job-001" || id === "proj-005") {
    category = "Artificial Intelligence";
    specialization = "Natural Language Processing";
    skills = ["Hugging Face Transformers", "BERT", "Text Tokenization", "Semantic Search"];
  } else if (id === "job-002" || id === "proj-002") {
    category = "Artificial Intelligence";
    specialization = "Computer Vision";
    skills = ["OpenCV Library", "YOLO Object Detection", "Image Segmentation", "PyTorch Vision"];
  } else if (id === "job-003" || id === "proj-009") {
    category = "Artificial Intelligence";
    specialization = "Machine Learning";
    skills = ["Python", "Scikit-Learn", "Regression Models", "Classification & Clustering"];
  } else if (id === "job-004") {
    category = "Artificial Intelligence";
    specialization = "Machine Learning";
    skills = ["Python", "Scikit-Learn", "Regression Models"];
  } else if (id === "job-005" || id === "proj-010") {
    category = "Education";
    specialization = "Instructional Design";
    skills = ["E-Learning Development", "LMS Administration (Moodle/Canvas)"];
  } else if (id === "job-006" || id === "proj-013") {
    category = "Artificial Intelligence";
    specialization = "AI Agent Development";
    skills = ["Semantic Kernel Framework", "AutoGen", "CrewAI Orchestration", "AI Agent Tooling"];
  } else if (id === "job-007" || id === "proj-011") {
    category = "Business, Accounting, Human Resources & Legal";
    specialization = "Business Strategy";
    skills = ["Financial Modeling", "SWOT Analysis"];
  } else if (id === "job-008" || id === "proj-006") {
    category = "Business, Accounting, Human Resources & Legal";
    specialization = "Corporate Law";
    skills = ["Contract Drafting", "Due Diligence"];
  } else if (id === "job-009" || id === "proj-001") {
    category = "Mobile Phones & Computing";
    specialization = "Cloud Computing";
    skills = ["AWS", "Cloud Architecture"];
  } else if (id === "job-010" || id === "proj-012") {
    category = "Sales & Marketing";
    specialization = "Content Marketing";
    skills = ["SEO Writing", "Content Strategy", "Copywriting"];
  } else if (id === "job-011") {
    category = "Artificial Intelligence";
    specialization = "Computer Vision";
    skills = ["OpenCV Library", "YOLO Object Detection"];
  } else if (id === "job-012" || id === "proj-003") {
    category = "Education";
    specialization = "Online Tutoring";
    skills = ["Zoom Classroom Management", "Subject Matter Tutoring (Math/Science)"];
  } else if (id === "job-013" || id === "proj-004") {
    category = "Mobile Phones & Computing";
    specialization = "Cloud Computing";
    skills = ["AWS", "Google Cloud Platform (GCP)"];
  } else if (id === "job-014" || id === "proj-007") {
    category = "Artificial Intelligence";
    specialization = "Generative AI";
    skills = ["OpenAI API Integration", "Prompt Engineering"];
  } else if (id === "job-015" || id === "proj-008") {
    category = "Artificial Intelligence";
    specialization = "Natural Language Processing";
    skills = ["Hugging Face Transformers", "Semantic Search"];
  } else if (id === "job-016" || id === "proj-013") {
    category = "Artificial Intelligence";
    specialization = "Machine Learning";
    skills = ["Python", "Scikit-Learn"];
  }

  const projectObj = _list("projects").find((p) => p.jobPostId === job.id);
  const expertIdToUse = projectObj?.assignedExpertId || job.assignedExpertId;
  let assignedExpert = null;
  if (expertIdToUse) {
    const expUser = _getById("users", expertIdToUse);
    if (expUser) {
      assignedExpert = {
        id: expUser.id,
        fullName: expUser.fullName,
        email: expUser.email,
        title: expUser.expertProfile?.jobTitle || "AI Expert"
      };
    }
  }

  return {
    ...job,
    category: category,
    aiCategoryDomain: { id: category, name: category },
    specialization: specialization,
    requiredSkills: skills,
    jobPostSkills: skills.map(name => ({ skill: { name } })),
    assignedExpert,
  };
}

function _update(table, id, updates) {
  const existing = _getById(table, id);
  if (!existing) return null;
  const overlay = _runtimeOverlay[table];
  const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
  overlay.set(id, updated);
  triggerDbUpdate();
  return updated;
}

function _delete(table, id) {
  _runtimeOverlay._deleted.add(`${table}:${id}`);
  triggerDbUpdate();
  return true;
}

// =============================================================================
// EXPORTED QUERY HELPERS
// =============================================================================

export function getUserById(userId) {
  const user = _getById("users", userId);
  if (!user) return null;
  return { 
    ...user, 
    projects: _list("projects").filter((p) => p.clientId === userId || p.assignedExpertId === userId).map(enrichJobPost), 
    jobPosts: _list("jobPosts").filter((j) => j.clientId === userId).map(enrichJobPost), 
    proposals: _list("proposals").filter((p) => p.expertId === userId) 
  };
}

export function listUsers(filterFn) { return _list("users", filterFn); }
export function getUserWallet(userId) { const u = _getById("users", userId); return u?.wallet || { balance: 0, pendingBalance: 0, totalEarned: 0 }; }
export function getExpertProfile(userId) { const u = _getById("users", userId); return (u && u.role === "expert") ? u.expertProfile : null; }
export function updateUser(id, data) { return _update("users", id, data); }
export function createUser(data) {
  const wallet = data.wallet || { balance: 50000, pendingBalance: 0, totalEarned: 0 };
  return _create("users", { ...data, wallet });
}

export function listCategories() { return _list("categories", (c) => c.type === "category"); }
export function listSkills() { return _list("categories", (c) => c.type === "skill"); }
export function createCategory(data) { return _create("categories", { ...data, type: "category" }); }
export function createSkill(data) { return _create("categories", { ...data, type: "skill" }); }
export function deleteCategory(id) { return _delete("categories", id); }
export function deleteSkill(id) { return _delete("categories", id); }

export function listJobPosts(filterFn) { return _list("jobPosts", filterFn).map(enrichJobPost); }
export function getJobPostById(id) { return enrichJobPost(_getById("jobPosts", id)); }
export function createJobPost(data) { return enrichJobPost(_create("jobPosts", data)); }
export function updateJobPost(id, data) { return enrichJobPost(_update("jobPosts", id, data)); }

function formatViDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function listProposals(filterFn) {
  // ponytail: check for expired proposals (7-day auto-expire)
  const now = new Date();
  const allProps = _list("proposals");
  for (const p of allProps) {
    const submittedAt = p.submittedAt || p.createdAt;
    if (!submittedAt) continue;
    if ((p.status === "pending" || p.status === "submitted" || p.status === "under_review") && !p.expiryChecked) {
      const daysSinceSubmit = (now.getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSubmit >= 7) {
        _update("proposals", p.id, { status: "expired", expiryChecked: true });
        // Notify expert and client
        const jobPost = _getById("jobPosts", p.jobPostId);
        const expert = _getById("users", p.expertId);
        if (expert) {
          _create("notifications", {
            userId: p.expertId,
            title: `Proposal Expired | ${jobPost?.title || "Project"}`,
            message: `Your proposal has expired after 7 days without client response. You may apply to other jobs.`,
            type: "proposal",
            isRead: false,
            linkTo: `/expert/proposals/${p.id}`,
            createdAt: new Date().toISOString()
          });
        }
        if (jobPost) {
          _create("notifications", {
            userId: jobPost.clientId,
            title: `Proposal Auto-Expired | ${jobPost.title}`,
            message: `A proposal from ${expert?.fullName || "Expert"} has expired after 7 days without your response.`,
            type: "proposal",
            isRead: false,
            linkTo: `/client/my-projects?projectId=${jobPost.id}&view=proposals`,
            createdAt: new Date().toISOString()
          });
        }
      } else if (daysSinceSubmit >= 6 && !p.day6ReminderSent) {
        // Day 6: send urgent reminder to client
        _update("proposals", p.id, { day6ReminderSent: true });
        const jp = _getById("jobPosts", p.jobPostId);
        const exp = _getById("users", p.expertId);
        if (jp) {
          _create("notifications", {
            userId: jp.clientId,
            title: `⏰ Proposal Expiring Tomorrow | ${jp.title}`,
            message: `You have a proposal from ${exp?.fullName || "Expert"} expiring tomorrow. Please process it before the system auto-cancels it.`,
            type: "proposal",
            isRead: false,
            linkTo: `/client/my-projects?projectId=${jp.id}&view=proposals`,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }
  // Re-fetch after potential status changes
  return _list("proposals", filterFn);
}
export function getProposalById(id) { return _getById("proposals", id); }
export function deleteProposal(id) {
  const prop = _getById("proposals", id);
  if (prop) {
    try {
      const jobPost = _getById("jobPosts", prop.jobPostId);
      if (jobPost) {
        const clientUser = _getById("users", jobPost.clientId);
        const clientName = clientUser?.fullName || "Client";
        _create("notifications", {
          userId: prop.expertId,
          title: `${clientName} | ${jobPost.title} | Đã Decline Proposal`,
          message: `${clientName} đã từ chối proposal của bạn cho dự án ${jobPost.title}.`,
          type: "proposal",
          isRead: false,
          linkTo: `/expert/proposals`,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error sending decline notification:", err);
    }
    return _delete("proposals", id);
  }
  return false;
}
export function createProposal(data) {
  const propData = {
    ...data,
    submittedAt: data.submittedAt || (data.status === "pending" || data.status === "submitted" ? new Date().toISOString() : null),
  };
  const prop = _create("proposals", propData);
  try {
    const jobPost = _getById("jobPosts", prop.jobPostId);
    if (jobPost) {
      if (prop.isSubmitted === false) {
        // Invite flow: notify the expert
        const clientUser = _getById("users", jobPost.clientId);
        const clientName = clientUser?.fullName || "Client";
        const formattedDate = formatViDate(jobPost.createdAt || new Date().toISOString());
        const descriptionStr = `Lĩnh vực: ${jobPost.category || jobPost.aiCategoryDomain?.name || "AI"} - ${jobPost.description}`;
        
        _create("notifications", {
          userId: prop.expertId,
          title: `${clientName} | ${jobPost.title} | Invite Into Job`,
          message: `mô tả: ${jobPost.description || ""} | ngày đăng: ${formattedDate} | số tiền: $${jobPost.budget}`,
          type: "proposal",
          isRead: false,
          linkTo: `/expert/jobs/${jobPost.id}`,
          createdAt: new Date().toISOString()
        });
      } else {
        // Normal proposal flow: notify the client
        const expert = _getById("users", prop.expertId);
        const expertName = expert?.fullName || "Expert";
        const formattedDate = formatViDate(prop.createdAt || new Date().toISOString());

        _create("notifications", {
          userId: jobPost.clientId,
          title: `Đề xuất mới cho công việc: ${jobPost.title}`,
          message: `Chuyên gia ${expertName} vừa gửi một đề xuất mới cho công việc của bạn.`,
          type: "proposal",
          isRead: false,
          linkTo: `/client/my-projects?projectId=${jobPost.id}&view=proposals`,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("Notification trigger error in createProposal:", err);
  }
  return prop;
}
export function updateProposal(id, data) {
  const updated = _update("proposals", id, data);
  try {
    if (updated) {
      const jobPost = _getById("jobPosts", updated.jobPostId);
      if (jobPost) {
        const expert = _getById("users", updated.expertId);
        const expertName = expert?.fullName || "Expert";
        if (updated.isSubmitted !== false) {
          const formattedDate = formatViDate(updated.createdAt || new Date().toISOString());

          _create("notifications", {
            userId: jobPost.clientId,
            title: `Cập nhật đề xuất cho công việc: ${jobPost.title}`,
            message: `Chuyên gia ${expertName} đã cập nhật và gửi lại đề xuất theo yêu cầu.`,
            type: "proposal",
            isRead: false,
            linkTo: `/client/my-projects?projectId=${jobPost.id}&view=proposals`,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error("Notification trigger error in updateProposal:", err);
  }
  return updated;
}
export function updateProposalStatus(id, status) {
  const existing = _getById("proposals", id);
  const updated = _update("proposals", id, {
    status,
    // ponytail: track when proposal was first submitted for expiry flow
    submittedAt: existing?.submittedAt || new Date().toISOString(),
  });
  try {
    if (updated) {
      const jobPost = _getById("jobPosts", updated.jobPostId);
      if (jobPost) {
        const clientUser = _getById("users", jobPost.clientId);
        const clientName = clientUser?.fullName || "Client";
        const formattedDate = formatViDate(new Date().toISOString());
        
        if (updated.isSubmitted === false && status?.toLowerCase() === "declined") {
          const expert = _getById("users", updated.expertId);
          const expertName = expert?.fullName || "Expert";
          
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'pm' : 'am';
          const displayHours = hours % 12 || 12;
          const dayMonthYear = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
          const formatDateTime = `${dayMonthYear} - ${displayHours}:${minutes} ${ampm}`;

          _create("notifications", {
            userId: jobPost.clientId,
            title: `${expertName} | Dự án: ${jobPost.title}`,
            message: `Đã từ chối Invite, ngày từ chối: ${formatDateTime}`,
            type: "proposal",
            isRead: false,
            linkTo: `/client/my-projects?projectId=${jobPost.id}&view=details`,
            createdAt: new Date().toISOString()
          });
        } else if (status?.toLowerCase() === "accepted" || status?.toLowerCase() === "pending_escrow" || status?.toLowerCase() === "pending_pay") {
          _create("notifications", {
            userId: updated.expertId,
            title: `Đề xuất được chấp nhận | Dự án: ${jobPost.title}`,
            message: `Chúc mừng! Đề xuất của bạn đã được khách hàng ${clientName} chấp nhận.`,
            type: "proposal",
            isRead: false,
            linkTo: `/expert/proposals/${updated.id}`,
            createdAt: new Date().toISOString()
          });

          // Decline and notify all other experts for the same job post with status 'rejected'
          const allProps = _list("proposals");
          for (const other of allProps) {
            if (other.jobPostId === updated.jobPostId && other.id !== updated.id && other.status !== "declined" && other.status !== "rejected") {
              _update("proposals", other.id, { status: "rejected" });
              _create("notifications", {
                userId: other.expertId,
                title: `Đề xuất bị từ chối | Dự án: ${jobPost.title}`,
                message: `Rất tiếc, khách hàng ${clientName} đã từ chối đề xuất của bạn cho dự án này.`,
                type: "proposal",
                isRead: false,
                linkTo: `/expert/proposals/${other.id}`,
                createdAt: new Date().toISOString()
              });
            }
          }
        } else if (status?.toLowerCase() === "declined" || status?.toLowerCase() === "rejected") {
          _create("notifications", {
            userId: updated.expertId,
            title: `Đề xuất bị từ chối | Dự án: ${jobPost.title}`,
            message: `Rất tiếc, khách hàng ${clientName} đã từ chối đề xuất của bạn cho dự án này.`,
            type: "proposal",
            isRead: false,
            linkTo: `/expert/proposals/${updated.id}`,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error("Notification trigger error in updateProposalStatus:", err);
  }
  return updated;
}

export function listProjects(filterFn) { return _list("projects", filterFn); }
export function getProjectById(id) { return _getById("projects", id); }
export function createProject(data) { return _create("projects", data); }
export function updateProject(id, data) { return _update("projects", id, data); }
export function updateProjectStatus(id, status) { return _update("projects", id, { status }); }

export function submitProjectFinalWork(projectId, expertName, projectLink, projectFile) {
  const project = _getById("projects", projectId);
  if (!project) return null;
  const updated = _update("projects", projectId, {
    finalWorkSubmitted: true,
    finalDeliveryStatus: "Final Product Submitted",
    finalProjectLink: projectLink,
    finalProjectFile: projectFile,
    finalWorkDeclineReason: null,
  });

  try {
    const expertUser = _getById("users", project.assignedExpertId);
    const expName = expertUser?.fullName || expertName || "Expert";
    _create("notifications", {
      userId: project.clientId,
      title: `Bàn giao sản phẩm tổng | Dự án: ${project.title}`,
      message: `Chuyên gia ${expName} đã nộp sản phẩm tổng thể cho dự án của bạn. Vui lòng kiểm tra và duyệt.`,
      type: "system",
      isRead: false,
      linkTo: `/client/projects/${project.id}`,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Notification trigger error in submitProjectFinalWork:", err);
  }

  addAuditEntry({
    projectId,
    action: "final_work_submitted",
    actor: "Expert",
    actorName: expertName || "Expert",
    details: `Expert submitted final deliverables. Link: ${projectLink || "N/A"}, File: ${projectFile || "N/A"}`,
  });

  return updated;
}

export function acceptProjectFinalDelivery(projectId, clientName) {
  const project = _getById("projects", projectId);
  if (!project) return null;
  const updated = _update("projects", projectId, {
    finalDeliveryStatus: "Accepted",
  });

  addAuditEntry({
    projectId,
    action: "final_delivery_accepted",
    actor: "Client",
    actorName: clientName || "Client",
    details: `Client accepted final project deliverables.`,
  });

  return updated;
}

export function declineProjectFinalDelivery(projectId, clientName, feedback) {
  const project = _getById("projects", projectId);
  if (!project) return null;
  const updated = _update("projects", projectId, {
    finalDeliveryStatus: "Declined",
    finalWorkSubmitted: false,
    finalWorkDeclineReason: feedback || null,
  });

  try {
    const clientUser = _getById("users", project.clientId);
    const cliName = clientUser?.fullName || clientName || "Client";
    _create("notifications", {
      userId: project.assignedExpertId,
      title: `Từ chối sản phẩm tổng | Dự án: ${project.title}`,
      message: `Khách hàng ${cliName} đã từ chối sản phẩm tổng thể. Lý do: ${feedback || "Không có chi tiết"}`,
      type: "system",
      isRead: false,
      linkTo: `/expert/projects/${project.id}`,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Notification trigger error in declineProjectFinalDelivery:", err);
  }

  addAuditEntry({
    projectId,
    action: "final_delivery_declined",
    actor: "Client",
    actorName: clientName || "Client",
    details: `Client declined final project deliverables. Reason: ${feedback || "None"}`,
  });

  return updated;
}


export function listTransactions(filterFn) { return _list("transactions", filterFn); }
export function createTransaction(data) {
  const txn = _create("transactions", data);
  try {
    if (txn && txn.type === "escrow_deposit") {
      let project = _getById("projects", txn.projectId);
      if (!project && txn.projectId) {
        // Fallback: if projectId is a jobPostId, search projects by jobPostId
        project = _list("projects").find((p) => p.jobPostId === txn.projectId);
      }
      if (project) {
        const client = _getById("users", project.clientId);
        const clientName = client?.fullName || "Client";
        const proposalsList = _list("proposals", (p) => p.jobPostId === project.jobPostId && p.expertId === project.assignedExpertId);
        const proposalId = proposalsList[0]?.id || "";
        _create("notifications", {
          userId: project.assignedExpertId,
          title: `Ký quỹ thành công | Dự án: ${project.title}`,
          message: `Khách hàng ${clientName} đã nạp tiền ký quỹ thành công. Dự án chính thức bắt đầu!`,
          type: "payment",
          isRead: false,
          linkTo: `/expert/proposals/${proposalId}`,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("Notification trigger error in createTransaction:", err);
  }
  return txn;
}

export function listReports(filterFn) { return _list("reports", filterFn); }
export function getReportById(id) { return _getById("reports", id); }
export function createReport(data) {
  const reporter = _getById("users", data.reporterId);
  const reporterRole = reporter?.role || "expert";
  const reportType = reporterRole === "client" ? "type1" : "type2";

  const reportData = {
    ...data,
    reporterRole,
    reportType,
    status: data.status || "Pending", // ponytail: confidential pending, not visible to responder
    responderNotified: false, // ponytail: confidentiality lock
  };

  const report = _create("reports", reportData);
  // ponytail: confidential pending — DO NOT notify responder yet. Admin reviews first.
  try {
    if (report) {
      const project = _getById("projects", report.projectId);
      if (project) {
        const reporterName = reporter?.fullName || "User";
        // Only notify admins about new report, not the responder
        const admins = _list("users", (u) => u.role === "admin" || u.role === "owner");
        for (const admin of admins) {
          _create("notifications", {
            userId: admin.id,
            title: `New Dispute Report | Project: ${project.title}`,
            message: `${reporterName} (${reporterRole}) filed a report. Reason: ${report.reason || report.description || "Dispute"}`,
            type: "dispute",
            isRead: false,
            linkTo: `/admin/disputes/${report.id}`,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error("Notification trigger error in createReport:", err);
  }
  return report;
}
export function updateReport(id, data) { return _update("reports", id, data); }

/**
 * Admin accepts a dispute report. Notifies responder and marks project as Disputed.
 */
export function acceptDisputeReport(reportId, adminName) {
  const report = _getById("reports", reportId);
  if (!report) return null;

  const updated = _update("reports", reportId, {
    status: "Under Review",
    responderNotified: true,
    acceptedBy: adminName || "Admin",
    acceptedAt: new Date().toISOString(),
  });

  // Mark project as Disputed
  if (report.projectId) {
    _update("projects", report.projectId, { status: "disputed" });
  }

  // Notify the responder
  const project = _getById("projects", report.projectId);
  if (project) {
    const responderId = report.reporterRole === "client"
      ? (project.assignedExpertId || project.expertId)
      : project.clientId;
    if (responderId) {
      _create("notifications", {
        userId: responderId,
        title: `Dispute Filed | Project: ${project.title}`,
        message: `A dispute has been filed against you. Admin is now reviewing. You may submit your response.`,
        type: "dispute",
        isRead: false,
        linkTo: report.reporterRole === "client"
          ? `/expert/projects/${project.id}`
          : `/client/projects/${project.id}`,
        createdAt: new Date().toISOString()
      });
    }
  }

  return updated;
}

/**
 * Admin resolves a dispute with a ruling.
 * @param {'Continue'|'Stop Project'|'Force Payout'|'Refund Client'} ruling
 */
export function resolveDispute(reportId, ruling, adminNote) {
  const report = _getById("reports", reportId);
  if (!report) return null;

  const updatedReport = _update("reports", reportId, {
    status: "Resolved",
    adminNote: adminNote || null,
    ruling: ruling,
    resolvedAt: new Date().toISOString(),
  });

  const project = _getById("projects", report.projectId);
  if (project) {
    if (ruling === "Continue") {
      _update("projects", project.id, { status: "active" });
    } else {
      _update("projects", project.id, { status: ruling === "Force Payout" ? "completed" : "cancelled" });
    }
  }

  return updatedReport;
}

export function listReviews(filterFn) { return _list("reviews", filterFn); }
export function getReviewById(id) { return _getById("reviews", id); }
export function updateReview(id, data) { return _update("reviews", id, data); }
export function deleteReview(id) { return _delete("reviews", id); }

export function listNotifications(filterFn) { return _list("notifications", filterFn); }
export function updateNotification(id, data) { return _update("notifications", id, data); }
export function markAllNotificationsRead(userId) { const all = _list("notifications", (n) => n.userId === userId); for (const n of all) _update("notifications", n.id, { isRead: true }); return true; }

/**
 * Create a new notification in the mock database.
 * Used by notificationHelper.js sendNotification → mockApiHandler POST /notifications.
 */
export function createNotification(data) {
  const notif = {
    id: generateId("notif"),
    userId: data.userId,
    title: data.title,
    message: data.message || "",
    type: data.type || "system",
    isRead: false,
    linkTo: data.linkTo || "",
    createdAt: data.createdAt || new Date().toISOString(),
  };
  _create("notifications", notif);
  triggerDbUpdate();
  return notif;
}

export function listMessages(filterFn) { return _list("messages", filterFn); }
export function createMessage(data) {
  const msg = _create("messages", data);
  try {
    if (msg) {
      const sender = _getById("users", msg.senderId);
      const senderName = sender?.fullName || "User";
      const convId = msg.senderId;
      _create("notifications", {
        userId: msg.receiverId,
        title: `${senderName} | Đang gửi tin nhắn`,
        message: msg.content || msg.text || "Đang gửi tin nhắn cho bạn.",
        type: "message",
        isRead: false,
        linkTo: `/messenger/${convId}`,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Notification trigger error in createMessage:", err);
  }
  return msg;
}

export function listTasks(filterFn) { return _list("tasks", filterFn); }
export function getTaskById(id) { return _getById("tasks", id); }
export function createTask(data) { return _create("tasks", data); }
export function updateTask(id, data) { return _update("tasks", id, data); }

// =============================================================================
// AUDIT LOG HELPERS
// =============================================================================

/**
 * Add an audit log entry. Stored in runtime overlay so it survives soft page
 * refreshes during a session.
 *
 * @param {{ projectId?: string, taskId?: string, miniTaskId?: string,
 *           action: string, actor: string, actorName?: string, details?: string }} entry
 * @returns the created audit log entry
 */
export function addAuditEntry({ projectId, taskId, miniTaskId, action, actor, actorName, details }) {
  const entry = {
    id: generateId("audit"),
    projectId: projectId || null,
    taskId: taskId || null,
    miniTaskId: miniTaskId || null,
    action,
    actor,
    actorName: actorName || actor,
    timestamp: new Date().toISOString(),
    details: details || "",
  };
  _create("auditLogs", entry);
  return entry;
}

/**
 * Get audit logs, optionally filtered by projectId or taskId.
 * Returns newest first.
 *
 * @param {{ projectId?: string, taskId?: string }} filter
 * @returns {Array} audit log entries
 */
export function getAuditLogs(filter = {}) {
  let logs = _list("auditLogs");
  if (filter.projectId) {
    logs = logs.filter((l) => l.projectId === filter.projectId);
  }
  if (filter.taskId) {
    logs = logs.filter((l) => l.taskId === filter.taskId);
  }
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// =============================================================================
// MINI-TASK MUTATION HELPERS
// =============================================================================

/**
 * Add a new mini task to a task.
 * @param {string} taskId
 * @param {{ title: string, description?: string, estimatedTime?: string }} miniTaskData
 */
export function addMiniTaskToTask(taskId, miniTaskData, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = [...(task.miniTasks || [])];
  const maxOrder = miniTasks.reduce((max, mt) => Math.max(max, mt.order || 0), 0);
  const newMini = {
    id: generateId("mt"),
    title: miniTaskData.title,
    description: miniTaskData.description || "",
    estimatedTime: miniTaskData.estimatedTime || "",
    status: "pending",
    isCompleted: false,
    confirmed: true,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
  miniTasks.push(newMini);
  const result = _update("tasks", taskId, { miniTasks });

  // Audit log
  addAuditEntry({
    projectId: task.projectId,
    taskId,
    miniTaskId: newMini.id,
    action: "mini_task_created",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `Created mini task "${newMini.title}"`,
  });

  return result;
}

/**
 * Remove a mini task from a task.
 */
export function removeMiniTaskFromTask(taskId, miniTaskId) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).filter((mt) => mt.id !== miniTaskId);
  return _update("tasks", taskId, { miniTasks });
}

/**
 * Reorder mini tasks within a task. orderedIds should be the new order of mini task IDs.
 */
export function reorderMiniTasksInTask(taskId, orderedIds) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = [...(task.miniTasks || [])];
  const reordered = orderedIds.map((id, idx) => {
    const mt = miniTasks.find((m) => m.id === id);
    if (!mt) return null;
    return { ...mt, order: idx + 1 };
  }).filter(Boolean);
  return _update("tasks", taskId, { miniTasks: reordered });
}

/**
 * Update a mini task's fields (title, description, estimatedTime).
 */
export function updateMiniTaskInTask(taskId, miniTaskId, updates) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => {
    if (mt.id === miniTaskId) return { ...mt, ...updates, updatedAt: new Date().toISOString() };
    return mt;
  });
  return _update("tasks", taskId, { miniTasks });
}

/**
 * Confirm/lock mini tasks for a task. Sets confirmed=true on all mini tasks
 * and sets task status to "In Progress".
 */
export function confirmMiniTasksForTask(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => ({
    ...mt,
    confirmed: true,
  }));
  const status = miniTasks.length > 0 ? "in_progress" : task.status;
  const result = _update("tasks", taskId, { miniTasks, status });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "mini_tasks_confirmed",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `Confirmed ${miniTasks.length} mini tasks`,
  });

  return result;
}

/**
 * Unlock mini tasks (e.g., after client requests reopen).
 */
export function unlockMiniTasksForTask(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => ({
    ...mt,
    confirmed: false,
  }));
  const result = _update("tasks", taskId, { miniTasks });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "mini_tasks_unlocked",
    actor: "Client",
    actorName: actorName || "Client",
    details: "Mini tasks unlocked for editing",
  });

  return result;
}

/**
 * Toggle a mini task's completion state. Auto-saves immediately.
 * @param {string} taskId
 * @param {string} miniTaskId
 * @param {string} [actorName] — name of the expert toggling completion
 */
export function toggleMiniTaskCompletion(taskId, miniTaskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => {
    if (mt.id === miniTaskId) {
      const newCompleted = !(mt.isCompleted === true || mt.status === "done" || mt.status === "completed");
      return {
        ...mt,
        isCompleted: newCompleted,
        status: newCompleted ? "done" : (mt.status === "done" || mt.status === "completed" ? "in_progress" : mt.status),
        completedAt: newCompleted ? new Date().toISOString() : null,
        completedBy: newCompleted ? (actorName || task.assignedTo || "Expert") : null,
      };
    }
    return mt;
  });
  const result = _update("tasks", taskId, { miniTasks });

  // Audit log
  const toggledMt = miniTasks.find((mt) => mt.id === miniTaskId);
  if (toggledMt && toggledMt.isCompleted) {
    addAuditEntry({
      projectId: task.projectId,
      taskId,
      miniTaskId,
      action: "mini_task_completed",
      actor: "Expert",
      actorName: actorName || task.assignedTo || "Expert",
      details: `Completed mini task "${toggledMt.title}"`,
    });
  }

  return result;
}

/**
 * Expert submits handover evidence for a task when all miniTasks are complete.
 * Transitions task to "checklist_completed".
 */
/**
 * Legacy submit task for review — delegates to evidence-based flow.
 * @deprecated Use submitTaskHandoverEvidence for the new flow.
 */
export function submitTaskForReview(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = task.miniTasks || [];
  const allDone = miniTasks.length > 0 && miniTasks.every(
    (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
  );
  if (!allDone) return null;
  // Auto-create default evidence for legacy calls
  const result = _update("tasks", taskId, {
    status: "pending_review",
    approval: null,
    handoverEvidence: task.handoverEvidence || {
      gitSha: null,
      reportLink: null,
      explanation: "Legacy submission (pre-handover evidence flow)",
      submittedAt: new Date().toISOString(),
      submittedBy: actorName || "Expert",
    },
    urgentRequest: false,
    urgentResolvedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_submitted_for_review",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `[Legacy] Submitted task "${task.title}" for client review`,
  });

  return result;
}

/**
 * Expert submits handover evidence for a task when all miniTasks are complete.
 * Transitions task to "checklist_completed".
 */
export function submitTaskHandoverEvidence(taskId, actorName, evidence) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = task.miniTasks || [];
  const allDone = miniTasks.length > 0 && miniTasks.every(
    (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
  );
  if (!allDone) return null;

  const result = _update("tasks", taskId, {
    status: "checklist_completed",
    handoverEvidence: {
      gitSha: evidence?.gitSha || null,
      reportLink: evidence?.reportLink || null,
      explanation: evidence?.explanation || "",
      submittedAt: new Date().toISOString(),
      submittedBy: actorName || task.assignedTo || "Expert",
    },
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "handover_evidence_submitted",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `Submitted handover evidence for task "${task.title}"`,
  });

  return result;
}

/**
 * Client quick-accepts a checklist_completed task → done.
 */
export function quickAcceptTask(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task || task.status !== "checklist_completed") return null;
  return _update("tasks", taskId, {
    status: "completed",
    approval: "Quick Accepted",
  });
}

/**
 * Client requests product from expert. Sets task to waiting_expert_product.
 */
export function requestTaskProduct(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task || task.status !== "checklist_completed") return null;
  const result = _update("tasks", taskId, {
    status: "waiting_expert_product",
    productRequested: true,
    productRequestedBy: actorName || "Client",
    productRequestedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "product_requested",
    actor: "Client",
    actorName: actorName || "Client",
    details: `Requested product delivery for task "${task.title}"`,
  });

  return result;
}

/**
 * Expert submits product → waiting_for_approval.
 */
export function expertSubmitTaskProduct(taskId, actorName, productLink, productFile) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const result = _update("tasks", taskId, {
    status: "waiting_for_approval",
    productLink: productLink || task.productLink || null,
    productFile: productFile || task.productFile || null,
    productSubmittedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_product_submitted",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `Expert submitted product. Link: ${productLink || "N/A"}, File: ${productFile || "N/A"}`,
  });

  return result;
}

/**
 * Client accepts submitted product → done.
 */
export function clientAcceptTaskProduct(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task || task.status !== "waiting_for_approval") return null;
  return _update("tasks", taskId, {
    status: "completed",
    approval: "Approved",
  });
}

/**
 * Client declines product → rework with orange styling.
 */
export function clientDeclineTaskProduct(taskId, actorName, feedback) {
  const task = _getById("tasks", taskId);
  if (!task || task.status !== "waiting_for_approval") return null;
  return _update("tasks", taskId, {
    status: "rework",
    approval: null,
    clientFeedback: feedback || null,
    declineReason: feedback || null,
    productRequested: false,
  });
}

// ponytail: these are new statuses, keep old ones for compatibility
export const TASK_DISPLAY_STATUSES = {
  not_started: { label: "Not Started", color: "gray" },
  in_progress: { label: "In Progress", color: "blue" },
  completed: { label: "Done", color: "green" },
  checklist_completed: { label: "Checklist Completed", color: "amber" },
  waiting_expert_product: { label: "Waiting for Expert Product", color: "yellow" },
  waiting_for_approval: { label: "Waiting for Approval", color: "purple" },
  rework: { label: "Rework", color: "orange" },
  needs_revision: { label: "Rework", color: "orange" }, // legacy mapping
  declined: { label: "Rework", color: "orange" },
  done: { label: "Done", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
  pending: { label: "Pending", color: "gray" },
  pending_review: { label: "Waiting for Approval", color: "purple" },
};

/**
 * @deprecated Use submitTaskForReview instead.
 * Kept for backward compatibility — delegates to submitTaskForReview.
 */
export function submitTaskAsDone(taskId, actorName) {
  // Old behavior: directly set completed. Now routes through review workflow.
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = task.miniTasks || [];
  const allDone = miniTasks.length > 0 && miniTasks.every(
    (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
  );
  if (!allDone) return null;
  return submitTaskForReview(taskId, actorName);
}

/**
 * Client approves a task submission. Sets task to completed.
 *
 * @param {string} taskId
 * @param {string} [actorName]
 */
export function approveTaskSubmission(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const result = _update("tasks", taskId, {
    status: "completed",
    approval: "Approved",
    urgentRequest: false,
    urgentResolvedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_approved",
    actor: "Client",
    actorName: actorName || "Client",
    details: `Approved task "${task.title}"`,
  });

  return result;
}

/**
 * Client requests revision on a submitted task. Unlocks mini tasks for expert editing.
 *
 * @param {string} taskId
 * @param {string} [actorName]
 * @param {string} [feedback]
 */
export function requestTaskRevision(taskId, actorName, feedback) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => ({
    ...mt,
    confirmed: false,
  }));
  const result = _update("tasks", taskId, {
    status: "needs_revision",
    approval: null,
    miniTasks,
    declineReason: feedback || null,
    clientFeedback: feedback || null
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_revision_requested",
    actor: "Client",
    actorName: actorName || "Client",
    details: feedback || `Requested revision on task "${task.title}"`,
  });

  return result;
}

/**
 * Expert submits deliverables (product link and/or product file) for a task.
 * Marks the task status as "pending_review".
 *
 * @param {string} taskId
 * @param {string} [actorName]
 * @param {string} [productLink]
 * @param {string} [productFile]
 */
export function submitTaskProduct(taskId, actorName, productLink, productFile) {
  const task = _getById("tasks", taskId);
  if (!task) return null;

  const result = _update("tasks", taskId, {
    status: "pending_review",
    approval: null,
    productLink: productLink || task.productLink || null,
    productFile: productFile || task.productFile || null,
    urgentRequest: false,
    urgentResolvedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_product_submitted",
    actor: "Expert",
    actorName: actorName || task.assignedTo || "Expert",
    details: `Expert submitted deliverables. Link: ${productLink || "N/A"}, File: ${productFile || "N/A"}`,
  });

  return result;
}


/**
 * Client requests urgent submission on an overdue/delayed task.
 * Does NOT change task status — only sets urgent flags and creates audit entry.
 *
 * @param {string} taskId
 * @param {string} [actorName]
 * @param {string} [actorId]
 */
export function requestUrgentSubmission(taskId, actorName, actorId) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  // Do not allow urgent request on completed tasks
  if (task.status === "completed" || task.status === "done" || task.approval === "Approved") return null;

  const result = _update("tasks", taskId, {
    urgentRequest: true,
    urgentRequestedAt: new Date().toISOString(),
    urgentRequestedBy: actorId || null,
    urgentRequestedByName: actorName || "Client",
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "urgent_submission_requested",
    actor: "Client",
    actorName: actorName || "Client",
    details: `Client requested urgent submission for this task`,
  });

  return result;
}

/**
 * Client requests reopen/revision on a completed task.
 */
export function requestTaskReopen(taskId, actorName) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  const miniTasks = (task.miniTasks || []).map((mt) => ({
    ...mt,
    confirmed: false,
  }));
  const result = _update("tasks", taskId, {
    status: "needs_revision",
    approval: null,
    miniTasks,
    urgentRequest: false,
    urgentResolvedAt: new Date().toISOString(),
  });

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "task_reopened",
    actor: "Client",
    actorName: actorName || "Client",
    details: `Requested reopen on task "${task.title}"`,
  });

  return result;
}

/**
 * Client requests revision on specific mini tasks only.
 * Only selected mini tasks are reopened — the rest stay as-is.
 *
 * @param {string} taskId
 * @param {string[]} miniTaskIds — IDs of mini tasks to reopen for revision
 * @param {string} [actorName] — client name
 * @param {string} [feedback] — revision reason
 */
export function requestMiniTaskRevision(taskId, miniTaskIds, actorName, feedback) {
  const task = _getById("tasks", taskId);
  if (!task) return null;
  if (!miniTaskIds || miniTaskIds.length === 0) return null;

  const miniTaskIdsSet = new Set(miniTaskIds);
  const now = new Date().toISOString();

  const updatedMiniTasks = (task.miniTasks || []).map((mt) => {
    if (miniTaskIdsSet.has(mt.id)) {
      return {
        ...mt,
        status: "needs_revision",
        isCompleted: false,
        revisionReason: feedback || "",
        revisionRequestedBy: actorName || "Client",
        revisionRequestedAt: now,
      };
    }
    return mt;
  });

  const result = _update("tasks", taskId, {
    status: "needs_revision",
    approval: null,
    miniTasks: updatedMiniTasks,
  });

  // Build details with mini task names
  const revisedTitles = updatedMiniTasks
    .filter((mt) => miniTaskIdsSet.has(mt.id))
    .map((mt) => mt.title);
  const details = feedback
    ? `Revised: ${revisedTitles.join(", ")} — Reason: ${feedback}`
    : `Revised: ${revisedTitles.join(", ")}`;

  addAuditEntry({
    projectId: task.projectId,
    taskId,
    action: "mini_task_revision_requested",
    actor: "Client",
    actorName: actorName || "Client",
    details,
  });

  return result;
}

export function getDashboardStats() {
  return {
    totalUsers: _list("users").length,
    totalProjects: _list("projects").length,
    activeProjects: _list("projects", (p) => p.status === "in_progress").length,
    completedProjects: _list("projects", (p) => p.status === "completed").length,
    totalRevenue: _list("transactions", (t) => t.type === "escrow_release" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
    openDisputes: _list("reports", (r) => r.status === "Pending").length,
  };
}

/**
 * Get revenue data computed from existing transactions.
 * Used by Admin Revenue and Owner Revenue pages.
 */
export function getRevenueData() {
  const txns = _list("transactions");
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  // Filter this month
  const thisMonthTxns = txns.filter((t) => {
    const d = new Date(t.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Filter last month
  const lastMonthTxns = txns.filter((t) => {
    const d = new Date(t.createdAt);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  // Compute from all transactions
  const escrowDeposits = txns.filter((t) => t.type === "escrow_deposit" && t.status === "completed");
  const escrowReleases = txns.filter((t) => t.type === "escrow_release" && t.status === "completed");
  const withdrawals = txns.filter((t) => t.type === "withdrawal" && t.status === "completed");

  const totalRevenue = escrowReleases.reduce((s, t) => s + (t.amount || 0), 0);
  const totalEscrowHeld = escrowDeposits.reduce((s, t) => s + (t.amount || 0), 0) - totalRevenue;
  const totalPaidToExperts = escrowReleases.reduce((s, t) => s + (t.amount || 0), 0);

  // Build monthly breakdown
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyBreakdown = [];
  for (let i = 5; i >= 0; i--) {
    let m = thisMonth - i;
    let y = thisYear;
    if (m < 0) { m += 12; y--; }
    const monthTxns = txns.filter((t) => {
      const d = new Date(t.createdAt);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    monthlyBreakdown.push({
      month: `${monthNames[m]} ${y}`,
      fees: monthTxns.filter((t) => t.type === "escrow_release" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0),
      escrowProcessed: monthTxns.filter((t) => t.type === "escrow_deposit" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0),
      withdrawals: monthTxns.filter((t) => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0),
    });
  }

  // Build transaction log for the table
  const transactionLog = txns.map((t) => {
    const fromUser = t.fromUserId ? _getById("users", t.fromUserId) : null;
    const toUser = t.toUserId ? _getById("users", t.toUserId) : null;
    const project = t.projectId ? _getById("projects", t.projectId) : null;
    return {
      id: t.id,
      type: t.type,
      amount: t.amount,
      from: fromUser?.fullName || "System",
      to: toUser?.fullName || t.type === "withdrawal" ? "Bank Account" : "Platform",
      project: project?.title || t.description || "—",
      date: t.createdAt?.split("T")[0] || "",
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    summary: {
      totalRevenue,
      thisMonth: thisMonthTxns.filter((t) => t.type === "escrow_release" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0),
      lastMonth: lastMonthTxns.filter((t) => t.type === "escrow_release" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0),
      escrowHeld: Math.max(0, totalEscrowHeld),
      paidToExperts: totalPaidToExperts,
    },
    monthlyBreakdown,
    totalPlatformFees: totalRevenue,
    totalWithdrawals: withdrawals.reduce((s, t) => s + (t.amount || 0), 0),
    transactions: transactionLog,
  };
}

// =============================================================================
// CONTRACT CANCELLATION — Client-initiated escrow split by progress
// =============================================================================

/**
 * Client cancels an active project contract. Escrow is split:
 *   Expert gets: progressPayout + 10% compensation (capped at 95%)
 *   Platform gets: 5% service fee
 *   Client gets: remaining refund
 *
 * @param {string} projectId
 * @param {string} clientId
 * @param {string} [reason]
 * @returns {{ project: object, breakdown: object } | null}
 */
export function cancelProjectContract(projectId, clientId, reason) {
  const project = _getById("projects", projectId);
  if (!project) throw new Error("Project not found.");

  // Validate caller is the client
  if (project.clientId !== clientId) {
    throw new Error("Only the project client can cancel the contract.");
  }

  // Validate cancellable status
  const status = (project.status || "").toLowerCase();
  const cancellable = ["active", "in_progress", "in progress"];
  if (!cancellable.includes(status)) {
    throw new Error(
      `Project cannot be cancelled. Current status: ${project.status}. Only active/in-progress projects can be cancelled.`
    );
  }

  // Prevent double cancellation
  if (project.contractCancellation) {
    throw new Error("This contract has already been cancelled.");
  }

  // Calculate progress from tasks
  const tasks = _list("tasks", (t) => t.projectId === projectId);
  let overallProgress = 0;
  if (tasks.length > 0) {
    let totalPercent = 0;
    tasks.forEach((task) => {
      const miniTasks = task.miniTasks || [];
      if (miniTasks.length === 0) { totalPercent += 0; return; }
      const done = miniTasks.filter((mt) =>
        mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
      ).length;
      totalPercent += Math.round((done / miniTasks.length) * 100);
    });
    overallProgress = Math.round(totalPercent / tasks.length);
  }

  // Determine contract amount
  const contractAmount =
    project.escrowAmount ||
    project.escrowBalance ||
    project.budget ||
    0;

  if (contractAmount <= 0) {
    throw new Error("No escrow amount found. Cancellation cannot proceed.");
  }

  // Formula
  const progressRate = overallProgress / 100;
  const progressPayout = Math.round(contractAmount * progressRate * 100) / 100;
  const compensationFee = Math.round(contractAmount * 0.10 * 100) / 100;
  const platformServiceFee = Math.round(contractAmount * 0.05 * 100) / 100;

  // Cap: expert payout ≤ contractAmount - platformFee
  const rawExpertPayout = progressPayout + compensationFee;
  const expertPayout = Math.round(
    Math.min(contractAmount - platformServiceFee, rawExpertPayout) * 100
  ) / 100;
  const clientRefund = Math.round(
    Math.max(0, contractAmount - expertPayout - platformServiceFee) * 100
  ) / 100;

  // Update Expert wallet
  const expertUser = _getById("users", project.assignedExpertId);
  if (expertUser) {
    const ew = expertUser.wallet || { balance: 0, pendingBalance: 0, totalEarned: 0 };
    ew.balance = Math.round((ew.balance + expertPayout) * 100) / 100;
    ew.totalEarned = Math.round(((ew.totalEarned || 0) + expertPayout) * 100) / 100;
    updateUser(expertUser.id, { wallet: { ...ew } });
  }

  // Update Client wallet (refund)
  const clientUser = _getById("users", project.clientId);
  if (clientUser) {
    const cw = clientUser.wallet || { balance: 0, pendingBalance: 0, totalEarned: 0 };
    cw.balance = Math.round((cw.balance + clientRefund) * 100) / 100;
    // Release escrow hold
    cw.pendingBalance = Math.round(Math.max(0, (cw.pendingBalance || 0) - contractAmount) * 100) / 100;
    if (cw.escrowBalance != null) {
      cw.escrowBalance = Math.round(Math.max(0, cw.escrowBalance - contractAmount) * 100) / 100;
    }
    updateUser(clientUser.id, { wallet: { ...cw } });
  }

  // Update project
  const cancellationMeta = {
    cancelledBy: clientId,
    cancelledAt: new Date().toISOString(),
    reason: reason || null,
    progressPercent: overallProgress,
    contractAmount,
    progressPayout,
    compensationFee,
    platformServiceFee,
    expertPayout,
    clientRefund,
  };

  const updated = _update("projects", projectId, {
    status: "contract_cancelled",
    contractCancellation: cancellationMeta,
    updatedAt: new Date().toISOString(),
  });

  // Create transactions
  _create("transactions", {
    id: generateId("txn"),
    projectId,
    fromUserId: "system",
    toUserId: project.assignedExpertId,
    amount: expertPayout,
    type: "contract_cancel_expert_payout",
    status: "completed",
    description: `Contract cancellation — expert payout (${overallProgress}% progress + 10% compensation)`,
    createdAt: new Date().toISOString(),
  });

  _create("transactions", {
    id: generateId("txn"),
    projectId,
    fromUserId: "system",
    toUserId: project.clientId,
    amount: clientRefund,
    type: "contract_cancel_client_refund",
    status: "completed",
    description: `Contract cancellation — client refund`,
    createdAt: new Date().toISOString(),
  });

  _create("transactions", {
    id: generateId("txn"),
    projectId,
    fromUserId: "system",
    toUserId: "platform",
    amount: platformServiceFee,
    type: "contract_cancel_platform_fee",
    status: "completed",
    description: `Contract cancellation — platform service fee (5%)`,
    createdAt: new Date().toISOString(),
  });

  // Notifications
  const projectTitle = project.title || "Untitled";
  const expertName = expertUser?.fullName || "Expert";
  const clientName = clientUser?.fullName || "Client";

  _create("notifications", {
    userId: project.assignedExpertId,
    title: `Contract Cancelled: ${projectTitle}`,
    message: `The client cancelled the contract for "${projectTitle}". You received $${expertPayout.toLocaleString()} (progress payout + 10% compensation). The project is now closed.`,
    type: "system",
    isRead: false,
    linkTo: `/expert/projects/${projectId}`,
    createdAt: new Date().toISOString(),
  });

  _create("notifications", {
    userId: project.clientId,
    title: `Contract Cancelled: ${projectTitle}`,
    message: `Your contract cancellation for "${projectTitle}" has been processed. Refund amount: $${clientRefund.toLocaleString()}.`,
    type: "system",
    isRead: false,
    linkTo: `/client/projects/${projectId}`,
    createdAt: new Date().toISOString(),
  });

  // Notify admins
  const admins = _list("users", (u) => u.role === "admin");
  admins.forEach((admin) => {
    _create("notifications", {
      userId: admin.id,
      title: `Contract Cancelled by Client: ${projectTitle}`,
      message: `Client ${clientName} cancelled contract for "${projectTitle}". Platform fee collected: $${platformServiceFee.toLocaleString()}.`,
      type: "system",
      isRead: false,
      linkTo: `/admin/projects/${projectId}`,
      createdAt: new Date().toISOString(),
    });
  });

  addAuditEntry({
    projectId,
    action: "contract_cancelled",
    actor: "Client",
    actorName: clientName,
    details: `Client cancelled contract. Progress: ${overallProgress}%. Expert payout: $${expertPayout.toLocaleString()}, Client refund: $${clientRefund.toLocaleString()}, Platform fee: $${platformServiceFee.toLocaleString()}. Reason: ${reason || "None provided"}`,
  });

  triggerDbUpdate();

  return {
    project: updated,
    breakdown: cancellationMeta,
  };
}

export function resetMockDatabase() {
  for (const key of Object.keys(_runtimeOverlay)) {
    if (key === "_deleted") _runtimeOverlay._deleted.clear();
    else _runtimeOverlay[key].clear();
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("aitasker_mock_db");
  }
  triggerDbUpdate();
}

// Expose for easy console debugging
if (typeof window !== "undefined") {
  window.__resetMockDatabase = resetMockDatabase;
  window.__MOCK_DB_VERSION = MOCK_DB_VERSION;
}

export { _baseData as baseData };

export const mockDatabase = {
  get projects() {
    return _list("projects");
  },
  get users() {
    return _list("users");
  },
  get tasks() {
    return _list("tasks");
  },
  get jobPosts() {
    return _list("jobPosts");
  },
  get proposals() {
    return _list("proposals");
  },
  get transactions() {
    return _list("transactions");
  },
  get reports() {
    return _list("reports");
  },
  get reviews() {
    return _list("reviews");
  },
  get notifications() {
    return _list("notifications");
  },
  get messages() {
    return _list("messages");
  },
  get auditLogs() {
    return _list("auditLogs");
  }
};

function syncMutationsToOverlay() {
  const tables = ["users", "categories", "jobPosts", "proposals", "projects", "transactions", "reports", "reviews", "notifications", "messages", "tasks", "auditLogs"];
  let mutated = false;
  for (const table of tables) {
    const list = _list(table);
    const overlay = _runtimeOverlay[table];
    for (const item of list) {
      const baseItem = _baseById[table]?.[item.id];
      if (baseItem) {
        const isDifferent = JSON.stringify(item) !== JSON.stringify(baseItem);
        if (isDifferent) {
          const overlayItem = overlay.get(item.id);
          if (!overlayItem || JSON.stringify(item) !== JSON.stringify(overlayItem)) {
            overlay.set(item.id, { ...item });
            mutated = true;
          }
        }
      }
    }
  }
  if (mutated) {
    saveOverlay();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("aitasker_db_update", syncMutationsToOverlay);
}
