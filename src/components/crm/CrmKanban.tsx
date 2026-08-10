import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, ChevronLeft, DollarSign, Phone, Eye, Clock, MessageSquare,
  AlertTriangle, Search, Filter, TrendingUp, Users, Target, X
} from 'lucide-react';
import { VList } from 'virtua';
import CrmLeadProfile from './CrmLeadProfile';
import CrmLeadTimeline from './CrmLeadTimeline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  clientId: string;
  onViewConversation?: (leadId: string) => void;
}

const STAGES = [
  { key: 'new', label: '1º Contato', emoji: '👋', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-500/10', headerGradient: 'from-blue-500/10 to-blue-500/5' },
  { key: 'negotiating', label: 'Negociação', emoji: '💬', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400', bgLight: 'bg-amber-50 dark:bg-amber-500/10', headerGradient: 'from-amber-500/10 to-amber-500/5' },
  { key: 'qualified', label: 'Qualificado', emoji: '🎯', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-500/10', headerGradient: 'from-green-500/10 to-green-500/5' },
  { key: 'meeting_scheduled', label: 'Agendado', emoji: '📅', color: 'bg-indigo-500', textColor: 'text-indigo-700 dark:text-indigo-400', bgLight: 'bg-indigo-50 dark:bg-indigo-500/10', headerGradient: 'from-indigo-500/10 to-indigo-500/5' },
  { key: 'show_up', label: 'Show-up', emoji: '🤝', color: 'bg-cyan-500', textColor: 'text-cyan-700 dark:text-cyan-400', bgLight: 'bg-cyan-50 dark:bg-cyan-500/10', headerGradient: 'from-cyan-500/10 to-cyan-500/5' },
  { key: 'no_show', label: 'No-show', emoji: '🚫', color: 'bg-rose-500', textColor: 'text-rose-700 dark:text-rose-400', bgLight: 'bg-rose-50 dark:bg-rose-500/10', headerGradient: 'from-rose-500/10 to-rose-500/5' },
  { key: 'sale_completed', label: 'Venda ✓', emoji: '🏆', color: 'bg-emerald-600', textColor: 'text-emerald-700 dark:text-emerald-400', bgLight: 'bg-emerald-50 dark:bg-emerald-500/10', headerGradient: 'from-emerald-500/10 to-emerald-500/5' },
  { key: 'sale_lost', label: 'Perdido', emoji: '💤', color: 'bg-gray-500', textColor: 'text-gray-600 dark:text-gray-400', bgLight: 'bg-gray-50 dark:bg-gray-500/10', headerGradient: 'from-gray-500/10 to-gray-500/5' },
];

const LeadCard = memo(({ 
  lead, 
  lastMsg, 
  urgency, 
  myTags, 
  idx, 
  stagesLength, 
  onMove, 
  onProfile, 
  onTimeline, 
  onViewConversation 
}: any) => {
  return (
    <Card className={`shadow-sm transition-all hover:shadow-md cursor-pointer ${
      urgency === 'urgent' ? 'border-red-400 bg-red-50/50 dark:bg-red-500/5' :
      urgency === 'warning' ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-500/5' : ''
    }`} onClick={() => onProfile(lead)}>
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={lead.avatar_url || undefined} alt={lead.name || lead.phone} />
            <AvatarFallback className={`text-[10px] ${
              urgency === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              urgency === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-primary/10 text-primary'
            }`}>
              {(lead.name || '?')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-xs truncate block">{lead.name || 'Sem nome'}</span>
            <span className="text-[10px] text-muted-foreground truncate block">{lead.phone}</span>
          </div>
          {urgency === 'urgent' && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
        </div>

        {lastMsg && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 bg-muted/50 rounded px-2 py-1">
            {lastMsg.direction === 'inbound' ? '👤 ' : '💬 '}
            {lastMsg.message_type !== 'text' ? `📎 ${lastMsg.message_type}` : (lastMsg.content || '').slice(0, 60)}
          </p>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          {lead.sale_value > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20">
              R$ {Number(lead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </Badge>
          )}
          {myTags.slice(0, 2).map((t: any) => (
            <Badge
              key={t.id}
              className="text-[8px] px-1 py-0 font-normal border-0"
              style={{ backgroundColor: `${t.color}20`, color: t.color }}
            >
              {t.name}
            </Badge>
          ))}
          {lastMsg && (
            <span className="text-[9px] text-muted-foreground/60 ml-auto">
              {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false, locale: ptBR })}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-border/20">
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
            disabled={idx <= 0}
            onClick={(e) => { e.stopPropagation(); onMove(lead, idx - 1); }}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <div className="flex items-center gap-0.5">
            {onViewConversation && (
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] gap-0.5"
                onClick={(e) => { e.stopPropagation(); onViewConversation(lead.id); }}
              >
                <MessageSquare className="h-2.5 w-2.5" /> Chat
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
              onClick={(e) => { e.stopPropagation(); onTimeline(lead); }}
            >
              <Clock className="h-2.5 w-2.5" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
            disabled={idx >= stagesLength - 1}
            onClick={(e) => { e.stopPropagation(); onMove(lead, idx + 1); }}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

LeadCard.displayName = 'LeadCard';

export default function CrmKanban({ clientId, onViewConversation }: Props) {
  const queryClient = useQueryClient();
  const [saleDialog, setSaleDialog] = useState<any>(null);
  const [saleValue, setSaleValue] = useState('');
  const [saleProduct, setSaleProduct] = useState('');
  const [profileLead, setProfileLead] = useState<any>(null);
  const [timelineLead, setTimelineLead] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');

  const { data: kanbanData, refetch: loadData } = useQuery({
    queryKey: ['crm-kanban', clientId],
    queryFn: async () => {
      const [{ data: leadsData }, { data: sumData }, { data: salesData }, { data: tagsData }] = await Promise.all([
        supabase.from('crm_leads').select('*').eq('client_id', clientId).order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase.from('crm_lead_summaries').select('*').eq('client_id', clientId).order('analyzed_at', { ascending: false }),
        supabase.from('crm_sales').select('*').eq('client_id', clientId).order('sale_date', { ascending: false }),
        supabase.from('crm_tags').select('*').eq('client_id', clientId),
      ]);

      const leadIds = leadsData?.map((l: any) => l.id) || [];
      let msgMap: Record<string, any> = {};
      let ltMap: Record<string, string[]> = {};

      if (leadIds.length) {
        const [{ data: msgs }, { data: ltData }] = await Promise.all([
          supabase.from('crm_messages').select('lead_id, content, direction, created_at, message_type').in('lead_id', leadIds).order('created_at', { ascending: false }).limit(1000),
          supabase.from('crm_lead_tags').select('lead_id, tag_id').in('lead_id', leadIds),
        ]);
        
        (msgs || []).forEach((m: any) => { if (!msgMap[m.lead_id]) msgMap[m.lead_id] = m; });
        (ltData || []).forEach((lt: any) => {
          if (!ltMap[lt.lead_id]) ltMap[lt.lead_id] = [];
          ltMap[lt.lead_id].push(lt.tag_id);
        });
      }

      const summariesMap: Record<string, any> = {};
      (sumData || []).forEach((s: any) => { if (!summariesMap[s.lead_id]) summariesMap[s.lead_id] = s; });

      return {
        leads: leadsData || [],
        summaries: summariesMap,
        sales: salesData || [],
        tags: tagsData || [],
        lastMessages: msgMap,
        leadTags: ltMap
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const leads = kanbanData?.leads || [];
  const summaries = kanbanData?.summaries || {};
  const lastMessages = kanbanData?.lastMessages || {};
  const sales = kanbanData?.sales || [];
  const tags = kanbanData?.tags || [];
  const leadTags = kanbanData?.leadTags || {};

  useEffect(() => {
    const ch = supabase.channel('kanban-leads-' + clientId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `client_id=eq.${clientId}` }, (payload: any) => {
        queryClient.setQueryData(['crm-kanban', clientId], (old: any) => {
          if (!old) return old;
          let newLeads = [...old.leads];
          
          if (payload.eventType === 'INSERT') {
            newLeads = [payload.new, ...newLeads];
          } else if (payload.eventType === 'UPDATE') {
            newLeads = newLeads.map(l => l.id === payload.new.id ? payload.new : l);
          } else if (payload.eventType === 'DELETE') {
            newLeads = newLeads.filter(l => l.id !== payload.old.id);
          }
          
          return { ...old, leads: newLeads };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_messages' }, (payload: any) => {
        queryClient.setQueryData(['crm-kanban', clientId], (old: any) => {
          if (!old) return old;
          const leadIds = new Set(old.leads.map((l: any) => l.id));
          
          if (payload.new && payload.new.lead_id && leadIds.has(payload.new.lead_id)) {
            const newLastMessages = { ...old.lastMessages };
            const existingMsg = newLastMessages[payload.new.lead_id];
            
            if (!existingMsg || new Date(payload.new.created_at) >= new Date(existingMsg.created_at)) {
              newLastMessages[payload.new.lead_id] = payload.new;
              return { ...old, lastMessages: newLastMessages };
            }
          }
          return old;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, queryClient]);

  const moveLead = useCallback(async (lead: any, newIdx: number) => {
    const newStatus = STAGES[newIdx]?.key;
    if (!newStatus) return;

    if (newStatus === 'sale_completed') {
      setSaleDialog(lead);
      setSaleValue('');
      setSaleProduct('');
      return;
    }
    await supabase.from('crm_leads').update({ status: newStatus }).eq('id', lead.id);
    toast.success('Lead movido!');
    queryClient.invalidateQueries({ queryKey: ['crm-kanban', clientId] });
  }, [clientId, queryClient]);

  const confirmSale = async () => {
    if (!saleDialog || !saleValue) { toast.error('Informe o valor'); return; }
    const value = parseFloat(saleValue);
    await supabase.from('crm_sales').insert({
      lead_id: saleDialog.id, 
      client_id: clientId, 
      value,
      product_name: saleProduct || null, 
      sale_date: new Date().toISOString(),
      is_confirmed: true,
      referred_by_member_id: saleDialog.referred_by_member_id || null,
    } as any);
    await supabase.from('crm_leads').update({
      status: 'sale_completed',
      sale_value: (saleDialog.sale_value || 0) + value,
      sale_date: new Date().toISOString(),
    }).eq('id', saleDialog.id);
    toast.success('Venda registrada!');
    setSaleDialog(null);
    queryClient.invalidateQueries({ queryKey: ['crm-kanban', clientId] });
  };

  const stageIdx = (status: string) => STAGES.findIndex(s => s.key === status);

  const getUrgencyLevel = useCallback((leadId: string): 'urgent' | 'warning' | 'normal' => {
    const lastMsg = lastMessages[leadId];
    if (!lastMsg) return 'normal';
    if (lastMsg.direction !== 'inbound') return 'normal';
    const elapsed = Date.now() - new Date(lastMsg.created_at).getTime();
    if (elapsed > 2 * 60 * 60 * 1000) return 'urgent';
    if (elapsed > 30 * 60 * 1000) return 'warning';
    return 'normal';
  }, [lastMessages]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q)
      );
    }
    if (filterTag !== 'all') {
      result = result.filter(l => (leadTags[l.id] || []).includes(filterTag));
    }
    return result;
  }, [leads, searchQuery, filterTag, leadTags]);

  const stageStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {};
    STAGES.forEach(s => { stats[s.key] = { count: 0, value: 0 }; });
    filteredLeads.forEach(l => {
      if (stats[l.status]) {
        stats[l.status].count++;
        stats[l.status].value += Number(l.sale_value || 0);
      }
    });
    return stats;
  }, [filteredLeads]);

  const pipelineValue = useMemo(() => {
    return filteredLeads
      .filter(l => !['sale_completed', 'sale_lost'].includes(l.status))
      .reduce((sum, l) => sum + Number(l.sale_value || 0), 0);
  }, [filteredLeads]);

  const totalLeads = filteredLeads.length;
  const urgentLeads = useMemo(() => 
    filteredLeads.filter(l => getUrgencyLevel(l.id) === 'urgent').length
  , [filteredLeads, getUrgencyLevel]);

  return (
    <TooltipProvider>
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalLeads}</span>
            <span className="text-muted-foreground">leads</span>
          </div>
          {pipelineValue > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                R$ {pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
              <span className="text-emerald-600/70">no funil</span>
            </div>
          )}
          {urgentLeads > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-red-600">{urgentLeads}</span>
              <span className="text-red-500/70">sem resposta</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar lead..."
                className="h-8 pl-8 pr-8 w-44 text-xs"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {tags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tags</SelectItem>
                  {tags.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color || '#888' }} />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.status === stage.key);
            const stat = stageStats[stage.key];
            const maxValue = Math.max(...Object.values(stageStats).map(s => s.value), 1);
            const valuePercent = stat.value > 0 ? (stat.value / maxValue) * 100 : 0;

            return (
              <div key={stage.key} className="min-w-[260px] w-[260px] flex-shrink-0 snap-start flex flex-col">
                <div className={`rounded-t-lg px-3 py-2 bg-gradient-to-b ${stage.headerGradient} border border-b-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{stage.emoji}</span>
                      <h3 className={`font-semibold text-xs ${stage.textColor}`}>{stage.label}</h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold h-4 px-1.5">{stat.count}</Badge>
                  </div>
                  {stat.value > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <DollarSign className="h-2.5 w-2.5" />
                        R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                      <Progress value={valuePercent} className="h-0.5 flex-1" />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto border border-t-0 rounded-b-lg bg-muted/20 max-h-[calc(100vh-320px)]">
                  {stageLeads.length > 0 ? (
                    <VList style={{ height: 'calc(100vh - 350px)' }} className="px-1.5 py-1.5">
                      {stageLeads.map((lead) => {
                        const idx = stageIdx(lead.status);
                        const lastMsg = lastMessages[lead.id];
                        const urgency = getUrgencyLevel(lead.id);
                        const myTags = (leadTags[lead.id] || []).map(tid => tags.find((t: any) => t.id === tid)).filter(Boolean);

                        return (
                          <div key={lead.id} className="pb-1.5">
                            <LeadCard
                              lead={lead}
                              lastMsg={lastMsg}
                              urgency={urgency}
                              myTags={myTags}
                              idx={idx}
                              stagesLength={STAGES.length}
                              onMove={moveLead}
                              onProfile={setProfileLead}
                              onTimeline={setTimelineLead}
                              onViewConversation={onViewConversation}
                            />
                          </div>
                        );
                      })}
                    </VList>
                  ) : (
                    <div className="text-center py-6">
                      <Target className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">Nenhum lead</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!saleDialog} onOpenChange={(o) => { if (!o) setSaleDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Venda — {saleDialog?.name || saleDialog?.phone}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor da Venda (R$)</label>
                <Input type="number" value={saleValue} onChange={e => setSaleValue(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Produto/Serviço (opcional)</label>
                <Input value={saleProduct} onChange={e => setSaleProduct(e.target.value)} placeholder="Ex: Consultoria Premium" />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={confirmSale}>
                Confirmar Venda
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!timelineLead} onOpenChange={(o) => { if (!o) setTimelineLead(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Timeline — {timelineLead?.name || timelineLead?.phone}
              </DialogTitle>
            </DialogHeader>
            {timelineLead && <CrmLeadTimeline leadId={timelineLead.id} clientId={clientId} />}
          </DialogContent>
        </Dialog>

        {profileLead && (
          <CrmLeadProfile
            open={!!profileLead}
            onOpenChange={(o) => { if (!o) setProfileLead(null); }}
            lead={profileLead}
            summary={summaries[profileLead.id]}
            sales={sales.filter(s => s.lead_id === profileLead.id)}
            onReload={loadData}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
