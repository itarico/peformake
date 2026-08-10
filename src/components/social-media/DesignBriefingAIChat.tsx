import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, Loader2, Bot, User, 
  Copy, Check, RefreshCw, Palette, Plus,
  Instagram, Image, FileImage, MonitorPlay, Layout, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DesignBriefingAIChatProps {
  clientName: string;
  clientContext: {
    businessDescription?: string;
    businessSegment?: string;
    targetAudience?: string;
    valueProposition?: string;
    monthlyFocus?: string;
    frameworkAnswers?: string;
    products?: string;
    strategicData?: string;
    seasonalityDates?: string;
  };
  onAddBriefing?: (briefing: DesignBriefing) => void;
}

export interface DesignBriefing {
  titulo: string;
  tipo: 'post_instagram' | 'story' | 'carrossel';
  destino: string;
  headline?: string;
  headline_variacoes?: string[];
  subtitle?: string;
  cta?: string;
  cta_variacoes?: string[];
  descricao: string;
  observacoes?: string;
  detalhamento?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  briefings?: DesignBriefing[];
  aiProvider?: 'lovable' | 'openrouter';
}

const DESIGN_DESTINATIONS = [
  { value: 'instagram_feed', label: 'Instagram Feed', icon: Instagram },
  { value: 'instagram_stories', label: 'Instagram Stories', icon: Image },
  { value: 'instagram_carrossel', label: 'Instagram Carrossel', icon: FileImage },
  { value: 'facebook', label: 'Facebook', icon: Layout },
  { value: 'banner_site', label: 'Banner para Site', icon: MonitorPlay },
  { value: 'banner_ads', label: 'Banner para Ads', icon: Layout },
  { value: 'whatsapp', label: 'WhatsApp/Status', icon: Image },
  { value: 'thumbnail', label: 'Thumbnail YouTube', icon: MonitorPlay },
  { value: 'outro', label: 'Outro', icon: FileImage },
];

const ART_STYLE_OPTIONS = [
  { value: 'post_estatico', label: 'Post Estático' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'stories', label: 'Stories' },
  { value: 'ads', label: 'Ads (Venda)' },
  { value: 'banner', label: 'Banner' },
  { value: 'thumbnail', label: 'Thumbnail' },
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'initial',
  role: 'assistant',
  content: `Olá! Sou sua assistente de Design Gráfico. 🎨

Vou te ajudar a criar briefings completos e estratégicos para suas artes.

Selecione o destino e o estilo da arte, depois me conte:
• Qual é o objetivo da peça?
• Qual oferta, benefício ou mensagem central?
• Existe promoção ou campanha ativa?

Ative “Mais informações” para receber variações mais completas de Headline, Subtítulo e CTA.`,
  timestamp: new Date(),
};

export function DesignBriefingAIChat({ clientName, clientContext, onAddBriefing }: DesignBriefingAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [destination, setDestination] = useState<string>('instagram_feed');
  const [artStyle, setArtStyle] = useState<string>('post_estatico');
  const [detailMode, setDetailMode] = useState<'standard' | 'expanded'>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    const parts = [
      `CLIENTE: ${clientName}`,
      `SEGMENTO: ${clientContext.businessSegment || 'Não especificado'}`,
      `DESCRIÇÃO: ${clientContext.businessDescription || 'Não especificada'}`,
      `PÚBLICO-ALVO: ${clientContext.targetAudience || 'Não especificado'}`,
      `PROPOSTA DE VALOR: ${clientContext.valueProposition || 'Não especificada'}`,
      `FOCO DO MÊS: ${clientContext.monthlyFocus || 'Não definido'}`,
    ];

    if (clientContext.products) {
      parts.push(`\nPRODUTOS/SERVIÇOS DO CLIENTE (com preços):\n${clientContext.products}`);
    }
    if (clientContext.frameworkAnswers) {
      parts.push(`\nDADOS DOS FRAMEWORKS:\n${clientContext.frameworkAnswers}`);
    }
    if (clientContext.strategicData) {
      parts.push(`\nDADOS ESTRATÉGICOS:\n${clientContext.strategicData}`);
    }
    if (clientContext.seasonalityDates) {
      parts.push(`\nDATAS SAZONAIS:\n${clientContext.seasonalityDates}`);
    }

    return parts.join('\n');
  };

  const getDestinationLabel = (value: string) => {
    return DESIGN_DESTINATIONS.find(d => d.value === value)?.label || value;
  };

  const getArtStyleLabel = (value: string) => {
    return ART_STYLE_OPTIONS.find(style => style.value === value)?.label || value;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('consulting-social-media-ai', {
        body: {
          action: 'design_briefing',
          context: buildContext(),
          destination: getDestinationLabel(destination),
          artStyle,
          artStyleLabel: getArtStyleLabel(artStyle),
          detailMode,
          conversationHistory,
          userMessage: input.trim(),
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Erro na chamada da função');
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      // Parse briefings from the response if present
      let briefings: DesignBriefing[] = [];
      if (data.briefings && Array.isArray(data.briefings)) {
        briefings = data.briefings;
      }

      // Show AI provider notification
      const providerName = data.aiProvider === 'openrouter' ? 'FreeFlow (OpenRouter)' : 'Lovable AI';
      if (data.aiProvider === 'openrouter') {
        toast.info(`Usando ${providerName} como fallback`, { duration: 3000 });
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.result || 'Desculpe, não consegui processar sua solicitação.',
        timestamp: new Date(),
        briefings: briefings.length > 0 ? briefings : undefined,
        aiProvider: data.aiProvider,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddBriefing = (briefing: DesignBriefing) => {
    if (onAddBriefing) {
      onAddBriefing(briefing);
      toast.success('Briefing adicionado como arte!');
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">IA de Briefing de Design</CardTitle>
              <CardDescription>
                Gere briefings completos e estratégicos para suas artes
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Destination and style selectors */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Destino da Arte</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                {DESIGN_DESTINATIONS.map((dest) => (
                  <SelectItem key={dest.value} value={dest.value}>
                    <div className="flex items-center gap-2">
                      <dest.icon className="h-4 w-4" />
                      {dest.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Estilo da Arte</Label>
            <Select value={artStyle} onValueChange={setArtStyle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o estilo" />
              </SelectTrigger>
              <SelectContent>
                {ART_STYLE_OPTIONS.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Mais informações</p>
            <p className="text-xs text-muted-foreground">
              Gera mais variações e maior profundidade em Headline, Subtítulo e CTA.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={detailMode === 'expanded' ? 'default' : 'outline'}
            className="gap-1"
            onClick={() => setDetailMode(prev => prev === 'expanded' ? 'standard' : 'expanded')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {detailMode === 'expanded' ? 'Ativado' : 'Ativar'}
          </Button>
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

                  {/* Briefing cards */}
                  {message.briefings && message.briefings.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {message.briefings.map((briefing, index) => (
                        <Card key={index} className="border-primary/30 bg-primary/5">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Badge variant="secondary" className="mb-2">
                                  {briefing.destino}
                                </Badge>
                                <h4 className="font-semibold">{briefing.titulo}</h4>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => handleAddBriefing(briefing)}
                              >
                                <Plus className="h-3 w-3" />
                                Usar
                              </Button>
                            </div>
                            
                            {briefing.headline && (
                              <div>
                                <p className="text-xs text-muted-foreground">Headline</p>
                                <p className="text-sm font-medium">{briefing.headline}</p>
                              </div>
                            )}

                            {briefing.headline_variacoes && briefing.headline_variacoes.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Variações de Headline</p>
                                <p className="text-sm">{briefing.headline_variacoes.join(' • ')}</p>
                              </div>
                            )}
                            
                            {briefing.subtitle && (
                              <div>
                                <p className="text-xs text-muted-foreground">Subtítulo</p>
                                <p className="text-sm">{briefing.subtitle}</p>
                              </div>
                            )}
                            
                            {briefing.cta && (
                              <div>
                                <p className="text-xs text-muted-foreground">CTA</p>
                                <Badge variant="outline">{briefing.cta}</Badge>
                              </div>
                            )}

                            {briefing.cta_variacoes && briefing.cta_variacoes.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Variações de CTA</p>
                                <p className="text-sm">{briefing.cta_variacoes.join(' • ')}</p>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-xs text-muted-foreground">Descrição</p>
                              <p className="text-sm whitespace-pre-wrap">{briefing.descricao}</p>
                            </div>
                            
                            {briefing.observacoes && (
                              <div>
                                <p className="text-xs text-muted-foreground">Observações Técnicas</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{briefing.observacoes}</p>
                              </div>
                            )}

                            {briefing.detalhamento && (
                              <div>
                                <p className="text-xs text-muted-foreground">Mais Informações</p>
                                <p className="text-sm whitespace-pre-wrap">{briefing.detalhamento}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
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
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Criando briefing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva oferta, objetivo e mensagem da peça (o estilo selecionado será aplicado automaticamente)..."
            disabled={isLoading}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            rows={2}
          />
          <Button 
            onClick={handleSend} 
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
