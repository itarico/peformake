import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3 } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';

const BREAKDOWN_OPTIONS = [
  { value: 'age', label: 'Idade' },
  { value: 'gender', label: 'Gênero' },
  { value: 'region', label: 'Região' },
  { value: 'placement', label: 'Posicionamento' },
  { value: 'age_gender', label: 'Idade + Gênero' },
];

const GENDER_MAP: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  unknown: 'Desconhecido',
};

export function TrafficBreakdownPanel() {
  const now = new Date();
  const [clientId, setClientId] = useState<string>('');
  const [breakdownType, setBreakdownType] = useState('age');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: clients = [] } = useQuery({
    queryKey: ['traffic-breakdown-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_meta_connections')
        .select('client_id, clients(id, name)')
        .eq('status', 'active');
      return (data || []).map((c: any) => c.clients).filter(Boolean);
    },
  });

  const { data: breakdownData, isLoading, refetch } = useQuery({
    queryKey: ['traffic-breakdown', clientId, breakdownType, year, month],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'breakdown', client_id: clientId, year, month, breakdown_type: breakdownType });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data.breakdown || [];
    },
    enabled: !!clientId,
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getLabel = (row: any) => {
    if (breakdownType === 'age_gender') return `${row.age || '?'} / ${GENDER_MAP[row.gender] || row.gender || '?'}`;
    if (breakdownType === 'gender') return GENDER_MAP[row.gender] || row.gender || '—';
    return row.age || row.region || row.publisher_platform || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={breakdownType} onValueChange={setBreakdownType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BREAKDOWN_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || !clientId}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          Analisar
        </Button>
      </div>

      {!clientId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um cliente para ver o breakdown.</CardContent></Card>
      ) : isLoading ? (
        <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : breakdownData && breakdownData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {BREAKDOWN_OPTIONS.find(o => o.value === breakdownType)?.label} — {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{BREAKDOWN_OPTIONS.find(o => o.value === breakdownType)?.label}</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdownData.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{getLabel(row)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.spend)}</TableCell>
                      <TableCell className="text-right">{row.impressions.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{row.clicks.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{row.ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{row.leads || row.messages || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.cpl)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : breakdownData ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum dado de breakdown para este período.</CardContent></Card>
      ) : null}
    </div>
  );
}
