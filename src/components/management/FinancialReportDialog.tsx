import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildStandardPdfHtml, exportHtmlToPdf } from '@/lib/pdfUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Printer, Loader2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { format, differenceInMonths, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FinancialReportDialogProps {
  trigger?: React.ReactNode;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const AUDIOVISUAL_KEYWORDS = [
  "audiovisual", "video", "reels", "filmagem", "producao-video", "producao_audiovisual",
  "edicao", "edição", "drone", "captacao", "captação", "fotografia", "fotográfia"
];

const getMonthsInRange = (start: string, end: string) => {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const diff = differenceInMonths(addDays(endDate, 1), startDate);
  return Math.max(1, diff || 1);
};

const FinancialReportDialog = ({ trigger }: FinancialReportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operation, setOperation] = useState<'all' | 'peformake' | 'ellcazo'>('all');
  const [includeEntries, setIncludeEntries] = useState(true);
  const [includeTeam, setIncludeTeam] = useState(true);
  const [includeClients, setIncludeClients] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const months = getMonthsInRange(startDate, endDate);
      const startD = parseISO(startDate);
      const endD = parseISO(endDate);

      // Fetch all necessary data
      const { data: expenses, error: expError } = await supabase.from('agency_expenses').select('*, clients(name)');
      const { data: revenues, error: revError } = await supabase.from('other_revenues').select('*, clients(name)');
      const { data: clients, error: clientError } = await supabase.from('clients').select('*').eq('is_active', true);
      const { data: staff, error: staffError } = await supabase.from('staff_members').select('*').eq('is_active', true);
      const { data: clientServices, error: serviceError } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      const { data: clientExpenses, error: clExpError } = await supabase.from('client_expenses').select('*, clients(name)');
      const { data: goals, error: goalsError } = await supabase.from('financial_goals').select('*');

      if (expError || revError || clientError || staffError || serviceError || clExpError || goalsError) {
        throw new Error('Erro ao buscar dados para o relatório');
      }

      const isAVService = (item: any) => {
        const slug = item.services?.slug || "";
        const name = (item.services?.name || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        return AUDIOVISUAL_KEYWORDS.some(k => slug.includes(k) || name.includes(k) || category.includes(k));
      };

      const getClientEntity = (clientId: string) => {
        const services = (clientServices || []).filter(s => s.client_id === clientId);
        if (services.length === 0) return 'peformake';
        const hasAV = services.some(s => isAVService(s));
        const hasNonAV = services.some(s => !isAVService(s));
        if (hasAV && !hasNonAV) return 'ellcazo';
        return 'peformake';
      };

      const getClientContractRevenue = (clientId: string, op: 'all' | 'peformake' | 'ellcazo') => {
        const services = (clientServices || []).filter(cs => cs.client_id === clientId);
        return services.reduce((sum, s) => {
          const isAV = isAVService(s);
          if (op === 'peformake' && isAV) return sum;
          if (op === 'ellcazo' && !isAV) return sum;
          return sum + (s.price || 0) * (s.quantity || 1);
        }, 0);
      };

      const getClientLegacyRevenue = (client: any, op: 'all' | 'peformake' | 'ellcazo') => {
        if (op === 'ellcazo') return 0; // Legacy is usually Peformake
        return (client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0) +
               (client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0);
      };

      const filterByDateRange = (date: string | Date) => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        const normalizedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const normalizedStart = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
        const normalizedEnd = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate());
        return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
      };

      const calculateOperationData = (op: 'peformake' | 'ellcazo') => {
        const opExpenses = typeFilter === 'income' ? [] : (expenses || []).filter(e => {
          if ((e.entity || 'peformake') !== op) return false;
          const date = e.due_date ? parseISO(e.due_date) : new Date(e.year, e.month - 1, 1);
          return filterByDateRange(date);
        });

        const opOtherRevenues = typeFilter === 'expense' ? [] : (revenues || []).filter(r => {
          if ((r.entity || 'peformake') !== op) return false;
          return filterByDateRange(r.date);
        });

        const opClientExpenses = typeFilter === 'income' ? [] : (clientExpenses || []).filter(ce => {
          const client = clients?.find(c => c.id === ce.client_id);
          if (!client) return false;
          // Check if this client expense belongs to this operation
          // We use the same logic as the dashboard: if the client has AV services, some expenses might be Ellcazo
          const isAV = getClientContractRevenue(client.id, 'ellcazo') > 0;
          const entity = isAV ? 'ellcazo' : 'peformake';
          if (entity !== op) return false;

          const date = new Date(ce.year, ce.month - 1, 1);
          return filterByDateRange(date);
        });

        const opStaffCost = typeFilter === 'income' ? 0 : (staff || [])
          .filter(s => (s.entity || 'peformake') === op)
          .reduce((sum, s) => sum + (s.monthly_cost || 0), 0) * months;

        const opRecurringRevenue = typeFilter === 'expense' ? 0 : (clients || [])
          .reduce((sum, c) => {
            const revenue = getClientContractRevenue(c.id, op) + getClientLegacyRevenue(c, op);
            return sum + revenue;
          }, 0) * months;

        const periodicExp = opExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const clExp = opClientExpenses.reduce((sum, ce) => sum + (ce.amount || 0), 0);
        const otherRev = opOtherRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

        const totalRev = opRecurringRevenue + otherRev;
        const totalExp = opStaffCost + periodicExp + clExp;
        
        const opGoals = (goals || []).filter(g => 
          g.entity === op && 
          g.year === startD.getFullYear() && 
          g.month === startD.getMonth() + 1
        );
        const goalAmount = opGoals[0]?.goal_amount || 0;

        return {
          recurringRevenue: opRecurringRevenue,
          otherRevenue: otherRev,
          totalRevenue: totalRev,
          staffCost: opStaffCost,
          periodicExpenses: periodicExp,
          clientExpenses: clExp,
          totalExpenses: totalExp,
          netProfit: totalRev - totalExp,
          goalAmount,
          expenses: opExpenses,
          revenues: opOtherRevenues,
          clExpenses: opClientExpenses,
          serviceBreakdown: Array.from([
            ...(clientServices || []).filter(cs => {
              const isAV = isAVService(cs);
              return op === 'ellcazo' ? isAV : !isAV;
            }),
            ...opOtherRevenues.map(r => ({ ...r, is_other: true }))
          ]
            .reduce((map, item) => {
              const name = (item as any).services?.name || (item as any).category || 'Outro';
              let mappedName = name;
              if (op === 'ellcazo') {
                const lowerName = name.toLowerCase();
                const matchedKeyword = AUDIOVISUAL_KEYWORDS.find(k => lowerName.includes(k.replace('_', ' ')));
                if (matchedKeyword) {
                  if (matchedKeyword.includes('edicao')) mappedName = 'Edição';
                  else if (matchedKeyword.includes('drone')) mappedName = 'Drone';
                  else if (matchedKeyword.includes('captacao')) mappedName = 'Captação';
                  else if (matchedKeyword.includes('fotografia')) mappedName = 'Fotografia';
                }
              }

              const anyItem = item as any;
              const rev = anyItem.is_other ? (anyItem.amount || 0) : ((anyItem.price || 0) * (anyItem.quantity || 1) * months);
              map.set(mappedName, (map.get(mappedName) || 0) + rev);
              return map;
            }, new Map<string, number>()).entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        };
      };

      const peformakeData = calculateOperationData('peformake');
      const ellcazoData = calculateOperationData('ellcazo');

      let reportData;
      if (operation === 'peformake') {
        reportData = peformakeData;
      } else if (operation === 'ellcazo') {
        reportData = ellcazoData;
      } else {
        reportData = {
          recurringRevenue: peformakeData.recurringRevenue + ellcazoData.recurringRevenue,
          otherRevenue: peformakeData.otherRevenue + ellcazoData.otherRevenue,
          totalRevenue: peformakeData.totalRevenue + ellcazoData.totalRevenue,
          staffCost: peformakeData.staffCost + ellcazoData.staffCost,
          periodicExpenses: peformakeData.periodicExpenses + ellcazoData.periodicExpenses,
          clientExpenses: peformakeData.clientExpenses + ellcazoData.clientExpenses,
          totalExpenses: peformakeData.totalExpenses + ellcazoData.totalExpenses,
          netProfit: peformakeData.netProfit + ellcazoData.netProfit,
          goalAmount: peformakeData.goalAmount + ellcazoData.goalAmount,
          expenses: [...peformakeData.expenses, ...ellcazoData.expenses],
          revenues: [...peformakeData.revenues, ...ellcazoData.revenues],
          clExpenses: [...peformakeData.clExpenses, ...ellcazoData.clExpenses],
          serviceBreakdown: [...peformakeData.serviceBreakdown, ...ellcazoData.serviceBreakdown].reduce((acc: any[], curr) => {
            const existing = acc.find(a => a.name === curr.name);
            if (existing) existing.value += curr.value;
            else acc.push({ ...curr });
            return acc;
          }, []).sort((a, b) => b.value - a.value)
        };
      }

      // Calculate Rankings for Report
      const clientProfitability = (clients || []).map(c => {
        const recurring = (getClientContractRevenue(c.id, operation) + getClientLegacyRevenue(c, operation)) * months;
        
        const extra = (revenues || [])
          .filter(r => r.client_id === c.id && filterByDateRange(r.date) && (operation === 'all' || (r.entity || 'peformake') === operation))
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const directExp = (expenses || [])
          .filter(e => {
            const date = e.due_date ? parseISO(e.due_date) : new Date(e.year, e.month - 1, 1);
            return e.client_id === c.id && filterByDateRange(date) && (operation === 'all' || (e.entity || 'peformake') === operation);
          })
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const totalClientRev = recurring + extra;
        const profit = totalClientRev - directExp;

        return { name: c.name, revenue: totalClientRev, expenses: directExp, profit };
      }).filter((c): c is any => c !== null && (c.revenue > 0 || c.expenses > 0));

      const topProfitable = [...clientProfitability].sort((a, b) => b.profit - a.profit).slice(0, 5);
      const topCostly = [...clientProfitability].sort((a, b) => b.expenses - a.expenses).slice(0, 5);

      const totalRevenues = reportData.totalRevenue;
      const totalExpenses = reportData.totalExpenses;
      const netProfit = reportData.netProfit;
      const margin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0;
      const goalProgress = reportData.goalAmount > 0 ? (totalRevenues / reportData.goalAmount) * 100 : 0;

      const reportTitle = `Relatório Financeiro - ${operation === 'all' ? 'VISÃO CONSOLIDADA' : operation.toUpperCase()}`;
      const subtitle = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} até ${format(parseISO(endDate), 'dd/MM/yyyy')} (${months} ${months === 1 ? 'mês' : 'meses'})`;

      const bodyHtml = `
        <div style="font-family: sans-serif; color: #333;">
          <div style="display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #166534; font-weight: bold;">Total Receitas</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #15803d;">${fmt(totalRevenues)}</p>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #991b1b; font-weight: bold;">Total Despesas</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #b91c1c;">${fmt(totalExpenses)}</p>
            </div>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #075985; font-weight: bold;">Lucro Líquido</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">${fmt(netProfit)}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">RESUMO DE DESEMPENHO</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <p style="margin: 0; font-size: 13px;">Margem de Lucro: <strong>${margin.toFixed(1)}%</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">Receita Recorrente: <strong>${fmt(reportData.recurringRevenue)}</strong></p>
              </div>
              <div>
                <p style="margin: 0; font-size: 13px;">Receita Avulsa: <strong>${fmt(reportData.otherRevenue)}</strong></p>
                ${reportData.goalAmount > 0 ? `<p style="margin: 5px 0 0 0; font-size: 13px;">Meta (${fmt(reportData.goalAmount)}): <strong>${goalProgress.toFixed(1)}%</strong></p>` : ''}
              </div>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; font-style: italic;">* Receitas Recorrentes são projeções baseadas em contratos ativos para o período de ${months} ${months === 1 ? 'mês' : 'meses'}.</p>
          </div>

          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div>
              <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 4px;">TOP 5 CLIENTES LUCRATIVOS</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                ${topProfitable.map(c => `
                  <tr>
                    <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">${c.name}</td>
                    <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: #059669;">${fmt(c.profit)}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            <div>
              <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold; color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 4px;">TOP 5 CLIENTES COM MAIOR CUSTO</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                ${topCostly.map(c => `
                  <tr>
                    <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">${c.name}</td>
                    <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: #dc2626;">${fmt(c.expenses)}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>

          <p style="margin: 30px 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 2px solid #6366f1; padding-bottom: 4px;">RECEITA POR TIPO DE SERVIÇO</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="text-align: left; padding: 8px;">Serviço</th>
                <th style="text-align: right; padding: 8px;">Receita</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.serviceBreakdown.map(s => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${s.name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">${fmt(s.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${includeEntries ? `
            <p style="margin: 30px 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 2px solid #6366f1; padding-bottom: 4px;">EXTRATO DE LANÇAMENTOS</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 30px;">
              <thead style="background: #f8fafc;">
                <tr>
                  <th style="text-align: left; padding: 6px;">Data</th>
                  <th style="text-align: left; padding: 6px;">Descrição</th>
                  <th style="text-align: left; padding: 6px;">Categoria</th>
                  <th style="text-align: right; padding: 6px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ...reportData.revenues.map(r => ({ date: r.date, desc: r.description, cat: r.category || 'Receita', val: r.amount, type: 'in', client: r.clients?.name })),
                  ...reportData.expenses.map(e => ({ date: e.due_date || `${e.year}-${e.month}-01`, desc: e.description, cat: e.category || 'Despesa', val: e.amount, type: 'out', client: e.clients?.name })),
                  ...reportData.clExpenses.map(ce => ({ date: `${ce.year}-${ce.month}-01`, desc: `Custo Projeto`, cat: 'Custo Direto', val: ce.amount, type: 'out', client: ce.clients?.name }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 .slice(0, 50)
                 .map(item => `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${format(parseISO(item.date), 'dd/MM/yy')}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${item.desc}${item.client ? ` <span style="color: #64748b; font-size: 9px;">(${item.client})</span>` : ''}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${item.cat}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: ${item.type === 'in' ? '#059669' : '#dc2626'};">${item.type === 'in' ? '+' : '-'} ${fmt(item.val)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${includeTeam ? `
            <p style="margin: 30px 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 2px solid #6366f1; padding-bottom: 4px;">CUSTOS DE EQUIPE</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
              <thead style="background: #f8fafc;">
                <tr>
                  <th style="text-align: left; padding: 8px;">Colaborador</th>
                  <th style="text-align: left; padding: 8px;">Operação</th>
                  <th style="text-align: right; padding: 8px;">Custo Período</th>
                </tr>
              </thead>
              <tbody>
                ${(staff || []).filter(s => operation === 'all' || (s.entity || 'peformake') === operation).map(s => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${s.full_name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase;">${s.entity || 'peformake'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">${fmt((s.monthly_cost || 0) * months)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              💡 INSIGHTS E ANÁLISE DE DECISÃO
            </p>
            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
              <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                • <strong>Eficiência de Clientes:</strong> ${topProfitable.length > 0 ? `O cliente <strong>${topProfitable[0].name}</strong> é o mais rentável. Focar em estratégias de retenção para este perfil.` : 'Dados insuficientes para análise de rentabilidade.'}
              </div>
              <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                • <strong>Ponto de Atenção:</strong> ${topCostly.length > 0 && topCostly[0].expenses > (totalRevenues * 0.1) ? `O custo operacional com <strong>${topCostly[0].name}</strong> representa uma fatia significativa da receita. Avaliar otimização de processos.` : 'Os custos por cliente estão dentro de margens saudáveis.'}
              </div>
              <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                • <strong>Saúde Financeira:</strong> ${margin > 30 ? 'Margem de lucro excelente (>30%). Momento propício para investimentos em escala.' : margin > 15 ? 'Margem de lucro saudável. Foco em manter o controle de custos fixos.' : 'Margem de lucro abaixo do ideal (<15%). Recomenda-se revisão de precificação ou redução de despesas operacionais.'}
              </div>
              <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                • <strong>Diversificação:</strong> ${reportData.serviceBreakdown.length > 1 ? `Sua receita está distribuída entre ${reportData.serviceBreakdown.length} tipos de serviços, reduzindo a dependência de um único produto.` : 'Alta concentração de receita em um único tipo de serviço. Considere diversificar o portfólio.'}
              </div>
            </div>
          </div>
        </div>
      `;

      const htmlContent = buildStandardPdfHtml({
        title: reportTitle,
        subtitle,
        body: bodyHtml
      });

      await exportHtmlToPdf(htmlContent, `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast.success('Relatório gerado e baixado!');
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Relatório Personalizado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Configurar Relatório Financeiro
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas (Consolidado Geral)</SelectItem>
                  <SelectItem value="peformake">Peformake</SelectItem>
                  <SelectItem value="ellcazo">Ellcazo (Audiovisual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Movimentações</SelectItem>
                  <SelectItem value="income">Apenas Entradas (Receitas)</SelectItem>
                  <SelectItem value="expense">Apenas Saídas (Despesas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Conteúdo do Relatório</Label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border/50">
                <Checkbox 
                  id="entries" 
                  checked={includeEntries} 
                  onCheckedChange={(checked) => setIncludeEntries(checked === true)} 
                />
                <label htmlFor="entries" className="text-sm font-medium leading-none cursor-pointer">
                  Listagem de Lançamentos
                </label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border/50">
                <Checkbox 
                  id="team" 
                  checked={includeTeam} 
                  onCheckedChange={(checked) => setIncludeTeam(checked === true)} 
                />
                <label htmlFor="team" className="text-sm font-medium leading-none cursor-pointer">
                  Custos de Equipe
                </label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border/50">
                <Checkbox 
                  id="clients" 
                  checked={includeClients} 
                  onCheckedChange={(checked) => setIncludeClients(checked === true)} 
                />
                <label htmlFor="clients" className="text-sm font-medium leading-none cursor-pointer">
                  Rentabilidade de Clientes
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={generateReport} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" /> Gerar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialReportDialog;
