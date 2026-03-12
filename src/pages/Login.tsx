import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle, Loader2, Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';
import RelatinLogo from '@/components/RelatinLogo';
import LanguageToggle from '@/components/LanguageToggle';

type LoginMode = 'magic' | 'password' | 'forgot' | 'sent' | 'forgot-sent';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('magic');
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && user) {
      // Check for GC role first
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "gc" as any)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            navigate("/gc/dashboard", { replace: true });
          } else {
            navigate(isAdmin ? "/admin" : "/portal", { replace: true });
          }
        });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
      },
    });

    if (error) {
      console.error('Magic link error:', error.message);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el enlace. Intenta de nuevo.',
        variant: 'destructive',
      });
    } else {
      setMode('sent');
    }

    setIsLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Password login error:', error.message);
      let msg = 'Email o contraseña incorrectos';
      if (error.message?.includes('Invalid login credentials')) {
        msg = 'Email o contraseña incorrectos';
      } else if (error.message?.includes('too many requests') || error.status === 429) {
        msg = 'Demasiados intentos. Espera 5 minutos.';
      }
      toast({ title: 'Error al iniciar sesión', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Sesión iniciada', description: 'Bienvenido de vuelta' });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Reset password error:', error.message);
      toast({ title: 'Error', description: 'No se pudo enviar el enlace. Intenta de nuevo.', variant: 'destructive' });
    } else {
      setMode('forgot-sent');
    }

    setIsLoading(false);
  };

  const renderSentConfirmation = (title: string, description: string) => (
    <>
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
          <CheckCircle className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Enviado a <span className="font-medium text-foreground">{email}</span>
        </p>
        <Button variant="ghost" onClick={() => { setMode('magic'); setEmail(''); setPassword(''); }} className="text-sm">
          Usar otro email
        </Button>
      </CardContent>
    </>
  );

  const renderMagicLink = () => (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">{t('portal.accessPortal')}</CardTitle>
      </CardHeader>
      <form onSubmit={handleMagicLink}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[11px] uppercase tracking-wider font-semibold">
              {t('portal.emailLabel')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a] text-xs font-semibold uppercase tracking-wider" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" />{t('portal.sendLink')}</>
            )}
          </Button>
        </CardContent>
      </form>
      <div className="px-6 pb-5">
        <button
          type="button"
          onClick={() => setMode('password')}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ¿Eres del equipo 360lateral?{' '}
          <span className="font-semibold text-[#0D7377] hover:underline">Iniciar sesión con contraseña</span>
        </button>
      </div>
    </>
  );

  const renderPasswordLogin = () => (
    <>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode('magic')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <CardTitle className="text-xl font-bold">Acceso Equipo</CardTitle>
        </div>
        <CardDescription className="text-sm">Ingresa con tu email y contraseña</CardDescription>
      </CardHeader>
      <form onSubmit={handlePasswordLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-email" className="text-[11px] uppercase tracking-wider font-semibold">Email</Label>
            <Input
              id="pw-email"
              type="email"
              placeholder="you@360lateral.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-password" className="text-[11px] uppercase tracking-wider font-semibold">Contraseña</Label>
            <div className="relative">
              <Input
                id="pw-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a] text-xs font-semibold uppercase tracking-wider" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</>
            ) : (
              <><Lock className="mr-2 h-4 w-4" />Iniciar Sesión</>
            )}
          </Button>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="w-full text-center text-xs text-muted-foreground hover:text-[#0D7377] transition-colors"
          >
            Olvidé mi contraseña
          </button>
        </CardContent>
      </form>
    </>
  );

  const renderForgotPassword = () => (
    <>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode('password')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <CardTitle className="text-xl font-bold">Restablecer Contraseña</CardTitle>
        </div>
        <CardDescription className="text-sm">Te enviaremos un link para restablecer tu contraseña</CardDescription>
      </CardHeader>
      <form onSubmit={handleForgotPassword}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-[11px] uppercase tracking-wider font-semibold">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@360lateral.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a] text-xs font-semibold uppercase tracking-wider" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" />Enviar Link</>
            )}
          </Button>
        </CardContent>
      </form>
    </>
  );

  const renderContent = () => {
    switch (mode) {
      case 'sent': return renderSentConfirmation(t('portal.linkSent'), t('portal.checkEmail'));
      case 'forgot-sent': return renderSentConfirmation('Link Enviado', 'Revisa tu email para restablecer tu contraseña');
      case 'password': return renderPasswordLogin();
      case 'forgot': return renderForgotPassword();
      default: return renderMagicLink();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-bold" />

      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <RelatinLogo className="scale-125" />
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm">
          {renderContent()}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('portal.needHelp')} <a href="mailto:ops@360lateral.com" className="underline hover:text-foreground">ops@360lateral.com</a>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          © {new Date().getFullYear()} Relatin · Construction Intelligence
        </p>
      </div>
    </div>
  );
};

export default Login;
