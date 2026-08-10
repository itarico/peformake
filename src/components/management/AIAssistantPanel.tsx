import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Brain, Building2, Send, Loader2, Plus, MessageSquare, Sparkles,
  ExternalLink, Pin, Search, RefreshCw, Trash2, BookOpen, Video, Image, Link2
} from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;

async function streamChat({
  messages, chatType, sessionId, onDelta, onDone,
}: {
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
    if (resp.status === 429) { toast.error('Rate limit atingido. Aguarde.'); onDone(); return; }
    if (resp.status === 402) { toast.error('Créditos insuficientes.'); onDone(); return; }
    throw new Error('Failed to stream');
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

const MEDIA_ICONS: Record<string, typeof Video> = { video: Video, article: BookOpen, image: Image, tool: Link2 };

export default function AIAssistantPanel() {
  const [chatType, setChatType] = useState<'clients' | 'company'>('clients');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightSearch, setInsightSearch] = useState('');
  const [insightFilter, setInsightFilter] = useState<'all' | 'client' | 'company'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); loadInsights(); triggerAutoResearch(); }, [chatType]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const triggerAutoResearch = async () => {
    try {
      const { data } = await supabase.functions.invoke('admin-ai-daily-cron', { body: {} });
      if (data?.count > 0) {
        toast.success(`IA encontrou ${data.count} novos insights automaticamente!`);
        loadInsights();
      }
    } catch (e) {
      console.error('Auto research error:', e);
    }
  };

  const loadSessions = async () => {
    const { data } = await supabase.from('ai_chat_sessions').select('*')
      .eq('chat_type', chatType).order('updated_at', { ascending: false }).limit(20);
    setSessions(data || []);
  };

  const loadInsights = async () => {
    let query = supabase.from('ai_daily_insights').select('*')
      .in('service_type', ['general'])
      .order('created_at', { ascending: false }).limit(50);
    if (insightFilter === 'client') query = query.eq('target_type', 'client');
    if (insightFilter === 'company') query = query.eq('target_type', 'company');
    const { data } = await query;
    setInsights(data || []);
  };

  const newSession = async () => {
    const { data } = await supabase.from('ai_chat_sessions').insert({
      chat_type: chatType,
      title: chatType === 'clients' ? 'Análise de Clientes' : 'Consultoria Peformake',
    }).select().single();
    if (data) {
      setSessionId(data.id);
      setMessages([]);
      loadSessions();
    }
  };

  const loadSession = async (id: string) => {
    setSessionId(id);
    const { data } = await supabase.from('ai_chat_messages').select('*')
      .eq('session_id', id).order('created_at');
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
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full } : m);
        }
        return [...prev, { role: 'assistant', content: full }];
      });
    };

    try {
      await streamChat({
        messages: allMsgs, chatType, sessionId,
        onDelta: upsert,
        onDone: async () => {
          setIsLoading(false);
          // Save assistant message
          if (sessionId && full) {
            await supabase.from('ai_chat_messages').insert({
              session_id: sessionId, role: 'assistant', content: full,
            });
            await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
          }
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    if (sessionId === id) { setSessionId(null); setMessages([]); }
    loadSessions();
  };

  const togglePin = async (id: string, current: boolean) => {
    await supabase.from('ai_daily_insights').update({ is_pinned: !current }).eq('id', id);
    loadInsights();
  };

  const filteredInsights = insights.filter(i => {
    if (!insightSearch.trim()) return true;
    const q = insightSearch.toLowerCase();
    return (i.title || '').toLowerCase().includes(q) || (i.content || '').toLowerCase().includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
      {/* Left: Chat */}
      <div className="lg:col-span-2 flex flex-col">
        {/* Chat type selector */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant={chatType === 'clients' ? 'default' : 'outline'}
            size="sm" className="gap-1.5"
            onClick={() => { setChatType('clients'); setMessages([]); setSessionId(null); }}
          >
            <Building2 className="h-3.5 w-3.5" /> Inteligência de Clientes
          </Button>
          <Button
            variant={chatType === 'company' ? 'default' : 'outline'}
            size="sm" className="gap-1.5"
            onClick={() => { setChatType('company'); setMessages([]); setSessionId(null); }}
          >
            <Brain className="h-3.5 w-3.5" /> Consultor da Empresa
          </Button>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="gap-1" onClick={newSession}>
              <Plus className="h-3 w-3" /> Nova conversa
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                {chatType === 'clients' ? 'Assistente de Inteligência — Clientes' : 'Consultor Estratégico — Peformake'}
              </CardTitle>
              {sessionId && <Badge variant="secondary" className="text-[10px] ml-auto">Sessão ativa</Badge>}
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-foreground/80 mb-1">
                  {chatType === 'clients' ? 'Inteligência sobre Clientes' : 'Consultoria Empresarial'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {chatType === 'clients'
                    ? 'Pergunte sobre tendências, estratégias e análises de qualquer cliente. A IA tem acesso a todos os dados do sistema.'
                    : 'Seu consultor e secretário virtual. Pergunte sobre gestão, metas, estratégias e melhorias para a Peformake.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {(chatType === 'clients' ? [
                    'Qual cliente precisa de mais atenção?',
                    'Sugira estratégias para o setor de alimentação',
                    'Como aumentar o engajamento dos clientes?',
                  ] : [
                    'Como posso aumentar meu MRR?',
                    'Sugira OKRs para este trimestre',
                    'Quais ferramentas implementar em 2026?',
                  ]).map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-xs"
                      onClick={() => { setInput(q); }}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={chatType === 'clients' ? 'Pergunte sobre qualquer cliente...' : 'Pergunte sobre a empresa...'}
                className="resize-none min-h-[44px] max-h-[120px] text-sm"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <Button onClick={send} disabled={isLoading || !input.trim()} className="shrink-0">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Sessions + Insights */}
      <div className="flex flex-col gap-3 overflow-hidden">
        {/* Sessions */}
        <Card className="shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Conversas Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[200px] overflow-y-auto space-y-1 p-3 pt-0">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma conversa ainda</p>
            ) : sessions.map(s => (
              <div key={s.id} className={`flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${sessionId === s.id ? 'bg-muted' : ''}`}>
                <button className="text-xs text-left truncate flex-1" onClick={() => loadSession(s.id)}>
                  {s.title || 'Conversa'}
                </button>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => deleteSession(s.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Daily Insights */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Insights Diários
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadInsights}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-1.5 mt-1">
              {['all', 'client', 'company'].map(f => (
                <button key={f} onClick={() => { setInsightFilter(f as any); }}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${insightFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {f === 'all' ? 'Todos' : f === 'client' ? 'Clientes' : 'Empresa'}
                </button>
              ))}
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input value={insightSearch} onChange={e => setInsightSearch(e.target.value)}
                placeholder="Buscar insights..." className="h-7 pl-7 text-xs" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 px-3 pb-3">
            {filteredInsights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum insight. O cron diário gera automaticamente.</p>
            ) : (
              <div className="space-y-2">
                {filteredInsights.map(insight => {
                  const Icon = MEDIA_ICONS[insight.media_type || 'article'] || BookOpen;
                  return (
                    <div key={insight.id} className={`p-2.5 rounded-lg border hover:bg-muted/50 transition-colors ${insight.is_pinned ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-500/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-2">{insight.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{insight.content?.slice(0, 150)}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">{insight.category}</Badge>
                            {insight.source_url && (
                              <a href={insight.source_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                                <ExternalLink className="h-2.5 w-2.5" /> Ver
                              </a>
                            )}
                            <button onClick={() => togglePin(insight.id, insight.is_pinned)}
                              className={`ml-auto ${insight.is_pinned ? 'text-amber-500' : 'text-muted-foreground/50 hover:text-amber-500'}`}>
                              <Pin className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
