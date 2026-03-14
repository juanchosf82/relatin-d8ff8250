import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import Analytics from "./components/Analytics";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LogoShowcase from "./pages/LogoShowcase";
import NotFound from "./pages/NotFound";
import PortalLayout from "./components/portal/PortalLayout";
import MiPortafolio from "./pages/portal/MiPortafolio";
import ProjectDetail from "./pages/ProjectDetail";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProjectDetail from "./pages/admin/AdminProjectDetail";
import ResetPassword from "./pages/ResetPassword";
import GcLogin from "./pages/gc/GcLogin";
import GcLayout from "./pages/gc/GcLayout";
import GcDashboard from "./pages/gc/GcDashboard";
import GcProjectDetail from "./pages/gc/GcProjectDetail";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Analytics />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/logos" element={<LogoShowcase />} />

              {/* Protected portal routes */}
              <Route path="/portal" element={
                <ProtectedRoute>
                  <PortalLayout />
                </ProtectedRoute>
              }>
              <Route index element={<MiPortafolio />} />
                <Route path="proyecto/:id" element={<ProjectDetail />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              } />
              <Route path="/admin/portafolio" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              } />
              <Route path="/admin/usuarios" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              } />
              <Route path="/admin/proyecto/:id" element={
                <ProtectedRoute requireAdmin>
                  <AdminProjectDetail />
                </ProtectedRoute>
              } />

              {/* GC Portal routes */}
              <Route path="/gc/login" element={<GcLogin />} />
              <Route path="/gc" element={
                <ProtectedRoute requireGc>
                  <GcLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<GcDashboard />} />
                <Route path="proyecto/:id" element={<GcProjectDetail />} />
              </Route>

              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
