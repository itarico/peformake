import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, Copy, Palette, Video, Lightbulb, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ParsedDesignIdea {
  titulo: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
  descricao: string;
}

interface DayContent {
  day: number;
  date?: string;
  socialMedia?: string;
  designIdea?: ParsedDesignIdea;
  diyIdea?: string;
}

interface EnhancedDailyContentSectionProps {
  title: string;
  description: string;
  content: string;
  type: 'social_media' | 'design' | 'diy';
  onAddIdea?: (idea: any) => void;
  filterArtOnly?: boolean;
}

// Enhanced parser that extracts structured fields for design ideas
const parseContentByDay = (content: string, type: string, filterArtOnly: boolean = false): DayContent[] => {
  const days: DayContent[] = [];
  const lines = content.split('\n');
  
  // Pattern for day/art detection
  const dayPatterns = [
    /^(?:\*\*)?DIA\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?(\d+)\/\d+(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?Semana\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?ARTE\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?POST\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?VÍDEO\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?IDEIA\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(\d+)\.\s+(.*)/i,
  ];

  // Patterns for structured fields
  const headlinePatterns = [
    /^(?:\*\*)?Headline:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Título Principal:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Texto Principal:?\s*(?:\*\*)?\s*(.+)/i,
  ];

  const subtitlePatterns = [
    /^(?:\*\*)?Subtítulo:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Sub[- ]?título:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Texto Secundário:?\s*(?:\*\*)?\s*(.+)/i,
  ];

  const ctaPatterns = [
    /^(?:\*\*)?CTA:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Call.?to.?Action:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Chamada:?\s*(?:\*\*)?\s*(.+)/i,
    /^(?:\*\*)?Botão:?\s*(?:\*\*)?\s*(.+)/i,
  ];
  
  // Filter patterns for Reels/Stories when filterArtOnly is true
  const excludePatterns = filterArtOnly ? [
    /reel/i,
    /story/i,
    /stories/i,
    /vídeo/i,
    /video/i,
    /reels/i,
  ] : [];

  let currentDay: DayContent | null = null;
  let currentContent = '';
  let currentHeadline = '';
  let currentSubtitle = '';
  let currentCta = '';
  let skipCurrentEntry = false;
  
  const finalizeDayContent = () => {
    if (currentDay && !skipCurrentEntry) {
      if (type === 'social_media') {
        currentDay.socialMedia = currentContent.trim();
      } else if (type === 'diy') {
        currentDay.diyIdea = currentContent.trim();
      } else if (type === 'design') {
        currentDay.designIdea = {
          titulo: currentDay.designIdea?.titulo || '',
          headline: currentHeadline.trim() || undefined,
          subtitle: currentSubtitle.trim() || undefined,
          cta: currentCta.trim() || undefined,
          descricao: currentContent.trim()
        };
      }
      days.push(currentDay);
    }
  };

  lines.forEach(line => {
    let matched = false;
    
    // Check for day/art header
    for (const pattern of dayPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Finalize previous day
        finalizeDayContent();
        
        const lineContent = match[2]?.replace(/\*\*/g, '').trim() || '';
        
        // Check if we should skip this entry (Reels/Stories filter)
        skipCurrentEntry = excludePatterns.some(p => p.test(line) || p.test(lineContent));
        
        currentDay = { 
          day: parseInt(match[1]) || days.length + 1,
        };
        
        if (type === 'design') {
          currentDay.designIdea = { titulo: lineContent, descricao: '' };
        }
        
        currentContent = lineContent ? lineContent + '\n' : '';
        currentHeadline = '';
        currentSubtitle = '';
        currentCta = '';
        matched = true;
        break;
      }
    }
    
    if (!matched && line.trim()) {
      // Check for structured fields in design type
      if (type === 'design' && currentDay) {
        // Check headline
        for (const pattern of headlinePatterns) {
          const match = line.match(pattern);
          if (match) {
            currentHeadline = match[1].replace(/\*\*/g, '').trim();
            matched = true;
            break;
          }
        }
        
        // Check subtitle
        if (!matched) {
          for (const pattern of subtitlePatterns) {
            const match = line.match(pattern);
            if (match) {
              currentSubtitle = match[1].replace(/\*\*/g, '').trim();
              matched = true;
              break;
            }
          }
        }
        
        // Check CTA
        if (!matched) {
          for (const pattern of ctaPatterns) {
            const match = line.match(pattern);
            if (match) {
              currentCta = match[1].replace(/\*\*/g, '').trim();
              matched = true;
              break;
            }
          }
        }
      }
      
      // Add to general content if not a structured field
      if (!matched) {
        currentContent += line.trim() + '\n';
      }
    }
  });
  
  // Push last day
  finalizeDayContent();
  
  return days;
};

export function EnhancedDailyContentSection({ 
  title, 
  description, 
  content, 
  type,
  onAddIdea,
  filterArtOnly = false,
}: EnhancedDailyContentSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const days = parseContentByDay(content, type, filterArtOnly);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };
  
  const getIcon = () => {
    switch (type) {
      case 'social_media': return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'design': return <Palette className="h-5 w-5 text-purple-500" />;
      case 'diy': return <Video className="h-5 w-5 text-pink-500" />;
      default: return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    }
  };
  
  const getTypeLabel = () => {
    switch (type) {
      case 'social_media': return 'Post';
      case 'design': return 'Arte';
      case 'diy': return 'Vídeo DIY';
      default: return 'Item';
    }
  };

  if (days.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon()}
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="text-sm">{description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(content); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {content}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getIcon()}
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{days.length} itens</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(content); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {days.map((day, index) => (
                <Card key={index} className="bg-muted/30 hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="gap-1">
                        {getIcon()}
                        {getTypeLabel()} {day.day}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const text = type === 'social_media' ? day.socialMedia 
                            : type === 'diy' ? day.diyIdea 
                            : day.designIdea?.descricao || day.designIdea?.titulo;
                          if (text) copyToClipboard(text);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {type === 'design' && day.designIdea && (
                      <div className="space-y-2">
                        {day.designIdea.titulo && (
                          <h4 className="font-semibold text-sm">{day.designIdea.titulo}</h4>
                        )}
                        
                        {/* Structured Fields */}
                        {day.designIdea.headline && (
                          <div className="bg-primary/10 rounded px-2 py-1">
                            <span className="text-xs font-medium text-primary uppercase">Headline</span>
                            <p className="text-sm font-medium">{day.designIdea.headline}</p>
                          </div>
                        )}
                        
                        {day.designIdea.subtitle && (
                          <div className="bg-secondary/30 rounded px-2 py-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Subtítulo</span>
                            <p className="text-sm">{day.designIdea.subtitle}</p>
                          </div>
                        )}
                        
                        {day.designIdea.cta && (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              CTA: {day.designIdea.cta}
                            </Badge>
                          </div>
                        )}
                        
                        {day.designIdea.descricao && !day.designIdea.headline && (
                          <p className="text-xs text-muted-foreground line-clamp-4">
                            {day.designIdea.descricao}
                          </p>
                        )}
                        
                        {onAddIdea && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="w-full mt-2 text-xs gap-1"
                            onClick={() => onAddIdea({ 
                              titulo: day.designIdea?.titulo,
                              headline: day.designIdea?.headline,
                              subtitle: day.designIdea?.subtitle,
                              cta: day.designIdea?.cta,
                              descricao: day.designIdea?.descricao,
                              number: day.day
                            })}
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar ao Planejamento
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {type === 'social_media' && day.socialMedia && (
                      <p className="text-xs text-muted-foreground line-clamp-4">
                        {day.socialMedia}
                      </p>
                    )}
                    
                    {type === 'diy' && day.diyIdea && (
                      <p className="text-xs text-muted-foreground line-clamp-4">
                        {day.diyIdea}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
