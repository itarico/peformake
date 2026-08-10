/**
 * CrmFlowBuilder — Flow list + visual canvas editor
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import FlowCanvas from './flow-canvas/FlowCanvas';

interface Props { clientId: string; }

interface Flow {
  id: string; name: string; description: string | null;
  trigger_type: string; trigger_value: string | null; is_active: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual', message: 'Mensagem recebida', keyword: 'Palavra-chave', link: 'Link',
};

export default function CrmFlowBuilder({ clientId }: Props) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState('manual');
  const [newFlowKeyword, setNewFlowKeyword] = useState('');
  const [nodeCounts, setNodeCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadFlows(); }, [clientId]);

  const loadFlows = async () => {
    const { data } = await supabase.from('crm_flows').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setFlows((data as Flow[]) || []);
    setLoading(false);
    if (data?.length) {
      const { data: allNodes } = await supabase.from('crm_flow_nodes').select('flow_id').in('flow_id', data.map((f: any) => f.id));
      const counts: Record<string, number> = {};
      (allNodes || []).forEach((n: any) => { counts[n.flow_id] = (counts[n.flow_id] || 0) + 1; });
      setNodeCounts(counts);
    }
  };

  const createFlow = async () => {
    if (!newFlowName.trim()) return;
    const { data, error } = await supabase.from('crm_flows').insert({
      client_id: clientId, name: newFlowName.trim(), description: newFlowDesc.trim() || null,
      trigger_type: newFlowTrigger, trigger_value: newFlowTrigger === 'keyword' ? newFlowKeyword.trim() : null,
    }).select().single();
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Fluxo criado!');
    setNewFlowName(''); setNewFlowDesc(''); setNewFlowKeyword(''); setShowCreateDialog(false);
    loadFlows();
    if (data) setSelectedFlow(data as Flow);
  };

  const deleteFlow = async (id: string) => {
    if (!confirm('Excluir este fluxo e todos seus blocos?')) return;
    await supabase.from('crm_flow_nodes').delete().eq('flow_id', id);
    await supabase.from('crm_flows').delete().eq('id', id);
    if (selectedFlow?.id === id) setSelectedFlow(null);
    loadFlows();
    toast.success('Fluxo excluído');
  };

  const toggleFlowActive = async (flow: Flow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await supabase.from('crm_flows').update({ is_active: !flow.is_active }).eq('id', flow.id);
    loadFlows();
    if (selectedFlow?.id === flow.id) setSelectedFlow({ ...flow, is_active: !flow.is_active });
    toast.success(flow.is_active ? 'Fluxo desativado' : 'Fluxo ativado');
  };

  // ─── VISUAL CANVAS EDITOR ───
  if (selectedFlow) {
    return (
      <div className="h-[calc(100vh-200px)] py-2">
        <FlowCanvas
          flowId={selectedFlow.id}
          flowName={selectedFlow.name}
          flowIsActive={selectedFlow.is_active}
          clientId={clientId}
          onBack={() => setSelectedFlow(null)}
        />
      </div>
    );
  }

  // ─── FLOW LIST ───
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Fluxos Conversacionais</h2>
          <p className="text-xs text-muted-foreground">Automações visuais com blocos conectados por linhas</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Criar Novo Fluxo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Nome do Fluxo</Label>
                <Input placeholder="Ex: Boas-vindas, Qualificação" value={newFlowName} onChange={e => setNewFlowName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Descrição (opcional)</Label>
                <Textarea placeholder="Objetivo deste fluxo..." value={newFlowDesc} onChange={e => setNewFlowDesc(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium">Gatilho de Ativação</Label>
                <Select value={newFlowTrigger} onValueChange={setNewFlowTrigger}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="message">Qualquer mensagem</SelectItem>
                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                    <SelectItem value="link">Clique em link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newFlowTrigger === 'keyword' && (
                <div>
                  <Label className="text-xs font-medium">Palavra-chave</Label>
                  <Input placeholder="Ex: oi, preço, cardápio" value={newFlowKeyword} onChange={e => setNewFlowKeyword(e.target.value)} />
                </div>
              )}
              <Button onClick={createFlow} className="w-full" disabled={!newFlowName.trim()}>Criar Fluxo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando fluxos...</div>
      ) : flows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <GitBranch className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium">Nenhum fluxo criado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie fluxos para automatizar conversas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flows.map(flow => (
            <Card key={flow.id} className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group" onClick={() => setSelectedFlow(flow)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${flow.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <GitBranch className={`h-5 w-5 ${flow.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{flow.name}</p>
                      <Badge variant={flow.is_active ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                        {flow.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {flow.description && <p className="text-xs text-muted-foreground truncate">{flow.description}</p>}
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                        {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">{nodeCounts[flow.id] || 0} blocos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <Switch checked={flow.is_active} onCheckedChange={() => toggleFlowActive(flow)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteFlow(flow.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
