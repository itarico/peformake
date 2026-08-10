import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DeliverableKey =
  | 'design'
  | 'traffic_plan'
  | 'traffic_report'
  | 'av_script'
  | 'av_shoot'
  | 'av_delivery';

export type DeliverableStatus = 'completed' | 'overdue' | 'due_soon' | 'open' | 'not_open';

export interface DeliverableItem {
  key: DeliverableKey;
  projectId?: string;
  label: string;
  detail: string;
  progress: number;
  status: DeliverableStatus;
  dueDate: Date | null;
  route: string;
  assetUrl?: string | null;
}

export interface ClientDeliverables {
  clientId: string;
  clientName: string;
  segment: string | null;
  hasDesign: boolean;
  hasTraffic: boolean;
  hasAudiovisual: boolean;
  items: DeliverableItem[];
  design?: DeliverableItem;
  traffic: DeliverableItem[];
  audiovisual: DeliverableItem[];
  avProgress: number;
  overallProgress: number;
  overdueCount: number;
}

const DAY = 24 * 60 * 60 * 1000;

export const DELIVERABLE_LABELS: Record<DeliverableKey, string> = {
  design: 'Artes do mês',
  traffic_plan: 'Planejamento da campanha',
  traffic_report: 'Relatório do mês anterior',
  av_script: 'Roteiro',
  av_shoot: 'Captação',
  av_delivery: 'Entrega dos vídeos',
};

export function statusFrom(done: boolean, dueDate: Date | null, opensAt: Date | null, now: Date): DeliverableStatus {
  if (done) return 'completed';
  if (opensAt && now < opensAt) return 'not_open';
  if (!dueDate) return 'open';
  if (now.getTime() > dueDate.getTime() + DAY) return 'overdue';
  if (dueDate.getTime() - now.getTime() <= 5 * DAY) return 'due_soon';
  return 'open';
}

/** Dia 15 do mês anterior ao período informado. */
function day15PreviousMonth(year: number, month: number) {
  const d = new Date(year, month - 2, 15);
  return d;
}

export function useOperationDeliverables(year: number, month: number) {
  const queryClient = useQueryClient();
  const now = new Date();

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['op-deliv-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, business_segment, is_active, arts_per_month')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['op-deliv-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, quantity, is_active, services(slug, name)');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['op-deliv-arts', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arts')
        .select('id, status, deadline_date, work_month_id, work_months!inner(id, client_id, year, month)')
        .eq('work_months.year', year)
        .eq('work_months.month', month);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: workMonths = [] } = useQuery({
    queryKey: ['op-deliv-work-months', year, month],
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

  const { data: avProjects = [] } = useQuery({
    queryKey: ['op-deliv-av', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return data || [];
    },
  });


  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ['op-deliv-rows', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_deliverables')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return data || [];
    },
  });

  const saveDeliverable = useMutation({
    mutationFn: async (payload: {
      client_id: string;
      service_type: DeliverableKey;
      asset_url?: string | null;
      notes?: string | null;
      completed?: boolean;
      due_date?: string | null;
    }) => {
      const existing = (rows as any[]).find(
        r => r.client_id === payload.client_id && r.service_type === payload.service_type
      );
      const body: any = {
        client_id: payload.client_id,
        year,
        month,
        service_type: payload.service_type,
        asset_url: payload.asset_url ?? null,
        notes: payload.notes ?? null,
        due_date: payload.due_date ?? null,
        status: payload.completed === false ? 'pending' : payload.asset_url ? 'completed' : 'pending',
        completed_at: payload.asset_url ? new Date().toISOString() : null,
      };
      if (existing) {
        const { error } = await supabase.from('operation_deliverables').update(body).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('operation_deliverables').insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['op-deliv-rows', year, month] });
    },
  });

  const data: ClientDeliverables[] = (clients as any[]).map(c => {
    const services = (clientServices as any[]).filter(cs => cs.client_id === c.id && cs.is_active !== false);
    const slugs = services.map(s => s.services?.slug);
    const hasDesign = slugs.includes('design') || slugs.includes('social_midia') || (c.arts_per_month || 0) > 0;
    const hasTraffic = slugs.includes('trafego');
    const avService = services.find(s =>
      ['producao_audiovisual', 'captacao', 'edicao'].includes(s.services?.slug)
    );
    const hasAudiovisual = !!avService;
    const avQuantity = Math.max(1, avService?.quantity || 1);

    const items: DeliverableItem[] = [];

    // ---- Design ----
    let design: DeliverableItem | undefined;
    if (hasDesign) {
      const clientArts = (arts as any[]).filter(a => a.work_months?.client_id === c.id);
      const total = clientArts.length || c.arts_per_month || 0;
      const approved = clientArts.filter(a => a.status === 'approved').length;
      const due = day15PreviousMonth(year, month);
      const workMonthId =
        (workMonths as any[]).find(w => w.client_id === c.id)?.id ||
        clientArts[0]?.work_months?.id;
      design = {
        key: 'design',
        label: DELIVERABLE_LABELS.design,
        detail: `${approved}/${total} artes aprovadas`,
        progress: total > 0 ? (approved / total) * 100 : 0,
        status: statusFrom(total > 0 && approved >= total, due, null, now),
        dueDate: due,
        route: workMonthId
          ? `/social-media/${c.id}/${workMonthId}`
          : `/planning?client=${c.id}&year=${year}&month=${month}`,
      };
      items.push(design);
    }

    // ---- Tráfego ----
    const traffic: DeliverableItem[] = [];
    if (hasTraffic) {
      const planRow = (rows as any[]).find(r => r.client_id === c.id && r.service_type === 'traffic_plan');
      const reportRow = (rows as any[]).find(r => r.client_id === c.id && r.service_type === 'traffic_report');
      const planDue = day15PreviousMonth(year, month);
      const reportDue = new Date(year, month - 1, 1);
      const planDone = !!planRow?.asset_url;
      const reportDone = !!reportRow?.asset_url;

      traffic.push({
        key: 'traffic_plan',
        label: DELIVERABLE_LABELS.traffic_plan,
        detail: planDone ? 'Planejamento enviado' : 'Aguardando planejamento',
        progress: planDone ? 100 : 0,
        status: statusFrom(planDone, planDue, null, now),
        dueDate: planDue,
        assetUrl: planRow?.asset_url,
        route: `/traffic?tab=entregas&client=${c.id}&year=${year}&month=${month}`,
      });
      traffic.push({
        key: 'traffic_report',
        label: DELIVERABLE_LABELS.traffic_report,
        detail: reportDone ? 'Relatório enviado' : 'Aguardando relatório',
        progress: reportDone ? 100 : 0,
        status: statusFrom(reportDone, reportDue, null, now),
        dueDate: reportDue,
        assetUrl: reportRow?.asset_url,
        route: `/traffic?tab=entregas&client=${c.id}&year=${year}&month=${month}`,
      });
      items.push(...traffic);
    }

    // ---- Audiovisual ----
    const audiovisual: DeliverableItem[] = [];
    let avProgress = 0;
    if (hasAudiovisual) {
      const projects = (avProjects as any[]).filter(p => p.client_id === c.id);
      const expected = Math.max(avQuantity, projects.length || 1);
      const scriptDone = projects.filter(p => !!p.script && p.script.trim().length > 0).length;
      const shootDone = projects.filter(p => !!p.shoot_date).length;
      const deliveryDone = projects.filter(p => !!p.finished_assets_url).length;
      const due = day15PreviousMonth(year, month);
      const route = `/operation?tab=audiovisual&sub=projetos&client=${c.id}&year=${year}&month=${month}`;

      // prazo de entrega: 5 dias após a última captação
      const lastShoot = projects
        .map(p => (p.shoot_date ? new Date(p.shoot_date) : null))
        .filter(Boolean)
        .sort((a: any, b: any) => b - a)[0] as Date | undefined;
      const deliveryDue = lastShoot ? new Date(lastShoot.getTime() + 5 * DAY) : null;

      audiovisual.push({
        key: 'av_script',
        label: DELIVERABLE_LABELS.av_script,
        detail: `${scriptDone}/${expected} roteiros`,
        progress: (scriptDone / expected) * 100,
        status: statusFrom(scriptDone >= expected, due, null, now),
        dueDate: due,
        route,
      });
      audiovisual.push({
        key: 'av_shoot',
        label: DELIVERABLE_LABELS.av_shoot,
        detail: `${shootDone}/${expected} agendadas`,
        progress: (shootDone / expected) * 100,
        status: statusFrom(shootDone >= expected, due, null, now),
        dueDate: due,
        route: `/operation?tab=audiovisual&sub=calendario&client=${c.id}`,
      });
      audiovisual.push({
        key: 'av_delivery',
        label: DELIVERABLE_LABELS.av_delivery,
        detail: `${deliveryDone}/${expected} entregues`,
        progress: (deliveryDone / expected) * 100,
        status: statusFrom(deliveryDone >= expected, deliveryDue, lastShoot ?? null, now),
        dueDate: deliveryDue,
        route,
      });
      avProgress = audiovisual.reduce((s, i) => s + i.progress, 0) / audiovisual.length;
      items.push(...audiovisual);
    }

    const overallProgress = items.length ? items.reduce((s, i) => s + i.progress, 0) / items.length : 0;
    const overdueCount = items.filter(i => i.status === 'overdue').length;

    return {
      clientId: c.id,
      clientName: c.name,
      segment: c.business_segment,
      hasDesign,
      hasTraffic,
      hasAudiovisual,
      items,
      design,
      traffic,
      audiovisual,
      avProgress,
      overallProgress,
      overdueCount,
    };
  });

  const allItems = data.flatMap(d => d.items);
  const summary = {
    total: allItems.length,
    completed: allItems.filter(i => i.status === 'completed').length,
    overdue: allItems.filter(i => i.status === 'overdue').length,
    dueSoon: allItems.filter(i => i.status === 'due_soon').length,
    pending: allItems.filter(i => i.status !== 'completed').length,
  };

  return {
    data,
    summary,
    rows,
    saveDeliverable,
    isLoading: loadingClients || loadingRows,
  };
}
