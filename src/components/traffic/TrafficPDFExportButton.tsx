import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';
import { toast } from 'sonner';

interface Props { clientId: string; clientName?: string }

export function TrafficPDFExportButton({ clientId, clientName }: Props) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [compareLastMonth, setCompareLastMonth] = useState(true);
  const [includeAISummary, setIncludeAISummary] = useState(true);
  const [includeInstagram, setIncludeInstagram] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { data: aiAnalysis } = useQuery({
    queryKey: ['traffic-pdf-ai', clientId, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_ai_analyses')
        .select('client_summary, content')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const name = clientName || 'Cliente';
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      // Current & previous campaigns
      const { data: campaigns } = await supabase
        .from('traffic_campaigns').select('*')
        .eq('client_id', clientId).eq('year', year).eq('month', month)
        .order('investment', { ascending: false });

      const { data: prevCampaigns } = await supabase
        .from('traffic_campaigns').select('*')
        .eq('client_id', clientId).eq('year', prevYear).eq('month', prevMonth);

      // Instagram data
      let igMetrics: any = null, prevIgMetrics: any = null, igTopMedia: any[] = [];
      if (includeInstagram) {
        const { data: ig } = await supabase
          .from('instagram_metrics' as any).select('*')
          .eq('client_id', clientId).eq('year', year).eq('month', month).single();
        igMetrics = ig;

        if (compareLastMonth) {
          const { data: prevIg } = await supabase
            .from('instagram_metrics' as any).select('*')
            .eq('client_id', clientId).eq('year', prevYear).eq('month', prevMonth).single();
          prevIgMetrics = prevIg;
        }

        const { data: media } = await supabase
          .from('instagram_top_media' as any).select('*')
          .eq('client_id', clientId).eq('year', year).eq('month', month)
          .order('engagement_total', { ascending: false }).limit(6);
        igTopMedia = media || [];
      }

      const items = campaigns || [];
      const prevItems = prevCampaigns || [];

      const agg = (list: any[]) => {
        const inv = list.reduce((s, c) => s + (c.investment || 0), 0);
        const leads = list.reduce((s, c) => s + (c.leads || 0), 0);
        const msgs = list.reduce((s, c) => s + (c.messages_started || 0), 0);
        const clicks = list.reduce((s, c) => s + (c.clicks || 0), 0);
        const impr = list.reduce((s, c) => s + (c.impressions || 0), 0);
        const reach = list.reduce((s, c) => s + (c.reach || 0), 0);
        const rev = list.reduce((s, c) => s + (c.revenue_generated || 0), 0);
        const linkClicks = list.reduce((s, c) => s + (c.link_clicks || 0), 0);
        const denom = leads > 0 ? leads : msgs;
        return { inv, leads, msgs, clicks, impr, reach, rev, linkClicks, cpl: denom > 0 ? inv / denom : 0, ctr: impr > 0 ? (clicks / impr) * 100 : 0, roas: inv > 0 ? rev / inv : 0 };
      };

      const cur = agg(items);
      const prev = agg(prevItems);

      const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
      const num = (v: number) => v.toLocaleString('pt-BR');
      const delta = (curVal: number, prevVal: number) => {
        if (!compareLastMonth || prevVal === 0) return '';
        const pct = ((curVal - prevVal) / prevVal) * 100;
        const color = pct >= 0 ? '#22c55e' : '#ef4444';
        const arrow = pct >= 0 ? '▲' : '▼';
        return `<span style="color: ${color}; font-size: 11px; margin-left: 4px;">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
      };
      const deltaInv = (curVal: number, prevVal: number) => {
        if (!compareLastMonth || prevVal === 0) return '';
        const pct = ((curVal - prevVal) / prevVal) * 100;
        const color = pct <= 0 ? '#22c55e' : '#ef4444';
        const arrow = pct >= 0 ? '▲' : '▼';
        return `<span style="color: ${color}; font-size: 11px; margin-left: 4px;">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
      };

      const summaryText = includeAISummary ? (aiAnalysis?.client_summary || '') : '';

      // Build Instagram section HTML
      let igHtml = '';
      if (igMetrics && includeInstagram) {
        const igDelta = (c: number, p: number | undefined) => {
          if (!compareLastMonth || !p || p === 0) return '';
          return delta(c, p);
        };
        igHtml = `
          <div style="page-break-before: always; margin-top: 24px;">
            <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
              <h2 style="margin: 0; font-size: 18px;">📸 Relatório Instagram</h2>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">${MONTH_NAMES[month - 1]} ${year}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
              <div style="background: #fdf2f8; padding: 14px; border-radius: 8px; border-left: 4px solid #ec4899;">
                <p style="margin: 0; font-size: 11px; color: #666;">Seguidores</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${num(igMetrics.followers_count || 0)}${igDelta(igMetrics.followers_count, prevIgMetrics?.followers_count)}</p>
              </div>
              <div style="background: #fdf2f8; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 11px; color: #666;">Novos Seguidores</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${igMetrics.new_followers > 0 ? '+' : ''}${num(igMetrics.new_followers || 0)}${igDelta(igMetrics.new_followers, prevIgMetrics?.new_followers)}</p>
              </div>
              <div style="background: #fdf2f8; padding: 14px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                <p style="margin: 0; font-size: 11px; color: #666;">Alcance</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${num(igMetrics.reach || 0)}${igDelta(igMetrics.reach, prevIgMetrics?.reach)}</p>
              </div>
              <div style="background: #fdf2f8; padding: 14px; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; font-size: 11px; color: #666;">Engajamento</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${(igMetrics.engagement_rate || 0).toFixed(2)}%${igDelta(igMetrics.engagement_rate, prevIgMetrics?.engagement_rate)}</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px;">
              ${[
                { l: 'Impressões', v: igMetrics.impressions, p: prevIgMetrics?.impressions },
                { l: 'Curtidas', v: igMetrics.total_likes, p: prevIgMetrics?.total_likes },
                { l: 'Comentários', v: igMetrics.total_comments, p: prevIgMetrics?.total_comments },
                { l: 'Salvamentos', v: igMetrics.total_saves, p: prevIgMetrics?.total_saves },
                { l: 'Compartilh.', v: igMetrics.total_shares, p: prevIgMetrics?.total_shares },
                { l: 'Reproduções', v: igMetrics.total_plays, p: prevIgMetrics?.total_plays },
              ].map(m => `
                <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; font-size: 10px; color: #666;">${m.l}</p>
                  <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${num(m.v || 0)}${igDelta(m.v || 0, m.p)}</p>
                </div>
              `).join('')}
            </div>

            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; padding: 14px; background: #f8f9fa; border-radius: 8px;">
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666;">Posts</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">${igMetrics.posts_count || 0}</p>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666;">Reels</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">${igMetrics.reels_count || 0}</p>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666;">Carrossel</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">${igMetrics.carousel_count || 0}</p>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666;">Imagens</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">${igMetrics.image_count || 0}</p>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666;">Visitas Perfil</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">${num(igMetrics.profile_views || 0)}</p>
              </div>
            </div>

            <h3 style="font-size: 14px; margin: 16px 0 8px; color: #333;">📊 Média por Post</h3>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px;">
              ${[
                { l: 'Curtidas/post', v: igMetrics.avg_likes },
                { l: 'Comentários/post', v: igMetrics.avg_comments },
                { l: 'Salvamentos/post', v: igMetrics.avg_saves },
                { l: 'Compartilh./post', v: igMetrics.avg_shares },
                { l: 'Alcance/post', v: igMetrics.avg_reach_per_post },
              ].map(m => `
                <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; font-size: 10px; color: #666;">${m.l}</p>
                  <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${(m.v || 0).toLocaleString('pt-BR')}</p>
                </div>
              `).join('')}
            </div>

            ${igTopMedia.length > 0 ? `
              <h3 style="font-size: 14px; margin: 16px 0 8px; color: #333;">🔥 Top Posts do Mês</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #fdf2f8;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #f9a8d4;">#</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #f9a8d4;">Tipo</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">❤️ Curtidas</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">💬 Coment.</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">🔖 Salvos</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">🔄 Compart.</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">👁 Alcance</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #f9a8d4;">▶️ Plays</th>
                  </tr>
                </thead>
                <tbody>
                  ${igTopMedia.map((m: any, i: number) => `
                    <tr style="background: ${i % 2 === 0 ? '#fff' : '#fdf2f8'};">
                      <td style="padding: 6px 8px; border-bottom: 1px solid #f9a8d4; font-weight: bold;">${i + 1}</td>
                      <td style="padding: 6px 8px; border-bottom: 1px solid #f9a8d4;">${m.media_type === 'REELS' ? '🎬 Reel' : m.media_type === 'VIDEO' ? '📹 Vídeo' : '🖼 Imagem'}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.like_count || 0)}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.comments_count || 0)}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.saves || 0)}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.shares || 0)}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.reach || 0)}</td>
                      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #f9a8d4;">${num(m.plays || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `;
      }

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 24px;">Relatório de Tráfego Pago</h1>
            <p style="margin: 0; opacity: 0.9;">${name} — ${MONTH_NAMES[month - 1]} ${year}</p>
            ${compareLastMonth ? `<p style="margin: 4px 0 0; opacity: 0.7; font-size: 12px;">Comparação com ${MONTH_NAMES[prevMonth - 1]} ${prevYear}</p>` : ''}
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;">
              <p style="margin: 0; font-size: 12px; color: #666;">Investimento</p>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${fmt(cur.inv)}${deltaInv(cur.inv, prev.inv)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
              <p style="margin: 0; font-size: 12px; color: #666;">Leads/Vendas</p>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${num(cur.leads || cur.msgs)}${delta(cur.leads || cur.msgs, prev.leads || prev.msgs)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 12px; color: #666;">CPL</p>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${fmt(cur.cpl)}${deltaInv(cur.cpl, prev.cpl)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 12px; color: #666;">ROAS</p>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${cur.roas.toFixed(2)}x${delta(cur.roas, prev.roas)}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666;">Impressões</p>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${num(cur.impr)}${delta(cur.impr, prev.impr)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666;">Alcance</p>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${num(cur.reach)}${delta(cur.reach, prev.reach)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666;">Cliques no Link</p>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${num(cur.linkClicks)}${delta(cur.linkClicks, prev.linkClicks)}</p>
            </div>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666;">CTR</p>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${cur.ctr.toFixed(2)}%${delta(cur.ctr, prev.ctr)}</p>
            </div>
          </div>

          ${items.length > 0 ? `
            <h2 style="font-size: 16px; margin: 24px 0 12px; color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">Campanhas Detalhadas</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Campanha</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Status</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Invest.</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Leads</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">CPL</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Cliques</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">CTR</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">ROAS</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((c, i) => `
                  <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8f9fa'};">
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; max-width: 160px; overflow: hidden; text-overflow: ellipsis;">${c.campaign_name || 'Sem nome'}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; background: ${c.status === 'active' ? '#dcfce7' : '#f1f5f9'}; color: ${c.status === 'active' ? '#166534' : '#64748b'};">${c.status === 'active' ? 'Ativa' : 'Pausada'}</span></td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${fmt(c.investment || 0)}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${c.leads || c.messages_started || 0}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${fmt(c.cost_per_lead || 0)}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${num(c.link_clicks || c.clicks || 0)}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${(c.ctr || 0).toFixed(2)}%</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${(c.roas || 0).toFixed(2)}x</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="color: #999; text-align: center;">Nenhuma campanha neste período.</p>'}

          ${summaryText ? `
            <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; border-left: 4px solid #3b82f6;">
              <h2 style="font-size: 15px; margin: 0 0 12px; color: #1e40af;">📊 Análise Estratégica</h2>
              <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${summaryText}</div>
            </div>
          ` : ''}

          ${igHtml}

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #999;">Relatório gerado por Peformake • ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `trafego-${name.replace(/\s+/g, '-').toLowerCase()}-${MONTH_NAMES[month - 1].toLowerCase()}-${year}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] },
      } as any).from(container).save();

      document.body.removeChild(container);
      toast.success('PDF exportado com sucesso!');
      setOpen(false);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
    setGenerating(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileDown className="h-4 w-4 mr-2" /> Relatório PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Relatório — {clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Comparar com mês anterior</Label>
                <Switch checked={compareLastMonth} onCheckedChange={setCompareLastMonth} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Incluir dados do Instagram</Label>
                <Switch checked={includeInstagram} onCheckedChange={setIncludeInstagram} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Incluir análise IA para o cliente</Label>
                  {!aiAnalysis?.client_summary && <p className="text-xs text-muted-foreground">Gere o resumo no Copiloto IA primeiro</p>}
                </div>
                <Switch checked={includeAISummary && !!aiAnalysis?.client_summary} onCheckedChange={setIncludeAISummary} disabled={!aiAnalysis?.client_summary} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={generatePDF} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
