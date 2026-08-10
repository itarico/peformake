import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video, Palette, Share2, Megaphone, Loader2, Sparkles, RefreshCw, Copy, Check, Send, CheckCircle, FileDown, ArrowRight, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
// html2pdf and logoPfmk are now loaded dynamically via pdfUtils
import { DesignIdeasGrid, parseDesignIdeasFromContent } from './DesignIdeasGrid';
import { AIContentDisplay } from './AIContentDisplay';
// Helper function to format AI text - transform to styled content with bold titles
const formatAIText = (text: string): { type: 'title' | 'subtitle' | 'text'; content: string }[] => {
  const lines = text.split('\n');
  const result: { type: 'title' | 'subtitle' | 'text'; content: string }[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Detect titles - lines that are all caps, start with ###, or have clear title patterns
    const isAllCaps = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && /[A-Z]/.test(trimmedLine);
    const startsWithHashes = /^#{1,6}\s+/.test(trimmedLine);
    const isNumberedTitle = /^\d+[\.\)]\s*[A-Z]/.test(trimmedLine);
    const hasColonEnd = trimmedLine.endsWith(':') && trimmedLine.length < 80;
    const startsWithEquals = /^={2,}\s*/.test(trimmedLine) || /\s*={2,}$/.test(trimmedLine);
    
    if (startsWithHashes) {
      result.push({
        type: 'title',
        content: trimmedLine.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '')
      });
    } else if (isAllCaps || startsWithEquals) {
      // Clean equals signs
      const cleanedTitle = trimmedLine.replace(/^={2,}\s*/, '').replace(/\s*={2,}$/, '');
      result.push({
        type: 'title',
        content: cleanedTitle
      });
    } else if (isNumberedTitle || hasColonEnd) {
      result.push({
        type: 'subtitle',
        content: trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '')
      });
    } else {
      // Process normal text
      let processed = trimmedLine
        // Remove bold markdown but keep text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        // Remove italic markdown
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Clean bullet points
        .replace(/^[-*+]\s+/, '• ')
        // Remove code blocks
        .replace(/`([^`]+)`/g, '$1')
        // Remove horizontal rules
        .replace(/^[-*_]{3,}$/, '');
      
      if (processed) {
        // Check if line starts with a label pattern (Label: content) - treat as subtitle
        const labelMatch = processed.match(/^([A-Za-zÀ-ÿ0-9\s/\-]+):\s+(.+)$/);
        if (labelMatch && labelMatch[1].length < 35 && labelMatch[1].length > 2) {
          result.push({
            type: 'subtitle',
            content: processed
          });
        } else {
          result.push({
            type: 'text',
            content: processed
          });
        }
      }
    }
  }
  
  return result;
};

type ContentCategory = 'video' | 'design' | 'social_media' | 'campaign';

interface ContentAnalysis {
  category: ContentCategory;
  content: string;
  generatedAt: Date;
}

interface ContentAnalysisPanelProps {
  instanceId: string;
  monthId: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
  disabled?: boolean;
  /** If provided, only show this specific category (no tabs) */
  singleCategory?: ContentCategory;
  /** Client ID for sending to production */
  clientId?: string;
}

const CATEGORY_CONFIG: Record<ContentCategory, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  description: string;
}> = {
  video: {
    label: 'Vídeo',
    icon: <Video className="h-5 w-5" />,
    color: 'text-red-500',
    description: 'Roteiros completos, Reels, TikToks, Shorts, Lives',
  },
  design: {
    label: 'Design Gráfico',
    icon: <Palette className="h-5 w-5" />,
    color: 'text-purple-500',
    description: 'Estrutura de artes, carrosséis, posts, stories',
  },
  social_media: {
    label: 'Social Media',
    icon: <Share2 className="h-5 w-5" />,
    color: 'text-blue-500',
    description: 'Calendário editorial, estratégia por plataforma',
  },
  campaign: {
    label: 'Campanha',
    icon: <Megaphone className="h-5 w-5" />,
    color: 'text-orange-500',
    description: 'Estratégia de anúncios, segmentação, direcionamento',
  },
};

export function ContentAnalysisPanel({
  instanceId,
  monthId,
  clientContext,
  disabled = false,
  singleCategory,
  clientId,
}: ContentAnalysisPanelProps) {
  const queryClient = useQueryClient();
  const [analyses, setAnalyses] = useState<Record<ContentCategory, ContentAnalysis | null>>({
    video: null,
    design: null,
    social_media: null,
    campaign: null,
  });
  const [copiedCategory, setCopiedCategory] = useState<ContentCategory | null>(null);
  const [activeTab, setActiveTab] = useState<ContentCategory>(singleCategory || 'video');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvedCategory, setApprovedCategory] = useState<ContentCategory | null>(null);
  const [showSendToBriefingDialog, setShowSendToBriefingDialog] = useState(false);
  const [selectedArtIdea, setSelectedArtIdea] = useState<{title: string; description: string} | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'cards'>('text');
  
  // Categories to display - either single or all
  const categoriesToShow: ContentCategory[] = singleCategory 
    ? [singleCategory] 
    : (Object.keys(CATEGORY_CONFIG) as ContentCategory[]);

  // Load saved analyses from database
  const { data: savedAnalyses } = useQuery({
    queryKey: ['content-analyses', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('consulting_month_id', monthId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!monthId,
  });

  // Initialize from saved data
  useEffect(() => {
    if (savedAnalyses) {
      const loaded: Record<ContentCategory, ContentAnalysis | null> = {
        video: null, design: null, social_media: null, campaign: null
      };
      
      savedAnalyses.forEach((analysis: any) => {
        if (CATEGORY_CONFIG[analysis.category as ContentCategory]) {
          loaded[analysis.category as ContentCategory] = {
            category: analysis.category,
            content: analysis.content,
            generatedAt: new Date(analysis.updated_at),
          };
        }
      });
      
      setAnalyses(loaded);
    }
  }, [savedAnalyses]);

  const generateMutation = useMutation({
    mutationFn: async (category: ContentCategory) => {
      const response = await supabase.functions.invoke('consulting-content-analysis', {
        body: {
          instance_id: instanceId,
          consulting_month_id: monthId,
          content_category: category,
          client_context: clientContext,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar análise');
      }

      // Save to database
      const content = response.data.analysis;
      await supabase
        .from('content_analyses')
        .upsert({
          consulting_month_id: monthId,
          category,
          content,
        }, { onConflict: 'consulting_month_id,category' });

      return { category, content };
    },
    onSuccess: (data) => {
      setAnalyses(prev => ({
        ...prev,
        [data.category]: {
          category: data.category,
          content: data.content,
          generatedAt: new Date(),
        },
      }));
      queryClient.invalidateQueries({ queryKey: ['content-analyses', monthId] });
      toast.success(`Análise de ${CATEGORY_CONFIG[data.category].label} gerada e salva!`);
    },
    onError: (error) => {
      console.error('Generate error:', error);
      toast.error('Erro ao gerar análise. Tente novamente.');
    },
  });

  const handleGenerate = (category: ContentCategory) => {
    generateMutation.mutate(category);
  };

  const handleCopy = async (category: ContentCategory) => {
    const analysis = analyses[category];
    if (!analysis) return;

    await navigator.clipboard.writeText(analysis.content);
    setCopiedCategory(category);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedCategory(null), 2000);
  };

  // Approve design and send to production
  const approveAndSendMutation = useMutation({
    mutationFn: async (category: ContentCategory) => {
      if (!clientId) throw new Error('Client ID is required');
      
      // Get the current consulting month to find the corresponding work_month
      const { data: consultingMonth } = await supabase
        .from('consulting_months')
        .select('year, month, client_id')
        .eq('id', monthId)
        .single();
      
      if (!consultingMonth) throw new Error('Consulting month not found');
      
      // Find or create work_month for the same period
      const { data: workMonth } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', consultingMonth.client_id)
        .eq('year', consultingMonth.year)
        .eq('month', consultingMonth.month)
        .single();
      
      if (!workMonth) throw new Error('Work month not found. Enable design service for this client first.');
      
      // Get analysis content
      const analysis = analyses[category];
      if (!analysis) throw new Error('No analysis to approve');
      
      // Parse design ideas from content and create arts
      const content = analysis.content;
      const artMatches = content.match(/ARTE \d+[:\s]+([^\n]+)/gi) || [];
      
      if (artMatches.length === 0) {
        // If no specific arts found, create a single art with the full content
        const { error } = await supabase
          .from('arts')
          .insert({
            work_month_id: workMonth.id,
            art_number: 1,
            art_type: 'post_instagram',
            title: `Planejamento ${CATEGORY_CONFIG[category].label}`,
            description: content.substring(0, 2000),
            status: 'ready_for_production',
          });
        
        if (error) throw error;
      } else {
        // Create arts for each detected item
        for (let i = 0; i < Math.min(artMatches.length, 10); i++) {
          const title = artMatches[i].replace(/ARTE \d+[:\s]+/i, '').trim();
          
          const { error } = await supabase
            .from('arts')
            .insert({
              work_month_id: workMonth.id,
              art_number: i + 100, // High number to not conflict with existing
              art_type: 'post_instagram',
              title: title || `Arte ${i + 1}`,
              description: `Gerado via IA - ${CATEGORY_CONFIG[category].label}`,
              status: 'ready_for_production',
              is_extra: true,
            });
          
          if (error) throw error;
        }
      }
      
      return { count: artMatches.length || 1 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['arts'] });
      setShowApproveDialog(false);
      setApprovedCategory(null);
      toast.success(`${data.count} arte(s) enviada(s) para produção!`);
    },
    onError: (error: any) => {
      console.error('Approve error:', error);
      toast.error(error.message || 'Erro ao enviar para produção');
    },
  });

  // Send single idea to briefing
  const sendToBriefingMutation = useMutation({
    mutationFn: async (idea: { title: string; description: string }) => {
      if (!clientId) throw new Error('Client ID is required');
      
      const { data: consultingMonth } = await supabase
        .from('consulting_months')
        .select('year, month, client_id')
        .eq('id', monthId)
        .single();
      
      if (!consultingMonth) throw new Error('Consulting month not found');
      
      const { data: workMonth } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', consultingMonth.client_id)
        .eq('year', consultingMonth.year)
        .eq('month', consultingMonth.month)
        .single();
      
      if (!workMonth) throw new Error('Work month not found. Enable design service first.');
      
      // Get highest art_number
      const { data: existingArts } = await supabase
        .from('arts')
        .select('art_number')
        .eq('work_month_id', workMonth.id)
        .order('art_number', { ascending: false })
        .limit(1);
      
      const nextNumber = (existingArts?.[0]?.art_number || 0) + 1;
      
      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: workMonth.id,
          art_number: nextNumber,
          art_type: 'post_instagram',
          title: idea.title,
          description: idea.description,
          status: 'pending_briefing',
          is_extra: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arts'] });
      setShowSendToBriefingDialog(false);
      setSelectedArtIdea(null);
      toast.success('Ideia enviada para briefing!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar para briefing');
    },
  });

  // PDF export function
  const handleExportPDF = async (category: ContentCategory) => {
    const analysis = analyses[category];
    if (!analysis) return;

    const { buildStandardPdfHtml, exportHtmlToPdf, pdfContentBlock } = await import('@/lib/pdfUtils');

    const htmlContent = buildStandardPdfHtml({
      title: CATEGORY_CONFIG[category].label,
      subtitle: 'Planejamento Mensal',
      clientExtra: `Gerado em: ${analysis.generatedAt.toLocaleString('pt-BR')}`,
      body: `<div style="margin-bottom: 20px;">${pdfContentBlock(analysis.content)}</div>`,
    });

    try {
      await exportHtmlToPdf(htmlContent, `planejamento-${category}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  // Parse ideas from content for individual sending
  const parseIdeasFromContent = (content: string) => {
    const ideas: { title: string; description: string }[] = [];
    
    // Match patterns like "ARTE 1:", "1.", "- Título:", etc.
    const patterns = [
      /ARTE\s*\d+[:\s]+([^\n]+)/gi,
      /^\d+[\.\)]\s*([^\n]+)/gm,
      /IDEIA\s*\d*[:\s]+([^\n]+)/gi,
      /POST\s*\d*[:\s]+([^\n]+)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const title = match[1]?.trim();
        if (title && title.length > 3 && title.length < 200) {
          ideas.push({
            title: title.substring(0, 100),
            description: `Gerado via IA - ${title}`,
          });
        }
      }
    }
    
    return ideas.slice(0, 20); // Max 20 ideas
  };

  const handleApprove = (category: ContentCategory) => {
    setApprovedCategory(category);
    setShowApproveDialog(true);
  };

  const confirmApprove = () => {
    if (approvedCategory) {
      approveAndSendMutation.mutate(approvedCategory);
    }
  };

  const isGenerating = generateMutation.isPending;
  const generatingCategory = isGenerating ? generateMutation.variables : null;

  const renderFormattedContent = (content: string) => {
    const formatted = formatAIText(content);
    
    return (
      <div className="space-y-2">
        {formatted.map((item, i) => {
          if (item.type === 'title') {
            return (
              <h3 key={i} className="font-bold text-base text-foreground mt-4 first:mt-0 border-b border-border/50 pb-1">
                {item.content}
              </h3>
            );
          } else if (item.type === 'subtitle') {
            return (
              <p key={i} className="font-semibold text-sm text-foreground/90 mt-2">
                {item.content}
              </p>
            );
          } else {
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed pl-1">
                {item.content}
              </p>
            );
          }
        })}
      </div>
    );
  };

  // Single category mode - simplified UI without tabs
  if (singleCategory) {
    const category = singleCategory;
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${CATEGORY_CONFIG[category].color}`}>
            {CATEGORY_CONFIG[category].icon}
            Gerar {CATEGORY_CONFIG[category].label}
          </CardTitle>
          <CardDescription>
            {CATEGORY_CONFIG[category].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-end">
            <Button
              onClick={() => handleGenerate(category)}
              disabled={disabled || (isGenerating && generatingCategory === category)}
              className="gap-2"
            >
              {isGenerating && generatingCategory === category ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : analyses[category] ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerar
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Análise
                </>
              )}
            </Button>
          </div>

          {analyses[category] ? (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Gerado em {analyses[category]?.generatedAt.toLocaleTimeString('pt-BR')}
                </Badge>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(category)}
                    className="gap-2"
                  >
                    {copiedCategory === category ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                  
                  {/* PDF Export */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportPDF(category)}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                  
                  {/* Design category: show grid view option */}
                  {category === 'design' && analyses[category] && (
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'cards' ? 'text' : 'cards')}
                      className="gap-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      {viewMode === 'cards' ? 'Ver Texto' : 'Ver Cards'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Design Ideas Grid View */}
              {category === 'design' && viewMode === 'cards' && analyses[category] && clientId && (
                <DesignIdeasGrid
                  ideas={parseDesignIdeasFromContent(analyses[category]?.content || '')}
                  monthId={monthId}
                  clientId={clientId}
                />
              )}
              
              {/* Text View */}
              {(category !== 'design' || viewMode === 'text') && (
                <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  {renderFormattedContent(analyses[category]?.content || '')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Clique em "Gerar Análise" para criar o conteúdo de {CATEGORY_CONFIG[category].label.toLowerCase()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multi-category mode with tabs
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Gerar Análise IA
        </CardTitle>
        <CardDescription>
          Gere análises estratégicas baseadas no cruzamento de dados e planejamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentCategory)}>
          <TabsList className="grid w-full grid-cols-4">
            {categoriesToShow.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="flex items-center gap-1 px-2"
              >
                <span className={CATEGORY_CONFIG[category].color}>
                  {CATEGORY_CONFIG[category].icon}
                </span>
                <span className="hidden md:inline text-xs">{CATEGORY_CONFIG[category].label}</span>
                {analyses[category] && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {categoriesToShow.map((category) => (
            <TabsContent key={category} value={category} className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold flex items-center gap-2 ${CATEGORY_CONFIG[category].color}`}>
                    {CATEGORY_CONFIG[category].icon}
                    {CATEGORY_CONFIG[category].label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_CONFIG[category].description}
                  </p>
                </div>
                <Button
                  onClick={() => handleGenerate(category)}
                  disabled={disabled || (isGenerating && generatingCategory === category)}
                  size="sm"
                  className="gap-2"
                >
                  {isGenerating && generatingCategory === category ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : analyses[category] ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Regenerar
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar
                    </>
                  )}
                </Button>
              </div>

              {analyses[category] ? (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Gerado em {analyses[category]?.generatedAt.toLocaleTimeString('pt-BR')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(category)}
                      className="gap-2"
                    >
                      {copiedCategory === category ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    {renderFormattedContent(analyses[category]?.content || '')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Clique em "Gerar" para criar a análise de {CATEGORY_CONFIG[category].label.toLowerCase()}</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Aprovar e Enviar para Produção
            </DialogTitle>
            <DialogDescription>
              As artes do planejamento de design serão criadas automaticamente e enviadas para o designer responsável.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Criar artes com status "Pronto para Produção"
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Notificar o designer responsável
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Incluir briefing baseado na análise IA
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={approveAndSendMutation.isPending}
              className="gap-2"
            >
              {approveAndSendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
