import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import RelatinLogo from '@/components/RelatinLogo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
      setIsSent(true);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-bold" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <RelatinLogo className="scale-125" />
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm">
          {isSent ? (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-xl font-bold">¡Enlace enviado!</CardTitle>
                <CardDescription className="text-base">
                  Revisa tu email — te enviamos un link de acceso
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Enviado a <span className="font-medium text-foreground">{email}</span>
                </p>
                <Button
                  variant="ghost"
                  onClick={() => { setIsSent(false); setEmail(''); }}
                  className="text-sm"
                >
                  Usar otro email
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">Acceder al Portal</CardTitle>
                <CardDescription>
                  Ingresa tu email y te enviaremos un enlace de acceso seguro
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar enlace de acceso
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Relatin · Construction Intelligence
        </p>
      </div>
    </div>
  );
};

export default Login;
