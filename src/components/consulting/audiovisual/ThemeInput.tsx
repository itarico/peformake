import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Globe, Sparkles, Loader2, MessageSquare, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { useAudiovisual } from './AudiovisualContext';
import { cn } from '@/lib/utils';

interface ThemeInputProps {
  disabled?: boolean;
}

export function ThemeInput({ disabled }: ThemeInputProps) {
  const { parameters, setParameter, generateWithAI, searchWithFirecrawl, autoDecide, strategicContext } = useAudiovisual();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerateThemes = async (mode: 'ai' | 'firecrawl' | 'auto') => {
    setIsGenerating(mode);
    try {
      let result = '';
      
      switch (mode) {
        case 'ai':
          result = await generateWithAI('tema', `
            Gere 5 ideias de temas relevantes para vídeos baseado no contexto do cliente.
            Considere: dores do público, tendências, posicionamento e objetivos.
            Retorne apenas os temas, um por linha, sem numeração.
          `);
          break;
        case 'firecrawl':
          result = await searchWithFirecrawl('tendências de conteúdo viral + dores do público');
          break;
        case 'auto':
          result = await autoDecide('tema', 'Decidir automaticamente o melhor tema baseado em tendências e contexto');
          break;
      }

      if (result) {
        const themes = result.split('\n').filter(t => t.trim()).slice(0, 5);
        setSuggestions(themes);
        
        // If auto mode, set directly
        if (mode === 'auto' && themes.length > 0) {
          setParameter('tema', themes[0]);
        }
      }
    } catch (error) {
      console.error('Error generating themes:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const suggestedTopics = [
    { icon: <TrendingUp className="h-4 w-4" />, label: 'Tendências do Nicho' },
    { icon: <Target className="h-4 w-4" />, label: 'Dores do Público' },
    { icon: <MessageSquare className="h-4 w-4" />, label: 'Debates Atuais' },
    { icon: <Lightbulb className="h-4 w-4" />, label: 'Ideias Virais' },
  ];

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Sobre o que você quer falar?
        </CardTitle>
        <CardDescription>
          Defina o tema central do vídeo. A IA + Firecrawl podem sugerir temas baseados em tendências e contexto do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main textarea */}
        <Textarea
          value={parameters.tema}
          onChange={(e) => setParameter('tema', e.target.value)}
          placeholder="Ex: Quero falar sobre como aumentar vendas no Instagram usando stories estratégicos + técnicas de copywriting..."
          className="min-h-[100px] text-base resize-y"
          disabled={disabled}
        />

        {/* Quick topic tags */}
        <div className="flex flex-wrap gap-2">
          {suggestedTopics.map((topic) => (
            <Badge
              key={topic.label}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
              onClick={() => !disabled && handleGenerateThemes('firecrawl')}
            >
              {topic.icon}
              <span className="ml-1.5">{topic.label}</span>
            </Badge>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateThemes('ai')}
            disabled={disabled || isGenerating !== null}
          >
            {isGenerating === 'ai' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Gerar com IA
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateThemes('firecrawl')}
            disabled={disabled || isGenerating !== null}
          >
            {isGenerating === 'firecrawl' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Pesquisar na Web
          </Button>

          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-purple-600 text-white border-0"
            onClick={() => handleGenerateThemes('auto')}
            disabled={disabled || isGenerating !== null}
          >
            {isGenerating === 'auto' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            IA + Web Decidir
          </Button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Sugestões:</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                    parameters.tema === suggestion && "border-primary bg-primary/10"
                  )}
                  onClick={() => setParameter('tema', suggestion)}
                >
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
