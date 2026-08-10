import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MONTH_NAMES } from '@/types/database';

const GENDER_MAP: Record<string, string> = { male: 'Masculino', female: 'Feminino', unknown: 'Desconhecido' };

const BREAKDOWN_TYPES = [
  { key: 'age', label: 'Idade' },
  { key: 'gender', label: 'Gênero' },
  { key: 'region', label: 'Região' },
  { key: 'placement', label: 'Posicionamento' },
];

interface Props { clientId: string }

export function TrafficInsightsPanel({ clientId }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchBreakdown = async (type: string) => {
    const { data, error } = await invokeWithAuth('meta-ads-sync', { action: 'breakdown', client_id: clientId, year, month, breakdown_type: type });
    if (error || data?.error) return [];
    return data?.breakdown || [];
  };

  const { data: allBreakdowns, isLoading, refetch } = useQuery({
    queryKey: ['traffic-insights-all', clientId, year, month],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      for (const bt of BREAKDOWN_TYPES) {
        results[bt.key] = await fetchBreakdown(bt.key);
      }
      return results;
    },
    enabled: !!clientId,
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getLabel = (row: any, type: string) => {
    if (type === 'gender') return GENDER_MAP[row.gender] || row.gender || '—';
    if (type === 'age') return row.age || '—';
    if (type === 'region') return row.region || '—';
    if (type === 'placement') return row.publisher_platform || '—';
    return '—';
  };

  const chartDataFromRows = (rows: any[], type: string) =>
    rows.slice(0, 8).map((row: any) => ({
      name: getLabel(row, type),
      spend: Number(row.spend || 0),
      leads: Number(row.leads || row.messages || 0),
      clicks: Number(row.clicks || 0),
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
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
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {BREAKDOWN_TYPES.map(bt => {
            const data = allBreakdowns?.[bt.key] || [];
            return (
              <Card key={bt.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{bt.label} — {MONTH_NAMES[month - 1]} {year}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartDataFromRows(data, bt.key)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-22} textAnchor="end" height={56} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip />
                            <Bar dataKey="spend" name="Invest." fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                           <TableRow>
                               <TableHead className="text-xs">{bt.label}</TableHead>
                               <TableHead className="text-right text-xs">Invest.</TableHead>
                               <TableHead className="text-right text-xs">Alcance</TableHead>
                               <TableHead className="text-right text-xs">Cliques</TableHead>
                               <TableHead className="text-right text-xs">CTR</TableHead>
                               <TableHead className="text-right text-xs">Leads</TableHead>
                               <TableHead className="text-right text-xs">CPL</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {data.slice(0, 10).map((row: any, i: number) => (
                               <TableRow key={i}>
                                 <TableCell className="font-medium text-xs">{getLabel(row, bt.key)}</TableCell>
                                 <TableCell className="text-right text-xs">{formatCurrency(row.spend)}</TableCell>
                                 <TableCell className="text-right text-xs">{(row.reach || 0).toLocaleString('pt-BR')}</TableCell>
                                 <TableCell className="text-right text-xs">{row.clicks?.toLocaleString('pt-BR')}</TableCell>
                                 <TableCell className="text-right text-xs">{row.ctr?.toFixed(2)}%</TableCell>
                                 <TableCell className="text-right text-xs">{row.leads || row.messages || 0}</TableCell>
                                 <TableCell className="text-right text-xs">{formatCurrency(row.cpl)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
