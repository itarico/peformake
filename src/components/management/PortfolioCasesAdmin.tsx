import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Image, Video, Star, Upload, X, GripVertical } from 'lucide-react';

const SERVICE_OPTIONS = [
  'Tráfego Pago', 'Social Media', 'Design & Criativos', 'Audiovisual',
  'Consultoria Estratégica', 'CRM & Automação', 'Sites & Sistemas', 'Gráfico',
];

const NICHE_OPTIONS = ['gastronomia', 'saude', 'ecommerce', 'educacao', 'servicos', 'varejo', 'outro'];

const PortfolioCasesAdmin = () => {
  const queryClient = useQueryClient();
  const [editingCase, setEditingCase] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const emptyForm = {
    client_name: '', title: '', description: '', niche: '',
    service_tags: [] as string[], metrics: {} as Record<string, string>,
    image_urls: [] as string[], video_urls: [] as string[],
    logo_url: '', is_featured: false, client_id: '', display_order: 0,
  };
  const [form, setForm] = useState(emptyForm);
  const [metricKey, setMetricKey] = useState('');
  const [metricValue, setMetricValue] = useState('');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['admin-portfolio-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('portfolio_cases').select('*').order('display_order');
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['all-clients-for-portfolio'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name, logo_url, business_segment').order('name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_name: form.client_name,
        title: form.title,
        description: form.description || null,
        niche: form.niche || null,
        service_tags: form.service_tags,
        metrics: form.metrics,
        image_urls: form.image_urls,
        video_urls: form.video_urls,
        logo_url: form.logo_url || null,
        is_featured: form.is_featured,
        client_id: form.client_id || null,
        display_order: form.display_order,
      };

      if (editingCase) {
        await supabase.from('portfolio_cases').update(payload).eq('id', editingCase.id);
      } else {
        await supabase.from('portfolio_cases').insert({ ...payload, is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio-cases'] });
      toast.success(editingCase ? 'Case atualizado!' : 'Case adicionado!');
      resetForm();
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('portfolio_cases').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio-cases'] });
      toast.success('Case removido!');
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCase(null);
    setShowForm(false);
    setMetricKey('');
    setMetricValue('');
  };

  const startEdit = (c: any) => {
    setForm({
      client_name: c.client_name || '',
      title: c.title || '',
      description: c.description || '',
      niche: c.niche || '',
      service_tags: c.service_tags || [],
      metrics: c.metrics || {},
      image_urls: c.image_urls || [],
      video_urls: c.video_urls || [],
      logo_url: c.logo_url || '',
      is_featured: c.is_featured || false,
      client_id: c.client_id || '',
      display_order: c.display_order || 0,
    });
    setEditingCase(c);
    setShowForm(true);
  };

  const selectClient = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        client_id: client.id,
        client_name: client.name,
        logo_url: client.logo_url || prev.logo_url,
        niche: client.business_segment || prev.niche,
      }));
    }
  };

  const addMetric = () => {
    if (metricKey && metricValue) {
      setForm(prev => ({ ...prev, metrics: { ...prev.metrics, [metricKey]: metricValue } }));
      setMetricKey('');
      setMetricValue('');
    }
  };

  const removeMetric = (key: string) => {
    setForm(prev => {
      const m = { ...prev.metrics };
      delete m[key];
      return { ...prev, metrics: m };
    });
  };

  const toggleServiceTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      service_tags: prev.service_tags.includes(tag)
        ? prev.service_tags.filter(t => t !== tag)
        : [...prev.service_tags, tag],
    }));
  };

  const uploadMedia = async (files: FileList, type: 'image' | 'video') => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${type}s/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('portfolio-media').upload(path, file);
        if (error) throw error;
        const { data: pub } = supabase.storage.from('portfolio-media').getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      if (type === 'image') {
        setForm(prev => ({ ...prev, image_urls: [...prev.image_urls, ...urls] }));
      } else {
        setForm(prev => ({ ...prev, video_urls: [...prev.video_urls, ...urls] }));
      }
      toast.success(`${urls.length} arquivo(s) enviado(s)!`);
    } catch {
      toast.error('Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const removeUrl = (type: 'image' | 'video', index: number) => {
    if (type === 'image') {
      setForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== index) }));
    } else {
      setForm(prev => ({ ...prev, video_urls: prev.video_urls.filter((_, i) => i !== index) }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Portfólio & Cases de Sucesso</h3>
          <p className="text-xs text-muted-foreground">Gerencie resultados, fotos e vídeos que aparecem no site</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Novo case
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{cases?.length || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Destaques</p><p className="text-2xl font-bold text-primary">{cases?.filter(c => c.is_featured).length || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Gastronomia</p><p className="text-2xl font-bold text-gastro-accent">{cases?.filter(c => c.niche === 'gastronomia').length || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Com fotos</p><p className="text-2xl font-bold text-green-500">{cases?.filter(c => (c.image_urls as string[])?.length > 0).length || 0}</p></Card>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}
        {cases?.map((c: any) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-center gap-3">
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-muted p-1" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{c.client_name?.charAt(0)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{c.client_name} — {c.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {c.is_featured && <Badge variant="default" className="text-[9px] h-4"><Star size={8} className="mr-0.5" /> Destaque</Badge>}
                  {c.niche && <Badge variant="outline" className="text-[9px] h-4">{c.niche}</Badge>}
                  {(c.service_tags as string[])?.map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-[9px] h-4">{t}</Badge>
                  ))}
                  {(c.image_urls as string[])?.length > 0 && <Badge variant="outline" className="text-[9px] h-4"><Image size={8} className="mr-0.5" />{(c.image_urls as string[]).length}</Badge>}
                  {(c.video_urls as string[])?.length > 0 && <Badge variant="outline" className="text-[9px] h-4"><Video size={8} className="mr-0.5" />{(c.video_urls as string[]).length}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}><Edit2 size={14} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          </Card>
        ))}
        {!isLoading && (!cases || cases.length === 0) && (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum case cadastrado. Clique em "Novo case" para começar.</p>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCase ? 'Editar Case' : 'Novo Case de Sucesso'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client selection */}
            <div>
              <Label className="text-xs">Vincular a cliente existente (opcional)</Label>
              <Select value={form.client_id} onValueChange={selectClient}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do cliente *</Label>
                <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Ex: Restaurante Sabor" />
              </div>
              <div>
                <Label className="text-xs">Título do case *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: +380% de pedidos" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o resultado alcançado..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nicho</Label>
                <Select value={form.niche} onValueChange={v => setForm(p => ({ ...p, niche: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar nicho..." /></SelectTrigger>
                  <SelectContent>
                    {NICHE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Logo URL</Label>
                <Input value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="URL da logo" />
              </div>
            </div>

            {/* Service tags */}
            <div>
              <Label className="text-xs">Serviços relacionados</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SERVICE_OPTIONS.map(s => (
                  <Badge key={s} variant={form.service_tags.includes(s) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs" onClick={() => toggleServiceTag(s)}>
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <Label className="text-xs">Métricas de resultado</Label>
              <div className="flex gap-2 mt-1">
                <Input value={metricKey} onChange={e => setMetricKey(e.target.value)} placeholder="Label (ex: ROI)" className="flex-1" />
                <Input value={metricValue} onChange={e => setMetricValue(e.target.value)} placeholder="Valor (ex: +340%)" className="flex-1" />
                <Button size="sm" variant="outline" onClick={addMetric}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(form.metrics).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="text-xs gap-1">
                    {k}: {v} <X size={10} className="cursor-pointer" onClick={() => removeMetric(k)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Image uploads */}
            <div>
              <Label className="text-xs flex items-center gap-1"><Image size={12} /> Fotos de resultado</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                  <Upload size={14} /> {uploading ? 'Enviando...' : 'Fazer upload de fotos'}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadMedia(e.target.files, 'image')} disabled={uploading} />
                </label>
              </div>
              {form.image_urls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {form.image_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      <button onClick={() => removeUrl('image', i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video uploads */}
            <div>
              <Label className="text-xs flex items-center gap-1"><Video size={12} /> Vídeos</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                  <Upload size={14} /> {uploading ? 'Enviando...' : 'Fazer upload de vídeos'}
                  <input type="file" multiple accept="video/*" className="hidden" onChange={e => e.target.files && uploadMedia(e.target.files, 'video')} disabled={uploading} />
                </label>
              </div>
              {form.video_urls.length > 0 && (
                <div className="space-y-2 mt-2">
                  {form.video_urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <Video size={14} className="text-muted-foreground" />
                      <span className="text-xs truncate flex-1">{url.split('/').pop()}</span>
                      <button onClick={() => removeUrl('video', i)} className="text-destructive"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Featured toggle */}
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({ ...p, is_featured: v }))} />
              <Label className="text-sm">Destaque na página inicial</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={!form.client_name || !form.title || saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : editingCase ? 'Atualizar case' : 'Adicionar case'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioCasesAdmin;
