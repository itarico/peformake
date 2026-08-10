import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  RefreshCw, Pin, PinOff, ExternalLink, Sparkles, Clock, Loader2,
  Target, Palette, Film, Brain, Building2, Send, Plus, MessageSquare,
  Trash2, ChevronDown, ChevronRight, Globe, Flag
} from 'lucide-react';
import { useRef } from 'react';

type ServiceTab = 'traffic' | 'design' | 'audiovisual' | 'clients' | 'company';
type Msg = { role: 'user' | 'assistant'; content: string };

const TAB_CONFIG: Record<ServiceTab, { label: string; icon: any; emoji: string }> = {
  traffic: { label: 'Tráfego', icon: Target, emoji: '🎯' },
  design: { label: 'Design', icon: Palette, emoji: '🎨' },
  audiovisual: { label: 'Audiovisual', icon: Film, emoji: '🎬' },
  clients: { label: 'Clientes', icon: Building2, emoji: '🏢' },
  company: { label: 'Empresa', icon: Brain, emoji: '🧠' },
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;

async function streamChat({ messages, chatType, sessionId, onDelta, onDone }: {
  messages: Msg[]; chatType: string; sessionId: string | null;
  onDelta: (t: string) => void; onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, chatType, sessionId }),
  });
  if (!resp.ok || !resp.body) {
    if (resp.status === 429) { toast.error('Rate limit. Aguarde.'); onDone(); return; }
    if (resp.status === 402) { toast.error('Créditos insuficientes.'); onDone(); return; }
    throw new Error('Failed');
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ') || line.startsWith(':') || !line.trim()) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + '\n' + buf; break; }
    }
  }
  onDone();
}

// ─── Compact Insight Card ───
const CompactInsightCard = ({ insight, onTogglePin, clientName }: {
  insight: any; onTogglePin: (id: string, pinned: boolean) => void; clientName?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const content = insight.content || '';
  const lines = content.split('\n').filter((l: string) => l.trim());
  const summary = lines.slice(0, 4).join('\n');
  const hasMore = lines.length > 4;
  const tags = insight.tags || [];
  const isBR = tags.some((t: string) => t.toLowerCase().includes('brasil') || t.toLowerCase().includes('br'));
  const isIntl = tags.some((t: string) => t.toLowerCase().includes('internacional') || t.toLowerCase().includes('global'));

  return (
    <Card className={`transition-all hover:shadow-sm ${insight.is_pinned ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold leading-tight">{insight.title}</h4>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {clientName && <Badge variant="outline" className="text-[10px] py-0">{clientName}</Badge>}
              {isBR && <span className="text-[10px]">🇧🇷</span>}
              {isIntl && <span className="text-[10px]">🌍</span>}
              {insight.insight_format && (
                <Badge variant="secondary" className="text-[10px] py-0">{insight.insight_format}</Badge>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {insight.created_at ? new Date(insight.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
              </span>
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onTogglePin(insight.id, !!insight.is_pinned)}>
              {insight.is_pinned ? <PinOff className="h-3 w-3 text-primary" /> : <Pin className="h-3 w-3" />}
            </Button>
            {insight.source_url && (
              <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                <a href={insight.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed">
          <ReactMarkdown>{expanded ? content : summary}</ReactMarkdown>
        </div>

        {hasMore && (
          <Button variant="ghost" size="sm" className="mt-1 text-[10px] h-6 px-2" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Recolher' : 'Ver completo'} <ChevronDown className={`h-3 w-3 ml-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Service Insights Panel ───
const ServiceInsightsPanel = ({ serviceType }: { serviceType: 'traffic' | 'design' | 'audiovisual' }) => {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState('all');

  const { data: clients } = useQuery({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name, business_segment').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: insights, isLoading } = useQuery({
    queryKey: ['hub-insights', serviceType, selectedClient],
    queryFn: async () => {
      let query = supabase.from('ai_daily_insights').select('*')
        .eq('service_type', serviceType).order('created_at', { ascending: false }).limit(100);
      if (selectedClient !== 'all') query = query.eq('target_id', selectedClient);
      const { data } = await query;
      return data || [];
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-ai-service-cron', {
        body: { serviceType, clientId: selectedClient !== 'all' ? selectedClient : undefined, force: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.count || 0} insights gerados!`);
      queryClient.invalidateQueries({ queryKey: ['hub-insights'] });
    },
    onError: () => toast.error('Erro na pesquisa'),
  });

  useEffect(() => {
    supabase.functions.invoke('admin-ai-service-cron', {
      body: { serviceType, clientId: selectedClient !== 'all' ? selectedClient : undefined },
    }).then(({ data }: any) => {
      if (data?.count > 0) {
        toast.success(`${data.count} novos insights!`);
        queryClient.invalidateQueries({ queryKey: ['hub-insights'] });
      }
    }).catch(() => {});
  }, [serviceType]);

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from('ai_daily_insights').update({ is_pinned: !pinned }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['hub-insights'] });
  };

  const strategies = insights?.filter(i => i.category !== 'source_link') || [];
  const links = insights?.filter(i => i.category === 'source_link') || [];
  const pinned = insights?.filter(i => i.is_pinned) || [];

  // Group by client
  const groupedByClient = strategies.reduce((acc: Record<string, any[]>, item) => {
    const key = item.target_id || 'geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} variant="outline" size="sm" className="h-8 text-xs gap-1">
          {runMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Buscar agora
        </Button>
        {runMutation.isPending && (
          <span className="text-xs text-muted-foreground animate-pulse">Firecrawl + IA processando...</span>
        )}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Pin className="h-3 w-3" /> Fixados ({pinned.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pinned.map(i => (
              <CompactInsightCard key={i.id} insight={i} onTogglePin={togglePin} clientName={clients?.find(c => c.id === i.target_id)?.name} />
            ))}
          </div>
        </div>
      )}

      {/* Insights by client */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : strategies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum insight ainda. Clique "Buscar agora".</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByClient).map(([clientId, items]) => {
          const clientName = clients?.find(c => c.id === clientId)?.name || 'Geral';
          return (
            <Collapsible key={clientId} defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/30 rounded px-2 transition-colors">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-90" />
                <span className="text-xs font-semibold">{clientName}</span>
                <Badge variant="secondary" className="text-[10px] py-0 ml-1">{items.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-5">
                  {items.slice(0, 6).map((item: any) => (
                    <CompactInsightCard key={item.id} insight={item} onTogglePin={togglePin} clientName={clientName} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })
      )}

      {/* Links section */}
      {links.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Referências e Links ({links.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {links.map(link => (
              <a key={link.id} href={link.source_url || '#'} target="_blank" rel="noopener noreferrer"
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{link.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{link.source_url}</p>
                <div className="flex items-center gap-1 mt-1">
                  {link.target_id && <Badge variant="outline" className="text-[9px] py-0">{clients?.find(c => c.id === link.target_id)?.name}</Badge>}
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Chat Panel (Clients / Company) ───
const ChatPanel = ({ chatType }: { chatType: 'clients' | 'company' }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); }, [chatType]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    const { data } = await supabase.from('ai_chat_sessions').select('*')
      .eq('chat_type', chatType).order('updated_at', { ascending: false }).limit(10);
    setSessions(data || []);
  };

  const newSession = async () => {
    const { data } = await supabase.from('ai_chat_sessions').insert({
      chat_type: chatType,
      title: chatType === 'clients' ? 'Análise de Clientes' : 'Consultoria Peformake',
    }).select().single();
    if (data) { setSessionId(data.id); setMessages([]); loadSessions(); }
  };

  const loadSession = async (id: string) => {
    setSessionId(id);
    const { data } = await supabase.from('ai_chat_messages').select('*').eq('session_id', id).order('created_at');
    setMessages((data || []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    if (!sessionId) await newSession();
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setIsLoading(true);
    let full = '';
    const upsert = (chunk: string) => {
      full += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full } : m);
        return [...prev, { role: 'assistant', content: full }];
      });
    };
    try {
      await streamChat({
        messages: allMsgs, chatType, sessionId,
        onDelta: upsert,
        onDone: async () => {
          setIsLoading(false);
          if (sessionId && full) {
            await supabase.from('ai_chat_messages').insert({ session_id: sessionId, role: 'assistant', content: full });
            await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
          }
        },
      });
    } catch { setIsLoading(false); toast.error('Erro ao enviar'); }
  };

  const deleteSession = async (id: string) => {
    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    if (sessionId === id) { setSessionId(null); setMessages([]); }
    loadSessions();
  };

  const quickPrompts = chatType === 'clients'
    ? ['Qual cliente precisa de mais atenção?', 'Análise rápida do portfólio', 'Oportunidades de upsell']
    : ['Como aumentar o MRR?', 'OKRs para este trimestre', 'Diagnóstico rápido da agência'];

  return (
    <div className="flex gap-3 h-[calc(100vh-240px)]">
      {/* Chat main */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs">
                {chatType === 'clients' ? 'Inteligência de Clientes' : 'Consultor Estratégico'}
              </CardTitle>
              <div className="ml-auto flex gap-1">
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={newSession}>
                  <Plus className="h-2.5 w-2.5" /> Nova
                </Button>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Brain className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground mb-3">
                  {chatType === 'clients' ? 'Pergunte sobre qualquer cliente' : 'Seu consultor estratégico'}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {quickPrompts.map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => setInput(q)}>{q}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-xs">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-3 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t">
            <div className="flex gap-1.5">
              <Textarea value={input} onChange={e => setInput(e.target.value)}
                placeholder="Pergunte algo..." className="resize-none min-h-[36px] max-h-[80px] text-xs"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <Button onClick={send} disabled={isLoading || !input.trim()} size="sm" className="shrink-0 h-9 w-9 p-0">
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sessions sidebar */}
      <Card className="w-52 shrink-0 hidden lg:flex flex-col">
        <CardHeader className="pb-1">
          <CardTitle className="text-[10px] flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Conversas
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-3">Nenhuma conversa</p>
          ) : sessions.map(s => (
            <div key={s.id} className={`flex items-center justify-between rounded px-1.5 py-1 cursor-pointer hover:bg-muted/50 ${sessionId === s.id ? 'bg-muted' : ''}`}>
              <button className="text-[10px] text-left truncate flex-1" onClick={() => loadSession(s.id)}>
                {s.title || 'Conversa'}
              </button>
              <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0" onClick={() => deleteSession(s.id)}>
                <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </Card>
    </div>
  );
};

// ─── Main Page ───
const IAHub = () => {
  const [activeTab, setActiveTab] = useState<ServiceTab>('traffic');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6" /> IA Automática
        </h1>
        <p className="text-sm text-muted-foreground">
          Hub central de inteligência — insights prontos para aplicar, pesquisa automática e chat estratégico
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ServiceTab)}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(TAB_CONFIG).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs">
              <cfg.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{cfg.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="traffic"><ServiceInsightsPanel serviceType="traffic" /></TabsContent>
        <TabsContent value="design"><ServiceInsightsPanel serviceType="design" /></TabsContent>
        <TabsContent value="audiovisual"><ServiceInsightsPanel serviceType="audiovisual" /></TabsContent>
        <TabsContent value="clients"><ChatPanel chatType="clients" /></TabsContent>
        <TabsContent value="company"><ChatPanel chatType="company" /></TabsContent>
      </Tabs>
    </div>
  );
};

export default IAHub;
