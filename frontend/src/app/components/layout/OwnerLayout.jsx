import { Link, Outlet, useLocation } from "react-router";
import { ShieldPlus, Users, Briefcase, Star, FileText, Tag, LayoutDashboard, DollarSign } from "lucide-react";

export function OwnerLayout() {
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", to: "/owner/dashboard", icon: LayoutDashboard },
    { label: "Create Admin", to: "/owner/create-admin", icon: ShieldPlus },
    { label: "User Management", to: "/owner/users", icon: Users },
    { label: "Report Progress", to: "/owner/reports", icon: FileText },
    { label: "Project Management", to: "/owner/projects", icon: Briefcase },
    { label: "Review Management", to: "/owner/reviews", icon: Star },
    { label: "Job Post Management", to: "/owner/job-posts", icon: FileText },
    { label: "Skills & Categories", to: "/owner/category-tags", icon: Tag },
    { label: "Revenue Report", to: "/owner/revenue", icon: DollarSign },
  ];


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* LEFT SIDEBAR MENU (VERTICAL NAVBAR) */}
      <aside className="hidden md:block w-64 border-r border-border bg-card/30 flex-shrink-0">
        <div className="sticky top-16 p-4 flex flex-col gap-1.5 overflow-y-auto h-[calc(100vh-4rem)]">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4 px-3 mt-2">Owner Menu</h3>
          {menuItems.map((link, i) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={i}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-primary-light/50 hover:text-primary"
                }`}
              >
                <Icon className="w-4.5 h-4.5 opacity-80" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-6 lg:p-10 flex flex-col gap-8 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
