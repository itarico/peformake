import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, Loader2, Users, CheckCircle2, XCircle, Clock, Megaphone, Trash2, ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Props { clientId: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  sending: { label: 'Enviando...', color: 'bg-blue-500' },
  completed: { label: 'Concluída', color: 'bg-emerald-500' },
  failed: { label: 'Falhou', color: 'bg-red-500' },
  paused: { label: 'Pausada', color: 'bg-amber-500' },
};

export default function CrmCampaigns({ clientId }: Props) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [sending, setSending] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('crm_campaigns')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const loadLeadCount = async (status: string) => {
    let query = supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId);
    if (status !== 'all') query = query.eq('status', status);
    const { count } = await query;
    setLeadCount(count || 0);
  };

  useEffect(() => { loadCampaigns(); }, [clientId]);
  useEffect(() => { loadLeadCount(filterStatus); }, [filterStatus, clientId]);

  const createCampaign = async () => {
    if (!name.trim() || !message.trim()) { toast.error('Preencha nome e mensagem'); return; }
    setCreating(true);
    const filter_criteria = filterStatus !== 'all' ? { status: filterStatus } : {};
    const { error } = await supabase.from('crm_campaigns').insert({
      client_id: clientId, name: name.trim(), message: message.trim(),
      filter_criteria, total_count: leadCount, status: 'draft',
      media_url: mediaUrl || null, media_type: mediaUrl ? mediaType : null,
    });
    if (error) { toast.error('Erro: ' + error.message); }
    else { toast.success('Campanha criada!'); setShowCreate(false); setName(''); setMessage(''); setMediaUrl(''); loadCampaigns(); }
    setCreating(false);
  };

  const handleUploadCampaignMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 10MB'); return; }
    setUploadingMedia(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `campaigns/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('crm-media').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('crm-media').getPublicUrl(path);
      setMediaUrl(publicUrl);
      if (file.type.startsWith('video/')) setMediaType('video');
      else if (file.type.startsWith('image/')) setMediaType('image');
      else setMediaType('document');
      toast.success('Mídia enviada!');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const startCampaign = async (id: string) => {
    setSending(id);
    try {
      const { error } = await supabase.functions.invoke('crm-campaign-sender', {
        body: { campaign_id: id, client_id: clientId },
      });
      if (error) throw error;
      toast.success('🚀 Campanha iniciada! Enviando mensagens...');
      loadCampaigns();
    } catch (e: any) {
      toast.error('Erro ao iniciar: ' + (e.message || 'tente novamente'));
    }
    setSending(null);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    await supabase.from('crm_campaigns').delete().eq('id', id);
    loadCampaigns();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Campanhas em Massa</h3>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Nova Campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma campanha criada.</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira campanha para enviar mensagens em massa.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const st = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
            const progress = c.total_count > 0 ? Math.round((c.sent_count / c.total_count) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <div className={`h-2 w-2 rounded-full ${st.color}`} />
                        <span className="text-[10px] text-muted-foreground">{st.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.message}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {c.total_count} leads</span>
                        <span className="flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> {c.sent_count} enviadas</span>
                        {c.failed_count > 0 && <span className="flex items-center gap-0.5 text-red-500"><XCircle className="h-3 w-3" /> {c.failed_count} falhas</span>}
                      </div>
                      {c.status === 'sending' && (
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.status === 'draft' && (
                        <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => startCampaign(c.id)} disabled={sending === c.id}>
                          {sending === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Enviar
                        </Button>
                      )}
                      {c.status === 'draft' && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Promoção de Natal" />
            </div>
            <div>
              <label className="text-sm font-medium">Filtrar leads por status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os leads</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="negotiating">Em Negociação</SelectItem>
                  <SelectItem value="qualified">Qualificados</SelectItem>
                  <SelectItem value="sale_completed">Venda Concluída</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                <Users className="h-3 w-3 inline mr-0.5" /> {leadCount} leads serão impactados
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Olá! Temos uma promoção especial..." className="min-h-[100px]" />
              <p className="text-[10px] text-muted-foreground mt-1">Use {'{{nome}}'} para personalizar com o nome do lead.</p>
            </div>
            {/* Media upload */}
            <div>
              <Label className="text-sm font-medium">Mídia (opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                {mediaUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg flex-1">
                    {mediaType === 'image' && <img src={mediaUrl} alt="" className="h-10 w-10 rounded object-cover" />}
                    <span className="text-xs truncate flex-1">{mediaUrl.split('/').pop()}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setMediaUrl('')}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex-1">
                    <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={handleUploadCampaignMedia} />
                    <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">Enviar foto, vídeo ou documento</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={createCampaign} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Criar Campanha ({leadCount} leads)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
