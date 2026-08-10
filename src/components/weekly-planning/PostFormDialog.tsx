import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string;
  post: any | null;
  nextPosition: number;
  onSaved: () => void;
}

export function PostFormDialog({ open, onOpenChange, planId, post, nextPosition, onSaved }: Props) {
  const [postType, setPostType] = useState<'feed' | 'reels' | 'carousel'>('feed');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setPostType(post?.post_type || 'feed');
      setCaption(post?.caption || '');
      setHashtags(post?.hashtags || '');
      setScheduledAt(post?.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '');
      setImagePaths(post?.image_urls || []);
    }
  }, [open, post]);

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const p of imagePaths) {
        if (p.startsWith('http')) { next[p] = p; continue; }
        const { data } = await supabase.storage.from('weekly-plan-media').createSignedUrl(p, 3600);
        if (data?.signedUrl) next[p] = data.signedUrl;
      }
      setPreviews(next);
    })();
  }, [imagePaths]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${planId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from('weekly-plan-media')
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        paths.push(path);
      }
      setImagePaths((prev) => [...prev, ...paths]);
      if (paths.length > 1 && postType === 'feed') setPostType('carousel');
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (path: string) => {
    setImagePaths((prev) => prev.filter((p) => p !== path));
  };

  const save = async () => {
    if (imagePaths.length === 0) {
      toast.error('Adicione ao menos uma imagem');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        plan_id: planId,
        post_type: postType,
        image_urls: imagePaths,
        caption,
        hashtags,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        position: post?.position ?? nextPosition,
      };
      if (post?.id) {
        await supabase.from('weekly_plan_posts').update(payload).eq('id', post.id);
      } else {
        await supabase.from('weekly_plan_posts').insert(payload);
      }
      toast.success('Post salvo');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar post' : 'Novo post do feed'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="feed">Post Feed</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Imagens</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {imagePaths.map((p) => (
                <div key={p} className="relative aspect-square bg-muted rounded overflow-hidden group">
                  {previews[p] && <img src={previews[p]} alt="" className="w-full h-full object-cover" />}
                  <button
                    onClick={() => removeImage(p)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5 mb-1" /><span className="text-[10px]">Adicionar</span></>}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Legenda</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} placeholder="Texto da publicação..." />
          </div>

          <div>
            <Label>Hashtags</Label>
            <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#marketing #digital" />
          </div>

          <div>
            <Label>Data e horário de publicação</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
