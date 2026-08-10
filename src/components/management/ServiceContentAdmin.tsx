import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Image, Video, BarChart3, MessageSquare, GripVertical } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';

const SERVICE_SLUGS = [
  { slug: 'consultoria-estrategica', name: 'Consultoria Estratégica' },
  { slug: 'trafego-pago', name: 'Tráfego Pago' },
  { slug: 'social-media', name: 'Social Media' },
  { slug: 'design-criativos', name: 'Design & Criativos' },
  { slug: 'audiovisual', name: 'Audiovisual' },
  { slug: 'crm-automacao', name: 'CRM & Automação' },
  { slug: 'sites-sistemas', name: 'Sites & Sistemas' },
  { slug: 'grafico-impresso', name: 'Gráfico (Impresso)' },
];

const CONTENT_TYPES = [
  { value: 'image', label: 'Imagem', icon: Image },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'metric', label: 'Métrica', icon: BarChart3 },
  { value: 'testimonial', label: 'Depoimento', icon: MessageSquare },
];

type ContentItem = {
  id?: string;
  service_slug: string;
  content_type: string;
  title: string;
  description: string;
  media_url: string;
  metric_value: string;
  metric_label: string;
  display_order: number;
  is_active: boolean;
};

const emptyItem = (slug: string, order: number): ContentItem => ({
  service_slug: slug,
  content_type: 'image',
  title: '',
  description: '',
  media_url: '',
  metric_value: '',
  metric_label: '',
  display_order: order,
  is_active: true,
});

const ServiceContentAdmin = () => {
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState(SERVICE_SLUGS[0].slug);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['service-content', selectedSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_page_content')
        .select('*')
        .eq('service_slug', selectedSlug)
        .order('display_order');
      return (data || []) as ContentItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: ContentItem) => {
      if (item.id) {
        const { error } = await supabase.from('service_page_content').update({
          title: item.title || null,
          description: item.description || null,
          media_url: item.media_url || null,
          metric_value: item.metric_value || null,
          metric_label: item.metric_label || null,
          content_type: item.content_type,
          display_order: item.display_order,
          is_active: item.is_active,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_page_content').insert({
          service_slug: item.service_slug,
          content_type: item.content_type,
          title: item.title || null,
          description: item.description || null,
          media_url: item.media_url || null,
          metric_value: item.metric_value || null,
          metric_label: item.metric_label || null,
          display_order: item.display_order,
          is_active: item.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-content', selectedSlug] });
      toast.success('Conteúdo salvo!');
      setDialogOpen(false);
      setEditItem(null);
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_page_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-content', selectedSlug] });
      toast.success('Removido!');
    },
  });

  const openNew = () => {
    setEditItem(emptyItem(selectedSlug, (items?.length || 0) + 1));
    setDialogOpen(true);
  };

  const openEdit = (item: ContentItem) => {
    setEditItem({ ...item });
    setDialogOpen(true);
  };

  const typeIcon = (type: string) => {
    const t = CONTENT_TYPES.find(ct => ct.value === type);
    return t ? <t.icon size={14} /> : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedSlug} onValueChange={setSelectedSlug}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_SLUGS.map(s => (
              <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Adicionar</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (!items || items.length === 0) && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum conteúdo cadastrado para este serviço.</p>
          <Button size="sm" className="mt-3" onClick={openNew}><Plus size={14} className="mr-1" /> Adicionar primeiro</Button>
        </Card>
      )}

      <div className="grid gap-3">
        {items?.map(item => (
          <Card key={item.id} className={`cursor-pointer hover:border-primary/30 transition-colors ${!item.is_active ? 'opacity-50' : ''}`} onClick={() => openEdit(item)}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-muted-foreground">{typeIcon(item.content_type)}</span>
              {item.media_url && item.content_type === 'image' && (
                <img src={item.media_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title || item.metric_value || 'Sem título'}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description || item.metric_label || item.content_type}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{CONTENT_TYPES.find(t => t.value === item.content_type)?.label}</Badge>
              {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); if (confirm('Remover?')) deleteMutation.mutate(item.id!); }}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? 'Editar' : 'Novo'} conteúdo — {SERVICE_SLUGS.find(s => s.slug === selectedSlug)?.name}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={editItem.content_type} onValueChange={v => setEditItem({ ...editItem, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Título</Label>
                <Input value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} placeholder="Título do conteúdo" />
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} placeholder="Descrição ou legenda" rows={3} />
              </div>

              {(editItem.content_type === 'image') && (
                <div>
                  <Label className="text-xs">Imagem</Label>
                  <ImageUpload
                    currentUrl={editItem.media_url || null}
                    onUpload={(url) => setEditItem({ ...editItem, media_url: url })}
                    onRemove={() => setEditItem({ ...editItem, media_url: '' })}
                    bucket="portfolio-media"
                    folder={`services/${selectedSlug}`}
                  />
                </div>
              )}

              {editItem.content_type === 'video' && (
                <div>
                  <Label className="text-xs">URL do vídeo (YouTube/Vimeo)</Label>
                  <Input value={editItem.media_url} onChange={e => setEditItem({ ...editItem, media_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              {editItem.content_type === 'metric' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valor</Label>
                    <Input value={editItem.metric_value} onChange={e => setEditItem({ ...editItem, metric_value: e.target.value })} placeholder="+4.400" />
                  </div>
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input value={editItem.metric_label} onChange={e => setEditItem({ ...editItem, metric_label: e.target.value })} placeholder="Leads gerados" />
                  </div>
                </div>
              )}

              {editItem.content_type === 'testimonial' && (
                <div>
                  <Label className="text-xs">Autor</Label>
                  <Input value={editItem.metric_label} onChange={e => setEditItem({ ...editItem, metric_label: e.target.value })} placeholder="Nome do cliente" />
                </div>
              )}

              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editItem.display_order} onChange={e => setEditItem({ ...editItem, display_order: Number(e.target.value) })} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editItem.is_active} onCheckedChange={v => setEditItem({ ...editItem, is_active: v })} />
                <Label className="text-xs">Ativo</Label>
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending}>
                <Save size={14} className="mr-1" /> {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceContentAdmin;
