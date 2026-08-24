import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Calendar, DollarSign, MoreVertical, 
  Trash2, MessageCircle, Instagram, Link2, 
  UserCheck, MessageSquare, Clock, AlertTriangle,
  History, Target, TrendingUp, Search, RefreshCw,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSDRContext } from './useSDRContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CrmChat from '@/components/crm/CrmChat';
import IncomingLeads from './IncomingLeads';

interface Lead {
  id: string;
  contact_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  instagram_handle: string | null;
  source: string | null;
  estimated_value: number;
  stage_id: string | null;
  qualification_score: number;
  next_follow_up_at: string | null;
  notes: string | null;
  pain_point: string | null;
  sdr_staff_id: string | null;
  status: string;
  crm_id: string | null;
  crm_source: string | null;
  last_synced_at: string | null;
  lead_tier: 'A' | 'B' | 'C' | 'Desqualificado' | 'Outro';
  client_id: string | null;
  initial_contact_responses: any;
  cnpj: string | null;
  selected_services: any[];
  contract_duration: number;
  company_revenue_bracket: string | null;
  sale_type: 'MRR' | 'TCV' | string;
}

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

/** Trilha de bolinhas mostrando em que sub-etapa o lead está dentro da etapa macro atual (ex:
 *  dentro de "2º Etapa: SDR Pipeline", que tem 3 sub-etapas) — bolinha preenchida = já passou ou
 *  está nela, vazia = ainda não chegou. */
const StageProgressDots = ({ stagesList, currentStageId }: { stagesList: Stage[]; currentStageId: string | null }) => {
  if (stagesList.length <= 1) return null;
  const currentIndex = stagesList.findIndex(s => s.id === currentStageId);
  return (
    <div className="flex items-center gap-1" title={stagesList[currentIndex]?.name}>
      {stagesList.map((s, i) => (
        <span
          key={s.id}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            i <= currentIndex ? '' : 'bg-muted-foreground/20'
          }`}
          style={i <= currentIndex ? { backgroundColor: s.color || 'currentColor' } : undefined}
        />
      ))}
    </div>
  );
};

const SDRPipelineKanban = ({ viewMode }: { viewMode?: 'sdr' | 'closer' }) => {
  const { sdrStaffId, isAdminView, sdrList } = useSDRContext();
  const queryClient = useQueryClient();
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [selectedLeadForChat, setSelectedLeadForChat] = useState<{ id: string; clientId: string } | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [filterSdrId, setFilterSdrId] = useState<string | 'all' | 'unassigned'>(isAdminView ? 'all' : (sdrStaffId || 'all'));
  
  const [lossForm, setLossForm] = useState({ reason: '', notes: '' });
  const [meetingForm, setMeetingForm] = useState({ date: '', time: '' });
  const [wonForm, setWonForm] = useState({ 
    selected_services: [] as any[], 
    contract_duration: 12, 
    sale_type: 'MRR',
    total_value: 0,
    cnpj: '',
    email: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const toggleStage = (stageId: string) => {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  useEffect(() => {
    // Check automations on mount
    handleSyncAutomations();
  }, []);

  useEffect(() => {
    // Calculate total value when services change
    const total = wonForm.selected_services.reduce((sum, s) => sum + (s.default_price || 0), 0);
    setWonForm(prev => ({ ...prev, total_value: total }));
  }, [wonForm.selected_services]);

  const handleSyncAutomations = async () => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.functions.invoke('crm-automation');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
    } catch (error) {
      console.error('Error syncing automations:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const revenueOptions = [
    { label: 'Abaixo de R$ 20k', value: 15000 },
    { label: 'R$ 20k - R$ 50k', value: 35000 },
    { label: 'R$ 50k - R$ 100k', value: 75000 },
    { label: 'Acima de R$ 100k', value: 150000 },
  ];

  const [form, setForm] = useState({
    contact_name: '', company_name: '', phone: '', email: '', instagram_handle: '',
    source: 'inbound', estimated_value: '', notes: '', pain_point: '', qualification_score: '0',
    lead_tier: 'Outro' as 'A' | 'B' | 'C' | 'Desqualificado' | 'Outro',
    cnpj: '', company_revenue_bracket: '',
    initial_contact_responses: { origin: '', main_pain: '', expectations: '', how_knew: '', difficulties: '' }
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['sdr-stages'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_pipeline_stages').select('*').order('stage_order');
      return (data || []) as Stage[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['sdr-leads', filterSdrId, viewMode],
    queryFn: async () => {
      let q = supabase
        .from('sdr_leads')
        .select(`
          *,
          staff_members:sdr_staff_id (
            full_name
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (filterSdrId === 'unassigned') {
        q = q.is('sdr_staff_id', null);
      } else if (filterSdrId !== 'all') {
        q = q.eq('sdr_staff_id', filterSdrId);
      }
      
      const { data } = await q;
      return (data || []) as any[];
    },
    enabled: stages.length > 0,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['sdr-lead-activities', editingLead?.id],
    queryFn: async () => {
      if (!editingLead) return [];
      const { data } = await supabase
        .from('sdr_lead_activities')
        .select('*')
        .eq('lead_id', editingLead.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!editingLead,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('id, name, default_price').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const sdrStages = useMemo(() => stages.filter(s => [2, 3, 4].includes(s.stage_order)), [stages]);
  const closerStages = useMemo(() => stages.filter(s => [5, 6, 7].includes(s.stage_order)), [stages]);
  const recoveryStages = useMemo(() => stages.filter(s => [8, 9].includes(s.stage_order)), [stages]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let leadTier: 'A' | 'B' | 'C' | 'Desqualificado' | 'Outro' = 'Outro';
      if (form.company_revenue_bracket === 'Acima de R$ 100k') leadTier = 'A';
      else if (form.company_revenue_bracket === 'R$ 50k - R$ 100k') leadTier = 'B';
      else if (form.company_revenue_bracket === 'R$ 20k - R$ 50k') leadTier = 'C';
      else if (form.company_revenue_bracket === 'Abaixo de R$ 20k') leadTier = 'Desqualificado';

      const payload: any = {
        contact_name: form.contact_name,
        company_name: form.company_name || null,
        phone: form.phone || null,
        email: form.email || null,
        instagram_handle: form.instagram_handle || null,
        source: form.source,
        estimated_value: parseFloat(form.estimated_value) || 0,
        qualification_score: parseInt(form.qualification_score) || 0,
        notes: form.notes || null,
        pain_point: form.pain_point,
        lead_tier: leadTier,
        cnpj: form.cnpj || null,
        company_revenue_bracket: form.company_revenue_bracket || null,
        initial_contact_responses: form.initial_contact_responses,
      };

      if (!editingLead) {
        payload.sdr_staff_id = isAdminView ? null : sdrStaffId;
        payload.stage_id = stages.find(s => s.stage_order === 1)?.id || stages[0]?.id;
      }

      if (editingLead) {
        const { error } = await supabase.from('sdr_leads').update(payload).eq('id', editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sdr_leads').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-leads'] });
      setDialogOpen(false);
      setEditingLead(null);
      setForm({ 
        contact_name: '', company_name: '', phone: '', email: '', instagram_handle: '', 
        source: 'inbound', estimated_value: '', notes: '', pain_point: '', qualification_score: '0', 
        lead_tier: 'Outro', cnpj: '', company_revenue_bracket: '',
        initial_contact_responses: { origin: '', main_pain: '', expectations: '', how_knew: '', difficulties: '' } 
      });
      toast.success(editingLead ? 'Lead atualizado!' : 'Lead criado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const moveStage = useMutation({
    mutationFn: async ({ leadId, stageId, additionalData = {} }: { leadId: string; stageId: string, additionalData?: any }) => {
      const stage = stages.find(s => s.id === stageId);
      const updates: any = { 
        stage_id: stageId,
        updated_at: new Date().toISOString(),
        ...additionalData
      };
      
      if (stage?.is_won) updates.status = 'won';
      else if (stage?.is_lost) {
        updates.status = 'lost';
        updates.lost_at = new Date().toISOString();
      } else {
        updates.status = 'open';
      }

      const { error } = await supabase.from('sdr_leads').update(updates).eq('id', leadId);
      if (error) throw error;

      // Record stage move activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('sdr_lead_activities').insert({
        lead_id: leadId,
        sdr_staff_id: user?.id,
        activity_type: 'stage_move',
        description: `Movido para o estágio: ${stage?.name}`,
        outcome: updates.status === 'lost' ? `Motivo: ${updates.lost_reason}` : 'Sucesso'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-leads'] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sdr_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      toast.success('Lead removido');
    },
  });

  const handleDeleteWithPassword = async (leadId: string) => {
    const password = prompt("Para excluir este lead definitivamente, digite a senha do administrador:");
    
    // Normalizamos a senha para evitar problemas com espaços ou caracteres invisíveis
    const normalizedPassword = password?.trim();
    const correctPassword = "poxa"; 
    
    if (normalizedPassword === correctPassword) {
      deleteLead.mutate(leadId);
      setDialogOpen(false);
    } else if (password !== null) {
      toast.error("Senha incorreta. Apenas administradores podem excluir leads.");
    }
  };

  const handleStageChange = (lead: Lead, stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (stage?.is_lost) {
      setSelectedLeadForAction(lead);
      setLossDialogOpen(true);
      return;
    }
    if (stage?.is_won) {
      setSelectedLeadForAction(lead);
      setWonForm({
        selected_services: lead.selected_services || [],
        contract_duration: lead.contract_duration || 12,
        sale_type: lead.sale_type as any || 'MRR',
        total_value: lead.estimated_value || 0,
        cnpj: lead.cnpj || '',
        email: lead.email || ''
      });
      setWonDialogOpen(true);
      return;
    }
    if (stage?.name.includes('Reunião')) {
      setSelectedLeadForAction(lead);
      setMeetingDialogOpen(true);
      return;
    }
    moveStage.mutate({ leadId: lead.id, stageId });
  };

  const handleLossSubmit = () => {
    if (!selectedLeadForAction || !lossForm.reason) return;
    
    // Procura um estágio de perda
    const lostStage = stages.find(s => s.is_lost) || 
                     stages.find(s => s.name.toLowerCase().includes('perdido')) ||
                     stages.find(s => s.name.toLowerCase().includes('perda'));

    if (!lostStage) {
      toast.error('Estágio de perda não encontrado.');
      return;
    }

    moveStage.mutate({ 
      leadId: selectedLeadForAction.id, 
      stageId: lostStage.id,
      additionalData: { 
        lost_reason: lossForm.reason,
        notes: (selectedLeadForAction.notes || '') + `\nMotivo da perda: ${lossForm.reason}. ${lossForm.notes}`
      }
    });
    setLossDialogOpen(false);
    setLossForm({ reason: '', notes: '' });
  };

  const handleMeetingSubmit = async () => {
    if (!selectedLeadForAction || !meetingForm.date || !meetingForm.time) return;
    
    // Busca estágios relevantes
    const meetingStage = stages.find(s => s.name.toLowerCase().includes('reunião agendada')) || 
                        stages.find(s => s.name.toLowerCase().includes('reunião')) ||
                        stages.find(s => s.stage_order === 4);
    
    const closerStage = stages.find(s => s.stage_order === 5); // Primeiro estágio do Closer

    if (!meetingStage) {
      toast.error('Estágio de reunião não encontrado.');
      return;
    }

    try {
      const scheduledAt = `${meetingForm.date}T${meetingForm.time}:00`;
      
      // 1. Move lead stage and update meeting_at
      const stageToMove = (viewMode === 'closer' || !meetingStage) ? (closerStage?.id || meetingStage?.id) : meetingStage.id;
      
      if (!stageToMove) throw new Error("Estágio de destino não encontrado.");

      await moveStage.mutateAsync({ 
        leadId: selectedLeadForAction.id, 
        stageId: stageToMove,
        additionalData: { 
          meeting_at: scheduledAt,
          notes: (selectedLeadForAction.notes || '') + `\nReunião agendada para: ${meetingForm.date} às ${meetingForm.time}`
        }
      });

      // 2. Create entry in sdr_meetings
      const { error: meetingError } = await supabase.from('sdr_meetings').insert({
        title: `Reunião com ${selectedLeadForAction.contact_name}`,
        scheduled_at: scheduledAt,
        lead_id: selectedLeadForAction.id,
        sdr_staff_id: sdrStaffId,
        notes: `Agendada via Pipeline Kanban. ${selectedLeadForAction.notes || ''}`,
        status: 'scheduled'
      });

      if (meetingError) throw meetingError;

      setMeetingDialogOpen(false);
      setMeetingForm({ date: '', time: '' });
      toast.success('Reunião agendada e salva na agenda!');
      queryClient.invalidateQueries({ queryKey: ['sdr-meetings'] });
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast.error('Erro ao agendar reunião: ' + error.message);
    }
  };

  const handleWonSubmit = async () => {
    if (!selectedLeadForAction) return;

    const wonStage = stages.find(s => s.is_won) || stages.find(s => s.name.toLowerCase().includes('venda'));
    if (!wonStage) {
      toast.error('Estágio de venda não encontrado.');
      return;
    }

    try {
      await moveStage.mutateAsync({
        leadId: selectedLeadForAction.id,
        stageId: wonStage.id,
        additionalData: {
          won_value: wonForm.total_value,
          estimated_value: wonForm.total_value,
          cnpj: wonForm.cnpj,
          email: wonForm.email,
          selected_services: wonForm.selected_services,
          contract_duration: wonForm.contract_duration,
          sale_type: wonForm.sale_type,
          status: 'won',
          notes: (selectedLeadForAction.notes || '') + `\nVenda finalizada! Valor: ${wonForm.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Contrato: ${wonForm.contract_duration} meses.`
        }
      });
      setWonDialogOpen(false);
      toast.success('Venda registrada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao registrar venda: ' + error.message);
    }
  };

  const convertToClientMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      // 1. Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: lead.company_name || lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          contract_months: lead.contract_duration,
          contract_type: lead.sale_type,
          is_active: true,
          closer_id: lead.sdr_staff_id, // Assuming SDR/Closer who closed it
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Link lead to client
      const { error: updateLeadError } = await supabase
        .from('sdr_leads')
        .update({ client_id: client.id })
        .eq('id', lead.id);

      if (updateLeadError) throw updateLeadError;

      // 3. Add services to client (if there's a table for this, usually client_services)
      if (lead.selected_services && lead.selected_services.length > 0) {
        const clientServices = lead.selected_services.map((service: any) => ({
          client_id: client.id,
          service_id: service.id,
          price: service.price || service.default_price || 0,
        }));

        const { error: servicesError } = await supabase
          .from('client_services')
          .insert(clientServices);
        
        // If client_services doesn't exist or fails, we still have the client created
        if (servicesError) console.error("Error adding services:", servicesError);
      }

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Lead convertido em cliente com sucesso!');
    },
    onError: (e: any) => toast.error('Erro ao converter: ' + e.message),
  });

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      contact_name: lead.contact_name, 
      company_name: lead.company_name || '', 
      phone: lead.phone || '',
      email: lead.email || '', 
      instagram_handle: lead.instagram_handle || '', 
      source: lead.source || 'inbound',
      estimated_value: lead.estimated_value?.toString() || '', 
      notes: lead.notes || '', 
      pain_point: lead.pain_point || '',
      qualification_score: lead.qualification_score.toString(), 
      lead_tier: lead.lead_tier || 'Outro',
      cnpj: lead.cnpj || '',
      company_revenue_bracket: lead.company_revenue_bracket || '',
      initial_contact_responses: lead.initial_contact_responses || { origin: '', main_pain: '', expectations: '', how_knew: '', difficulties: '' }
    });
    setDialogOpen(true);
    setHistoryOpen(false); // Reset history view when opening dialog
  };

  const [historyOpen, setHistoryOpen] = useState(false);

  const captureUrl = `${window.location.origin}/captura-lead`;
  const copyCaptureLink = async () => {
    await navigator.clipboard.writeText(captureUrl);
    toast.success('Link público copiado!');
  };

  const renderKanbanSection = (title: string, icon: any, stagesList: Stage[], color: string, description: string) => {
    const sectionId = title.split(':')[0].trim();
    const isCollapsed = collapsedStages[sectionId];

    return (
      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div 
          className="flex items-center justify-between border-b pb-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => toggleStage(sectionId)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-${color}-500/10`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {isCollapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pt-2"
            >
              {stagesList.map(stage => {
                const stageLeads = leads.filter(l => l.stage_id === stage.id);
                const total = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
                return (
                  <div
                    key={stage.id}
                    className="flex flex-col bg-muted/5 rounded-xl border border-muted/20 overflow-hidden min-h-[400px] shadow-sm hover:shadow-md transition-all duration-300"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedLead) {
                        const lead = leads.find(l => l.id === draggedLead);
                        if (lead) handleStageChange(lead, stage.id);
                        setDraggedLead(null);
                      }
                    }}
                  >
                    <div className="p-3 border-b bg-background/50 flex items-center justify-between" style={{ borderTop: `4px solid ${stage.color}` }}>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-tight text-foreground/80">{stage.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {stageLeads.length} leads • {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-background/80 text-muted-foreground border-muted-foreground/20">{stageLeads.length}</Badge>
                    </div>

                    <div className="p-3 space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[600px]">
                      {stageLeads.map(lead => {
                        const isLost = lead.status === 'lost';
                        return (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={() => setDraggedLead(lead.id)}
                          className={`cursor-move hover:shadow-xl transition-all group relative shadow-sm ${
                            isLost
                              ? 'border-l-4 border-l-red-600 bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                              : 'border-l-4 border-l-transparent hover:border-l-primary bg-background border'
                          }`}
                        >
                          <CardContent className="p-3 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0" onClick={() => openEdit(lead)}>
                                <div className="flex flex-col gap-1.5 mb-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1">
                                      <Badge className={`h-4 px-1.5 text-[9px] font-bold ${
                                        lead.lead_tier === 'A' ? 'bg-purple-600' :
                                        lead.lead_tier === 'B' ? 'bg-blue-600' :
                                        lead.lead_tier === 'C' ? 'bg-slate-600' :
                                        lead.lead_tier === 'Desqualificado' ? 'bg-red-600' : 'bg-gray-400'
                                      } text-white border-none shadow-sm`}>
                                        Prioridade {lead.lead_tier}
                                      </Badge>
                                      {isLost && (
                                        <Badge className="h-4 px-1.5 text-[9px] font-bold bg-red-600 text-white border-none shadow-sm">
                                          Perdido
                                        </Badge>
                                      )}
                                    </div>

                                    {lead.staff_members?.full_name && (
                                      <div className="flex items-center gap-1">
                                        <UserCheck className="h-2.5 w-2.5 text-primary" />
                                        <span className="text-[9px] font-black text-primary uppercase truncate max-w-[80px]">
                                          {lead.staff_members.full_name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-bold truncate leading-none group-hover:text-primary transition-colors">{lead.contact_name}</h4>
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    </div>
                                    <StageProgressDots stagesList={stagesList} currentStageId={lead.stage_id} />
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate font-medium">{lead.company_name || 'Individual'}</p>
                                {(lead.status === 'won' || lead.cnpj || lead.email) && (
                                  <div className="flex flex-col gap-0.5 mt-1 border-t border-muted/20 pt-1">
                                    {lead.email && <p className="text-[9px] text-muted-foreground truncate italic">{lead.email}</p>}
                                    {lead.cnpj && <p className="text-[9px] text-muted-foreground truncate font-bold uppercase">CNPJ: {lead.cnpj}</p>}
                                  </div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => openEdit(lead)}>
                                    <Search className="h-3.5 w-3.5 mr-2" /> Detalhes do Lead
                                  </DropdownMenuItem>
                                  {lead.status === 'won' && !lead.client_id && (
                                    <DropdownMenuItem onClick={() => convertToClientMutation.mutate(lead)} className="text-emerald-600 font-bold">
                                      <UserCheck className="h-3.5 w-3.5 mr-2" /> Converter em Cliente
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedLeadForAction(lead);
                                    setMeetingDialogOpen(true);
                                  }}>
                                    <Calendar className="h-3.5 w-3.5 mr-2" /> Agendar Reunião
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedLeadForAction(lead);
                                    setLossDialogOpen(true);
                                  }} className="text-destructive">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Perder Lead
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-muted/30">
                              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {lead.estimated_value > 0 ? lead.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '---'}
                              </div>
                               <div className="flex gap-1">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-7 w-7 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedLeadForAction(lead);
                                     setMeetingDialogOpen(true);
                                   }}
                                 >
                                   <Calendar className="h-4 w-4" />
                                 </Button>
                                 {lead.phone && (
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       window.open(`https://wa.me/${lead.phone?.replace(/\D/g, '')}`, '_blank');
                                     }}
                                   >
                                     <MessageCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-lg text-primary hover:bg-primary/5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLeadForChat({ id: lead.id, clientId: lead.client_id || '' });
                                    setChatOpen(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                      {stageLeads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20 select-none">
                          <Target className="h-8 w-8 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Vazio</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  };

  return (
    <div className="space-y-12 max-w-full overflow-x-hidden pb-20 no-scrollbar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/80 backdrop-blur-md sticky top-0 z-30 p-4 rounded-xl border shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">MÁQUINA COMERCIAL</h2>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pipeline de Vendas Unificado</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterSdrId} onValueChange={setFilterSdrId}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-muted/30 border-none shadow-none font-semibold">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {isAdminView ? (
                <>
                  <SelectItem value="all">Todos os SDRs</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {sdrList.map((sdr: any) => (
                    <SelectItem key={sdr.id} value={sdr.id}>{sdr.full_name}</SelectItem>
                  ))}
                </>
              ) : (
                <>
                  <SelectItem value={sdrStaffId || 'all'}>Meus Leads</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncAutomations} 
            disabled={isSyncing}
            className="h-9 border-dashed"
            title="Sincronizar automações"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => { setEditingLead(null); setDialogOpen(true); }} className="h-9 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="space-y-16">
        {/* 1º Etapa: Entrada */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between border-b-2 border-orange-500/20 pb-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => toggleStage('1º Etapa')}
          >
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-orange-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">1º Etapa: Entrada</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Leads aguardando primeiro atendimento</p>
              </div>
            </div>
            {collapsedStages['1º Etapa'] ? <ChevronRight className="h-6 w-6 text-muted-foreground" /> : <ChevronDown className="h-6 w-6 text-muted-foreground" />}
          </div>
          
          <AnimatePresence>
            {!collapsedStages['1º Etapa'] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <IncomingLeads sdrStaffId={sdrStaffId} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 2º Etapa: SDR Pipeline */}
        {renderKanbanSection(
          "2º Etapa: SDR Pipeline", 
          <TrendingUp className="h-5 w-5 text-blue-500" />, 
          sdrStages, 
          "blue",
          "Qualificação e agendamento estratégico"
        )}

        {/* 3º Etapa: Closer */}
        {renderKanbanSection(
          "3º Etapa: Closer", 
          <Target className="h-5 w-5 text-emerald-500" />, 
          closerStages, 
          "emerald",
          "Fechamento e conversão final"
        )}

        {/* 4º Etapa: Recuperação */}
        {renderKanbanSection(
          "4º Etapa: Recuperação", 
          <History className="h-5 w-5 text-purple-500" />, 
          recoveryStages, 
          "purple",
          "Leads perdidos ou em processo de aquecimento"
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
              {editingLead && <Badge variant="outline" className="text-[10px] uppercase font-bold">{leads.find(l => l.id === editingLead.id)?.status}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Coluna 1: Dados e Qualificação */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-1">Informações do Lead</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Completo</Label>
                    <Input placeholder="Nome *" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Empresa / Negócio</Label>
                    <Input placeholder="Empresa" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">WhatsApp</Label>
                    <Input placeholder="WhatsApp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Instagram</Label>
                    <Input placeholder="@usuario" value={form.instagram_handle} onChange={e => setForm({ ...form, instagram_handle: e.target.value })} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail</Label>
                  <Input placeholder="E-mail" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-1">Estratégia & Faturamento</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Origem</Label>
                    <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento Empresa</Label>
                    <Select value={form.company_revenue_bracket} onValueChange={v => setForm({ ...form, company_revenue_bracket: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Faturamento" /></SelectTrigger>
                      <SelectContent>
                        {revenueOptions.map(opt => (
                          <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor Estimado Negócio</Label>
                    <Input 
                      type="number" 
                      placeholder="R$ 0,00" 
                      value={form.estimated_value} 
                      onChange={e => setForm({ ...form, estimated_value: e.target.value })} 
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">CNPJ</Label>
                  <Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Notas Internas</Label>
                  <Textarea placeholder="Observações importantes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="text-xs min-h-[80px]" />
                </div>
              </div>
            </div>

            {/* Coluna 2: Perguntas de Contato e Histórico */}
            <div className="space-y-6">
              {editingLead && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-1">Qualificação de Contato</h4>
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Como conheceu a Performake?</span>
                      <Input 
                        placeholder="..." 
                        value={form.initial_contact_responses?.origin || ''} 
                        onChange={e => setForm({ 
                          ...form, 
                          initial_contact_responses: { ...form.initial_contact_responses, origin: e.target.value } 
                        })} 
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Maior dificuldade hoje?</span>
                      <Input 
                        placeholder="..." 
                        value={form.initial_contact_responses?.main_pain || ''} 
                        onChange={e => setForm({ 
                          ...form, 
                          initial_contact_responses: { ...form.initial_contact_responses, main_pain: e.target.value } 
                        })} 
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Expectativa com o serviço?</span>
                      <Input 
                        placeholder="..." 
                        value={form.initial_contact_responses?.expectations || ''} 
                        onChange={e => setForm({ 
                          ...form, 
                          initial_contact_responses: { ...form.initial_contact_responses, expectations: e.target.value } 
                        })} 
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-9 px-0 hover:bg-transparent"
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-1 flex-1 text-left">Histórico de Atividades</h4>
                  {historyOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                </Button>
                
                <AnimatePresence>
                  {historyOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {activities.length > 0 ? activities.map((act: any) => (
                          <div key={act.id} className="flex gap-3 text-[11px] border-l-2 border-primary/20 pl-3 py-1">
                            <div className="flex-1">
                              <p className="font-bold text-foreground/80">{act.description}</p>
                              {act.outcome && <p className="text-muted-foreground italic text-[10px]">{act.outcome}</p>}
                            </div>
                            <span className="text-[9px] text-muted-foreground font-medium shrink-0">
                              {new Date(act.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground italic text-center py-4">Sem histórico registrado.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center w-full mt-6 border-t pt-4">
            <div className="flex gap-2">
              {editingLead && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive border-destructive/20 hover:bg-destructive/5 h-9"
                    onClick={() => handleDeleteWithPassword(editingLead.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir Lead
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-primary border-primary/20 hover:bg-primary/5 h-9"
                    onClick={() => {
                      setSelectedLeadForAction(editingLead);
                      setMeetingDialogOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" /> Agendar Reunião
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="h-9">Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.contact_name.trim()} className="h-9 bg-primary">
                {editingLead ? 'Atualizar Lead' : 'Cadastrar Lead'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="p-4 border-b"><DialogTitle>Chat CRM</DialogTitle></DialogHeader>
          {selectedLeadForChat && <CrmChat clientId={selectedLeadForChat.clientId} preSelectedLeadId={selectedLeadForChat.id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={lossDialogOpen} onOpenChange={setLossDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Registrar Perda</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={lossForm.reason} onValueChange={v => setLossForm({...lossForm, reason: v})}>
              <SelectTrigger><SelectValue placeholder="Motivo *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no-show">No-show</SelectItem>
                <SelectItem value="preço">Preço</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={lossForm.notes} onChange={e => setLossForm({...lossForm, notes: e.target.value})} placeholder="Detalhes..." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLossDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLossSubmit} className="bg-destructive hover:bg-destructive/90">Perder Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" /> Finalizar Venda: {selectedLeadForAction?.contact_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground">E-mail para Faturamento</Label>
                <Input value={wonForm.email} onChange={e => setWonForm({...wonForm, email: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground">CNPJ / CPF</Label>
                <Input value={wonForm.cnpj} onChange={e => setWonForm({...wonForm, cnpj: e.target.value})} placeholder="00.000.000/0000-00" className="h-9" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Serviços / Pacotes Adquiridos</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-xl bg-muted/20">
                {services.map((service: any) => {
                  const isSelected = wonForm.selected_services.some(s => s.id === service.id);
                  return (
                    <Button
                      key={service.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-auto py-2 px-3 text-left flex flex-col items-start gap-1 text-[11px]"
                      onClick={() => {
                        if (isSelected) {
                          setWonForm({...wonForm, selected_services: wonForm.selected_services.filter(s => s.id !== service.id)});
                        } else {
                          setWonForm({...wonForm, selected_services: [...wonForm.selected_services, service]});
                        }
                      }}
                    >
                      <span className="font-bold truncate w-full">{service.name}</span>
                      <span className="opacity-70">{(service.default_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Tipo de Contrato</Label>
                <Select value={wonForm.sale_type} onValueChange={v => setWonForm({...wonForm, sale_type: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MRR">Mensalidade (MRR)</SelectItem>
                    <SelectItem value="TCV">Avulso / Projeto (TCV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Tempo de Contrato (meses)</Label>
                <Input type="number" value={wonForm.contract_duration} onChange={e => setWonForm({...wonForm, contract_duration: parseInt(e.target.value)})} className="h-9" />
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Valor Total Calculado</p>
                <p className="text-xl font-black text-emerald-700">
                  {wonForm.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Badge className="bg-emerald-600">VENDA PRONTA</Badge>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setWonDialogOpen(false)}>Voltar</Button>
            <Button onClick={handleWonSubmit} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
              Registrar Venda & Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Agendar Reunião</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Input type="date" value={meetingForm.date} onChange={e => setMeetingForm({...meetingForm, date: e.target.value})} />
            <Input type="time" value={meetingForm.time} onChange={e => setMeetingForm({...meetingForm, time: e.target.value})} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleMeetingSubmit} disabled={!meetingForm.date || !meetingForm.time}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SDRPipelineKanban;
