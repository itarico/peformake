import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, DollarSign, Tag, MessageSquare, Bot, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  leadId: string;
  clientId: string;
}

const ACTIVITY_ICONS: Record<string, any> = {
  status_change: ArrowRight,
  sale_registered: DollarSign,
  tag_added: Tag,
  tag_removed: Tag,
  bot_message: Bot,
  message_sent: MessageSquare,
  scheduled: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: 'bg-blue-500',
  sale_registered: 'bg-emerald-500',
  tag_added: 'bg-violet-500',
  tag_removed: 'bg-gray-400',
  bot_message: 'bg-purple-500',
  message_sent: 'bg-primary',
  scheduled: 'bg-amber-500',
};

export default function CrmLeadTimeline({ leadId, clientId }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('crm_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);
      setActivities(data || []);
      setLoading(false);
    };
    load();
  }, [leadId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        {activities.map((act) => {
          const Icon = ACTIVITY_ICONS[act.activity_type] || MessageSquare;
          const color = ACTIVITY_COLORS[act.activity_type] || 'bg-muted';

          return (
            <div key={act.id} className="relative flex items-start gap-3 py-2.5">
              {/* Dot */}
              <div className={`absolute -left-6 top-3 h-[22px] w-[22px] rounded-full ${color} flex items-center justify-center ring-2 ring-background`}>
                <Icon className="h-3 w-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">{act.description}</p>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                </span>
                {act.metadata && Object.keys(act.metadata).length > 0 && act.activity_type === 'status_change' && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1">{act.metadata.from || '?'}</Badge>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-[9px] px-1">{act.metadata.to || '?'}</Badge>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
