import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarDays, Search, ChevronDown, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
import { cleanAIText } from './ContentFormatter';
import { cn } from '@/lib/utils';

interface ResearchItem {
  id: string;
  title: string;
  content?: string;
  notes?: string;
  source_url?: string;
  source_type?: string;
}

interface ResearchDataSectionProps {
  seasonalData: ResearchItem[];
  marketData: ResearchItem[];
}

const SOURCE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  seasonal: { label: 'Sazonal', icon: <CalendarDays className="h-3 w-3" />, color: 'bg-orange-500/10 text-orange-600' },
  scrape: { label: 'Site', icon: <ExternalLink className="h-3 w-3" />, color: 'bg-blue-500/10 text-blue-600' },
  search: { label: 'Busca', icon: <Search className="h-3 w-3" />, color: 'bg-green-500/10 text-green-600' },
  ai_research: { label: 'IA', icon: <Sparkles className="h-3 w-3" />, color: 'bg-purple-500/10 text-purple-600' },
  trends: { label: 'Trends', icon: <TrendingUp className="h-3 w-3" />, color: 'bg-pink-500/10 text-pink-600' },
};

function ResearchItemCard({ item }: { item: ResearchItem }) {
  const config = SOURCE_TYPE_CONFIG[item.source_type || ''] || SOURCE_TYPE_CONFIG.search;
  
  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full p-3 bg-muted/30 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={cn('gap-1 text-xs', config.color)}>
              {config.icon}
              {config.label}
            </Badge>
          </div>
          <h4 className="font-medium text-sm truncate">{cleanAIText(item.title)}</h4>
          {item.source_url && (
            <p className="text-xs text-muted-foreground truncate mt-1">{item.source_url}</p>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 bg-muted/20 rounded-b-lg border-t space-y-2">
        {item.content && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {cleanAIText(item.content)}
          </p>
        )}
        {item.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-foreground mb-1">Notas:</p>
            <p className="text-sm text-muted-foreground">{cleanAIText(item.notes)}</p>
          </div>
        )}
        {item.source_url && (
          <a 
            href={item.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver fonte
          </a>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ResearchDataSection({ seasonalData, marketData }: ResearchDataSectionProps) {
  if (!seasonalData.length && !marketData.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Seasonal Research */}
      {seasonalData.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              Pesquisa Sazonal
            </CardTitle>
            <CardDescription>
              Datas e oportunidades sazonais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {seasonalData.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm">{cleanAIText(item.title)}</h4>
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{cleanAIText(item.notes)}</p>
                )}
              </div>
            ))}
            {seasonalData.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{seasonalData.length - 5} mais itens
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Research */}
      {marketData.length > 0 && (
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5 text-cyan-500" />
              Pesquisa de Mercado
            </CardTitle>
            <CardDescription>
              Tendências e insights do segmento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {marketData.slice(0, 5).map((item) => (
              <ResearchItemCard key={item.id} item={item} />
            ))}
            {marketData.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{marketData.length - 5} mais itens
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
