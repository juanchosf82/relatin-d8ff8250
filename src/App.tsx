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
import PortalDashboard from "./pages/PortalDashboard";
import ProjectDetail from "./pages/ProjectDetail";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProjectDetail from "./pages/admin/AdminProjectDetail";

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
                <Route index element={<PortalDashboard />} />
                <Route path="proyecto/:id" element={<ProjectDetail />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              } />
              <Route path="/admin/proyecto/:id" element={
                <ProtectedRoute requireAdmin>
                  <AdminProjectDetail />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
