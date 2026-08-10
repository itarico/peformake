import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, RefreshCw, BarChart3, Wifi, WifiOff, CheckCircle2, XCircle } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';

interface TrafficCampaignManagerProps {
  clientId: string;
  clientName: string;
}

export function TrafficCampaignManager({ clientId, clientName }: TrafficCampaignManagerProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [syncYear, setSyncYear] = useState(now.getFullYear());
  const [syncMonth, setSyncMonth] = useState(now.getMonth() + 1);
  const [editingRevenue, setEditingRevenue] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<null | { connected: boolean; account_name?: string; error?: string }>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['traffic-campaigns-admin', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'test_connection', client_id: clientId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setConnectionStatus(data);
      if (data.connected && data.ad_account_valid) {
        toast.success(`Conectado! Conta: ${data.account_name}`);
      } else if (data.connected && !data.ad_account_valid) {
        toast.warning(data.error || 'Conta de anúncios não acessível.');
      } else {
        toast.error(data.error || 'Falha na conexão.');
      }
    },
    onError: (error: any) => {
      setConnectionStatus({ connected: false, error: error.message });
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'sync', client_id: clientId, year: syncYear, month: syncMonth });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-campaigns-admin', clientId] });
      queryClient.invalidateQueries({ queryKey: ['traffic-campaigns', clientId] });
      toast.success(`Sincronizado! ${data.campaigns_synced} campanhas atualizadas.`);
    },
    onError: (error: any) => {
      toast.error('Erro na sincronização: ' + error.message);
    },
  });

  const updateRevenueMutation = useMutation({
    mutationFn: async ({ id, revenue }: { id: string; revenue: number }) => {
      const investment = campaigns?.find(c => c.id === id)?.investment || 0;
      const roas = investment > 0 ? revenue / investment : 0;
      const { error } = await supabase
        .from('traffic_campaigns')
        .update({ revenue_generated: revenue, roas })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-campaigns-admin', clientId] });
      queryClient.invalidateQueries({ queryKey: ['traffic-campaigns', clientId] });
      toast.success('Receita atualizada!');
      setEditingRevenue({});
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const lastSync = campaigns?.find(c => c.synced_at)?.synced_at;

  return (
    <div className="space-y-4">
      {/* Connection Test + Sync Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Meta Ads — {clientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : connectionStatus?.connected ? (
                <Wifi className="mr-2 h-4 w-4 text-green-500" />
              ) : connectionStatus === null ? (
                <Wifi className="mr-2 h-4 w-4" />
              ) : (
                <WifiOff className="mr-2 h-4 w-4 text-destructive" />
              )}
              Testar Conexão
            </Button>

            {connectionStatus && (
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus.connected && connectionStatus.account_name ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-700 dark:text-green-400">
                      Conectado: <strong>{connectionStatus.account_name}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive text-xs">{connectionStatus.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sync Controls */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mês</label>
              <Select value={String(syncMonth)} onValueChange={(v) => setSyncMonth(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ano</label>
              <Select value={String(syncYear)} onValueChange={(v) => setSyncYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Meta Ads
            </Button>
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {new Date(lastSync).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campanhas Sincronizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !campaigns?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma campanha sincronizada. Clique em "Testar Conexão" primeiro, depois "Sincronizar Meta Ads".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invest.</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">Receita (CRM)</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">
                        {MONTH_NAMES[c.month - 1]?.substring(0, 3)}/{c.year}
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">
                        {c.campaign_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Concluída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(c.investment || 0)}</TableCell>
                      <TableCell className="text-right text-sm">{c.clicks || 0}</TableCell>
                      <TableCell className="text-right text-sm">{c.conversions || 0}</TableCell>
                      <TableCell className="text-right">
                        {editingRevenue[c.id] !== undefined ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className="w-24 h-7 text-xs"
                              value={editingRevenue[c.id]}
                              onChange={(e) => setEditingRevenue({ ...editingRevenue, [c.id]: e.target.value })}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => updateRevenueMutation.mutate({ id: c.id, revenue: parseFloat(editingRevenue[c.id]) || 0 })}
                            >
                              ✓
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-sm hover:underline cursor-pointer"
                            onClick={() => setEditingRevenue({ ...editingRevenue, [c.id]: String(c.revenue_generated || 0) })}
                          >
                            {formatCurrency(c.revenue_generated || 0)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{(c.roas || 0).toFixed(2)}x</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
