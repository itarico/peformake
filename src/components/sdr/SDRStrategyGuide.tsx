import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  BookOpen, Lightbulb, Target, Workflow, Award, 
  BarChart3, MessageSquare, CheckSquare, ArrowRight, 
  Zap, GraduationCap, CheckCircle2 
} from 'lucide-react';
import SDRScripts from './SDRScripts';

interface Guide {
  id: string;
  title: string;
  category: string;
  content: string;
  display_order: number;
}

const STAGE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  estrategias: {
    label: 'Biblioteca de Vendas (Curso)',
    icon: BookOpen,
    color: 'text-indigo-600',
    description: 'Conhecimento profundo sobre metodologias, gatilhos e a filosofia Peformake.'
  },
  form_preenchido: { 
    label: '1. Primeiro Contato e Conexão', 
    icon: MessageSquare, 
    color: 'text-blue-500',
    description: 'Leads que converteram agora. Foco em velocidade e quebra de gelo.'
  },
  qualificacao: { 
    label: '2. Qualificação Profunda', 
    icon: Award, 
    color: 'text-purple-500',
    description: 'Frameworks SPIN e BANT para separar curiosos de clientes ideais.'
  },
  lead_quente: { 
    label: '3. Objeções e Agendamento', 
    icon: Workflow, 
    color: 'text-green-500',
    description: 'Como contornar travas do cliente e garantir a presença na reunião.'
  },
  lead_frio: { 
    label: '4. Régua de Recuperação', 
    icon: Target, 
    color: 'text-orange-500',
    description: 'Estratégias para reengajar leads que esfriaram no processo.'
  },
};

const formatMarkdown = (text: string) => {
  // Simple markdown rendering: ## headers, **bold**, lists
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-base font-bold mt-3 mb-2">{line.replace('## ', '')}</h3>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="ml-4 text-sm">{renderInline(line.slice(2))}</li>;
    }
    if (line.match(/^\d+\. /)) {
      return <li key={i} className="ml-4 text-sm list-decimal">{renderInline(line.replace(/^\d+\. /, ''))}</li>;
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="text-sm mb-1">{renderInline(line)}</p>;
  });
};

const renderInline = (text: string) => {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
};

const SDRStrategyGuide = ({ mode = 'strategies' }: { mode?: 'strategies' | 'sdr-playbook' }) => {
  const [profile, setProfile] = useState('all');

  const { data: steps = [] } = useQuery({
    queryKey: ['sdr-strategy-steps'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_strategy_steps').select('*').order('created_at');
      return data || [];
    },
  });

  const { data: tactics = [] } = useQuery({
    queryKey: ['sdr-stage-tactics'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_stage_tactics').select('*').order('display_order');
      return data || [];
    },
  });

  const { data: guides = [] } = useQuery({
    queryKey: ['sdr-guides'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_strategy_guides').select('*').eq('is_active', true).order('display_order');
      return (data || []) as Guide[];
    },
  });

  const grouped = guides.reduce((acc: Record<string, Guide[]>, g) => {
    // Determine filters based on mode
    const isEstrategia = g.category === 'estrategias';
    if (mode === 'sdr-playbook' && isEstrategia) return acc;
    if (mode === 'strategies' && !isEstrategia) return acc;
    
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  if (mode === 'strategies') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 border-none text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <GraduationCap className="h-48 w-48 rotate-12" />
              </div>
              <CardContent className="p-8 relative z-10">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4">Módulo de Treinamento</Badge>
                <h2 className="text-3xl font-black mb-2">Escola de Vendas Peformake</h2>
                <p className="text-indigo-100 max-w-xl text-lg leading-relaxed">
                  Torne-se um mestre na arte da persuasão e domine a metodologia que gera milhões em resultados.
                </p>
                <div className="flex items-center gap-6 mt-8">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">12</span>
                    <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Aulas</span>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">4.5h</span>
                    <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Conteúdo</span>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">Certificado</span>
                    <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Incluso</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" /> 
                Trilha de Aprendizado
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {guides.filter(g => g.category === 'estrategias').map((g, idx) => (
                  <Card key={g.id} className="group hover:border-indigo-300 transition-all cursor-pointer overflow-hidden border-2 border-transparent bg-white shadow-sm">
                    <Accordion type="single" collapsible>
                      <AccordionItem value={g.id} className="border-none">
                        <AccordionTrigger className="hover:no-underline p-6">
                          <div className="flex items-center gap-4 text-left w-full">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg group-hover:text-indigo-600 transition-colors">{g.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-1">Explore os fundamentos e técnicas avançadas deste módulo.</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 mr-4">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-600 border-indigo-200 bg-indigo-50/50">Completo</Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 border-t bg-slate-50/50">
                          <div className="prose prose-sm max-w-none text-foreground bg-white p-6 rounded-xl border shadow-inner">
                            {formatMarkdown(g.content)}
                          </div>
                          <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" size="sm" className="gap-2">
                              <CheckSquare className="h-4 w-4" /> Marcar como Concluído
                            </Button>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                              Próxima Aula <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-6">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Progresso do Curso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-black text-indigo-600">65%</span>
                  <span className="text-xs text-muted-foreground font-medium">8/12 módulos</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: '65%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground italic">"O sucesso em vendas é o resultado de preparação constante."</p>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Insight do Mentor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-indigo-900 leading-relaxed italic">
                  "Não venda o produto, venda a transformação. O cliente não quer o tráfego, ele quer o faturamento que o tráfego traz."
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Recursos Extras</h4>
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200">
                <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold">PDF: Guia de Objeções</span>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200">
                <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold">Planilha de Cadência</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SDR Playbook Mode (Standardized with Closer)
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none text-white overflow-hidden shadow-xl">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <Workflow className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Playbook SDR: Operação de Elite</h2>
            <p className="text-blue-100 text-sm opacity-90">
              O manual tático para prospecção, qualificação e agendamento de alta performance.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step: any, idx: number) => (
          <Card key={step.id} className="relative overflow-hidden group hover:shadow-lg transition-all border-blue-100">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap className="h-16 w-16 -rotate-12" />
            </div>
            <CardHeader className="p-4 pb-2">
              <Badge className="w-fit mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-black text-[10px]">
                ETAPA {idx + 1}
              </Badge>
              <CardTitle className="text-sm font-bold">{step.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Missão Próxima:</p>
                <p className="text-[10px] text-blue-600 italic font-medium">{step.next_steps_instructions}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Processo Operacional Detalhado
          </h3>
          
          <div className="space-y-4">
            {Object.entries(grouped)
              .sort(([keyA], [keyB]) => {
                const order = ['form_preenchido', 'qualificacao', 'lead_quente', 'lead_frio'];
                return order.indexOf(keyA) - order.indexOf(keyB);
              })
              .map(([stage, items]) => {
                const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.form_preenchido;
                const Icon = cfg.icon;
                const stageTactics = tactics.filter((t: any) => t.stage_key === stage);
                
                return (
                  <Card key={stage} className="border-l-4 border-l-blue-600 overflow-hidden shadow-sm">
                    <CardHeader className="p-4 bg-slate-50/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white shadow-sm ${cfg.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold">{cfg.label}</CardTitle>
                            <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                      {stageTactics.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                          {stageTactics.map((t: any) => (
                            <div key={t.id} className="p-3 rounded-xl bg-blue-50/30 border border-blue-100/50">
                              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                                <CheckSquare className="h-3 w-3 text-blue-600" />
                                {t.title}
                              </h4>
                              <ul className="space-y-1.5">
                                {t.checklist?.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-[10px] text-slate-600">
                                    <div className="h-3.5 w-3.5 rounded border border-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 opacity-0 group-hover:opacity-100" />
                                    </div>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      <Accordion type="single" collapsible className="space-y-2">
                        {items.map(g => (
                          <AccordionItem key={g.id} value={g.id} className="border rounded-xl px-4 bg-white hover:border-blue-200 transition-colors">
                            <AccordionTrigger className="hover:no-underline py-4">
                              <span className="font-bold text-sm">{g.title}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-2">
                              <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50/50 p-4 rounded-lg border border-slate-100 mb-4">
                                {formatMarkdown(g.content)}
                              </div>
                              
                              <div className="bg-white border rounded-xl p-4 shadow-inner">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-2">
                                  <MessageSquare className="h-3 w-3" /> Scripts Sugeridos
                                </h4>
                                <SDRScripts 
                                  initialCategory={
                                    stage === 'form_preenchido' ? 'abertura' : 
                                    stage === 'qualificacao' ? 'qualificacao' :
                                    stage === 'lead_quente' ? 'confirmacao' :
                                    stage === 'lead_frio' ? 'followup' : 'all'
                                  }
                                  initialProfile={profile === 'all' ? (stage === 'form_preenchido' ? 'inbound' : stage === 'lead_frio' ? 'frio' : 'quente') : profile} 
                                />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                SLA de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-100">
                <span className="text-xs font-medium text-slate-600">Tempo de Resposta</span>
                <Badge className="bg-green-100 text-green-700 border-none">&lt; 5 min</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-100">
                <span className="text-xs font-medium text-slate-600">Taxa de Conexão</span>
                <Badge className="bg-blue-100 text-blue-700 border-none">&gt; 35%</Badge>
              </div>
              <p className="text-[10px] text-blue-800/70 italic text-center">"O SDR é o atacante que prepara o gol para o Closer finalizar."</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-100">
            <div className="bg-amber-500 h-1 w-full" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-900">
                <Zap className="h-4 w-4 text-amber-600" />
                Power Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[11px] font-bold text-amber-800 mb-1">Qualificação &gt; Quantidade</p>
                <p className="text-[10px] text-amber-700">Não agende reunião com quem não tem o perfil mínimo. Proteja a agenda do Closer.</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[11px] font-bold text-amber-800 mb-1">Crie Urgência</p>
                <p className="text-[10px] text-amber-700">"Tenho apenas dois horários disponíveis para amanhã: 10h ou 15h. Qual fica melhor?"</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SDRStrategyGuide;
