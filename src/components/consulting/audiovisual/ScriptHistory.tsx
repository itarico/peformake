import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  History, FileText, Trash2, Download, Loader2,
  CheckCircle2, PenLine, ChevronDown,
  Mic, Camera, Film, ChevronsUpDown, BarChart3,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAudiovisual, GeneratedScript } from './AudiovisualContext';
import { EditableScriptCard } from './EditableScriptCard';
import { ManualScriptForm } from './ManualScriptForm';
import { buildScriptPdfHtml, buildSegmentedPdfHtml } from './formatUtils';
import { normalizeScriptData } from './scriptParser';

interface ScriptHistoryProps { instanceId: string; monthId: string; clientName?: string; }

interface SavedScript { id: string; content: string; generated_at: string; model_used: string | null; analysis_scope: string; }

export function ScriptHistory({ instanceId, monthId, clientName }: ScriptHistoryProps) {
  const queryClient = useQueryClient();
  const { addScriptAndSave, analyzeHistory, historyAnalysis } = useAudiovisual();
  const [historyApproved, setHistoryApproved] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [expandAll, setExpandAll] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [excludeExtras, setExcludeExtras] = useState(false);

  const { data: savedScripts, isLoading } = useQuery({
    queryKey: ['script-history', monthId],
    queryFn: async () => {
      const { data: instances } = await supabase.from('framework_instances').select('id').eq('consulting_month_id', monthId);
      if (!instances?.length) return [];
      const { data, error } = await supabase.from('ai_analyses').select('id, content, generated_at, model_used, analysis_scope')
        .in('instance_id', instances.map(i => i.id)).eq('analysis_type', 'roteiro_audiovisual').order('generated_at', { ascending: false });
      if (error) throw error;
      return data as SavedScript[];
    },
  });

  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId: string) => { const { error } = await supabase.from('ai_analyses').delete().eq('id', scriptId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['script-history'] }); toast.success('Roteiro excluído'); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleClearAllHistory = async () => {
    if (!savedScripts?.length) return;
    try {
      const ids = savedScripts.map(s => s.id);
      const { error } = await supabase.from('ai_analyses').delete().in('id', ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['script-history'] });
      setHistoryApproved(new Set());
      toast.success('Histórico limpo!');
    } catch { toast.error('Erro ao limpar histórico'); }
  };

  const toggleHistoryApproval = (id: string) => {
    setHistoryApproved(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const parseScript = (content: string, fallbackTitle?: string): GeneratedScript | null => {
    try {
      const parsed = JSON.parse(content);
      const normalized = normalizeScriptData(parsed, { clientName });
      return {
        id: parsed.id || crypto.randomUUID(),
        titulo: normalized.titulo || fallbackTitle || 'Roteiro',
        gancho: normalized.gancho || '',
        desenvolvimento: normalized.desenvolvimento || '',
        cta: normalized.cta || '',
        legendaSugerida: normalized.legendaSugerida || '',
        dicasGravacao: normalized.dicasGravacao || '',
        observacoesEstrategicas: normalized.observacoesEstrategicas || '',
        justificativa: parsed.justificativa || '',
        estruturaUsada: normalized.estruturaUsada || '',
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
        rawText: normalized.rawText,
        source: parsed.source,
      };
    } catch {
      const normalized = normalizeScriptData({ rawText: content }, { clientName });
      if (!normalized.rawText) return null;
      return {
        id: crypto.randomUUID(),
        titulo: normalized.titulo || fallbackTitle || 'Roteiro',
        gancho: normalized.gancho || '',
        desenvolvimento: normalized.desenvolvimento || '',
        cta: normalized.cta || '',
        legendaSugerida: normalized.legendaSugerida || '',
        dicasGravacao: normalized.dicasGravacao || '',
        observacoesEstrategicas: normalized.observacoesEstrategicas || '',
        justificativa: '',
        estruturaUsada: normalized.estruturaUsada || '',
        createdAt: new Date(),
        rawText: normalized.rawText,
      };
    }
  };

  const approvedHistoryScripts = (savedScripts || []).filter(s => historyApproved.has(s.id));
  const approvedCount = approvedHistoryScripts.length;
  
  const getExportScripts = () => {
    const scripts = approvedHistoryScripts
      .map((s, i) => parseScript(s.content, `Roteiro ${i + 1}`))
      .filter(Boolean) as GeneratedScript[];

    return scripts.map((s) => ({
      ...s,
      legendaSugerida: excludeExtras ? '' : s.legendaSugerida,
      dicasGravacao: excludeExtras ? '' : s.dicasGravacao,
      observacoesEstrategicas: excludeExtras ? '' : s.observacoesEstrategicas,
      rawText: '',
    }));
  };

  const exportPdf = async (type: 'completo' | 'narracao' | 'captacao' | 'edicao') => {
    if (approvedCount === 0) { toast.error('Selecione pelo menos um roteiro'); return; }
    setIsExporting(true);
    try {
      const scripts = getExportScripts();
      const html = type === 'completo' ? buildScriptPdfHtml(scripts, clientName) : buildSegmentedPdfHtml(scripts, type, clientName);
      const { exportHtmlToPdf } = await import('@/lib/pdfUtils');
      const label = type === 'completo' ? 'Roteiro Completo' : type === 'narracao' ? 'Narração' : type === 'captacao' ? 'Captação' : 'Edição';
      const filename = `${label} - ${clientName || 'Cliente'}.pdf`;
      await exportHtmlToPdf(html, filename);
      toast.success(`PDF exportado!`);
    } catch { toast.error('Erro ao gerar PDF'); }
    finally { setIsExporting(false); }
  };

  const handleSelectAll = () => {
    if (!savedScripts) return;
    if (historyApproved.size === savedScripts.length) setHistoryApproved(new Set());
    else setHistoryApproved(new Set(savedScripts.map(s => s.id)));
  };

  const handleSaveManual = async (data: { titulo: string; gancho: string; desenvolvimento: string; cta: string; legendaSugerida: string; dicasGravacao: string; observacoesEstrategicas: string; }) => {
    const script: GeneratedScript = { id: crypto.randomUUID(), ...data, justificativa: '', estruturaUsada: '', createdAt: new Date(), source: 'manual' };
    await addScriptAndSave(script);
    queryClient.invalidateQueries({ queryKey: ['script-history'] });
    setShowManualForm(false);
    toast.success('Roteiro manual salvo no histórico!');
  };

  const handleUpdateInDb = (id: string, updates: Partial<GeneratedScript>) => {
    const saved = savedScripts?.find(s => s.id === id);
    if (!saved) return;
    const parsed = parseScript(saved.content);
    if (!parsed) return;
    supabase.from('ai_analyses').update({ content: JSON.stringify({ ...parsed, ...updates }) }).eq('id', id).then(({ error }) => {
      if (error) { toast.error('Erro ao salvar'); return; }
      queryClient.invalidateQueries({ queryKey: ['script-history'] });
      toast.success('Salvo!');
    });
  };

  const handleAnalyze = async () => {
    if (!savedScripts?.length) { toast.info('Nenhum roteiro para analisar'); return; }
    setIsAnalyzing(true);
    try {
      const historyText = savedScripts.map(s => {
        const parsed = parseScript(s.content);
        return parsed ? `Título: ${parsed.titulo}\nGancho: ${parsed.gancho}\nEstrutura: ${parsed.estruturaUsada}\nFonte: ${s.analysis_scope}` : '';
      }).filter(Boolean).join('\n---\n');
      await analyzeHistory(historyText);
      setShowAnalysis(true);
      toast.success('Análise concluída!');
    } catch { toast.error('Erro ao analisar'); }
    finally { setIsAnalyzing(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-primary" />Roteiros Aprovados</CardTitle>
            <CardDescription>{savedScripts?.length || 0} roteiros · {approvedCount} selecionados para PDF</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowManualForm(!showManualForm)} className="gap-1.5">
              <PenLine className="h-3.5 w-3.5" />{showManualForm ? 'Fechar' : '+ Manual'}
            </Button>
            {(savedScripts?.length ?? 0) > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Limpar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá permanentemente todos os {savedScripts?.length} roteiros salvos. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {(savedScripts?.length ?? 0) > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="gap-1.5">
                  {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                  Analisar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExpandAll(!expandAll)} className="gap-1.5">
                  <ChevronsUpDown className="h-3.5 w-3.5" />{expandAll ? 'Colapsar' : 'Expandir'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />{historyApproved.size === (savedScripts?.length ?? 0) ? 'Desmarcar' : 'Selecionar Todos'}
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* PDF Export bar */}
        {approvedCount > 0 && (
          <div className="flex items-center gap-3 pt-3 mt-3 border-t flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={excludeExtras} onCheckedChange={setExcludeExtras} className="scale-75" />
              <span className="text-xs text-muted-foreground font-medium">Sem legenda/dicas no PDF</span>
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isExporting} className="gap-1.5">
                  {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Exportar PDF ({approvedCount})<ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPdf('completo')} className="gap-2"><FileText className="h-4 w-4" /> PDF Completo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf('narracao')} className="gap-2"><Mic className="h-4 w-4" /> Narração</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf('captacao')} className="gap-2"><Camera className="h-4 w-4" /> Captação</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf('edicao')} className="gap-2"><Film className="h-4 w-4" /> Edição</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Analysis panel */}
        {showAnalysis && historyAnalysis && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Análise de Performance</p>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)} className="h-7 text-xs">Fechar</Button>
            </div>
            <div className="text-sm whitespace-pre-wrap text-muted-foreground">{historyAnalysis}</div>
          </div>
        )}

        {showManualForm && <ManualScriptForm onSave={handleSaveManual} onCancel={() => setShowManualForm(false)} />}

        {!savedScripts?.length && !showManualForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum roteiro salvo ainda</p>
            <p className="text-sm">Gere roteiros no Chat IA, aprove-os e eles aparecerão aqui</p>
          </div>
        ) : (
          savedScripts?.map((script, index) => {
            const parsed = parseScript(script.content, `Roteiro ${index + 1}`);
            if (!parsed) return null;
            const isApproved = historyApproved.has(script.id);
            const sourceLabel = script.analysis_scope === 'chat' ? 'Chat IA' : script.analysis_scope === 'manual' ? 'Manual' : script.analysis_scope === 'generator' ? 'Lote' : 'Roteiro';
            return (
              <div key={script.id} className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="outline" className="text-[10px]">{formatDate(script.generated_at)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{sourceLabel}</Badge>
                </div>
                <EditableScriptCard
                  script={{ ...parsed, id: script.id, createdAt: new Date(script.generated_at), source: (script.analysis_scope as GeneratedScript['source']) || undefined }}
                  index={index} isApproved={isApproved} onToggleApproval={toggleHistoryApproval}
                  onUpdate={handleUpdateInDb} onRemove={(id) => deleteScriptMutation.mutate(id)} defaultExpanded={expandAll}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}