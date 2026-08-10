import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Users, Copy, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: '1º Contato' },
  { value: 'negotiating', label: 'Em Negociação' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'unqualified', label: 'Não Qualificado' },
  { value: 'sale_completed', label: 'Venda Realizada' },
  { value: 'sale_lost', label: 'Venda Perdida' },
];

interface TrafficAudiencesPanelProps { clientId?: string }

export function TrafficAudiencesPanel({ clientId: propClientId }: TrafficAudiencesPanelProps = {}) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string>(propClientId || '');
  const [createDialog, setCreateDialog] = useState(false);
  const [lookalikeDialog, setLookalikeDialog] = useState<{ open: boolean; sourceId: string; sourceName: string }>({ open: false, sourceId: '', sourceName: '' });

  // Form state
  const [audienceName, setAudienceName] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [lookalikeName, setLookalikeName] = useState('');
  const [lookalikeRatio, setLookalikeRatio] = useState('1');

  // Fetch clients with tráfego service
  const { data: trafficClients = [] } = useQuery({
    queryKey: ['traffic-audiences-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, clients(id, name, is_active), services!inner(slug)')
        .eq('is_active', true)
        .eq('services.slug', 'trafego');
      if (error) throw error;
      return (data || []).filter((cs: any) => cs.clients?.is_active).map((cs: any) => cs.clients);
    },
  });

  // Fetch audiences for selected client
  const { data: audiences = [], isLoading: audiencesLoading } = useQuery({
    queryKey: ['traffic-audiences', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase.functions.invoke('meta-ads-audiences', {
        body: { action: 'list', client_id: selectedClientId },
      });
      if (error) throw error;
      return data?.audiences || [];
    },
    enabled: !!selectedClientId,
  });

  // Fetch lead count for preview
  const { data: leadCount = 0 } = useQuery({
    queryKey: ['traffic-audience-lead-count', selectedClientId, selectedStatuses],
    queryFn: async () => {
      if (!selectedClientId) return 0;
      let query = supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('client_id', selectedClientId);
      if (selectedStatuses.length > 0) query = query.in('status', selectedStatuses);
      const { count } = await query;
      return count || 0;
    },
    enabled: !!selectedClientId && createDialog,
  });

  const createAudienceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-audiences', {
        body: {
          action: 'create_from_crm',
          client_id: selectedClientId,
          name: audienceName,
          description: audienceDesc,
          lead_statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-audiences'] });
      toast.success(`Público criado com ${data.leads_uploaded} leads enviados ao Meta!`);
      setCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const createLookalikeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-audiences', {
        body: {
          action: 'create_lookalike',
          client_id: selectedClientId,
          source_audience_db_id: lookalikeDialog.sourceId,
          name: lookalikeName,
          country: 'BR',
          ratio: parseFloat(lookalikeRatio) / 100,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-audiences'] });
      toast.success('Público Lookalike criado com sucesso!');
      setLookalikeDialog({ open: false, sourceId: '', sourceName: '' });
      setLookalikeName('');
      setLookalikeRatio('1');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const deleteAudienceMutation = useMutation({
    mutationFn: async (audienceDbId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-audiences', {
        body: { action: 'delete', client_id: selectedClientId, audience_db_id: audienceDbId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-audiences'] });
      toast.success('Público removido.');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  function resetForm() {
    setAudienceName('');
    setAudienceDesc('');
    setSelectedStatuses([]);
  }

  function toggleStatus(status: string) {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }

  const customAudiences = audiences.filter((a: any) => a.audience_type === 'custom');
  const lookalikeAudiences = audiences.filter((a: any) => a.audience_type === 'lookalike');

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {trafficClients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClientId && (
          <Button onClick={() => setCreateDialog(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Criar Público do CRM
          </Button>
        )}
      </div>

      {!selectedClientId && (
        <Card>
          <CardContent className="p-8 text-center">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Selecione um cliente para gerenciar seus públicos personalizados.</p>
          </CardContent>
        </Card>
      )}

      {selectedClientId && audiencesLoading && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {selectedClientId && !audiencesLoading && (
        <>
          {/* Custom Audiences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Públicos Personalizados
              </CardTitle>
              <CardDescription>Baseados nos leads do CRM — telefones enviados ao Meta (hashed).</CardDescription>
            </CardHeader>
            <CardContent>
              {customAudiences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum público personalizado criado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {customAudiences.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{a.lead_count} leads</Badge>
                          <span className="text-xs text-muted-foreground">ID: {a.audience_id_external}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLookalikeDialog({ open: true, sourceId: a.id, sourceName: a.name });
                            setLookalikeName(`Lookalike - ${a.name}`);
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" /> Lookalike
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Excluir o público "${a.name}"? Isso também remove do Meta.`)) {
                              deleteAudienceMutation.mutate(a.id);
                            }
                          }}
                          disabled={deleteAudienceMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lookalike Audiences */}
          {lookalikeAudiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4" /> Públicos Semelhantes (Lookalike)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lookalikeAudiences.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {a.lookalike_country} — {((a.lookalike_ratio || 0.01) * 100).toFixed(0)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">ID: {a.audience_id_external}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Excluir o público "${a.name}"?`)) {
                            deleteAudienceMutation.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Custom Audience Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Público Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do público</Label>
              <Input value={audienceName} onChange={e => setAudienceName(e.target.value)} placeholder="Ex: Leads Qualificados - Jan 2026" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={audienceDesc} onChange={e => setAudienceDesc(e.target.value)} placeholder="Descrição do público" rows={2} />
            </div>
            <div>
              <Label className="mb-2 block">Filtrar por status do lead</Label>
              <p className="text-xs text-muted-foreground mb-2">Deixe vazio para incluir todos os leads.</p>
              <div className="grid grid-cols-2 gap-2">
                {LEAD_STATUS_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedStatuses.includes(opt.value)}
                      onCheckedChange={() => toggleStatus(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">
                {leadCount} leads serão enviados ao Meta
              </p>
              <p className="text-xs text-muted-foreground">Os telefones são anonimizados com SHA-256 antes do envio.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); resetForm(); }}>Cancelar</Button>
            <Button
              onClick={() => createAudienceMutation.mutate()}
              disabled={!audienceName || leadCount === 0 || createAudienceMutation.isPending}
            >
              {createAudienceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Público ({leadCount} leads)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Lookalike Dialog */}
      <Dialog open={lookalikeDialog.open} onOpenChange={(o) => setLookalikeDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Público Semelhante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Público de origem:</p>
              <p className="text-sm font-medium">{lookalikeDialog.sourceName}</p>
            </div>
            <div>
              <Label>Nome do público lookalike</Label>
              <Input value={lookalikeName} onChange={e => setLookalikeName(e.target.value)} placeholder="Ex: Lookalike 1% - Leads Qualificados" />
            </div>
            <div>
              <Label>Porcentagem de semelhança</Label>
              <Select value={lookalikeRatio} onValueChange={setLookalikeRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1% (Mais semelhante)</SelectItem>
                  <SelectItem value="2">2%</SelectItem>
                  <SelectItem value="3">3%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10% (Maior alcance)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Valores menores = mais semelhantes ao público de origem.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLookalikeDialog({ open: false, sourceId: '', sourceName: '' })}>Cancelar</Button>
            <Button
              onClick={() => createLookalikeMutation.mutate()}
              disabled={!lookalikeName || createLookalikeMutation.isPending}
            >
              {createLookalikeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lookalike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
