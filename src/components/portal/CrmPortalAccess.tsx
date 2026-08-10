import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, ExternalLink, Eye, EyeOff, Copy, Key, Lock, LogIn, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import CrmMiniReport from './CrmMiniReport';

interface Props {
  clientId: string;
  portalToken: string;
}

export default function CrmPortalAccess({ clientId, portalToken }: Props) {
  const [hasCrmCredentials, setHasCrmCredentials] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Only check if credentials exist, don't fetch their values
    supabase
      .from('clients')
      .select('crm_portal_login')
      .eq('id', clientId)
      .single()
      .then(({ data }) => {
        setHasCrmCredentials(!!(data as any)?.crm_portal_login);
      });

    const stored = sessionStorage.getItem(`crm_auth_${clientId}`);
    if (stored === 'true') setIsAuthenticated(true);
  }, [clientId]);

  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Preencha e-mail e senha');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('authenticate_crm_portal', {
        p_client_id: clientId,
        p_login: loginEmail,
        p_password: loginPassword,
      });

      if (error) throw error;

      if (data) {
        setIsAuthenticated(true);
        sessionStorage.setItem(`crm_auth_${clientId}`, 'true');
        toast.success('Login realizado com sucesso!');
      } else {
        setLoginError('E-mail ou senha incorretos');
      }
    } catch (err: any) {
      setLoginError('Erro ao autenticar. Tente novamente.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // If credentials exist but not authenticated, show login
  if (hasCrmCredentials && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard de Mensagens
          </h2>
          <p className="text-sm text-muted-foreground">Métricas de interação e qualidade de atendimento.</p>
          
          <CrmMiniReport clientId={clientId} />
        </div>

        <Card className="max-w-md mx-auto border-primary/30 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-2">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Acesso Restrito</CardTitle>
            <p className="text-sm text-muted-foreground">
              Faça login para acessar o painel completo e as conversas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crm-email">E-mail</Label>
              <Input
                id="crm-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-password">Senha</Label>
              <div className="relative">
                <Input
                  id="crm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button onClick={handleLogin} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Entrar no CRM
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated or no credentials configured - show CRM access
  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Dashboard de Mensagens
        </h2>
        <p className="text-sm text-muted-foreground">Métricas de interação e qualidade de atendimento em tempo real.</p>
        
        <CrmMiniReport clientId={clientId} />
      </div>

      <Card className="border-primary/30 overflow-hidden group">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 flex-wrap p-6 relative">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-3 rounded-full bg-primary/10 relative z-10">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <h3 className="font-bold text-lg">WhatsApp Business API</h3>
              <p className="text-sm text-muted-foreground">Gerencie seus leads, atendimentos e vendas via WhatsApp</p>
            </div>
            <Button onClick={() => window.open(`/crm/${portalToken}`, '_blank')} className="gap-2 relative z-10 shadow-lg shadow-primary/20">
              <ExternalLink className="h-4 w-4" />
              Acessar CRM Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Link */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5 bg-background">Link de acesso</Badge>
            <code className="text-xs text-muted-foreground truncate flex-1">
              {window.location.origin}/crm/{portalToken}
            </code>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(`${window.location.origin}/crm/${portalToken}`, 'Link')}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
