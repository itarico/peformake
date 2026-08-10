import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Video, ChevronDown, Check, MessageSquare, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { parseContent, cleanAIText, HighlightBlock } from './ContentFormatter';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Script {
  id: string;
  content: string;
}

interface VideoScriptsSectionProps {
  scripts: Script[];
  clientId: string;
}

export function VideoScriptsSection({ scripts, clientId }: VideoScriptsSectionProps) {
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  const approveMutation = useMutation({
    mutationFn: async ({ approved }: { approved: boolean }) => {
      await supabase.from('notifications').insert({
        client_id: clientId,
        title: approved ? 'Roteiro aprovado pelo cliente' : 'Roteiro com feedback',
        message: feedback || (approved ? 'Cliente aprovou o roteiro' : 'Cliente enviou feedback'),
        type: 'script_approval',
      });
    },
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'Roteiro aprovado!' : 'Feedback enviado!');
      setIsDialogOpen(false);
      setSelectedScript(null);
      setFeedback('');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  if (!scripts.length) return null;

  return (
    <>
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Roteiros de Vídeo (Produtora)
          </CardTitle>
          <CardDescription>
            Roteiros prontos para gravação pela produtora. Aprove ou envie feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scripts.map((script, index) => {
            const parsed = parseContent(script.content);
            const fullText = [
              parsed.titulo,
              parsed.gancho,
              parsed.desenvolvimento,
              parsed.cta,
            ].filter(Boolean).join('\n\n');

            return (
              <Card key={script.id} className="bg-muted/30">
                <Collapsible>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                        Roteiro {index + 1}
                      </Badge>
                      <span className="font-medium text-sm">
                        {cleanAIText(parsed.titulo || 'Roteiro de Vídeo')}
                      </span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 space-y-3">
                    {parsed.estruturaUsada && (
                      <Badge variant="secondary" className="mb-2">{parsed.estruturaUsada}</Badge>
                    )}
                    
                    {parsed.gancho && (
                      <HighlightBlock label="Gancho (0-3s)" content={parsed.gancho} variant="warning" />
                    )}
                    
                    {parsed.desenvolvimento && (
                      <HighlightBlock label="Desenvolvimento" content={parsed.desenvolvimento} variant="info" />
                    )}
                    
                    {parsed.cta && (
                      <HighlightBlock label="CTA Final" content={parsed.cta} variant="success" />
                    )}
                    
                    {parsed.dicasGravacao && (
                      <HighlightBlock label="Dicas de Gravação" content={parsed.dicasGravacao} variant="neutral" />
                    )}
                    
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => handleCopy(fullText)}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setSelectedScript(script);
                          setFeedback('');
                          setIsDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Feedback
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSelectedScript(script);
                          setFeedback('');
                          setIsDialogOpen(true);
                        }}
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Roteiro</DialogTitle>
            <DialogDescription>
              Deseja aprovar este roteiro ou enviar um feedback para ajustes?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Adicione observações ou feedback (opcional para aprovação)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!feedback.trim()) {
                  toast.error('Adicione um feedback antes de enviar');
                  return;
                }
                approveMutation.mutate({ approved: false });
              }}
              disabled={approveMutation.isPending}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar Feedback
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ approved: true })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
