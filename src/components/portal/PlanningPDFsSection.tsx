import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PDF_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  design: { label: 'Design Gráfico', color: 'bg-primary/10 text-primary border-primary/20' },
  social_media: { label: 'Social Media', color: 'bg-info/10 text-info border-info/20' },
  consulting: { label: 'Consultoria', color: 'bg-success/10 text-success border-success/20' },
  traffic: { label: 'Tráfego', color: 'bg-warning/10 text-warning border-warning/20' },
  audiovisual: { label: 'Audiovisual', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  diy: { label: 'DIY', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  diagnostico: { label: 'Diagnóstico', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  sintese: { label: 'Síntese Mensal', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  plano_acao: { label: 'Plano de Ação', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  relatorio: { label: 'Relatório', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  crm: { label: 'Relatório CRM', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  whatsapp: { label: 'Relatório WhatsApp', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface PlanningPDFsSectionProps {
  clientId: string;
}

export function PlanningPDFsSection({ clientId }: PlanningPDFsSectionProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const { data: pdfs = [], isLoading } = useQuery({
    queryKey: ['portal-planning-pdfs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_pdfs' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Filter by selected month/year
  const filteredPdfs = pdfs.filter((pdf: any) => {
    if (pdf.month && pdf.year) {
      return pdf.month === Number(selectedMonth) && pdf.year === Number(selectedYear);
    }
    // Fallback to created_at
    const d = new Date(pdf.created_at);
    return (d.getMonth() + 1) === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  // Available years from data
  const availableYears = [...new Set(pdfs.map((p: any) => {
    if (p.year) return p.year;
    return new Date(p.created_at).getFullYear();
  }))].sort((a, b) => b - a);

  if (availableYears.length === 0) availableYears.push(now.getFullYear());

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Carregando documentos...</p>
      </div>
    );
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'planejamento.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Month/Year filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableYears.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPdfs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-medium text-foreground mb-1">Nenhum documento para {MONTHS[Number(selectedMonth) - 1]} {selectedYear}</h3>
            <p className="text-sm text-muted-foreground">
              Os PDFs de planejamento serão disponibilizados pela equipe após a conclusão do planejamento mensal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredPdfs.map((pdf: any) => {
            const typeInfo = PDF_TYPE_LABELS[pdf.pdf_type] || { label: pdf.pdf_type, color: 'bg-muted text-muted-foreground border-border' };
            return (
              <div key={pdf.id} className={`flex items-center justify-between p-3 rounded-lg border ${typeInfo.color}`}>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{pdf.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pdf.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => window.open(pdf.file_url, '_blank')}
                  >
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => handleDownload(pdf.file_url, pdf.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
