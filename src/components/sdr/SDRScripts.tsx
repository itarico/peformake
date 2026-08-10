import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Search, MessageCircle, Flame, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Script {
  id: string;
  title: string;
  category: string;
  channel: string;
  content: string;
  variables: string[];
  use_count: number;
  target_profile?: string;
  strategy_step_key?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'abertura', label: 'Abertura' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'objecao', label: 'Objeções' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'confirmacao', label: 'Confirmação Call' },
  { value: 'proposta', label: 'Proposta' },
];

const SDRScripts = ({ initialProfile = 'all', initialCategory = 'all' }: { initialProfile?: string, initialCategory?: string }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [profile, setProfile] = useState(initialProfile);

  const { data: scripts = [] } = useQuery({
    queryKey: ['sdr-scripts'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_scripts').select('*').eq('is_active', true).order('category');
      return (data || []) as Script[];
    },
  });

  const filtered = scripts.filter(s => {
    if (category !== 'all' && s.category !== category) return false;
    if (profile !== 'all' && s.target_profile !== profile && s.target_profile !== 'all') return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const copyScript = (s: Script) => {
    navigator.clipboard.writeText(s.content);
    toast.success('Script copiado! Substitua as variáveis {nome}, {empresa}, etc.');
    supabase.from('sdr_scripts').update({ use_count: s.use_count + 1 }).eq('id', s.id).then(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar script..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              {CATEGORIES.map(c => (
                <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Perfil do Lead:</span>
          <Tabs value={profile} onValueChange={setProfile} className="h-8">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-[10px] h-6">Todos</TabsTrigger>
              <TabsTrigger value="quente" className="text-[10px] h-6 flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> Quente</TabsTrigger>
              <TabsTrigger value="frio" className="text-[10px] h-6 flex items-center gap-1"><Target className="h-3 w-3 text-blue-500" /> Frio</TabsTrigger>
              <TabsTrigger value="inbound" className="text-[10px] h-6 flex items-center gap-1"><MessageCircle className="h-3 w-3 text-green-500" /> Inbound</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{s.title}</CardTitle>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]"><MessageCircle className="h-2.5 w-2.5 mr-0.5" />{s.channel}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 bg-muted/50 p-2 rounded">{s.content}</p>
              {s.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.variables.map(v => (
                    <Badge key={v} variant="outline" className="text-[10px] px-1 py-0">{`{${v}}`}</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground">Usado {s.use_count}x</span>
                <Button size="sm" variant="outline" onClick={() => copyScript(s)}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhum script encontrado</CardContent></Card>
      )}
    </div>
  );
};

export default SDRScripts;
