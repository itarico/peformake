import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Loader2, DollarSign, Users, MessageCircle, MousePointerClick, Target, TrendingUp, BarChart3, Eye, Heart, Share2, Bookmark, Play, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface TrafficResultsProps {
  clientId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function MetricCard({ icon: Icon, label, value, subtitle, color, delta }: {
  icon: any; label: string; value: string; subtitle?: string; color?: string; delta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          {delta !== undefined && delta !== null && delta !== 0 && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${delta > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
              {delta > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
              {Math.abs(delta).toFixed(0)}%
            </Badge>
          )}
        </div>
        <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function TrafficResults({ clientId }: TrafficResultsProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['traffic-campaigns-portal', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch CRM sales for real ROAS
  const { data: crmSales } = useQuery({
    queryKey: ['traffic-crm-sales-portal', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_sales')
        .select('value, sale_date')
        .eq('client_id', clientId);
      if (error) return [];
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaigns?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum dado de tráfego disponível</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Os resultados das suas campanhas aparecerão aqui em breve.
        </p>
      </div>
    );
  }

  const availableMonths = [...new Set(campaigns.map(c => `${c.year}-${c.month}`))];
  const monthCampaigns = campaigns.filter(c => c.year === selectedYear && c.month === selectedMonth);

  // Previous month for comparison
  let prevM = selectedMonth - 1, prevY = selectedYear;
  if (prevM < 1) { prevM = 12; prevY--; }
  const prevMonthCampaigns = campaigns.filter(c => c.year === prevY && c.month === prevM);

  // Consolidated metrics
  const calcMetrics = (mc: any[]) => {
    const inv = mc.reduce((a, c) => a + (c.investment || 0), 0);
    const imp = mc.reduce((a, c) => a + (c.impressions || 0), 0);
    const clicks = mc.reduce((a, c) => a + (c.clicks || 0), 0);
    const leads = mc.reduce((a, c) => a + (c.leads || 0), 0);
    const conv = mc.reduce((a, c) => a + (c.conversions || 0), 0);
    const rev = mc.reduce((a, c) => a + (c.revenue_generated || 0), 0);
    const reach = mc.reduce((a, c) => a + (c.reach || 0), 0);
    const msgs = mc.reduce((a, c) => a + (c.messages_started || 0), 0);
    const linkClicks = mc.reduce((a, c) => a + (c.link_clicks || 0), 0);
    const lpv = mc.reduce((a, c) => a + (c.landing_page_views || 0), 0);
    const postEng = mc.reduce((a, c) => a + (c.post_engagement || 0), 0);
    const postReactions = mc.reduce((a, c) => a + (c.post_reactions || 0), 0);
    const postComments = mc.reduce((a, c) => a + (c.post_comments || 0), 0);
    const postShares = mc.reduce((a, c) => a + (c.post_shares || 0), 0);
    const postSaves = mc.reduce((a, c) => a + (c.post_saves || 0), 0);
    const videoViews = mc.reduce((a, c) => a + (c.video_views || 0), 0);
    const videoThruplay = mc.reduce((a, c) => a + (c.video_thruplay || 0), 0);
    const videoP100 = mc.reduce((a, c) => a + (c.video_p100 || 0), 0);
    const purchases = mc.reduce((a, c) => a + (c.purchases || 0), 0);
    const purchaseValue = mc.reduce((a, c) => a + (c.purchase_value || 0), 0);
    const outboundClicks = mc.reduce((a, c) => a + (c.outbound_clicks || 0), 0);
    const freq = mc.length > 0 ? mc.reduce((a, c) => a + (c.frequency || 0), 0) / mc.length : 0;
    return { inv, imp, clicks, leads, conv, rev, reach, msgs, linkClicks, lpv, postEng, postReactions, postComments, postShares, postSaves, videoViews, videoThruplay, videoP100, purchases, purchaseValue, outboundClicks, freq };
  };

  const s = calcMetrics(monthCampaigns);
  const prev = calcMetrics(prevMonthCampaigns);

  // CRM revenue for real ROAS
  const monthSalesRevenue = (crmSales || [])
    .filter(sale => {
      const d = new Date(sale.sale_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    })
    .reduce((a, sale) => a + (sale.value || 0), 0);

  const realRevenue = monthSalesRevenue > 0 ? monthSalesRevenue : s.rev;
  const cpl = s.leads > 0 ? s.inv / s.leads : 0;
  const ctr = s.imp > 0 ? (s.clicks / s.imp) * 100 : 0;
  const convRate = s.clicks > 0 ? (s.conv / s.clicks) * 100 : 0;
  const roas = s.inv > 0 ? realRevenue / s.inv : 0;

  // Deltas
  const delta = (cur: number, pre: number) => pre > 0 ? ((cur - pre) / pre) * 100 : null;

  // Evolution data (last 6 months)
  const evolutionData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const mc = campaigns.filter(c => c.year === y && c.month === m);
    const inv = mc.reduce((a, c) => a + (c.investment || 0), 0);
    const leads = mc.reduce((a, c) => a + (c.leads || 0), 0);
    const rev = mc.reduce((a, c) => a + (c.revenue_generated || 0), 0);
    const reach = mc.reduce((a, c) => a + (c.reach || 0), 0);
    evolutionData.push({
      month: MONTH_NAMES[m - 1]?.substring(0, 3) || '',
      investimento: inv,
      leads: leads,
      receita: rev,
      alcance: reach,
    });
  }

  // Campaign breakdown by objective
  const campaignsByObjective: Record<string, number> = {};
  monthCampaigns.forEach(c => {
    const obj = c.objective || 'Outros';
    campaignsByObjective[obj] = (campaignsByObjective[obj] || 0) + (c.investment || 0);
  });
  const pieData = Object.entries(campaignsByObjective).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(200, 65%, 50%)'];

  const chartConfig = {
    investimento: { label: 'Investimento', color: 'hsl(var(--primary))' },
    leads: { label: 'Leads', color: 'hsl(142, 76%, 36%)' },
    receita: { label: 'Receita', color: 'hsl(38, 92%, 50%)' },
    alcance: { label: 'Alcance', color: 'hsl(200, 65%, 50%)' },
  };

  const activeCampaigns = monthCampaigns.filter(c => c.status === 'active' || c.status === 'ACTIVE').length;
  const totalCampaigns = monthCampaigns.length;

  return (
    <div className="space-y-6">
      {/* Month Selector + Summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select
          value={`${selectedYear}-${selectedMonth}`}
          onValueChange={(v) => {
            const [y, m] = v.split('-').map(Number);
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((key) => {
              const [y, m] = key.split('-').map(Number);
              return (
                <SelectItem key={key} value={key}>
                  {MONTH_NAMES[m - 1]} {y}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalCampaigns} campanhas</Badge>
          {activeCampaigns > 0 && <Badge className="bg-green-600">{activeCampaigns} ativas</Badge>}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">📊 Resumo do Mês</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetricCard icon={DollarSign} label="Investido" value={formatCurrency(s.inv)} delta={delta(s.inv, prev.inv)} />
          <MetricCard icon={Users} label="Pessoas Alcançadas" value={formatNumber(s.reach)} subtitle="viram seus anúncios" delta={delta(s.reach, prev.reach)} />
          <MetricCard
            icon={Target}
            label="Vendas / Leads"
            value={formatNumber(s.leads || s.conv)}
            color="text-green-600"
            subtitle={s.leads > 0 ? `${s.leads} leads gerados` : `${s.conv} conversões`}
            delta={delta(s.leads || s.conv, prev.leads || prev.conv)}
          />
          <MetricCard
            icon={DollarSign}
            label="Custo por Lead"
            value={formatCurrency(cpl || (s.conv > 0 ? s.inv / s.conv : 0))}
            subtitle="quanto custa cada lead"
            color={cpl > 0 && cpl < 20 ? 'text-green-600' : cpl > 50 ? 'text-red-600' : ''}
          />
        </div>
      </div>

      {/* Performance Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">🎯 Performance</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetricCard
            icon={MousePointerClick}
            label="Cliques"
            value={formatNumber(s.linkClicks || s.clicks)}
            subtitle={`CTR: ${formatPercent(ctr)}`}
            delta={delta(s.linkClicks || s.clicks, prev.linkClicks || prev.clicks)}
          />
          <MetricCard
            icon={MessageCircle}
            label="Conversas Iniciadas"
            value={formatNumber(s.msgs)}
            subtitle="WhatsApp / Messenger"
            delta={delta(s.msgs, prev.msgs)}
          />
          <MetricCard
            icon={Eye}
            label="Impressões"
            value={formatNumber(s.imp)}
            subtitle={`Freq: ${s.freq.toFixed(1)}x`}
            delta={delta(s.imp, prev.imp)}
          />
          <MetricCard
            icon={TrendingUp}
            label="ROAS"
            value={`${roas.toFixed(1)}x`}
            color={roas >= 2 ? 'text-green-600' : roas >= 1 ? 'text-yellow-600' : 'text-red-600'}
            subtitle={roas >= 2 ? '🏆 Excelente retorno' : roas >= 1 ? '✅ Retorno positivo' : '⚠️ Abaixo do investido'}
          />
        </div>
      </div>

      {/* Engagement Section */}
      {s.postEng > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">💬 Interações com seu Conteúdo</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <MetricCard icon={Heart} label="Reações" value={formatNumber(s.postReactions)} subtitle="curtidas e reações" />
            <MetricCard icon={MessageCircle} label="Comentários" value={formatNumber(s.postComments)} />
            <MetricCard icon={Share2} label="Compartilhamentos" value={formatNumber(s.postShares)} />
            <MetricCard icon={Bookmark} label="Salvamentos" value={formatNumber(s.postSaves)} subtitle="guardaram para depois" />
            <MetricCard icon={TrendingUp} label="Total Engajamento" value={formatNumber(s.postEng)} color="text-primary" />
          </div>
        </div>
      )}

      {/* Video Section */}
      {s.videoThruplay > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">🎬 Performance dos Vídeos</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <MetricCard icon={Play} label="Visualizações" value={formatNumber(s.videoViews)} />
            <MetricCard icon={Play} label="Assistiram 15s+" value={formatNumber(s.videoThruplay)} subtitle="ThruPlay" />
            <MetricCard icon={Eye} label="Assistiram até o final" value={formatNumber(s.videoP100)} color="text-green-600" />
            <MetricCard icon={TrendingUp} label="Taxa de Conclusão" value={s.videoViews > 0 ? formatPercent((s.videoP100 / s.videoViews) * 100) : '0%'} subtitle="quem assistiu completo" />
          </div>
        </div>
      )}

      {/* Purchases Section */}
      {(s.purchases > 0 || monthSalesRevenue > 0) && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">🛒 Vendas</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            <MetricCard icon={ShoppingCart} label="Compras" value={formatNumber(s.purchases)} color="text-green-600" />
            <MetricCard icon={DollarSign} label="Receita" value={formatCurrency(realRevenue)} color="text-green-600" />
            <MetricCard icon={DollarSign} label="Custo por Compra" value={formatCurrency(s.purchases > 0 ? s.inv / s.purchases : 0)} />
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Evolution Chart */}
        {evolutionData.some(d => d.investimento > 0 || d.leads > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📈 Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ComposedChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="investimento" fill="var(--color-investimento)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="leads" fill="var(--color-leads)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="receita" stroke="var(--color-receita)" strokeWidth={2} dot />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Reach Evolution */}
        {evolutionData.some(d => d.alcance > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">👥 Alcance Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <AreaChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="alcance" fill="var(--color-alcance)" fillOpacity={0.3} stroke="var(--color-alcance)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Campaign details table */}
      {monthCampaigns.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📋 Campanhas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Campanha</th>
                    <th className="text-right py-2 px-2">Investido</th>
                    <th className="text-right py-2 px-2">Leads</th>
                    <th className="text-right py-2 px-2">CPL</th>
                    <th className="text-right py-2 px-2">Cliques</th>
                    <th className="text-right py-2 pl-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthCampaigns.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{c.campaign_name || 'Campanha'}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(c.investment || 0)}</td>
                      <td className="text-right py-2 px-2">{c.leads || 0}</td>
                      <td className="text-right py-2 px-2">{c.leads > 0 ? formatCurrency((c.investment || 0) / c.leads) : '-'}</td>
                      <td className="text-right py-2 px-2">{formatNumber(c.clicks || 0)}</td>
                      <td className="text-right py-2 pl-2">
                        <Badge variant="outline" className={c.status === 'active' || c.status === 'ACTIVE' ? 'text-green-600 border-green-200' : 'text-muted-foreground'}>
                          {c.status === 'active' || c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {monthCampaigns.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum dado disponível para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
