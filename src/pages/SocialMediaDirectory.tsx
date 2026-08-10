import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FolderOpen, Upload, Link2, Trash2, FileText, Image as ImageIcon,
  Video, FileSpreadsheet, MoreHorizontal, Plus, ExternalLink, Download,
  Loader2, Building2,
} from 'lucide-react';
import { Client } from '@/types/database';

const FILE_TYPES = [
  { value: 'artes', label: 'Artes', icon: ImageIcon },
  { value: 'videos', label: 'Vídeos', icon: Video },
  { value: 'documentos', label: 'Documentos', icon: FileText },
  { value: 'planejamento', label: 'Planejamento', icon: FileSpreadsheet },
  { value: 'outros', label: 'Outros', icon: MoreHorizontal },
];

export default function SocialMediaDirectory() {
  const { staffMember, isSocialMedia, isAdmin } = useStaffAuth();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [activeType, setActiveType] = useState('artes');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkType, setLinkType] = useState('outros');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState('artes');

  if (!staffMember || (!isSocialMedia && !isAdmin)) {
    return <Navigate to="/login" replace />;
  }

  const { data: clients } = useQuery({
    queryKey: ['dir-clients', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      let result = data as Client[];
      if (!isAdmin && staffMember?.id) {
        result = result.filter(c => c.social_media_staff_id === staffMember.id || c.admin_staff_id === staffMember.id);
      }
      return result;
    },
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['client-files', selectedClientId, activeType],
    queryFn: async () => {
      let query = supabase
        .from('client_files')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });
      
      if (activeType !== 'todos') {
        query = query.eq('file_type', activeType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (addMode === 'link') {
        if (!linkUrl || !linkName) throw new Error('Preencha todos os campos');
        const { error } = await supabase.from('client_files').insert({
          client_id: selectedClientId,
          file_name: linkName,
          file_url: linkUrl,
          file_type: linkType,
          is_external_link: true,
          uploaded_by_staff_id: staffMember!.id,
        });
        if (error) throw error;
      } else {
        for (const file of uploadFiles) {
          const ext = file.name.split('.').pop();
          const path = `${selectedClientId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('consulting-files')
            .upload(path, file);
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('consulting-files')
            .getPublicUrl(path);

          const { error: dbError } = await supabase.from('client_files').insert({
            client_id: selectedClientId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: uploadType,
            is_external_link: false,
            uploaded_by_staff_id: staffMember!.id,
            file_size: file.size,
          });
          if (dbError) throw dbError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Arquivo(s) adicionado(s)!');
      queryClient.invalidateQueries({ queryKey: ['client-files'] });
      setIsAddDialogOpen(false);
      setLinkUrl('');
      setLinkName('');
      setUploadFiles([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase.from('client_files').delete().eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Arquivo removido');
      queryClient.invalidateQueries({ queryKey: ['client-files'] });
    },
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diretório</h1>
          <p className="text-sm text-muted-foreground mt-1">Arquivos e materiais dos clientes</p>
        </div>
        {selectedClientId && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      <div className="w-full max-w-sm">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Selecione um cliente para ver seus arquivos</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={activeType} onValueChange={setActiveType}>
            <TabsList className="grid w-full grid-cols-5">
              {FILE_TYPES.map(ft => (
                <TabsTrigger key={ft.value} value={ft.value} className="gap-1 text-xs">
                  <ft.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{ft.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !files?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum arquivo nesta categoria</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar arquivo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {files.map(file => {
                const typeInfo = FILE_TYPES.find(ft => ft.value === file.file_type) || FILE_TYPES[4];
                const Icon = typeInfo.icon;
                return (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {file.is_external_link ? <Link2 className="h-5 w-5 text-primary" /> : <Icon className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                            {file.file_size && (
                              <span className="text-xs text-muted-foreground">{formatSize(file.file_size)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(file.file_url, '_blank')}
                          >
                            {file.is_external_link ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add File Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Arquivo</DialogTitle>
          </DialogHeader>
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-2">
                <Link2 className="h-4 w-4" />
                Link Externo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div>
                <Label>Tipo</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arquivos</Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                />
              </div>
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-4">
              <div>
                <Label>Nome</Label>
                <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Ex: Pasta Google Drive" />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
