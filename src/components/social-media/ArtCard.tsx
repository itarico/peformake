import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageCarousel } from '@/components/ImageCarousel';
import { Check, Edit, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS, ArtStatus, ArtType } from '@/types/database';

interface ArtCardProps {
  art: {
    id: string;
    art_number: number;
    title: string | null;
    description: string | null;
    headline?: string | null;
    subtitle?: string | null;
    cta?: string | null;
    caption: string | null;
    status: ArtStatus;
    art_type: ArtType | null;
    is_extra: boolean;
    final_art_urls?: string[];
    final_art_url?: string | null;
    reference_image_url?: string | null;
  };
  onApprove?: (artId: string, data: {
    headline?: string;
    subtitle?: string;
    cta?: string;
    caption?: string;
    description?: string;
  }) => Promise<void>;
  isApproving?: boolean;
  showEditFields?: boolean;
}

export function ArtCard({ art, onApprove, isApproving, showEditFields = true }: ArtCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    headline: art.headline || '',
    subtitle: art.subtitle || '',
    cta: art.cta || '',
    caption: art.caption || '',
    description: art.description || '',
  });

  const hasImages = (art.final_art_urls?.length ?? 0) > 0 || art.final_art_url;

  const handleCopyContent = () => {
    const content = `
📌 Headline: ${editData.headline || 'N/A'}
📝 Subtítulo: ${editData.subtitle || 'N/A'}
🎯 CTA: ${editData.cta || 'N/A'}
📋 Legenda: ${editData.caption || 'N/A'}
📄 Descrição: ${editData.description || 'N/A'}
    `.trim();
    
    navigator.clipboard.writeText(content);
    toast.success('Conteúdo copiado!');
  };

  const handleApprove = async () => {
    if (onApprove) {
      await onApprove(art.id, editData);
      setIsEditDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {/* Image Section */}
        {hasImages && (
          <div className="relative aspect-square bg-muted">
            {(art.final_art_urls?.length ?? 0) > 1 ? (
              <ImageCarousel
                images={art.final_art_urls || []}
                aspectRatio="square"
              />
            ) : (
              <img
                src={art.final_art_urls?.[0] || art.final_art_url || ''}
                alt={art.title || 'Arte'}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={art.is_extra ? 'destructive' : 'secondary'} className="text-xs">
                  {art.art_number}
                </Badge>
                {art.art_type && (
                  <Badge variant="outline" className="text-xs">
                    {ART_TYPE_LABELS[art.art_type]}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base truncate">{art.title || 'Sem título'}</CardTitle>
            </div>
            <Badge className={ART_STATUS_COLORS[art.status]}>
              {ART_STATUS_LABELS[art.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 p-3 pt-0">
          {/* Content Fields Preview - More compact */}
          {showEditFields && (
            <div className="space-y-1.5 text-xs">
              {art.headline && (
                <div className="flex items-start gap-1">
                  <span className="text-primary font-bold shrink-0">📌</span>
                  <p className="font-bold line-clamp-1">{art.headline}</p>
                </div>
              )}
              {art.cta && (
                <div className="flex items-start gap-1">
                  <span className="text-primary font-bold shrink-0">🎯</span>
                  <p className="font-medium text-primary truncate">{art.cta}</p>
                </div>
              )}
              {art.caption && (
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground shrink-0 italic">📝</span>
                  <p className="text-muted-foreground line-clamp-1 italic">{art.caption}</p>
                </div>
              )}
              {art.description && !art.headline && !art.caption && (
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground shrink-0">📄</span>
                  <p className="text-muted-foreground line-clamp-1">{art.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions - Compact */}
          <div className="flex gap-1.5 pt-1">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1 h-7 text-[10px] font-bold"
              onClick={() => setIsEditDialogOpen(true)}
            >
              {onApprove ? 'APROVAR' : 'DETALHES'}
            </Button>
            {(art.headline || art.caption || art.description) && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyContent}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Approve Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arte {art.art_number}: {art.title || 'Sem título'}</DialogTitle>
            <DialogDescription>
              {art.art_type && ART_TYPE_LABELS[art.art_type]} • {ART_STATUS_LABELS[art.status]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Preview */}
            {hasImages && (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                {(art.final_art_urls?.length ?? 0) > 1 ? (
                  <ImageCarousel
                    images={art.final_art_urls || []}
                    aspectRatio="video"
                    showCounter
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <img
                      src={art.final_art_urls?.[0] || art.final_art_url || ''}
                      alt={art.title || 'Arte'}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={editData.headline}
                    onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                    placeholder="Texto principal da arte"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtítulo</Label>
                  <Input
                    id="subtitle"
                    value={editData.subtitle}
                    onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                    placeholder="Texto secundário"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">CTA (Call to Action)</Label>
                <Input
                  id="cta"
                  value={editData.cta}
                  onChange={(e) => setEditData({ ...editData, cta: e.target.value })}
                  placeholder="Ex: Saiba mais, Compre agora, Agende já"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Legenda do Post</Label>
                <Textarea
                  id="caption"
                  value={editData.caption}
                  onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                  placeholder="Legenda que será publicada junto com a arte"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Interna</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Descrição para o designer (não será publicada)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCopyContent}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            {onApprove && (
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Salvar e Aprovar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
