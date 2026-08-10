import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeScriptData } from './scriptParser';
import { toast } from 'sonner';

export interface VideoParameters {
  tema: string;
  objetivo: string;
  publicoAlvo: string;
  estagioFunil: string;
  canal: string;
  duracao: string;
  tomEmocional: string;
  estrategiasPersuasivas: string;
  estruturaNarrativa: string;
  cta: string;
}

export interface GeneratedScript {
  id: string;
  titulo: string;
  gancho: string;
  desenvolvimento: string;
  cta: string;
  legendaSugerida: string;
  dicasGravacao: string;
  observacoesEstrategicas: string;
  justificativa: string;
  estruturaUsada: string;
  createdAt: Date;
  rawText?: string;
  source?: 'generator' | 'chat' | 'manual';
}

export interface AudiovisualContextType {
  instanceId: string;
  strategicContext: string;
  isLoadingContext: boolean;
  parameters: VideoParameters;
  setParameter: (key: keyof VideoParameters, value: string) => void;
  scripts: GeneratedScript[];
  addScript: (script: GeneratedScript) => void;
  addScriptAndSave: (script: GeneratedScript) => void;
  updateScript: (id: string, updates: Partial<GeneratedScript>) => void;
  removeScript: (id: string) => void;
  approvedScriptIds: Set<string>;
  toggleScriptApproval: (id: string) => void;
  loadClientContext: (clientId: string, monthId: string) => Promise<void>;
  generateWithAI: (field: string, prompt: string) => Promise<string>;
  searchWithFirecrawl: (query: string) => Promise<string>;
  autoDecide: (field: string, context: string) => Promise<string>;
  batchFillParams: () => Promise<void>;
  quickGenerate: () => Promise<GeneratedScript | null>;
  generateVariation: (script: GeneratedScript) => Promise<GeneratedScript | null>;
  suggestThemes: (scriptHistory?: string) => Promise<Array<{ titulo: string; descricao: string }>>;
  analyzeHistory: (scriptHistory: string) => Promise<string>;
  historyAnalysis: string;
}

const AudiovisualContext = createContext<AudiovisualContextType | null>(null);

export function useAudiovisual() {
  const context = useContext(AudiovisualContext);
  if (!context) throw new Error('useAudiovisual must be used within AudiovisualProvider');
  return context;
}

interface AudiovisualProviderProps {
  children: ReactNode;
  clientId: string;
  monthId: string;
  instanceId: string;
}

function parseScriptFromResult(text: string): GeneratedScript | null {
  const parts = text.split('===ROTEIRO===');
  const scriptPart = parts[1]?.split('===FIM_ROTEIRO===');
  const scriptText = scriptPart?.[0]?.trim();
  if (!scriptText) return null;

  const parsed = normalizeScriptData({ rawText: scriptText });

  return {
    id: crypto.randomUUID(),
    titulo: parsed.titulo || 'Roteiro',
    gancho: parsed.gancho || '',
    desenvolvimento: parsed.desenvolvimento || '',
    cta: parsed.cta || '',
    legendaSugerida: parsed.legendaSugerida || '',
    dicasGravacao: parsed.dicasGravacao || '',
    observacoesEstrategicas: parsed.observacoesEstrategicas || '',
    justificativa: '',
    estruturaUsada: parsed.estruturaUsada || '',
    createdAt: new Date(),
    rawText: parsed.rawText,
    source: 'generator',
  };
}

export function AudiovisualProvider({ children, clientId, monthId, instanceId }: AudiovisualProviderProps) {
  const [strategicContext, setStrategicContext] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [approvedScriptIds, setApprovedScriptIds] = useState<Set<string>>(new Set());
  const [historyAnalysis, setHistoryAnalysis] = useState('');
  const [parameters, setParameters] = useState<VideoParameters>({
    tema: '', objetivo: '', publicoAlvo: '', estagioFunil: '',
    canal: '', duracao: '', tomEmocional: '', estrategiasPersuasivas: '',
    estruturaNarrativa: '', cta: '',
  });

  const setParameter = useCallback((key: keyof VideoParameters, value: string) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  }, []);

  const addScript = useCallback((script: GeneratedScript) => {
    setScripts(prev => {
      if (prev.some(s => s.id === script.id)) return prev;
      return [script, ...prev];
    });
  }, []);

  const addScriptAndSave = useCallback(async (script: GeneratedScript) => {
    setScripts(prev => {
      if (prev.some(s => s.id === script.id)) return prev;
      return [script, ...prev];
    });
    try {
      const scriptData = { ...script, createdAt: undefined };
      await supabase.from('ai_analyses').insert({
        instance_id: instanceId,
        analysis_type: 'roteiro_audiovisual',
        analysis_scope: script.source || 'chat',
        content: JSON.stringify(scriptData),
        model_used: 'google/gemini-2.5-pro',
      });
    } catch (error) {
      console.error('Error saving script to DB:', error);
    }
  }, [instanceId]);

  const updateScript = useCallback((id: string, updates: Partial<GeneratedScript>) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeScript = useCallback((id: string) => {
    setScripts(prev => prev.filter(s => s.id !== id));
    setApprovedScriptIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const toggleScriptApproval = useCallback(async (id: string) => {
    const isCurrentlyApproved = approvedScriptIds.has(id);
    setApprovedScriptIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    
    // When approving, save to DB (history)
    if (!isCurrentlyApproved) {
      const script = scripts.find(s => s.id === id);
      if (script) {
        try {
          const scriptData = { ...script, createdAt: undefined };
          // Check if already saved in DB
          const { data: existing } = await supabase.from('ai_analyses')
            .select('id').eq('id', id).maybeSingle();
          if (!existing) {
            await supabase.from('ai_analyses').insert({
              instance_id: instanceId,
              analysis_type: 'roteiro_audiovisual',
              analysis_scope: script.source || 'chat',
              content: JSON.stringify(scriptData),
              model_used: 'google/gemini-2.5-pro',
            });
            toast.success('Roteiro aprovado e salvo no histórico!');
          }
        } catch (error) {
          console.error('Error saving approved script:', error);
        }
      }
    }
  }, [approvedScriptIds, scripts, instanceId]);

  const loadClientContext = useCallback(async (cId: string, mId: string) => {
    setIsLoadingContext(true);
    try {
      const [clientRes, instancesRes, strategicRes, analysesRes, productsRes, seasonalityRes, monthRes, researchRes, prevScriptsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', cId).single(),
        supabase.from('framework_instances').select(`id, status, framework:frameworks(name, slug, objective), answers:framework_answers(question:framework_questions(question_text), answer_text)`).eq('consulting_month_id', mId),
        supabase.from('client_strategic_data').select('*').eq('client_id', cId),
        supabase.from('content_analyses').select('*').eq('consulting_month_id', mId),
        supabase.from('client_products').select('*').eq('client_id', cId).eq('is_active', true),
        supabase.from('seasonality_dates').select('*').eq('consulting_month_id', mId).order('date'),
        supabase.from('consulting_months').select('monthly_focus, notes').eq('id', mId).single(),
        supabase.from('firecrawl_research_data').select('title, content, source_type').eq('consulting_month_id', mId).order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_analyses').select('*').eq('instance_id', instanceId).order('generated_at', { ascending: false }).limit(5),
      ]);

      let context = '=== CONTEXTO ESTRATÉGICO COMPLETO ===\n\n';
      const client = clientRes.data;
      if (client) {
        context += '--- INFORMAÇÕES DO CLIENTE ---\n';
        context += `Nome: ${client.name}\nSegmento: ${client.business_segment || 'N/A'}\nDescrição: ${client.business_description || 'N/A'}\nPúblico-alvo: ${client.target_audience || 'N/A'}\nConcorrentes: ${client.main_competitors || 'N/A'}\nProposta de valor: ${client.value_proposition || 'N/A'}\n\n`;
      }
      const monthData = monthRes.data;
      if (monthData) {
        context += '--- FOCO DO MÊS ---\n';
        if (monthData.monthly_focus) context += `Foco: ${monthData.monthly_focus}\n`;
        if (monthData.notes) context += `Notas: ${monthData.notes}\n`;
        context += '\n';
      }
      const products = productsRes.data;
      if (products?.length) {
        context += '--- PRODUTOS E SERVIÇOS ---\n';
        for (const p of products) {
          context += `• ${p.name}${p.category ? ` [${p.category}]` : ''}: ${p.description || 'Sem descrição'}`;
          if (p.price) context += ` | R$${p.price}`;
          if (p.features) context += ` | ${p.features}`;
          context += '\n';
        }
        context += '\n';
      }
      const instances = instancesRes.data;
      if (instances?.length) {
        context += '--- FRAMEWORKS ESTRATÉGICOS ---\n';
        for (const inst of instances) {
          const framework = Array.isArray(inst.framework) ? inst.framework[0] : inst.framework;
          const answers = inst.answers as any[];
          if (answers?.some((a: any) => a.answer_text?.trim())) {
            context += `\n[${framework?.name?.toUpperCase()}]\n`;
            for (const ans of answers || []) {
              if (ans.answer_text?.trim()) {
                const question = Array.isArray(ans.question) ? ans.question[0] : ans.question;
                context += `• ${question?.question_text}: ${ans.answer_text}\n`;
              }
            }
          }
        }
        context += '\n';
      }
      const strategicData = strategicRes.data;
      if (strategicData?.length) {
        context += '--- DADOS ESTRATÉGICOS ---\n';
        for (const d of strategicData) context += `• ${d.data_key}: ${d.data_value}\n`;
        context += '\n';
      }
      const seasonality = seasonalityRes.data;
      if (seasonality?.length) {
        context += '--- DATAS E SAZONALIDADE ---\n';
        for (const s of seasonality) context += `• ${s.date} - ${s.title} (${s.importance || 'normal'})${s.notes ? ': ' + s.notes : ''}\n`;
        context += '\n';
      }
      const analyses = analysesRes.data;
      if (analyses?.length) {
        context += '--- ANÁLISES DE CONTEÚDO ---\n';
        for (const a of analyses) context += `[${a.category.toUpperCase()}]\n${a.content.substring(0, 600)}\n\n`;
      }
      const research = researchRes.data;
      if (research?.length) {
        context += '--- PESQUISAS DE MERCADO ---\n';
        for (const r of research) context += `[${r.source_type}] ${r.title || ''}: ${r.content.substring(0, 400)}\n`;
        context += '\n';
      }
      const prevScripts = prevScriptsRes.data;
      if (prevScripts?.length) {
        context += '--- ROTEIROS ANTERIORES ---\n';
        for (const s of prevScripts.slice(0, 3)) context += `[${s.analysis_type}]: ${s.content.substring(0, 300)}...\n`;
      }
      setStrategicContext(context);
    } catch (error) {
      console.error('Error loading context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  }, [instanceId]);

  const generateWithAI = useCallback(async (field: string, prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'generate', field, prompt, context: strategicContext, parameters },
    });
    if (error) throw new Error(error.message);
    if (data?.aiProvider === 'openrouter') toast.info('Usando FreeFlow LLM');
    return data?.result || '';
  }, [strategicContext, parameters]);

  const searchWithFirecrawl = useCallback(async (query: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-research', {
      body: { query, context: strategicContext },
    });
    if (error) throw new Error(error.message);
    return data?.result || '';
  }, [strategicContext]);

  const autoDecide = useCallback(async (field: string, context: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'auto_decide', field, prompt: `Decida o melhor valor para ${field}`, context: strategicContext + '\n' + context, parameters },
    });
    if (error) throw new Error(error.message);
    return data?.result || '';
  }, [strategicContext, parameters]);

  const batchFillParams = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'batch_params', context: strategicContext, parameters },
    });
    if (error) throw new Error(error.message);
    try {
      const jsonStr = (data?.result || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      const keys: (keyof VideoParameters)[] = ['objetivo', 'publicoAlvo', 'estagioFunil', 'canal', 'duracao', 'tomEmocional', 'estrategiasPersuasivas', 'estruturaNarrativa', 'cta'];
      setParameters(prev => {
        const updated = { ...prev };
        for (const key of keys) {
          if (parsed[key] && !prev[key]?.trim()) updated[key] = parsed[key];
        }
        return updated;
      });
    } catch (e) {
      console.error('Failed to parse batch params:', e);
      throw new Error('Erro ao processar resposta da IA');
    }
  }, [strategicContext, parameters]);

  const quickGenerate = useCallback(async (): Promise<GeneratedScript | null> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'quick_script', context: strategicContext, parameters },
    });
    if (error) throw new Error(error.message);
    const script = parseScriptFromResult(data?.result || '');
    if (script) {
      script.source = 'generator';
      await addScriptAndSave(script);
    }
    return script;
  }, [strategicContext, parameters, addScript]);

  const generateVariation = useCallback(async (original: GeneratedScript): Promise<GeneratedScript | null> => {
    const originalText = `Título: ${original.titulo}\nGancho: ${original.gancho}\nDesenvolvimento: ${original.desenvolvimento}\nCTA: ${original.cta}`;
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'generate_variation', context: strategicContext, parameters, originalScript: originalText },
    });
    if (error) throw new Error(error.message);
    const script = parseScriptFromResult(data?.result || '');
    if (script) {
      script.source = 'generator';
      await addScriptAndSave(script);
    }
    return script;
  }, [strategicContext, parameters, addScript]);

  const suggestThemes = useCallback(async (scriptHistory?: string): Promise<Array<{ titulo: string; descricao: string }>> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'suggest_themes', context: strategicContext, parameters, scriptHistory },
    });
    if (error) throw new Error(error.message);
    try {
      const jsonStr = (data?.result || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  }, [strategicContext, parameters]);

  const analyzeHistory = useCallback(async (scriptHistory: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('consulting-audiovisual-ai', {
      body: { action: 'analyze_history', context: strategicContext, parameters, scriptHistory },
    });
    if (error) throw new Error(error.message);
    const result = data?.result || '';
    setHistoryAnalysis(result);
    return result;
  }, [strategicContext, parameters]);

  return (
    <AudiovisualContext.Provider
      value={{
        instanceId, strategicContext, isLoadingContext, parameters, setParameter,
        scripts, addScript, addScriptAndSave, updateScript, removeScript,
        approvedScriptIds, toggleScriptApproval,
        loadClientContext, generateWithAI, searchWithFirecrawl, autoDecide,
        batchFillParams, quickGenerate, generateVariation, suggestThemes, analyzeHistory, historyAnalysis,
      }}
    >
      {children}
    </AudiovisualContext.Provider>
  );
}
