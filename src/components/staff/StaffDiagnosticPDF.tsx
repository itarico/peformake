import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { buildStandardPdfHtml, exportHtmlToPdf, pdfSectionTitle } from '@/lib/pdfUtils';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaffDiagnosticPDFProps {
  staffMember: {
    id: string;
    full_name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
  };
}

export function StaffDiagnosticPDF({ staffMember }: StaffDiagnosticPDFProps) {
  const [generating, setGenerating] = useState(false);

  const generateDiagnostic = async () => {
    setGenerating(true);
    try {
      // Fetch all data in parallel
      const [
        assignmentsRes,
        oteConfigRes,
        oteScoresRes,
        okrObjectivesRes,
      ] = await Promise.all([
        supabase
          .from('client_team_assignments')
          .select('*, clients(name, is_active, contract_type)')
          .eq('staff_member_id', staffMember.id),
        supabase
          .from('ote_role_configs')
          .select('*, ote_criteria(*)')
          .eq('role_name', staffMember.role),
        supabase
          .from('ote_monthly_scores')
          .select('*')
          .eq('staff_member_id', staffMember.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(6),
        supabase
          .from('okr_objectives')
          .select('*, okr_key_results(*)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const assignments = assignmentsRes.data || [];
      const oteConfig = oteConfigRes.data?.[0] as any;
      const oteScores = oteScoresRes.data || [];
      const okrObjectives = okrObjectivesRes.data || [];

      const activeClients = assignments.filter((a: any) => a.clients?.is_active);
      const now = new Date();
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      // Build body
      let body = '';

      // Profile Summary
      body += pdfSectionTitle('Resumo do Perfil', '👤');
      body += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#f8f9fa;padding:14px;border-radius:8px;">
          <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Nome</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${staffMember.full_name}</p>
        </div>
        <div style="background:#f8f9fa;padding:14px;border-radius:8px;">
          <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Cargo</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${formatRole(staffMember.role)}</p>
        </div>
        <div style="background:#f8f9fa;padding:14px;border-radius:8px;">
          <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Clientes Ativos</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${activeClients.length}</p>
        </div>
        <div style="background:#f8f9fa;padding:14px;border-radius:8px;">
          <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Data do Diagnóstico</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${now.toLocaleDateString('pt-BR')}</p>
        </div>
      </div>`;

      // Clients
      body += pdfSectionTitle('Carteira de Clientes', '📋');
      if (activeClients.length === 0) {
        body += '<p style="font-size:13px;color:#666;padding:10px 0;">Nenhum cliente atribuído.</p>';
      } else {
        body += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
        body += '<tr style="background:#6366f1;color:white;"><th style="padding:8px 12px;text-align:left;font-size:12px;">Cliente</th><th style="padding:8px 12px;text-align:left;font-size:12px;">Função</th><th style="padding:8px 12px;text-align:center;font-size:12px;">Responsabilidade</th><th style="padding:8px 12px;text-align:center;font-size:12px;">Comissão</th></tr>';
        activeClients.forEach((a: any, i: number) => {
          const bg = i % 2 === 0 ? '#fff' : '#f8f9fa';
          body += `<tr style="background:${bg};"><td style="padding:8px 12px;font-size:12px;">${a.clients?.name || '—'}</td><td style="padding:8px 12px;font-size:12px;">${a.role_in_client}</td><td style="padding:8px 12px;text-align:center;font-size:12px;">${a.responsibility_percent}%</td><td style="padding:8px 12px;text-align:center;font-size:12px;">${a.commission_percent}%</td></tr>`;
        });
        body += '</table>';
      }

      // OTE Config
      body += pdfSectionTitle('Configuração OTE', '💰');
      if (oteConfig) {
        const fixedPct = oteConfig.split_fixed || 60;
        const varPct = 100 - fixedPct;
        const baseFormatted = (oteConfig.base_salary || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const oteFormatted = (oteConfig.ote_target || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const variableAmount = ((oteConfig.ote_target || 0) * varPct / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        body += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#eef2ff;padding:14px;border-radius:8px;text-align:center;border:1px solid #c7d2fe;">
            <p style="margin:0;font-size:11px;color:#4338ca;">Base Fixa</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#4338ca;">${baseFormatted}</p>
          </div>
          <div style="background:#fef3c7;padding:14px;border-radius:8px;text-align:center;border:1px solid #fcd34d;">
            <p style="margin:0;font-size:11px;color:#92400e;">Variável (${varPct}%)</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#92400e;">${variableAmount}</p>
          </div>
          <div style="background:#d1fae5;padding:14px;border-radius:8px;text-align:center;border:1px solid #6ee7b7;">
            <p style="margin:0;font-size:11px;color:#065f46;">OTE Total</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#065f46;">${oteFormatted}</p>
          </div>
        </div>`;

        // Criteria
        const criteria = (oteConfig.ote_criteria || []).filter((c: any) => c.is_active);
        if (criteria.length > 0) {
          body += '<p style="font-size:13px;font-weight:600;margin:12px 0 6px;">Critérios de Avaliação:</p>';
          body += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">';
          body += '<tr style="background:#6366f1;color:white;"><th style="padding:6px 10px;text-align:left;font-size:11px;">Critério</th><th style="padding:6px 10px;text-align:center;font-size:11px;">Peso</th><th style="padding:6px 10px;text-align:center;font-size:11px;">Meta</th></tr>';
          criteria.forEach((c: any, i: number) => {
            const bg = i % 2 === 0 ? '#fff' : '#f8f9fa';
            body += `<tr style="background:${bg};"><td style="padding:6px 10px;font-size:12px;">${c.criteria_name}</td><td style="padding:6px 10px;text-align:center;font-size:12px;">${c.weight_percent}%</td><td style="padding:6px 10px;text-align:center;font-size:12px;">${c.target_value || '—'}</td></tr>`;
          });
          body += '</table>';
        }
      } else {
        body += '<p style="font-size:13px;color:#666;padding:10px 0;">Nenhuma configuração OTE encontrada para este cargo.</p>';
      }

      // OTE History
      if (oteScores.length > 0) {
        body += pdfSectionTitle('Histórico OTE (Últimos Meses)', '📊');
        body += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">';
        body += '<tr style="background:#6366f1;color:white;"><th style="padding:6px 10px;text-align:left;font-size:11px;">Mês</th><th style="padding:6px 10px;text-align:center;font-size:11px;">Atingimento</th><th style="padding:6px 10px;text-align:right;font-size:11px;">Fixo</th><th style="padding:6px 10px;text-align:right;font-size:11px;">Variável</th><th style="padding:6px 10px;text-align:right;font-size:11px;">Total</th></tr>';
        oteScores.forEach((s: any, i: number) => {
          const bg = i % 2 === 0 ? '#fff' : '#f8f9fa';
          const total = (s.fixed_amount || 0) + (s.variable_amount || 0) + (s.bonus_amount || 0);
          const attColor = (s.attainment_percent || 0) >= 100 ? '#059669' : (s.attainment_percent || 0) >= 70 ? '#d97706' : '#dc2626';
          body += `<tr style="background:${bg};">
            <td style="padding:6px 10px;font-size:12px;">${monthNames[(s.month || 1) - 1]} ${s.year}</td>
            <td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:600;color:${attColor};">${(s.attainment_percent || 0).toFixed(0)}%</td>
            <td style="padding:6px 10px;text-align:right;font-size:12px;">${(s.fixed_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td style="padding:6px 10px;text-align:right;font-size:12px;">${(s.variable_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td style="padding:6px 10px;text-align:right;font-size:12px;font-weight:600;">${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>`;
        });
        body += '</table>';
      }

      // OKRs
      if (okrObjectives.length > 0) {
        body += pdfSectionTitle('OKRs Recentes', '🎯');
        okrObjectives.forEach((obj: any) => {
          const progressColor = obj.progress >= 70 ? '#059669' : obj.progress >= 40 ? '#d97706' : '#dc2626';
          body += `<div style="margin-bottom:14px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <p style="margin:0;font-size:13px;font-weight:600;">${obj.title}</p>
              <span style="font-size:12px;font-weight:700;color:${progressColor};">${(obj.progress || 0).toFixed(0)}%</span>
            </div>
            <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(obj.progress || 0, 100)}%;background:${progressColor};border-radius:3px;"></div>
            </div>`;
          const krs = obj.okr_key_results || [];
          if (krs.length > 0) {
            body += '<div style="margin-top:8px;">';
            krs.forEach((kr: any) => {
              const krPct = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
              body += `<p style="margin:2px 0;font-size:11px;color:#555;">• ${kr.title}: ${kr.current_value}/${kr.target_value} (${krPct}%)</p>`;
            });
            body += '</div>';
          }
          body += '</div>';
        });
      }

      const htmlContent = buildStandardPdfHtml({
        title: 'Diagnóstico do Colaborador',
        subtitle: `Gerado em ${now.toLocaleDateString('pt-BR')}`,
        body,
      });

      const filename = `diagnostico-${staffMember.full_name.replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`;
      await exportHtmlToPdf(htmlContent, filename);
      toast.success('Diagnóstico gerado com sucesso!');
    } catch (error: any) {
      console.error('Error generating diagnostic:', error);
      toast.error('Erro ao gerar diagnóstico.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateDiagnostic}
      disabled={generating}
      variant="outline"
      className="w-full gap-2"
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {generating ? 'Gerando Diagnóstico...' : 'Gerar Diagnóstico'}
    </Button>
  );
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrador',
    social_media: 'Social Media',
    designer: 'Designer',
    gestor: 'Gestor de Tráfego',
  };
  return map[role] || role;
}
