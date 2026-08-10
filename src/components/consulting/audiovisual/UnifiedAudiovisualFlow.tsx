import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudiovisual } from './AudiovisualContext';
import { WeeklyTrendsPanel } from './WeeklyTrendsPanel';
import { WizardParametersPhase } from './WizardParametersPhase';
import { AIScriptwriterChat } from './AIScriptwriterChat';
import { ScriptGenerator } from './ScriptGenerator';
import { ScriptHistory } from './ScriptHistory';
import { EditableScriptCard } from './EditableScriptCard';
import { buildScriptPdfHtml } from './formatUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Video, TrendingUp, SlidersHorizontal, Sparkles,
  ArrowRight, ArrowLeft, Check, Download, Loader2,
  FileText, CheckCircle2, History, Brain, Lightbulb, Zap,
} from 'lucide-react';

const PHASES = [
  { id: 'tema', label: 'Definir', icon: Video, description: 'Tema do vídeo' },
  { id: 'tendencias', label: 'Tendências', icon: TrendingUp, description: 'Pesquisar mercado' },
  { id: 'parametros', label: 'Parâmetros', icon: SlidersHorizontal, description: 'Configurar roteiro' },
  { id: 'criar', label: 'Criar', icon: Sparkles, description: 'Gerar roteiros' },
];

interface UnifiedAudiovisualFlowProps {
  instanceId: string;
  monthId: string;
  disabled?: boolean;
  clientName?: string;
}

export function UnifiedAudiovisualFlow({ instanceId, monthId, disabled, clientName }: UnifiedAudiovisualFlowProps) {
  const { parameters, setParameter, scripts, approvedScriptIds, toggleScriptApproval, updateScript, removeScript, suggestThemes, quickGenerate } = useAudiovisual();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isSuggestingThemes, setIsSuggestingThemes] = useState(false);
  const [themeSuggestions, setThemeSuggestions] = useState<Array<{ titulo: string; descricao: string }>>([]);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [activeView, setActiveView] = useState<'flow' | 'history'>('flow');

  const canAdvanceFrom = (phase: number) => {
    if (phase === 0) return !!parameters.tema?.trim();
    return true;
  };

  const goNext = () => { if (currentPhase < PHASES.length - 1 && canAdvanceFrom(currentPhase)) setCurrentPhase(currentPhase + 1); };
  const goBack = () => { if (currentPhase > 0) setCurrentPhase(currentPhase - 1); };

  const approvedCount = scripts.filter(s => approvedScriptIds.has(s.id)).length;
  const approvedScripts = scripts.filter(s => approvedScriptIds.has(s.id));

  const handleExportPDF = async () => {
    if (approvedCount === 0) { toast.error('Aprove pelo menos um roteiro'); return; }
    setIsExporting(true);
    try {
      const html = buildScriptPdfHtml(approvedScripts, clientName);
      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set({ margin: [10, 10, 15, 10], filename: `Roteiro Completo - ${clientName || 'Cliente'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css'], avoid: ['div'] } } as any).from(element).save();
      document.body.removeChild(element);
      toast.success(`PDF com ${approvedCount} roteiro(s) exportado!`);
    } catch (error) { console.error('PDF error:', error); toast.error('Erro ao gerar PDF'); }
    finally { setIsExporting(false); }
  };

  const handleSuggestThemes = async () => {
    setIsSuggestingThemes(true);
    try {
      const suggestions = await suggestThemes();
      setThemeSuggestions(suggestions);
      if (suggestions.length === 0) toast.info('Não foi possível gerar sugestões');
    } catch { toast.error('Erro ao sugerir temas'); }
    finally { setIsSuggestingThemes(false); }
  };

  const handleQuickGenerate = async () => {
    if (!parameters.tema?.trim()) { toast.error('Defina um tema primeiro'); return; }
    setIsQuickGenerating(true);
    try {
      const script = await quickGenerate();
      if (script) toast.success('Roteiro rápido gerado!');
      else toast.error('Não foi possível gerar');
    } catch { toast.error('Erro ao gerar roteiro rápido'); }
    finally { setIsQuickGenerating(false); }
  };

  return (
    <div className="space-y-4">
      {/* Top-level view toggle: Flow vs History */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg">
        <Button
          variant={activeView === 'flow' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => setActiveView('flow')}
        >
          <Sparkles className="h-4 w-4" />
          Criar Roteiros
        </Button>
        <Button
          variant={activeView === 'history' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => setActiveView('history')}
        >
          <History className="h-4 w-4" />
          Histórico
        </Button>
      </div>

      {/* History View */}
      {activeView === 'history' && (
        <ScriptHistory instanceId={instanceId} monthId={monthId} clientName={clientName} />
      )}

      {/* Flow View */}
      {activeView === 'flow' && (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-1 p-3 bg-muted/30 rounded-xl overflow-x-auto">
            {PHASES.map((phase, i) => {
              const Icon = phase.icon;
              const isActive = i === currentPhase;
              const isCompleted = i < currentPhase;
              const isClickable = i <= currentPhase + 1 && (i <= currentPhase || canAdvanceFrom(i - 1));
              return (
                <div key={phase.id} className="flex items-center">
                  <button onClick={() => isClickable && setCurrentPhase(i)} disabled={!isClickable} className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap",
                    isActive && "bg-primary text-primary-foreground shadow-sm",
                    isCompleted && "bg-primary/15 text-primary hover:bg-primary/25",
                    !isActive && !isCompleted && isClickable && "hover:bg-muted text-muted-foreground",
                    !isClickable && "opacity-40 cursor-not-allowed text-muted-foreground",
                  )}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0", isActive && "bg-primary-foreground text-primary", isCompleted && "bg-primary text-primary-foreground", !isActive && !isCompleted && "bg-muted-foreground/20")}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{phase.label}</span>
                  </button>
                  {i < PHASES.length - 1 && <div className={cn("w-6 h-0.5 mx-0.5 shrink-0", i < currentPhase ? "bg-primary/40" : "bg-border")} />}
                </div>
              );
            })}
          </div>

          {/* Phase 0: Define Theme */}
          {currentPhase === 0 && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="p-3 bg-primary/10 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                    <Video className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Sobre o que será o vídeo?</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Descreva o tema ou clique em "Sugerir Temas" para a IA sugerir baseado no contexto do cliente.
                  </p>
                </div>

                <Textarea value={parameters.tema} onChange={(e) => setParameter('tema', e.target.value)} placeholder="Ex: Lançamento do novo curso de marketing digital..." className="min-h-[120px] text-base" disabled={disabled} />

                {/* Theme suggestions */}
                <div className="space-y-3">
                  <Button variant="outline" onClick={handleSuggestThemes} disabled={isSuggestingThemes || disabled} className="gap-2 w-full">
                    {isSuggestingThemes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                    Sugerir Temas com IA
                  </Button>

                  {themeSuggestions.length > 0 && (
                    <div className="grid gap-2">
                      {themeSuggestions.map((s, i) => (
                        <button key={i} onClick={() => { setParameter('tema', s.titulo); setThemeSuggestions([]); toast.success('Tema selecionado!'); }}
                          className="text-left p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/60 hover:border-primary/30 transition-all">
                          <p className="text-sm font-medium">{s.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.descricao}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={goNext} disabled={!canAdvanceFrom(0)} size="lg" className="gap-2">
                    Pesquisar Tendências <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 1: Trends */}
          {currentPhase === 1 && (
            <div className="space-y-4">
              <WeeklyTrendsPanel disabled={disabled} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={goNext} className="gap-2">Configurar Parâmetros <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Phase 2: Parameters */}
          {currentPhase === 2 && (
            <div className="space-y-4">
              <WizardParametersPhase disabled={disabled} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={goNext} className="gap-2 bg-gradient-to-r from-primary to-purple-600">
                  <Sparkles className="h-4 w-4" /> Criar Roteiros
                </Button>
              </div>
            </div>
          )}

          {/* Phase 3: Create */}
          {currentPhase === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <Button variant="outline" onClick={goBack} size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Parâmetros
                </Button>
                <Button onClick={handleQuickGenerate} disabled={isQuickGenerating || disabled} size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
                  {isQuickGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Roteiro Rápido
                </Button>
              </div>

              <Tabs defaultValue="chat">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat" className="gap-1.5"><Brain className="h-4 w-4" /><span className="hidden sm:inline">Chat IA</span></TabsTrigger>
                  <TabsTrigger value="batch" className="gap-1.5"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Gerar em Lote</span></TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="mt-4"><AIScriptwriterChat disabled={disabled} clientName={clientName} /></TabsContent>
                <TabsContent value="batch" className="mt-4"><ScriptGenerator instanceId={instanceId} disabled={disabled} clientName={clientName} /></TabsContent>
              </Tabs>
            </div>
          )}

          {/* Approved Scripts Panel */}
          {scripts.length > 0 && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{approvedCount} de {scripts.length} roteiros aprovados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Gerenciar</Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-xl">
                        <SheetHeader><SheetTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Gerenciar Roteiros ({scripts.length})</SheetTitle></SheetHeader>
                        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-3">
                          <div className="space-y-3">
                            {scripts.map((script, index) => (
                              <EditableScriptCard key={script.id} script={script} index={index} isApproved={approvedScriptIds.has(script.id)} onToggleApproval={toggleScriptApproval} onUpdate={updateScript} onRemove={removeScript} />
                            ))}
                          </div>
                        </ScrollArea>
                      </SheetContent>
                    </Sheet>
                    <Button size="sm" onClick={handleExportPDF} disabled={isExporting || approvedCount === 0} className="gap-1.5">
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      PDF ({approvedCount})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
