import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PortalAIButtonProps {
  questionId: string;
  questionText: string;
  frameworkName: string;
  clientContext: {
    name: string;
    business_description?: string | null;
    business_segment?: string | null;
    target_audience?: string | null;
  };
  onSuggestionGenerated: (text: string) => void;
  disabled?: boolean;
}

export function PortalAIButton({
  questionId,
  questionText,
  frameworkName,
  clientContext,
  onSuggestionGenerated,
  disabled = false,
}: PortalAIButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestion = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consulting-portal-ai', {
        body: {
          question_id: questionId,
          question_text: questionText,
          framework_name: frameworkName,
          client_context: clientContext,
        },
      });

      if (error) throw error;

      if (data?.suggestion) {
        onSuggestionGenerated(data.suggestion);
        toast.success('Sugestão gerada com sucesso!');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error generating suggestion:', error);
      
      // Handle specific errors
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Muitas solicitações. Aguarde um momento e tente novamente.');
      } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
        toast.error('Serviço temporariamente indisponível.');
      } else {
        toast.error('Erro ao gerar sugestão. Tente novamente.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateSuggestion}
            disabled={disabled || isGenerating}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Sugerir com IA
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Gerar uma sugestão de resposta com Inteligência Artificial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
