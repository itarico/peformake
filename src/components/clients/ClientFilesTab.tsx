import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, FileText, Loader2, Link2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

export function ClientFilesTab({ clientId }: Props) {
  const queryClient = useQueryClient();
  const [addMode, setAddMode] = useState<'link' | 'file' | null>(null);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['client-files-admin', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase.from('client_files').delete().eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido');
      queryClient.invalidateQueries({ queryKey: ['client-files-admin', clientId] });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast.error('Preencha nome e URL');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('client_files').insert({
        client_id: clientId,
        file_name: linkName.trim(),
        file_url: linkUrl.trim(),
        file_type: 'link',
        is_external_link: true,
        notes: linkNotes.trim() || null,
      });
      if (error) throw error;
      toast.success('Link adicionado! Ficará visível no portal do cliente.');
      setLinkName('');
      setLinkUrl('');
      setLinkNotes('');
      setAddMode(null);
      queryClient.invalidateQueries({ queryKey: ['client-files-admin', clientId] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Máximo 10MB');
      return;
    }
    setSaving(true);
    try {
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('consulting-files').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('consulting-files').getPublicUrl(path);

      const { error: dbErr } = await supabase.from('client_files').insert({
        client_id: clientId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        is_external_link: false,
        notes: null,
      });
      if (dbErr) throw dbErr;

      toast.success('Arquivo enviado!');
      setAddMode(null);
      queryClient.invalidateQueries({ queryKey: ['client-files-admin', clientId] });
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const externalLinks = files.filter((f: any) => f.is_external_link);
  const uploadedFiles = files.filter((f: any) => !f.is_external_link);

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Arquivos & Links</h3>
          <p className="text-xs text-muted-foreground">
            Visíveis no portal do cliente na aba "Arquivos"
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddMode('link')}>
            <Link2 className="w-3.5 h-3.5 mr-1" /> Add Link
          </Button>
          <label>
            <input type="file" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" asChild disabled={saving}>
              <span>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                Upload
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Add link form */}
      {addMode === 'link' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Ex: Google Drive" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">URL *</Label>
                <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observação (opcional)</Label>
              <Input value={linkNotes} onChange={e => setLinkNotes(e.target.value)} placeholder="Pasta de referências..." className="text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAddMode(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddLink} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          Nenhum arquivo ou link adicionado ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {externalLinks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Links Externos</p>
              <div className="space-y-2">
                {externalLinks.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                          {f.file_name}
                        </a>
                        {f.notes && <p className="text-xs text-muted-foreground truncate">{f.notes}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteMutation.mutate(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Arquivos</p>
              <div className="space-y-2">
                {uploadedFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                          {f.file_name}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString('pt-BR')}
                          {f.file_size && ` · ${(f.file_size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteMutation.mutate(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
