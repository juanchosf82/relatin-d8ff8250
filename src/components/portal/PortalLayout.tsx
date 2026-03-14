import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FolderKanban, FileText, Banknote, BarChart3, Bell, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Mi Portafolio", icon: BarChart3, path: "/portal" },
  { label: "Proyectos", icon: FolderKanban, path: "/portal" },
  { label: "Reportes", icon: FileText, path: "/portal" },
  { label: "Draws", icon: Banknote, path: "/portal" },
  { label: "Alertas", icon: Bell, path: "/portal" },
];

const PortalLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 h-12 border-b border-gray-200 bg-[#0F1B2D] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-white font-bold text-[14px] tracking-tight cursor-pointer" onClick={() => navigate("/portal")}>
            relatin.co
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/60 hidden sm:block">{user?.email}</span>
          <button onClick={handleSignOut} className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-12 left-0 z-40 w-52 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="flex-1 py-4 space-y-0.5 px-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path && item.label === "Mi Portafolio";
              return (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-colors",
                    active
                      ? "border-l-2 border-[#0D7377] text-[#0D7377] bg-[#E8F4F4]"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-l-2 border-transparent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
