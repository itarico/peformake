import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Image, MessageSquare, BarChart3, Award, Eye, FileText, User, Phone, Mail, Clock, ChevronDown, ChevronUp, ExternalLink, Send, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

const LandingAdmin = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Institucional</h1>
          <p className="text-muted-foreground text-sm">Leads, conteúdo e configurações do site</p>
        </div>
        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
          <Eye className="mr-2 h-4 w-4" /> Ver site
        </Button>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="leads"><FileText className="mr-1 h-3 w-3" /> Leads</TabsTrigger>
          <TabsTrigger value="logos"><Image className="mr-1 h-3 w-3" /> Logos</TabsTrigger>
          <TabsTrigger value="testimonials"><MessageSquare className="mr-1 h-3 w-3" /> Depoimentos</TabsTrigger>
          <TabsTrigger value="portfolio"><Award className="mr-1 h-3 w-3" /> Portfólio</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-1 h-3 w-3" /> Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="logos"><LogosTab /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
        <TabsContent value="portfolio"><PortfolioTab /></TabsContent>
        <TabsContent value="stats"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// ===== LEADS TAB (Focused & Enhanced) =====
const LeadsTab = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'diagnosticos' | 'servicos'>('diagnosticos');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { data: quizLeads, isLoading: loadingQuiz } = useQuery({
    queryKey: ['admin-quiz-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('quiz_leads' as any).select('*').order('created_at', { ascending: false }).limit(100);
      return data as any[];
    },
  });

  const { data: serviceRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['admin-service-requests'],
    queryFn: async () => {
      const { data } = await supabase.from('service_requests' as any).select('*').order('created_at', { ascending: false }).limit(100);
      return data as any[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, table }: { id: string; status: string; table: string }) => {
      await supabase.from(table as any).update({ status }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quiz-leads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-requests'] });
      toast.success('Status atualizado!');
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = encodeURIComponent(`Olá ${name}! Aqui é da PEFORMAKE. Vi que você fez nosso diagnóstico de marketing e gostaria de conversar sobre como podemos ajudar seu negócio. Podemos falar agora?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const totalLeads = (quizLeads?.length || 0) + (serviceRequests?.length || 0);
  const pendingLeads = (quizLeads?.filter((l: any) => !l.status || l.status === 'new').length || 0) +
    (serviceRequests?.filter((r: any) => r.status === 'pending').length || 0);
  const callbackLeads = quizLeads?.filter((l: any) => l.wants_callback).length || 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de Leads</p>
          <p className="text-2xl font-bold">{totalLeads}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-orange-500">{pendingLeads}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Agendamentos</p>
          <p className="text-2xl font-bold text-blue-500">{callbackLeads}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Diagnósticos</p>
          <p className="text-2xl font-bold text-green-500">{quizLeads?.length || 0}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Leads & Formulários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={activeSubTab === 'diagnosticos' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubTab('diagnosticos')}>
              <FileText className="mr-1 h-4 w-4" /> Diagnósticos ({quizLeads?.length || 0})
            </Button>
            <Button variant={activeSubTab === 'servicos' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubTab('servicos')}>
              <MessageSquare className="mr-1 h-4 w-4" /> Solicitações ({serviceRequests?.length || 0})
            </Button>
          </div>

          {activeSubTab === 'diagnosticos' && (
            <div className="space-y-3">
                {loadingQuiz && <p className="text-muted-foreground text-sm">Carregando...</p>}
                {quizLeads?.map((lead: any) => (
                  <div key={lead.id} className="border rounded-lg hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate"><Phone size={10} /> {lead.whatsapp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lead.wants_callback && (
                          <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-400">
                            <Calendar size={10} className="mr-1" /> Agendado
                          </Badge>
                        )}
                        {lead.level && (
                          <Badge variant={lead.level === 'Avançado' ? 'default' : lead.level === 'Em Evolução' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {lead.level}
                          </Badge>
                        )}
                        {lead.score !== null && <span className="text-xs font-bold text-primary">{lead.score}pts</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.whatsapp, lead.name); }}>
                          <Phone size={14} className="text-green-500" />
                        </Button>
                        {expandedId === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {expandedId === lead.id && (
                      <div className="px-4 pb-4 border-t pt-3 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{lead.email}</span></div>
                          <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(lead.created_at)}</span></div>
                          {lead.answers?.business_name && <div><span className="text-muted-foreground">Negócio:</span> <span className="font-medium">{lead.answers.business_name}</span></div>}
                          {lead.instagram_handle && <div><span className="text-muted-foreground">Instagram:</span> <span className="font-medium">{lead.instagram_handle}</span></div>}
                          {lead.preferred_callback_time && <div><span className="text-muted-foreground">Horário pref.:</span> <span className="font-medium">{lead.preferred_callback_time}</span></div>}
                        </div>

                        {lead.answers && typeof lead.answers === 'object' && (
                          <div>
                            <h4 className="text-xs font-semibold mb-1">Respostas:</h4>
                            <div className="grid grid-cols-1 gap-1">
                              {Object.entries(lead.answers as Record<string, string>).filter(([k]) => k !== 'business_name' && k !== 'website').map(([key, value]) => (
                                <div key={key} className="text-xs bg-muted/50 rounded px-2 py-1">
                                  <span className="text-muted-foreground capitalize">{key}:</span> <span className="font-medium">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {lead.ai_diagnostic && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                            <Eye className="mr-1 h-3 w-3" /> Ver diagnóstico IA
                          </Button>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => openWhatsApp(lead.whatsapp, lead.name)}>
                            <Send className="mr-1 h-3 w-3" /> WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: lead.id, status: 'contacted', table: 'quiz_leads' })}>
                            Marcar contatado
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!loadingQuiz && (!quizLeads || quizLeads.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhum diagnóstico recebido.</p>}
            </div>
          )}

          {activeSubTab === 'servicos' && (
            <div className="space-y-3">
                {loadingRequests && <p className="text-muted-foreground text-sm">Carregando...</p>}
                {serviceRequests?.map((req: any) => (
                  <div key={req.id} className="border rounded-lg hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{req.name}</p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {req.whatsapp}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{req.service_name}</Badge>
                        <Badge variant={req.status === 'pending' ? 'secondary' : 'default'} className="text-[10px]">
                          {req.status === 'pending' ? 'Pendente' : req.status === 'contacted' ? 'Contatado' : req.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openWhatsApp(req.whatsapp, req.name); }}>
                          <Phone size={14} className="text-green-500" />
                        </Button>
                        {expandedId === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {expandedId === req.id && (
                      <div className="px-4 pb-4 border-t pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {req.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{req.email}</span></div>}
                          <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(req.created_at)}</span></div>
                        </div>
                        {req.message && (
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded">{req.message}</pre>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => openWhatsApp(req.whatsapp, req.name)}>
                            <Send className="mr-1 h-3 w-3" /> WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'contacted', table: 'service_requests' })}>
                            Marcar contatado
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!loadingRequests && (!serviceRequests || serviceRequests.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhuma solicitação recebida.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Diagnostic Preview Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnóstico IA — {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead?.ai_diagnostic && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{selectedLead.ai_diagnostic}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ===== LOGOS TAB =====
const LogosTab = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', logo_url: '', display_order: 0 });

  const { data: logos } = useQuery({
    queryKey: ['admin-logos'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_client_logos' as any).select('*').order('display_order');
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => { await supabase.from('landing_client_logos' as any).insert(form); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-logos'] }); setForm({ name: '', logo_url: '', display_order: 0 }); toast.success('Logo adicionado!'); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { await supabase.from('landing_client_logos' as any).update({ is_active }).eq('id', id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-logos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('landing_client_logos' as any).delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-logos'] }); toast.success('Removido!'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Logos de Clientes</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Nome do cliente" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="URL da logo" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} />
          <Button onClick={() => addMutation.mutate()} disabled={!form.name || !form.logo_url}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </div>
        <div className="space-y-3">
          {logos?.map((logo: any) => (
            <div key={logo.id} className="flex items-center gap-4 p-3 border rounded-lg">
              <img src={logo.logo_url} alt={logo.name} className="h-10 w-20 object-contain" />
              <span className="flex-1 font-medium text-sm">{logo.name}</span>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={logo.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: logo.id, is_active: v })} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(logo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(!logos || logos.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhum logo adicionado ainda.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== TESTIMONIALS TAB =====
const TestimonialsTab = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', role: '', text: '', rating: 5 });

  const { data: items } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_testimonials' as any).select('*').order('display_order');
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => { await supabase.from('landing_testimonials' as any).insert(form); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }); setForm({ name: '', role: '', text: '', rating: 5 }); toast.success('Depoimento adicionado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('landing_testimonials' as any).delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }); toast.success('Removido!'); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { await supabase.from('landing_testimonials' as any).update({ is_active }).eq('id', id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Depoimentos</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Cargo / Empresa" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
          <Textarea placeholder="Depoimento" className="md:col-span-2" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} />
          <Button onClick={() => addMutation.mutate()} disabled={!form.name || !form.text} className="md:col-span-2">
            <Plus className="mr-1 h-4 w-4" /> Adicionar depoimento
          </Button>
        </div>
        <div className="space-y-3">
          {items?.map((item: any) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm italic text-muted-foreground mb-2">"{item.text}"</p>
                  <p className="text-sm font-semibold">{item.name} <span className="font-normal text-muted-foreground">— {item.role}</span></p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={item.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: item.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
          {(!items || items.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhum depoimento adicionado ainda.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== PORTFOLIO TAB =====
const PortfolioTab = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ client_name: '', before_text: '', process_text: '', after_text: '', metric_value: '', metric_label: '' });

  const { data: items } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_portfolio_cases' as any).select('*').order('display_order');
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => { await supabase.from('landing_portfolio_cases' as any).insert(form); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] }); setForm({ client_name: '', before_text: '', process_text: '', after_text: '', metric_value: '', metric_label: '' }); toast.success('Case adicionado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('landing_portfolio_cases' as any).delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] }); toast.success('Removido!'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Cases de Portfólio</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Nome do cliente" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Métrica (ex: +380%)" value={form.metric_value} onChange={e => setForm({ ...form, metric_value: e.target.value })} />
            <Input placeholder="Label (ex: leads)" value={form.metric_label} onChange={e => setForm({ ...form, metric_label: e.target.value })} />
          </div>
          <Textarea placeholder="Antes (situação inicial)" value={form.before_text} onChange={e => setForm({ ...form, before_text: e.target.value })} />
          <Textarea placeholder="Processo (o que foi feito)" value={form.process_text} onChange={e => setForm({ ...form, process_text: e.target.value })} />
          <Textarea placeholder="Depois (resultados)" className="md:col-span-2" value={form.after_text} onChange={e => setForm({ ...form, after_text: e.target.value })} />
          <Button onClick={() => addMutation.mutate()} disabled={!form.client_name || !form.metric_value} className="md:col-span-2">
            <Plus className="mr-1 h-4 w-4" /> Adicionar case
          </Button>
        </div>
        <div className="space-y-3">
          {items?.map((item: any) => (
            <div key={item.id} className="p-4 border rounded-lg flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{item.client_name} — <span className="text-primary">{item.metric_value}</span> {item.metric_label}</p>
                <p className="text-xs text-muted-foreground mt-1">Antes: {item.before_text?.slice(0, 80)}...</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(!items || items.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhum case adicionado ainda.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== STATS TAB =====
const StatsTab = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ value: '', label: '' });

  const { data: items } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_stats' as any).select('*').order('display_order');
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => { await supabase.from('landing_stats' as any).insert(form); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); setForm({ value: '', label: '' }); toast.success('Estatística adicionada!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('landing_stats' as any).delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); toast.success('Removido!'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Estatísticas</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Input placeholder="Valor (ex: 150+)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
          <Input placeholder="Label (ex: empresas atendidas)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <Button onClick={() => addMutation.mutate()} disabled={!form.value || !form.label}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items?.map((item: any) => (
            <div key={item.id} className="p-4 border rounded-lg text-center relative group">
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate(item.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        {(!items || items.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">Nenhuma estatística adicionada.</p>}
      </CardContent>
    </Card>
  );
};

export default LandingAdmin;
