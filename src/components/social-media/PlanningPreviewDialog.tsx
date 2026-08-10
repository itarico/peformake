import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleSection } from './CollapsibleSection';
import { EnhancedDailyContentSection } from './EnhancedDailyContentSection';
import { MONTH_NAMES } from '@/types/database';
import { Palette, Calendar, Video, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanningPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  year: number;
  month: number;
}

export function PlanningPreviewDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  year,
  month,
}: PlanningPreviewDialogProps) {
  // Fetch consulting month for this period
  const { data: consultingMonth, isLoading: loadingConsulting } = useQuery({
    queryKey: ['planning-preview-consulting', clientId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select('id, monthly_focus, notes')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!clientId,
  });

  // Fetch content analyses for this month
  const { data: contentAnalyses, isLoading: loadingContent } = useQuery({
    queryKey: ['planning-preview-content', consultingMonth?.id],
    queryFn: async () => {
      if (!consultingMonth?.id) return [];

      const { data, error } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('consulting_month_id', consultingMonth.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!consultingMonth?.id,
  });

  const isLoading = loadingConsulting || loadingContent;

  // Organize content by type
  const designPlanning = contentAnalyses?.find((c) => c.category === 'design');
  const socialPlanning = contentAnalyses?.find((c) => c.category === 'social_media');
  const videoIdeas = contentAnalyses?.find((c) => c.category === 'video');

  const hasContent = designPlanning || socialPlanning || videoIdeas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Planejamento - {clientName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {MONTH_NAMES[month - 1]} {year}
            {consultingMonth?.monthly_focus && (
              <Badge variant="secondary" className="ml-2">
                Foco: {consultingMonth.monthly_focus.substring(0, 50)}...
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 min-h-0">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !hasContent ? (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum planejamento encontrado para este mês.</p>
              <p className="text-sm mt-2">
                Acesse a área de Consultoria para gerar o planejamento.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Monthly Focus */}
              {consultingMonth?.monthly_focus && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    Foco do Mês
                  </h3>
                  <p className="text-sm">{consultingMonth.monthly_focus}</p>
                  {consultingMonth.notes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {consultingMonth.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Design Planning */}
              {designPlanning && (
                <CollapsibleSection
                  title="Planejamento de Design Gráfico"
                  icon={<Palette className="h-4 w-4 text-primary" />}
                  defaultOpen={true}
                  badge={
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Artes
                    </Badge>
                  }
                >
                  <EnhancedDailyContentSection
                    title="Design Gráfico"
                    description="Ideias de artes para o mês"
                    content={designPlanning.content}
                    type="design"
                    filterArtOnly={true}
                  />
                </CollapsibleSection>
              )}

              {/* Social Media Planning */}
              {socialPlanning && (
                <CollapsibleSection
                  title="Planejamento de Social Media"
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                  defaultOpen={true}
                  badge={
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Calendário
                    </Badge>
                  }
                >
                  <EnhancedDailyContentSection
                    title="Social Media"
                    description="Calendário editorial do mês"
                    content={socialPlanning.content}
                    type="social_media"
                  />
                </CollapsibleSection>
              )}

              {/* DIY Content */}
              {videoIdeas && (
                <CollapsibleSection
                  title="Conteúdo DIY"
                  icon={<Video className="h-4 w-4 text-primary" />}
                  defaultOpen={true}
                  badge={
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Vídeos
                    </Badge>
                  }
                >
                  <EnhancedDailyContentSection
                    title="DIY / Vídeos"
                    description="Ideias de conteúdo para o cliente produzir"
                    content={videoIdeas.content}
                    type="diy"
                  />
                </CollapsibleSection>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
