import { useState } from "react";
import { Building2, ListChecks, FileText, PieChart, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProjectsSection from "./ProjectsSection";
import SovSection from "./SovSection";
import DrawsSection from "./DrawsSection";
import ReportsSection from "./ReportsSection";

const AdminLayout = () => {
  const [activeTab, setActiveTab] = useState("proyectos");
  const { signOut } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case "proyectos": return <ProjectsSection />;
      case "sov": return <SovSection />;
      case "draws": return <DrawsSection />;
      case "reportes": return <ReportsSection />;
      default: return <ProjectsSection />;
    }
  };

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F1B2D] text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-wider text-white">OPR ADMIN</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab("proyectos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'proyectos' ? 'bg-[#0D7377]' : 'hover:bg-white/10'}`}>
            <Building2 className="h-5 w-5" />
            <span>Proyectos</span>
          </button>
          <button onClick={() => setActiveTab("sov")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'sov' ? 'bg-[#0D7377]' : 'hover:bg-white/10'}`}>
            <ListChecks className="h-5 w-5" />
            <span>Avance SOV</span>
          </button>
          <button onClick={() => setActiveTab("draws")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'draws' ? 'bg-[#0D7377]' : 'hover:bg-white/10'}`}>
            <FileText className="h-5 w-5" />
            <span>Draws</span>
          </button>
          <button onClick={() => setActiveTab("reportes")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reportes' ? 'bg-[#0D7377]' : 'hover:bg-white/10'}`}>
            <PieChart className="h-5 w-5" />
            <span>Reportes</span>
          </button>
        </nav>

        <div className="p-4">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-white/10 transition-colors">
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
