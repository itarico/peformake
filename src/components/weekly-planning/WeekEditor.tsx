import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Trash2, Instagram, Film, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PostFormDialog } from './PostFormDialog';
import { StoryFormDialog } from './StoryFormDialog';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function WeekEditor({ planId, onSent }: { planId: string; onSent: () => void }) {
  const qc = useQueryClient();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [defaultDay, setDefaultDay] = useState<number>(0);

  const { data: plan } = useQuery({
    queryKey: ['wp-plan', planId],
    queryFn: async () => {
      const { data } = await supabase.from('weekly_plans').select('*').eq('id', planId).single();
      return data;
    },
  });

  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ['wp-posts', planId],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_plan_posts')
        .select('*')
        .eq('plan_id', planId)
        .order('position');
      return data || [];
    },
  });

  const { data: stories, refetch: refetchStories } = useQuery({
    queryKey: ['wp-stories', planId],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_plan_stories')
        .select('*')
        .eq('plan_id', planId)
        .order('day_of_week')
        .order('position');
      return data || [];
    },
  });

  const signedUrl = async (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = await supabase.storage.from('weekly-plan-media').createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const sendForApproval = async () => {
    if (!posts || posts.length === 0) {
      toast.error('Adicione ao menos um post antes de enviar');
      return;
    }
    await supabase
      .from('weekly_plans')
      .update({ status: 'pending_approval', sent_at: new Date().toISOString() })
      .eq('id', planId);
    toast.success('Enviado para aprovação do cliente');
    onSent();
  };

  const deletePost = async (id: string) => {
    if (!confirm('Excluir esse post?')) return;
    await supabase.from('weekly_plan_posts').delete().eq('id', id);
    refetchPosts();
  };

  const deleteStory = async (id: string) => {
    if (!confirm('Excluir essa ideia de story?')) return;
    await supabase.from('weekly_plan_stories').delete().eq('id', id);
    refetchStories();
  };

  if (!plan) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;

  const start = new Date(plan.week_start_date + 'T00:00:00');
  const end = addDays(start, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Semana de {format(start, "d 'de' MMM", { locale: ptBR })} a{' '}
            {format(end, "d 'de' MMM yyyy", { locale: ptBR })}
          </h2>
          <p className="text-sm text-muted-foreground">
            Status: <Badge variant="outline">{plan.status}</Badge>
          </p>
        </div>
        <Button onClick={sendForApproval} className="gap-2" disabled={plan.status !== 'draft'}>
          <Send className="h-4 w-4" /> Enviar para aprovação
        </Button>
      </div>

      {/* FEED PREVIEW GRID */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Instagram className="h-5 w-5" /> Feed da semana
          </CardTitle>
          <Button
            size="sm"
            onClick={() => { setEditingPost(null); setPostDialogOpen(true); }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar post
          </Button>
        </CardHeader>
        <CardContent>
          {!posts || posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum post ainda. Adicione o primeiro.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1 max-w-md mx-auto">
              {posts.map((p, idx) => (
                <PostThumb
                  key={p.id}
                  post={p}
                  onEdit={() => { setEditingPost(p); setPostDialogOpen(true); }}
                  onDelete={() => deletePost(p.id)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STORIES BY DAY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5" /> Ideias de Stories por dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day, i) => {
            const dayStories = (stories || []).filter((s) => s.day_of_week === i);
            return (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{day}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingStory(null); setDefaultDay(i); setStoryDialogOpen(true); }}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" /> Ideia
                  </Button>
                </div>
                {dayStories.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sem ideias.</p>
                ) : (
                  <div className="space-y-2">
                    {dayStories.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-2 p-2 bg-muted/30 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.title || s.story_type}</p>
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingStory(s); setStoryDialogOpen(true); }}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteStory(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PostFormDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        planId={planId}
        post={editingPost}
        nextPosition={posts?.length || 0}
        onSaved={() => refetchPosts()}
      />
      <StoryFormDialog
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        planId={planId}
        story={editingStory}
        defaultDay={defaultDay}
        onSaved={() => refetchStories()}
      />
    </div>
  );
}

function PostThumb({ post, onEdit, onDelete, index }: any) {
  const [url, setUrl] = useState<string | null>(null);
  useState(() => {
    const first = post.image_urls?.[0];
    if (!first) return;
    if (first.startsWith('http')) { setUrl(first); return; }
    supabase.storage.from('weekly-plan-media').createSignedUrl(first, 3600).then((r) => {
      setUrl(r.data?.signedUrl || null);
    });
  });

  return (
    <div className="relative aspect-square bg-muted overflow-hidden group cursor-pointer" onClick={onEdit}>
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
      )}
      {post.post_type === 'reels' && (
        <Film className="absolute top-1 right-1 h-4 w-4 text-white drop-shadow" />
      )}
      {post.image_urls?.length > 1 && (
        <div className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
          {post.image_urls.length}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
