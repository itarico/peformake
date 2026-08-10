import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, DollarSign, Clock, ShoppingCart, TrendingUp, MessageSquare, Check, X, AlertCircle, Bot, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  onViewConversation?: (leadId: string) => void;
}

export default function CrmDashboard({ clientId, onViewConversation }: Props) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    unansweredLeads: 0,
    monthlySales: 0,
    monthlySalesCount: 0,
    conversionRate: '0',
    avgResponseMinutes: 0,
    topProducts: [] as { name: string; count: number }[],
    botMessages: 0,
  });
  const [sales, setSales] = useState<any[]>([]);
  const [unansweredLeads, setUnansweredLeads] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadStats();
  }, [clientId, month]);

  const loadStats = async () => {
    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(year, m - 1, 1).toISOString();
    const monthEnd = new Date(year, m, 0, 23, 59, 59).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: leads }, { data: salesData }, { data: messages }] = await Promise.all([
      supabase.from('crm_leads').select('id, status, last_message_at, interested_products, name, phone, assigned_member_id, created_at').eq('client_id', clientId),
      supabase.from('crm_sales').select('*, crm_leads(name, phone)').eq('client_id', clientId).gte('sale_date', monthStart).lte('sale_date', monthEnd).order('sale_date', { ascending: false }),
      supabase.from('crm_messages').select('direction, created_at, lead_id')
        .eq('client_id', clientId).gte('created_at', weekAgo).order('created_at'),
    ]);

    const leadsData = leads || [];
    const totalLeadsCount = leadsData.length;
    const activeLeadsCount = leadsData.filter(l => l.last_message_at && l.last_message_at >= weekAgo).length;

    // Unanswered: last message is inbound
    const lastMsgByLead: Record<string, { direction: string; lead: any }> = {};
    (messages || []).forEach((msg: any) => {
      lastMsgByLead[msg.lead_id] = { direction: msg.direction, lead: leadsData.find(l => l.id === msg.lead_id) };
    });
    const unanswered = Object.entries(lastMsgByLead)
      .filter(([, v]) => v.direction === 'inbound' && v.lead)
      .map(([, v]) => v.lead);
    setUnansweredLeads(unanswered.slice(0, 5));

    // Sales
    setSales((salesData || []) as any[]);
    const validSales = (salesData || []).filter((s: any) => s.is_confirmed !== false);
    const monthlySales = validSales.reduce((sum: number, s: any) => sum + Number(s.value || 0), 0);
    const monthlySalesCount = validSales.length;
    const conversionRate = totalLeadsCount > 0 ? ((monthlySalesCount / totalLeadsCount) * 100).toFixed(1) : '0';

    // Avg response time
    let totalResponseMs = 0;
    let responseCount = 0;
    const sortedMsgs = (messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 0; i < sortedMsgs.length - 1; i++) {
      if (sortedMsgs[i].direction === 'inbound' && sortedMsgs[i + 1].direction === 'outbound' && sortedMsgs[i].lead_id === sortedMsgs[i + 1].lead_id) {
        totalResponseMs += new Date(sortedMsgs[i + 1].created_at).getTime() - new Date(sortedMsgs[i].created_at).getTime();
        responseCount++;
      }
    }
    const avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 60000) : 0;

    // Top products
    const productCount: Record<string, number> = {};
    leadsData.forEach(l => {
      (l.interested_products || []).forEach((p: string) => {
        productCount[p] = (productCount[p] || 0) + 1;
      });
    });
    const topProducts = Object.entries(productCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Bot messages count this month
    const { count: botMsgCount } = await supabase
      .from('crm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('direction', 'outbound')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    setStats({
      totalLeads: totalLeadsCount, 
      activeLeads: activeLeadsCount, 
      unansweredLeads: unanswered.length,
      monthlySales, monthlySalesCount, conversionRate, avgResponseMinutes,
      topProducts, botMessages: botMsgCount || 0,
    });
  };

  const confirmSale = async (saleId: string, confirmed: boolean) => {
    const { error } = await supabase.from('crm_sales').update({ is_confirmed: confirmed } as any).eq('id', saleId);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success(confirmed ? '✅ Confirmada!' : '❌ Rejeitada');
    loadStats();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ val, label });
  }

  const pendingSales = sales.filter(s => (s as any).is_confirmed === null);

  return (
    <div className="mt-4 space-y-4 animate-in fade-in duration-500">
      {/* Header bar with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background border border-border p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Dashboard Comercial</h2>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Atualizado em tempo real • {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs font-medium bg-background border-border rounded-lg shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border">
              {months.map(m => (
                <SelectItem key={m.val} value={m.val} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 rounded-lg border-border bg-background hover:bg-muted transition-colors"
            onClick={loadStats}
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          icon={Users} 
          label="Total de Leads" 
          value={stats.totalLeads} 
          color="blue"
        />
        <KPICard 
          icon={MessageSquare} 
          label="Ativos (7d)" 
          value={stats.activeLeads} 
          color="emerald"
        />
        <KPICard 
          icon={Clock} 
          label="Sem Resposta" 
          value={stats.unansweredLeads} 
          color="rose" 
          urgent={stats.unansweredLeads > 0}
        />
        <KPICard 
          icon={ShoppingCart} 
          label="Vendas" 
          value={stats.monthlySalesCount} 
          color="amber" 
        />
        <KPICard 
          icon={DollarSign} 
          label="Faturamento" 
          value={`R$ ${stats.monthlySales.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} 
          color="indigo" 
        />
        <KPICard 
          icon={TrendingUp} 
          label="Conversão" 
          value={`${stats.conversionRate}%`} 
          color="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alerts & Recent Sales */}
        <div className="lg:col-span-8 space-y-6">
          {/* Unanswered leads alert */}
          {unansweredLeads.length > 0 && (
            <Card className="border-rose-100 bg-rose-50/20 dark:bg-rose-950/5 rounded-xl overflow-hidden animate-in zoom-in-95 duration-500">
              <CardHeader className="py-4 px-6 border-b border-rose-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-rose-500/10">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-rose-900 dark:text-rose-300">
                        Aguardando Resposta
                      </CardTitle>
                      <p className="text-[10px] text-rose-600/70 font-medium uppercase tracking-wider">
                        {stats.unansweredLeads} leads em espera
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[9px] h-5 rounded-md uppercase tracking-wider font-semibold">Urgente</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-rose-100/50">
                  {unansweredLeads.map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between px-6 py-4 hover:bg-rose-100/20 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs shrink-0">
                          {(lead.name || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">{lead.name || lead.phone}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-rose-400" /> 
                            {Math.floor((Date.now() - new Date(lead.last_message_at).getTime()) / 60000)} min atrás
                          </span>
                        </div>
                      </div>
                      {onViewConversation && (
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[10px] gap-1.5 border-rose-200 hover:bg-rose-500 hover:text-white font-bold rounded-lg transition-all"
                          onClick={() => onViewConversation(lead.id)}>
                          <MessageSquare className="h-3 w-3" /> Responder
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent sales with confirmation */}
          <Card className="border-border rounded-xl overflow-hidden bg-card">
            <CardHeader className="py-5 px-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/5">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold tracking-tight">Vendas Recentes</CardTitle>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fluxo de caixa atualizado</p>
                  </div>
                </div>
                {pendingSales.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-amber-600 uppercase">
                      {pendingSales.length} PENDENTES
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nenhuma venda este mês</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {sales.slice(0, 8).map((sale: any) => {
                    const confirmed = sale.is_confirmed;
                    const leadName = sale.crm_leads?.name || sale.crm_leads?.phone || 'Lead';
                    return (
                      <div key={sale.id} className={`px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-all ${confirmed === false ? 'opacity-40 grayscale' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            confirmed === true ? 'bg-emerald-100 text-emerald-700' :
                            confirmed === false ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            R$
                          </div>
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm truncate text-foreground">{leadName}</span>
                              {confirmed === true && <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] h-4 font-semibold uppercase px-1">Confirmada</Badge>}
                              {confirmed === false && <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] h-4 font-semibold uppercase px-1">Cancelada</Badge>}
                              {confirmed === null && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 text-[9px] h-4 font-semibold uppercase px-1">Pendente</Badge>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {new Date(sale.sale_date).toLocaleDateString('pt-BR')} · {sale.product_name || 'Produto Geral'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className={`font-semibold text-sm tabular-nums ${confirmed === false ? 'line-through text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              R$ {Number(sale.value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {confirmed === null && (
                              <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg border border-border">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" onClick={() => confirmSale(sale.id, true)} title="Confirmar">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all" onClick={() => confirmSale(sale.id, false)} title="Recusar">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {onViewConversation && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:bg-primary hover:text-white rounded-lg transition-all" onClick={() => onViewConversation(sale.lead_id)} title="Ver conversa">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Other metrics */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border rounded-xl overflow-hidden bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tempo Resposta</p>
                  <p className="text-2xl font-semibold text-foreground tracking-tight">{formatTime(stats.avgResponseMinutes)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-all duration-300">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">IA & Automação</p>
                  <p className="text-2xl font-semibold text-foreground tracking-tight">{stats.botMessages}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold">MENSAGENS ENVIADAS</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-all duration-300">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top Produtos</p>
                  <Badge variant="secondary" className="text-[9px] font-semibold border-none text-muted-foreground bg-muted/50">DEMANDA</Badge>
                </div>
                {stats.topProducts.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-xl opacity-40">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sem dados de produtos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.topProducts.map((p, i) => (
                      <div key={p.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="truncate flex-1 text-foreground">{p.name}</span>
                          <span className="text-muted-foreground text-[10px]">{p.count} leads</span>
                        </div>
                        <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${(p.count / (stats.topProducts[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Productivity Tip */}
          <Card className="bg-primary/5 border-primary/10 rounded-xl overflow-hidden relative group">
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-background border border-border shadow-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Insight de Performance</h3>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                {stats.unansweredLeads > 0 
                  ? `Existem ${stats.unansweredLeads} oportunidades esperando. Cada minuto de atraso reduz a chance de fechamento significativamente.`
                  : "Time de elite! Todos os leads foram respondidos. Este é o momento ideal para analisar o funil e identificar melhorias."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  urgent 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color?: string; 
  bg?: string;
  description?: string;
  urgent?: boolean;
}) {
  return (
    <Card className={`relative overflow-hidden border transition-all duration-300 rounded-xl bg-card ${urgent ? 'border-rose-300 shadow-sm shadow-rose-100' : 'border-border shadow-sm'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-muted/50 text-foreground/70 border border-border/50">
            <Icon className="h-4 w-4" />
          </div>
          {urgent && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[9px] font-semibold uppercase tracking-wider border border-rose-100 animate-pulse">
              <AlertCircle className="h-2.5 w-2.5" />
              Atenção
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-xl font-semibold text-foreground tracking-tight tabular-nums">{value}</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
