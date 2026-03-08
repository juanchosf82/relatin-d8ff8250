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

const queryClient = new QueryClient();

// Lazy placeholder for portal pages (to be built)
const PortalPlaceholder = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-muted-foreground">Portal — Coming soon</p>
  </div>
);

const AdminPlaceholder = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-muted-foreground">Admin Panel — Coming soon</p>
  </div>
);

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
                  <PortalPlaceholder />
                </ProtectedRoute>
              } />
              <Route path="/portal/proyecto/:id" element={
                <ProtectedRoute>
                  <PortalPlaceholder />
                </ProtectedRoute>
              } />

              {/* Admin route */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminPlaceholder />
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
