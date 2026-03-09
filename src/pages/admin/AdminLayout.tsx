import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, ListChecks, FileText, PieChart, LogOut, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProjectsSection from "./ProjectsSection";
import SovSection from "./SovSection";
import DrawsSection from "./DrawsSection";
import ReportsSection from "./ReportsSection";
import UsuariosSection from "./UsuariosSection";

const tabs = [
  { key: "proyectos", label: "Proyectos", icon: Building2 },
  { key: "usuarios", label: "Usuarios", icon: Users },
  { key: "sov", label: "Avance SOV", icon: ListChecks },
  { key: "draws", label: "Draws", icon: FileText },
  { key: "reportes", label: "Reportes", icon: PieChart },
];

const AdminLayout = () => {
  const location = useLocation();
  const initialTab = location.pathname === "/admin/usuarios" ? "usuarios" : "proyectos";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleTabClick = (key: string) => {
    setActiveTab(key);
    if (key === "usuarios") {
      navigate("/admin/usuarios", { replace: true });
    } else if (location.pathname !== "/admin") {
      navigate("/admin", { replace: true });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "proyectos": return <ProjectsSection />;
      case "usuarios": return <UsuariosSection />;
      case "sov": return <SovSection />;
      case "draws": return <DrawsSection />;
      case "reportes": return <ReportsSection />;
      default: return <ProjectsSection />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0F1B2D] text-white flex flex-col shrink-0">
        <div className="px-5 py-5">
          <p className="text-[11px] uppercase tracking-widest text-[#0D7377] font-bold">OPR Admin</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabClick(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "border-l-2 border-[#0D7377] text-[#0D7377] bg-[rgba(13,115,119,0.1)]"
                    : "text-gray-400 hover:text-gray-300 border-l-2 border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="p-6 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
