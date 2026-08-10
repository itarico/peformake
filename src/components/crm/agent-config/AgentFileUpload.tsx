import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCrmAgentFile, uploadCrmAgentFile } from '@/lib/crmConfigManager';

interface Props {
  clientId: string;
  agentType: string;
}

export default function AgentFileUpload({ clientId, agentType }: Props) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['agent-files', clientId, agentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_agent_files')
        .select('*')
        .eq('client_id', clientId)
        .eq('agent_type', agentType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await deleteCrmAgentFile(fileId);
    },
    onSuccess: () => {
      toast.success('Arquivo removido');
      queryClient.invalidateQueries({ queryKey: ['agent-files', clientId, agentType] });
    },
    onError: () => toast.error('Erro ao remover arquivo'),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PDF, XLS, XLSX, DOC, DOCX ou CSV.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadCrmAgentFile(clientId, agentType, file);
      toast.success('Arquivo enviado! O agente usará este conteúdo como referência.');
      queryClient.invalidateQueries({ queryKey: ['agent-files', clientId, agentType] });
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Arquivos de Referência</p>
            <p className="text-xs text-muted-foreground">
              Envie PDFs, planilhas ou documentos com catálogo de produtos, tabelas de preço ou scripts de venda.
            </p>
          </div>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.xls,.xlsx,.doc,.docx,.csv" />
            <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Enviar Arquivo
              </span>
            </Button>
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : files.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
            Nenhum arquivo enviado. Envie PDFs, planilhas ou documentos para treinar o agente.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(f.file_type)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{f.file_type}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(f.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}