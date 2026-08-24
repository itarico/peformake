import { useState, useEffect, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { 
  Plus, Trash2, Pencil, Check, X, ChevronDown, 
  Film, LayoutDashboard, Building2, Wallet, 
  ArrowUpRight, ArrowDownRight, History, Receipt,
  TrendingUp, TrendingDown, Landmark, Calendar as CalendarIcon,
  Users, FileText, Target, BarChart3, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, endOfMonth, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import FinancialReportDialog from './FinancialReportDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';

const CATEGORIES = ['aluguel', 'software', 'salários', 'marketing', 'impostos', 'freelancer', 'ferramentas', 'equipe', 'serviço', 'Edição', 'Captação', 'Fotografia', 'Drone', 'outros'];
const CATEGORY_COLORS: Record<string, string> = {
  aluguel: '#ef4444',
  software: '#3b82f6',
  salários: '#10b981',
  marketing: '#f59e0b',
  impostos: '#6366f1',
  freelancer: '#8b5cf6',
  ferramentas: '#ec4899',
  equipe: '#14b8a6',
  serviço: '#f97316',
  Edição: '#0ea5e9',
  Captação: '#f43f5e',
  Fotografia: '#84cc16',
  Drone: '#a855f7',
  outros: '#94a3b8'
};
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const AUDIOVISUAL_SLUGS = [
  'audiovisual', 'video', 'reels', 'filmagem', 'producao-video', 'producao_audiovisual',
  'edicao', 'edição', 'drone', 'captacao', 'captação', 'fotografia', 'fotográfia'
];

const parseSafeDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return { year: 0, month: 0, day: 0 };
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length < 3) return { year: 0, month: 0, day: 0 };
    return {
      year: parseInt(parts[0]) || 0,
      month: parseInt(parts[1]) || 0,
      day: parseInt(parts[2]) || 0
    };
  } catch (e) {
    console.error("Error parsing date:", dateStr, e);
    return { year: 0, month: 0, day: 0 };
  }
};

const FinancialPanel = () => {
  const { isAdmin } = useAuth();
  const { isAdmin: isStaffAdmin, isLeader, isFinanceEllcazo, isEllcazo } = useStaffAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  // Cargo "Financeiro (Ellcazo)"/"Admin Ellcazo": só enxerga a entidade Ellcazo aqui, sem opção de
  // trocar pra Peformake/Geral (ver src/lib/staffRoles.ts).
  const isEllcazoOnlyView = (isFinanceEllcazo || isEllcazo) && !isStaffAdmin && !isLeader;
  const [activeView, setActiveView] = useState<'all' | 'peformake' | 'ellcazo'>(isEllcazoOnlyView ? 'ellcazo' : 'all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; type: 'income' | 'expense' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [weekFilter, setWeekFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all');

  const [newEntry, setNewEntry] = useState({
    type: 'expense' as 'income' | 'expense',
    entity: (activeView === 'all' ? 'peformake' : activeView) as 'peformake' | 'ellcazo',
    category: 'outros',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_status: 'paid' as 'paid' | 'pending',
    client_id: '',
    is_fixed: false
  });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setActiveTab('entries');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeView !== 'all') {
      setNewEntry(prev => ({ ...prev, entity: activeView as 'peformake' | 'ellcazo' }));
    }
  }, [activeView]);

  useEffect(() => {
    // Update default date when filters change to match the current period
    const today = new Date();
    let defaultDate = today;
    
    // If we are looking at a different month/year, use the 1st of that month
    if (filterMonth !== today.getMonth() + 1 || filterYear !== today.getFullYear()) {
      defaultDate = new Date(filterYear, filterMonth - 1, 1);
    }
    
    setNewEntry(prev => ({ 
      ...prev, 
      date: defaultDate.toISOString().split('T')[0] 
    }));
  }, [filterMonth, filterYear]);

  const { data: expenses = [] } = useQuery({
    queryKey: ['fin-expenses', filterMonth, filterYear],
    queryFn: async () => {
      const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
      const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59).toISOString();
      
      const { data, error } = await supabase
        .from('agency_expenses')
        .select('*, clients(id, name, contract_model, setup_fee, contract_start_date, contract_end_date)')
        .or(`and(due_date.gte.${startDate},due_date.lte.${endDate}),and(year.eq.${filterYear},month.eq.${filterMonth})`)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: otherRevenues = [] } = useQuery({
    queryKey: ['fin-other-revenues', filterMonth, filterYear],
    queryFn: async () => {
      const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
      const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59).toISOString();
      
      const { data, error } = await supabase
        .from('other_revenues')
        .select('*, clients(id, name, contract_model, setup_fee, contract_start_date, contract_end_date)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['fin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, designer:staff_members!designer_id(id, full_name, avatar_url)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['fin-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['fin-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: clientExpenses = [] } = useQuery({
    queryKey: ['fin-client-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_expenses').select('*, clients(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  
  const { data: financialGoal } = useQuery({
    queryKey: ['fin-goal', filterMonth, filterYear, activeView],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('month', filterMonth)
        .eq('year', filterYear)
        .eq('entity', activeView)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from('financial_goals')
        .upsert({
          month: filterMonth,
          year: filterYear,
          entity: activeView,
          goal_amount: amount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'month,year,entity' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fin-goal'] });
      setIsGoalDialogOpen(false);
      toast.success('Meta atualizada com sucesso');
    },
    onError: () => toast.error('Erro ao salvar meta'),
  });

  const resetDataMutation = useMutation({
    mutationFn: async (includeServices: boolean) => {
      if (includeServices) {
        // Reset completo: Lançamentos e Serviços
        const { error: err1 } = await supabase.from('agency_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('other_revenues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err2) throw err2;
        const { error: err3 } = await supabase.from('client_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err3) throw err3;
      } else {
        // Reset apenas lançamentos
        const { error: err1 } = await supabase.from('agency_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('other_revenues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Dados resetados com sucesso');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erro ao resetar dados');
    }
  });

  const isAudiovisualService = (service: any) => {
    const slug = service?.services?.slug || '';
    const name = (service?.services?.name || '').toLowerCase();
    return AUDIOVISUAL_SLUGS.some(k => slug.includes(k) || name.includes(k));
  };

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId);
    if (services.length > 0) return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return (client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0) +
      (client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0);
  };

  const getClientAudiovisualRevenue = (clientId: string) => {
    return clientServices.filter(cs => cs.client_id === clientId && isAudiovisualService(cs))
      .reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
  };

  const filteredStaff = staffMembers.filter(s => {
    const entity = (s as any).entity || 'peformake';
    if (activeView === 'all') return true;
    return entity === activeView;
  });

  const teamCost = filteredStaff.reduce((sum, s) => sum + (s.monthly_cost || 0), 0);

  const filteredExpenses = expenses.filter(e => {
    const dateStr = e.due_date || (e.year && e.month ? `${e.year}-${String(e.month).padStart(2, '0')}-01` : '');
    const { month, year } = parseSafeDate(dateStr);
    const matchesPeriod = month === filterMonth && year === filterYear;
    const entity = (e as any).entity || 'peformake';
    const matchesEntity = activeView === 'all' ? true : entity === activeView;
    return matchesPeriod && matchesEntity;
  });

  const filteredOtherRevenues = useMemo(() => {
    // Primeiro, vamos agrupar por cliente/entidade/descrição para escolher o melhor registro (preferindo 'paid')
    const grouped = new Map<string, any>();
    
    otherRevenues.forEach(r => {
      const { month, year } = parseSafeDate(r.date);
      const matchesPeriod = month === filterMonth && year === filterYear;
      const entity = (r as any).entity || 'peformake';
      const matchesEntity = activeView === 'all' ? true : entity === activeView;
      
      if (!matchesPeriod || !matchesEntity) return;

      // Chave única baseada em cliente, entidade e se é fixo ou não
      // Para fixos, agrupamos por cliente e entidade para evitar duplicatas de mensalidade
      const key = r.is_fixed && r.client_id 
        ? `fixed-${r.client_id}-${entity}` 
        : `oneoff-${r.id}`;

      const existing = grouped.get(key);
      // Se já existe, preferimos o que está pago
      if (!existing || (existing.payment_status !== 'paid' && r.payment_status === 'paid')) {
        grouped.set(key, r);
      }
    });

    return Array.from(grouped.values());
  }, [otherRevenues, filterMonth, filterYear, activeView]);

  const totalAgencyExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalOtherRevenues = filteredOtherRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

  const monthlyContractRevenue = useMemo(() => {
    return clients.reduce((sum, c) => {
      const rev = getClientRevenue(c.id);
      const audiovisual = getClientAudiovisualRevenue(c.id);
      const peformakePart = rev - audiovisual;

      let valueToAdd = 0;
      if (activeView === 'all') valueToAdd = rev;
      else if (activeView === 'ellcazo') valueToAdd = audiovisual;
      else valueToAdd = peformakePart;

      // Add setup fee if it's the start month
      const setupFee = (c as any).setup_fee || 0;
      const startDate = (c as any).contract_start_date;
      if (setupFee > 0 && startDate) {
        const { month: sMonth, year: sYear } = parseSafeDate(startDate);
        if (sMonth === filterMonth && sYear === filterYear) {
          if (activeView === 'all' || activeView === 'peformake') {
            valueToAdd += setupFee;
          }
        }
      }

      // Se houver filtro de semana, verificamos se o dia de vencimento cai nela
      if (weekFilter !== 'all') {
        const bDay = c.billing_day || 1;
        const bWeek = bDay <= 7 ? '1' : bDay <= 14 ? '2' : bDay <= 21 ? '3' : '4';
        if (bWeek !== weekFilter) return sum;
      }
      
      return sum + valueToAdd;
    }, 0);
  }, [clients, activeView, weekFilter, clientServices, filterMonth, filterYear]);

  // Definição das funções auxiliares antes do uso nos stats
  function createFixedEntry(c: any, amount: number, entity: 'peformake' | 'ellcazo', suffix: string) {
    const existingPayment = otherRevenues.find(r => {
      const { year, month } = parseSafeDate(r.date);
      return r.client_id === c.id && 
             r.is_fixed === true && 
             (r as any).entity === entity &&
             month === filterMonth && 
             year === filterYear;
    });

    const billingDay = Math.min(c.billing_day || 1, getDaysInMonth(new Date(filterYear, filterMonth - 1)));
    return {
      id: existingPayment?.id || `fixed-client-${c.id}-${entity}`,
      date: existingPayment?.date || `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`,
      description: existingPayment?.description || `${suffix}: ${c.name}`,
      amount: existingPayment ? existingPayment.amount : amount,
      entity: (existingPayment as any)?.entity || entity,
      category: existingPayment?.category || 'serviço',
      type: 'income' as const,
      is_fixed: true,
      payment_status: existingPayment?.payment_status || 'pending',
      client_id: c.id,
      is_virtual: !existingPayment,
      real_id: existingPayment?.id
    };
  }

  const fixedClientsIncomes = useMemo(() => {
    return clients
      .filter(c => getClientRevenue(c.id) > 0 || (c as any).setup_fee > 0)
      .flatMap(c => {
        const entries: any[] = [];
        const revenue = getClientRevenue(c.id);
        const audiovisual = getClientAudiovisualRevenue(c.id);
        const peformakePart = revenue - audiovisual;
        
        // Setup Fee logic - only in the start month
        const setupFee = (c as any).setup_fee || 0;
        const startDate = (c as any).contract_start_date;
        if (setupFee > 0 && startDate) {
          const { month: sMonth, year: sYear } = parseSafeDate(startDate);
          if (sMonth === filterMonth && sYear === filterYear) {
            entries.push(createFixedEntry(c, setupFee, 'peformake', 'Taxa de Setup'));
          }
        }

        if (peformakePart > 0) entries.push(createFixedEntry(c, peformakePart, 'peformake', 'Mensalidade'));
        if (audiovisual > 0) entries.push(createFixedEntry(c, audiovisual, 'ellcazo', 'Audiovisual'));
        return entries;
      });
  }, [clients, otherRevenues, filterMonth, filterYear, clientServices]);

  const stats = useMemo(() => {
    // Separate expenses that are actually monthly payments (incomes)
    const misplacedIncomesFromExpenses = filteredExpenses.filter(e => 
      e.description?.toLowerCase().includes('mensalidade') || 
      e.category?.toLowerCase().includes('serviço')
    );
    const trueExpenses = filteredExpenses.filter(e => 
      !e.description?.toLowerCase().includes('mensalidade') && 
      !e.category?.toLowerCase().includes('serviço')
    );

    // 1. Filter Incomes (Other Revenues + Contracts + Misplaced Monthly Payments)
    const rawIncomes = [
      ...filteredOtherRevenues,
      ...fixedClientsIncomes.filter(f => !otherRevenues.some(r => r.id === f.id)),
      ...misplacedIncomesFromExpenses.map(e => ({ ...e, type: 'income' as const, date: e.due_date || (e.year && e.month ? `${e.year}-${String(e.month).padStart(2, '0')}-01` : '') }))
    ];

    const processedIncomes = rawIncomes.filter(inc => {
      // Filtragem por entidade (Peformake vs Ellcazo) na Receita Prevista
      const entity = (inc as any).entity || 'peformake';
      if (activeView !== 'all' && entity !== activeView) return false;

      if (weekFilter !== 'all') {
        const { day } = parseSafeDate(inc.date);
        const week = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        if (week !== weekFilter) return false;
      }
      return true;
    });

    const expectedRevenue = processedIncomes.reduce((sum, r) => sum + (r.amount || 0), 0);
    const actualRevenue = processedIncomes
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // 2. Filter Expenses
    const teamWeeklyCost = (weekFilter === 'all' || weekFilter === '1') ? teamCost : 0;
    
    const processedExpenses = trueExpenses.filter(exp => {
      if (weekFilter !== 'all') {
        const dateStr = exp.due_date || (exp.year && exp.month ? `${exp.year}-${String(exp.month).padStart(2, '0')}-01` : '');
        const { day } = parseSafeDate(dateStr);
        const week = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        if (week !== weekFilter) return false;
      }
      return true;
    });

    const expectedCosts = processedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) + teamWeeklyCost;
    const actualCosts = processedExpenses
      .filter(e => e.payment_status === 'paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0) + teamWeeklyCost;

    return {
      expectedRevenue,
      actualRevenue,
      expectedCosts,
      actualCosts,
      netProfit: actualRevenue - actualCosts,
      expectedProfit: expectedRevenue - expectedCosts
    };
  }, [filteredOtherRevenues, fixedClientsIncomes, filteredExpenses, teamCost, weekFilter, otherRevenues]);

  const { expectedRevenue, actualRevenue, expectedCosts, actualCosts, netProfit } = stats;

  const goalAmount = financialGoal?.goal_amount || 0;
  const goalProgress = goalAmount > 0 ? (expectedRevenue / goalAmount) * 100 : 0;
  const margin = actualRevenue > 0 ? (netProfit / actualRevenue) * 100 : 0;

  const serviceRevenueData = useMemo(() => {
    const revenueMap = new Map<string, { revenue: number; clients: number }>();
    const clientMap = new Map<string, Set<string>>();
    
    // Mensalidades fixas (Distribuídas por semana de vencimento)
    clients.forEach(c => {
      let matchesWeek = true;
      if (weekFilter !== 'all') {
        const bDay = c.billing_day || 1;
        const bWeek = bDay <= 7 ? '1' : bDay <= 14 ? '2' : bDay <= 21 ? '3' : '4';
        matchesWeek = bWeek === weekFilter;
      }

      if (matchesWeek) {
        const services = clientServices.filter(cs => cs.client_id === c.id);
        services.forEach(cs => {
          const serviceName = (cs as any).services?.name || 'Outro';
          const rev = (cs.price || 0) * (cs.quantity || 1);
          const existing = revenueMap.get(serviceName) || { revenue: 0, clients: 0 };
          existing.revenue += rev;
          if (!clientMap.has(serviceName)) clientMap.set(serviceName, new Set());
          clientMap.get(serviceName)!.add(cs.client_id);
          revenueMap.set(serviceName, existing);
        });
      }
    });

    // Outras receitas (filtradas por semana)
    filteredOtherRevenues.forEach(r => {
      let matchesWeek = true;
      if (weekFilter !== 'all') {
        const { day } = parseSafeDate(r.date);
        const week = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        matchesWeek = week === weekFilter;
      }

      if (matchesWeek) {
        const serviceName = r.category || 'Serviço Avulso';
        const rev = r.amount || 0;
        const existing = revenueMap.get(serviceName) || { revenue: 0, clients: 0 };
        existing.revenue += rev;
        if (r.client_id) {
          if (!clientMap.has(serviceName)) clientMap.set(serviceName, new Set());
          clientMap.get(serviceName)!.add(r.client_id);
        }
        revenueMap.set(serviceName, existing);
      }
    });

    revenueMap.forEach((val, key) => val.clients = clientMap.get(key)?.size || 0);
    return Array.from(revenueMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter(s => {
        if (activeView === 'all') return true;
        const isAV = AUDIOVISUAL_SLUGS.some(k => s.name.toLowerCase().includes(k.replace('_', ' ')));
        return activeView === 'ellcazo' ? isAV : !isAV;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [clientServices, filteredOtherRevenues, weekFilter, activeView]);

  const clientProfitability = useMemo(() => clients.map(c => {
    // Pegamos a receita base do cliente para este mês
    const revenue = getClientRevenue(c.id);
    const audiovisual = getClientAudiovisualRevenue(c.id);
    const other = revenue - audiovisual;
    
    // Custos diretos do cliente
    const clientExpAgency = filteredExpenses
      .filter((e: any) => e.client_id === c.id)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
    // Receitas registradas no banco para este cliente (inclui fixos e avulsos)
    const dbRevenues = filteredOtherRevenues.filter(r => r.client_id === c.id);
    
    // Separamos o que é fixo e o que é avulso do banco
    const fixedDbRev = dbRevenues.filter(r => r.is_fixed);
    const extraRev = dbRevenues.filter(r => !r.is_fixed).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Lógica para determinar a receita de exibição baseada na visão ativa
    let baseDisplayRev = 0;
    
    if (activeView === 'all') {
      // Na visão total, usamos a receita do banco para o que já foi registrado
      // e a receita projetada para o que ainda não foi registrado
      const audiovisualDb = fixedDbRev.filter(r => r.entity === 'ellcazo').reduce((s, r) => s + r.amount, 0);
      const monthlyDb = fixedDbRev.filter(r => r.entity === 'peformake').reduce((s, r) => s + r.amount, 0);
      
      const audiovisualFinal = audiovisualDb > 0 ? audiovisualDb : audiovisual;
      const monthlyFinal = monthlyDb > 0 ? monthlyDb : other;
      
      baseDisplayRev = audiovisualFinal + monthlyFinal + extraRev;
    } else if (activeView === 'ellcazo') {
      const audiovisualDb = fixedDbRev.filter(r => r.entity === 'ellcazo').reduce((s, r) => s + r.amount, 0);
      baseDisplayRev = audiovisualDb > 0 ? audiovisualDb : audiovisual;
    } else {
      const monthlyDb = fixedDbRev.filter(r => r.entity === 'peformake').reduce((s, r) => s + r.amount, 0);
      baseDisplayRev = monthlyDb > 0 ? monthlyDb : other;
    }
    
    return { 
      name: c.name, 
      revenue: baseDisplayRev, 
      audiovisual, 
      expenses: clientExpAgency, 
      profit: baseDisplayRev - clientExpAgency 
    };
  }).filter(c => c.revenue > 0 || c.expenses > 0).sort((a, b) => b.revenue - a.revenue), [clients, filteredExpenses, filteredOtherRevenues, activeView, clientServices, filterMonth, filterYear]);

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(newEntry.amount) || 0;
      const isMensalidade = newEntry.description?.toLowerCase().includes('mensalidade');
      const effectiveType = isMensalidade ? 'income' : newEntry.type;

      if (effectiveType === 'expense') {
        const { year, month } = parseSafeDate(newEntry.date);
        const { error } = await supabase.from('agency_expenses').insert({
          year,
          month,
          category: newEntry.category || 'outros',
          description: newEntry.description,
          amount,
          entity: newEntry.entity,
          due_date: newEntry.date,
          payment_status: newEntry.payment_status,
          is_fixed: newEntry.is_fixed,
          client_id: newEntry.client_id || null
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('other_revenues').insert({
          date: newEntry.date,
          description: newEntry.description,
          amount,
          entity: newEntry.entity,
          category: newEntry.category || 'serviço',
          client_id: newEntry.client_id || null,
          payment_status: newEntry.payment_status,
          is_fixed: newEntry.is_fixed
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setNewEntry(prev => ({ ...prev, description: '', amount: '', client_id: '' }));
      toast.success('Lançamento realizado');
    },
    onError: () => toast.error('Erro ao realizar lançamento'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async ({ id, type, tableName }: { id: string; type: 'income' | 'expense'; tableName?: string }) => {
      const table = tableName || (type === 'expense' ? 'agency_expenses' : 'other_revenues');
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const updateEntryMutation = useMutation({
    mutationFn: async (updatedEntry: any) => {
      const table = updatedEntry.tableName || (updatedEntry.type === 'income' ? 'other_revenues' : 'agency_expenses');
      const isAgencyExpenseTable = table === 'agency_expenses';
      const { type, date, clients, is_virtual, real_id, tableName, ...data } = updatedEntry;
      
      const payload: any = {};
      const validColumns = isAgencyExpenseTable
        ? ['category', 'description', 'amount', 'entity', 'payment_status', 'is_fixed', 'client_id', 'due_date', 'year', 'month']
        : ['category', 'description', 'amount', 'entity', 'payment_status', 'is_fixed', 'client_id', 'date'];
      
      Object.keys(data).forEach(key => {
        if (validColumns.includes(key)) {
          payload[key] = data[key];
        }
      });

      if (isAgencyExpenseTable) {
        payload.due_date = date;
        const { year, month } = parseSafeDate(date);
        payload.year = year;
        payload.month = month;
      } else {
        payload.date = date;
      }

      const { error } = await supabase.from(table as any).update(payload).eq('id', updatedEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditingEntry(null);
      toast.success('Lançamento atualizado');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast.error('Erro ao atualizar lançamento');
    },
  });

  const handleCellEdit = (id: string, field: string, value: any, type: 'income' | 'expense') => {
    setEditingCell({ id, field, type });
    setEditValue(String(value));
  };

  const saveCellEdit = (entry: any) => {
    if (!editingCell) return;
    const { id, field, type } = editingCell;
    const isVirtual = String(id).startsWith('fixed-client-');
    
    // Preparar objeto de atualização baseado no tipo original da entry
    const updateData: any = { ...entry, id, type };
    
    if (field === 'amount') {
      updateData.amount = parseFloat(editValue) || 0;
    } else if (field === 'client_id') {
      updateData.client_id = editValue === 'none' ? null : editValue;
    } else if (field === 'is_fixed') {
      updateData.is_fixed = editValue === 'true';
    } else if (field === 'date') {
      updateData.date = editValue;
    } else {
      updateData[field] = editValue;
    }

    if (isVirtual) {
      const amount = updateData.amount || 0;
      const isIncome = type === 'income';
      const table = isIncome ? 'other_revenues' : 'agency_expenses';
      
      const payload: any = {
        description: updateData.description,
        amount,
        entity: updateData.entity || 'peformake',
        category: updateData.category || (isIncome ? 'serviço' : 'outros'),
        client_id: updateData.client_id,
        payment_status: updateData.payment_status || 'pending',
        is_fixed: true
      };
      
      if (!isIncome) {
        payload.due_date = updateData.date;
        const { year, month } = parseSafeDate(updateData.date);
        payload.year = year;
        payload.month = month;
      } else {
        payload.date = updateData.date;
      }

      const confirmAndSave = async () => {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      };

      toast.promise(confirmAndSave(), {
        loading: 'Confirmando e salvando...',
        success: () => {
          queryClient.invalidateQueries();
          return 'Lançamento confirmado';
        },
        error: 'Erro ao salvar'
      });
    } else {
      updateEntryMutation.mutate(updateData);
    }
    setEditingCell(null);
  };

  const updateStaffCostMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const cost = parseFloat(editCost) || 0;
      const { error } = await supabase.from('staff_members').update({ monthly_cost: cost }).eq('id', staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fin-staff'] });
      setEditingStaff(null);
      toast.success('Custo atualizado');
    },
    onError: () => toast.error('Erro ao atualizar custo'),
  });

  // (As funções createFixedEntry e fixedClientsIncomes foram movidas para cima)

  const combinedEntries = useMemo(() => {
    const rawEntries = [
      ...filteredExpenses.map(e => {
        const isIncome = e.description?.toLowerCase().includes('mensalidade') || 
                        e.category?.toLowerCase().includes('serviço');
        return { 
          ...e, 
          type: (isIncome ? 'income' : 'expense') as 'income' | 'expense', 
          tableName: 'agency_expenses',
          date: e.due_date || `${e.year}-${String(e.month).padStart(2, '0')}-01` 
        };
      }),
      ...filteredOtherRevenues.map(r => ({ ...r, type: 'income' as const, tableName: 'other_revenues' })),
      ...fixedClientsIncomes.filter(f => !otherRevenues.some(r => r.id === f.id)).map(f => ({ ...f, type: 'income' as const, tableName: 'other_revenues' }))
    ];

    return rawEntries.filter(e => {
      // Otimização: Filtrar por operação (Peformake vs Ellcazo)
      const entity = (e as any).entity || 'peformake';
      if (activeView !== 'all' && entity !== activeView) return false;

      const matchesSearch = !searchTerm || 
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || e.type === typeFilter;
      
      let matchesWeek = true;
      if (weekFilter !== 'all') {
        const { day } = parseSafeDate(e.date);
        const week = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        matchesWeek = week === weekFilter;
      }
      
      return matchesSearch && matchesType && matchesWeek;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredExpenses, filteredOtherRevenues, fixedClientsIncomes, searchTerm, typeFilter, weekFilter, activeView]);

  const weeklyChartData = useMemo(() => {
    const weeks = ['1', '2', '3', '4'];
    return weeks.map(week => {
      const weekEntries = combinedEntries.filter(e => {
        const { day } = parseSafeDate(e.date);
        const w = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        return w === week;
      });

      const entrada = weekEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0);
      const saida = weekEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0) + (week === '1' ? teamCost : 0);
      const lucro = entrada - saida;

      return {
        name: `S${week}`,
        fullName: `Semana ${week}`,
        entrada,
        saida,
        lucro,
      };
    });
  }, [combinedEntries, teamCost]);

  const generalAgencyExpenses = filteredExpenses
    .filter(e => !e.client_id)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
    
  const clientDirectExpenses = filteredExpenses
    .filter(e => e.client_id)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const costByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    // Add staff costs to 'equipe' only in Week 1 or if all weeks
    if (weekFilter === 'all' || weekFilter === '1') {
      categoryMap.set('equipe', (categoryMap.get('equipe') || 0) + teamCost);
    }
    
    // Add each expense to its category if it matches the week
    filteredExpenses.forEach(e => {
      let matchesWeek = true;
      if (weekFilter !== 'all') {
        const dateStr = e.due_date || (e.year && e.month ? `${e.year}-${String(e.month).padStart(2, '0')}-01` : '');
        const { day } = parseSafeDate(dateStr);
        const week = day <= 7 ? '1' : day <= 14 ? '2' : day <= 21 ? '3' : '4';
        matchesWeek = week === weekFilter;
      }

      if (matchesWeek) {
        const cat = e.category || 'outros';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + (e.amount || 0));
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value, 
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['outros'] 
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, teamCost, weekFilter]);

  const costBreakdown = [
    { name: 'Equipe', value: teamCost, color: '#FBBF24' },
    { name: 'Geral Agência', value: generalAgencyExpenses, color: '#F59E0B' },
    { name: 'Custos Diretos', value: clientDirectExpenses, color: '#EA580C' },
  ].filter(d => d.value > 0);


  const renderDashboard = () => {
    // Remove calculation for totalTCV as requested

    return (
      <div className="space-y-4">
        <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3`}>
          {[
            { label: 'Entradas (Pagas)', value: actualRevenue, color: 'text-success', icon: Check, bg: 'bg-success/10 border-success/30', isCurrency: true, hint: 'Total recebido (confirmado)' },
            { label: 'Receita Prevista', value: expectedRevenue, color: 'text-blue-600', icon: TrendingUp, bg: 'bg-blue-50 border-blue-100', isCurrency: true, hint: 'Contratos + Vendas pendentes' },
            { label: 'Custos (Pagos)', value: actualCosts, color: 'text-destructive', icon: TrendingDown, bg: 'bg-destructive/5 border-destructive/20', isCurrency: true, hint: 'Despesas confirmadas + Equipe' },
            { label: 'Fluxo de Caixa', value: netProfit, color: netProfit >= 0 ? 'text-success' : 'text-destructive', bg: netProfit >= 0 ? 'bg-success/5 border-success/10' : 'bg-destructive/5 border-destructive/10', hint: `Margem Real: ${margin.toFixed(1)}%`, isCurrency: true },
            { 
              label: 'Clientes Ativos', 
              value: activeView === 'all' 
                ? clients.length 
                : (activeView === 'ellcazo' 
                  ? clients.filter(c => getClientAudiovisualRevenue(c.id) > 0).length 
                  : clients.filter(c => (getClientRevenue(c.id) - getClientAudiovisualRevenue(c.id)) > 0).length), 
              color: 'text-primary', 
              icon: Users, 
              bg: 'bg-primary/5 border-primary/20',
              isCurrency: false,
              suffix: ' ativos',
              hint: activeView === 'all' 
                ? `${clients.filter(c => getClientAudiovisualRevenue(c.id) > 0 && (getClientRevenue(c.id) - getClientAudiovisualRevenue(c.id)) > 0).length} híbridos` 
                : undefined
            },
            ...(activeView !== 'all' ? [{ 
              label: 'Meta de Faturamento', 
              value: goalAmount, 
              color: goalAmount > 0 && goalProgress >= 100 ? 'text-success' : 'text-blue-600', 
              icon: Target, 
              bg: goalAmount > 0 && goalProgress >= 100 ? 'bg-success/5 border-success/20' : 'bg-blue-50 border-blue-100',
              isCurrency: true,
              hint: goalAmount > 0 ? `Atingido: ${goalProgress.toFixed(1)}%` : 'Clique para definir',
              onClick: () => {
                setGoalInput(String(goalAmount));
                setIsGoalDialogOpen(true);
              }
            }] : []),
          ].map(item => (
            <Card 
              key={item.label} 
              className={`${item.bg} border ${item.onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
              onClick={item.onClick}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{item.label}</p>
                  {item.icon && <item.icon className={`h-3.5 w-3.5 ${item.color}`} />}
                </div>
                <p className={`text-base font-bold ${item.color}`}>
                  {item.isCurrency ? fmt(item.value as number) : item.value}
                </p>
                {item.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{item.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tabela de Receitas */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Receita por Serviço</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="max-h-[220px] overflow-y-auto pr-1">
                  <Table>
                    <TableBody>
                      {serviceRevenueData.map(s => (
                        <TableRow key={s.name} className="hover:bg-transparent border-b border-muted/50 last:border-0">
                          <TableCell className="text-[10px] font-medium py-1.5 px-0">{s.name}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold text-success py-1.5 px-0">{fmt(s.revenue)}</TableCell>
                        </TableRow>
                      ))}
                      {serviceRevenueData.length === 0 && (
                        <TableRow><TableCell colSpan={2} className="text-center py-4 text-[10px] text-muted-foreground italic">Nenhuma receita</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-primary">Total</span>
                  <span className="text-xs font-black text-primary">{fmt(expectedRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição de Custos (Gráfico) */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Destino das Saídas (Custos)</CardTitle>
                <Wallet className="h-3 w-3 text-destructive" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex flex-col gap-4">
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={costByCategory} 
                          dataKey="value" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={50} 
                          innerRadius={30}
                          paddingAngle={2}
                        >
                          {costByCategory.map((entry, index) => <Cell key={index} fill="#ef4444" />)}
                        </Pie>
                        <Tooltip 
                          formatter={(v: number) => fmt(v)} 
                          contentStyle={{ fontSize: '10px', borderRadius: '8px' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {costByCategory.map(item => (
                      <div key={item.name} className="flex items-center gap-2 group">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-destructive" />
                        <span className="text-[10px] text-muted-foreground capitalize group-hover:text-primary transition-colors">{item.name}</span>
                        <span className="text-[10px] font-bold ml-auto">{fmt(item.value)}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-1 border-t flex justify-between text-[10px] font-bold text-destructive">
                      <span className="uppercase">Total Saídas</span>
                      <span>{fmt(expectedCosts)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rankings (Profitable & Costly) */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Performance por Cliente</CardTitle>
                <Target className="h-3 w-3 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-success mb-2 flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5" /> Lucro
                    </p>
                    <div className="space-y-1">
                      {clientProfitability.slice(0, 5).map((client) => (
                        <div key={client.name} className="flex justify-between items-center text-[9px] py-1 border-b border-muted/30 last:border-0">
                          <span className="font-medium truncate max-w-[60px]">{client.name}</span>
                          <span className="font-bold text-success">{fmt(client.profit).replace('R$', '').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-destructive mb-2 flex items-center gap-1">
                      <TrendingDown className="h-2.5 w-2.5" /> Custo
                    </p>
                    <div className="space-y-1">
                      {[...clientProfitability]
                        .filter(c => c.expenses > 0)
                        .sort((a, b) => b.expenses - a.expenses)
                        .slice(0, 5)
                        .map((client) => (
                          <div key={client.name} className="flex justify-between items-center text-[9px] py-1 border-b border-muted/30 last:border-0">
                            <span className="font-medium truncate max-w-[60px]">{client.name}</span>
                            <span className="font-bold text-destructive">{fmt(client.expenses).replace('R$', '').trim()}</span>
                          </div>
                        ))}
                      {clientProfitability.filter(c => c.expenses > 0).length === 0 && (
                        <p className="text-[8px] text-muted-foreground italic py-2">Sem custos</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
  const renderEntries = () => (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-muted/5 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight text-primary">Novo Lançamento</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Tipo</Label>
                  <Select value={newEntry.type} onValueChange={(v: any) => setNewEntry(prev => ({ ...prev, type: v, category: v === 'expense' ? 'outros' : 'serviço' }))}>
                    <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income" className="text-success font-medium">↑ Entrada</SelectItem>
                      <SelectItem value="expense" className="text-destructive font-medium">↓ Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Descrição</Label>
                  <Input 
                    placeholder="Descrição" 
                    value={newEntry.description} 
                    onChange={e => {
                      const desc = e.target.value;
                      const isMensalidade = desc.toLowerCase().includes('mensalidade');
                      setNewEntry(prev => ({ 
                        ...prev, 
                        description: desc,
                        type: isMensalidade ? 'income' : prev.type,
                        category: isMensalidade ? 'serviço' : prev.category
                      }));
                    }} 
                    className="h-9 text-xs bg-background" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Valor (R$)</Label>
                  <Input type="number" placeholder="0,00" value={newEntry.amount} onChange={e => setNewEntry(prev => ({ ...prev, amount: e.target.value }))} className="h-9 text-xs font-bold bg-background" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Cliente</Label>
                  <Select value={newEntry.client_id || "none"} onValueChange={v => setNewEntry(prev => ({ ...prev, client_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs italic text-muted-foreground">Nenhum</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showExtraFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 pt-2 border-t border-dashed">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Operação</Label>
                    <Select value={newEntry.entity} onValueChange={(v: any) => setNewEntry(prev => ({ ...prev, entity: v }))}>
                      <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peformake">Peformake</SelectItem>
                        <SelectItem value="ellcazo">Ellcazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Data</Label>
                    <Input type="date" value={newEntry.date} onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))} className="h-9 text-xs bg-background" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Categoria</Label>
                    <Select value={newEntry.category} onValueChange={v => setNewEntry(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger className="h-9 text-xs bg-background capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize text-xs">{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Recorrência</Label>
                    <Select value={newEntry.is_fixed ? 'fixed' : 'variable'} onValueChange={(v) => setNewEntry(prev => ({ ...prev, is_fixed: v === 'fixed' }))}>
                      <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="variable" className="text-xs">Avulso</SelectItem>
                        <SelectItem value="fixed" className="text-xs">Fixo (Mensal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] text-muted-foreground h-8"
                  onClick={() => setShowExtraFields(!showExtraFields)}
                >
                  {showExtraFields ? 'Ver menos campos' : 'Ver mais campos (Data, Categoria...)'}
                </Button>
                <Button 
                  className="flex-1 h-9 gap-2 font-bold shadow-sm" 
                  onClick={() => addEntryMutation.mutate()} 
                  disabled={!newEntry.description || !newEntry.amount || addEntryMutation.isPending}
                >
                  {addEntryMutation.isPending ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {addEntryMutation.isPending ? 'Registrando...' : 'Registrar Lançamento'}
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-semibold">Fluxo de Caixa Detalhado</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-success bg-success/5 border-success/20 h-5 text-[9px] uppercase px-1.5">{fmt(expectedRevenue)} Entrada</Badge>
              <Badge variant="outline" className="text-destructive bg-destructive/5 border-destructive/20 h-5 text-[9px] uppercase px-1.5">{fmt(expectedCosts)} Saída</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select value={weekFilter} onValueChange={(v: any) => setWeekFilter(v)}>
              <SelectTrigger className="h-8 w-[140px] text-[10px] bg-background">
                <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Visualização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Mês Inteiro</SelectItem>
                <SelectItem value="1" className="text-xs">1ª Semana (1-7)</SelectItem>
                <SelectItem value="2" className="text-xs">2ª Semana (8-14)</SelectItem>
                <SelectItem value="3" className="text-xs">3ª Semana (15-21)</SelectItem>
                <SelectItem value="4" className="text-xs">4ª Semana (22-31)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="h-8 text-[10px] w-32">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os Tipos</SelectItem>
                <SelectItem value="income" className="text-xs text-success">Apenas Entradas</SelectItem>
                <SelectItem value="expense" className="text-xs text-destructive">Apenas Saídas</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 md:w-56">
              <Input placeholder="Filtrar lançamentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 text-xs pl-8" />
              <History className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => {
              const csv = combinedEntries.map(e => `${e.date},${e.type},${(e as any).entity || 'peformake'},${e.description},${e.amount},${e.payment_status}`).join('\n');
              const blob = new Blob([`Data,Tipo,Operação,Descrição,Valor,Status\n${csv}`], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `financeiro-${filterMonth}-${filterYear}.csv`;
              a.click();
            }}>Exportar CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-0">
          <div className="h-[200px] w-full mb-6 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="entrada" name="Entrada" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="saida" name="Saída" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="lucro" name="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto -mx-4 border-t">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold px-4 h-9">Data</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-9">Operação</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-9">Categoria</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-9">Descrição</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-9">Cliente</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold h-9">Valor</TableHead>
                  <TableHead className="text-center text-[10px] uppercase font-bold h-9">Recorrência</TableHead>
                  <TableHead className="text-center text-[10px] uppercase font-bold h-9">Status</TableHead>
                  <TableHead className="w-10 h-9"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs italic">Nenhum lançamento no período</TableCell></TableRow>
                ) : combinedEntries.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                    <TableCell className="text-[10px] px-4 font-mono">
                      {editingCell?.id === e.id && editingCell.field === 'date' ? (
                        <Input 
                          type="date"
                          value={editValue} 
                          onChange={(v) => setEditValue(v.target.value)}
                          onBlur={() => saveCellEdit(e)}
                          onKeyDown={(k) => k.key === 'Enter' && saveCellEdit(e)}
                          className="h-7 text-xs py-0 px-2 w-28"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:underline"
                          onClick={() => handleCellEdit(e.id, 'date', e.date, e.type)}
                        >
                          {(() => {
                            const { day, month, year } = parseSafeDate(e.date);
                            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                          })()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === e.id && editingCell.field === 'entity' ? (
                        <Select 
                          value={editValue} 
                          onValueChange={(v) => { setEditValue(v); setTimeout(() => saveCellEdit(e), 0); }}
                          onOpenChange={(open) => !open && setEditingCell(null)}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="peformake">Peformake</SelectItem>
                            <SelectItem value="ellcazo">Ellcazo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] uppercase h-4 px-1 cursor-pointer ${(e as any).entity === 'ellcazo' ? 'border-purple-200 text-purple-600 bg-purple-50' : 'border-blue-200 text-blue-600 bg-blue-50'}`}
                          onClick={() => handleCellEdit(e.id, 'entity', (e as any).entity || 'peformake', e.type)}
                        >
                          {(e as any).entity || 'peformake'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === e.id && editingCell.field === 'category' ? (
                        <Select 
                          value={editValue} 
                          onValueChange={(v) => { setEditValue(v); setTimeout(() => saveCellEdit(e), 0); }}
                          onOpenChange={(open) => !open && setEditingCell(null)}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize text-[10px]">{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span 
                          className="text-[10px] text-muted-foreground uppercase cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleCellEdit(e.id, 'category', e.category || 'outros', e.type)}
                        >
                          {e.category || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        {e.type === 'income' ? <ArrowUpRight className="h-3 w-3 text-success shrink-0" /> : <ArrowDownRight className="h-3 w-3 text-destructive shrink-0" />}
                        {editingCell?.id === e.id && editingCell.field === 'description' ? (
                          <Input 
                            value={editValue} 
                            onChange={(v) => setEditValue(v.target.value)}
                            onBlur={() => saveCellEdit(e)}
                            onKeyDown={(k) => k.key === 'Enter' && saveCellEdit(e)}
                            className="h-7 text-xs py-0 px-2 w-full"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="font-medium cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleCellEdit(e.id, 'description', e.description || '', e.type)}
                          >
                            {e.description || 'Lançamento'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {editingCell?.id === e.id && editingCell.field === 'client_id' ? (
                        <Select 
                          value={editValue} 
                          onValueChange={(v) => { setEditValue(v); setTimeout(() => saveCellEdit(e), 0); }}
                          onOpenChange={(open) => !open && setEditingCell(null)}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-[10px] italic">Nenhum</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px]">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span 
                          className="cursor-pointer hover:text-primary transition-colors truncate max-w-[100px] block"
                          onClick={() => handleCellEdit(e.id, 'client_id', e.client_id || 'none', e.type)}
                        >
                          {(e as any).clients?.name || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-mono font-bold ${e.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {editingCell?.id === e.id && editingCell.field === 'amount' ? (
                        <div className="flex items-center justify-end">
                          <span className="mr-1">{e.type === 'income' ? '+' : '-'}</span>
                          <Input 
                            type="number"
                            value={editValue} 
                            onChange={(v) => setEditValue(v.target.value)}
                            onBlur={() => saveCellEdit(e)}
                            onKeyDown={(k) => k.key === 'Enter' && saveCellEdit(e)}
                            className="h-7 text-xs py-0 px-2 w-20 text-right"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span 
                          className="cursor-pointer hover:underline"
                          onClick={() => handleCellEdit(e.id, 'amount', e.amount, e.type)}
                        >
                          {e.type === 'income' ? '+' : '-'} {fmt(e.amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingCell?.id === e.id && editingCell.field === 'is_fixed' ? (
                        <Select 
                          value={editValue} 
                          onValueChange={(v) => { setEditValue(v); setTimeout(() => saveCellEdit(e), 0); }}
                          onOpenChange={(open) => !open && setEditingCell(null)}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false" className="text-[10px]">Avulso</SelectItem>
                            <SelectItem value="true" className="text-[10px]">Fixo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] h-4 px-1.5 cursor-pointer ${(e as any).is_fixed ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}
                          onClick={() => handleCellEdit(e.id, 'is_fixed', String(!!(e as any).is_fixed), e.type)}
                        >
                          {(e as any).is_fixed ? 'Fixo' : 'Avulso'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={e.payment_status === 'paid' ? 'outline' : 'secondary'} 
                        className={`text-[9px] h-4 px-1.5 capitalize cursor-pointer transition-all hover:scale-105 ${e.payment_status === 'paid' ? 'border-success/30 text-success bg-success/10' : 'bg-muted text-muted-foreground'}`}
                        onClick={() => {
                          const nextStatus = e.payment_status === 'paid' ? 'pending' : 'paid';
                          // For virtual entries, toggle means confirming/inserting
                          if ((e as any).is_virtual) {
                            const confirmToast = toast.loading(`Confirmando ${nextStatus === 'paid' ? 'pagamento' : 'pendência'} de ${e.description}...`);
                            const isIncome = e.type === 'income';
                            const table = isIncome ? 'other_revenues' : 'agency_expenses';
                            const payload: any = {
                              description: e.description,
                              amount: e.amount,
                              entity: (e as any).entity,
                              category: e.category || (isIncome ? 'serviço' : 'outros'),
                              client_id: (e as any).client_id,
                              payment_status: nextStatus,
                              is_fixed: true
                            };
                            
                            if (!isIncome) {
                              payload.due_date = e.date;
                              const { year, month } = parseSafeDate(e.date);
                              payload.year = year;
                              payload.month = month;
                            } else {
                              payload.date = e.date;
                            }

                            supabase.from(table as any).insert(payload).then(({ error }) => {
                              toast.dismiss(confirmToast);
                              if (error) {
                                console.error('Error confirming virtual entry:', error);
                                toast.error('Erro ao confirmar');
                              } else {
                                queryClient.invalidateQueries();
                                toast.success(`Status atualizado para ${nextStatus === 'paid' ? 'Pago' : 'Pendente'}`);
                              }
                            });
                          } else {
                            // Real entry, just update
                            updateEntryMutation.mutate({ 
                              ...e, 
                              payment_status: nextStatus 
                            });
                          }
                        }}
                      >
                        {e.payment_status === 'paid' ? (
                          <div className="flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" />
                            <span>Pago</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>Pendente</span>
                          </div>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(e as any).is_virtual ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-success hover:bg-success/10 transition-transform hover:scale-110" 
                          onClick={() => {
                            const confirmToast = toast.loading(`Confirmando pagamento de ${e.description}...`);
                            const isIncome = e.type === 'income';
                            const table = isIncome ? 'other_revenues' : 'agency_expenses';
                            const payload: any = {
                              description: e.description,
                              amount: e.amount,
                              entity: (e as any).entity,
                              category: e.category || (isIncome ? 'serviço' : 'outros'),
                              client_id: (e as any).client_id,
                              payment_status: 'paid',
                              is_fixed: true
                            };
                            
                            if (!isIncome) {
                              payload.due_date = e.date;
                              const { year, month } = parseSafeDate(e.date);
                              payload.year = year;
                              payload.month = month;
                            } else {
                              payload.date = e.date;
                            }

                            supabase.from(table as any).insert(payload).then(({ error }) => {
                              toast.dismiss(confirmToast);
                              if (error) toast.error('Erro ao confirmar');
                              else {
                                queryClient.invalidateQueries();
                                toast.success('Lançamento confirmado!');
                              }
                            });
                          }}
                          title="Confirmar Lançamento"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive" 
                          onClick={() => {
                            if (window.confirm('Excluir este lançamento?')) {
                              deleteEntryMutation.mutate({ id: e.id, type: e.type, tableName: (e as any).tableName });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTeam = () => (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Custos de Equipe — {activeView === 'all' ? 'Geral' : activeView}</CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase">Defina o custo mensal e a operação de cada membro</p>
        </div>
        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">{fmt(teamCost)} Total</Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold h-9">Membro</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-9">Cargo</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-9">Operação</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold h-9">Custo Mensal</TableHead>
              <TableHead className="w-10 h-9"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">Nenhum membro nesta operação</TableCell></TableRow>
            ) : filteredStaff.map(s => (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium py-3">{s.full_name}</TableCell>
                <TableCell className="py-3"><Badge variant="outline" className="text-[10px] capitalize">{s.role}</Badge></TableCell>
                <TableCell className="py-3">
                  {editingStaff === s.id ? (
                    <Select value={(s as any).entity || 'peformake'} onValueChange={async (val) => {
                      const { error } = await supabase.from('staff_members').update({ entity: val }).eq('id', s.id);
                      if (!error) { queryClient.invalidateQueries({ queryKey: ['fin-staff'] }); toast.success('Operação atualizada'); }
                    }}>
                      <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peformake">Peformake</SelectItem>
                        <SelectItem value="ellcazo">Ellcazo</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-[9px] uppercase h-4 px-1 ${(s as any).entity === 'ellcazo' ? 'border-purple-200 text-purple-600 bg-purple-50' : 'border-blue-200 text-blue-600 bg-blue-50'}`}>{(s as any).entity || 'peformake'}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right py-3">
                  {editingStaff === s.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-muted-foreground">R$</span>
                      <Input className="h-7 text-xs w-24 text-right" value={editCost} onChange={(e) => setEditCost(e.target.value)} autoFocus />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-warning">{fmt(s.monthly_cost || 0)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-3">
                  {editingStaff === s.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => updateStaffCostMutation.mutate(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingStaff(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingStaff(s.id); setEditCost(String(s.monthly_cost || 0)); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-muted/20 font-bold">
              <TableCell colSpan={3} className="text-xs py-3 px-4 uppercase text-muted-foreground">Total da Operação</TableCell>
              <TableCell className="text-right text-sm text-warning py-3">{fmt(teamCost)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="bg-card p-3 rounded-xl border shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex items-center gap-1 bg-muted/30 p-1 rounded-lg border ${isEllcazoOnlyView ? 'hidden' : ''}`}>
              <Button
                variant={activeView === 'all' ? 'default' : 'ghost'}
                size="sm" 
                className={`h-8 text-[10px] font-bold gap-1.5 px-4 rounded-md ${activeView === 'all' ? 'shadow-sm' : 'text-muted-foreground'}`}
                onClick={() => { setActiveView('all'); setActiveTab('dashboard'); }}
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> GERAL
              </Button>
              <Button 
                variant={activeView === 'peformake' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-8 text-[10px] font-bold gap-1.5 px-4 rounded-md ${activeView === 'peformake' ? 'bg-primary hover:bg-primary/90' : 'text-muted-foreground'}`}
                onClick={() => { setActiveView('peformake'); setActiveTab('dashboard'); }}
              >
                <Building2 className="h-3.5 w-3.5" /> PEFORMAKE
              </Button>
              <Button 
                variant={activeView === 'ellcazo' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-8 text-[10px] font-bold gap-1.5 px-4 rounded-md ${activeView === 'ellcazo' ? 'bg-primary hover:bg-primary/90' : 'text-muted-foreground'}`}
                onClick={() => { setActiveView('ellcazo'); setActiveTab('dashboard'); }}
              >
                <Film className="h-3.5 w-3.5" /> ELLCAZO
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTH_LABELS.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
                <SelectTrigger className="w-20 h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
              </Select>
              <FinancialReportDialog trigger={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px] font-semibold"><FileText className="h-3.5 w-3.5" /> Relatório</Button>} />
            </div>
          </div>

          <div className="pt-2 border-t border-dashed">
            <TabsList className="flex gap-1.5 bg-transparent p-0 h-auto justify-start">
              <TabsTrigger value="dashboard" className="text-[10px] font-bold px-4 py-1.5 rounded-md border border-input bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all shadow-sm uppercase tracking-wider">
                Resumo {activeView === 'all' ? 'Geral' : (activeView === 'peformake' ? 'Peformake' : 'Ellcazo')}
              </TabsTrigger>
              {activeView !== 'all' && (
                <>
                  <TabsTrigger value="entries" className="text-[10px] font-bold px-4 py-1.5 rounded-md border border-input bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all shadow-sm uppercase tracking-wider">
                    Lançamentos
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-[10px] font-bold px-4 py-1.5 rounded-md border border-input bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all shadow-sm uppercase tracking-wider">
                    Equipe
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="config" className="text-[10px] font-bold px-4 py-1.5 rounded-md border border-input bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all shadow-sm uppercase tracking-wider ml-auto">
                Config
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          {renderDashboard()}
        </TabsContent>
        
        
        <TabsContent value="entries" className="space-y-4">
          {renderEntries()}
        </TabsContent>
        <TabsContent value="team" className="space-y-4">
          {renderTeam()}
        </TabsContent>
        <TabsContent value="config" className="space-y-4">
          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5" /> Painel de Administração e Reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAdmin ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-muted/20 rounded-lg border border-dashed">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="font-bold">Acesso Restrito</p>
                    <p className="text-xs text-muted-foreground">Apenas administradores podem realizar o reset de dados financeiros.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Zerar Lançamentos Financeiros</p>
                      <p className="text-xs text-muted-foreground">Apaga todos os registros de Receitas Avulsas, Despesas da Agência e Custos de Clientes do período atual e histórico. Esta ação NÃO afeta contratos de clientes.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2 font-bold">
                          <Trash2 className="h-4 w-4" /> Zerar Lançamentos
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá apagar todos os lançamentos financeiros históricos (entradas e saídas). Os dados de clientes e serviços contratados serão mantidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => resetDataMutation.mutate(false)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sim, Zerar Lançamentos
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Reset Completo (Faturamento Zero)</p>
                      <p className="text-xs text-muted-foreground">Apaga lançamentos E também remove todos os serviços (contratos) vinculados aos clientes. Use para começar a gestão do zero.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2 font-bold">
                          <Trash2 className="h-4 w-4" /> Reset Geral do Sistema
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Completo do Sistema Financeiro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é irreversível. Todos os lançamentos e contratos de serviços serão apagados de todos os clientes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => resetDataMutation.mutate(true)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sim, Resetar Tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
          {editingEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Descrição</Label><Input id="description" value={editingEntry.description} onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="amount" className="text-right">Valor</Label><Input id="amount" type="number" value={editingEntry.amount} onChange={(e) => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="date" className="text-right">Data</Label><Input id="date" type="date" value={editingEntry.date} onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="category" className="text-right">Categoria</Label><Select value={editingEntry.category} onValueChange={(v) => setEditingEntry({ ...editingEntry, category: v })}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="entity" className="text-right">Operação</Label><Select value={editingEntry.entity} onValueChange={(v) => setEditingEntry({ ...editingEntry, entity: v })}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="peformake">Peformake</SelectItem><SelectItem value="ellcazo">Ellcazo</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="recurrence" className="text-right">Recorrência</Label><Select value={editingEntry.is_fixed ? 'fixed' : 'variable'} onValueChange={(v) => setEditingEntry({ ...editingEntry, is_fixed: v === 'fixed' })}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="variable">Avulso</SelectItem><SelectItem value="fixed">Fixo/Recorrente</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="status" className="text-right">Status</Label><Select value={editingEntry.payment_status} onValueChange={(v) => setEditingEntry({ ...editingEntry, payment_status: v })}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Pago</SelectItem><SelectItem value="pending">Pendente</SelectItem></SelectContent></Select></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditingEntry(null)}>Cancelar</Button><Button onClick={() => updateEntryMutation.mutate(editingEntry)}>Salvar Alterações</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Meta de Faturamento — {MONTH_LABELS[filterMonth - 1]}/{filterYear}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal_amount">Valor da Meta (R$)</Label>
              <Input 
                id="goal_amount" 
                type="number" 
                value={goalInput} 
                onChange={(e) => setGoalInput(e.target.value)} 
                placeholder="0,00"
                className="text-lg font-bold"
              />
              <p className="text-xs text-muted-foreground italic">
                A meta definida será aplicada apenas para a operação "{activeView === 'all' ? 'Geral' : activeView}" neste período.
              </p>
            </div>
            
            {goalAmount > 0 && (
              <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progresso Atual</span>
                  <span>{goalProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${goalProgress >= 100 ? 'bg-success' : 'bg-primary'}`} 
                    style={{ width: `${Math.min(goalProgress, 100)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{fmt(expectedRevenue)} atingidos</span>
                  <span>Meta: {fmt(goalAmount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveGoalMutation.mutate(parseFloat(goalInput) || 0)}>Salvar Meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(FinancialPanel);
