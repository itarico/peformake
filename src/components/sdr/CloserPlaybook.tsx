import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, MessageSquare, Target, Zap, ShieldCheck, ArrowRight, Quote, Info, Workflow, Calendar, Video, Clock, CheckSquare } from 'lucide-react';
import { useSDRContext } from './useSDRContext';

const CloserPlaybook = () => {
  const { sdrStaffId, isAdminView } = useSDRContext();

  const { data: guides = [] } = useQuery({
    queryKey: ['closer-guides'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_strategy_guides').select('*').eq('category', 'closer').eq('is_active', true).order('display_order');
      return data || [];
    },
  });

  const { data: tactics = [] } = useQuery({
    queryKey: ['closer-tactics'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_stage_tactics').select('*').eq('stage_key', 'closer_call').order('display_order');
      return data || [];
    },
  });

  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['closer-upcoming-meetings', sdrStaffId, isAdminView],
    queryFn: async () => {
      let q = supabase
        .from('sdr_meetings')
        .select(`
          *,
          lead:sdr_leads(id, contact_name, company_name, pain_point, qualification_score)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      
      // If not admin, we might want to filter by SDR, but Closer usually handles meetings assigned to them.
      // For now, let's show all upcoming meetings if they are a Closer.
      const { data } = await q;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-red-600 to-rose-700 border-none text-white overflow-hidden shadow-xl">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <Target className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black tracking-tight">Playbook Closer: Fechamento de Elite</h2>
            <p className="text-red-100 text-sm opacity-90">
              O manual tático para transformar reuniões em parcerias de sucesso.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-1">
              {upcomingMeetings.length} AGENDADAS
            </Badge>
            <span className="text-[10px] text-red-100 uppercase font-bold tracking-wider">Hoje</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all border-red-100 bg-white">
          <CardHeader className="p-4 pb-2">
            <Badge className="w-fit mb-2 bg-red-100 text-red-700 hover:bg-red-100 border-none font-black text-[10px]">
              PASSO 1
            </Badge>
            <CardTitle className="text-sm font-bold uppercase tracking-tight text-red-900">Pré-Reunião</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Analise o Briefing do SDR no Google Agenda. Identifique a dor principal e estude o site do cliente.
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all border-red-100 bg-white">
          <CardHeader className="p-4 pb-2">
            <Badge className="w-fit mb-2 bg-red-100 text-red-700 hover:bg-red-100 border-none font-black text-[10px]">
              PASSO 2
            </Badge>
            <CardTitle className="text-sm font-bold uppercase tracking-tight text-red-900">Conexão & Rapport</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Quebra-gelo inicial. Pergunte sobre a operação atual e valide as informações passadas pelo SDR.
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all border-red-100 bg-white">
          <CardHeader className="p-4 pb-2">
            <Badge className="w-fit mb-2 bg-red-100 text-red-700 hover:bg-red-100 border-none font-black text-[10px]">
              PASSO 3
            </Badge>
            <CardTitle className="text-sm font-bold uppercase tracking-tight text-red-900">Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Apresente a solução focada na dor. Não encerre a call sem uma definição clara ou próxima etapa agendada.
            </p>
          </CardContent>
        </Card>
      </div>

      {upcomingMeetings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" /> Minha Agenda de Consultorias
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold">{upcomingMeetings.length} Reuniões</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMeetings.map((m: any) => (
              <Card key={m.id} className="border-l-4 border-l-red-500 group hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-sm text-slate-900">{m.lead?.contact_name || 'Lead sem nome'}</p>
                      <p className="text-xs font-medium text-muted-foreground">{m.lead?.company_name || 'Empresa não informada'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant="secondary" className="text-[10px] font-bold bg-red-50 text-red-600 border-none">
                        {new Date(m.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Briefing SDR:</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">{m.lead?.pain_point || 'Nenhuma dor específica relatada.'}</p>
                    </div>
                    <Button size="sm" className="w-full h-9 text-xs bg-red-600 hover:bg-red-700 font-bold gap-2 shadow-sm" onClick={() => window.open(m.meeting_link, '_blank')} disabled={!m.meeting_link}>
                      <Video className="h-3.5 w-3.5" /> Acessar Sala Virtual
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-red-600" />
            Metodologia de Venda
          </h3>
          
          <Tabs defaultValue="estrutura" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="estrutura" className="rounded-lg font-bold text-xs py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                Estrutura da Call
              </TabsTrigger>
              <TabsTrigger value="objecoes" className="rounded-lg font-bold text-xs py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                Objeções & Gatilhos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="estrutura" className="mt-4 space-y-4">
              {guides.filter(g => g.title.includes('Estrutura')).map(guide => (
                <Card key={guide.id} className="border-l-4 border-l-red-500 overflow-hidden bg-white shadow-sm">
                  <CardHeader className="p-4 bg-slate-50/50">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                      {guide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none text-slate-600">
                      {guide.content.split('\n').map((line: string, i: number) => {
                        if (line.startsWith('## ')) {
                          return <h4 key={i} className="text-sm font-black text-red-700 mt-6 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-red-100 text-[10px] text-red-600 border border-red-200">{line.split('.')[0].replace('## ', '')}</span>
                            {line.replace(/## \d+\. /, '')}
                          </h4>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={i} className="ml-4 text-xs font-medium mb-2 flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-red-400 shrink-0" />
                            {line.slice(2)}
                          </li>;
                        }
                        return <p key={i} className="text-xs mb-2 leading-relaxed">{line}</p>;
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="objecoes" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guides.filter(g => g.title.includes('Objeções')).map(guide => (
                  <div key={guide.id} className="col-span-full space-y-4">
                    {guide.content.split('## ').filter((s: string) => s.trim()).map((section: string, i: number) => {
                      const [title, ...rest] = section.split('\n');
                      return (
                        <Card key={i} className="border-slate-200 overflow-hidden bg-white hover:border-red-200 transition-colors">
                          <CardHeader className="p-4 pb-2 bg-slate-50/30">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              {rest.map((line, j) => (
                                <p key={j} className="text-xs text-slate-600 flex items-start gap-2 bg-slate-50/50 p-2 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                  {line.startsWith('- ') && <MessageSquare className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />}
                                  {line.startsWith('- ') ? line.slice(2) : line}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <Card className="bg-red-600 border-none text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Quote className="h-20 w-20 rotate-12" />
                </div>
                <CardContent className="p-6 relative z-10 flex items-start gap-4">
                  <Quote className="h-6 w-6 text-red-200 shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Pergunta de Fechamento</p>
                    <p className="text-lg font-bold leading-tight">"O que eu posso fazer por você hoje para já iniciarmos a nossa parceria?"</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Checklist do Closer
          </h3>
          
          <div className="space-y-3">
            {tactics.map(tactic => (
              <Card key={tactic.id} className="border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-red-500 h-1 w-full" />
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">{tactic.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <ul className="space-y-3">
                    {tactic.checklist?.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-[11px] text-slate-600 group cursor-default">
                        <div className="h-4 w-4 rounded border-2 border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-red-500 transition-colors">
                          <div className="h-2 w-2 rounded-full bg-red-500 scale-0 group-hover:scale-100 transition-transform" />
                        </div>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-900 border-none text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <ShieldCheck className="h-20 w-20 -rotate-12 text-white" />
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                <Info className="h-4 w-4" /> Dica de Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Vendemos **resultado**, não tráfego pago ou marketing. Adapte seu pitch à dor específica que o lead relatou na fase de exploração.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CloserPlaybook;
