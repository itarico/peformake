import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Download, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { clientId: string; }

export default function CrmCSVTools({ clientId }: Props) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; imported: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportCSV = async () => {
    setExporting(true);
    const { data } = await supabase.from('crm_leads').select('name, phone, email, status, sale_value, tags, notes, city, company, created_at, last_message_at')
      .eq('client_id', clientId).order('created_at', { ascending: false });
    if (!data || data.length === 0) { toast.info('Nenhum lead para exportar'); setExporting(false); return; }
    
    const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Valor Venda', 'Tags', 'Notas', 'Cidade', 'Empresa', 'Criado em', 'Última msg'];
    const rows = data.map(l => [
      l.name || '', l.phone, l.email || '', l.status, l.sale_value || '', (l.tags || []).join('; '),
      (l.notes || '').replace(/\n/g, ' '), l.city || '', l.company || '',
      new Date(l.created_at).toLocaleDateString('pt-BR'), l.last_message_at ? new Date(l.last_message_at).toLocaleDateString('pt-BR') : '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${data.length} leads exportados!`);
    setExporting(false);
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setImporting(true); setImportResult(null);
    
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error('CSV vazio ou inválido'); setImporting(false); return; }
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const phoneIdx = headers.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('whatsapp') || h.includes('celular'));
    const nameIdx = headers.findIndex(h => h.includes('nome') || h.includes('name'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const cityIdx = headers.findIndex(h => h.includes('cidade') || h.includes('city'));
    const companyIdx = headers.findIndex(h => h.includes('empresa') || h.includes('company'));
    
    if (phoneIdx === -1) { toast.error('Coluna de telefone não encontrada. Use: "Telefone", "Phone" ou "WhatsApp"'); setImporting(false); return; }
    
    const errors: string[] = [];
    let imported = 0;
    const total = lines.length - 1;
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].match(/("([^"]|"")*"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
      const phone = (cols[phoneIdx] || '').replace(/\D/g, '');
      if (!phone || phone.length < 10) { errors.push(`Linha ${i + 1}: telefone inválido`); continue; }
      
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const { error } = await supabase.from('crm_leads').upsert({
        client_id: clientId, phone: formattedPhone,
        name: nameIdx >= 0 ? cols[nameIdx] || null : null,
        email: emailIdx >= 0 ? cols[emailIdx] || null : null,
        city: cityIdx >= 0 ? cols[cityIdx] || null : null,
        company: companyIdx >= 0 ? cols[companyIdx] || null : null,
        status: 'new',
      }, { onConflict: 'client_id,phone' });
      
      if (error) errors.push(`Linha ${i + 1}: ${error.message}`);
      else imported++;
    }
    
    setImportResult({ total, imported, errors: errors.slice(0, 10) });
    toast.success(`${imported} de ${total} leads importados!`);
    setImporting(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={exportCSV} disabled={exporting}>
        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        Exportar CSV
      </Button>
      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowImport(true)}>
        <Upload className="h-3 w-3" /> Importar CSV
      </Button>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Importar Leads (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-medium">Formato esperado:</p>
              <p className="text-xs text-muted-foreground">O CSV deve ter uma coluna de <strong>Telefone</strong> (obrigatório).</p>
              <p className="text-xs text-muted-foreground">Colunas opcionais: Nome, Email, Cidade, Empresa</p>
              <p className="text-xs text-muted-foreground">Leads duplicados (mesmo telefone) serão atualizados.</p>
            </div>
            <label className="cursor-pointer block">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
              <Button className="w-full gap-2" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {importing ? 'Importando...' : 'Selecionar arquivo CSV'}
              </Button>
            </label>
            {importResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {importResult.imported}/{importResult.total} importados
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {importResult.errors.map((e, i) => <p key={i} className="text-[10px] text-red-500">{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
