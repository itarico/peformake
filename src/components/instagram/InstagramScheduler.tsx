import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, CalendarClock, Loader2, Trash2, Image as ImageIcon, Film, Layers, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { format } from 'date-fns';

interface InstagramSchedulerProps {
  clientId: string;
}

const getInvokeErrorMessage = async (error: any) => {
  try {
    if (typeof error?.context?.json === 'function') {
      const payload = await error.context.json();
      if (payload?.error) return payload.error as string;
    }
    if (typeof error?.context?.text === 'function') {
      const text = await error.context.text();
      const parsed = JSON.parse(text);
      if (parsed?.error) return parsed.error as string;
    }
  } catch {
    // ignore parse errors
  }
  return error?.message || 'Falha ao processar ação no Instagram.';
};

const MEDIA_TYPES = [
  { value: 'IMAGE', label: 'Imagem', icon: ImageIcon },
  { value: 'VIDEO', label: 'Vídeo', icon: Film },
  { value: 'CAROUSEL', label: 'Carrossel', icon: Layers },
  { value: 'STORIES', label: 'Stories', icon: Clock },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Agendado', variant: 'outline' },
  publishing: { label: 'Publicando', variant: 'secondary' },
  published: { label: 'Publicado', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
};

export function InstagramScheduler({ clientId }: InstagramSchedulerProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [formData, setFormData] = useState({
    media_type: 'IMAGE',
    caption: '',
    scheduled_at: '',
    media_url: null as string | null,
    media_urls: [] as string[],
  });
  const [batchItems, setBatchItems] = useState<Array<{
    media_type: string;
    caption: string;
    scheduled_at: string;
    media_url: string | null;
    media_urls: string[];
  }>>([]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['ig-scheduled', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_scheduled_posts')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (items: typeof batchItems) => {
      const inserts = items.map(item => ({
        client_id: clientId,
        media_type: item.media_type,
        caption: item.caption || null,
        scheduled_at: new Date(item.scheduled_at).toISOString(),
        media_url: item.media_url,
        media_urls: item.media_urls,
        status: 'scheduled',
      }));
      const { error } = await supabase.from('instagram_scheduled_posts').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-scheduled', clientId] });
      toast.success('Post(s) agendado(s)!');
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instagram_scheduled_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-scheduled', clientId] });
      toast.success('Post removido');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'publish_scheduled', client_id: clientId, post_id: postId },
      });
      if (error) throw new Error(await getInvokeErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-scheduled', clientId] });
      toast.success('Post publicado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({ media_type: 'IMAGE', caption: '', scheduled_at: '', media_url: null, media_urls: [] });
    setBatchItems([]);
    setBatchMode(false);
  };

  const handleAddToBatch = () => {
    if (!formData.scheduled_at) {
      toast.error('Selecione a data/hora');
      return;
    }
    setBatchItems(prev => [...prev, { ...formData }]);
    setFormData(prev => ({ ...prev, caption: '', scheduled_at: '', media_url: null, media_urls: [] }));
  };

  const handleSubmit = () => {
    if (batchMode) {
      if (batchItems.length === 0) {
        toast.error('Adicione pelo menos um post');
        return;
      }
      createMutation.mutate(batchItems);
    } else {
      if (!formData.scheduled_at) {
        toast.error('Selecione a data/hora');
        return;
      }
      createMutation.mutate([formData]);
    }
  };

  const scheduled = posts.filter((p: any) => p.status === 'scheduled');
  const history = posts.filter((p: any) => p.status !== 'scheduled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Agendamento de Posts
        </h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Agendar Post
        </Button>
      </div>

      {/* Scheduled Posts */}
      {scheduled.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">📅 Agendados ({scheduled.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduled.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                      {post.media_type === 'VIDEO' ? <Film className="h-5 w-5" /> :
                       post.media_type === 'CAROUSEL' ? <Layers className="h-5 w-5" /> :
                       post.media_type === 'STORIES' ? <Clock className="h-5 w-5" /> :
                       <ImageIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{post.caption?.substring(0, 60) || 'Sem legenda'}...</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_LABELS[post.status]?.variant || 'secondary'}>
                      {STATUS_LABELS[post.status]?.label || post.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => publishMutation.mutate(post.id)} disabled={publishMutation.isPending}>
                      <Send className="h-3 w-3 mr-1" /> Publicar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(post.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scheduled.length === 0 && !isLoading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum post agendado. Clique em "Agendar Post" para começar.
        </CardContent></Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Histórico</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((post: any) => (
                <div key={post.id} className="flex items-center justify-between p-2 text-sm">
                  <span className="text-muted-foreground">{post.caption?.substring(0, 40) || 'Sem legenda'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(post.scheduled_at), 'dd/MM HH:mm')}</span>
                    <Badge variant={STATUS_LABELS[post.status]?.variant || 'secondary'} className="text-[10px]">
                      {STATUS_LABELS[post.status]?.label || post.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Post no Instagram</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={!batchMode ? 'default' : 'outline'} onClick={() => setBatchMode(false)}>
                Post Único
              </Button>
              <Button size="sm" variant={batchMode ? 'default' : 'outline'} onClick={() => setBatchMode(true)}>
                Vários Posts
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.media_type} onValueChange={v => setFormData(p => ({ ...p, media_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={e => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Legenda</Label>
              <Textarea
                value={formData.caption}
                onChange={e => setFormData(p => ({ ...p, caption: e.target.value }))}
                placeholder="Escreva a legenda do post..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Mídia</Label>
              {formData.media_type === 'CAROUSEL' ? (
                <MultiImageUpload
                  bucket="reference-images"
                  folder={`instagram/${clientId}`}
                  currentUrls={formData.media_urls}
                  onUpload={urls => setFormData(p => ({ ...p, media_urls: urls }))}
                  maxImages={10}
                />
              ) : (
                <ImageUpload
                  bucket="reference-images"
                  folder={`instagram/${clientId}`}
                  currentUrl={formData.media_url}
                  onUpload={url => setFormData(p => ({ ...p, media_url: url }))}
                  onRemove={() => setFormData(p => ({ ...p, media_url: null }))}
                />
              )}
            </div>

            {batchMode && (
              <>
                <Button variant="outline" className="w-full" onClick={handleAddToBatch}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar à fila ({batchItems.length} na fila)
                </Button>
                {batchItems.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {batchItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{item.media_type} - {item.caption?.substring(0, 30) || 'Sem legenda'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{format(new Date(item.scheduled_at), 'dd/MM HH:mm')}</span>
                          <Button size="sm" variant="ghost" onClick={() => setBatchItems(p => p.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {batchMode ? `Agendar ${batchItems.length} Posts` : 'Agendar Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
