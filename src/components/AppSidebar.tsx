import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, GitBranch, FileText } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/containers", label: "Containers", icon: Package },
  { to: "/allocations", label: "Allocations", icon: GitBranch },
  { to: "/reports", label: "Reports", icon: FileText },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col p-4">
      <div className="text-primary font-bold text-sm tracking-widest mb-8">
        MATES DESK
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-secondary"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
