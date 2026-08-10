import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Loader2, Check, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionFirecrawlButtonProps {
  questionId: string;
  questionText: string;
  searchType: string;
  clientContext: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
  };
  onResultGenerated: (result: string) => void;
  disabled?: boolean;
}

export function QuestionFirecrawlButton({
  questionId,
  questionText,
  searchType,
  clientContext,
  onResultGenerated,
  disabled = false,
}: QuestionFirecrawlButtonProps) {
  const [open, setOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const segment = clientContext.business_segment || clientContext.business_description || '';
      const audience = clientContext.target_audience || '';
      
      // Build search query based on type
      let searchQuery = customQuery.trim();
      if (!searchQuery) {
        switch (searchType) {
          case 'trends':
            searchQuery = `${segment} tendências mercado 2024 2025 oportunidades`;
            break;
          case 'competition':
            searchQuery = `${segment} concorrentes ameaças mercado análise`;
            break;
          case 'audience':
            searchQuery = `${segment} ${audience} segmentos público-alvo personas`;
            break;
          case 'channels':
            searchQuery = `${segment} ${audience} canais conteúdo redes sociais preferidas`;
            break;
          case 'strategy':
            searchQuery = `${segment} estratégias marketing digital melhores práticas`;
            break;
          case 'tactics':
            searchQuery = `${segment} táticas marketing ações campanhas`;
            break;
          case 'seo':
            searchQuery = `${segment} palavras-chave SEO keywords Google`;
            break;
          case 'hashtags':
            searchQuery = `${segment} hashtags trending Instagram TikTok`;
            break;
          case 'timing':
            searchQuery = `${segment} melhores horários postagem redes sociais`;
            break;
          case 'content':
            searchQuery = `${segment} ideias conteúdo topo funil awareness`;
            break;
          default:
            searchQuery = `${segment} ${questionText}`;
        }
      }

      const response = await supabase.functions.invoke('consulting-firecrawl-research', {
        body: {
          instance_id: questionId,
          keywords: searchQuery.split(' ').filter(k => k.length > 2),
          client_context: clientContext,
          search_only: true, // Flag to only do search, not full research
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na pesquisa');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data?.resumo_estrategico || data?.data?.resumo_estrategico) {
        const result = data.resumo_estrategico || data.data?.resumo_estrategico;
        setSearchResults(result);
        toast.success('Pesquisa web concluída!');
      } else if (data?.raw_results) {
        setSearchResults(data.raw_results);
        toast.success('Resultados encontrados!');
      } else {
        toast.info('Pesquisa concluída, mas sem resultados relevantes.');
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast.error('Erro ao pesquisar na web. Tente novamente.');
    },
  });

  const handleOpen = () => {
    setOpen(true);
    setCustomQuery('');
    setSearchResults(null);
  };

  const handleSearch = () => {
    searchMutation.mutate();
  };

  const handleApply = () => {
    if (searchResults) {
      onResultGenerated(searchResults);
      setOpen(false);
      toast.success('Resultado aplicado!');
    }
  };

  const getSearchTypeLabel = () => {
    const labels: Record<string, string> = {
      trends: 'Tendências de Mercado',
      competition: 'Análise de Concorrência',
      audience: 'Segmentos de Público',
      channels: 'Canais de Conteúdo',
      strategy: 'Estratégias de Marketing',
      tactics: 'Táticas e Ações',
      seo: 'Palavras-chave SEO',
      hashtags: 'Hashtags Trending',
      timing: 'Melhores Horários',
      content: 'Ideias de Conteúdo',
    };
    return labels[searchType] || 'Pesquisa Web';
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        disabled={disabled}
        className="shrink-0 text-blue-500 hover:bg-blue-500/10 h-8 w-8"
        title="Pesquisar na Web"
      >
        <Globe className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Pesquisa Web com Firecrawl
            </DialogTitle>
            <DialogDescription>
              {getSearchTypeLabel()} - Busca inteligente na web para preencher a resposta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Pergunta:</strong> {questionText}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="custom-query">Personalizar busca (opcional)</Label>
              <Input
                id="custom-query"
                placeholder="Digite termos adicionais para refinar a busca..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                disabled={searchMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a busca automática baseada no contexto do cliente
              </p>
            </div>

            {clientContext.business_segment && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                  Segmento: {clientContext.business_segment}
                </span>
                {clientContext.target_audience && (
                  <span className="bg-green-500/10 text-green-600 px-2 py-1 rounded">
                    Público: {clientContext.target_audience}
                  </span>
                )}
              </div>
            )}

            {!searchResults ? (
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
                className="w-full"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pesquisando na web...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Iniciar Pesquisa
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Resultados Encontrados
                  </div>
                </div>

                <Card className="bg-muted/50 max-h-64 overflow-y-auto">
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{searchResults}</p>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setSearchResults(null)}
                  >
                    Nova Busca
                  </Button>
                  <Button onClick={handleApply}>
                    <Check className="h-4 w-4 mr-2" />
                    Aplicar Resultado
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
