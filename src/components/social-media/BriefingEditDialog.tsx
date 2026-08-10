import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, X, Image as ImageIcon, Instagram, PlaySquare, Layout, Megaphone, ArrowLeft, Link as LinkIcon, Paperclip, ChevronDown, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ArtType, ArtStatus, ART_TYPE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Art {
  id: string;
  art_number: number;
  title: string | null;
  description: string | null;
  headline?: string | null;
  subtitle?: string | null;
  cta?: string | null;
  caption: string | null;
  observations?: string | null;
  audio_observation_url?: string | null;
  asset_urls?: string[] | null;
  status: ArtStatus;
  art_type: ArtType | null;
  reference_image_url?: string | null;
  reference_image_urls?: string[] | null;
  reference_link?: string | null;
  carousel_slides?: any[] | null;
}

interface BriefingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  art: Art | null;
  onSave: (art_id: string, data: {
    art_type?: ArtType;
    title?: string;
    description?: string;
    headline?: string;
    subtitle?: string;
    cta?: string;
    caption?: string;
    observations?: string;
    audio_observation_url?: string | null;
    asset_urls?: string[];
    reference_image_url?: string | null;
    reference_image_urls?: string[];
    reference_link?: string | null;
    carousel_slides?: any[];
    status?: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

const AutoResizeTextarea = ({ value, onChange, placeholder, className, rows = 3, id }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <Textarea
      id={id}
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn("resize-none overflow-hidden min-h-[80px]", className)}
      rows={rows}
    />
  );
};

export function BriefingEditDialog({ 
  open, 
  onOpenChange, 
  art, 
  onSave,
  isSaving = false,
}: BriefingEditDialogProps) {
  const [step, setStep] = useState<'selection' | 'form'>('selection');
  const [formData, setFormData] = useState<any>({
    art_type: '' as ArtType | '',
    title: '',
    description: '',
    headline: '',
    subtitle: '',
    cta: '',
    caption: '',
    observations: '',
    audio_observation_url: '',
    asset_urls: [] as string[],
    reference_image_urls: [] as string[],
    reference_link: '',
    carousel_slides: [] as any[],
  });

  useEffect(() => {
    if (art) {
      // Normalize each carousel slide: ensure each has its OWN image_urls array
      // and drop the legacy singular image_url to prevent cross-slide replication.
      const normalizedSlides = (art.carousel_slides || []).map((s: any) => {
        const ownUrls = Array.isArray(s?.image_urls) ? [...s.image_urls] : [];
        const fallback = ownUrls.length === 0 && s?.image_url ? [s.image_url] : [];
        const { image_url, image_urls, ...rest } = s || {};
        return { ...rest, image_urls: ownUrls.length ? ownUrls : fallback };
      });

      setFormData({
        art_type: art.art_type || '',
        title: art.title || '',
        description: art.description || '',
        headline: art.headline || '',
        subtitle: art.subtitle || '',
        cta: art.cta || '',
        caption: art.caption || '',
        observations: art.observations || '',
        audio_observation_url: art.audio_observation_url || '',
        asset_urls: art.asset_urls || [],
        reference_image_urls: art.reference_image_urls?.length 
          ? art.reference_image_urls 
          : (art.reference_image_url ? [art.reference_image_url] : []),
        reference_link: art.reference_link || '',
        carousel_slides: normalizedSlides,
      });
      
      // If art_type is already set, go straight to form
      if (art.art_type) {
        setStep('form');
      } else {
        setStep('selection');
      }
    }
  }, [art, open]);


  const handleSave = async (shouldSendToProduction: boolean = false) => {
    if (!art) return;

    // Use headline as title as requested
    const effectiveTitle = formData.headline || formData.title || `Arte #${art.art_number}`;

    // Force production status if requested, otherwise keep current or update if was pending
    let newStatus = art.status;
    if (shouldSendToProduction) {
      newStatus = 'ready_for_production';
    } else if (art.status === 'pending_briefing' && formData.art_type && (formData.headline || formData.title)) {
      // Auto-promote to ready if basic info is present and just saving
      newStatus = 'ready_for_production';
    }

    await onSave(art.id, {
      art_type: (formData.art_type as ArtType) || undefined,
      title: effectiveTitle,
      description: formData.description || '',
      headline: formData.headline || '',
      subtitle: formData.subtitle || '',
      cta: formData.cta || '',
      caption: formData.caption || '',
      observations: formData.observations || '',
      audio_observation_url: formData.audio_observation_url || null,
      asset_urls: formData.asset_urls,
      reference_image_url: formData.reference_image_urls[0] || null,
      reference_image_urls: formData.reference_image_urls,
      reference_link: formData.reference_link || null,
      carousel_slides: formData.carousel_slides,
      status: newStatus,
    });

    onOpenChange(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSave(true);
  };

  const selectType = (type: ArtType) => {
    setFormData(prev => ({ 
      ...prev, 
      art_type: type,
      carousel_slides: type === 'carrossel' && prev.carousel_slides.length === 0 
        ? [{ headline: '', subtitle: '', description: '', image_urls: [] }] 
        : prev.carousel_slides
    }));
    setStep('form');
  };

  if (!art) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2" 
                onClick={() => setStep('selection')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {art.status === 'pending_briefing' ? 'Criar Briefing' : 'Editar Briefing'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Arte #{art.art_number} {formData.art_type && `- ${ART_TYPE_LABELS[formData.art_type as ArtType]}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {step === 'selection' ? (
            <div className="grid grid-cols-2 gap-3 py-4 max-w-lg mx-auto">
              <button 
                onClick={() => selectType('feed')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all hover:border-primary hover:bg-primary/5 group",
                  formData.art_type === 'feed' ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Instagram className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                <span className="font-bold text-sm">Feed</span>
              </button>

              <button 
                onClick={() => selectType('story')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all hover:border-primary hover:bg-primary/5 group",
                  formData.art_type === 'story' ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <PlaySquare className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                <span className="font-bold text-sm">Story</span>
              </button>

              <button 
                onClick={() => selectType('carrossel')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all hover:border-primary hover:bg-primary/5 group",
                  formData.art_type === 'carrossel' ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Layout className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                <span className="font-bold text-sm">Carrossel</span>
              </button>

              <button 
                onClick={() => selectType('anuncio')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all hover:border-primary hover:bg-primary/5 group",
                  formData.art_type === 'anuncio' ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Megaphone className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                <span className="font-bold text-sm">Anúncio</span>
              </button>
            </div>
          ) : (
            <form id="briefing-form" onSubmit={handleSubmit} className="space-y-4 py-2">
              {formData.art_type !== 'carrossel' && formData.art_type !== ('carrossel' as any) && (
                <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="headline" className="text-[10px] uppercase font-bold text-primary tracking-wider ml-1">Headline (Título na Arte)</Label>
                      <Input
                        id="headline"
                        value={formData.headline}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="O que deve estar escrito em destaque?"
                        className="h-10 text-sm bg-background border-muted-foreground/20 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="shrink-0 flex flex-col items-center">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 tracking-wider">Tipo</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
                              onClick={() => setStep('selection')}
                            >
                              {formData.art_type === 'feed' && <Instagram className="h-5 w-5" />}
                              {formData.art_type === 'story' && <PlaySquare className="h-5 w-5" />}
                              {formData.art_type === 'carrossel' && <Layout className="h-5 w-5" />}
                              {formData.art_type === 'anuncio' && <Megaphone className="h-5 w-5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="font-bold">{ART_TYPE_LABELS[formData.art_type as ArtType] || 'Selecionar Tipo'}</p>
                            <p className="text-[10px] text-muted-foreground">Clique para alterar o formato</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Fields - Subtitle and CTA (Hide for Carousel) */}
              {(formData.art_type as any) !== 'carrossel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-dashed border-muted-foreground/20">
                  <div className="space-y-1.5">
                    <Label htmlFor="subtitle" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Subtítulo</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Texto complementar..."
                      className="h-9 text-sm bg-background/50 focus-visible:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cta" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">CTA (Botão/Chamada)</Label>
                    <Input
                      id="cta"
                      value={formData.cta}
                      onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                      placeholder="Ex: Link na Bio, Comente X..."
                      className="h-9 text-sm bg-background/50 focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              {/* Collapsible Fields Container */}
              <div className="space-y-3">
                {/* Description Collapsible */}
                <Collapsible className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all border-muted-foreground/10 data-[state=open]:border-primary/20">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between px-4 py-3 h-auto hover:bg-muted/30 group">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                          <ImageIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide group-hover:text-foreground transition-colors">
                          {formData.art_type === 'story' ? 'Instruções do Story' : 
                           formData.art_type === 'carrossel' ? 'Instruções Gerais' : 
                           formData.art_type === 'anuncio' ? 'Instruções do Anúncio' : 
                           'Descrição para o Designer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.description && <Badge variant="secondary" className="h-4 px-1.5 text-[8px] bg-primary/10 text-primary border-none">PREENCHIDO</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 pt-0 border-t border-dashed border-muted-foreground/10">
                    <div className="mt-4">
                      <AutoResizeTextarea
                        id="description"
                        value={formData.description}
                        onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descreva detalhes visuais, cores, elementos..."
                        className="bg-muted/5 border-none focus-visible:ring-0 text-sm p-0 min-h-[100px]"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Caption Collapsible - Hide for Story */}
                {formData.art_type !== 'story' && (
                  <Collapsible className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all border-muted-foreground/10 data-[state=open]:border-primary/20">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full flex justify-between px-4 py-3 h-auto hover:bg-muted/30 group">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-orange-500/5 text-orange-600 group-hover:bg-orange-500/10 transition-colors">
                            <Megaphone className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide group-hover:text-foreground transition-colors">
                            Legenda do Post
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {formData.caption && <Badge variant="secondary" className="h-4 px-1.5 text-[8px] bg-orange-500/10 text-orange-600 border-none">PREENCHIDO</Badge>}
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4 pt-0 border-t border-dashed border-muted-foreground/10">
                      <div className="mt-4">
                        <AutoResizeTextarea
                          id="caption"
                          value={formData.caption}
                          onChange={(e: any) => setFormData({ ...formData, caption: e.target.value })}
                          placeholder="Escreva a legenda que acompanhará a postagem..."
                          className="bg-muted/5 border-none focus-visible:ring-0 text-sm p-0 min-h-[120px]"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Carousel Slides Section */}
              {(formData.art_type as any) === 'carrossel' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-dashed border-muted-foreground/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Layout className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">Slides do Carrossel</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Múltiplos Cards</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end mr-1">
                        <Label htmlFor="total-slides" className="text-[8px] uppercase font-bold text-muted-foreground mb-1">Qtd</Label>
                        <Input 
                          id="total-slides"
                          type="number" 
                          min="1" 
                          max="20"
                          value={formData.carousel_slides.length}
                          onChange={(e) => {
                            const count = parseInt(e.target.value);
                            if (isNaN(count)) return;
                            const currentCount = formData.carousel_slides.length;
                            let newSlides = [...formData.carousel_slides];
                            if (count > currentCount) {
                              for (let i = 0; i < count - currentCount; i++) {
                                newSlides.push({ headline: '', subtitle: '', description: '', image_urls: [] });
                              }
                            } else if (count < currentCount) {
                              newSlides = newSlides.slice(0, count);
                            }
                            setFormData({ ...formData, carousel_slides: newSlides });
                          }}
                          className="h-8 w-14 text-center text-xs font-bold"
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="default" 
                        size="sm"
                        className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => setFormData({
                          ...formData,
                          carousel_slides: [...formData.carousel_slides, { headline: '', subtitle: '', description: '', image_urls: [] }]
                        })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Card
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.carousel_slides.map((slide: any, index: number) => (
                      <Card key={index} className="overflow-hidden border-muted-foreground/10 bg-card shadow-sm transition-all hover:shadow-md">
                        <div className="flex flex-col md:flex-row min-h-[180px]">
                          {/* Left: Image Side */}
                          <div className="w-full md:w-40 bg-muted/20 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-dashed border-muted-foreground/10 relative">
                            <Badge variant="secondary" className="absolute top-2 left-2 text-[8px] h-4 font-black">CARD {index + 1}</Badge>
                            <div className="w-full mt-2">
                              <MultiImageUpload
                                bucket="reference-images"
                                folder={`arts/${art.id}/slides/${index}`}
                                currentUrls={slide.image_urls || (slide.image_url ? [slide.image_url] : [])}
                                onUpload={(urls) => {
                                  const newSlides = [...formData.carousel_slides];
                                  newSlides[index] = { ...slide, image_urls: urls };
                                  setFormData({ ...formData, carousel_slides: newSlides });
                                }}
                                maxImages={20}
                              />
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Imagens do Slide</p>
                          </div>
                          
                          {/* Right: Info Side */}
                          <div className="flex-1 p-4 space-y-3 bg-background/50">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-primary tracking-widest ml-0.5">Título do Slide</Label>
                                <Input 
                                  value={slide.headline || ''} 
                                  onChange={(e) => {
                                    const newSlides = [...formData.carousel_slides];
                                    newSlides[index] = { ...slide, headline: e.target.value };
                                    setFormData({ ...formData, carousel_slides: newSlides });
                                  }}
                                  placeholder="Ex: Benefício #1"
                                  className="h-8 text-xs bg-background border-muted-foreground/10 focus-visible:ring-primary/40"
                                />
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 -mt-4 -mr-1"
                                onClick={() => {
                                  const newSlides = [...formData.carousel_slides];
                                  newSlides.splice(index, 1);
                                  setFormData({ ...formData, carousel_slides: newSlides });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest ml-0.5">Subtítulo</Label>
                                <Input 
                                  value={slide.subtitle || ''} 
                                  onChange={(e) => {
                                    const newSlides = [...formData.carousel_slides];
                                    newSlides[index] = { ...slide, subtitle: e.target.value };
                                    setFormData({ ...formData, carousel_slides: newSlides });
                                  }}
                                  placeholder="Texto complementar..."
                                  className="h-7 text-[10px] bg-background border-muted-foreground/10 focus-visible:ring-primary/40"
                                />
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest ml-0.5">Instruções/Conteúdo</Label>
                                <AutoResizeTextarea 
                                  value={slide.description || ''} 
                                  className="min-h-[50px] text-[11px] bg-background border-muted-foreground/10 p-2"
                                  onChange={(e: any) => {
                                    const newSlides = [...formData.carousel_slides];
                                    newSlides[index] = { ...slide, description: e.target.value };
                                    setFormData({ ...formData, carousel_slides: newSlides });
                                  }}
                                  placeholder="Detalhes visuais e texto deste card..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {formData.carousel_slides.length === 0 && (
                      <div className="py-12 border-2 border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center text-muted-foreground transition-all hover:bg-muted/10">
                        <div className="p-3 rounded-full bg-muted/20 mb-3">
                          <Layout className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Nenhum slide adicionado ao carrossel.</p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="mt-4 border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold"
                          onClick={() => setFormData({
                            ...formData,
                            carousel_slides: [{ headline: '', subtitle: '', description: '', image_urls: [] }]
                          })}
                        >
                          Começar com o primeiro card
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Links and Assets Row */}
              <div className="space-y-3 pt-2">
                <div className="bg-card border border-muted-foreground/10 rounded-xl p-3 shadow-sm space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1 flex justify-between items-center">
                    <span>Referência & Voz</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      placeholder="Link de referência..." 
                      value={formData.reference_link || ''} 
                      onChange={(e) => setFormData({ ...formData, reference_link: e.target.value })}
                      className="h-8 text-xs bg-muted/5 border-muted-foreground/10"
                    />
                    <div className="flex gap-1 items-center bg-muted/10 p-0.5 rounded-lg border border-muted-foreground/5">
                      {formData.reference_link && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-primary hover:bg-primary/10" asChild>
                          <a href={formData.reference_link} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <AudioRecorder 
                        currentUrl={formData.audio_observation_url}
                        onUpload={(url) => setFormData({ ...formData, audio_observation_url: url || '' })}
                        folder={`arts/${art.id}/audio`}
                      />
                    </div>
                  </div>
                </div>

                {/* Imagens que serão usadas no card (Fotos reais) */}
                <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all hover:bg-primary/[0.07]">

                    <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] rotate-12">
                      <ImageIcon className="h-24 w-24" />
                    </div>
                    <Label className="text-[11px] uppercase font-black text-primary tracking-widest ml-1 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-sm">
                        <Paperclip className="h-4 w-4" />
                      </div>
                      Imagens que serão usadas no card
                    </Label>
                    <div className="relative z-10">
                      <MultiImageUpload
                        currentUrls={formData.asset_urls}
                        onUpload={(urls) => setFormData({ ...formData, asset_urls: urls })}
                        bucket="reference-images"
                        folder={`arts/${art.id}/assets`}
                      maxImages={20}

                      />
                    </div>
                    <p className="text-[10px] text-primary/60 font-bold italic ml-1">Estas são as fotos reais que o designer deve utilizar na arte.</p>
                  </div>


                {/* Collapsible section for references */}
                <Collapsible className="border rounded-xl overflow-hidden bg-muted/5 border-muted-foreground/10 transition-all hover:border-muted-foreground/20">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between px-4 py-2.5 h-auto group">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest group-hover:text-foreground transition-colors">Imagens de Referência (Prints)</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 border-t border-dashed border-muted-foreground/10 pt-4">
                    <MultiImageUpload
                      currentUrls={formData.reference_image_urls}
                      onUpload={(urls) => setFormData({ ...formData, reference_image_urls: urls })}
                      bucket="reference-images"
                      folder={`arts/${art.id}/references`}
                      maxImages={10}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="p-4 flex flex-col sm:flex-row gap-2 border-t bg-muted/20">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="text-xs font-bold uppercase tracking-widest h-10 px-4 order-3 sm:order-1"
          >
            Cancelar
          </Button>
          
          {step === 'form' && (
            <>
              <Button 
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => handleSave(false)}
                className="gap-2 text-xs font-bold uppercase tracking-widest h-10 px-6 border-primary/20 hover:bg-primary/5 text-primary order-2 sm:ml-auto"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Rascunho
              </Button>

              <Button 
                type="submit" 
                form="briefing-form"
                disabled={isSaving}
                className="gap-2 text-xs font-black uppercase tracking-widest h-10 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] order-1 sm:order-3"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para Produção
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
