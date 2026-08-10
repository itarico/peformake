import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, Copy, Palette, Video, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DayContent {
  day: number;
  date?: string;
  socialMedia?: string;
  designIdea?: {
    titulo: string;
    descricao: string;
  };
  diyIdea?: string;
}

interface DailyContentSectionProps {
  title: string;
  description: string;
  content: string;
  type: 'social_media' | 'design' | 'diy';
  onAddIdea?: (idea: any) => void;
}

// Parse content to extract daily items
const parseContentByDay = (content: string, type: string): DayContent[] => {
  const days: DayContent[] = [];
  const lines = content.split('\n');
  
  // Pattern for day detection
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
  
  let currentDay: DayContent | null = null;
  let currentContent = '';
  
  lines.forEach(line => {
    let matched = false;
    
    for (const pattern of dayPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Save previous day if exists
        if (currentDay) {
          if (type === 'social_media') currentDay.socialMedia = currentContent.trim();
          else if (type === 'diy') currentDay.diyIdea = currentContent.trim();
          else if (type === 'design') {
            currentDay.designIdea = {
              titulo: currentDay.designIdea?.titulo || '',
              descricao: currentContent.trim()
            };
          }
          days.push(currentDay);
        }
        
        currentDay = { 
          day: parseInt(match[1]) || days.length + 1,
        };
        
        // Initial content from the same line
        const initialContent = match[2]?.replace(/\*\*/g, '').trim() || '';
        if (type === 'design') {
          currentDay.designIdea = { titulo: initialContent, descricao: '' };
        }
        currentContent = initialContent ? initialContent + '\n' : '';
        matched = true;
        break;
      }
    }
    
    if (!matched && line.trim()) {
      currentContent += line.trim() + '\n';
    }
  });
  
  // Push last day
  if (currentDay) {
    if (type === 'social_media') currentDay.socialMedia = currentContent.trim();
    else if (type === 'diy') currentDay.diyIdea = currentContent.trim();
    else if (type === 'design') {
      currentDay.designIdea = {
        titulo: currentDay.designIdea?.titulo || '',
        descricao: currentContent.trim()
      };
    }
    days.push(currentDay);
  }
  
  return days;
};

export function DailyContentSection({ 
  title, 
  description, 
  content, 
  type,
  onAddIdea 
}: DailyContentSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const days = parseContentByDay(content, type);
  
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
    // Fallback: show raw content in a card
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
                  <CardContent className="p-4 space-y-2">
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
                          <h4 className="font-medium text-sm">{day.designIdea.titulo}</h4>
                        )}
                        {day.designIdea.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-4">
                            {day.designIdea.descricao}
                          </p>
                        )}
                        {onAddIdea && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="w-full mt-2 text-xs"
                            onClick={() => onAddIdea({ 
                              titulo: day.designIdea?.titulo, 
                              descricao: day.designIdea?.descricao,
                              number: day.day
                            })}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
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
