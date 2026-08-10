import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, FileText, History } from 'lucide-react';
import { useAudiovisual } from './AudiovisualContext';
import { EditableScriptCard } from './EditableScriptCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ScriptGeneratorProps {
  instanceId: string;
  disabled?: boolean;
  clientName?: string;
}

export function ScriptGenerator({ instanceId, disabled, clientName }: ScriptGeneratorProps) {
  const { parameters, strategicContext, scripts, addScriptAndSave, updateScript, removeScript, approvedScriptIds, toggleScriptApproval } = useAudiovisual();
  const [numScripts, setNumScripts] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!parameters.tema) {
      toast.error('Defina um tema antes de gerar roteiros');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('consulting-audiovisual-scripts', {
        body: {
          instance_id: instanceId,
          num_scripts: numScripts,
          parameters,
          context: strategicContext,
        },
      });

      if (error) throw new Error(error.message || 'Erro na chamada da função');
      if (!data) throw new Error('Resposta vazia do servidor');

      if (data.aiProvider === 'openrouter') {
        toast.info('Usando FreeFlow LLM');
      }

      if (data?.scripts && Array.isArray(data.scripts)) {
        const newIds: string[] = [];
        for (const script of data.scripts) {
          const id = crypto.randomUUID();
          newIds.push(id);
          addScriptAndSave({
            id,
            ...script,
            createdAt: new Date(),
            source: 'generator',
          });
        }
        setGeneratedIds(prev => [...newIds, ...prev]);
        toast.success(`${data.scripts.length} roteiros gerados!`);
      }
    } catch (error) {
      console.error('Error generating scripts:', error);
      toast.error('Erro ao gerar roteiros. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const displayScripts = scripts.filter(s => generatedIds.includes(s.id));

  const handleSendToHistory = async (script: typeof scripts[0]) => {
    try {
      await addScriptAndSave(script);
      toast.success('Roteiro enviado para o histórico!');
    } catch {
      toast.error('Erro ao enviar para histórico');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Geração em Lote
        </CardTitle>
        <CardDescription>
          Gere múltiplos roteiros de uma vez. Edite e aprove os melhores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quantidade:</span>
            <Input
              type="number" min={1} max={10} value={numScripts}
              onChange={(e) => setNumScripts(parseInt(e.target.value) || 1)}
              className="w-20" disabled={disabled || isGenerating}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={disabled || isGenerating || !parameters.tema}
            className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-purple-600"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando {numScripts} Roteiros...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Gerar Roteiros</>
            )}
          </Button>
        </div>

        {/* Parameters summary */}
        {parameters.tema && (
          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
            <p className="text-sm font-medium">Parâmetros atuais:</p>
            <div className="flex flex-wrap gap-1.5">
              {parameters.tema && <Badge variant="outline">Tema definido</Badge>}
              {parameters.objetivo && <Badge variant="secondary">{parameters.objetivo}</Badge>}
              {parameters.canal && <Badge variant="secondary">{parameters.canal}</Badge>}
              {parameters.duracao && <Badge variant="secondary">{parameters.duracao}</Badge>}
              {parameters.estruturaNarrativa && <Badge variant="secondary">{parameters.estruturaNarrativa}</Badge>}
            </div>
          </div>
        )}

        {/* Generated scripts with editable cards */}
        {displayScripts.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="font-medium">{displayScripts.length} Roteiros Gerados</p>
            </div>
            {displayScripts.map((script, index) => (
              <div key={script.id} className="space-y-2">
                <EditableScriptCard
                  script={script}
                  index={index}
                  isApproved={approvedScriptIds.has(script.id)}
                  onToggleApproval={toggleScriptApproval}
                  onUpdate={updateScript}
                  onRemove={removeScript}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => handleSendToHistory(script)}
                >
                  <History className="h-3.5 w-3.5" />
                  Enviar para Histórico
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
