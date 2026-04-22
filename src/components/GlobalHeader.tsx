import { NavLink, useLocation } from "react-router-dom";
import { Container, LayoutDashboard, Upload, Package, GitBranch, FileText, Settings, Bell, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload & Process", icon: Upload },
  { to: "/containers", label: "Containers", icon: Package },
  { to: "/allocations", label: "Allocations", icon: GitBranch },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

const GlobalHeader = () => {
  const location = useLocation();

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 font-bold text-lg tracking-tight transition-all hover:opacity-90">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-md border border-accent-foreground/20">
              <Container size={20} className="text-accent-foreground" />
            </div>
            <span>ContainerForge</span>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-white/60">
              <CheckCircle size={12} className="text-green-400" />
              All systems operational
            </div>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <Bell size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <User size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
