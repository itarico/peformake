import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BookOpen } from 'lucide-react';
import SquadOperationsHub from '@/components/playbook/SquadOperationsHub';

interface Section { id: string; section_key: string; title: string; content_md: string; display_order: number; }

function renderMarkdown(md: string) {
  // very small md renderer (bold + lists + line breaks)
  const html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul class="list-disc pl-5 space-y-1 my-2">${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return { __html: html };
}

export default function Playbook() {
  const [sections, setSections] = useState<Section[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from('playbook_content').select('*').order('display_order')
      .then(({ data }) => setSections(data || []));
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Playbook Operacional Performake</h1>
          <p className="text-sm text-muted-foreground">Padronização do squad operacional · Jornada do cliente</p>
        </div>
      </div>

      <SquadOperationsHub />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold mt-6">Documento de Referência</h2>
        {sections.map(s => (
          <Collapsible key={s.id} open={!!open[s.id]} onOpenChange={(o) => setOpen({ ...open, [s.id]: o })}>
            <Card>
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition">
                <span className="font-medium text-sm">{s.title}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open[s.id] ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t" dangerouslySetInnerHTML={renderMarkdown(s.content_md)} />
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
