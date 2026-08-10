import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { MONTH_NAMES } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  designer_name: string | null;
  arts_approved: number;
  arts_total: number;
  recurring_revenue: number;
  one_off_revenue: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface DesignerRow {
  id: string;
  name: string;
  arts_completed: number;
  cost_per_art: number;
  monthly_cost: number;
  total_cost: number;
}

export default function Financial() {
  const { isAdmin } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());

  const year = parseInt(selectedYear);
  const month = parseInt(selectedMonth);

  // ---- Queries ----
  const { data: clients = [], isLoading: l1 } = useQuery({
    queryKey: ['fin-page-clients'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, price_per_art, arts_per_month, designer_id, has_design_service, has_consulting_service, consulting_price_per_month, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staffMembers = [], isLoading: l2 } = useQuery({
    queryKey: ['fin-page-staff'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, cost_per_art, monthly_cost, role, roles')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: workMonths = [], isLoading: l3 } = useQuery({
    queryKey: ['fin-page-wm', year, month],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_months')
        .select('id, client_id')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: arts = [], isLoading: l4 } = useQuery({
    queryKey: ['fin-page-arts', year, month, workMonths.length],
    enabled: isAdmin && workMonths.length > 0,
    queryFn: async () => {
      const ids = workMonths.map(w => w.id);
      const { data, error } = await supabase
        .from('arts')
        .select('id, work_month_id, status, designer_id')
        .in('work_month_id', ids);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientServices = [], isLoading: l5 } = useQuery({
    queryKey: ['fin-page-client-services'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, price, quantity, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: otherRevenues = [], isLoading: l6 } = useQuery({
    queryKey: ['fin-page-other-revenues', year, month],
    enabled: isAdmin,
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      const { data, error } = await supabase
        .from('other_revenues')
        .select('client_id, amount, payment_status, is_fixed')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: agencyExpenses = [], isLoading: l7 } = useQuery({
    queryKey: ['fin-page-agency-expenses', year, month],
    enabled: isAdmin,
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      const { data, error } = await supabase
        .from('agency_expenses')
        .select('amount, category, description, due_date, year, month')
        .or(`and(due_date.gte.${startDate},due_date.lte.${endDate}),and(year.eq.${year},month.eq.${month})`);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  // ---- Process data ----
  const financialData = useMemo(() => {
    const wmByClient = new Map<string, string[]>();
    workMonths.forEach(w => {
      if (!wmByClient.has(w.client_id)) wmByClient.set(w.client_id, []);
      wmByClient.get(w.client_id)!.push(w.id);
    });

    const staffById = new Map(staffMembers.map(s => [s.id, s]));

    const clientRows: ClientRow[] = clients.map(c => {
      const clientWmIds = wmByClient.get(c.id) || [];
      const clientArts = arts.filter(a => clientWmIds.includes(a.work_month_id));
      const approved = clientArts.filter(a => a.status === 'approved').length;

      // Recurring revenue: prefer client_services, fallback to legacy fields
      const services = clientServices.filter(cs => cs.client_id === c.id);
      let recurring = services.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.quantity) || 1), 0);
      
      // If client_services has NO entries, fallback to legacy fields
      if (services.length === 0) {
        if (c.has_design_service) recurring += (Number(c.price_per_art) || 0) * (Number(c.arts_per_month) || 0);
        if (c.has_consulting_service) recurring += Number(c.consulting_price_per_month) || 0;
      }

      // Outras receitas do banco para este cliente
      const clientOtherRevenues = otherRevenues.filter(r => r.client_id === c.id);
      
      // Separamos receitas avulsas (one-off) das que podem ser duplicatas da recorrência (fixas)
      const oneOff = clientOtherRevenues
        .filter(r => !(r as any).is_fixed)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      
      const fixedFromDb = clientOtherRevenues
        .filter(r => (r as any).is_fixed)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      // Se temos valor fixo no banco, usamos ele, senão usamos a projeção
      const finalRecurring = fixedFromDb > 0 ? fixedFromDb : recurring;
      const revenue = finalRecurring + oneOff;

      // Cost: approved arts × designer cost_per_art
      const designer = c.designer_id ? staffById.get(c.designer_id) : null;
      const costPerArt = Number(designer?.cost_per_art) || 0;
      const cost = approved * costPerArt;

      return {
        id: c.id,
        name: c.name,
        designer_name: designer?.full_name || null,
        arts_approved: approved,
        arts_total: clientArts.length,
        recurring_revenue: recurring,
        one_off_revenue: oneOff,
        revenue,
        cost,
        profit: revenue - cost,
      };
    });

    // Other revenues with no client linked
    const orphanRevenue = otherRevenues
      .filter(r => !r.client_id || !clients.some(c => c.id === r.client_id))
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    // Designer aggregation
    const designerMap = new Map<string, DesignerRow>();
    arts.filter(a => a.status === 'approved' && a.designer_id).forEach(a => {
      const s = staffById.get(a.designer_id!);
      if (!s) return;
      const cost_per_art = Number(s.cost_per_art) || 0;
      const existing = designerMap.get(s.id);
      if (existing) {
        existing.arts_completed += 1;
        existing.total_cost += cost_per_art;
      } else {
        designerMap.set(s.id, {
          id: s.id,
          name: s.full_name,
          arts_completed: 1,
          cost_per_art,
          monthly_cost: Number(s.monthly_cost) || 0,
          total_cost: cost_per_art,
        });
      }
    });

    const designersRows = Array.from(designerMap.values());

    const total_revenue = clientRows.reduce((s, c) => s + c.revenue, 0) + orphanRevenue;
    const total_design_cost = clientRows.reduce((s, c) => s + c.cost, 0);
    const total_team_fixed = staffMembers.reduce((s, m) => s + (Number(m.monthly_cost) || 0), 0);
    const total_agency_expenses = agencyExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const total_cost = total_design_cost + total_team_fixed + total_agency_expenses;
    const total_profit = total_revenue - total_cost;
    const profit_margin = total_revenue > 0 ? (total_profit / total_revenue) * 100 : 0;

    return {
      clients: clientRows.sort((a, b) => b.revenue - a.revenue),
      designers: designersRows.sort((a, b) => b.total_cost - a.total_cost),
      orphanRevenue,
      totals: {
        total_revenue,
        total_design_cost,
        total_team_fixed,
        total_agency_expenses,
        total_cost,
        total_profit,
        profit_margin,
      },
    };
  }, [clients, staffMembers, workMonths, arts, clientServices, otherRevenues, agencyExpenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const years = [
    currentDate.getFullYear() - 1,
    currentDate.getFullYear(),
    currentDate.getFullYear() + 1,
  ];

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe faturamento, custos e lucro mensal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(financialData.totals.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recorrência + serviços avulsos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custos</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(financialData.totals.total_cost)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Equipe fixa + variáveis + despesas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${financialData.totals.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(financialData.totals.total_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Faturamento menos custos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${financialData.totals.profit_margin >= 30 ? 'text-success' : 'text-warning'}`}>
                  {financialData.totals.profit_margin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Margem de lucro
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Composição dos Custos</CardTitle>
              <CardDescription>Detalhamento dos custos do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Equipe Fixa</p>
                  <p className="text-xl font-bold">{formatCurrency(financialData.totals.total_team_fixed)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Custo Variável (artes)</p>
                  <p className="text-xl font-bold">{formatCurrency(financialData.totals.total_design_cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Despesas da Agência</p>
                  <p className="text-xl font-bold">{formatCurrency(financialData.totals.total_agency_expenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Cliente</CardTitle>
              <CardDescription>
                Receita recorrente, avulsa e custos por cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialData.clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cliente ativo
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Designer</TableHead>
                      <TableHead className="text-center">Artes</TableHead>
                      <TableHead className="text-right">Recorrência</TableHead>
                      <TableHead className="text-right">Avulsos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialData.clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          {client.designer_name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {client.arts_approved}/{client.arts_total}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(client.recurring_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(client.one_off_revenue)}
                        </TableCell>
                        <TableCell className="text-right text-success font-medium">
                          {formatCurrency(client.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(client.cost)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${client.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(client.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5}>Total</TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(financialData.totals.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(financialData.totals.total_design_cost)}
                      </TableCell>
                      <TableCell className={`text-right ${financialData.totals.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(financialData.totals.total_profit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Designer Costs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Custos por Designer</CardTitle>
              <CardDescription>
                Custo variável por arte aprovada no período
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialData.designers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum custo de designer no período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designer</TableHead>
                      <TableHead className="text-center">Artes Aprovadas</TableHead>
                      <TableHead className="text-right">Valor/Arte</TableHead>
                      <TableHead className="text-right">Salário Fixo</TableHead>
                      <TableHead className="text-right">Variável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialData.designers.map((designer) => (
                      <TableRow key={designer.id}>
                        <TableCell className="font-medium">{designer.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{designer.arts_completed}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(designer.cost_per_art)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(designer.monthly_cost)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(designer.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
