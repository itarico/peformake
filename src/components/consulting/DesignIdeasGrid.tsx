import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Palette, Send, Check, Loader2, Lightbulb, Sparkles, Copy, Edit2, X, Image } from 'lucide-react';
import { toast } from 'sonner';

interface DesignIdea {
  id: string;
  titulo: string;
  descricao: string;
  tipo?: string;
  objetivo?: string;
  formato?: string;
  elementos?: string;
  legenda?: string;
  hashtags?: string;
  approved?: boolean;
}

interface DesignIdeasGridProps {
  ideas: DesignIdea[];
  monthId: string;
  clientId: string;
  onIdeaApproved?: (ideaId: string) => void;
}

const ART_TYPES = [
  { value: 'post_instagram', label: 'Post Instagram' },
  { value: 'story', label: 'Story' },
  { value: 'carrossel', label: 'Carrossel' },
];

export function DesignIdeasGrid({ ideas, monthId, clientId, onIdeaApproved }: DesignIdeasGridProps) {
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<DesignIdea | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedArtType, setSelectedArtType] = useState('post_instagram');
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const approveIdeaMutation = useMutation({
    mutationFn: async (idea: DesignIdea) => {
      // Get consulting month info
      const { data: consultingMonth } = await supabase
        .from('consulting_months')
        .select('year, month, client_id')
        .eq('id', monthId)
        .single();

      if (!consultingMonth) throw new Error('Mês de consultoria não encontrado');

      // Find work_month
      const { data: workMonth } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', consultingMonth.client_id)
        .eq('year', consultingMonth.year)
        .eq('month', consultingMonth.month)
        .single();

      if (!workMonth) throw new Error('Ative o serviço de design para este cliente primeiro');

      // Get next art number
      const { data: existingArts } = await supabase
        .from('arts')
        .select('art_number')
        .eq('work_month_id', workMonth.id)
        .order('art_number', { ascending: false })
        .limit(1);

      const nextNumber = (existingArts?.[0]?.art_number || 0) + 1;

      // Create the art
      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: workMonth.id,
          art_number: nextNumber,
          art_type: selectedArtType as 'post_instagram' | 'story' | 'carrossel',
          title: idea.titulo,
          description: editedDescription || idea.descricao,
          caption: idea.legenda,
          observations: [idea.objetivo, idea.elementos, idea.hashtags].filter(Boolean).join('\n\n'),
          status: 'pending_briefing',
          is_extra: true,
        });

      if (error) throw error;
      return idea.id;
    },
    onSuccess: (ideaId) => {
      queryClient.invalidateQueries({ queryKey: ['arts'] });
      setShowApproveDialog(false);
      setSelectedIdea(null);
      setApprovedIds(prev => new Set([...prev, ideaId]));
      onIdeaApproved?.(ideaId);
      toast.success('Ideia aprovada e enviada para planejamento!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aprovar ideia');
    },
  });

  const handleApproveClick = (idea: DesignIdea) => {
    setSelectedIdea(idea);
    setEditedDescription(idea.descricao);
    setSelectedArtType('post_instagram');
    setShowApproveDialog(true);
  };

  const handleCopyIdea = async (idea: DesignIdea) => {
    const text = `${idea.titulo}\n\n${idea.descricao}${idea.legenda ? `\n\nLegenda: ${idea.legenda}` : ''}${idea.hashtags ? `\n\nHashtags: ${idea.hashtags}` : ''}`;
    await navigator.clipboard.writeText(text);
    toast.success('Ideia copiada!');
  };

  if (ideas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Nenhuma ideia de design gerada ainda</p>
        <p className="text-sm">Gere análise de Design Gráfico para ver ideias aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => {
          const isApproved = approvedIds.has(idea.id);
          
          return (
            <Card 
              key={idea.id} 
              className={`relative transition-all ${isApproved ? 'border-green-500/50 bg-green-500/5' : 'hover:border-primary/30'}`}
            >
              {isApproved && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 gap-1">
                    <Check className="h-3 w-3" />
                    Aprovada
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                    <Palette className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-medium line-clamp-2">
                      {idea.titulo}
                    </CardTitle>
                    {idea.tipo && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {idea.tipo}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {idea.descricao}
                </p>
                
                {idea.objetivo && (
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Objetivo:</span>
                    <span className="text-muted-foreground ml-1">{idea.objetivo}</span>
                  </div>
                )}
                
                {idea.formato && (
                  <div className="flex items-center gap-1 text-xs">
                    <Image className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{idea.formato}</span>
                  </div>
                )}
                
                {idea.legenda && (
                  <div className="text-xs bg-muted/50 rounded p-2">
                    <span className="font-medium">Legenda:</span>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{idea.legenda}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => handleCopyIdea(idea)}
                  >
                    <Copy className="h-3 w-3" />
                    Copiar
                  </Button>
                  
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => handleApproveClick(idea)}
                    disabled={isApproved}
                  >
                    {isApproved ? (
                      <>
                        <Check className="h-3 w-3" />
                        Enviada
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        Aprovar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Aprovar e Enviar para Planejamento
            </DialogTitle>
            <DialogDescription>
              Esta ideia será convertida em uma arte para o planejamento do mês
            </DialogDescription>
          </DialogHeader>

          {selectedIdea && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">{selectedIdea.titulo}</h4>
              </div>

              <div className="space-y-2">
                <Label htmlFor="artType">Tipo de Arte</Label>
                <Select value={selectedArtType} onValueChange={setSelectedArtType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ART_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Briefing</Label>
                <Textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  placeholder="Edite a descrição se necessário..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedIdea && approveIdeaMutation.mutate(selectedIdea)}
              disabled={approveIdeaMutation.isPending}
              className="gap-2"
            >
              {approveIdeaMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Aprovar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to parse design ideas from AI content
export function parseDesignIdeasFromContent(content: string): DesignIdea[] {
  const ideas: DesignIdea[] = [];
  
  // Try to parse structured format first (ARTE 1, ARTE 2, etc.)
  const artBlocks = content.split(/(?=ARTE\s*\d+|(?:^|\n)#{1,3}\s*(?:Arte|Ideia|Post)\s*\d+)/i);
  
  for (let i = 0; i < artBlocks.length; i++) {
    const block = artBlocks[i].trim();
    if (!block || block.length < 20) continue;
    
    // Extract title from first line or ARTE X pattern
    const titleMatch = block.match(/(?:ARTE\s*\d+[:\-.\s]*|#{1,3}\s*(?:Arte|Ideia|Post)\s*\d+[:\-.\s]*)([^\n]+)/i);
    const titulo = titleMatch 
      ? titleMatch[1].replace(/\*\*/g, '').trim() 
      : block.split('\n')[0].replace(/^[-*•#\d.)\s]+/, '').trim();
    
    if (!titulo || titulo.length < 3) continue;
    
    // Extract other fields
    const descricaoMatch = block.match(/(?:Descri[çc][aã]o|Briefing|Conceito)[:\s]+([^\n]+(?:\n(?![A-Z][a-z]*:)[^\n]+)*)/i);
    const objetivoMatch = block.match(/(?:Objetivo|Meta|Prop[óo]sito)[:\s]+([^\n]+)/i);
    const formatoMatch = block.match(/(?:Formato|Tipo|Modelo)[:\s]+([^\n]+)/i);
    const elementosMatch = block.match(/(?:Elementos|Visual|Composi[çc][aã]o)[:\s]+([^\n]+(?:\n(?![A-Z][a-z]*:)[^\n]+)*)/i);
    const legendaMatch = block.match(/(?:Legenda|Caption|Copy)[:\s]+([^\n]+(?:\n(?![A-Z][a-z]*:)[^\n]+)*)/i);
    const hashtagsMatch = block.match(/(?:Hashtags?|Tags)[:\s]+([^\n]+)/i);
    
    // Build description from block if not explicitly found
    let descricao = descricaoMatch ? descricaoMatch[1].trim() : '';
    if (!descricao) {
      const lines = block.split('\n').slice(1).filter(l => l.trim() && !l.match(/^[A-Z][a-z]+:/));
      descricao = lines.slice(0, 3).join(' ').trim();
    }
    
    ideas.push({
      id: `idea-${i}-${Date.now()}`,
      titulo,
      descricao: descricao || titulo,
      tipo: formatoMatch ? formatoMatch[1].trim() : undefined,
      objetivo: objetivoMatch ? objetivoMatch[1].trim() : undefined,
      formato: formatoMatch ? formatoMatch[1].trim() : undefined,
      elementos: elementosMatch ? elementosMatch[1].trim() : undefined,
      legenda: legendaMatch ? legendaMatch[1].trim() : undefined,
      hashtags: hashtagsMatch ? hashtagsMatch[1].trim() : undefined,
    });
  }
  
  // Fallback: parse numbered lists or bullet points
  if (ideas.length === 0) {
    const listItems = content.match(/(?:^|\n)(?:\d+[.)]\s*|\-\s*|\*\s*|\•\s*)([^\n]{10,})/g) || [];
    
    listItems.forEach((item, i) => {
      const titulo = item.replace(/^[\n\s\d.)•*-]+/, '').trim();
      if (titulo.length > 5) {
        ideas.push({
          id: `idea-fallback-${i}-${Date.now()}`,
          titulo: titulo.substring(0, 100),
          descricao: titulo,
        });
      }
    });
  }
  
  return ideas.slice(0, 20); // Limit to 20 ideas
}
