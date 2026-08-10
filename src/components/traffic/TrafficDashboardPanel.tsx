import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, RefreshCw, TrendingUp, MousePointerClick, Users, MessageCircle, DollarSign, Target, Eye, BarChart3, Wallet, CreditCard, Pause, Play, Settings2, AlertTriangle } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';
import { toast } from 'sonner';
import { TrafficActionAlerts } from '@/components/traffic/TrafficActionAlerts';

interface Props { clientId: string }

export function TrafficDashboardPanel({ clientId }: Props) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [budgetDialog, setBudgetDialog] = useState<{ open: boolean; campaignId: string; name: string }>({ open: false, campaignId: '', name: '' });
  const [newDailyBudget, setNewDailyBudget] = useState('');

  // Campaigns for this client
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['traffic-dashboard-campaigns', clientId, filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .eq('year', filterYear)
        .eq('month', filterMonth)
        .order('investment', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // CRM sales for this client/month — real revenue from WhatsApp CRM
  const { data: crmSales = [] } = useQuery({
    queryKey: ['crm-sales', clientId, filterYear, filterMonth],
    queryFn: async () => {
      const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
      const endDate = new Date(filterYear, filterMonth, 1).toISOString();
      const { data } = await supabase
        .from('crm_leads')
        .select('sale_value, sale_date')
        .eq('client_id', clientId)
        .eq('status', 'sale_completed')
        .gte('sale_date', startDate)
        .lt('sale_date', endDate);
      return data || [];
    },
  });

  const { data: trafficGoals = [] } = useQuery({
    queryKey: ['traffic-goals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true)
        .in('name', ['Investimento em Tráfego', 'Custo por Lead (CPL)', 'ROAS de Tráfego', 'Leads de Tráfego']);
      return data || [];
    },
  });

  const getGoalValue = (name: string) => trafficGoals.find(g => g.name === name)?.target_value || 0;

  // Meta Account Info
  const { data: accountInfo, isLoading: accountInfoLoading, refetch: refetchAccountInfo } = useQuery({
    queryKey: ['meta-account-info', clientId],
    queryFn: async () => {
      try {
        const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'account_info', client_id: clientId });
        if (error || data?.error) return null;
        return data;
      } catch { return null; }
    },
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'sync_client', client_id: clientId, year: filterYear, month: filterMonth });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-dashboard-campaigns'] });
      toast.success(`${data.campaigns_synced} campanhas sincronizadas.`);
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'pause_campaign', client_id: clientId, campaign_id_external: campaignId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-dashboard-campaigns'] });
      toast.success(data.message);
    },
    onError: (error: any) => toast.error('Erro ao pausar: ' + error.message),
  });

  const activateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'activate_campaign', client_id: clientId, campaign_id_external: campaignId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-dashboard-campaigns'] });
      toast.success(data.message);
    },
    onError: (error: any) => toast.error('Erro ao ativar: ' + error.message),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ campaignId, dailyBudget }: { campaignId: string; dailyBudget: number }) => {
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'update_campaign_budget', client_id: clientId, campaign_id_external: campaignId, daily_budget: dailyBudget });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-dashboard-campaigns'] });
      toast.success(data.message);
      setBudgetDialog({ open: false, campaignId: '', name: '' });
      setNewDailyBudget('');
    },
    onError: (error: any) => toast.error('Erro ao atualizar orçamento: ' + error.message),
  });

  // Aggregated metrics
  const totalInvestment = campaigns.reduce((s, c) => s + (c.investment || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const totalMessages = campaigns.reduce((s, c) => s + (c.messages_started || 0), 0);
  const totalLinkClicks = campaigns.reduce((s, c) => s + (c.link_clicks || 0), 0);
  const totalReach = campaigns.reduce((s, c) => s + (c.reach || 0), 0);
  const cplDenominator = totalLeads > 0 ? totalLeads : totalMessages;
  const avgCpl = cplDenominator > 0 ? totalInvestment / cplDenominator : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // CRM real revenue: sum of all sales completed this month
  const crmTotalRevenue = crmSales.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const crmSalesCount = crmSales.length;
  // ROAS uses real CRM revenue when available, otherwise falls back to campaign revenue_generated
  const campaignRevenue = campaigns.reduce((s, c) => s + (c.revenue_generated || 0), 0);
  const revenueForRoas = crmTotalRevenue > 0 ? crmTotalRevenue : campaignRevenue;
  const avgRoas = totalInvestment > 0 ? revenueForRoas / totalInvestment : 0;

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* AI Action Alerts */}
      <TrafficActionAlerts clientId={clientId} />
      
      {!accountInfo && !accountInfoLoading && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Integração Meta Ads não conectada</p>
                <p className="text-xs text-muted-foreground">Conecte a conta de anúncios do cliente para visualizar métricas reais e campanhas.</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="gap-2 shrink-0"
              onClick={() => {
                // Em um sistema real, mudaríamos a aba para 'config'.
                // Aqui vamos forçar um refresh para destacar as opções.
                window.location.hash = 'config';
                queryClient.invalidateQueries({ queryKey: ['traffic-meta-connections'] });
              }}
            >
              <Settings2 className="h-4 w-4" />
              Conectar Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar Meta
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 ml-auto"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['traffic-meta-connections'] })}
        >
          <Settings2 className="h-4 w-4" />
          Configurar Integração
        </Button>
      </div>

      {/* Meta Account Balance */}
      {accountInfo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Conta Meta: {accountInfo.account_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchAccountInfo()} disabled={accountInfoLoading}>
                <RefreshCw className={`h-3 w-3 ${accountInfoLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gasto Total</p>
                <p className="text-lg font-bold">{formatCurrency(accountInfo.amount_spent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Limite de Gasto</p>
                <p className="text-lg font-bold">{accountInfo.spend_cap > 0 ? formatCurrency(accountInfo.spend_cap) : 'Sem limite'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                <p className={`text-lg font-bold ${accountInfo.balance < 50 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(accountInfo.balance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pagamento</p>
                <p className="text-sm font-medium mt-0.5">{accountInfo.funding_source?.display_string || 'Não configurada'}</p>
              </div>
            </div>
            {accountInfo.spend_cap > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Utilização do limite</span>
                  <span>{((accountInfo.amount_spent / accountInfo.spend_cap) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min((accountInfo.amount_spent / accountInfo.spend_cap) * 100, 100)} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Investimento</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalInvestment)}</p>
            {getGoalValue('Investimento em Tráfego') > 0 && (
              <div className="mt-2 space-y-1">
                <Progress value={Math.min(100, (totalInvestment / getGoalValue('Investimento em Tráfego')) * 100)} className="h-1" />
                <p className="text-[9px] text-muted-foreground">Meta: {formatCurrency(getGoalValue('Investimento em Tráfego'))}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Vendas (CRM)</p>
            </div>
            <p className="text-lg font-bold">{crmSalesCount > 0 ? crmSalesCount : totalLeads}</p>
            {crmTotalRevenue > 0 && <p className="text-xs text-primary font-medium mt-0.5">{formatCurrency(crmTotalRevenue)}</p>}
            {crmSalesCount === 0 && <p className="text-[10px] text-muted-foreground mt-0.5">leads da Meta</p>}
            {getGoalValue('Leads de Tráfego') > 0 && (
              <div className="mt-2 space-y-1">
                <Progress value={Math.min(100, (totalLeads / getGoalValue('Leads de Tráfego')) * 100)} className="h-1" />
                <p className="text-[9px] text-muted-foreground">Meta: {getGoalValue('Leads de Tráfego')} leads</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">CPL</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(avgCpl)}</p>
            {getGoalValue('Custo por Lead (CPL)') > 0 && (
              <div className="mt-2 space-y-1">
                <Progress 
                  value={avgCpl <= getGoalValue('Custo por Lead (CPL)') ? 100 : Math.max(0, 100 - ((avgCpl - getGoalValue('Custo por Lead (CPL)')) / getGoalValue('Custo por Lead (CPL)')) * 100)} 
                  className={cn("h-1", avgCpl > getGoalValue('Custo por Lead (CPL)') ? "bg-destructive/20" : "bg-success/20")} 
                />
                <p className="text-[9px] text-muted-foreground">Meta: {formatCurrency(getGoalValue('Custo por Lead (CPL)'))}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">ROAS</p>
            </div>
            <p className="text-lg font-bold text-primary">{avgRoas.toFixed(2)}x</p>
            {getGoalValue('ROAS de Tráfego') > 0 && (
              <div className="mt-2 space-y-1">
                <Progress value={Math.min(100, (avgRoas / getGoalValue('ROAS de Tráfego')) * 100)} className="h-1" />
                <p className="text-[9px] text-muted-foreground">Meta: {getGoalValue('ROAS de Tráfego')}x</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Eye className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Impressões</p></div><p className="text-lg font-bold">{totalImpressions.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Alcance</p></div><p className="text-lg font-bold">{totalReach.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><MousePointerClick className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Cliques no Link</p></div><p className="text-lg font-bold">{totalLinkClicks.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><MessageCircle className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Conversas</p></div><p className="text-lg font-bold">{totalMessages.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">CTR</p></div><p className="text-lg font-bold">{avgCtr.toFixed(2)}%</p></CardContent></Card>
      </div>

      {/* Engagement & Video Metrics */}
      {(() => {
        const totalEngagement = campaigns.reduce((s, c) => s + (c.post_engagement || 0), 0);
        const totalReactions = campaigns.reduce((s, c) => s + (c.post_reactions || 0), 0);
        const totalComments = campaigns.reduce((s, c) => s + (c.post_comments || 0), 0);
        const totalShares = campaigns.reduce((s, c) => s + (c.post_shares || 0), 0);
        const totalSaves = campaigns.reduce((s, c) => s + (c.post_saves || 0), 0);
        const totalThruplay = campaigns.reduce((s, c) => s + (c.video_thruplay || 0), 0);
        const totalVideoViews = campaigns.reduce((s, c) => s + (c.video_views || 0), 0);
        const totalP100 = campaigns.reduce((s, c) => s + (c.video_p100 || 0), 0);
        const totalOutbound = campaigns.reduce((s, c) => s + (c.outbound_clicks || 0), 0);
        const totalPurchases = campaigns.reduce((s, c) => s + (c.purchases || 0), 0);
        const totalAddToCart = campaigns.reduce((s, c) => s + (c.add_to_cart || 0), 0);
        const hasEngagement = totalEngagement > 0 || totalThruplay > 0 || totalPurchases > 0;
        if (!hasEngagement) return null;
        return (
          <>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Engajamento & Interações</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {totalEngagement > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Engajamento Total</p><p className="text-lg font-bold">{totalEngagement.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalReactions > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Reações</p><p className="text-lg font-bold">{totalReactions.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalComments > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Comentários</p><p className="text-lg font-bold">{totalComments.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalShares > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Compartilhamentos</p><p className="text-lg font-bold">{totalShares.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalSaves > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Salvamentos</p><p className="text-lg font-bold">{totalSaves.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalOutbound > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Cliques Saída</p><p className="text-lg font-bold">{totalOutbound.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalPurchases > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Compras</p><p className="text-lg font-bold">{totalPurchases.toLocaleString('pt-BR')}</p></CardContent></Card>}
                {totalAddToCart > 0 && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Add ao Carrinho</p><p className="text-lg font-bold">{totalAddToCart.toLocaleString('pt-BR')}</p></CardContent></Card>}
              </div>
            </div>
            {totalThruplay > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Métricas de Vídeo</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Visualizações</p><p className="text-lg font-bold">{totalVideoViews.toLocaleString('pt-BR')}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">ThruPlay (15s+)</p><p className="text-lg font-bold">{totalThruplay.toLocaleString('pt-BR')}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Assistiu 100%</p><p className="text-lg font-bold">{totalP100.toLocaleString('pt-BR')}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Taxa Conclusão</p><p className="text-lg font-bold">{totalVideoViews > 0 ? ((totalP100 / totalVideoViews) * 100).toFixed(1) : 0}%</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Custo/ThruPlay</p><p className="text-lg font-bold">{formatCurrency(totalThruplay > 0 ? totalInvestment / totalThruplay : 0)}</p></CardContent></Card>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Campaigns Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Campanhas — {MONTH_NAMES[filterMonth - 1]} {filterYear}</CardTitle></CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma campanha neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Campanha</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Qualidade</TableHead>
                     <TableHead className="text-right">Invest.</TableHead>
                     <TableHead className="text-right">Vendas</TableHead>
                     <TableHead className="text-right">CPL</TableHead>
                     <TableHead className="text-right">CTR</TableHead>
                     <TableHead className="text-right">Conversas</TableHead>
                     <TableHead className="text-right">Engaj.</TableHead>
                     <TableHead className="text-right">ROAS</TableHead>
                     <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm max-w-[180px] truncate">{c.campaign_name || 'Sem nome'}</TableCell>
                      <TableCell>
                         <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                           {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Concluída'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         {c.quality_ranking ? (
                           <div className="flex flex-col gap-0.5">
                             <span className={`text-[10px] ${c.quality_ranking === 'ABOVE_AVERAGE_35' || c.quality_ranking === 'ABOVE_AVERAGE_55' ? 'text-green-600' : c.quality_ranking === 'AVERAGE' ? 'text-yellow-600' : 'text-red-600'}`}>
                               Q: {c.quality_ranking === 'ABOVE_AVERAGE_35' || c.quality_ranking === 'ABOVE_AVERAGE_55' ? '🟢' : c.quality_ranking === 'AVERAGE' ? '🟡' : '🔴'}
                             </span>
                             <span className={`text-[10px] ${c.engagement_rate_ranking === 'ABOVE_AVERAGE_35' || c.engagement_rate_ranking === 'ABOVE_AVERAGE_55' ? 'text-green-600' : c.engagement_rate_ranking === 'AVERAGE' ? 'text-yellow-600' : 'text-red-600'}`}>
                               E: {c.engagement_rate_ranking === 'ABOVE_AVERAGE_35' || c.engagement_rate_ranking === 'ABOVE_AVERAGE_55' ? '🟢' : c.engagement_rate_ranking === 'AVERAGE' ? '🟡' : '🔴'}
                             </span>
                             <span className={`text-[10px] ${c.conversion_rate_ranking === 'ABOVE_AVERAGE_35' || c.conversion_rate_ranking === 'ABOVE_AVERAGE_55' ? 'text-green-600' : c.conversion_rate_ranking === 'AVERAGE' ? 'text-yellow-600' : 'text-red-600'}`}>
                               C: {c.conversion_rate_ranking === 'ABOVE_AVERAGE_35' || c.conversion_rate_ranking === 'ABOVE_AVERAGE_55' ? '🟢' : c.conversion_rate_ranking === 'AVERAGE' ? '🟡' : '🔴'}
                             </span>
                           </div>
                         ) : <span className="text-[10px] text-muted-foreground">—</span>}
                       </TableCell>
                       <TableCell className="text-right text-sm">{formatCurrency(c.investment || 0)}</TableCell>
                      <TableCell className="text-right text-sm">{c.leads || 0}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(c.cost_per_lead > 0 ? c.cost_per_lead : (c.messages_started > 0 ? (c.investment || 0) / c.messages_started : 0))}</TableCell>
                      <TableCell className="text-right text-sm">{(c.ctr || 0).toFixed(2)}%</TableCell>
                       <TableCell className="text-right text-sm">{c.messages_started || 0}</TableCell>
                       <TableCell className="text-right text-sm">{(c.post_engagement || 0).toLocaleString('pt-BR')}</TableCell>
                       <TableCell className="text-right text-sm font-medium">{(c.roas || 0).toFixed(2)}x</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.status === 'active' ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar" disabled={pauseCampaignMutation.isPending}
                              onClick={() => { if (confirm(`Pausar "${c.campaign_name}"?`)) pauseCampaignMutation.mutate(c.campaign_id_external!); }}>
                              {pauseCampaignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                            </Button>
                          ) : c.status === 'paused' ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Ativar" disabled={activateCampaignMutation.isPending}
                              onClick={() => { if (confirm(`Ativar "${c.campaign_name}"?`)) activateCampaignMutation.mutate(c.campaign_id_external!); }}>
                              {activateCampaignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Orçamento"
                            onClick={() => { setBudgetDialog({ open: true, campaignId: c.campaign_id_external!, name: c.campaign_name || 'Campanha' }); setNewDailyBudget(''); }}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={budgetDialog.open} onOpenChange={(open) => setBudgetDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar Orçamento Diário</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2 truncate">{budgetDialog.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">R$</span>
            <Input type="number" step="0.01" min="1" placeholder="Ex: 20.00" value={newDailyBudget} onChange={(e) => setNewDailyBudget(e.target.value)} />
            <span className="text-sm text-muted-foreground">/dia</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button disabled={!newDailyBudget || parseFloat(newDailyBudget) <= 0 || updateBudgetMutation.isPending}
              onClick={() => updateBudgetMutation.mutate({ campaignId: budgetDialog.campaignId, dailyBudget: parseFloat(newDailyBudget) })}>
              {updateBudgetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
