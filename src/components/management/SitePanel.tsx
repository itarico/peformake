import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Code, Image, Eye, User, Phone, Send, ChevronDown, ChevronUp, Calendar, MessageSquare, Save, ExternalLink, Info, Sparkles, Trophy, Palette } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import PortfolioCasesAdmin from './PortfolioCasesAdmin';
import ServiceContentAdmin from './ServiceContentAdmin';

const SitePanel = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="leads" className="text-xs"><FileText className="mr-1 h-3 w-3" /> Leads</TabsTrigger>
          <TabsTrigger value="links" className="text-xs"><ExternalLink className="mr-1 h-3 w-3" /> Links</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs"><Trophy className="mr-1 h-3 w-3" /> Portfólio</TabsTrigger>
          <TabsTrigger value="servicos" className="text-xs"><Palette className="mr-1 h-3 w-3" /> Serviços</TabsTrigger>
          <TabsTrigger value="pixel" className="text-xs"><Code className="mr-1 h-3 w-3" /> Pixel</TabsTrigger>
        </TabsList>

        <TabsContent value="leads"><LeadsSection /></TabsContent>
        <TabsContent value="links"><LinksSection /></TabsContent>
        <TabsContent value="portfolio"><PortfolioCasesAdmin /></TabsContent>
        <TabsContent value="servicos"><ServiceContentAdmin /></TabsContent>
        <TabsContent value="pixel"><PixelSection /></TabsContent>
      </Tabs>
    </div>
  );
};

// ===== LEADS SECTION (reused from LandingAdmin) =====
const LeadsSection = () => {
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total de Leads</p><p className="text-2xl font-bold">{totalLeads}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-orange-500">{pendingLeads}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Agendamentos</p><p className="text-2xl font-bold text-blue-500">{callbackLeads}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Diagnósticos</p><p className="text-2xl font-bold text-green-500">{quizLeads?.length || 0}</p></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Leads & Formulários</CardTitle>
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
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User size={14} className="text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {lead.whatsapp}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.wants_callback && <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-400"><Calendar size={10} className="mr-1" /> Agendado</Badge>}
                      {lead.level && <Badge variant={lead.level === 'Avançado' ? 'default' : lead.level === 'Em Evolução' ? 'secondary' : 'destructive'} className="text-[10px]">{lead.level}</Badge>}
                      {lead.score !== null && <span className="text-xs font-bold text-primary">{lead.score}pts</span>}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.whatsapp, lead.name); }}><Phone size={14} className="text-green-500" /></Button>
                      {expandedId === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                  {expandedId === lead.id && (
                    <div className="px-4 pb-4 border-t pt-3 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{lead.email}</span></div>
                        <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(lead.created_at)}</span></div>
                        {lead.answers?.business_name && <div><span className="text-muted-foreground">Negócio:</span> <span className="font-medium">{lead.answers.business_name}</span></div>}
                      </div>

                      {/* Qualification Summary (AI-generated) */}
                      {lead.qualification && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-primary">
                            <Sparkles size={12} /> Qualificação IA
                          </h4>
                          <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed">
                            <ReactMarkdown>{lead.qualification}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {!lead.qualification && lead.answers && typeof lead.answers === 'object' && (
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
                        <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}><Eye className="mr-1 h-3 w-3" /> Ver diagnóstico IA</Button>
                      )}
                      {lead.wants_callback && lead.preferred_callback_time && (
                        <div className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">📅 Horário preferido:</span> {lead.preferred_callback_time}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => openWhatsApp(lead.whatsapp, lead.name)}><Send className="mr-1 h-3 w-3" /> WhatsApp</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: lead.id, status: 'contacted', table: 'quiz_leads' })}>Marcar contatado</Button>
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
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><MessageSquare size={14} className="text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{req.name}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {req.whatsapp}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{req.service_name}</Badge>
                      <Badge variant={req.status === 'pending' ? 'secondary' : 'default'} className="text-[10px]">{req.status === 'pending' ? 'Pendente' : req.status === 'contacted' ? 'Contatado' : req.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openWhatsApp(req.whatsapp, req.name); }}><Phone size={14} className="text-green-500" /></Button>
                      {expandedId === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                  {expandedId === req.id && (
                    <div className="px-4 pb-4 border-t pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {req.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{req.email}</span></div>}
                        <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(req.created_at)}</span></div>
                      </div>
                      {req.message && <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded">{req.message}</pre>}
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => openWhatsApp(req.whatsapp, req.name)}><Send className="mr-1 h-3 w-3" /> WhatsApp</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'contacted', table: 'service_requests' })}>Marcar contatado</Button>
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

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Diagnóstico IA — {selectedLead?.name}</DialogTitle></DialogHeader>
          {selectedLead?.ai_diagnostic && (
            <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{selectedLead.ai_diagnostic}</ReactMarkdown></div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ===== PIXEL & ANALYTICS SECTION =====
const PixelSection = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const [pixelId, setPixelId] = useState('');
  const [analyticsId, setAnalyticsId] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setPixelId(settings.meta_pixel_id || '');
    setAnalyticsId(settings.google_analytics_id || '');
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('site_settings').upsert({ key: 'meta_pixel_id', value: pixelId.trim() }, { onConflict: 'key' });
      await supabase.from('site_settings').upsert({ key: 'google_analytics_id', value: analyticsId.trim() }, { onConflict: 'key' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Code className="h-5 w-5" /> Meta Pixel (Facebook)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Cole apenas o ID do pixel (ex: <code className="bg-muted px-1 rounded">123456789012345</code>). O código será injetado automaticamente no site.</p>
          </div>
          <Input placeholder="ID do Meta Pixel" value={pixelId} onChange={e => setPixelId(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Code className="h-5 w-5" /> Google Analytics (GA4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Cole o ID de medição do GA4 (ex: <code className="bg-muted px-1 rounded">G-XXXXXXXXXX</code>).</p>
          </div>
          <Input placeholder="ID do Google Analytics (G-...)" value={analyticsId} onChange={e => setAnalyticsId(e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  );
};

const LinksSection = () => {
  const baseUrl = window.location.origin;
  const sdrLink = `${baseUrl}/sdr-capture`;
  const diagnosticLink = `${baseUrl}/diagnostico`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Funil do SDR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Link para o SDR capturar leads e oferecer o diagnóstico rápido.</p>
          <div className="flex gap-2">
            <Input value={sdrLink} readOnly className="text-xs bg-muted" />
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(sdrLink)}>Copiar</Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <a href={sdrLink} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" /> Testar Funil</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-performake-accent" /> Diagnóstico Online
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Link direto para o quiz de diagnóstico de marketing.</p>
          <div className="flex gap-2">
            <Input value={diagnosticLink} readOnly className="text-xs bg-muted" />
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(diagnosticLink)}>Copiar</Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <a href={diagnosticLink} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" /> Ver Quiz</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SitePanel;
