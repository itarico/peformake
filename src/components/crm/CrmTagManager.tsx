import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Tag, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props { clientId: string; }

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b'];

export default function CrmTagManager({ clientId }: Props) {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');

  const loadTags = async () => {
    const { data } = await supabase.from('crm_tags').select('*').eq('client_id', clientId).order('created_at');
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => { loadTags(); }, [clientId]);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('crm_tags').insert({ client_id: clientId, name: newName.trim(), color: newColor });
    if (error) {
      if (error.code === '23505') toast.error('Tag já existe');
      else toast.error('Erro: ' + error.message);
    } else { toast.success('Tag criada!'); setNewName(''); loadTags(); }
    setSaving(false);
  };

  const startEdit = (tag: any) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || '#3b82f6');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from('crm_tags').update({ name: editName.trim(), color: editColor }).eq('id', editingId);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Tag atualizada!'); setEditingId(null); loadTags(); }
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Excluir esta tag?')) return;
    await supabase.from('crm_lead_tags').delete().eq('tag_id', id);
    await supabase.from('crm_tags').delete().eq('id', id);
    toast.success('Tag removida');
    loadTags();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Etiquetas Personalizadas</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full border-2 transition-all ${newColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-md shrink-0" style={{ backgroundColor: newColor }} />
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da tag..." className="text-sm h-8"
            onKeyDown={e => { if (e.key === 'Enter') createTag(); }} />
          <Button size="sm" className="h-8 px-3 text-xs" onClick={createTag} disabled={saving || !newName.trim()}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>

        {/* List */}
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma tag criada.</p>
        ) : (
          <div className="space-y-1.5">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50">
                {editingId === tag.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex gap-0.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`h-4 w-4 rounded-full border ${editColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <Input value={editName} onChange={e => setEditName(e.target.value)}
                      className="text-sm h-7 flex-1" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={saveEdit}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm font-medium">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(tag)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteTag(tag.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
