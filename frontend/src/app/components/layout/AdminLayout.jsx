import { Link, Outlet, useLocation } from "react-router";
import { Users, Briefcase, FileText, Tag, DollarSign, LayoutDashboard } from "lucide-react";

export function AdminLayout() {
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "User Management", to: "/admin/users", icon: Users },
    { label: "Report Progress", to: "/admin/disputes", icon: FileText },
    { label: "Project Management", to: "/admin/projects", icon: Briefcase },
    { label: "Job Post Management", to: "/admin/job-posts", icon: FileText },
    { label: "Skills & Categories", to: "/admin/category-tags", icon: Tag },
    { label: "Revenue Report", to: "/admin/revenue", icon: DollarSign },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] w-full max-w-[100vw] overflow-x-hidden">
      {/* LEFT SIDEBAR MENU (VERTICAL NAVBAR) */}
      <aside className="hidden md:block w-[17rem] border-r border-border/70 bg-sidebar/85 backdrop-blur-xl flex-shrink-0">
        <div className="sticky top-16 p-4 flex flex-col gap-1.5 overflow-y-auto h-[calc(100vh-4rem)]">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-4 px-3 mt-2">Admin Menu</h3>
          {menuItems.map((link, i) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={i}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner shadow-foreground/[0.025]"
                    : "text-sidebar-foreground/78 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
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
      <main className="flex-1 min-w-0 p-5 sm:p-6 lg:p-10 flex flex-col gap-8 bg-background overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
