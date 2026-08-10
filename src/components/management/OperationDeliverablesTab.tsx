import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, Palette, Megaphone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useOperationDeliverables,
  type DeliverableItem,
  type DeliverableStatus,
  type ClientDeliverables,
} from '@/hooks/useOperationDeliverables';

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  completed: 'border-success/40 bg-success/10 hover:bg-success/20',
  overdue: 'border-destructive/50 bg-destructive/10 hover:bg-destructive/20',
  due_soon: 'border-warning/50 bg-warning/10 hover:bg-warning/20',
  open: 'border-primary/30 bg-primary/5 hover:bg-primary/10',
  not_open: 'border-border bg-muted/40 hover:bg-muted/60',
};

const STATUS_TEXT: Record<DeliverableStatus, string> = {
  completed: 'text-success',
  overdue: 'text-destructive',
  due_soon: 'text-warning',
  open: 'text-primary',
  not_open: 'text-muted-foreground',
};

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  completed: 'Concluído',
  overdue: 'Atrasado',
  due_soon: 'Vence em breve',
  open: 'Em aberto',
  not_open: 'Aguardando',
};

const DOT: Record<DeliverableStatus, string> = {
  completed: 'bg-success',
  overdue: 'bg-destructive',
  due_soon: 'bg-warning',
  open: 'bg-primary',
  not_open: 'bg-muted-foreground/40',
};

function worst(items: DeliverableItem[]): DeliverableStatus {
  if (items.some(i => i.status === 'overdue')) return 'overdue';
  if (items.some(i => i.status === 'due_soon')) return 'due_soon';
  if (items.length > 0 && items.every(i => i.status === 'completed')) return 'completed';
  if (items.some(i => i.status === 'open')) return 'open';
  return 'not_open';
}

function GroupChip({ icon: Icon, label, items }: { icon: any; label: string; items: DeliverableItem[] }) {
  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground/60">
        <Icon className="h-3 w-3" /> {label}: —
      </span>
    );
  }
  const s = worst(items);
  const done = items.filter(i => i.status === 'completed').length;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', STATUS_STYLES[s], STATUS_TEXT[s])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[s])} />
      <Icon className="h-3 w-3" /> {label} {done}/{items.length}
    </span>
  );
}

function DeliverableCell({ item, onOpen }: { item: DeliverableItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('w-full text-left rounded-md border p-2 transition-colors group', STATUS_STYLES[item.status])}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold truncate">{item.label}</span>
        <ChevronRight className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        {item.status === 'overdue' && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {item.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-success" />}
        {(item.status === 'due_soon' || item.status === 'open') && <Clock className="h-3 w-3 opacity-60" />}
        <span className={cn('text-[10px]', STATUS_TEXT[item.status])}>{item.detail}</span>
      </div>
      <Progress value={item.progress} className="h-1 mt-1" />
      <div className="flex items-center justify-between mt-1">
        <span className={cn('text-[9px] font-medium', STATUS_TEXT[item.status])}>{STATUS_LABEL[item.status]}</span>
        {item.dueDate && <span className="text-[9px] text-muted-foreground">{format(item.dueDate, 'dd/MM')}</span>}
      </div>
    </button>
  );
}

function ClientRow({ c, onOpen }: { c: ClientDeliverables; onOpen: (route: string) => void }) {
  return (
    <AccordionItem
      value={c.clientId}
      className={cn('border rounded-lg px-3 bg-card', c.overdueCount > 0 && 'border-destructive/40')}
    >
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-2 min-w-0">
          <div className="min-w-0 w-40 shrink-0 text-left">
            <p className="text-sm font-semibold truncate">{c.clientName}</p>
            <p className="text-[10px] uppercase text-muted-foreground truncate">{c.segment || 'Geral'}</p>
          </div>
          <div className="hidden sm:flex flex-wrap gap-1 flex-1">
            <GroupChip icon={Palette} label="Design" items={c.design ? [c.design] : []} />
            <GroupChip icon={Megaphone} label="Tráfego" items={c.traffic} />
            <GroupChip icon={Video} label="Vídeo" items={c.audiovisual} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {c.overdueCount > 0 && <Badge variant="destructive" className="text-[9px]">{c.overdueCount}</Badge>}
            <Progress value={c.overallProgress} className="h-1.5 w-16" />
            <span className="text-[11px] font-bold w-9 text-right">{c.overallProgress.toFixed(0)}%</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Palette className="h-3 w-3" /> Design
            </p>
            {c.design ? (
              <DeliverableCell item={c.design} onOpen={() => onOpen(c.design!.route)} />
            ) : (
              <p className="text-[10px] text-muted-foreground py-2">Não contratado</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Tráfego
            </p>
            {c.hasTraffic ? (
              <div className="space-y-1">
                {c.traffic.map(i => <DeliverableCell key={i.key} item={i} onOpen={() => onOpen(i.route)} />)}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground py-2">Não contratado</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Audiovisual</span>
              {c.hasAudiovisual && <span className="text-[9px]">{c.avProgress.toFixed(0)}%</span>}
            </p>
            {c.hasAudiovisual ? (
              <div className="space-y-1">
                {c.audiovisual.map(i => <DeliverableCell key={i.key} item={i} onOpen={() => onOpen(i.route)} />)}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground py-2">Não contratado</p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function OperationDeliverablesTab() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'pending'>('all');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const { data, summary, isLoading } = useOperationDeliverables(year, month);

  const filtered = useMemo(() => {
    if (filter === 'overdue') return data.filter(c => c.items.some(i => i.status === 'overdue'));
    if (filter === 'pending') return data.filter(c => c.items.some(i => i.status !== 'completed'));
    return data;
  }, [data, filter]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Controle de Entregas — {MONTH_LABELS[month - 1]} / {year}</CardTitle>
              <CardDescription className="text-[11px]">
                Artes e planejamento até o dia 15 do mês anterior · Relatório de tráfego no dia 01 · Vídeos após a captação
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>Anterior</Button>
              <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>Próximo</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] uppercase text-muted-foreground font-bold">Entregas do mês</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-success/40 bg-success/5 p-3">
              <p className="text-[10px] uppercase text-success font-bold">Concluídas</p>
              <p className="text-2xl font-bold text-success">{summary.completed}</p>
            </div>
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
              <p className="text-[10px] uppercase text-warning font-bold">Vencem em breve</p>
              <p className="text-2xl font-bold text-warning">{summary.dueSoon}</p>
            </div>
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-[10px] uppercase text-destructive font-bold">Atrasadas</p>
              <p className="text-2xl font-bold text-destructive">{summary.overdue}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'ghost'} onClick={() => setFilter('all')}>Todos</Button>
            <Button size="sm" variant={filter === 'pending' ? 'default' : 'ghost'} onClick={() => setFilter('pending')}>Pendentes</Button>
            <Button size="sm" variant={filter === 'overdue' ? 'default' : 'ghost'} onClick={() => setFilter('overdue')}>Atrasados</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpenItems(filtered.map(c => c.clientId))}>Expandir tudo</Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenItems([])}>Recolher</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
          Nenhuma entrega encontrada para este filtro.
        </div>
      ) : (
        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="space-y-2">
          {filtered.map(c => (
            <ClientRow key={c.clientId} c={c} onOpen={route => navigate(route)} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
