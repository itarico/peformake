import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, Palette, Video, Camera, Users, FileText, List } from 'lucide-react';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, isSameMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Art {
  id: string;
  art_number: number;
  title: string | null;
  status: string;
  art_type?: string | null;
}

interface WeeklyScheduleProps {
  year: number;
  month: number;
  monthlyFocus?: string;
  arts: Art[];
  socialMediaPlanning?: string;
  designPlanning?: string;
  videoIdeas?: string;
}

interface ContentItem {
  id: string;
  type: 'feed' | 'story' | 'diy';
  title: string;
  description?: string;
  dayNumber?: number;
}

interface DayContent {
  date: Date;
  items: ContentItem[];
}

// Parse planning content to extract items with day numbers
const parseContentItems = (
  socialPlanning?: string,
  designPlanning?: string,
  videoIdeas?: string
): ContentItem[] => {
  const items: ContentItem[] = [];
  let itemId = 0;

  // Parse design planning for feed content
  if (designPlanning) {
    const lines = designPlanning.split('\n');
    let currentDay = 0;
    let currentTitle = '';
    
    lines.forEach(line => {
      const dayMatch = line.match(/^(?:\*\*)?(?:DIA|ARTE|POST)\s*(\d+)(?:\*\*)?:?\s*(.*)/i);
      if (dayMatch) {
        if (currentTitle && currentDay > 0) {
          items.push({
            id: `feed-${itemId++}`,
            type: 'feed',
            title: currentTitle.trim(),
            dayNumber: currentDay,
          });
        }
        currentDay = parseInt(dayMatch[1]);
        currentTitle = dayMatch[2]?.replace(/\*\*/g, '').trim() || '';
      } else if (line.trim() && currentDay > 0) {
        // Skip Reels/Stories mentions in design
        if (!line.match(/reel|story|stories/i)) {
          const titleMatch = line.match(/^(?:\*\*)?(?:Título|Headline):?\s*(?:\*\*)?\s*(.+)/i);
          if (titleMatch) {
            currentTitle = titleMatch[1].replace(/\*\*/g, '').trim();
          }
        }
      }
    });
    if (currentTitle && currentDay > 0) {
      items.push({
        id: `feed-${itemId++}`,
        type: 'feed',
        title: currentTitle.trim(),
        dayNumber: currentDay,
      });
    }
  }

  // Parse social media planning for stories content
  if (socialPlanning) {
    const lines = socialPlanning.split('\n');
    let currentDay = 0;
    
    lines.forEach(line => {
      const dayMatch = line.match(/^(?:\*\*)?(?:DIA|SEMANA)\s*(\d+)(?:\*\*)?:?\s*/i);
      if (dayMatch) {
        currentDay = parseInt(dayMatch[1]);
      }
      
      const storyMatch = line.match(/stor(?:y|ies)/i);
      if (storyMatch && line.trim().length > 10) {
        const cleanLine = line.replace(/^(?:\*\*)?(?:DIA|SEMANA)\s*\d+(?:\*\*)?:?\s*/i, '').trim();
        if (cleanLine) {
          items.push({
            id: `story-${itemId++}`,
            type: 'story',
            title: cleanLine,
            dayNumber: currentDay || undefined,
          });
        }
      }
    });
  }

  // Parse video ideas for DIY
  if (videoIdeas) {
    const lines = videoIdeas.split('\n');
    let currentIdea = '';
    let currentNumber = 0;
    
    lines.forEach(line => {
      const ideaMatch = line.match(/^(?:\*\*)?(?:VÍDEO|IDEIA|DIY)\s*(\d+)(?:\*\*)?:?\s*(.*)/i);
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      
      if (ideaMatch) {
        if (currentIdea) {
          items.push({
            id: `diy-${itemId++}`,
            type: 'diy',
            title: currentIdea.trim(),
            dayNumber: currentNumber || undefined,
          });
        }
        currentNumber = parseInt(ideaMatch[1]);
        currentIdea = ideaMatch[2]?.replace(/\*\*/g, '').trim() || '';
      } else if (numberedMatch) {
        if (currentIdea) {
          items.push({
            id: `diy-${itemId++}`,
            type: 'diy',
            title: currentIdea.trim(),
            dayNumber: currentNumber || undefined,
          });
        }
        currentNumber = parseInt(numberedMatch[1]);
        currentIdea = numberedMatch[2]?.replace(/\*\*/g, '').trim() || '';
      }
    });
    if (currentIdea) {
      items.push({
        id: `diy-${itemId++}`,
        type: 'diy',
        title: currentIdea.trim(),
        dayNumber: currentNumber || undefined,
      });
    }
  }

  return items;
};

export function WeeklySchedule({ 
  year, 
  month, 
  monthlyFocus, 
  arts, 
  socialMediaPlanning,
  designPlanning,
  videoIdeas 
}: WeeklyScheduleProps) {
  const [openWeeks, setOpenWeeks] = useState<number[]>([1]);
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  // Get weeks of the month
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

  // Parse all content items
  const allItems = parseContentItems(socialMediaPlanning, designPlanning, videoIdeas);
  
  // Group items by type
  const feedItems = allItems.filter(i => i.type === 'feed');
  const storyItems = allItems.filter(i => i.type === 'story');
  const diyItems = allItems.filter(i => i.type === 'diy');

  // Distribute items across weeks
  const getWeekItems = (weekIndex: number) => {
    const itemsPerWeek = {
      feed: Math.ceil(feedItems.length / weeks.length),
      story: Math.ceil(storyItems.length / weeks.length),
      diy: Math.ceil(diyItems.length / weeks.length),
    };

    // Also include arts for this week
    const artsPerWeek = Math.ceil(arts.length / weeks.length);
    const weekArts = arts.slice(weekIndex * artsPerWeek, (weekIndex + 1) * artsPerWeek);

    return {
      feed: feedItems.slice(weekIndex * itemsPerWeek.feed, (weekIndex + 1) * itemsPerWeek.feed),
      story: storyItems.slice(weekIndex * itemsPerWeek.story, (weekIndex + 1) * itemsPerWeek.story),
      diy: diyItems.slice(weekIndex * itemsPerWeek.diy, (weekIndex + 1) * itemsPerWeek.diy),
      arts: weekArts,
    };
  };

  const toggleWeek = (weekNumber: number) => {
    setOpenWeeks(prev => 
      prev.includes(weekNumber) 
        ? prev.filter(w => w !== weekNumber)
        : [...prev, weekNumber]
    );
  };

  // Get client requests based on content
  const getClientRequests = (weekItems: ReturnType<typeof getWeekItems>) => {
    const requests: string[] = [];
    if (weekItems.diy.length > 0) {
      requests.push('Gravar vídeos DIY conforme roteiro');
    }
    if (weekItems.story.length > 0) {
      requests.push('Enviar fotos/vídeos do dia a dia para stories');
    }
    if (weekItems.feed.length > 0 || weekItems.arts.length > 0) {
      requests.push('Revisar e aprovar artes do feed');
    }
    return requests;
  };

  return (
    <div className="space-y-4">
      {/* Monthly Focus */}
      {monthlyFocus && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Foco do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{monthlyFocus}</p>
          </CardContent>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Badge 
          variant={viewMode === 'week' ? 'default' : 'outline'} 
          className="cursor-pointer"
          onClick={() => setViewMode('week')}
        >
          <Calendar className="h-3 w-3 mr-1" />
          Por Semana
        </Badge>
        <Badge 
          variant={viewMode === 'list' ? 'default' : 'outline'} 
          className="cursor-pointer"
          onClick={() => setViewMode('list')}
        >
          <List className="h-3 w-3 mr-1" />
          Por Categoria
        </Badge>
      </div>

      {viewMode === 'list' ? (
        /* List View - Separated by Category */
        <div className="space-y-4">
          {/* Feed Posts */}
          {feedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-5 w-5 text-purple-500" />
                  Feed / Postagens ({feedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {feedItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                    <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                    <p className="text-sm">{item.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stories */}
          {storyItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-5 w-5 text-pink-500" />
                  Stories ({storyItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {storyItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-pink-500/10 rounded-lg">
                    <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                    <p className="text-sm">{item.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* DIY Videos */}
          {diyItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="h-5 w-5 text-green-500" />
                  Vídeos DIY / Gravações ({diyItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {diyItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                    <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                    <p className="text-sm">{item.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Weekly Schedule View */
        <div className="space-y-3">
          {weeks.map((weekStart, index) => {
            const weekEnd = addDays(weekStart, 6);
            const weekItems = getWeekItems(index);
            const clientRequests = index === 0 ? getClientRequests(weekItems) : [];
            const totalItems = weekItems.feed.length + weekItems.story.length + weekItems.diy.length + weekItems.arts.length;

            return (
              <Collapsible 
                key={index} 
                open={openWeeks.includes(index + 1)}
                onOpenChange={() => toggleWeek(index + 1)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-bold">
                            Semana {index + 1}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(isSameMonth(weekStart, monthStart) ? weekStart : monthStart, "dd", { locale: ptBR })} - {format(isSameMonth(weekEnd, monthStart) ? weekEnd : monthEnd, "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(weekItems.feed.length + weekItems.arts.length) > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Palette className="h-3 w-3" />
                              {weekItems.feed.length + weekItems.arts.length}
                            </Badge>
                          )}
                          {weekItems.story.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Camera className="h-3 w-3" />
                              {weekItems.story.length}
                            </Badge>
                          )}
                          {weekItems.diy.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Video className="h-3 w-3" />
                              {weekItems.diy.length}
                            </Badge>
                          )}
                          <ChevronDown className={`h-5 w-5 transition-transform ${openWeeks.includes(index + 1) ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Feed Posts (design + arts) */}
                      {(weekItems.feed.length > 0 || weekItems.arts.length > 0) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Palette className="h-4 w-4 text-purple-500" />
                            Feed / Posts
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {weekItems.arts.map((art) => (
                              <div key={art.id} className="bg-purple-500/10 rounded-lg p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">#{art.art_number}</Badge>
                                  <span>{art.title || 'Sem título'}</span>
                                </div>
                              </div>
                            ))}
                            {weekItems.feed.map((item) => (
                              <div key={item.id} className="bg-purple-500/10 rounded-lg p-3 text-sm">
                                {item.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stories */}
                      {weekItems.story.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Camera className="h-4 w-4 text-pink-500" />
                            Stories
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {weekItems.story.map((item) => (
                              <div key={item.id} className="bg-pink-500/10 rounded-lg p-3 text-sm">
                                {item.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DIY Videos */}
                      {weekItems.diy.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Video className="h-4 w-4 text-green-500" />
                            Vídeos DIY / Gravações
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {weekItems.diy.map((item) => (
                              <div key={item.id} className="bg-green-500/10 rounded-lg p-3 text-sm">
                                {item.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Client Requests */}
                      {clientRequests.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-orange-500" />
                            Solicitar ao Cliente
                          </h4>
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                            <ul className="space-y-1">
                              {clientRequests.map((item, i) => (
                                <li key={i} className="text-sm flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {totalItems === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum conteúdo programado para esta semana</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Arts Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo de Artes do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{arts.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <p className="text-2xl font-bold text-yellow-600">
                {arts.filter(a => a.status === 'pending_briefing').length}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">
                {arts.filter(a => ['ready_for_production', 'in_production'].includes(a.status)).length}
              </p>
              <p className="text-xs text-muted-foreground">Em Produção</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-600">
                {arts.filter(a => a.status === 'approved').length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
