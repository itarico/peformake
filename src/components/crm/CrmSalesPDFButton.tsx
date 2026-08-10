import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  clientName: string;
}

export default function CrmSalesPDFButton({ clientId, clientName }: Props) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ data: leads }, { data: sales }, { data: messages }] = await Promise.all([
        supabase.from('crm_leads').select('id, name, phone, status, sale_value, tags, created_at')
          .eq('client_id', clientId),
        supabase.from('crm_sales').select('value, product_name, sale_date, crm_leads(name, phone)')
          .eq('client_id', clientId)
          .gte('sale_date', monthStart)
          .order('sale_date', { ascending: false }),
        supabase.from('crm_messages').select('direction, created_at')
          .eq('client_id', clientId)
          .gte('created_at', monthStart),
      ]);

      const totalLeads = leads?.length || 0;
      const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.value || 0), 0);
      const totalSalesCount = sales?.length || 0;
      const inbound = (messages || []).filter(m => m.direction === 'inbound').length;
      const outbound = (messages || []).filter(m => m.direction === 'outbound').length;
      const conversionRate = totalLeads > 0 ? ((totalSalesCount / totalLeads) * 100).toFixed(1) : '0';

      const statusMap: Record<string, string> = {
        new: 'Novo', negotiating: 'Negociando', qualified: 'Qualificado',
        unqualified: 'Não Qualificado', sale_completed: 'Venda Realizada', sale_lost: 'Venda Perdida',
      };

      const statusCounts: Record<string, number> = {};
      (leads || []).forEach(l => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      });

      const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      // Build HTML for PDF
      const html = `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">Relatório CRM — ${clientName}</h1>
            <p style="color: #666; margin: 4px 0 0;">${monthLabel} | Gerado em ${now.toLocaleDateString('pt-BR')}</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="font-size: 11px; color: #666; margin: 0;">Total Leads</p>
              <p style="font-size: 28px; font-weight: bold; color: #1a1a2e; margin: 4px 0 0;">${totalLeads}</p>
            </div>
            <div style="background: #f0fff4; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="font-size: 11px; color: #666; margin: 0;">Vendas</p>
              <p style="font-size: 28px; font-weight: bold; color: #16a34a; margin: 4px 0 0;">${totalSalesCount}</p>
            </div>
            <div style="background: #fffbeb; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="font-size: 11px; color: #666; margin: 0;">Faturamento</p>
              <p style="font-size: 22px; font-weight: bold; color: #d97706; margin: 4px 0 0;">R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style="background: #faf5ff; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="font-size: 11px; color: #666; margin: 0;">Conversão</p>
              <p style="font-size: 28px; font-weight: bold; color: #7c3aed; margin: 4px 0 0;">${conversionRate}%</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div>
              <h3 style="font-size: 14px; color: #1a1a2e; margin-bottom: 8px;">📊 Pipeline</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                ${Object.entries(statusCounts).map(([status, count]) => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 0;">${statusMap[status] || status}</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold;">${count}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            <div>
              <h3 style="font-size: 14px; color: #1a1a2e; margin-bottom: 8px;">💬 Mensagens</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 0;">Recebidas</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">${inbound}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 0;">Enviadas</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">${outbound}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">Total</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">${inbound + outbound}</td>
                </tr>
              </table>
            </div>
          </div>

          ${totalSalesCount > 0 ? `
            <h3 style="font-size: 14px; color: #1a1a2e; margin-bottom: 8px;">💰 Vendas Realizadas</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 8px; text-align: left;">Lead</th>
                  <th style="padding: 8px; text-align: left;">Produto</th>
                  <th style="padding: 8px; text-align: right;">Valor</th>
                  <th style="padding: 8px; text-align: right;">Data</th>
                </tr>
              </thead>
              <tbody>
                ${(sales || []).map((s: any) => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px;">${(s as any).crm_leads?.name || (s as any).crm_leads?.phone || '—'}</td>
                    <td style="padding: 6px 8px;">${s.product_name || '—'}</td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #16a34a;">R$ ${Number(s.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 6px 8px; text-align: right;">${new Date(s.sale_date).toLocaleDateString('pt-BR')}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #dee2e6; font-weight: bold;">
                  <td colspan="2" style="padding: 8px;">Total</td>
                  <td style="padding: 8px; text-align: right; color: #16a34a;">R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ` : ''}

          <div style="text-align: center; margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee;">
            <p style="font-size: 10px; color: #999;">Relatório gerado automaticamente pelo CRM Peformake</p>
          </div>
        </div>
      `;

      // Use html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      await html2pdf().from(container).set({
        margin: [10, 10],
        filename: `relatorio-crm-${clientName.toLowerCase().replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).save();

      document.body.removeChild(container);
      toast.success('PDF gerado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e.message || 'tente novamente'));
    }
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Relatório PDF
    </Button>
  );
}
