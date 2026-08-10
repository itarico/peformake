import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { streamChat } from '@/lib/streamingChat';
import { 
  MessageSquare, Send, Loader2, Bot, User, 
  Lightbulb, Target, Copy, Check, RefreshCw, Download, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// html2pdf is now loaded dynamically via pdfUtils
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SocialMediaAIChatProps {
  clientName: string;
  clientContext: {
    businessDescription?: string;
    businessSegment?: string;
    targetAudience?: string;
    valueProposition?: string;
    monthlyFocus?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  canExport?: boolean;
  aiProvider?: 'lovable' | 'openrouter';
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'initial',
  role: 'assistant',
  content: `Olá! Sou sua assistente de Social Media. 🎯

Posso te ajudar com:
• Ideias de conteúdo para posts e reels
• Sugestões de legendas criativas
• Estratégias de engajamento
• Ideias de Stories para o dia ou semana

Me conta o que você precisa!`,
  timestamp: new Date(),
};

export function SocialMediaAIChat({ clientName, clientContext }: SocialMediaAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    return `
CLIENTE: ${clientName}
SEGMENTO: ${clientContext.businessSegment || 'Não especificado'}
DESCRIÇÃO: ${clientContext.businessDescription || 'Não especificada'}
PÚBLICO-ALVO: ${clientContext.targetAudience || 'Não especificado'}
PROPOSTA DE VALOR: ${clientContext.valueProposition || 'Não especificada'}
FOCO DO MÊS: ${clientContext.monthlyFocus || 'Não definido'}
    `.trim();
  };

  const handleSend = async (messageOverride?: string) => {
    const text = messageOverride || input;
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const assistantId = crypto.randomUUID();

    try {
      const conversationHistory = messages
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulting-social-media-ai`,
        body: {
          action: 'chat',
          context: buildContext(),
          conversationHistory,
          userMessage: text.trim(),
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
          assistantSoFar = data.result || 'Desculpe, não consegui processar.';
          setMessages(prev => [...prev, {
            id: assistantId, role: 'assistant', content: assistantSoFar,
            timestamp: new Date(), canExport: assistantSoFar.length > 200, aiProvider: data.aiProvider,
          }]);
        },
        onDone: () => {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 && m.role === 'assistant'
              ? { ...m, canExport: assistantSoFar.length > 200 }
              : m
          ));
        },
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro: ${errorMessage}`);
      if (!assistantSoFar) setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
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
      title: 'Ideias de Social Media',
      subtitle: format(message.timestamp, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      clientName,
      body: `<div style="margin-bottom: 20px;">${pdfContentBlock(message.content)}</div>`,
    });
    
    try {
      await exportHtmlToPdf(htmlContent, `social-media-ideias-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const quickPrompts = [
    { icon: <Lightbulb className="h-4 w-4" />, label: 'Ideias de posts', prompt: 'Me dê 5 ideias de posts para esta semana, considerando o foco do mês.' },
    { icon: <Target className="h-4 w-4" />, label: 'Legendas criativas', prompt: 'Crie 3 legendas criativas e envolventes para posts de engajamento.' },
    { icon: <Sparkles className="h-4 w-4" />, label: 'Tendências', prompt: 'Quais são as tendências de conteúdo que eu poderia usar para o nicho deste cliente?' },
  ];

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente de Social Media</CardTitle>
              <CardDescription>
                Converse para gerar ideias de conteúdo
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <Button
              key={qp.label}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleQuickPrompt(qp.prompt)}
              disabled={isLoading}
            >
              {qp.icon}
              {qp.label}
            </Button>
          ))}
        </div>

        {/* Chat messages */}
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0",
                  message.role === 'assistant' 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted"
                )}>
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                
                <div className={cn(
                  "flex-1 space-y-2",
                  message.role === 'user' && "text-right"
                )}>
                  <div className={cn(
                    "inline-block p-3 rounded-lg max-w-[90%]",
                    message.role === 'assistant' 
                      ? "bg-muted text-left" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {message.aiProvider && message.role === 'assistant' && (
                      <Badge 
                        variant={message.aiProvider === 'openrouter' ? 'secondary' : 'outline'} 
                        className="mb-2 text-xs"
                      >
                        {message.aiProvider === 'openrouter' ? '🔄 FreeFlow' : '⚡ Lovable AI'}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && message.id !== 'initial' && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {message.canExport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleExportPDF(message)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Peça ideias, legendas, estratégias..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
