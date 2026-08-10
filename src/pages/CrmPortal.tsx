import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, BarChart3, Columns3, Settings, PieChart, Users, Lock, LogIn, LogOut, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import CrmChat from '@/components/crm/CrmChat';
import CrmKanban from '@/components/crm/CrmKanban';
import CrmClientSettings from '@/components/crm/CrmClientSettings';
import CrmDashboard from '@/components/crm/CrmDashboard';
import CrmAdvancedReports from '@/components/crm/CrmAdvancedReports';
import CrmLeads from '@/components/crm/CrmLeads';
import CrmSalesPDFButton from '@/components/crm/CrmSalesPDFButton';

export default function CrmPortal() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leadCount, setLeadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('chat');
  const [preSelectedLeadId, setPreSelectedLeadId] = useState<string | null>(null);

  // Auth state - ALWAYS require login
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from('clients')
      .select('id, name, logo_url')
      .eq('portal_token', token)
      .single()
      .then(({ data }) => {
        setClient(data);
        setLoading(false);
        if (data?.id) {
          // Check if already authenticated (persists across sessions)
          const stored = localStorage.getItem(`crm_auth_${data.id}`);
          if (stored === 'true') setIsAuthenticated(true);

          supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('client_id', data.id)
            .then(({ count }) => setLeadCount(count || 0));
        }
      });
  }, [token]);

  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Preencha e-mail e senha');
      return;
    }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.rpc('authenticate_crm_portal', {
        p_client_id: client.id,
        p_login: loginEmail,
        p_password: loginPassword,
      });

      if (error) throw error;

      if (data) {
        setIsAuthenticated(true);
        localStorage.setItem(`crm_auth_${client.id}`, 'true');
        toast.success('Login realizado com sucesso!');
      } else {
        setLoginError('E-mail ou senha incorretos');
      }
    } catch {
      setLoginError('Erro ao autenticar. Tente novamente.');
    }
    setLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(`crm_auth_${client?.id}`);
    setIsAuthenticated(false);
    toast.success('Sessão encerrada');
  };

  const handleViewConversation = (leadId: string) => {
    setPreSelectedLeadId(leadId);
    setActiveTab('chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando CRM...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-destructive/60" />
          </div>
          <p className="text-muted-foreground font-medium">Link inválido ou expirado.</p>
          <p className="text-xs text-muted-foreground/60">Verifique o link com seu administrador.</p>
        </div>
      </div>
    );
  }

  // ALWAYS require authentication - no bypass via direct link
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="max-w-md w-full border-primary/30">
          <CardHeader className="text-center pb-2">
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.name} className="h-16 w-16 rounded-xl object-cover ring-2 ring-primary/10 mx-auto mb-2" />
            ) : (
              <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-2">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            )}
            <CardTitle className="text-xl">{client.name} — CRM</CardTitle>
            <p className="text-sm text-muted-foreground">
              Faça login com suas credenciais para acessar o CRM.
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
            <Button onClick={handleLogin} className="w-full gap-2" disabled={loggingIn}>
              <LogIn className="h-4 w-4" />
              {loggingIn ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden max-w-[100vw]">
      {/* Premium Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {client.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-9 w-9 rounded-lg object-cover ring-2 ring-primary/10" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{client.name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-sm sm:text-base truncate">{client.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-primary/5 border-primary/20 text-primary">
                CRM
              </Badge>
              {leadCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{leadCount} leads</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CrmSalesPDFButton clientId={client.id} clientName={client.name} />
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 sm:px-6 pt-3 shrink-0 overflow-x-auto border-b border-border/30 bg-card/40 backdrop-blur-sm">
          <TabsList className="w-fit bg-transparent gap-1 h-auto p-0 pb-0">
           {[
              { value: 'chat', icon: MessageSquare, label: 'Conversas' },
              { value: 'dashboard', icon: BarChart3, label: 'Painel' },
              { value: 'leads', icon: Users, label: 'Contatos' },
              { value: 'reports', icon: PieChart, label: 'Relatórios' },
              { value: 'kanban', icon: Columns3, label: 'Funil' },
              { value: 'settings', icon: Settings, label: 'Config' },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 transition-all"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 px-4 sm:px-6 pb-4 min-h-0 overflow-hidden mt-0">
          <CrmChat clientId={client.id} preSelectedLeadId={preSelectedLeadId} onLeadSelected={() => setPreSelectedLeadId(null)} />
        </TabsContent>
        <TabsContent value="dashboard" className="flex-1 px-4 sm:px-6 pb-4 overflow-y-auto mt-0">
          <CrmDashboard clientId={client.id} onViewConversation={handleViewConversation} />
        </TabsContent>
        <TabsContent value="leads" className="flex-1 px-4 sm:px-6 pb-4 overflow-y-auto mt-0">
          <CrmLeads clientId={client.id} />
        </TabsContent>
        <TabsContent value="reports" className="flex-1 px-4 sm:px-6 pb-4 overflow-y-auto mt-0">
          <CrmAdvancedReports clientId={client.id} />
        </TabsContent>
        <TabsContent value="kanban" className="flex-1 px-2 sm:px-4 pb-4 overflow-hidden mt-0">
          <CrmKanban clientId={client.id} onViewConversation={handleViewConversation} />
        </TabsContent>
        <TabsContent value="settings" className="flex-1 px-4 sm:px-6 pb-4 overflow-y-auto mt-0">
          <CrmClientSettings clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
