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
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import RelatinLogo from '@/components/RelatinLogo';
import LanguageToggle from '@/components/LanguageToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? '/admin' : '/portal', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

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
        description: 'Could not send the link. Please try again.',
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

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

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
                <CardTitle className="text-xl font-bold">{t('portal.linkSent')}</CardTitle>
                <CardDescription className="text-base">
                  {t('portal.checkEmail')}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('portal.sentTo')} <span className="font-medium text-foreground">{email}</span>
                </p>
                <Button
                  variant="ghost"
                  onClick={() => { setIsSent(false); setEmail(''); }}
                  className="text-sm"
                >
                  {t('portal.useAnotherEmail')}
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">{t('portal.accessPortal')}</CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmit}>
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
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('portal.sendLink')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </>
          )}
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
