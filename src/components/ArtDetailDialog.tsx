import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Art, Client, WorkMonth, ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS, MONTH_NAMES } from '@/types/database';
import { FileText, Upload, Image as ImageIcon, Pencil, Send, X, Download, Link as LinkIcon, Volume2, Layout, RotateCcw, Instagram, PlaySquare, Megaphone, Paperclip, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ImageLightbox } from '@/components/ImageLightbox';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ArtWithDetails extends Art {
  work_month: WorkMonth & { client: Client };
}

interface ArtDetailDialogProps {
  art: ArtWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (urls: string[]) => void;
  onDownloadPDF: (art: ArtWithDetails) => void;
  showUpload?: boolean;
  currentUploadUrls?: string[];
}

const getSlideImageUrls = (slide: any): string[] => {
  const urls = Array.isArray(slide?.image_urls) ? slide.image_urls.filter(Boolean) : [];
  if (slide?.image_url && !urls.includes(slide.image_url)) {
    urls.push(slide.image_url);
  }
  return urls;
};

export function ArtDetailDialog({
  art,
  isOpen,
  onClose,
  onUpload,
  onDownloadPDF,
  showUpload = false,
  currentUploadUrls = [],
}: ArtDetailDialogProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localUrls, setLocalUrls] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Get existing art images - prioritize final_art_urls, then legacy final_art_url
  const getArtUrls = () => {
    if (!art) return [];
    if (currentUploadUrls.length > 0) return currentUploadUrls;
    if (art.final_art_urls?.length > 0) return art.final_art_urls;
    if (art.final_art_url) return [art.final_art_url];
    return [];
  };

  // Reset state when dialog opens/closes or art changes
  useEffect(() => {
    if (isOpen && art) {
      const urls = getArtUrls();
      setLocalUrls(urls);
      setHasChanges(false);
      // Auto-open edit mode if no images yet or revision requested
      setIsEditMode(!urls.length || art.status === 'revision_requested');
    } else {
      setIsEditMode(false);
      setHasChanges(false);
    }
  }, [isOpen, art?.id]);

  if (!art) return null;

  const client = art.work_month.client;
  const hasRevision = art.status === 'revision_requested';
  const hasImages = localUrls.length > 0;
  const carouselImageUrls = art.art_type === 'carrossel'
    ? (art.carousel_slides || []).flatMap(getSlideImageUrls)
    : [];
  const hasCarouselImages = carouselImageUrls.length > 0;

  const downloadUrls = async (urls: string[], prefix: string) => {
    if (urls.length === 0) {
      toast.error('Nenhuma imagem para baixar');
      return;
    }

    toast.info(`Baixando ${urls.length} imagem(ns)...`);

    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i]);
        if (!response.ok) throw new Error('Não foi possível acessar a imagem');

        const blob = await response.blob();
        const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${prefix}-${i + 1}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        if (i < urls.length - 1) await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.error('Error downloading image:', error);
        const a = document.createElement('a');
        a.href = urls[i];
        a.download = `${prefix}-${i + 1}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  // Handle local URL changes (doesn't save to DB yet)
  const handleLocalUrlChange = (urls: string[]) => {
    setLocalUrls(urls);
    setHasChanges(true);
  };

  // Submit changes to parent (saves to DB)
  const handleSubmit = () => {
    if (localUrls.length === 0) {
      return; // Don't submit without images
    }
    onUpload?.(localUrls);
    setIsEditMode(false);
    setHasChanges(false);
    onClose();
  };

  // Cancel edit mode and restore original URLs
  const handleCancelEdit = () => {
    const originalUrls = getArtUrls();
    setLocalUrls(originalUrls);
    setHasChanges(false);
    setIsEditMode(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          // If closing with unsaved changes, just close (don't save)
          onClose();
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] p-0 overflow-y-auto">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center gap-3">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <DialogTitle className="text-lg">{client.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {MONTH_NAMES[art.work_month.month - 1]} {art.work_month.year} • Arte {art.art_number}
                </p>
              </div>
              <Badge className={ART_STATUS_COLORS[art.status]}>
                {ART_STATUS_LABELS[art.status]}
              </Badge>
            </div>
          </DialogHeader>

          {/* Image area - constrained height to avoid overlapping info */}
          <div className="relative bg-muted mx-4 rounded-lg overflow-hidden" style={{ maxHeight: '40vh' }}>
            <div className="aspect-square max-h-[40vh] mx-auto">
            {isEditMode ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <MultiImageUpload
                  bucket="final-arts"
                  folder={`${art.work_month_id}/${art.id}`}
                  currentUrls={localUrls}
                  onUpload={handleLocalUrlChange}
                  className="w-full"
                  maxImages={10}
                />
              </div>
            ) : hasImages ? (
              <>
                <ImageCarousel
                  images={localUrls}
                  onImageClick={(url) => setLightboxImage(url)}
                  aspectRatio="square"
                />
                {/* Edit button overlay */}
                {showUpload && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 left-2 bg-background/80 hover:bg-background"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Alterar Imagem
                  </Button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            </div>
          </div>

          {/* Edit mode action buttons */}
          {isEditMode && hasChanges && localUrls.length > 0 && (
            <div className="mx-4 flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelEdit}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar para Aprovação
              </Button>
            </div>
          )}

          {/* Info section */}
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm transition-all hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                  {art.art_type === 'feed' && <Instagram className="h-4 w-4 text-primary" />}
                  {art.art_type === 'story' && <PlaySquare className="h-4 w-4 text-primary" />}
                  {art.art_type === 'carrossel' && <Layout className="h-4 w-4 text-primary" />}
                  {art.art_type === 'anuncio' && <Megaphone className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Formato da Entrega</p>
                  <p className="text-sm font-bold flex items-center gap-2">
                    {art.art_type ? ART_TYPE_LABELS[art.art_type] : 'Não definido'}
                    {art.art_type === 'anuncio' && <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-red-100 text-red-600 border-none font-black">AD</Badge>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {art.reference_link && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          asChild 
                          className="h-10 w-10 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-none"
                          aria-label="Abrir link de referência"
                          title="Abrir Referência"
                        >
                          <a href={art.reference_link} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="h-5 w-5" aria-hidden="true" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs font-bold">Abrir Referência</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {art.audio_observation_url && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-amber-600" />
                    <audio src={art.audio_observation_url} className="w-24 h-7" controls />
                  </div>
                )}
              </div>
            </div>

            {/* Main Headline / Title */}
            {art.headline || art.title ? (
              <div className="px-1 border-l-3 border-primary/40 pl-3">
                <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-black mb-1 opacity-80">Headline Principal</p>
                <h3 className="font-black text-xl leading-tight text-foreground tracking-tight">
                  {art.headline || art.title}
                </h3>
                {art.title && art.headline && art.title !== art.headline && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{art.title}</p>
                )}
              </div>
            ) : null}

            {/* Assets/Images to use - IMPORTANT for the designer */}
            {art.art_type !== 'carrossel' && art.asset_urls && art.asset_urls.length > 0 && (
              <div className="space-y-4 bg-primary/5 p-5 rounded-2xl border-2 border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <ImageIcon className="h-12 w-12" />
                </div>
                <p className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-1">
                  <Paperclip className="h-4 w-4" />
                  Imagens para usar no card
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {art.asset_urls.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden bg-background aspect-square group border-2 border-primary/10 shadow-md ring-2 ring-transparent hover:ring-primary/40 transition-all duration-300">
                      <img
                        src={url}
                        alt={`Imagem de referência ${idx + 1} para a arte ${art.art_number}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                        onClick={() => setLightboxImage(url)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white text-primary font-bold shadow-lg"
                          asChild
                        >
                          <a href={url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Baixar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtitle and CTA for non-carousel */}
            {art.art_type !== 'carrossel' && (art.subtitle || art.cta) && (
              <div className="grid grid-cols-2 gap-3">
                {art.subtitle && (
                  <div className="bg-card border border-muted-foreground/10 rounded-xl p-3 shadow-sm">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Subtítulo</p>
                    <p className="text-sm font-bold text-foreground/90">{art.subtitle}</p>
                  </div>
                )}
                {art.cta && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 shadow-sm">
                    <p className="text-[9px] text-primary/70 uppercase tracking-widest font-black mb-1">CTA / Chamada</p>
                    <p className="text-sm font-black text-primary uppercase">{art.cta}</p>
                  </div>
                )}
              </div>
            )}

            {/* Carousel Slides */}
            {art.art_type === 'carrossel' && art.carousel_slides && art.carousel_slides.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Layout className="h-3 w-3" />
                  Cards do Carrossel ({art.carousel_slides.length})
                </p>
                <div className="space-y-2">
                  {art.carousel_slides.map((slide, index) => (
                    <Card key={index} className="overflow-hidden border-muted-foreground/10 shadow-none bg-card/50">
                      <div className="p-1.5 bg-muted/20 border-b flex items-center justify-between">
                        <Badge variant="secondary" className="text-[7px] h-3.5 px-1 font-black">SLIDE {index + 1}</Badge>
                      </div>
                      <div className="p-3 space-y-4">
                        {(slide.image_urls?.length > 0 || slide.image_url) && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              Imagens do Slide
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {getSlideImageUrls(slide).map((url: string, imgIdx: number) => (
                                <div key={imgIdx} className="aspect-square bg-muted rounded-xl overflow-hidden border-2 border-primary/20 group relative shadow-sm hover:shadow-md transition-all">
                                  <img 
                                    src={url} 
                                    alt={`Slide ${index + 1}`} 
                                    className="w-full h-full object-cover cursor-pointer transition-transform duration-500 hover:scale-110"
                                    onClick={() => setLightboxImage(url)}
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 rounded-lg bg-white/90 text-primary hover:bg-white font-bold shadow-lg"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        downloadUrls([url], `carrossel-slide-${index + 1}-imagem`);
                                      }}
                                    >
                                      <Download className="h-3.5 w-3.5 mr-1.5" />
                                      Baixar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {slide.headline && (
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-primary uppercase tracking-widest">Headline</p>
                              <p className="text-xs font-black leading-tight text-foreground">{slide.headline}</p>
                            </div>
                          )}
                          {slide.subtitle && (
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Subtítulo</p>
                              <p className="text-[10px] font-bold text-muted-foreground/80 leading-tight">{slide.subtitle}</p>
                            </div>
                          )}
                          {slide.description && (
                            <div className="bg-muted/30 p-2 rounded-lg border border-dashed border-muted-foreground/20">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Instruções</p>
                              <div className="text-[10px] text-muted-foreground leading-relaxed">
                                {slide.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {art.description && (
              <Collapsible className="border rounded-xl overflow-hidden bg-muted/5 border-muted-foreground/10">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between px-3 py-2 h-auto group">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Instruções {art.art_type === 'carrossel' ? 'Gerais' : ''}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-1">
                  <div className="text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-dashed border-muted-foreground/20 leading-relaxed">
                    {art.description}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {art.caption && art.art_type !== 'story' && (
              <Collapsible className="border rounded-xl overflow-hidden bg-orange-500/5 border-orange-500/10">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between px-3 py-2 h-auto group">
                    <span className="text-[9px] font-black uppercase text-orange-700 tracking-widest">Legenda do Post</span>
                    <ChevronDown className="h-3 w-3 text-orange-400 transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-1">
                  <div className="text-[11px] text-foreground/80 bg-background/80 p-3 rounded-lg border border-orange-500/20 whitespace-pre-wrap leading-relaxed">
                    {art.caption}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {art.observations && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Obs. Extras</p>
                <p className="text-xs">{art.observations}</p>
              </div>
            )}

            {art.revision_comment && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-2.5">
                <p className="text-[10px] text-destructive uppercase tracking-wider font-bold flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  AJUSTE SOLICITADO
                </p>
                <p className="text-xs mt-1">{art.revision_comment}</p>
              </div>
            )}

            {/* Collapsible reference images for designer */}
            <Collapsible className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-between px-3 py-1.5 h-auto hover:bg-muted/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Imagens de Referência</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  {art.reference_image_urls && art.reference_image_urls.length > 0 ? (
                    art.reference_image_urls.map((url, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                        <img
                          src={url}
                          alt={`Referência ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxImage(url)}
                        />
                      </div>
                    ))
                  ) : art.reference_image_url ? (
                    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video col-span-2">
                      <img
                        src={art.reference_image_url}
                        alt="Referência"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxImage(art.reference_image_url!)}
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic col-span-2">Nenhuma imagem de referência.</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-2 pt-4 border-t border-muted">
              {(hasImages || hasCarouselImages) && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-10 text-xs font-black uppercase tracking-widest shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => {
                    const urls = hasImages ? localUrls : carouselImageUrls;
                    const prefix = hasImages ? `arte-${art.art_number}` : `carrossel-${art.art_number}`;
                    downloadUrls(urls, prefix);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {hasImages ? 'Download Artes' : 'Baixar Imagens do Carrossel'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 text-xs font-bold uppercase tracking-widest border-muted-foreground/20 hover:bg-muted/50"
                onClick={() => onDownloadPDF(art)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              {hasImages && showUpload && !isEditMode && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setIsEditMode(true)}
                  aria-label="Editar imagens da arte"
                  title="Editar Imagens"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        alt={art.title || 'Arte'}
        onDownload={() => lightboxImage && downloadUrls([lightboxImage], `imagem-${art.art_number}`)}
        showEditButton={showUpload}
        onEdit={() => {
          setLightboxImage(null);
          setIsEditMode(true);
        }}
      />
    </>
  );
}
