import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useAudiovisual, GeneratedScript } from './AudiovisualContext';
import { normalizeScriptData, deriveScriptTitle } from './scriptParser';
import { supabase } from '@/integrations/supabase/client';
import { streamChat } from '@/lib/streamingChat';
import {
  Send, Loader2, Bot, User, RefreshCw, Database,
  Video, Brain, CheckCircle2, Search, Globe, Sparkles, Trash2,
  TrendingUp, ArrowRight, Pencil, Save, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Formatted Text (no markdown) ───

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headerMatch) {
      elements.push(<p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm">{renderInline(headerMatch[1])}</p>);
      continue;
    }
    if (line.trim() === '') { elements.push(<div key={i} className="h-1.5" />); continue; }
    if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d:–—-]{4,}$/.test(line.trim()) && line.trim().length < 60) {
      elements.push(<p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm uppercase tracking-wide">{line.trim()}</p>);
      continue;
    }
    elements.push(<p key={i} className="text-sm leading-relaxed mb-0.5">{renderInline(line)}</p>);
  }
  return <>{elements}</>;
}

function renderInline(text: string): JSX.Element {
  text = text.replace(/^#+\s*/, '');
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        const cleaned = part.replace(/\*/g, '');
        const dirParts = cleaned.split(/(\[[^\]]+\])/g);
        return (
          <span key={i}>
            {dirParts.map((dp, j) => dp.startsWith('[') && dp.endsWith(']')
              ? <span key={j} className="text-muted-foreground italic text-xs">{dp}</span>
              : dp
            )}
          </span>
        );
      })}
    </>
  );
}

// ─── Types ───

interface AIScriptwriterChatProps {
  disabled?: boolean;
  onTopicsGenerated?: (topics: string[]) => void;
  clientName?: string;
  scriptOnlyMode?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasScript?: boolean;
  scriptApproved?: boolean;
}

// ─── Structured Script Parser ───

function parseScriptFromChat(content: string, tema?: string, clientName?: string): GeneratedScript | null {
  const parts = content.split('===ROTEIRO===');
  const scriptPart = parts[1]?.split('===FIM_ROTEIRO===');
  const scriptText = scriptPart?.[0]?.trim();
  if (!scriptText) return null;

  const parsed = normalizeScriptData({ rawText: scriptText }, { tema, clientName });

  return {
    id: crypto.randomUUID(),
    titulo: parsed.titulo || '',
    gancho: parsed.gancho || '',
    desenvolvimento: parsed.desenvolvimento || '',
    cta: parsed.cta || '',
    legendaSugerida: parsed.legendaSugerida || '',
    dicasGravacao: parsed.dicasGravacao || '',
    observacoesEstrategicas: parsed.observacoesEstrategicas || '',
    justificativa: '',
    estruturaUsada: parsed.estruturaUsada || '',
    createdAt: new Date(),
    rawText: parsed.rawText,
    source: 'chat',
  };
}

// ─── Cumulative Synthesis ───

function buildCumulativeSynthesis(messages: ChatMessage[]): string {
  const sections: string[] = [];
  const decidedParams: Record<string, string> = {};
  const approvedPieces: string[] = [];
  const adjustments: string[] = [];
  const exploredTopics: string[] = [];
  let currentPhase = 'imersão';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prevMsg = i > 0 ? messages[i - 1] : null;

    if (msg.role === 'assistant') {
      // Detect phase transitions
      const lower = msg.content.toLowerCase();
      if (lower.includes('gancho') && lower.includes('desenvolvimento') && lower.includes('cta') && msg.content.includes('===ROTEIRO===')) {
        currentPhase = 'compilação';
      } else if (lower.includes('gancho') && (lower.includes('o que acha') || lower.includes('aprovado') || lower.includes('ajustar'))) {
        currentPhase = 'construção';
      } else if (decidedParams['tema'] || decidedParams['objetivo']) {
        currentPhase = 'descoberta';
      }

      // Extract suggested pieces
      const ganchoMatch = msg.content.match(/gancho[^:]*:\s*['"""]([^'"""]{10,200})['"""]/i);
      if (ganchoMatch) approvedPieces.push(`GANCHO proposto: "${ganchoMatch[1]}"`);
      const ctaMatch = msg.content.match(/cta[^:]*:\s*['"""]([^'"""]{10,200})['"""]/i);
      if (ctaMatch) approvedPieces.push(`CTA proposto: "${ctaMatch[1]}"`);
      const devMatch = msg.content.match(/desenvolvimento[^:]*:\s*['"""]([^'"""]{10,300})['"""]/i);
      if (devMatch) approvedPieces.push(`DESENVOLVIMENTO proposto: "${devMatch[1].substring(0, 150)}"`);

      // Extract explored topics
      const topicHeaders = msg.content.match(/(?:^|\n)(?:#{1,3}\s+|[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{4,40}:?\s*$)/gm);
      if (topicHeaders) {
        for (const h of topicHeaders.slice(0, 3)) {
          const clean = h.replace(/^#+\s*/, '').replace(/:\s*$/, '').trim();
          if (clean.length > 3 && clean.length < 50) exploredTopics.push(clean);
        }
      }
    }

    if (msg.role === 'user') {
      const content = msg.content;
      const lower = content.toLowerCase();

      // Detect parameter decisions from user responses
      if (lower.includes('reels') || lower.includes('tiktok') || lower.includes('youtube') || lower.includes('stories') || lower.includes('feed')) {
        const platform = content.match(/(reels|tiktok|youtube|shorts|stories|feed|instagram)/i);
        if (platform) decidedParams['canal'] = platform[1];
      }
      if (/\d+\s*s(egundos?)?|\d+\s*min(utos?)?/.test(lower)) {
        const dur = content.match(/(\d+\s*(?:s(?:egundos?)?|min(?:utos?)?))/i);
        if (dur) decidedParams['duracao'] = dur[1];
      }
      if (/educativo|divertido|emocional|inspirador|provocativo|sério|informal|humorístico/i.test(lower)) {
        const tom = content.match(/(educativo|divertido|emocional|inspirador|provocativo|sério|informal|humorístico)/i);
        if (tom) decidedParams['tom'] = tom[1];
      }
      if (/topo|meio|fundo/i.test(lower)) {
        const funil = content.match(/(topo|meio|fundo)/i);
        if (funil) decidedParams['funil'] = funil[1] + ' de funil';
      }

      // Detect approvals (user approves something the AI suggested)
      if (/aprovad[oa]|gostei|perfeito|isso mesmo|pode ser|tá ótimo|ficou bom|exato|exatamente|adorei|maravilh/i.test(lower)) {
        const approvedWhat = prevMsg?.role === 'assistant' ? prevMsg.content.substring(0, 200) : content;
        approvedPieces.push(`APROVADO pelo usuário (msg ${i}): "${content.substring(0, 80)}"`);
      }

      // Detect adjustments
      if (/ajust|muda|troca|prefiro|não gostei|diferente|outro|alterar|modificar|reformula/i.test(lower)) {
        adjustments.push(`AJUSTE pedido: "${content.substring(0, 120)}"`);
      }

      // Detect explicit readiness
      if (/vamos criar|pode criar|estou pronto|gerar roteiro|pronto|bora|cria|manda ver/i.test(lower)) {
        currentPhase = 'compilação';
      }
    }
  }

  // Build structured synthesis
  sections.push(`FASE ATUAL: ${currentPhase.toUpperCase()}`);

  if (Object.keys(decidedParams).length > 0) {
    sections.push('PARÂMETROS JÁ DECIDIDOS:\n' + Object.entries(decidedParams).map(([k, v]) => `• ${k}: ${v}`).join('\n'));
  }

  if (approvedPieces.length > 0) {
    sections.push('PEÇAS APROVADAS/PROPOSTAS:\n' + approvedPieces.slice(-6).join('\n'));
  }

  if (adjustments.length > 0) {
    sections.push('AJUSTES SOLICITADOS:\n' + adjustments.slice(-4).join('\n'));
  }

  if (exploredTopics.length > 0) {
    sections.push('TÓPICOS JÁ EXPLORADOS:\n' + [...new Set(exploredTopics)].slice(0, 8).join(', '));
  }

  sections.push(`TOTAL DE MENSAGENS: ${messages.length} (${messages.filter(m => m.role === 'user').length} do usuário)`);

  return sections.join('\n\n');
}

// ─── Main Component ───

export function AIScriptwriterChat({ disabled, onTopicsGenerated, clientName, scriptOnlyMode }: AIScriptwriterChatProps) {
  const queryClient = useQueryClient();
  const { strategicContext, parameters, addScript, addScriptAndSave, approvedScriptIds, toggleScriptApproval, instanceId, historyAnalysis } = useAudiovisual();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingScript, setEditingScript] = useState<{ messageId: string; script: GeneratedScript } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [scriptOnly, setScriptOnly] = useState(scriptOnlyMode ?? false);
  const [deepSearchDone, setDeepSearchDone] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [previousSummary, setPreviousSummary] = useState('');
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRestoringChat, setIsRestoringChat] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadPreviousConversations(); loadSavedChat(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (strategicContext && strategicContext.length > 100) setIsContextLoaded(true);
  }, [strategicContext]);

  useEffect(() => {
    if (isContextLoaded && !hasStarted && messages.length === 0 && !isRestoringChat) {
      setHasStarted(true);
      triggerFirstQuestion();
    }
  }, [isContextLoaded, hasStarted, messages.length, isRestoringChat]);

  const loadSavedChat = async () => {
    try {
      const { data } = await supabase.from('ai_analyses')
        .select('id, content')
        .eq('instance_id', instanceId)
        .eq('analysis_type', 'audiovisual_conversation')
        .order('generated_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        try {
          const savedMsgs = JSON.parse(data[0].content);
          if (Array.isArray(savedMsgs) && savedMsgs.length > 0) {
            const restored: ChatMessage[] = savedMsgs.map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp || Date.now()),
              hasScript: m.content?.includes?.('===ROTEIRO==='),
            }));
            setMessages(restored);
            setConversationId(data[0].id);
            setHasStarted(true);
            // If restored chat already had research, mark as done
            if (savedMsgs.some((m: any) => m.deepSearchDone)) setDeepSearchDone(true);
          }
        } catch { /* invalid JSON */ }
      }
    } catch (error) {
      console.error('Error loading saved chat:', error);
    } finally {
      setIsRestoringChat(false);
    }
  };

  const triggerFirstQuestion = async () => {
    setIsLoading(true);
    let assistantSoFar = '';
    const assistantId = crypto.randomUUID();
    try {
      const definedParams = Object.entries(parameters)
        .filter(([_, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      const initialMsg = definedParams
        ? `Quero criar um roteiro de vídeo. Já tenho estes parâmetros: ${definedParams}. ANTES de criar qualquer roteiro, me ajude a explorar o assunto: apresente dados e tendências que você encontrou na pesquisa, sugira ângulos diferentes que eu possa não ter considerado, e me faça perguntas para entender melhor o que eu quero transmitir. Só crie o roteiro quando eu confirmar que estou pronto.`
        : 'Quero criar um roteiro de vídeo. ANTES de criar qualquer roteiro, me ajude a explorar o assunto: me faça perguntas sobre meu negócio, público e objetivos. Sugira parâmetros como plataforma, tom emocional, duração e estágio do funil. Apresente dados e tendências do meu nicho. Só crie o roteiro quando eu confirmar que estou pronto.';

      const triggerMsg: ChatMessage = { id: 'trigger', role: 'user', content: initialMsg, timestamp: new Date() };
      setMessages([triggerMsg]);

      // Check if we should research from the start
      const shouldSearch = !deepSearchDone && parameters?.tema?.trim() && parameters?.objetivo?.trim();
      if (shouldSearch) setIsResearching(true);

      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulting-audiovisual-scriptwriter`,
        body: {
          messages: [{ role: 'user', content: initialMsg }],
          context: strategicContext,
          parameters,
          previousConversations: previousSummary,
          deepSearchDone,
          historyAnalysis: historyAnalysis || undefined,
        },
        onDelta: (chunk) => {
          if (isResearching) setIsResearching(false);
          assistantSoFar += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { id: assistantId, role: 'assistant', content: assistantSoFar, timestamp: new Date() }];
          });
        },
        onFallbackJson: (data) => {
          setIsResearching(false);
          if (data.aiProvider === 'openrouter') toast.info('Usando FreeFlow LLM');
          if (data.hasResearch) { setDeepSearchDone(true); toast.success('Pesquisa de tendências concluída!'); }
          assistantSoFar = data.result || 'Vamos começar!';
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantSoFar, timestamp: new Date(), hasScript: assistantSoFar.includes('===ROTEIRO===') }]);
        },
        onDone: () => {
          setIsResearching(false);
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 && m.role === 'assistant'
              ? { ...m, hasScript: assistantSoFar.includes('===ROTEIRO===') }
              : m
          ));
          addScriptsFromResponse(assistantSoFar);
        },
      });
    } catch (error) {
      console.error('Error triggering first question:', error);
      setIsResearching(false);
      setMessages([{
        id: 'fallback', role: 'assistant',
        content: 'Olá! Sou seu Diretor Criativo. Vamos CONSTRUIR JUNTOS um roteiro único.\n\nPrimeiro, me conte: qual produto ou serviço vamos destacar?\n\n1. Me conte sobre o produto principal\n2. Quero focar no serviço mais vendido\n3. Tenho uma ideia específica em mente',
        timestamp: new Date(),
      }]);
    } finally { setIsLoading(false); }
  };

  const addScriptsFromResponse = (content: string) => {
    // Don't auto-save anymore - user must explicitly approve via button
    // Just mark the message as having a script
  };

  const loadPreviousConversations = async () => {
    try {
      const { data } = await supabase.from('ai_analyses').select('id, content, generated_at')
        .eq('analysis_type', 'audiovisual_conversation').order('generated_at', { ascending: false }).limit(5);
      if (data && data.length > 0) {
        const summaries = data.map(d => {
          try {
            const msgs = JSON.parse(d.content);
            return Array.isArray(msgs) ? msgs.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ') : '';
          } catch { return ''; }
        }).filter(Boolean);
        if (summaries.length > 0) setPreviousSummary('Tópicos anteriores: ' + summaries.join('; ').substring(0, 1500));
      }
    } catch (error) { console.error('Error loading conversations:', error); }
  };

  const saveConversation = async (msgs: ChatMessage[]) => {
    try {
      const content = JSON.stringify(msgs.map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 3000), timestamp: m.timestamp, deepSearchDone })));
      if (conversationId) {
        await supabase.from('ai_analyses').update({ content }).eq('id', conversationId);
      } else {
        const { data } = await supabase.from('ai_analyses').insert({
          instance_id: instanceId, analysis_type: 'audiovisual_conversation',
          analysis_scope: 'chat_history', content, model_used: 'google/gemini-2.5-pro',
        }).select('id').single();
        if (data) setConversationId(data.id);
      }
    } catch (error) { console.error('Error saving conversation:', error); }
  };

  const sendToAI = async (currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    let assistantSoFar = '';
    const assistantId = crypto.randomUUID();

    // Build cumulative synthesis
    const synthesis = buildCumulativeSynthesis(currentMessages);

    // Check if we should trigger research
    const shouldSearch = !deepSearchDone && currentMessages.length >= 3;
    if (shouldSearch) setIsResearching(true);

    try {
      const apiMessages = currentMessages.filter(m => m.id !== 'fallback').map(m => ({ role: m.role, content: m.content }));

      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulting-audiovisual-scriptwriter`,
        body: {
          messages: apiMessages,
          context: strategicContext,
          parameters,
          previousConversations: previousSummary,
          deepSearchDone,
          cumulativeSynthesis: synthesis || undefined,
          historyAnalysis: historyAnalysis || undefined,
        },
        onDelta: (chunk) => {
          if (isResearching) setIsResearching(false);
          assistantSoFar += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && last.id === assistantId) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { id: assistantId, role: 'assistant', content: assistantSoFar, timestamp: new Date() }];
          });
        },
        onFallbackJson: (data) => {
          setIsResearching(false);
          if (data.aiProvider === 'openrouter') toast.info('Usando FreeFlow LLM');
          if (data.hasResearch) { setDeepSearchDone(true); toast.success('Pesquisa de tendências integrada!'); }
          assistantSoFar = data.result || 'Sem resposta';
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantSoFar, timestamp: new Date() }]);
        },
        onDone: () => {
          setIsResearching(false);
          if (!deepSearchDone && currentMessages.length >= 3) setDeepSearchDone(true);
        },
      });

      const hasScript = assistantSoFar.includes('===ROTEIRO===');
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'assistant'
          ? { ...m, hasScript }
          : m
      ));
      const allMsgs = [...currentMessages, { id: assistantId, role: 'assistant' as const, content: assistantSoFar, timestamp: new Date(), hasScript }];
      await saveConversation(allMsgs);
      addScriptsFromResponse(assistantSoFar);
    } catch (error) {
      console.error('Chat error:', error);
      setIsResearching(false);
      toast.error('Erro ao processar mensagem');
      if (!assistantSoFar) setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    await sendToAI(updatedMessages);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading || disabled) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: suggestion, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    sendToAI(updatedMessages);
  };

  const handleReset = () => { setMessages([]); setConversationId(null); setHasStarted(false); setDeepSearchDone(false); };

  const handleClearChat = async () => {
    if (conversationId) {
      await supabase.from('ai_analyses').delete().eq('id', conversationId);
    }
    setMessages([]);
    setConversationId(null);
    setHasStarted(false);
    setDeepSearchDone(false);
    setPreviousSummary('');
    toast.success('Chat limpo!');
  };

  // Extract numbered suggestions from AI text
  const extractSuggestions = (text: string): { cleanText: string; suggestions: string[] } => {
    const lines = text.split('\n');
    const suggestions: string[] = [];
    const cleanLines: string[] = [];
    for (const line of lines) {
      const match = line.match(/^\s*(\d+)[.)]\s+(.+)/);
      if (match) suggestions.push(match[2].trim());
      else cleanLines.push(line);
    }
    return { cleanText: cleanLines.join('\n').trim(), suggestions };
  };

  // Categorize a chip for visual styling
  const categorizeChip = (chip: string): { icon: typeof Sparkles; color: string } => {
    const lower = chip.toLowerCase();
    if (/reel|tiktok|youtube|shorts|story|stories|feed|post/i.test(lower))
      return { icon: Video, color: 'bg-blue-500/10 text-blue-600 border-blue-500/25 hover:bg-blue-500/20' };
    if (/educativo|divertido|emocional|inspirador|provocativo|sério|informal|formal|humorístico|tom\s/i.test(lower))
      return { icon: Brain, color: 'bg-purple-500/10 text-purple-600 border-purple-500/25 hover:bg-purple-500/20' };
    if (/\d+\s*s|segundo|minuto|curto|longo|duração/i.test(lower))
      return { icon: RefreshCw, color: 'bg-amber-500/10 text-amber-600 border-amber-500/25 hover:bg-amber-500/20' };
    if (/topo|meio|fundo|funil|awareness|consideração|conversão/i.test(lower))
      return { icon: TrendingUp, color: 'bg-green-500/10 text-green-600 border-green-500/25 hover:bg-green-500/20' };
    return { icon: Sparkles, color: 'bg-primary/10 text-primary border-primary/25 hover:bg-primary/20' };
  };

  // Extract parameter-like chips from AI text
  const extractParamChips = (text: string): string[] => {
    const chips: string[] = [];
    const quotedMatches = text.match(/['"""]([^'"""]{3,30})['"""]/g);
    if (quotedMatches) {
      for (const q of quotedMatches) {
        const clean = q.replace(/['"""""]/g, '').trim();
        if (clean.length >= 3 && clean.length <= 30 && !chips.includes(clean)) chips.push(clean);
      }
    }
    const boldMatches = text.match(/\*\*([^*]{3,30})\*\*/g);
    if (boldMatches) {
      for (const b of boldMatches) {
        const clean = b.replace(/\*\*/g, '').trim();
        if (clean.length >= 3 && clean.length <= 25 && !clean.includes('.') && !chips.includes(clean)) chips.push(clean);
      }
    }
    return chips.slice(0, 8);
  };

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  const handleStartEditScript = (message: ChatMessage) => {
    const script = parseScriptFromChat(message.content, parameters?.tema, clientName);
    if (!script) { toast.error('Não foi possível extrair o roteiro.'); return; }
    // Garantir título útil
    script.titulo = deriveScriptTitle(
      { titulo: script.titulo, gancho: script.gancho, rawText: script.rawText },
      parameters?.tema,
      clientName,
    );
    setEditingScript({ messageId: message.id, script });
  };

  const deriveTitle = (script: GeneratedScript): string => {
    return deriveScriptTitle(
      {
        titulo: script.titulo,
        gancho: script.gancho,
        rawText: script.rawText,
      },
      parameters?.tema,
      clientName,
    );
  };

  const handleSaveEditedScript = async () => {
    if (!editingScript) return;
    if (!editingScript.script.titulo?.trim()) {
      editingScript.script.titulo = deriveTitle(editingScript.script);
    }
    await addScriptAndSave(editingScript.script);
    queryClient.invalidateQueries({ queryKey: ['script-history'] });
    setMessages(prev => prev.map(m => m.id === editingScript.messageId ? { ...m, scriptApproved: true } : m));
    toast.success(`Roteiro "${editingScript.script.titulo}" salvo no histórico!`);
    setEditingScript(null);
  };

  const handleApproveScript = async (message: ChatMessage) => {
    const script = parseScriptFromChat(message.content, parameters?.tema, clientName);
    if (!script) { toast.error('Não foi possível extrair o roteiro.'); return; }
    if (!script.titulo?.trim()) {
      script.titulo = deriveTitle(script);
    }
    if (scriptOnly) {
      script.legendaSugerida = '';
      script.dicasGravacao = '';
      script.observacoesEstrategicas = '';
    }
    await addScriptAndSave(script);
    queryClient.invalidateQueries({ queryKey: ['script-history'] });
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, scriptApproved: true } : m));
    toast.success(`Roteiro "${script.titulo}" salvo no histórico!`);
  };

  const renderScriptEditForm = () => {
    if (!editingScript) return null;
    const s = editingScript.script;
    const updateField = (field: keyof GeneratedScript, value: string) => {
      setEditingScript(prev => prev ? { ...prev, script: { ...prev.script, [field]: value } } : null);
    };
    const fields = [
      { key: 'titulo' as const, label: 'Título' },
      { key: 'gancho' as const, label: '🎯 Gancho' },
      { key: 'desenvolvimento' as const, label: '📝 Desenvolvimento' },
      { key: 'cta' as const, label: '🚀 CTA' },
      ...(!scriptOnly ? [
        { key: 'legendaSugerida' as const, label: '💬 Legenda' },
        { key: 'dicasGravacao' as const, label: '🎥 Dicas de Gravação' },
        { key: 'observacoesEstrategicas' as const, label: '💡 Observações' },
      ] : []),
    ];
    return (
      <div className="p-4 border-2 rounded-xl space-y-3 bg-background border-primary/40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-primary">
            <Pencil className="h-4 w-4" /> Editar Roteiro antes de Salvar
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingScript(null)} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{label}</label>
            {key === 'titulo' ? (
              <input
                className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={(s[key] as string) || ''}
                onChange={(e) => updateField(key, e.target.value)}
              />
            ) : (
              <Textarea
                className="text-sm min-h-[60px] bg-muted/50"
                value={(s[key] as string) || ''}
                onChange={(e) => updateField(key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSaveEditedScript} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            <Save className="h-3.5 w-3.5" /> Salvar no Histórico
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingScript(null)}>Cancelar</Button>
        </div>
      </div>
    );
  };

  const renderScript = (message: ChatMessage) => {
    const content = message.content;
    const parts = content.split('===ROTEIRO===');
    const beforeScript = parts[0]?.trim();
    const scriptPart = parts[1]?.split('===FIM_ROTEIRO===');
    const scriptContent = scriptPart?.[0]?.trim();
    const afterScript = scriptPart?.[1]?.trim();

    // If we're editing THIS message's script, show the edit form
    if (editingScript && editingScript.messageId === message.id) {
      return (
        <div className="space-y-3">
          {beforeScript && <FormattedText text={beforeScript} />}
          {renderScriptEditForm()}
          {afterScript && <div className="mt-2 text-muted-foreground"><FormattedText text={afterScript} /></div>}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {beforeScript && <FormattedText text={beforeScript} />}
        {scriptContent && (
          <div className="p-4 border-2 rounded-xl space-y-2 bg-muted/50 border-primary/30">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-primary">ROTEIRO ESTRUTURADO</span>
              {clientName && <span className="text-xs font-normal text-muted-foreground">• {clientName}</span>}
            </div>
            <FormattedText text={scriptContent} />
            <div className="pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
              {message.scriptApproved ? (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Salvo no Histórico
                </Badge>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEditScript(message)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveScript(message)}
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprovar e Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {afterScript && <div className="mt-2 text-muted-foreground"><FormattedText text={afterScript} /></div>}
      </div>
    );
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.hasScript && message.content.includes('===ROTEIRO===')) {
      return renderScript(message);
    }

    if (message.role === 'assistant' && message.id === lastAssistantId && !isLoading) {
      const { cleanText, suggestions } = extractSuggestions(message.content);
      const paramChips = extractParamChips(message.content);
      return (
        <div className="space-y-3">
          <FormattedText text={cleanText} />
          {/* Parameter chips - categorized with icons */}
          {paramChips.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sugestões rápidas</p>
              <div className="flex flex-wrap gap-1.5">
                {paramChips.map((chip, i) => {
                  const { icon: ChipIcon, color } = categorizeChip(chip);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(chip)}
                      disabled={isLoading || disabled}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-medium",
                        "disabled:opacity-40 disabled:cursor-not-allowed active:scale-95",
                        "shadow-sm hover:shadow-md",
                        color,
                      )}
                    >
                      <ChipIcon className="h-3 w-3" />
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Numbered suggestions - card style */}
          {suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Opções para explorar</p>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading || disabled}
                  className="w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border/50 bg-background/80 hover:bg-accent/70 hover:border-primary/30 hover:shadow-sm transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed group active:scale-[0.98]"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-foreground/90 group-hover:text-foreground">{suggestion}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <FormattedText text={message.content} />;
  };

  return (
    <div className="flex flex-col h-[650px] border-2 border-primary/20 rounded-xl bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Diretor Criativo IA {clientName && <span className="font-normal text-muted-foreground">• {clientName}</span>}</h3>
            <p className="text-[10px] text-muted-foreground">Co-criação inteligente com pesquisa de mercado</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer" title="Gerar apenas Gancho + Desenvolvimento + CTA, sem legenda e dicas">
            <Switch checked={scriptOnly} onCheckedChange={setScriptOnly} className="scale-75" />
            <span className="text-[10px] text-muted-foreground font-medium">Só Roteiro</span>
          </label>
          {isContextLoaded && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/5 border-primary/20 text-primary gap-1">
              <Database className="h-3 w-3" /> Dados
            </Badge>
          )}
          {deepSearchDone && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 border-green-500/30 text-green-600 gap-1">
              <Globe className="h-3 w-3" /> Pesquisa
            </Badge>
          )}
          {previousSummary && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Memória
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 w-7 p-0" title="Reiniciar conversa">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearChat} className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Limpar chat e histórico de conversa">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-10">
              <Brain className="h-10 w-10 mx-auto text-primary/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {isRestoringChat ? 'Carregando conversa anterior...' : 'Carregando contexto estratégico...'}
              </p>
            </div>
          )}

          {messages.filter(m => m.id !== 'trigger').map((message) => (
            <div key={message.id} className={cn("flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300", message.role === 'user' && "justify-end")}>
              {message.role === 'assistant' && (
                <div className="shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
              <div className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 shadow-sm",
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/80 border border-border/40 rounded-bl-md'
              )}>
                {renderMessageContent(message)}
              </div>
              {message.role === 'user' && (
                <div className="shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-1 ring-border/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Research indicator */}
          {isResearching && (
            <div className="flex gap-3">
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Search className="h-4 w-4 text-green-600 animate-pulse" />
                </div>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Globe className="h-4 w-4 animate-spin" />
                  Pesquisando tendências virais do nicho...
                </div>
              </div>
            </div>
          )}

          {isLoading && !isResearching && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando e construindo com você...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 bg-gradient-to-t from-muted/30 to-transparent">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Responda, aprove trechos ou peça ajustes..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl border-border/60 focus:border-primary/40"
            rows={1}
            disabled={isLoading || disabled}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            className="shrink-0 h-[44px] w-[44px] rounded-xl shadow-sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
