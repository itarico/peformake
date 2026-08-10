import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Palette, MessageSquare, Video } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';

interface SocialMediaCalendarProps {
  clientId: string;
  year: number;
  month: number;
}

interface DayEntry {
  day: number;
  items: { type: string; title: string }[];
}

const parseContentDays = (content: string, category: string): DayEntry[] => {
  const entries: DayEntry[] = [];
  const lines = content.split('\n');
  const type = category === 'design' ? 'design' : category === 'video' ? 'diy' : 'social';

  const dayPatterns = [
    /^(?:\*\*)?DIA\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?ARTE\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?POST\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?VÍDEO\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(?:\*\*)?IDEIA\s*(\d+)(?:\*\*)?:?\s*(.*)/i,
    /^(\d+)\.\s+(.*)/i,
  ];

  lines.forEach(line => {
    for (const pattern of dayPatterns) {
      const match = line.match(pattern);
      if (match) {
        const day = parseInt(match[1]);
        const title = match[2]?.replace(/\*\*/g, '').trim().substring(0, 40) || `${type} ${day}`;
        if (day >= 1 && day <= 31) {
          const existing = entries.find(e => e.day === day);
          if (existing) {
            existing.items.push({ type, title });
          } else {
            entries.push({ day, items: [{ type, title }] });
          }
        }
        break;
      }
    }
  });

  return entries;
};

export function SocialMediaCalendar({ clientId, year, month }: SocialMediaCalendarProps) {
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['sm-calendar', clientId, year, month],
    queryFn: async () => {
      const { data: cm } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (!cm) return [];

      const { data: analyses } = await supabase
        .from('content_analyses')
        .select('content, category')
        .eq('consulting_month_id', cm.id);

      if (!analyses) return [];

      const allEntries: DayEntry[] = [];
      analyses.forEach(a => {
        const parsed = parseContentDays(a.content, a.category);
        parsed.forEach(p => {
          const existing = allEntries.find(e => e.day === p.day);
          if (existing) {
            existing.items.push(...p.items);
          } else {
            allEntries.push({ ...p });
          }
        });
      });

      return allEntries.sort((a, b) => a.day - b.day);
    },
    enabled: !!clientId,
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = today.getDate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'design': return <Palette className="h-2.5 w-2.5 text-purple-500" />;
      case 'social': return <MessageSquare className="h-2.5 w-2.5 text-orange-500" />;
      case 'diy': return <Video className="h-2.5 w-2.5 text-pink-500" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'design': return 'bg-purple-500/20';
      case 'social': return 'bg-orange-500/20';
      case 'diy': return 'bg-pink-500/20';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Calendário - {MONTH_NAMES[month - 1]} {year}
        </CardTitle>
        <div className="flex gap-3 mt-1">
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-purple-500" /><span className="text-[10px] text-muted-foreground">Arte</span></div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-orange-500" /><span className="text-[10px] text-muted-foreground">Post</span></div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-pink-500" /><span className="text-[10px] text-muted-foreground">Vídeo</span></div>
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-4 pb-3">
        <div className="grid grid-cols-7 gap-px">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[40px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayData = calendarData?.find(e => e.day === day);
            const isTodayCell = isCurrentMonth && day === todayDay;

            return (
              <div
                key={day}
                className={`min-h-[40px] rounded p-0.5 text-center border ${
                  isTodayCell ? 'border-primary bg-primary/5' : 'border-transparent'
                } ${dayData ? 'bg-muted/30' : ''}`}
              >
                <span className={`text-[10px] font-medium ${isTodayCell ? 'text-primary' : ''}`}>{day}</span>
                {dayData && (
                  <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                    {dayData.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className={`h-1.5 w-1.5 rounded-full ${getTypeColor(item.type)}`} 
                           title={item.title} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
