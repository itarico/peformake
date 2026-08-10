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

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const TYPES = ['foto', 'video', 'enquete', 'bastidor', 'link', 'quiz', 'texto'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string;
  story: any | null;
  defaultDay: number;
  onSaved: () => void;
}

export function StoryFormDialog({ open, onOpenChange, planId, story, defaultDay, onSaved }: Props) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [storyType, setStoryType] = useState('foto');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDayOfWeek(story?.day_of_week ?? defaultDay);
      setStoryType(story?.story_type || 'foto');
      setTitle(story?.title || '');
      setDescription(story?.description || '');
      setImagePath(story?.image_url || null);
    }
  }, [open, story, defaultDay]);

  useEffect(() => {
    (async () => {
      if (!imagePath) { setPreview(null); return; }
      if (imagePath.startsWith('http')) { setPreview(imagePath); return; }
      const { data } = await supabase.storage.from('weekly-plan-media').createSignedUrl(imagePath, 3600);
      setPreview(data?.signedUrl || null);
    })();
  }, [imagePath]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${planId}/stories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('weekly-plan-media').upload(path, file, { contentType: file.type });
      if (error) throw error;
      setImagePath(path);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        plan_id: planId,
        day_of_week: dayOfWeek,
        story_type: storyType,
        title,
        description,
        image_url: imagePath,
      };
      if (story?.id) {
        await supabase.from('weekly_plan_stories').update(payload).eq('id', story.id);
      } else {
        await supabase.from('weekly_plan_stories').insert(payload);
      }
      toast.success('Ideia salva');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{story ? 'Editar ideia de story' : 'Nova ideia de story'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={storyType} onValueChange={setStoryType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Bastidor da produção" />
          </div>

          <div>
            <Label>Descrição / Ideia</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreva a ideia do story..." />
          </div>

          <div>
            <Label>Imagem (opcional)</Label>
            {preview ? (
              <div className="relative w-32 aspect-[9/16] mt-2 rounded overflow-hidden">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImagePath(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="mt-2 w-32 aspect-[9/16] border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5 mb-1" /><span className="text-xs">Upload</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
              </label>
            )}
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
