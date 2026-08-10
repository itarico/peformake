import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Search, Flame, User, Sparkles } from 'lucide-react';
import { useAudiovisual } from './AudiovisualContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TrendResearchPanelProps {
  disabled?: boolean;
}

interface TrendResult {
  tipo: string;
  dados: string;
}

export function TrendResearchPanel({ disabled }: TrendResearchPanelProps) {
  const { searchWithFirecrawl, generateWithAI, parameters, strategicContext } = useAudiovisual();
  const [isResearching, setIsResearching] = useState<string | null>(null);
  const [results, setResults] = useState<TrendResult[]>([]);

  const researchOptions = [
    {
      id: 'viral_trends',
      icon: <Flame className="h-5 w-5" />,
      label: 'Tendência Viral do Dia',
      description: 'Hooks mais usados, estruturas dominantes, temas recorrentes',
      color: 'text-orange-500',
    },
    {
      id: 'user_content',
      icon: <User className="h-5 w-5" />,
      label: 'Conteúdo do Cliente',
      description: 'Analisar vídeos anteriores, padrões, evitar repetição',
      color: 'text-blue-500',
    },
    {
      id: 'niche_trends',
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Tendências do Nicho',
      description: 'O que está funcionando especificamente no segmento',
      color: 'text-green-500',
    },
  ];

  const handleResearch = async (type: string) => {
    setIsResearching(type);
    try {
      let query = '';
      let prompt = '';

      switch (type) {
        case 'viral_trends':
          query = 'tendências virais hoje + hooks mais usados reels tiktok + estruturas conteúdo viral';
          prompt = `Analise as tendências virais atuais e identifique:
            1. Os hooks mais eficazes sendo usados
            2. Estruturas narrativas dominantes
            3. Temas recorrentes que geram engajamento
            4. Como adaptar para o nicho do cliente
            Seja específico e prático.`;
          break;
        case 'user_content':
          prompt = `Baseado no histórico do cliente, identifique:
            1. Padrões de conteúdo que funcionaram
            2. Temas já abordados para evitar repetição
            3. Oportunidades de evolução de narrativas existentes
            4. Gaps de conteúdo a explorar`;
          break;
        case 'niche_trends':
          query = `${parameters.tema} tendências ${new Date().getFullYear()} + melhores práticas conteúdo`;
          prompt = `Identifique as tendências específicas do nicho que estão funcionando agora.`;
          break;
      }

      let result = '';
      
      if (query) {
        // Use Firecrawl + AI
        const searchResult = await searchWithFirecrawl(query);
        result = await generateWithAI(type, `
          ${prompt}
          
          Dados da pesquisa:
          ${searchResult}
          
          Retorne insights acionáveis para criar vídeos.
        `);
      } else {
        // AI only
        result = await generateWithAI(type, prompt);
      }

      setResults(prev => [
        ...prev.filter(r => r.tipo !== type),
        { tipo: type, dados: result }
      ]);
      
      toast.success('Pesquisa concluída!');
    } catch (error) {
      console.error('Research error:', error);
      toast.error('Erro ao pesquisar');
    } finally {
      setIsResearching(null);
    }
  };

  const handleFullResearch = async () => {
    if (!parameters.tema) {
      toast.error('Defina um tema antes de pesquisar');
      return;
    }
    
    setIsResearching('full');
    try {
      for (const option of researchOptions) {
        await handleResearch(option.id);
      }
      toast.success('Pesquisa completa finalizada!');
    } catch (error) {
      toast.error('Erro na pesquisa completa');
    } finally {
      setIsResearching(null);
    }
  };

  const getResultByType = (type: string) => results.find(r => r.tipo === type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Pesquisas com Firecrawl
        </CardTitle>
        <CardDescription>
          Pesquise tendências, analise conteúdo existente e descubra oportunidades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Research options */}
        <div className="grid gap-3 sm:grid-cols-3">
          {researchOptions.map((option) => {
            const result = getResultByType(option.id);
            return (
              <Card
                key={option.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  result && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-full bg-muted", option.color)}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleResearch(option.id)}
                  disabled={disabled || isResearching !== null}
                >
                  {isResearching === option.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Pesquisando...
                    </>
                  ) : result ? (
                    'Pesquisar Novamente'
                  ) : (
                    'Pesquisar'
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Full research button */}
        <Button
          className="w-full bg-gradient-to-r from-primary to-purple-600"
          onClick={handleFullResearch}
          disabled={disabled || isResearching !== null}
        >
          {isResearching === 'full' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Pesquisando Tudo...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Pesquisar Tudo Automaticamente
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="font-medium text-sm">Resultados:</p>
            {results.map((result) => {
              const option = researchOptions.find(o => o.id === result.tipo);
              return (
                <div key={result.tipo} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={option?.color}>
                      {option?.label || result.tipo}
                    </Badge>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {result.dados}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
