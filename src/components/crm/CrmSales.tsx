import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, ShoppingCart, Check, X, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  onViewConversation?: (leadId: string) => void;
}

export default function CrmSales({ clientId, onViewConversation }: Props) {
  const [sales, setSales] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadData = () => {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1).toISOString();
    const end = new Date(year, m, 0, 23, 59, 59).toISOString();

    Promise.all([
      supabase.from('crm_sales').select('*, crm_leads(name, phone)')
        .eq('client_id', clientId)
        .gte('sale_date', start).lte('sale_date', end)
        .order('sale_date', { ascending: false }),
      supabase.from('crm_leads').select('id, status').eq('client_id', clientId),
    ]).then(([{ data: s }, { data: l }]) => {
      setSales(s || []);
      setLeads(l || []);
    });
  };

  useEffect(() => { loadData(); }, [clientId, month]);

  const confirmSale = async (saleId: string, confirmed: boolean) => {
    const { error } = await supabase.from('crm_sales').update({ is_confirmed: confirmed } as any).eq('id', saleId);
    if (error) {
      toast.error('Erro ao atualizar venda');
      return;
    }
    toast.success(confirmed ? '✅ Venda confirmada!' : '❌ Venda rejeitada');
    loadData();
  };

  // Only count confirmed/pending sales (not rejected)
  const validSales = sales.filter(s => (s as any).is_confirmed !== false);
  const totalValue = validSales.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? ((validSales.length / totalLeads) * 100).toFixed(1) : '0';

  const pendingCount = sales.filter(s => (s as any).is_confirmed === null).length;
  const confirmedCount = sales.filter(s => (s as any).is_confirmed === true).length;
  const rejectedCount = sales.filter(s => (s as any).is_confirmed === false).length;

  // Month options
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ val, label });
  }

  const getStatusBadge = (sale: any) => {
    const confirmed = (sale as any).is_confirmed;
    if (confirmed === true) return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"><Check className="h-2.5 w-2.5 mr-0.5" />Confirmada</Badge>;
    if (confirmed === false) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]"><X className="h-2.5 w-2.5 mr-0.5" />Rejeitada</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Pendente</Badge>;
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Month selector */}
      <div className="flex justify-between items-center">
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <AlertCircle className="h-3 w-3 mr-1" />
            {pendingCount} venda{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} de confirmação
          </Badge>
        )}
        <div className="ml-auto">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><ShoppingCart className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas Válidas</p>
              <p className="text-2xl font-bold">{validSales.length}</p>
              <div className="flex gap-1.5 mt-0.5">
                {confirmedCount > 0 && <span className="text-[10px] text-emerald-600">✓{confirmedCount}</span>}
                {pendingCount > 0 && <span className="text-[10px] text-amber-600">⏳{pendingCount}</span>}
                {rejectedCount > 0 && <span className="text-[10px] text-destructive">✗{rejectedCount}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><DollarSign className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Conversão</p>
              <p className="text-2xl font-bold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma venda neste mês</p>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => {
                const confirmed = (sale as any).is_confirmed;
                const leadName = (sale.crm_leads as any)?.name || (sale.crm_leads as any)?.phone || 'Lead';
                return (
                  <div key={sale.id} className={`p-4 rounded-xl border transition-colors ${confirmed === false ? 'opacity-50 bg-muted/30' : 'bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{leadName}</p>
                          {getStatusBadge(sale)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</span>
                          {sale.product_name && <span>· {sale.product_name}</span>}
                        </div>
                      </div>
                      <p className={`font-semibold text-lg shrink-0 ${confirmed === false ? 'text-muted-foreground line-through' : 'text-emerald-600'}`}>
                        R$ {Number(sale.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {/* Confirm/Reject buttons */}
                      {confirmed === null && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => confirmSale(sale.id, true)}>
                            <Check className="h-3 w-3" /> Confirmar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={() => confirmSale(sale.id, false)}>
                            <X className="h-3 w-3" /> Rejeitar
                          </Button>
                        </>
                      )}
                      {confirmed === true && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => confirmSale(sale.id, false)}>
                          <X className="h-3 w-3" /> Desfazer
                        </Button>
                      )}
                      {confirmed === false && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => confirmSale(sale.id, true)}>
                          <Check className="h-3 w-3" /> Restaurar
                        </Button>
                      )}

                      {/* View conversation */}
                      {onViewConversation && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 ml-auto"
                          onClick={() => onViewConversation(sale.lead_id)}>
                          <MessageSquare className="h-3 w-3" /> Ver Conversa
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
