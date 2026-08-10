import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2, Wifi, WifiOff, Plus, RefreshCw, Trash2, Copy, ExternalLink,
  MessageSquare, RotateCcw, Key, Bot, Users, Activity
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CrmBotConfigSheet from '@/components/crm/CrmBotConfigSheet';

export default function CrmAdmin() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [botSheetClient, setBotSheetClient] = useState<{ id: string; name: string } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<{ id: string; name: string; login: string; password: string } | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['crm-admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, clients!inner(id, name, logo_url, portal_token, is_active), services!inner(slug)')
        .eq('is_active', true)
        .eq('services.slug', 'crm');
      if (error) throw error;
      return Array.from(
        new Map(
          (data || [])
            .filter((row: any) => row.clients?.is_active)
            .map((row: any) => [row.clients.id, row.clients])
        ).values()
      ).sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));
    },
  });

  const { data: connections, isLoading: loadingConnections } = useQuery({
    queryKey: ['crm-connections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_whatsapp_connections').select('*');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: leadCounts } = useQuery({
    queryKey: ['crm-lead-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_leads').select('client_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(l => { counts[l.client_id] = (counts[l.client_id] || 0) + 1; });
      return counts;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ clientId }: { clientId: string }) => {
      setCreatingFor(clientId);
      await supabase.from('clients').update({
        has_crm_service: true, crm_activated_at: new Date().toISOString(),
      } as any).eq('id', clientId);
      const { data, error } = await supabase.functions.invoke('crm-wasender', {
        body: { action: 'create_session', client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-connections'] });
      queryClient.invalidateQueries({ queryKey: ['crm-admin-clients'] });
      toast.success('CRM ativado!');
    },
    onError: (err: any) => toast.error('Erro ao criar sessão: ' + err.message),
    onSettled: () => setCreatingFor(null),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async ({ clientId, sessionId }: { clientId: string; sessionId: string }) => {
      await supabase.functions.invoke('crm-wasender', { body: { action: 'disconnect', session_id: sessionId } });
      const { error } = await supabase.from('crm_whatsapp_connections').delete().eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crm-connections'] }); toast.success('Sessão removida.'); },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const checkStatusMutation = useMutation({
    mutationFn: async ({ sessionId, clientId: cId }: { sessionId: string; clientId: string }) => {
      const { data, error } = await supabase.functions.invoke('crm-wasender', {
        body: { action: 'check_status', session_id: sessionId, client_id: cId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-connections'] });
      if (data?.auto_repaired) toast.success('Sessão reparada automaticamente!');
      else {
        const status = (data?.data?.status || '').toUpperCase();
        toast.success(`Status: ${status === 'CONNECTED' ? 'Conectado ✅' : status === 'NEED_SCAN' ? 'Precisa escanear QR' : 'Desconectado'}`);
      }
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const resetSessionMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('crm-wasender', {
        body: { action: 'reset_session', client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['crm-connections'] }); toast.success(`Sessão resetada. ${data.cleaned} registros limpos.`); },
    onError: (err: any) => toast.error('Erro ao resetar: ' + err.message),
  });

  const syncApiKeys = async () => {
    setSyncLoading(true);
    try {
      const { data } = await supabase.functions.invoke('crm-wasender', { body: { action: 'sync_api_keys' } });
      await supabase.functions.invoke('crm-wasender', { body: { action: 'update_webhook' } });
      queryClient.invalidateQueries({ queryKey: ['crm-connections'] });
      toast.success(`Chaves sincronizadas: ${data?.synced || 0} sessões.`);
    } catch { toast.error('Erro ao sincronizar'); }
    setSyncLoading(false);
  };

  const saveCredentials = async () => {
    if (!credentialsDialog) return;
    setSavingCredentials(true);
    const { error } = await supabase.from('clients').update({
      crm_portal_login: credentialsDialog.login, crm_portal_password: credentialsDialog.password,
    } as any).eq('id', credentialsDialog.id);
    if (error) toast.error('Erro: ' + error.message);
    else toast.success('Credenciais salvas!');
    setSavingCredentials(false); setCredentialsDialog(null);
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const getConnection = (clientId: string) => connections?.find(c => c.client_id === clientId);
  const copyCrmLink = (portalToken: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/crm/${portalToken}`);
    toast.success('Link CRM copiado!');
  };

  const activeConnections = clients?.filter(c => getConnection(c.id)) || [];
  const inactiveClients = clients?.filter(c => !getConnection(c.id)) || [];
  const connectedCount = activeConnections.filter(c => getConnection(c.id)?.status === 'connected').length;
  const totalLeads = Object.values(leadCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Gerencie conexões e configurações do CRM</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{connectedCount}/{activeConnections.length} online</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{totalLeads} leads</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={syncApiKeys} disabled={syncLoading} className="gap-1.5">
          {syncLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
          Sincronizar Chaves
        </Button>
      </div>

      {/* Active connections */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Clientes Ativos</h2>
          <Badge variant="secondary" className="text-[10px] h-5">{activeConnections.length}</Badge>
        </div>
        {(loadingClients || loadingConnections) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeConnections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhum cliente com CRM ativo</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ative o CRM para um cliente abaixo</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {activeConnections.map(client => {
              const conn = getConnection(client.id)!;
              const leads = leadCounts?.[client.id] || 0;
              const isConnected = conn.status === 'connected';

              return (
                <Card key={client.id} className={`overflow-hidden transition-all hover:shadow-md ${isConnected ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-destructive/50'}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                        <AvatarImage src={client.logo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold">
                          {client.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0 h-4">
                            {isConnected ? <><Wifi className="h-2.5 w-2.5 mr-0.5" /> Online</> : <><WifiOff className="h-2.5 w-2.5 mr-0.5" /> Offline</>}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{leads} leads</span>
                          {conn.phone_number && <span className="text-[10px] text-muted-foreground">📱 {conn.phone_number}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 w-full min-w-0">
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => copyCrmLink(client.portal_token)}>
                        <Copy className="h-3 w-3 mr-1" /> Link
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
                        <a href={`/crm/${client.portal_token}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setBotSheetClient({ id: client.id, name: client.name })}>
                        <Bot className="h-3 w-3 mr-1" /> Bot
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2"
                        onClick={async () => {
                          const { data } = await supabase.from('clients').select('crm_portal_login, crm_portal_password').eq('id', client.id).single();
                          setCredentialsDialog({ id: client.id, name: client.name, login: (data as any)?.crm_portal_login || '', password: (data as any)?.crm_portal_password || '' });
                        }}
                      >
                        <Key className="h-3 w-3 mr-1" /> Credenciais
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2"
                        onClick={() => checkStatusMutation.mutate({ sessionId: conn.session_id!, clientId: client.id })}
                        disabled={checkStatusMutation.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${checkStatusMutation.isPending ? 'animate-spin' : ''}`} /> Verificar
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-destructive border-destructive/30"
                        onClick={() => { if (confirm(`Resetar sessão de "${client.name}"?`)) resetSessionMutation.mutate(client.id); }}
                        disabled={resetSessionMutation.isPending}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-destructive border-destructive/30">
                            <Trash2 className="h-3 w-3 mr-1" /> Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover CRM</AlertDialogTitle>
                            <AlertDialogDescription>Desconectar o WhatsApp de "{client.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSessionMutation.mutate({ clientId: client.id, sessionId: conn.session_id! })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive clients */}
      {inactiveClients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground">Clientes sem CRM</h2>
            <Badge variant="outline" className="text-[10px] h-5">{inactiveClients.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {inactiveClients.map(client => (
              <div key={client.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={client.logo_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">{client.name}</span>
                <Button size="sm" className="text-xs h-7 shrink-0"
                  onClick={() => createSessionMutation.mutate({ clientId: client.id })}
                  disabled={creatingFor === client.id}
                >
                  {creatingFor === client.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Ativar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot Config Sheet */}
      {botSheetClient && (
        <CrmBotConfigSheet
          open={!!botSheetClient}
          onOpenChange={(open) => { if (!open) setBotSheetClient(null); }}
          clientId={botSheetClient.id}
          clientName={botSheetClient.name}
        />
      )}

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsDialog} onOpenChange={(open) => { if (!open) setCredentialsDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Credenciais — {credentialsDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>E-mail</Label><Input value={credentialsDialog?.login || ''} onChange={(e) => setCredentialsDialog(prev => prev ? { ...prev, login: e.target.value } : null)} /></div>
            <div><Label>Senha</Label><Input value={credentialsDialog?.password || ''} onChange={(e) => setCredentialsDialog(prev => prev ? { ...prev, password: e.target.value } : null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialsDialog(null)}>Cancelar</Button>
            <Button onClick={saveCredentials} disabled={savingCredentials}>
              {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
