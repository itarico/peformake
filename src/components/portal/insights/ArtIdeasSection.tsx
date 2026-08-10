import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Palette, Check, Copy, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cleanAIText } from './ContentFormatter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ArtIdea {
  number: string;
  titulo: string;
  headline?: string;
  subtitulo?: string;
  cta?: string;
  descricao: string;
  tipo?: string;
}

interface ArtIdeasSectionProps {
  ideas: ArtIdea[];
  rawContent?: string;
  clientId: string;
  workMonthId?: string;
  pendingSlots: number;
}

export function ArtIdeasSection({ ideas, rawContent, clientId, workMonthId, pendingSlots }: ArtIdeasSectionProps) {
  const queryClient = useQueryClient();
  const [selectedIdea, setSelectedIdea] = useState<ArtIdea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!workMonthId || !selectedIdea) throw new Error('Dados não encontrados');

      const { data: arts } = await supabase
        .from('arts')
        .select('id, art_number, status, title')
        .eq('work_month_id', workMonthId)
        .order('art_number');

      const artsArray = arts || [];
      const pendingBriefingArts = artsArray
        .filter((art: any) => art.status === 'pending_briefing' && !art.title)
        .sort((a: any, b: any) => a.art_number - b.art_number);

      const artTitle = selectedIdea.titulo || 'Arte';
      const artDescription = selectedIdea.descricao || '';
      const artHeadline = selectedIdea.headline || '';
      const artSubtitle = selectedIdea.subtitulo || '';
      const artCta = selectedIdea.cta || '';
      const validArtTypes = ['post_instagram', 'story', 'carrossel'] as const;
      const artType = validArtTypes.includes(selectedIdea.tipo as any) 
        ? (selectedIdea.tipo as typeof validArtTypes[number]) 
        : 'post_instagram';

      if (pendingBriefingArts.length > 0) {
        // Fill pending slot
        const artToUpdate = pendingBriefingArts[0];
        const { error } = await supabase
          .from('arts')
          .update({
            title: artTitle,
            headline: artHeadline || null,
            subtitle: artSubtitle || null,
            cta: artCta || null,
            description: artDescription,
            art_type: artType,
            status: 'ready_for_production',
          })
          .eq('id', artToUpdate.id);

        if (error) throw error;

        await supabase.from('notifications').insert({
          client_id: clientId,
          title: 'Briefing preenchido pelo cliente',
          message: `Cliente aprovou a ideia "${artTitle}" para a arte ${artToUpdate.art_number}`,
          type: 'art_approval',
        });

        return { isExtra: false, artNumber: artToUpdate.art_number };
      } else {
        // Create extra art
        const nextArtNumber = artsArray.length + 1;
        const { error } = await supabase.from('arts').insert([{
          work_month_id: workMonthId,
          art_number: nextArtNumber,
          is_extra: true,
          title: artTitle,
          headline: artHeadline || null,
          subtitle: artSubtitle || null,
          cta: artCta || null,
          description: artDescription,
          art_type: artType,
          status: 'ready_for_production',
        }]);

        if (error) throw error;

        await supabase.from('notifications').insert({
          client_id: clientId,
          title: 'Arte EXTRA aprovada pelo cliente',
          message: `Cliente aprovou arte extra: "${artTitle}"`,
          type: 'art_approval',
        });

        return { isExtra: true, artNumber: nextArtNumber };
      }
    },
    onSuccess: (result) => {
      if (result?.isExtra) {
        toast.success('Arte EXTRA criada! Será cobrada separadamente.');
      } else {
        toast.success(`Arte ${result?.artNumber} preenchida com sucesso!`);
      }
      setIsDialogOpen(false);
      setSelectedIdea(null);
      queryClient.invalidateQueries({ queryKey: ['portal-work-month'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar: ' + error.message);
    },
  });

  const handleCopy = async (idea: ArtIdea) => {
    await navigator.clipboard.writeText(`${idea.titulo}\n${idea.descricao}`);
    toast.success('Copiado!');
  };

  // If no parsed ideas, show raw content
  if (!ideas.length && rawContent) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-500" />
            Planejamento de Artes
          </CardTitle>
          <CardDescription>
            Ideias de artes para este mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            {cleanAIText(rawContent).split('\n').map((line, i) => (
              <p key={i} className="text-sm mb-1">{line}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ideas.length) return null;

  return (
    <>
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                Planejamento de Artes
              </CardTitle>
              <CardDescription>
                Ideias de artes para este mês. Aprove para adicionar ao seu plano.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {pendingSlots > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {pendingSlots} vaga{pendingSlots > 1 ? 's' : ''} disponível
                </Badge>
              )}
              {pendingSlots === 0 && (
                <Badge variant="outline" className="gap-1 text-warning border-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Artes serão extras (cobradas à parte)
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {ideas.map((idea, index) => (
              <Card key={index} className="bg-muted/30 hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2">Arte {idea.number}</Badge>
                      <h4 className="font-medium text-sm truncate">{cleanAIText(idea.titulo)}</h4>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopy(idea)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Headline / Subtitle / CTA - prominent */}
                  {(idea.headline || idea.subtitulo || idea.cta) && (
                    <div className="bg-primary/5 border border-primary/20 rounded p-2 space-y-1">
                      {idea.headline && (
                        <p className="text-xs"><span className="font-semibold text-primary">📌 Headline:</span> {cleanAIText(idea.headline)}</p>
                      )}
                      {idea.subtitulo && (
                        <p className="text-xs"><span className="font-semibold text-primary">📝 Subtítulo:</span> {cleanAIText(idea.subtitulo)}</p>
                      )}
                      {idea.cta && (
                        <p className="text-xs"><span className="font-semibold text-primary">🎯 CTA:</span> {cleanAIText(idea.cta)}</p>
                      )}
                    </div>
                  )}
                  {idea.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cleanAIText(idea.descricao)}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    variant={pendingSlots > 0 ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedIdea(idea);
                      setIsDialogOpen(true);
                    }}
                    disabled={!workMonthId}
                  >
                    <Check className="h-4 w-4" />
                    {pendingSlots > 0 ? 'Aprovar Arte' : 'Aprovar como Extra'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Ideia de Arte</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>Você está prestes a aprovar esta ideia para produção.</p>
              {pendingSlots === 0 && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    Esta arte será cobrada separadamente do seu plano mensal.
                  </p>
                </div>
              )}
              {pendingSlots > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
                  <Sparkles className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    Será usada uma das {pendingSlots} vaga{pendingSlots > 1 ? 's' : ''} disponível do seu plano.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIdea && (
            <div className="py-4 space-y-3 border-y">
              <h4 className="font-medium">{cleanAIText(selectedIdea.titulo)}</h4>
              {(selectedIdea.headline || selectedIdea.subtitulo || selectedIdea.cta) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                  {selectedIdea.headline && (
                    <div>
                      <p className="text-xs text-primary font-medium">📌 Headline</p>
                      <p className="text-sm font-semibold">{cleanAIText(selectedIdea.headline)}</p>
                    </div>
                  )}
                  {selectedIdea.subtitulo && (
                    <div>
                      <p className="text-xs text-primary font-medium">📝 Subtítulo</p>
                      <p className="text-sm">{cleanAIText(selectedIdea.subtitulo)}</p>
                    </div>
                  )}
                  {selectedIdea.cta && (
                    <div>
                      <p className="text-xs text-primary font-medium">🎯 CTA</p>
                      <p className="text-sm font-medium text-primary">{cleanAIText(selectedIdea.cta)}</p>
                    </div>
                  )}
                </div>
              )}
              {selectedIdea.descricao && (
                <p className="text-sm text-muted-foreground">{cleanAIText(selectedIdea.descricao)}</p>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
