import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import logoPfmk from '@/assets/logo-pfmk.png';

export default function Login() {
  const { user, isLoading, signIn } = useAuth();
  const { staffMember, staffSignIn, isLoading: staffLoading } = useStaffAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isLoading && !staffLoading) {
      if (staffMember) {
        if (staffMember.role === 'designer' || staffMember.roles?.includes('designer')) {
          navigate('/designer-workspace');
        } else {
          navigate('/dashboard');
        }
      } else if (user) {
        navigate('/dashboard');
      }
    }
  }, [user, staffMember, isLoading, staffLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Preencha e-mail e senha');
      return;
    }

    setIsSigningIn(true);

    // 1. Try staff login
    const staffResult = await staffSignIn(trimmedEmail, trimmedPassword);
    if (staffResult.success) {
      toast.success('Login realizado com sucesso!');
      // Note: The staffMember state will be updated by staffSignIn
      // We'll let the useEffect handle navigation for staff to ensure it's in sync
      setIsSigningIn(false);
      return;
    }

    // 2. Try admin (Supabase Auth)
    const { error } = await signIn(trimmedEmail, trimmedPassword);
    if (!error) {
      toast.success('Login realizado com sucesso!');
      // Navigate to dashboard as fallback for admin users
      navigate('/dashboard');
      setIsSigningIn(false);
      return;
    }

    // 3. Try client portal login
    try {
      const { data, error: clientError } = await supabase.rpc('authenticate_client_portal', {
        p_email: trimmedEmail.toLowerCase(),
        p_password: trimmedPassword,
      });

      if (!clientError && data && data.length > 0) {
        const client = data[0];
        toast.success(`Bem-vindo, ${client.client_name}!`);
        navigate(`/portal/${client.portal_token}`);
        setIsSigningIn(false);
        return;
      }
    } catch {
      // Client login failed, show generic error
    }

    toast.error('E-mail ou senha incorretos');
    setIsSigningIn(false);
  };

  if (isLoading || staffLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <img src={logoPfmk} alt="Peformake" className="mx-auto mb-4 h-16 w-auto" />
        <h1 className="text-2xl font-bold text-foreground">PEFORMAKE</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta</p>
      </div>

      <Card className="w-full max-w-sm card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="h-5 w-5" />
            Entrar
          </CardTitle>
          <CardDescription>
            Use o e-mail e senha fornecidos pelo administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
                disabled={isSigningIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigningIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        Equipe, clientes e administradores acessam por aqui com suas credenciais.
      </p>
    </div>
  );
}
