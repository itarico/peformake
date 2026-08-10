import { useState, useMemo, memo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, DollarSign, Tag, CheckCircle2, XCircle, Edit, AlertTriangle, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VList } from 'virtua';

interface Props {
  clientId: string;
}

const statusLabels: Record<string, string> = {
  new: 'Novo',
  negotiating: 'Em Negociação',
  qualified: 'Qualificado',
  unqualified: 'Não Qualificado',
  sale_completed: 'Venda Realizada',
  sale_lost: 'Venda Perdida',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700',
  negotiating: 'bg-yellow-500/10 text-yellow-700',
  qualified: 'bg-green-500/10 text-green-700',
  unqualified: 'bg-red-500/10 text-red-700',
  sale_completed: 'bg-emerald-500/10 text-emerald-700',
  sale_lost: 'bg-gray-500/10 text-gray-700',
};

const LeadItem = memo(({ 
  lead, 
  isSelected, 
  onToggleSelect, 
  onQuickSale, 
  onQuickLost, 
  onEdit 
}: any) => {
  return (
    <Card className={isSelected ? 'ring-2 ring-primary/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(lead.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{lead.name || 'Sem nome'}</p>
                <Badge className={statusColors[lead.status] || ''}>
                  {statusLabels[lead.status] || lead.status}
                </Badge>
                {lead.source && (
                  <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{lead.phone}</p>
              {lead.sale_value && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  R$ {Number(lead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              {lead.tags?.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {lead.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {lead.status !== 'sale_completed' && lead.status !== 'sale_lost' && (
              <>
                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => onQuickSale(lead)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Venda
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onQuickLost(lead.id)}>
                  <XCircle className="h-4 w-4 mr-1" /> Perdido
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(lead)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

LeadItem.displayName = 'LeadItem';

export default function CrmLeads({ clientId }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingLead, setEditingLead] = useState<any>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [addingLead, setAddingLead] = useState(false);
  const [saleValue, setSaleValue] = useState('');
  const [notes, setNotes] = useState('');
  const [quickSaleLead, setQuickSaleLead] = useState<any>(null);
  const [quickSaleValue, setQuickSaleValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-leads', clientId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('*')
        .eq('client_id', clientId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`crm-leads-list-${clientId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'crm_leads', 
        filter: `client_id=eq.${clientId}` 
      }, (payload) => {
        // Optimistic cache update instead of full refetch
        queryClient.setQueryData(['crm-leads', clientId, statusFilter], (oldData: any[] | undefined) => {
          if (!oldData) return [];
          
          if (payload.eventType === 'INSERT') {
            if (statusFilter === 'all' || payload.new.status === statusFilter) {
              return [payload.new, ...oldData];
            }
            return oldData;
          }
          
          if (payload.eventType === 'UPDATE') {
            const updated = oldData.map(item => item.id === payload.new.id ? payload.new : item);
            if (statusFilter !== 'all' && payload.new.status !== statusFilter) {
              return updated.filter(item => item.id !== payload.new.id);
            }
            return updated;
          }
          
          if (payload.eventType === 'DELETE') {
            return oldData.filter(item => item.id !== payload.old.id);
          }
          
          return oldData;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient, statusFilter]);

  const addManualLead = async () => {
    if (!newLeadPhone) {
      toast.error('Informe o telefone');
      return;
    }
    setAddingLead(true);
    try {
      const phone = newLeadPhone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      
      const { data, error } = await supabase.from('crm_leads').upsert({
        client_id: clientId,
        phone: formattedPhone,
        name: newLeadName || null,
        status: 'new',
        last_message_at: new Date().toISOString()
      }, { onConflict: 'client_id,phone' }).select().single();

      if (error) throw error;
      
      toast.success('Lead adicionado com sucesso!');
      setShowAddLead(false);
      setNewLeadName('');
      setNewLeadPhone('');
      queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
    } catch (err: any) {
      toast.error('Erro ao adicionar lead: ' + err.message);
    } finally {
      setAddingLead(false);
    }
  };

  const fireMetaConversion = (leadId: string, status: string, saleVal?: number) => {
    supabase.functions.invoke('crm-meta-conversion-events', {
      body: { lead_id: leadId, client_id: clientId, status, sale_value: saleVal },
    }).catch(() => {});
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    const updates: any = { status };
    const parsedSaleValue = saleValue ? parseFloat(saleValue) : undefined;
    if (status === 'sale_completed' && parsedSaleValue) {
      updates.sale_value = parsedSaleValue;
      updates.sale_date = new Date().toISOString();
    }
    if (notes) updates.notes = notes;

    await supabase.from('crm_leads').update(updates).eq('id', leadId);
    if (status === 'sale_completed' && parsedSaleValue) {
      await supabase.from('crm_sales').insert({
        lead_id: leadId,
        client_id: clientId,
        value: parsedSaleValue,
        sale_date: new Date().toISOString(),
        is_confirmed: true,
      } as any);
    }
    toast.success('Lead atualizado!');
    setEditingLead(null);
    setSaleValue('');
    setNotes('');
    fireMetaConversion(leadId, status, parsedSaleValue);
    // Real-time listener will handle the update
  };

  const quickMarkSale = async () => {
    if (!quickSaleLead) return;
    if (!quickSaleValue || parseFloat(quickSaleValue) <= 0) {
      toast.error('Informe o valor da venda');
      return;
    }
    const val = parseFloat(quickSaleValue);
    await supabase.from('crm_sales').insert({
      lead_id: quickSaleLead.id, client_id: clientId, value: val,
      sale_date: new Date().toISOString(), is_confirmed: true,
    } as any);
    await supabase.from('crm_leads').update({
      status: 'sale_completed', sale_value: val, sale_date: new Date().toISOString(),
    }).eq('id', quickSaleLead.id);
    fireMetaConversion(quickSaleLead.id, 'sale_completed', val);
    toast.success('Venda registrada!');
    setQuickSaleLead(null);
    setQuickSaleValue('');
    queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
  };

  const quickMarkLost = async (leadId: string) => {
    await supabase.from('crm_leads').update({ status: 'sale_lost' }).eq('id', leadId);
    fireMetaConversion(leadId, 'sale_lost');
    toast.success('Lead marcado como perdido');
    queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => leads.filter(l =>
    !filter || (l.name || l.phone).toLowerCase().includes(filter.toLowerCase())
  ), [leads, filter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const executeBulkAction = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    if (bulkAction === 'delete') {
      setConfirmDelete(true);
      return;
    }

    if (bulkAction === 'clear_history') {
      for (const id of ids) {
        await supabase.from('crm_messages').delete().eq('lead_id', id);
        await supabase.from('crm_message_classifications').delete().eq('lead_id', id);
      }
      toast.success(`Histórico limpo de ${ids.length} contato(s)`);
      setSelectedIds(new Set());
      setBulkAction('');
      return;
    }

    if (['new', 'qualified', 'unqualified', 'negotiating', 'sale_lost'].includes(bulkAction)) {
      await supabase.from('crm_leads').update({ status: bulkAction }).in('id', ids);
      toast.success(`${ids.length} lead(s) atualizados para "${statusLabels[bulkAction]}"`);
      setSelectedIds(new Set());
      setBulkAction('');
      queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
      return;
    }
  };

  const confirmBulkDelete = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await Promise.all([
        supabase.from('crm_messages').delete().eq('lead_id', id),
        supabase.from('crm_message_classifications').delete().eq('lead_id', id),
        supabase.from('crm_sales').delete().eq('lead_id', id),
        supabase.from('crm_lead_activities').delete().eq('lead_id', id),
        supabase.from('crm_lead_scores').delete().eq('lead_id', id),
        supabase.from('crm_lead_summaries').delete().eq('lead_id', id),
        supabase.from('crm_decision_logs').delete().eq('lead_id', id),
        supabase.from('crm_flow_sessions').delete().eq('lead_id', id)
      ]);
    }
    await supabase.from('crm_leads').delete().in('id', ids);
    toast.success(`${ids.length} contato(s) excluído(s) com todo histórico`);
    setSelectedIds(new Set());
    setBulkAction('');
    setConfirmDelete(false);
    setDeleting(false);
    queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone (com DDD)</Label>
                <Input
                  id="phone"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="Ex: 11999999999"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={addManualLead} disabled={addingLead}>
                {addingLead ? 'Salvando...' : 'Salvar Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filtered.length > 0 && selectedIds.size === filtered.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : 'Selecionar todos'}
          </span>
        </div>
        {selectedIds.size > 0 && (
          <>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Ação em massa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clear_history">🗑️ Limpar histórico</SelectItem>
                <SelectItem value="delete">❌ Excluir contatos</SelectItem>
                <SelectItem value="new">→ Marcar como Novo</SelectItem>
                <SelectItem value="qualified">→ Marcar como Qualificado</SelectItem>
                <SelectItem value="unqualified">→ Marcar como Não Qualificado</SelectItem>
                <SelectItem value="negotiating">→ Marcar como Em Negociação</SelectItem>
                <SelectItem value="sale_lost">→ Marcar como Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={executeBulkAction} disabled={!bulkAction}>
              Executar
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <VList style={{ height: '70vh' }}>
            {filtered.map((lead) => (
              <div key={lead.id} className="pb-3 px-1">
                <LeadItem
                  lead={lead}
                  isSelected={selectedIds.has(lead.id)}
                  onToggleSelect={toggleSelect}
                  onQuickSale={setQuickSaleLead}
                  onQuickLost={quickMarkLost}
                  onEdit={setEditingLead}
                />
              </div>
            ))}
          </VList>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum lead encontrado</p>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={!!quickSaleLead} onOpenChange={(o) => { if (!o) { setQuickSaleLead(null); setQuickSaleValue(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Venda — {quickSaleLead?.name || quickSaleLead?.phone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor da Venda (R$)</label>
              <Input type="number" value={quickSaleValue} onChange={(e) => setQuickSaleValue(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={quickMarkSale}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLead} onOpenChange={(o) => !o && setEditingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lead — {editingLead?.name || editingLead?.phone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select defaultValue={editingLead?.status} onValueChange={(v) => setEditingLead({ ...editingLead, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingLead?.status === 'sale_completed' && (
              <div>
                <label className="text-sm font-medium">Valor da Venda (R$)</label>
                <Input type="number" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea value={notes || editingLead?.notes || ''} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." />
            </div>
            <Button className="w-full" onClick={() => updateLeadStatus(editingLead.id, editingLead.status)}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir {selectedIds.size} contato(s)?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação irá remover permanentemente os contatos selecionados e todo o histórico. Não é possível desfazer.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
