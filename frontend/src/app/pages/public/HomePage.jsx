import { Link } from "react-router";
import { 
  BookOpen, 
  TrendingUp, 
  Languages, 
  Palette, 
  Scale, 
  Search, 
  Users, 
  Briefcase, 
  ArrowRight, 
  Star, 
  CheckCircle2, 
  Award,
  Code,
  Target,
  PenTool,
  Wrench,
  Activity,
  Bot
} from "lucide-react";

export function HomePage() {
  // Categories listed in detail inside the sub-features of the section below

  const stats = [
    { 
      value: "120+", 
      label: "Completed Projects", 
      desc: "Academic classes and professional consulting projects successfully delivered.",
      icon: CheckCircle2,
      iconColor: "text-emerald-500 bg-emerald-50"
    },
    { 
      value: "50+", 
      label: "Vetted Specialists", 
      desc: "Verified university instructors, corporate accountants, translators, developers, and designers.",
      icon: Award,
      iconColor: "text-purple-500 bg-purple-50"
    },
    { 
      value: "98.5%", 
      label: "Client Satisfaction", 
      desc: "5-star reviews on delivery quality, schedule timeliness, and professional communications.",
      icon: Star,
      iconColor: "text-amber-500 bg-amber-50"
    }
  ];

  const steps = [
    { 
      icon: Search, 
      color: "bg-blue-900 text-white shadow-blue-100", 
      title: "1. Post your project", 
      desc: "Provide details on the academic subject or professional task you need solved." 
    },
    { 
      icon: Users, 
      color: "bg-purple-900 text-white shadow-purple-100", 
      title: "2. Match with Experts", 
      desc: "Review suggested experts or browse proposals submitted by verified specialists." 
    },
    { 
      icon: Briefcase, 
      color: "bg-indigo-900 text-white shadow-indigo-100", 
      title: "3. Secure Delivery", 
      desc: "Collaborate directly, track status updates, and only release payment when 100% satisfied." 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
<<<<<<< Updated upstream
            <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-purple-800 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">AI</span>
=======
            <div className="w-12 h-12 bg-brand-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
>>>>>>> Stashed changes
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent">Tasker</span>
          </div>
<<<<<<< Updated upstream
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-950 transition-colors">
              Login
            </Link>
            <Link to="/signup" className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-900/10 transition-all hover:-translate-y-0.5 duration-150">
=======
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:text-brand-primary transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg font-semibold text-[15px] shadow-sm transition-colors">
>>>>>>> Stashed changes
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
<<<<<<< Updated upstream
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-slate-50 to-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="text-left space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              Connect with Vetted Experts & Academic Tutors
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Hire Vetted <span className="bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent">Specialists</span> For Your Tasks
            </h1>
            <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
              Get your complex tutoring homework, tax accounting models, translations, software development, or creative designs solved by top professionals.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/signup" className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-950 font-medium inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 duration-150">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium inline-flex items-center justify-center gap-2 transition-all">
                Post a Project
              </Link>
            </div>
          </div>

          {/* Right Hero - Premium Floating Cards */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border border-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-200/40 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200/40 rounded-full blur-3xl -z-10"></div>
              
              <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider text-center">Recently Matched Projects</h3>
              
              <div className="space-y-4">
                {[
                  { title: "Grade 12 Calculus Tutor", spec: "Education & Pedagogy", budget: "$150 USD", status: "Hired Expert", border: "border-purple-100", accent: "bg-purple-50 text-purple-700" },
                  { title: "Q2 Statement Bookkeeping", spec: "Finance & Accounting", budget: "$300 USD", status: "Pending Confirm", border: "border-blue-100", accent: "bg-blue-50 text-blue-700" },
                  { title: "Brand Identity Vector Logo", spec: "Design & Creative Art", budget: "$500 USD", status: "In Progress", border: "border-amber-100", accent: "bg-amber-50 text-amber-700" },
                ].map((item, i) => (
                  <div key={i} className={`p-4 bg-white/80 backdrop-blur-md rounded-2xl border ${item.border} shadow-sm transition-all hover:scale-102`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
                      <span className="text-xs font-bold text-slate-900">{item.budget}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{item.spec}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${item.accent}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
=======
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Connect with Top AI Experts</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional platform connecting businesses with skilled AI professionals for your projects
          </p>
          <div className="flex justify-center">
            <Link to="/signup" className="px-8 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover font-medium inline-flex items-center justify-center gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
>>>>>>> Stashed changes
          </div>
        </div>
      </section>

      {/* Statistics Section (Key Priority First) */}
      <section className="py-12 bg-white border-y border-slate-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
<<<<<<< Updated upstream
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center sm:text-left gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors">
                <div className={`p-4 rounded-xl ${stat.iconColor} flex-shrink-0`}>
                  <stat.icon className="w-6 h-6" />
=======
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, color: "bg-brand-primary-light text-brand-primary", title: "Post Your Project", desc: "Describe your AI project needs and requirements" },
              { icon: Users, color: "bg-green-100 text-green-700", title: "Review Proposals", desc: "Receive and evaluate proposals from qualified experts" },
              { icon: Briefcase, color: "bg-orange-100 text-orange-700", title: "Start Working", desc: "Collaborate with your chosen expert to complete the project" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 ${item.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className="w-8 h-8" />
>>>>>>> Stashed changes
                </div>
                <div>
                  <h4 className="text-3xl font-extrabold text-slate-900 bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent">{stat.value}</h4>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{stat.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Fields & Domains - Overall Review Section with Illustration Background */}
      <section className="relative py-24 px-6 sm:px-12 lg:px-16 mx-4 sm:mx-8 my-16 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/ai_assistant.png" 
            alt="AI Assistant Background" 
            className="w-full h-full object-cover opacity-90"
          />
          {/* Subtle gradient overlay to make the left column text highly readable while showing the neon cat on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Overall Review Content */}
          <div className="text-left space-y-8 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-900/40 text-purple-300 border border-purple-800/60 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              All-in-One Professional Platform
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Get work done in over <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">2,700 different categories</span>
            </h2>
            
            <p className="text-base text-slate-300 leading-relaxed">
              Why limit yourself? AI Tasker connects you with elite specialists and academic tutors across all fields. Describe your task, match with recommended experts, and achieve your goals.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Education & Languages
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calculus, literature, science prep, language translation, and commercial interpretation.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Finance & Legal
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tax accounting, auditing, bookkeeping, corporate filings, and commercial contract reviews.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Design & Writing
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Logo designs, book illustrations, pitchdecks, copywriting, and technical API documentation.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Software & Architecture
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fullstack development, mobile apps, database administration, and 2D/3D CAD drafting.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <Link 
                to="/signup" 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] duration-150"
              >
                Do it until real
              </Link>
              <Link 
                to="/login" 
                className="text-sm font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Side: Glassmorphic Overlay Card to make it feel alive and premium */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl relative space-y-4 text-left">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-purple-600/30 blur-md"></div>
              
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300 tracking-wider uppercase">Platform Statistics</span>
              </div>

              <h4 className="font-bold text-white text-lg">Active AI-Powered Workspace</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect and collaborate with verified human specialists guided by state-of-the-art matching engines.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                  <span className="text-slate-400">Average Match Time</span>
                  <span className="font-semibold text-emerald-400">Under 60 seconds</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                  <span className="text-slate-400">Total Vetted Skills</span>
                  <span className="font-semibold text-white">4,800+ Skills mapped</span>
                </div>
                <div className="flex items-center justify-between text-xs py-2">
                  <span className="text-slate-400">Satisfaction Score</span>
                  <span className="font-semibold text-purple-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-purple-400 text-purple-400" /> 4.9/5.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-16">Simple Workflow</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="space-y-4 p-4">
                <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-slate-100 mb-4`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
<<<<<<< Updated upstream
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-950/40 via-transparent to-transparent"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to get your project completed?</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Join the community today and hire outstanding specialized experts to boost your academic and business success.
          </p>
          <div className="pt-4">
            <Link to="/signup" className="px-8 py-3.5 bg-gradient-to-r from-blue-700 to-purple-700 text-white rounded-lg hover:from-blue-800 hover:to-purple-800 font-semibold text-base shadow-lg shadow-purple-900/40 transition-all hover:-translate-y-0.5 duration-150">
              Register Now
            </Link>
          </div>
=======
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 flex-1">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">Join thousands of businesses and AI experts on our platform</p>
          <Link to="/signup" className="px-8 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover font-medium inline-block">
            Sign Up Now
          </Link>
>>>>>>> Stashed changes
        </div>
      </section>
    </div>
  );
}
