import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, CheckCircle, Lock } from 'lucide-react';
import RelatinLogo from '@/components/RelatinLogo';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-exchanges the token from the URL hash on page load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    // Also check if there's already a session (token already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Update password error:', error.message);
      toast({ title: 'Error', description: 'No se pudo actualizar la contraseña. Intenta de nuevo.', variant: 'destructive' });
    } else {
      setIsDone(true);
      setTimeout(() => navigate('/admin', { replace: true }), 2000);
    }

    setIsLoading(false);
  };

  const Requirement = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-[#0D7377]' : 'text-muted-foreground'}`}>
      <CheckCircle className={`h-3.5 w-3.5 ${met ? 'opacity-100' : 'opacity-30'}`} />
      {label}
    </div>
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
        <div className="relative z-10 w-full max-w-md px-4 text-center">
          <RelatinLogo className="scale-125 mx-auto mb-8" />
          <Card className="shadow-elegant border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Link Inválido</CardTitle>
              <CardDescription>Este enlace ha expirado o ya fue utilizado.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/login')} className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a]">
                Ir al Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-bold" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <RelatinLogo className="scale-125" />
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm">
          {isDone ? (
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-xl font-bold">Contraseña Actualizada</CardTitle>
              <CardDescription>Redirigiendo al panel...</CardDescription>
            </CardHeader>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">Crea tu Contraseña</CardTitle>
                <CardDescription className="text-sm">Establece una contraseña segura para tu cuenta</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-pw" className="text-[11px] uppercase tracking-wider font-semibold">Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
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

                  <div className="space-y-1.5">
                    <Requirement met={hasMinLength} label="Mínimo 8 caracteres" />
                    <Requirement met={hasUppercase} label="Al menos una mayúscula" />
                    <Requirement met={hasNumber} label="Al menos un número" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-pw" className="text-[11px] uppercase tracking-wider font-semibold">Confirmar Contraseña</Label>
                    <Input
                      id="confirm-pw"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a] text-xs font-semibold uppercase tracking-wider"
                    disabled={isLoading || !isValid}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" />Establecer Contraseña</>
                    )}
                  </Button>
                </CardContent>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
