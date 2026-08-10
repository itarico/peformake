import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Link2, Unlink, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';


interface MetaAdAccount {
  id: string;
  name: string;
  status: number;
  currency: string;
}

interface OAuthData {
  access_token: string;
  token_expires_at: string;
  meta_user_id: string;
  meta_user_name: string;
  ad_accounts: MetaAdAccount[];
}

interface TrafficConfigPanelProps {
  oauthCode?: string | null;
  oauthState?: string | null;
  onOAuthConsumed?: () => void;
}

export function TrafficConfigPanel({ oauthCode, oauthState, onOAuthConsumed }: TrafficConfigPanelProps) {
  const queryClient = useQueryClient();
  const [oauthData, setOauthData] = useState<OAuthData | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [connectingClientId, setConnectingClientId] = useState<string>('');

  // Fetch clients with tráfego service
  const { data: trafficClients = [] } = useQuery({
    queryKey: ['traffic-clients-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, clients(id, name, is_active), services!inner(slug)')
        .eq('is_active', true)
        .eq('services.slug', 'trafego');
      if (error) throw error;
      return (data || []).filter((cs: any) => cs.clients?.is_active).map((cs: any) => cs.clients);
    },
  });

  // Fetch existing connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['traffic-meta-connections'],
    queryFn: async () => {
      const { data, error } = await invokeWithAuth('meta-ads-oauth', { action: 'list_connections' });
      if (error) throw error;
      return data?.connections || [];
    },
  });

  // Handle OAuth callback from props
  const oauthProcessed = useRef(false);
  useEffect(() => {
    if (oauthCode && oauthState && !oauthProcessed.current) {
      oauthProcessed.current = true;
      console.log('[TrafficConfig] Processing OAuth from props:', { codeLen: oauthCode.length, clientId: oauthState });
      setConnectingClientId(oauthState);
      exchangeTokenMutation.mutate({ code: oauthCode, clientId: oauthState });
      onOAuthConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthCode, oauthState]);

  const exchangeTokenMutation = useMutation({
    mutationFn: async ({ code, clientId }: { code: string; clientId: string }) => {
      const redirectUri = `${window.location.origin}/traffic`;
      console.log('[TrafficConfig] Exchanging token with redirect_uri:', redirectUri);
      const { data, error } = await invokeWithAuth('meta-ads-oauth', { action: 'exchange_token', code, redirect_uri: redirectUri });
      console.log('[TrafficConfig] Exchange response:', { data, error });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as OAuthData;
    },
    onSuccess: (data) => {
      console.log('[TrafficConfig] OAuth success, accounts:', data.ad_accounts?.length);
      setOauthData(data);
      if (data.ad_accounts.length === 1) {
        setSelectedAccount(data.ad_accounts[0].id);
      }
      toast.success(`Autenticado como ${data.meta_user_name}! ${data.ad_accounts.length > 0 ? 'Selecione a conta de anúncios.' : 'Você já pode vincular para Instagram/DM.'}`);
    },
    onError: (error: any) => {
      console.error('[TrafficConfig] Exchange error:', error);
      toast.error('Erro na autenticação: ' + error.message);
      setConnectingClientId('');
    },
  });

  const getAuthUrlMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const redirectUri = `${window.location.origin}/traffic`;
      const { data, error } = await invokeWithAuth('meta-ads-oauth', { action: 'get_auth_url', redirect_uri: redirectUri, client_id: clientId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const saveConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!oauthData || !connectingClientId) throw new Error('Dados incompletos');

      const account = oauthData.ad_accounts.find(a => a.id === selectedAccount);
      const { data, error } = await invokeWithAuth('meta-ads-oauth', {
        action: 'save_connection',
        client_id: connectingClientId,
        ad_account_id: selectedAccount || null,
        ad_account_name: account?.name || null,
        access_token: oauthData.access_token,
        token_expires_at: oauthData.token_expires_at,
        meta_user_id: oauthData.meta_user_id,
        meta_user_name: oauthData.meta_user_name,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-meta-connections'] });
      toast.success('Conta Meta vinculada com sucesso!');
      setOauthData(null);
      setSelectedAccount('');
      setConnectingClientId('');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await invokeWithAuth('meta-ads-oauth', { action: 'disconnect', client_id: clientId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-meta-connections'] });
      toast.success('Conta Meta desvinculada.');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const getConnectionForClient = (clientId: string) =>
    connections.find((c: any) => c.client_id === clientId);

  const isTokenExpiring = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft < 7;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integração Meta Ads</CardTitle>
          <CardDescription>
            Conecte contas de anúncio do Meta (Facebook/Instagram) aos seus clientes via OAuth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Cada cliente precisa de uma conta de anúncio vinculada para sincronizar métricas automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Loading state during OAuth token exchange */}
      {exchangeTokenMutation.isPending && (
        <Card className="border-primary">
          <CardContent className="p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-sm">Autenticando com Meta...</p>
              <p className="text-xs text-muted-foreground">Trocando código por token de acesso e listando contas de anúncios.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {oauthData && connectingClientId && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Autenticado como {oauthData.meta_user_name}
            </CardTitle>
            <CardDescription>
              Selecione a conta de anúncios para vincular ao cliente:
              <strong> {trafficClients.find((c: any) => c.id === connectingClientId)?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {oauthData.ad_accounts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta de anúncios encontrada para este usuário. Você ainda pode vincular para DM/publicação do Instagram.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => saveConnectionMutation.mutate()} disabled={saveConnectionMutation.isPending}>
                    {saveConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular para Instagram/DM
                  </Button>
                  <Button variant="outline" onClick={() => { setOauthData(null); setConnectingClientId(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de anúncios" />
                  </SelectTrigger>
                  <SelectContent>
                    {oauthData.ad_accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.id}) — {acc.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveConnectionMutation.mutate()}
                    disabled={!selectedAccount || saveConnectionMutation.isPending}
                  >
                    {saveConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular Conta
                  </Button>
                  <Button variant="outline" onClick={() => { setOauthData(null); setConnectingClientId(''); }}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client connections list */}
      {connectionsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {trafficClients.map((client: any) => {
            const conn = getConnectionForClient(client.id);
            const tokenExpiring = conn && isTokenExpiring(conn.token_expires_at);

            return (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{client.name}</p>
                      {conn ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={conn.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                            {conn.status === 'active' ? 'Conectado' : conn.status === 'token_expired' ? 'Token Expirado' : 'Erro'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {conn.ad_account_id ? `${conn.ad_account_name} (${conn.ad_account_id})` : 'Sem conta de anúncios (somente Instagram/DM)'}
                          </span>
                          {conn.meta_user_name && <span className="text-xs text-muted-foreground">via {conn.meta_user_name}</span>}
                          {tokenExpiring && (
                            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Token expirando
                            </Badge>
                          )}
                          {conn.last_synced_at && (
                            <span className="text-xs text-muted-foreground">
                              Último sync: {new Date(conn.last_synced_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {conn.sync_error && (
                            <span className="text-xs text-destructive">{conn.sync_error}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem conta vinculada</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {conn ? (
                        <>
                          {(conn.status === 'token_expired' || tokenExpiring) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConnectingClientId(client.id);
                                getAuthUrlMutation.mutate(client.id);
                              }}
                              disabled={getAuthUrlMutation.isPending}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Reconectar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja desvincular a conta Meta de ${client.name}?`)) {
                                disconnectMutation.mutate(client.id);
                              }
                            }}
                            disabled={disconnectMutation.isPending}
                          >
                            <Unlink className="mr-1 h-3 w-3" /> Desconectar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setConnectingClientId(client.id);
                            getAuthUrlMutation.mutate(client.id);
                          }}
                          disabled={getAuthUrlMutation.isPending}
                        >
                          {getAuthUrlMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          <Link2 className="mr-1 h-3 w-3" /> Conectar Conta Meta
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {trafficClients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum cliente com serviço de Tráfego ativo. Ative o serviço "Tráfego" no cadastro do cliente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
