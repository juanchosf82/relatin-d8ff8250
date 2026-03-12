import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import RelatinLogo from "@/components/RelatinLogo";

type Mode = "login" | "forgot" | "forgot-sent";

const GcLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      // Check if GC role
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "gc" as any)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            navigate("/gc/dashboard", { replace: true });
          }
        });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      let msg = "Email o contraseña incorrectos";
      if (error.message?.includes("too many requests") || (error as any).status === 429) {
        msg = "Demasiados intentos. Espera 5 minutos.";
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Sesión iniciada", description: "Bienvenido" });
    }

    setIsLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/gc/reset-password`,
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar el enlace.", variant: "destructive" });
    } else {
      setMode("forgot-sent");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1B2D] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E07B39] via-[#0D7377] to-[#E07B39]" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-6">
          <RelatinLogo className="scale-125" />
        </div>
        <p className="text-center text-[#E07B39] text-[11px] uppercase tracking-[0.2em] font-bold mb-6">
          Portal de Contratistas
        </p>

        <Card className="shadow-2xl border-0 bg-white">
          {mode === "forgot-sent" ? (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#E07B39]/10 flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-[#E07B39]" />
                </div>
                <CardTitle className="text-xl font-bold">Link Enviado</CardTitle>
                <CardDescription>Revisa tu email para restablecer tu contraseña</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Enviado a <span className="font-medium text-[#0F1B2D]">{email}</span>
                </p>
                <Button variant="ghost" onClick={() => { setMode("login"); setEmail(""); setPassword(""); }} className="text-sm">
                  Volver al login
                </Button>
              </CardContent>
            </>
          ) : mode === "forgot" ? (
            <>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMode("login")} className="text-gray-400 hover:text-[#0F1B2D]">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <CardTitle className="text-xl font-bold">Restablecer Contraseña</CardTitle>
                </div>
                <CardDescription>Te enviaremos un link para restablecer tu contraseña</CardDescription>
              </CardHeader>
              <form onSubmit={handleForgot}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-semibold">Email</Label>
                    <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <Button type="submit" className="w-full bg-[#E07B39] text-white hover:bg-[#c96a2f] text-xs font-semibold uppercase tracking-wider" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</> : <><Mail className="mr-2 h-4 w-4" />Enviar Link</>}
                  </Button>
                </CardContent>
              </form>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">Iniciar Sesión</CardTitle>
                <CardDescription>Acceso exclusivo para contratistas</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-semibold">Email</Label>
                    <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-semibold">Contraseña</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-[#E07B39] text-white hover:bg-[#c96a2f] text-xs font-semibold uppercase tracking-wider" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</> : <><Lock className="mr-2 h-4 w-4" />Iniciar Sesión</>}
                  </Button>
                  <button type="button" onClick={() => setMode("forgot")} className="w-full text-center text-xs text-gray-400 hover:text-[#E07B39] transition-colors">
                    Olvidé mi contraseña
                  </button>
                </CardContent>
              </form>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-white/40 mt-6">
          ¿Necesitas ayuda? <a href="mailto:ops@360lateral.com" className="underline hover:text-white/60">ops@360lateral.com</a>
        </p>
        <p className="text-center text-xs text-white/30 mt-2">
          © {new Date().getFullYear()} 360lateral · relatin.co
        </p>
      </div>
    </div>
  );
};

export default GcLogin;
