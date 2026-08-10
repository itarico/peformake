import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { streamChat } from '@/lib/streamingChat';
import {
  Send, Loader2, Bot, User, Copy, Check, RefreshCw, Download,
  Search, Sparkles, Target, MessageSquare, Palette, Video,
  ChevronDown, ChevronUp, Zap, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// html2pdf is now loaded dynamically via pdfUtils
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CHAT_CONFIGS } from './GuidedChatConfig';
import type { ChatType, ChatMessage, ClientContext } from './types';
import { useEnrichedContext, type EnrichedContextData } from '@/hooks/useEnrichedContext';
import { ChatMessages } from './ChatMessages';
import { ChatParamsPanel } from './ChatParamsPanel';

const ICON_MAP: Record<string, any> = {
  Target, MessageSquare, Palette, Video,
};

interface GuidedAIChatProps {
  chatType: ChatType;
  clientName: string;
  clientContext: {
    businessDescription?: string;
    businessSegment?: string;
    targetAudience?: string;
    valueProposition?: string;
    monthlyFocus?: string;
  };
  consultingMonthId?: string;
  clientId?: string;
}

export function GuidedAIChat({ chatType, clientName, clientContext, consultingMonthId, clientId }: GuidedAIChatProps) {
  const config = CHAT_CONFIGS[chatType];
  const IconComponent = ICON_MAP[config.icon] || Sparkles;

  const initialMsg: ChatMessage = {
    id: 'initial', role: 'assistant', content: config.initialMessage, timestamp: new Date(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMsg]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedParams, setSelectedParams] = useState<Record<string, string>>({});
  const [showParams, setShowParams] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Enriched context from database
  const { data: enrichedContext, isLoading: loadingContext } = useEnrichedContext(consultingMonthId, clientId);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const buildClientContext = useCallback((): ClientContext => ({
    name: clientName,
    segment: clientContext.businessSegment,
    description: clientContext.businessDescription,
    audience: clientContext.targetAudience,
    valueProposition: clientContext.valueProposition,
    monthlyFocus: clientContext.monthlyFocus,
  }), [clientName, clientContext]);

  const sendMessage = useCallback(async (text: string, doResearch = false) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: text.trim(), timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    if (doResearch) setIsResearching(true);

    let assistantSoFar = '';
    const assistantId = crypto.randomUUID();

    try {
      const history = messages
        .filter(m => m.id !== 'initial')
        .map(m => ({ role: m.role, content: m.content }));

      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulting-guided-ai`,
        body: {
          chatType,
          params: selectedParams,
          message: text.trim(),
          clientContext: buildClientContext(),
          history,
          doResearch,
          enrichedData: enrichedContext || undefined,
        },
        onDelta: (chunk) => {
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
          if (data.aiProvider === 'openrouter') toast.info('Usando FreeFlow como fallback', { duration: 3000 });
          assistantSoFar = data.result || 'Sem resposta.';
          setMessages(prev => [...prev, {
            id: assistantId, role: 'assistant', content: assistantSoFar,
            timestamp: new Date(), aiProvider: data.aiProvider, hasResearch: data.hasResearch,
          }]);
        },
        onDone: () => {},
      });
    } catch (error) {
      console.error('Chat error:', error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (msg.includes('Rate limit') || msg.includes('429')) {
        toast.error('Muitas solicitações. Aguarde um momento.');
      } else if (msg.includes('Credits') || msg.includes('402')) {
        toast.error('Serviço temporariamente indisponível.');
      } else {
        toast.error(`Erro: ${msg}`);
      }
      if (!assistantSoFar) setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setIsResearching(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, chatType, selectedParams, buildClientContext, enrichedContext]);

  const handleSend = () => sendMessage(input);
  const handleQuickPrompt = (prompt: string) => sendMessage(prompt);
  const handleGeneratePlan = () => sendMessage(config.generatePrompt, true);

  const handleParamSelect = (key: string, value: string) => {
    setSelectedParams(prev => {
      const updated = { ...prev };
      if (updated[key] === value) { delete updated[key]; }
      else { updated[key] = value; }
      return updated;
    });
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportPDF = async (message: ChatMessage) => {
    const { buildStandardPdfHtml, exportHtmlToPdf, pdfContentBlock } = await import('@/lib/pdfUtils');
    const htmlContent = buildStandardPdfHtml({
      title: config.title,
      subtitle: format(message.timestamp, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      clientName,
      body: `<div style="margin-bottom: 20px;">${pdfContentBlock(message.content)}</div>`,
    });
    try {
      await exportHtmlToPdf(htmlContent, `${chatType}-plano-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado!');
    } catch { toast.error('Erro ao exportar PDF'); }
  };

  const handleReset = () => {
    setMessages([initialMsg]);
    setSelectedParams({});
    setShowParams(true);
  };

  const paramCount = Object.keys(selectedParams).length;
  const hasEnrichedData = enrichedContext && (
    enrichedContext.frameworkAnswers || enrichedContext.contentAnalyses ||
    enrichedContext.researchData || enrichedContext.products ||
    enrichedContext.strategicData || enrichedContext.seasonalityDates
  );

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {config.description}
                {hasEnrichedData && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                    <Database className="h-3 w-3 mr-1" />
                    Dados cruzados ativos
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Collapsible Param Selectors */}
        <ChatParamsPanel
          params={config.params}
          selectedParams={selectedParams}
          showParams={showParams}
          onToggleParams={() => setShowParams(!showParams)}
          onParamSelect={handleParamSelect}
          paramCount={paramCount}
        />

        {/* Generate Plan Button */}
        <Button
          onClick={handleGeneratePlan}
          disabled={isLoading}
          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="lg"
        >
          {isResearching ? (
            <>
              <Search className="h-4 w-4 animate-pulse" />
              Pesquisando mercado e gerando...
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando plano...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {config.generateLabel}
            </>
          )}
        </Button>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1.5">
          {config.quickPrompts.map((qp) => (
            <Button
              key={qp.label}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleQuickPrompt(qp.prompt)}
              disabled={isLoading}
            >
              {qp.label}
            </Button>
          ))}
        </div>

        {/* Chat Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading && messages[messages.length - 1]?.role !== 'assistant'}
          isResearching={isResearching && messages[messages.length - 1]?.role !== 'assistant'}
          copiedId={copiedId}
          onCopy={handleCopy}
          onExportPDF={handleExportPDF}
          scrollRef={scrollRef}
        />

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Converse com a IA, faça perguntas, peça ajustes..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            className="min-h-[50px] resize-none"
            rows={2}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
