import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkMonth, Art, Client, ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS, MONTH_NAMES, ArtType, ArtStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Pencil, Check, RotateCcw, Image as ImageIcon, Trash2, AlertCircle, Eye, Download, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate } from 'react-router-dom';
import { ImageUpload } from '@/components/ImageUpload';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { ImageLightbox } from '@/components/ImageLightbox';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlanningPreviewDialog } from '@/components/social-media/PlanningPreviewDialog';
import { BulkDownloadButton } from '@/components/portal/BulkDownloadButton';
import { updateArtWithAccess } from '@/lib/updateArtWithAccess';

import { BriefingEditDialog } from '@/components/social-media/BriefingEditDialog';

export default function PlanningMonth() {
  const { monthId } = useParams<{ monthId: string }>();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const { isStaff: isStaffMember } = useStaffAuth();
  const hasAccess = isStaff || isStaffMember;
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isPlanningPreviewOpen, setIsPlanningPreviewOpen] = useState(false);
  const [editingArt, setEditingArt] = useState<Art | null>(null);
  const [revisionArt, setRevisionArt] = useState<Art | null>(null);
  const [deleteArt, setDeleteArt] = useState<Art | null>(null);
  const [revisionComment, setRevisionComment] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // Removed local formData as we now use BriefingEditDialog component

  const { data: workMonth, isLoading } = useQuery({
    queryKey: ['work-month', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_months')
        .select(`
          *,
          client:clients(*),
          arts(*)
        `)
        .eq('id', monthId)
        .single();

      if (error) throw error;
      return data as WorkMonth & { client: Client; arts: Art[] };
    },
    enabled: !!monthId && hasAccess,
  });

  const updateArtMutation = useMutation({
    mutationFn: async ({ artId, data }: { artId: string; data: Partial<Art> }) => {
      await updateArtWithAccess(artId, data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-month', monthId] });
      toast.success('Arte atualizada com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar arte: ' + error.message);
    },
  });

  const addExtraArtMutation = useMutation({
    mutationFn: async () => {
      const nextNumber = (workMonth?.arts?.length || 0) + 1;
      
      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: monthId,
          art_number: nextNumber,
          is_extra: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-month', monthId] });
      toast.success('Arte extra adicionada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar arte: ' + error.message);
    },
  });

  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => {
      const { error } = await supabase
        .from('arts')
        .delete()
        .eq('id', artId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-month', monthId] });
      toast.success('Arte excluída com sucesso!');
      setDeleteArt(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir arte: ' + error.message);
    },
  });

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const resetForm = () => {
    setEditingArt(null);
    setIsDialogOpen(false);
  };

  const resetRevisionForm = () => {
    setRevisionComment('');
    setRevisionArt(null);
    setIsRevisionDialogOpen(false);
  };

  const handleEdit = (art: Art) => {
    setEditingArt(art);
    setIsDialogOpen(true);
  };

  const handleRequestRevision = (art: Art) => {
    setRevisionArt(art);
    setRevisionComment('');
    setIsRevisionDialogOpen(true);
  };

  const handleSubmitRevision = () => {
    if (!revisionArt) return;
    if (!revisionComment.trim()) {
      toast.error('Descreva a alteração necessária');
      return;
    }

    updateArtMutation.mutate({
      artId: revisionArt.id,
      data: {
        status: 'revision_requested',
        revision_comment: revisionComment.trim(),
      },
    }, {
      onSuccess: () => {
        toast.success('Revisão solicitada!');
        resetRevisionForm();
      }
    });
  };

  // Removed local handleSubmit as we now use BriefingEditDialog's onSave prop


  const getStatusBadge = (status: ArtStatus) => (
    <Badge className={ART_STATUS_COLORS[status]}>
      {ART_STATUS_LABELS[status]}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workMonth) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Mês não encontrado</p>
        <Button variant="link" onClick={() => navigate('/operation?tab=social-media')}>
          Voltar ao planejamento
        </Button>
      </div>
    );
  }

  const sortedArts = [...(workMonth.arts || [])].sort((a, b) => a.art_number - b.art_number);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-2 sm:px-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/operation?tab=social-media')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">
            {workMonth.client.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {MONTH_NAMES[workMonth.month - 1]} {workMonth.year} • {workMonth.arts.length} arte(s)
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs sm:text-sm">
            {sortedArts.filter(a => a.status === 'approved').length} / {sortedArts.length} aprovadas
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BulkDownloadButton
            arts={sortedArts.filter(a => ['awaiting_approval', 'approved'].includes(a.status))}
            clientName={workMonth.client.name}
            monthLabel={`${MONTH_NAMES[workMonth.month - 1]} ${workMonth.year}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlanningPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Planejamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addExtraArtMutation.mutate()}
            disabled={addExtraArtMutation.isPending}
          >
            {addExtraArtMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Arte Extra
          </Button>
        </div>
      </div>

      {/* Instagram-style Cards Grid - Responsive */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sortedArts.map((art) => {
          const isCompleted = ['awaiting_approval', 'approved'].includes(art.status);
          const hasRevision = art.status === 'revision_requested';
          // Get final arts - use array if available, otherwise single url
          const finalArtUrls = art.final_art_urls?.length > 0 
            ? art.final_art_urls 
            : (art.final_art_url ? [art.final_art_url] : []);
          // Show final art for completed OR revision requested (if images exist)
          const showFinalArt = (isCompleted || hasRevision) && finalArtUrls.length > 0;
          const referenceUrls = (art.reference_image_urls && art.reference_image_urls.length > 0)
            ? art.reference_image_urls 
            : (art.reference_image_url ? [art.reference_image_url] : []);
          const showReferenceOnly = !isCompleted && !hasRevision && referenceUrls.length > 0 && finalArtUrls.length === 0;
          
          return (
            <Card 
              key={art.id} 
              className={`overflow-hidden transition-all hover:shadow-lg relative ${
                hasRevision ? 'ring-2 ring-destructive' : ''
              } ${art.is_extra ? 'ring-1 ring-warning' : ''}`}
            >
              {art.is_extra && (
                <Badge className="absolute -top-2 -right-2 z-20 bg-warning text-warning-foreground">
                  Extra
                </Badge>
              )}
              
              {/* Square Image Area */}
              <div className="relative aspect-square bg-muted">
                {showFinalArt ? (
                  <ImageCarousel
                    images={finalArtUrls}
                    onImageClick={(url) => setLightboxImage(url)}
                    aspectRatio="square"
                  />
                ) : showReferenceOnly ? (
                  <div className="relative w-full h-full">
                    <ImageCarousel
                      images={referenceUrls}
                      onImageClick={(url) => setLightboxImage(url)}
                      aspectRatio="square"
                    />
                    <div className="absolute bottom-2 left-2 z-10">
                      <Badge variant="secondary" className="text-xs bg-black/50 text-white border-none">Referência</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Status Badge Overlay */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge className={`${ART_STATUS_COLORS[art.status]} text-xs`}>
                    {ART_STATUS_LABELS[art.status]}
                  </Badge>
                </div>

                {/* Art Number Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="text-xs">
                    #{art.art_number}
                  </Badge>
                </div>
              </div>

              {/* Info Section */}
              <CardContent className="p-3 space-y-2">
                {/* Revision Alert - FIRST when revision requested */}
                {hasRevision && art.revision_comment && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 -mx-1">
                    <p className="text-xs text-destructive font-bold uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Alteração Solicitada pelo Cliente
                    </p>
                    <p className="text-sm text-destructive mt-1">{art.revision_comment}</p>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {art.title || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {art.art_type ? ART_TYPE_LABELS[art.art_type] : 'Tipo não definido'}
                      {art.art_type === 'carrossel' && art.carousel_slides && (
                        <Badge variant="secondary" className="ml-2 text-[10px] h-4">
                          {art.carousel_slides.length} slides
                        </Badge>
                      )}
                    </p>
                    {art.art_type === 'carrossel' && art.carousel_slides && art.carousel_slides.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(art.carousel_slides as any[]).slice(0, 3).map((slide, idx) => (
                          <p key={idx} className="text-[10px] text-muted-foreground truncate">
                            Slide {idx + 1}: {slide.headline || 'Sem título'}
                          </p>
                        ))}
                        {(art.carousel_slides as any[]).length > 3 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            + {(art.carousel_slides as any[]).length - 3} slides...
                          </p>
                        )}
                      </div>
                    )}
                    {art.headline && art.art_type !== 'carrossel' && (
                      <p className="text-[10px] text-primary font-medium mt-1 truncate">📌 {art.headline}</p>
                    )}
                    {art.cta && (
                      <p className="text-xs text-primary/70 truncate">🎯 {art.cta}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleEdit(art)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    {art.status === 'pending_briefing' ? 'Briefing' : 'Editar'}
                  </Button>
                  {art.status === 'awaiting_approval' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRequestRevision(art)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          updateArtMutation.mutate({
                            artId: art.id,
                            data: { status: 'approved', revision_comment: null },
                          });
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {/* Delete button - always visible */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteArt(art)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <BriefingEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        art={editingArt}
        onSave={async (artId, data) => {
          await updateArtMutation.mutateAsync({ artId, data: data as Partial<Art> });
        }}
        isSaving={updateArtMutation.isPending}
      />

      {/* Revision Request Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={(open) => {
        if (!open) resetRevisionForm();
        setIsRevisionDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração</DialogTitle>
            <DialogDescription>
              Arte {revisionArt?.art_number} - Descreva o que precisa ser alterado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {revisionArt?.final_art_url && (
              <div 
                className="relative aspect-video rounded-md overflow-hidden bg-muted cursor-pointer"
                onClick={() => setLightboxImage(revisionArt.final_art_url)}
              >
                <img
                  src={revisionArt.final_art_url}
                  alt={revisionArt.title || 'Arte'}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="revision-comment">O que precisa ser alterado? *</Label>
              <Textarea
                id="revision-comment"
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Descreva detalhadamente a alteração necessária..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetRevisionForm}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitRevision} 
              disabled={updateArtMutation.isPending}
              variant="destructive"
            >
              {updateArtMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Solicitar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArt} onOpenChange={(open) => !open && setDeleteArt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Arte</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a Arte {deleteArt?.art_number}
              {deleteArt?.title ? ` - "${deleteArt.title}"` : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteArt && deleteArtMutation.mutate(deleteArt.id)}
              disabled={deleteArtMutation.isPending}
            >
              {deleteArtMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Planning Preview Dialog */}
      {workMonth && (
        <PlanningPreviewDialog
          open={isPlanningPreviewOpen}
          onOpenChange={setIsPlanningPreviewOpen}
          clientId={workMonth.client.id}
          clientName={workMonth.client.name}
          year={workMonth.year}
          month={workMonth.month}
        />
      )}
    </div>
  );
}
