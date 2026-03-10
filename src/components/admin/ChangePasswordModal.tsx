import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, CheckCircle, Shield } from 'lucide-react';

const ChangePasswordModal = () => {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Change password error:', error.message);
      toast({ title: 'Error', description: 'No se pudo cambiar la contraseña.', variant: 'destructive' });
    } else {
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña fue cambiada correctamente.' });
      setOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsLoading(false);
  };

  const Requirement = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-[#0D7377]' : 'text-gray-400'}`}>
      <CheckCircle className={`h-3.5 w-3.5 ${met ? 'opacity-100' : 'opacity-30'}`} />
      {label}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setNewPassword(''); setConfirmPassword(''); } }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-colors w-full border-l-2 border-transparent">
          <Shield className="h-4 w-4" />
          <span>Contraseña</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>Establece una nueva contraseña de acceso</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-semibold">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
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
            <Label className="text-[11px] uppercase tracking-wider font-semibold">Confirmar Contraseña</Label>
            <Input
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

          <Button type="submit" className="w-full bg-[#0F1B2D] text-white hover:bg-[#1a2d4a]" disabled={isLoading || !isValid}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</> : 'Guardar Contraseña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;
