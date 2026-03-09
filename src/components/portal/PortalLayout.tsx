import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Banknote,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
  { label: 'Proyectos', icon: FolderKanban, path: '/portal' },
  { label: 'Reportes', icon: FileText, path: '/portal' },
  { label: 'Draws', icon: Banknote, path: '/portal' },
  { label: 'Alertas', icon: AlertTriangle, path: '/portal' },
];

const PortalLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220,15%,95%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b bg-[hsl(220,60%,18%)] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-white font-bold text-lg tracking-tight cursor-pointer" onClick={() => navigate('/portal')}>
            relatin.co
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70 hidden sm:block">{user?.email}</span>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:static inset-y-14 left-0 z-40 w-56 bg-white border-r transform transition-transform lg:translate-x-0 flex flex-col',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex-1 py-4 space-y-1 px-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path && item.label === 'Dashboard';
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-[hsl(190,95%,45%)]/10 text-[hsl(190,95%,45%)]'
                      : 'text-[hsl(220,15%,45%)] hover:bg-[hsl(220,15%,95%)]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
