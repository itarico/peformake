import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send, QrCode, RefreshCw, Wifi, WifiOff, Loader2, MessageSquare,
  Paperclip, ImageIcon, Mic, MicOff, FileText, Download, Check, CheckCheck,
  Search, X, CheckCircle2, XCircle, ThumbsUp, DollarSign,
  Edit2, TrendingUp, Package, Tag, Plus, Zap, StickyNote, User,
  Video, Brain, Calendar, ArrowLeft, MoreVertical, Globe
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CrmLeadProfile from './CrmLeadProfile';
import CrmScheduler from './CrmScheduler';
import CrmQuoteGenerator from './CrmQuoteGenerator';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props { clientId: string; preSelectedLeadId?: string | null; onLeadSelected?: () => void; }

interface ChatMessage {
  id: string;
  lead_id: string;
  client_id: string;
  direction: string;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  created_at: string;
  wasender_message_id?: string | null;
  frontend_message_id?: string | null;
  optimistic?: boolean;
  _frontendId?: string;
}

function getPhoneKey(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  // Normalize: always strip country code 55 for comparison
  const without55 = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  // Also strip 9th digit for landlines vs mobile matching (BR quirk)
  return without55;
}

function getMessageFileName(msg: ChatMessage) {
  const contentName = (msg.content || '').trim();
  if (contentName && /\.[a-z0-9]{2,5}$/i.test(contentName)) return contentName;

  try {
    if (msg.media_url) {
      const url = new URL(msg.media_url);
      const fileName = decodeURIComponent(url.pathname.split('/').pop() || '');
      if (fileName) return fileName;
    }
  } catch {
    // ignore malformed URLs
  }

  const fallbackExt: Record<string, string> = {
    image: 'jpg',
    audio: 'ogg',
    video: 'mp4',
    document: 'pdf',
  };

  return `arquivo-${msg.id}.${fallbackExt[msg.message_type] || 'bin'}`;
}

function formatMessageTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDayLabel(date: string) {
  const d = new Date(date);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'sending') return <Loader2 className="h-3 w-3 animate-spin opacity-60" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 opacity-70" />;
  return <Check className="h-3 w-3 opacity-60" />;
}

function ContactAvatar({ name, phone, avatarUrl, size = 'md' }: { name?: string | null; phone?: string; avatarUrl?: string | null; size?: 'sm' | 'md' }) {
  const label = name || phone || '?';
  const initial = label[0].toUpperCase();
  const cls = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const textCls = size === 'sm' ? 'text-xs' : 'text-sm';
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=random&color=fff&size=64&bold=true`;
  return (
    <Avatar className={`${cls} shrink-0`}>
      <AvatarImage src={avatarUrl || fallbackAvatarUrl} alt={label} />
      <AvatarFallback className={`${textCls} font-semibold bg-primary/10 text-primary`}>{initial}</AvatarFallback>
    </Avatar>
  );
}

// ─── Blob download helper (cross-origin safe) ────────────────────────────────
async function downloadBlob(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, highlight }: { msg: ChatMessage; highlight?: boolean }) {
  const isOut = msg.direction === 'outbound';
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const fileName = getMessageFileName(msg);

  const renderContent = () => {
    // Unavailable media fallback
    if (msg.message_type !== 'text' && !msg.media_url) {
      const icons: Record<string, typeof ImageIcon> = { image: ImageIcon, audio: Mic, video: Video, document: FileText };
      const labels: Record<string, string> = { image: 'Imagem', audio: 'Áudio', video: 'Vídeo', document: 'Documento' };
      const Icon = icons[msg.message_type] || FileText;
      return (
        <div className="flex flex-col items-center gap-1.5 py-2 px-3 opacity-70">
          <Icon className="h-6 w-6" />
          <span className="text-xs">{labels[msg.message_type] || 'Mídia'} indisponível</span>
          {msg.content && !['📷 Imagem', '🎤 Áudio', '🎬 Vídeo', '📄 Documento'].includes(msg.content) && (
            <p className="text-xs mt-1 whitespace-pre-wrap break-words opacity-80">{msg.content}</p>
          )}
        </div>
      );
    }

    if (msg.message_type === 'image' && msg.media_url) {
      const caption = msg.content && !['📷 Imagem', '(mídia)'].includes(msg.content) ? msg.content : null;
      if (!imgError) {
        return (
          <div>
            <img
              src={msg.media_url}
              alt="imagem"
              className="max-w-[240px] max-h-[320px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
              onError={() => setImgError(true)}
              onClick={() => setLightbox(true)}
              loading="lazy"
            />
            {lightbox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightbox(false)}>
                <img src={msg.media_url!} alt="ampliada" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2" onClick={() => setLightbox(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {caption && <p className="text-sm mt-1 whitespace-pre-wrap break-words">{caption}</p>}
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button type="button" className="underline underline-offset-2" onClick={() => setLightbox(true)}>
                Ver completa
              </button>
              <button onClick={() => downloadBlob(msg.media_url!, fileName)} className="inline-flex items-center gap-1 underline underline-offset-2">
                <Download className="h-3.5 w-3.5" /> Baixar
              </button>
            </div>
          </div>
        );
      }
      return (
        <button onClick={() => downloadBlob(msg.media_url!, fileName)} className="flex items-center gap-2 hover:opacity-80">
          <ImageIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm underline">Ver imagem</span>
          <Download className="h-4 w-4 shrink-0" />
        </button>
      );
    }

    if (msg.message_type === 'audio' && msg.media_url) {
      return (
        <div className="min-w-[220px] space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 shrink-0 opacity-70" />
            <audio controls src={msg.media_url} className="w-full h-8" preload="metadata" />
          </div>
          <button onClick={() => downloadBlob(msg.media_url!, fileName)} className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
            <Download className="h-3.5 w-3.5" /> Baixar áudio
          </button>
        </div>
      );
    }

    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="space-y-2">
          <video controls src={msg.media_url} className="max-w-[280px] max-h-[360px] rounded-lg" preload="metadata" />
          <div className="flex items-center gap-3 text-xs">
            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Abrir</a>
            <button onClick={() => downloadBlob(msg.media_url!, fileName)} className="inline-flex items-center gap-1 underline underline-offset-2">
              <Download className="h-3.5 w-3.5" /> Baixar vídeo
            </button>
          </div>
        </div>
      );
    }

    if (msg.message_type === 'document' && msg.media_url) {
      return (
        <button onClick={() => downloadBlob(msg.media_url!, fileName)} className="flex items-center gap-2 hover:opacity-80">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="text-sm underline truncate max-w-[160px]">{msg.content && !['📄 Documento', '(mídia)'].includes(msg.content) ? msg.content : fileName || 'arquivo'}</span>
          <Download className="h-4 w-4 shrink-0" />
        </button>
      );
    }

    return <p className="text-sm whitespace-pre-wrap break-words">{msg.content || '(mídia)'}</p>;
  };

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[72%] rounded-2xl px-3 py-2 shadow-sm transition-all ${
        isOut ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border rounded-bl-sm'
      } ${msg.optimistic ? 'opacity-60' : ''} ${highlight ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background animate-pulse' : ''}`}>
        {highlight && (
          <div className="mb-1 -mt-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Mensagem identificada como venda
          </div>
        )}
        {renderContent()}
        <div className={`flex items-center gap-1 mt-1 justify-end ${isOut ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          <span className="text-[10px]">{formatMessageTime(msg.created_at)}</span>
          {isOut && <StatusIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

// ─── Source Selector ──────────────────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { value: 'ads', label: '📢 Ads', color: 'bg-blue-100 text-blue-700' },
  { value: 'organic', label: '🌱 Orgânico', color: 'bg-green-100 text-green-700' },
  { value: 'referral', label: '🤝 Indicação', color: 'bg-purple-100 text-purple-700' },
  { value: 'whatsapp', label: '💬 WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'website', label: '🌐 Site', color: 'bg-orange-100 text-orange-700' },
  { value: 'gastro_form', label: '🍽️ Formulário', color: 'bg-amber-100 text-amber-700' },
  { value: 'instagram', label: '📸 Instagram', color: 'bg-pink-100 text-pink-700' },
  { value: 'facebook', label: '👤 Facebook', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'google', label: '🔍 Google', color: 'bg-red-100 text-red-700' },
  { value: 'other', label: '📌 Outro', color: 'bg-gray-100 text-gray-700' },
];

function SourceSelector({ lead, onUpdate }: { lead: any; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false);
  const currentSource = lead?.source || '';
  const sourceInfo = SOURCE_OPTIONS.find(s => s.value === currentSource?.toLowerCase());

  const handleChange = async (value: string) => {
    setSaving(true);
    await supabase.from('crm_leads').update({ source: value }).eq('id', lead.id);
    onUpdate();
    setSaving(false);
    toast.success('Origem atualizada!');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className={`text-xs h-7 px-2 gap-1 ${sourceInfo ? sourceInfo.color : ''}`}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
          {sourceInfo ? sourceInfo.label : 'Origem'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <p className="text-xs font-semibold px-2 py-1">Origem do Lead</p>
        <div className="space-y-0.5 max-h-52 overflow-y-auto">
          {SOURCE_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => handleChange(s.value)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center gap-1.5 ${currentSource === s.value ? 'bg-accent font-medium' : ''}`}
            >
              {s.label}
            </button>
          ))}
          {currentSource && (
            <button
              onClick={async () => { setSaving(true); await supabase.from('crm_leads').update({ source: null } as any).eq('id', lead.id); onUpdate(); setSaving(false); }}
              className="w-full text-left px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              ✕ Remover origem
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── AI Result Panel ──────────────────────────────────────────────────────────
function AIResultPanel({ result, onClose }: { result: any; onClose: () => void }) {
  if (!result) return null;
  return (
    <div className="mx-4 mb-2 p-3 bg-accent/60 border rounded-xl text-xs space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-semibold flex items-center gap-1">Análise de IA</span>
        <button onClick={onClose}><X className="h-3 w-3" /></button>
      </div>
      {result.summary && <p className="text-muted-foreground">{result.summary}</p>}
      <div className="flex flex-wrap gap-2">
        {result.detected_stage && (
          <Badge variant="outline" className="text-[10px]">
            <TrendingUp className="h-2.5 w-2.5 mr-1" />Etapa: {result.detected_stage}
          </Badge>
        )}
        {result.interested_product && (
          <Badge variant="outline" className="text-[10px]">
            <Package className="h-2.5 w-2.5 mr-1" />{result.interested_product}
          </Badge>
        )}
        {result.detected_sale_value && (
          <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
            <DollarSign className="h-2.5 w-2.5 mr-1" />R$ {Number(result.detected_sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Badge>
        )}
      </div>
      {result.notes && <p className="text-muted-foreground/80 italic">{result.notes}</p>}
    </div>
  );
}

// ─── Tag Manager Popover ──────────────────────────────────────────────────────
function TagManager({ lead, onUpdate }: { lead: any; onUpdate: () => void }) {
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const currentTags: string[] = lead?.tags || [];

  const PRESET_TAGS = ['🔥 Quente', '❄️ Frio', '⏳ Aguardando', '💎 VIP', '🔄 Retorno', '📞 Ligar', '🚫 Não Incomodar'];

  const addTag = async (tag: string) => {
    if (!tag.trim() || currentTags.includes(tag.trim())) return;
    setSaving(true);
    const updated = [...currentTags, tag.trim()];
    await supabase.from('crm_leads').update({ tags: updated }).eq('id', lead.id);
    onUpdate();
    setNewTag('');
    setSaving(false);
  };

  const removeTag = async (tag: string) => {
    const updated = currentTags.filter(t => t !== tag);
    await supabase.from('crm_leads').update({ tags: updated }).eq('id', lead.id);
    onUpdate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1">
          <Tag className="h-3 w-3" />
          {currentTags.length > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1">{currentTags.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-semibold">Etiquetas</p>
          
          {/* Current tags */}
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Preset tags */}
          <div className="flex flex-wrap gap-1">
            {PRESET_TAGS.filter(t => !currentTags.includes(t)).map(tag => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="text-[10px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Custom tag */}
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              placeholder="Nova etiqueta..."
              className="text-xs h-7"
              onKeyDown={e => { if (e.key === 'Enter') addTag(newTag); }}
            />
            <Button size="sm" className="h-7 px-2" onClick={() => addTag(newTag)} disabled={saving || !newTag.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Quick Replies Popover ────────────────────────────────────────────────────
function QuickReplies({ clientId, onSelect }: { clientId: string; onSelect: (text: string) => void }) {
  const [replies, setReplies] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReplies = async () => {
    const { data } = await supabase.from('crm_quick_replies').select('*').eq('client_id', clientId).order('created_at');
    setReplies(data || []);
  };

  useEffect(() => { loadReplies(); }, [clientId]);

  const addReply = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setLoading(true);
    await supabase.from('crm_quick_replies').insert({ client_id: clientId, title: newTitle.trim(), content: newContent.trim() });
    setNewTitle(''); setNewContent(''); setShowAdd(false);
    await loadReplies();
    setLoading(false);
  };

  const deleteReply = async (id: string) => {
    await supabase.from('crm_quick_replies').delete().eq('id', id);
    loadReplies();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" title="Respostas rápidas">
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Respostas Rápidas</p>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3 w-3 mr-1" /> Nova
            </Button>
          </div>

          {showAdd && (
            <div className="space-y-1.5 p-2 bg-muted rounded-lg">
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título (ex: Saudação)" className="text-xs h-7" />
              <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Conteúdo da mensagem..." className="text-xs min-h-[60px]" />
              <Button size="sm" className="w-full h-7 text-xs" onClick={addReply} disabled={loading}>Salvar</Button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {replies.length === 0 && !showAdd && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhuma resposta salva. Clique em "+ Nova" para criar.</p>
            )}
            {replies.map(r => (
              <button
                key={r.id}
                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors group"
                onClick={() => onSelect(r.content)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{r.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteReply(r.id); }}
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{r.content}</p>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Internal Notes Panel ─────────────────────────────────────────────────────
function InternalNotes({ lead, onUpdate }: { lead: any; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(lead?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNotes(lead?.notes || ''); }, [lead?.notes]);

  const save = async () => {
    setSaving(true);
    await supabase.from('crm_leads').update({ notes }).eq('id', lead.id);
    onUpdate();
    setEditing(false);
    setSaving(false);
    toast.success('Notas salvas!');
  };

  if (!editing && !lead?.notes) {
    return (
      <button onClick={() => setEditing(true)} className="mx-4 mb-1 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
        <StickyNote className="h-3 w-3" /> Adicionar nota interna
      </button>
    );
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="mx-4 mb-1 px-2.5 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-left w-fit max-w-full">
        <div className="flex items-center gap-1 text-[10px] text-yellow-700 dark:text-yellow-400 font-medium mb-0.5">
          <StickyNote className="h-2.5 w-2.5" /> Nota interna
        </div>
        <p className="text-[11px] text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap line-clamp-2">{lead.notes}</p>
      </button>
    );
  }

  return (
    <div className="mx-4 mb-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas internas (não enviadas ao cliente)..."
        className="text-xs min-h-[50px] bg-transparent border-0 p-0 resize-none focus-visible:ring-0"
        autoFocus
      />
      <div className="flex gap-1 mt-1 justify-end">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button size="sm" className="h-6 text-[10px]" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadToStorage(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `outbound/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('crm-media').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw new Error(`Upload falhou: ${error.message}`);
  const { data: urlData } = supabase.storage.from('crm-media').getPublicUrl(path);
  return urlData.publicUrl;
}

async function postCrmWasender(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };

  // Pass staff or CRM portal auth headers
  const staffId = localStorage.getItem('staff_session_id');
  if (staffId) headers['x-staff-id'] = staffId;
  const crmClientId = localStorage.getItem('crm_client_id');
  if (crmClientId) headers['x-client-id'] = crmClientId;

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-wasender`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || result?.message || `Erro ${response.status} ao chamar CRM`);
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  negotiating: 'Em Negociação',
  qualified: 'Qualificado',
  unqualified: 'Não Qualificado',
  sale_completed: 'Venda Realizada',
  sale_lost: 'Venda Perdida',
};

const MONEY_REGEX = /R\$\s*[\d.,]+|[\d.,]+\s*reais?|valor\s+de\s+R\$?\s*[\d.,]+/i;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmChat({ clientId, preSelectedLeadId, onLeadSelected }: Props) {
  const isMobile = useIsMobile();
  const [connection, setConnection] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingCount, setSendingCount] = useState(0);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [search, setSearch] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [videoPreview, setVideoPreview] = useState<{ file: File; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saleDialog, setSaleDialog] = useState(false);
  const [saleValue, setSaleValue] = useState('');
  const [saleMode, setSaleMode] = useState<'new' | 'add' | 'replace'>('new');
  const [editingSale, setEditingSale] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showSaleHint, setShowSaleHint] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [leadSummary, setLeadSummary] = useState<any>(null);
  const [leadSales, setLeadSales] = useState<any[]>([]);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState<any>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [contactPhotos, setContactPhotos] = useState<Record<string, string>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMsgs, setLoadingMoreMsgs] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const lastSeenLeadRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const atBottomRef = useRef(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pendingMsgRef = useRef<Map<string, string | null>>(new Map());
  const notifAudioRef = useRef<HTMLAudioElement | null>(null);
  const isConnected = connection?.status === 'connected';

  // Notification sound setup
  useEffect(() => {
    notifAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdGKCjYyHfHF0eIKNkIx/cW90fYaTkYqAdG91fIOSkY2Dc3B1fISUk42EdnB3fIOTkIp/c3B0eYGPkIuAdnF1eYCOj4p+dHF0eICNjop/dXN2eYGMjol+dXR3eYGKjIh+dXR3eYCKi4d9dXR3eICJiod9dXR3eICJiod9dXR3eA==');
    notifAudioRef.current.volume = 0.3;
  }, []);

  // ── Connection + periodic refresh ─────────────────────────────────────────
  const refreshConnection = useCallback(async () => {
    const { data } = await supabase
      .from('crm_whatsapp_connections')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    setConnection(data);
    return data;
  }, [clientId]);

  const verifyLiveStatus = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('crm-wasender', {
        body: { action: 'check_status', client_id: clientId },
      });
      const apiStatus = (data?.data?.status || '').toUpperCase();
      const resolvedStatus = data?.resolved_status?.toUpperCase?.() || apiStatus;
      const isNowConnected = resolvedStatus === 'CONNECTED' || apiStatus === 'CONNECTED';
      if (isNowConnected) {
        setConnection((prev: any) => prev ? { ...prev, status: 'connected' } : prev);
        setQrCode(null); setPollingStatus(false);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
      if (data?.auto_repaired) {
        toast.success('Sessão WhatsApp reparada automaticamente!');
        await refreshConnection();
      }
      return { connected: isNowConnected, data };
    } catch { return { connected: false, data: null }; }
  }, [clientId, refreshConnection]);

  // Load products for catalog send
  useEffect(() => {
    supabase.from('client_products').select('name, price, description, image_url').eq('client_id', clientId).eq('is_active', true).limit(20)
      .then(({ data }) => setProducts(data || []));
  }, [clientId]);

  useEffect(() => {
    // Auto-verify on mount: always check live status immediately
    refreshConnection().then(async (conn) => {
      if (conn) {
        // Always verify live status on entry to ensure accurate connection state
        const result = await verifyLiveStatus();
        if (!result.connected && conn.status === 'connected') {
          // DB says connected but API says no — force DB refresh
          await refreshConnection();
        }
      }
    });
    const dbInterval = setInterval(refreshConnection, 60000);
    const liveInterval = setInterval(verifyLiveStatus, 60000);
    const ch = supabase.channel(`conn-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_whatsapp_connections', filter: `client_id=eq.${clientId}` }, (p) => {
        setConnection(p.new);
        if ((p.new as any)?.status === 'connected') {
          setQrCode(null); setPollingStatus(false);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        }
      }).subscribe();
    return () => { clearInterval(dbInterval); clearInterval(liveInterval); supabase.removeChannel(ch); if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [clientId, refreshConnection, verifyLiveStatus]);

  const loadContactPhotos = useCallback(async () => {
    if (!isConnected || leads.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('crm-wasender', {
        body: { action: 'fetch_chats', client_id: clientId },
      });

      if (error) return;

      const rawItems = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.contacts)
          ? data.contacts
          : Array.isArray(data?.chats)
            ? data.chats
            : Array.isArray(data)
              ? data
              : [];

      if (rawItems.length === 0) return;

      const leadKeys = new Set(leads.map((lead) => getPhoneKey(lead.phone)).filter(Boolean));
      const nextPhotos: Record<string, string> = {};

      rawItems.forEach((item: any) => {
        const rawPhone = item.phone || item.phone_number || item.number || item.remoteJid || item.jid || item.id || item.chatId;
        const photo = item.profilePictureUrl || item.profile_picture_url || item.profilePicUrl || item.avatar || item.picture || item.image || item.imgUrl;
        const digits = getPhoneKey(String(rawPhone || '').split('@')[0]);

        if (digits && photo && leadKeys.has(digits)) {
          nextPhotos[digits] = photo;
        }
      });

      if (Object.keys(nextPhotos).length > 0) {
        setContactPhotos((prev) => ({ ...prev, ...nextPhotos }));
      }
    } catch {
      // ignore optional avatar sync failures
    }
  }, [clientId, isConnected, leads]);

  useEffect(() => {
    loadContactPhotos();
  }, [loadContactPhotos]);

  // ── Leads ──────────────────────────────────────────────────────────────────
  const selectedLeadIdRef = useRef<string | null>(null);
  useEffect(() => { selectedLeadIdRef.current = selectedLead?.id || null; }, [selectedLead?.id]);

  const loadLeads = useCallback(async () => {
    // Performance: fetch leads WITHOUT nested messages to avoid heavy payload
    const { data } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('client_id', clientId)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (!data) return;
    // Deduplicate by normalized phone (keep the one with most recent message)
    const seen = new Map<string, any>();
    for (const lead of data) {
      const key = getPhoneKey(lead.phone);
      if (!seen.has(key) || new Date(lead.last_message_at || 0) > new Date(seen.get(key).last_message_at || 0)) {
        seen.set(key, lead);
      }
    }
    const deduped = Array.from(seen.values());

    // Fetch last message for each lead in a single lightweight query
    const leadIds = deduped.map(l => l.id);
    if (leadIds.length > 0) {
      const { data: lastMsgs } = await supabase
        .from('crm_messages')
        .select('lead_id, content, direction, created_at, message_type')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(leadIds.length * 2);
      
      // Group by lead_id, keep only the first (most recent)
      const lastMsgMap = new Map<string, any>();
      for (const msg of (lastMsgs || [])) {
        if (!lastMsgMap.has(msg.lead_id)) {
          lastMsgMap.set(msg.lead_id, msg);
        }
      }
      // Attach last message to each lead
      for (const lead of deduped) {
        const lastMsg = lastMsgMap.get(lead.id);
        lead.crm_messages = lastMsg ? [lastMsg] : [];
      }
    }

    setLeads(deduped);
    const sid = selectedLeadIdRef.current;
    if (sid) {
      const updated = deduped.find((l: any) => l.id === sid);
      if (updated) setSelectedLead((prev: any) => ({ ...prev, ...updated }));
    }
  }, [clientId]);

  useEffect(() => {
    loadLeads();
    const ch = supabase.channel(`leads-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `client_id=eq.${clientId}` }, () => loadLeads()).subscribe();
    // Global inbound message listener for unread badges + sound
    const globalCh = supabase.channel(`global-msgs-${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `client_id=eq.${clientId}` }, (p) => {
        const msg = p.new as ChatMessage;
        if (msg.direction === 'inbound' && msg.lead_id !== lastSeenLeadRef.current) {
          setUnreadCounts(prev => ({ ...prev, [msg.lead_id]: (prev[msg.lead_id] || 0) + 1 }));
          try { notifAudioRef.current?.play().catch(() => {}); } catch {}
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(globalCh); };
  }, [clientId, loadLeads]);

  // Pre-select lead from external navigation (e.g. "Ver Conversa" from sales)
  useEffect(() => {
    if (preSelectedLeadId && leads.length > 0) {
      const lead = leads.find(l => l.id === preSelectedLeadId);
      if (lead) {
        setSelectedLead(lead);
        setAiResult(null);
        onLeadSelected?.();
      }
    }
  }, [preSelectedLeadId, leads]);

  // ── Load lead details when selected ────────────────────────────────────────
  useEffect(() => {
    if (!selectedLead) { setLeadSummary(null); setLeadSales([]); setPendingSales([]); setLeadScore(null); return; }
    // Load summary
    supabase.from('crm_lead_summaries').select('*').eq('lead_id', selectedLead.id).order('analyzed_at', { ascending: false }).limit(1).then(({ data }) => {
      setLeadSummary(data?.[0] || null);
    });
    // Load sales (confirmadas + pendentes)
    supabase.from('crm_sales').select('*').eq('lead_id', selectedLead.id).order('sale_date', { ascending: false }).then(({ data }) => {
      const all = data || [];
      setLeadSales(all.filter((s: any) => s.is_confirmed));
      setPendingSales(all.filter((s: any) => !s.is_confirmed));
    });
    // Load score
    supabase.from('crm_lead_scores').select('*').eq('lead_id', selectedLead.id).limit(1).then(({ data }) => {
      setLeadScore(data?.[0] || null);
    });
  }, [selectedLead?.id]);

  // ── Handlers para venda pendente ──────────────────────────────────────────
  const reloadSalesState = async (leadId: string) => {
    const { data } = await supabase.from('crm_sales').select('*').eq('lead_id', leadId).order('sale_date', { ascending: false });
    const all = data || [];
    setLeadSales(all.filter((s: any) => s.is_confirmed));
    setPendingSales(all.filter((s: any) => !s.is_confirmed));
  };

  const confirmPendingSale = async (sale: any) => {
    if (!selectedLead) return;
    const newTotal = (selectedLead.sale_value || 0) + Number(sale.value);
    await supabase.from('crm_sales').update({ is_confirmed: true } as any).eq('id', sale.id);
    await supabase.from('crm_leads').update({
      status: 'sale_completed',
      sale_value: newTotal,
      sale_date: new Date().toISOString(),
    }).eq('id', selectedLead.id);
    setSelectedLead((l: any) => ({ ...l, status: 'sale_completed', sale_value: newTotal }));
    fireMetaConversion(selectedLead.id, 'sale_completed', Number(sale.value));
    await reloadSalesState(selectedLead.id);
    loadLeads();
    toast.success('✅ Venda confirmada e contabilizada!');
  };

  const dismissPendingSale = async (saleId: string) => {
    await supabase.from('crm_sales').delete().eq('id', saleId);
    if (selectedLead) await reloadSalesState(selectedLead.id);
    toast.info('Sugestão de venda descartada');
  };

  const scrollToMessage = (msgId: string) => {
    setHighlightedMsgId(msgId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        toast.info('Mensagem fora do histórico carregado. Clique em "Carregar mensagens anteriores".');
      }
    }, 80);
    setTimeout(() => setHighlightedMsgId(null), 4000);
  };


  // ── Messages + Realtime dedup ─────────────────────────────────────────────
  const MSG_PAGE_SIZE = 50;

  const loadOlderMessages = useCallback(async () => {
    if (!selectedLead || loadingMoreMsgs || !hasMoreMessages) return;
    setLoadingMoreMsgs(true);
    const oldestMsg = messages[0];
    if (!oldestMsg) { setLoadingMoreMsgs(false); return; }
    const { data } = await supabase
      .from('crm_messages').select('*')
      .eq('lead_id', selectedLead.id)
      .lt('created_at', oldestMsg.created_at)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE);
    if (data && data.length > 0) {
      setMessages(prev => [...data.reverse() as ChatMessage[], ...prev]);
      setHasMoreMessages(data.length >= MSG_PAGE_SIZE);
    } else {
      setHasMoreMessages(false);
    }
    setLoadingMoreMsgs(false);
  }, [selectedLead?.id, messages, loadingMoreMsgs, hasMoreMessages]);

  useEffect(() => {
    if (!selectedLead) { setMessages([]); setHasMoreMessages(false); return; }
    lastSeenLeadRef.current = selectedLead.id;
    // Clear unread for this lead
    setUnreadCounts(prev => { const n = { ...prev }; delete n[selectedLead.id]; return n; });
    // Load last N messages (paginated)
    supabase.from('crm_messages').select('*')
      .eq('lead_id', selectedLead.id)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE)
      .then(({ data }) => {
        const msgs = (data || []).reverse() as ChatMessage[];
        setMessages(msgs);
        setHasMoreMessages((data || []).length >= MSG_PAGE_SIZE);
      });
    const ch = supabase.channel(`msgs-${selectedLead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `lead_id=eq.${selectedLead.id}` }, (p) => {
        const incoming = p.new as ChatMessage & { frontend_message_id?: string };
        setMessages(prev => {
          if (prev.some(m => !m.optimistic && m.id === incoming.id)) return prev;
          if (incoming.direction === 'outbound' && incoming.frontend_message_id) {
            const matchIdx = prev.findIndex(m => m.optimistic && m._frontendId === incoming.frontend_message_id);
            if (matchIdx >= 0) {
              const updated = [...prev]; updated[matchIdx] = { ...incoming, optimistic: false };
              pendingMsgRef.current.delete(incoming.frontend_message_id); return updated;
            }
          }
          if (incoming.direction === 'outbound' && incoming.wasender_message_id) {
            const matchIdx = prev.findIndex(m => m.optimistic && m.wasender_message_id === incoming.wasender_message_id);
            if (matchIdx >= 0) {
              const updated = [...prev]; updated[matchIdx] = { ...incoming, optimistic: false }; return updated;
            }
            for (const [fid, wid] of pendingMsgRef.current.entries()) {
              if (wid && wid === incoming.wasender_message_id) {
                const matchIdx2 = prev.findIndex(m => m._frontendId === fid);
                if (matchIdx2 >= 0) {
                  const updated = [...prev]; updated[matchIdx2] = { ...incoming, optimistic: false };
                  pendingMsgRef.current.delete(fid); return updated;
                }
              }
            }
          }
          if (incoming.direction === 'outbound') {
            const matchIdx = prev.findIndex(m => m.optimistic && m.direction === 'outbound' && m.message_type === incoming.message_type && Math.abs(new Date(m.created_at).getTime() - new Date(incoming.created_at).getTime()) < 60000);
            if (matchIdx >= 0) {
              const updated = [...prev]; updated[matchIdx] = { ...incoming, optimistic: false }; return updated;
            }
          }
          // Play notification sound for inbound messages
          if (incoming.direction === 'inbound') {
            try { notifAudioRef.current?.play().catch(() => {}); } catch {}
          }
          return [...prev, incoming];
        });
        loadLeads();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crm_messages', filter: `lead_id=eq.${selectedLead.id}` }, (p) => {
        const updated = p.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...updated, optimistic: false } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedLead?.id, loadLeads]);

  // Auto scroll
  useEffect(() => {
    if (atBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Money detection
  useEffect(() => { setShowSaleHint(MONEY_REGEX.test(newMessage)); }, [newMessage]);
  useEffect(() => {
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    if (lastInbound?.content && MONEY_REGEX.test(lastInbound.content)) setShowSaleHint(true);
  }, [messages]);

  // ── QR / Polling ──────────────────────────────────────────────────────────
  const startStatusPolling = useCallback((sessionId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingStatus(true);
    const poll = async () => {
      try {
        const { data } = await supabase.functions.invoke('crm-wasender', { body: { action: 'check_status', session_id: sessionId, client_id: clientId } });
        if ((data?.data?.status || '').toUpperCase() === 'CONNECTED') {
          setQrCode(null); setPollingStatus(false);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          const { data: conn } = await supabase.from('crm_whatsapp_connections').select('*').eq('client_id', clientId).maybeSingle();
          if (conn) setConnection(conn);
        }
      } catch { /* ignore */ }
    };
    pollingRef.current = setInterval(poll, 4000);
    poll();
  }, [clientId]);

  const fetchQrCode = async () => {
    if (!connection?.session_id) return;
    setLoadingQr(true);
    try {
      const { connected } = await verifyLiveStatus();
      if (connected) { toast.success('WhatsApp já está conectado!'); setLoadingQr(false); return; }
      const { data: cd } = await supabase.functions.invoke('crm-wasender', { body: { action: 'connect', session_id: connection.session_id, client_id: clientId } });
      if (cd?.already_connected) { toast.success('WhatsApp já conectado!'); await refreshConnection(); setLoadingQr(false); return; }
      const qr1 = cd?.data?.qrCode || cd?.data?.qr_code || cd?.data?.qr;
      if (qr1) { setQrCode(qr1); startStatusPolling(cd?.resolved_session_id || connection.session_id); setLoadingQr(false); return; }
      if (cd?.data?.status === 'CONNECTED') { toast.success('WhatsApp já conectado!'); await refreshConnection(); setLoadingQr(false); return; }
      await new Promise(r => setTimeout(r, 2000));
      const { data } = await supabase.functions.invoke('crm-wasender', { body: { action: 'get_qr_code', session_id: cd?.resolved_session_id || connection.session_id, client_id: clientId } });
      if (data?.already_connected) { toast.success('WhatsApp já conectado!'); await refreshConnection(); setLoadingQr(false); return; }
      const qr = data?.data?.qrCode || data?.data?.qr_code || data?.data?.qr;
      if (qr) { setQrCode(qr); startStatusPolling(data?.resolved_session_id || connection.session_id); }
      else toast.error('QR Code não disponível. Tente novamente.');
    } catch { toast.error('Erro ao gerar QR Code'); }
    setLoadingQr(false);
  };

  // ── Send text ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedLead || !isConnected) return;
    const textToSend = newMessage.trim();
    setNewMessage('');
    setSendingCount(c => c + 1);
    atBottomRef.current = true;
    const frontendId = generateId();
    const optimistic: ChatMessage = {
      id: `opt-${frontendId}`, _frontendId: frontendId, lead_id: selectedLead.id, client_id: clientId,
      direction: 'outbound', message_type: 'text', content: textToSend, media_url: null, status: 'sending',
      created_at: new Date().toISOString(), optimistic: true, wasender_message_id: null,
    };
    pendingMsgRef.current.set(frontendId, null);
    setMessages(prev => [...prev, optimistic]);
    // Queue sends to avoid 429 rate limit (1 msg / 5s on Wasender)
    const phone = selectedLead.phone;
    sendQueueRef.current = sendQueueRef.current.then(async () => {
      try {
        const result = await postCrmWasender({
          action: 'send_message', client_id: clientId, to: phone, text: textToSend, frontend_message_id: frontendId,
        });
        const wasenderId = result?.wasender_id || null;
        pendingMsgRef.current.set(frontendId, wasenderId);
        setMessages(prev => prev.map(m => m._frontendId === frontendId ? { ...m, status: 'sent', wasender_message_id: wasenderId } : m));
      } catch (e: any) {
        toast.error('Erro ao enviar: ' + (e.message || 'tente novamente'));
        setMessages(prev => prev.filter(m => m._frontendId !== frontendId));
        pendingMsgRef.current.delete(frontendId);
      }
      setSendingCount(c => Math.max(0, c - 1));
    });
  };

  // ── Send media ────────────────────────────────────────────────────────────
  const sendMedia = async (file: File, type: 'image' | 'audio' | 'document' | 'video') => {
    if (!selectedLead) return;
    setUploadingMedia(true);
    setImagePreview(null);
    setVideoPreview(null);
    const frontendId = generateId();
    const optimistic: ChatMessage = {
      id: `opt-${frontendId}`, _frontendId: frontendId, lead_id: selectedLead.id, client_id: clientId,
      direction: 'outbound', message_type: type, content: type === 'document' || type === 'audio' ? file.name : null,
      media_url: URL.createObjectURL(file),
      status: 'sending', created_at: new Date().toISOString(), optimistic: true, wasender_message_id: null,
    };
    pendingMsgRef.current.set(frontendId, null);
    setMessages(prev => [...prev, optimistic]);
    atBottomRef.current = true;
    try {
      const publicUrl = await uploadToStorage(file);
      const result = await postCrmWasender({
        action: 'send_media',
        client_id: clientId,
        to: selectedLead.phone,
        type,
        url: publicUrl,
        filename: file.name,
        caption: '',
        frontend_message_id: frontendId,
      });
      const wasenderId = result?.wasender_id || null;
      pendingMsgRef.current.set(frontendId, wasenderId);
      setMessages(prev => prev.map(m => m._frontendId === frontendId ? { ...m, media_url: publicUrl, status: 'sent', wasender_message_id: wasenderId } : m));
    } catch (e: any) {
      console.error('[sendMedia] Error:', e);
      toast.error('Erro ao enviar: ' + (e.message || 'tente novamente'));
      setMessages(prev => prev.filter(m => m._frontendId !== frontendId));
      pendingMsgRef.current.delete(frontendId);
    }
    setUploadingMedia(false);
  };

  // ── File pickers ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (type === 'image') {
      setImagePreview({ file, url: URL.createObjectURL(file) });
    } else {
      await sendMedia(file, 'document');
    }
  };

  const confirmImageSend = async () => { if (imagePreview) await sendMedia(imagePreview.file, 'image'); };
  const confirmVideoSend = async () => { if (videoPreview) await sendMedia(videoPreview.file, 'video'); };

  // ── Audio recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Seu navegador não liberou o microfone. Você pode enviar um áudio do aparelho.');
        audioInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mimeType });
        await sendMedia(file, 'audio');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true); setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error('Permissão de microfone negada. Você pode enviar um áudio do aparelho.');
      audioInputRef.current?.click();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false); setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false); setRecordingSeconds(0);
  };

  // ── Lead actions ──────────────────────────────────────────────────────────
  const fireMetaConversion = (leadId: string, status: string, val?: number) => {
    supabase.functions.invoke('crm-meta-conversion-events', { body: { lead_id: leadId, client_id: clientId, status, sale_value: val } }).catch(() => {});
  };

  const markLeadStatus = async (status: string) => {
    if (!selectedLead) return;
    if (selectedLead.status === 'sale_completed' && status !== 'sale_completed') return;
    await supabase.from('crm_leads').update({ status }).eq('id', selectedLead.id);
    setSelectedLead((l: any) => ({ ...l, status }));
    fireMetaConversion(selectedLead.id, status);
    loadLeads();
    toast.success(STATUS_LABELS[status] + '!');
  };

  const openSaleDialog = (editing = false) => {
    setEditingSale(editing); setSaleValue(''); setSaleMode(editing ? 'add' : 'new'); setSaleDialog(true);
  };

  const confirmSale = async () => {
    const val = parseFloat(saleValue.replace(',', '.'));
    if (!selectedLead || isNaN(val) || val <= 0) { toast.error('Informe um valor válido'); return; }
    let finalValue = val;
    const existingVal = selectedLead?.sale_value || 0;
    if (editingSale && saleMode === 'add') finalValue = existingVal + val;
    else if (editingSale && saleMode === 'replace') finalValue = val;

    if (editingSale && saleMode === 'replace' && leadSales[0]?.id) {
      await supabase.from('crm_sales').update({ value: val, sale_date: new Date().toISOString(), is_confirmed: true } as any).eq('id', leadSales[0].id);
    } else {
      await supabase.from('crm_sales').insert({
        lead_id: selectedLead.id,
        client_id: clientId,
        value: val,
        sale_date: new Date().toISOString(),
        is_confirmed: true,
      } as any);
    }

    await supabase.from('crm_leads').update({ status: 'sale_completed', sale_value: finalValue, sale_date: new Date().toISOString() }).eq('id', selectedLead.id);
    setSelectedLead((l: any) => ({ ...l, status: 'sale_completed', sale_value: finalValue }));
    await reloadSalesState(selectedLead.id);
    fireMetaConversion(selectedLead.id, 'sale_completed', val);
    loadLeads();
    toast.success('✅ Venda registrada!');
    setSaleDialog(false); setSaleValue(''); setShowSaleHint(false);
  };

  const runAIAnalysis = async () => {
    if (!selectedLead) return;
    setAnalyzingAI(true); setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('crm-ai-analyze', { body: { client_id: clientId, lead_id: selectedLead.id } });
      if (error) throw error;
      const firstResult = data?.results?.[0];
      if (firstResult) {
        setAiResult(firstResult);
        await reloadSalesState(selectedLead.id);
        loadLeads();
        toast.success(firstResult.has_sale ? '✨ Venda detectada pela IA — confirme no painel.' : '✨ Análise concluída!');
      }
      else toast.info('Sem dados suficientes.');
    } catch { toast.error('Erro ao analisar com IA'); }
    setAnalyzingAI(false);
  };

  const disconnectWhatsApp = async () => {
    if (!connection?.session_id) return;
    setDisconnecting(true);
    try {
      await supabase.functions.invoke('crm-wasender', { body: { action: 'disconnect', session_id: connection.session_id } });
      await supabase.from('crm_whatsapp_connections').update({ status: 'disconnected' }).eq('client_id', clientId);
      setConnection((c: any) => c ? { ...c, status: 'disconnected' } : c);
      toast.success('WhatsApp desconectado.');
    } catch { toast.error('Erro ao desconectar'); }
    setDisconnecting(false);
  };

  // ── Filtered leads (text + tag) ───────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    const matchesSearch = !search || (l.name || l.phone || '').toLowerCase().includes(search.toLowerCase());
    const matchesTag = !tagFilter || (l.tags || []).some((t: string) => t.toLowerCase().includes(tagFilter.toLowerCase()));
    return matchesSearch && matchesTag;
  });

  // ── Message search ────────────────────────────────────────────────────────
  const filteredMessages = msgSearch
    ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  const leadStatus = selectedLead?.status;
  const isSaleCompleted = leadStatus === 'sale_completed';
  const isSaleLost = leadStatus === 'sale_lost';

  // All unique tags across leads
  const allTags = [...new Set(leads.flatMap(l => l.tags || []))];

  // ── Not connected UI ──────────────────────────────────────────────────────
  if (!isConnected && leads.length === 0) {
    return (
      <Card className="mt-4 p-8 flex flex-col items-center gap-6">
        <WifiOff className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">WhatsApp não conectado</h2>
          <p className="text-muted-foreground">
            {connection ? 'Escaneie o QR Code para conectar seu WhatsApp.' : 'Entre em contato com o administrador para configurar a conexão.'}
          </p>
        </div>
        {connection && (
          qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`} alt="QR Code" className="w-64 h-64" />
              </div>
              {pollingStatus && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Aguardando escaneamento...</div>}
              <Button variant="outline" onClick={fetchQrCode} disabled={loadingQr}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar QR</Button>
            </div>
          ) : (
            <Button onClick={fetchQrCode} disabled={loadingQr} size="lg">
              {loadingQr ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <QrCode className="h-5 w-5 mr-2" />}
              {loadingQr ? 'Conectando...' : 'Gerar QR Code'}
            </Button>
          )
        )}
      </Card>
    );
  }

  return (
    <div className="mt-2 sm:mt-4 flex flex-col gap-2 sm:gap-3 h-[calc(100vh-160px)] sm:h-[calc(100vh-200px)] overflow-hidden">
      {/* Reconnect banner */}
      {!isConnected && connection && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="text-xs sm:text-sm font-medium text-destructive">WhatsApp desconectado</span>
          </div>
          <Button size="sm" onClick={fetchQrCode} disabled={loadingQr}>
            {loadingQr ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <QrCode className="h-4 w-4 mr-1" />}
            Reconectar
          </Button>
        </div>
      )}

      {/* QR Code dialog */}
      {qrCode && !isConnected && (
        <Dialog open={!!qrCode} onOpenChange={(open) => { if (!open) { setQrCode(null); setPollingStatus(false); if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Conectar WhatsApp</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo</p>
              {pollingStatus && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Aguardando...</div>}
              <Button variant="outline" size="sm" onClick={fetchQrCode} disabled={loadingQr}><RefreshCw className="h-4 w-4 mr-1" /> Gerar novo QR</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex gap-2 sm:gap-3 flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
            if (file.type.startsWith('video/')) setVideoPreview({ file, url: URL.createObjectURL(file) });
            else setImagePreview({ file, url: URL.createObjectURL(file) });
          }} />
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx,.csv,application/*" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
            sendMedia(file, 'document');
          }} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
            sendMedia(file, 'audio');
          }} />

        {/* ── Conversations list ── */}
        <div className={`${isMobile ? (selectedLead ? 'hidden' : 'flex flex-col w-full') : 'w-72 lg:w-80 shrink-0 flex flex-col'} border rounded-xl bg-card overflow-hidden`}>
          <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {isConnected ? <Wifi className="h-4 w-4 text-primary shrink-0" /> : <WifiOff className="h-4 w-4 text-destructive shrink-0" />}
              <span className="font-medium text-sm">Conversas</span>
              <Badge variant="outline" className="text-[10px] ml-1">{leads.length}</Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isConnected && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive" onClick={() => { if (confirm('Desconectar WhatsApp?')) disconnectWhatsApp(); }} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <WifiOff className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>

          {/* Search + Tag filter */}
          <div className="px-2 py-2 border-b shrink-0 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border-0 outline-none focus:ring-1 focus:ring-ring" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            {allTags.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                <button onClick={() => setTagFilter('')} className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${!tagFilter ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>Todos</button>
                {allTags.slice(0, 8).map(tag => (
                  <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${tagFilter === tag ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            {filteredLeads.length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-3 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">{search || tagFilter ? 'Nenhuma conversa encontrada' : 'Aguardando mensagens'}</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const msgs = lead.crm_messages || [];
                const lastMsg = msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                const isSelected = selectedLead?.id === lead.id;
                const lastMsgPreview = () => {
                  if (!lastMsg) return '';
                  if (lastMsg.message_type === 'image') return '📷 Imagem';
                  if (lastMsg.message_type === 'audio') return '🎤 Áudio';
                  if (lastMsg.message_type === 'video') return '🎬 Vídeo';
                  if (lastMsg.message_type === 'document') return '📄 Arquivo';
                  return (lastMsg.direction === 'outbound' ? '→ ' : '') + (lastMsg.content || '');
                };
                const statusDot: Record<string, string> = { sale_completed: 'bg-emerald-500', qualified: 'bg-green-400', unqualified: 'bg-red-400', sale_lost: 'bg-gray-400', negotiating: 'bg-yellow-400' };

                return (
                  <button key={lead.id} onClick={() => { setSelectedLead(lead); setAiResult(null); setShowMsgSearch(false); setMsgSearch(''); }}
                    className={`w-full text-left px-3 py-3 border-b flex items-center gap-3 hover:bg-accent/50 transition-colors relative ${isSelected ? 'bg-accent' : ''}`}>
                    <div className="relative shrink-0">
                      <ContactAvatar name={lead.name} phone={lead.phone} avatarUrl={contactPhotos[getPhoneKey(lead.phone)]} size="md" />
                      {statusDot[lead.status] && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusDot[lead.status]}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium text-sm truncate">{lead.name || lead.phone}</p>
                        {lastMsg && <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatMessageTime(lastMsg.created_at)}</span>}
                      </div>
                      {lead.name && <p className="text-[11px] text-muted-foreground/70">{lead.phone}</p>}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsgPreview()}</p>
                      {unreadCounts[lead.id] > 0 && (
                        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {unreadCounts[lead.id]}
                        </span>
                      )}
                      {(lead.tags || []).length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 overflow-hidden">
                          {lead.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[8px] px-1 py-0 rounded bg-muted truncate max-w-[60px]">{t}</span>
                          ))}
                          {lead.tags.length > 3 && <span className="text-[8px] text-muted-foreground">+{lead.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ── Chat area ── */}
        <div className={`${isMobile ? (selectedLead ? 'flex flex-col w-full' : 'hidden') : 'flex-1 flex flex-col min-w-0'} border rounded-xl bg-card overflow-hidden`}>
          {selectedLead ? (
            <>
              {/* Header */}
              <div className="px-2 sm:px-4 py-2 sm:py-3 border-b flex items-center gap-2 sm:gap-3 shrink-0">
                {isMobile && (
                  <button onClick={() => setSelectedLead(null)} className="shrink-0 p-1">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <button onClick={() => setShowProfile(true)} className="shrink-0">
                  <ContactAvatar name={selectedLead.name} phone={selectedLead.phone} avatarUrl={contactPhotos[getPhoneKey(selectedLead.phone)]} size="sm" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => setShowProfile(true)} className="hover:underline">
                    <p className="font-semibold text-sm leading-tight truncate text-left">{selectedLead.name || selectedLead.phone}</p>
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedLead.name && <p className="text-xs text-muted-foreground">{selectedLead.phone}</p>}
                    {leadStatus && (
                      <Badge variant={isSaleCompleted ? 'default' : 'outline'} className={`text-[10px] px-1.5 py-0 ${isSaleCompleted ? 'bg-primary hover:bg-primary' : ''}`}>
                        {STATUS_LABELS[leadStatus] || leadStatus}
                      </Badge>
                    )}
                    {selectedLead.sale_value && (
                      <span className="text-[10px] text-primary font-semibold">R$ {Number(selectedLead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                    {leadScore && (leadScore.qualification_score > 0 || leadScore.interest_score > 0) && (
                      <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">
                        Q:{leadScore.qualification_score} I:{leadScore.interest_score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  {/* Source selector */}
                  <SourceSelector lead={selectedLead} onUpdate={loadLeads} />
                  <TagManager lead={selectedLead} onUpdate={loadLeads} />

                  {/* Search in messages */}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setShowMsgSearch(!showMsgSearch); setMsgSearch(''); }}>
                    <Search className="h-3.5 w-3.5" />
                  </Button>

                  {/* AI Analysis */}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={runAIAnalysis} disabled={analyzingAI} title="Análise IA">
                    {analyzingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                  </Button>

                  <CrmQuoteGenerator
                    clientId={clientId}
                    leadId={selectedLead.id}
                    leadName={selectedLead.name || selectedLead.phone}
                    leadPhone={selectedLead.phone}
                    leadSegment={selectedLead.source}
                  />

                  {isSaleCompleted ? (
                    <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10 text-xs h-7 px-2"
                      onClick={() => openSaleDialog(true)} title="Editar Venda">
                      <Edit2 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant={leadStatus === 'qualified' ? 'default' : 'outline'}
                        className={`text-xs h-7 px-2 ${leadStatus === 'qualified' ? '' : 'text-primary border-primary/30 hover:bg-primary/10'}`}
                        onClick={() => markLeadStatus(leadStatus === 'qualified' ? 'negotiating' : 'qualified')}>
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant={isSaleLost ? 'default' : 'outline'}
                        className={`text-xs h-7 px-2 ${isSaleLost ? '' : 'text-muted-foreground border-muted hover:bg-muted'}`}
                        onClick={() => markLeadStatus(isSaleLost ? 'negotiating' : 'sale_lost')}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="default" className="text-xs h-7 px-2" onClick={() => openSaleDialog(false)}>
                        <DollarSign className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Message search bar */}
              {showMsgSearch && (
                <div className="px-4 py-2 border-b flex items-center gap-2 bg-muted/30">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Buscar nas mensagens..."
                    className="flex-1 text-sm bg-transparent outline-none" autoFocus />
                  {msgSearch && <Badge variant="secondary" className="text-[10px]">{filteredMessages.length}</Badge>}
                  <button onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }}><X className="h-3.5 w-3.5" /></button>
                </div>
              )}

              {/* AI result + Sale hint + Notes */}
              {aiResult && <AIResultPanel result={aiResult} onClose={() => setAiResult(null)} />}
              {showSaleHint && !isSaleCompleted && (
                <div className="mx-4 mt-2 px-3 py-2 bg-accent border rounded-lg flex items-center justify-between">
                  <span className="text-xs">💰 Valor detectado! Registrar venda?</span>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-6 text-[11px] px-2" onClick={() => openSaleDialog(false)}>Registrar</Button>
                    <button onClick={() => setShowSaleHint(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </div>
                </div>
              )}
              <InternalNotes lead={selectedLead} onUpdate={loadLeads} />

              {/* Vendas detectadas pela IA aguardando confirmação */}
              {pendingSales.length > 0 && (
                <div className="mx-4 mt-2 space-y-2">
                  {pendingSales.map((sale) => (
                    <div key={sale.id} className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                              IA detectou venda de R$ {Number(sale.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              {sale.product_name && ` • ${sale.product_name}`}
                            </p>
                            {sale.detected_excerpt && (
                              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 italic truncate">
                                "{sale.detected_excerpt}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {sale.detected_message_id && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2"
                              onClick={() => scrollToMessage(sale.detected_message_id)}>
                              Ver mensagem
                            </Button>
                          )}
                          <Button size="sm" className="h-7 text-[11px] px-2 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => confirmPendingSale(sale)}>
                            <Check className="h-3 w-3 mr-1" /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => dismissPendingSale(sale.id)} title="Descartar">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}
                onScroll={(e) => { const el = e.currentTarget; atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
                  {/* Load older messages button */}
                  {hasMoreMessages && !msgSearch && (
                    <div className="flex justify-center mb-3">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={loadOlderMessages} disabled={loadingMoreMsgs}>
                        {loadingMoreMsgs ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Carregar mensagens anteriores
                      </Button>
                    </div>
                  )}
                <div className="space-y-1">
                  {(msgSearch ? filteredMessages : messages).map((msg, i) => {
                    const list = msgSearch ? filteredMessages : messages;
                    const showDivider = i === 0 || !isSameDay(new Date(list[i - 1].created_at), new Date(msg.created_at));
                    return (
                      <div key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border">{getDayLabel(msg.created_at)}</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <div id={`msg-${msg.id}`} className="mb-1 scroll-mt-24">
                          <MessageBubble msg={msg} highlight={highlightedMsgId === msg.id} />
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Image preview */}
              {imagePreview && (
                <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-3">
                  <img src={imagePreview.url} alt="preview" className="h-16 w-16 rounded-lg object-cover border" />
                  <div className="flex-1 text-sm text-muted-foreground truncate">{imagePreview.file.name}</div>
                  <Button size="sm" onClick={confirmImageSend} disabled={uploadingMedia}>
                    {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setImagePreview(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}

              {/* Video preview */}
              {videoPreview && (
                <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-3">
                  <div className="relative h-16 w-24 rounded-lg overflow-hidden border bg-black">
                    <video src={videoPreview.url} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 text-sm text-muted-foreground truncate">{videoPreview.file.name}</div>
                  <Button size="sm" onClick={confirmVideoSend} disabled={uploadingMedia}>
                    {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setVideoPreview(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}

              {/* Input bar */}
              <div className="p-3 border-t flex items-end gap-2 shrink-0">
                {recording ? (
                  <div className="flex-1 flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm text-destructive font-medium">
                      Gravando... {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={cancelRecording}><X className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={stopRecording}><MicOff className="h-4 w-4 mr-1" /> Enviar</Button>
                  </div>
                ) : !isConnected ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">WhatsApp desconectado — conecte para enviar</p>
                  </div>
                ) : (
                  <>
                    <QuickReplies clientId={clientId} onSelect={(text) => setNewMessage(text)} />
                    {/* Quick Product Send */}
                    {products.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" title="Enviar produto">
                            <Package className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2" align="start" side="top">
                          <p className="text-xs font-semibold px-2 py-1">Enviar Produto</p>
                          <div className="max-h-52 overflow-y-auto space-y-1">
                            {products.map((p: any) => (
                              <button key={p.name} className="w-full text-left p-2 rounded-lg hover:bg-accent flex items-center gap-2"
                                onClick={async () => {
                                  const caption = `*${p.name}*${p.price ? `\nR$ ${Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}${p.description ? `\n${p.description}` : ''}`;
                                  if (p.image_url) {
                                    // Send image WITH caption in a single message
                                    try {
                                      const res = await fetch(p.image_url);
                                      const blob = await res.blob();
                                      const file = new File([blob], `${p.name}.jpg`, { type: 'image/jpeg' });
                                      // Upload then send with caption
                                      setUploadingMedia(true);
                                      const frontendId = generateId();
                                      const optimistic: ChatMessage = {
                                        id: `opt-${frontendId}`, _frontendId: frontendId, lead_id: selectedLead!.id, client_id: clientId,
                                        direction: 'outbound', message_type: 'image', content: caption,
                                        media_url: URL.createObjectURL(file),
                                        status: 'sending', created_at: new Date().toISOString(), optimistic: true, wasender_message_id: null,
                                      };
                                      pendingMsgRef.current.set(frontendId, null);
                                      setMessages(prev => [...prev, optimistic]);
                                      atBottomRef.current = true;
                                      const publicUrl = await uploadToStorage(file);
                                      const result = await postCrmWasender({
                                        action: 'send_media',
                                        client_id: clientId,
                                        to: selectedLead!.phone,
                                        type: 'image',
                                        url: publicUrl,
                                        filename: file.name,
                                        caption,
                                        frontend_message_id: frontendId,
                                      });
                                      const wasenderId = result?.wasender_id || null;
                                      pendingMsgRef.current.set(frontendId, wasenderId);
                                      setMessages(prev => prev.map(m => m._frontendId === frontendId ? { ...m, media_url: publicUrl, content: caption, status: 'sent', wasender_message_id: wasenderId } : m));
                                      setUploadingMedia(false);
                                    } catch (e: any) {
                                      console.error('[catalog] Error sending product:', e);
                                      toast.error('Erro ao enviar produto: ' + (e.message || ''));
                                      setUploadingMedia(false);
                                    }
                                  } else {
                                    // No image — just send as text
                                    setNewMessage(caption);
                                  }
                                }}>
                                {p.image_url ? (
                                  <img src={p.image_url} className="h-8 w-8 rounded object-cover shrink-0" />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                    <Package className="h-3 w-3 text-muted-foreground/40" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{p.name}</p>
                                  {p.price && <p className="text-[10px] text-primary">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => setShowScheduler(true)} title="Agendar mensagem">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia} title="Enviar arquivo">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => imageInputRef.current?.click()} disabled={uploadingMedia} title="Enviar imagem/vídeo">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite uma mensagem..."
                      className="flex-1 min-h-[40px] max-h-32 resize-none py-2 text-sm rounded-xl"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                    <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={startRecording} disabled={uploadingMedia || sendingCount > 0} title="Gravar áudio">
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="shrink-0 h-9 w-9" onClick={sendMessage} disabled={uploadingMedia || !newMessage.trim()}>
                      {(sendingCount > 0 || uploadingMedia) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-14 w-14 opacity-15" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          )}
        </div>

        {/* Sale dialog */}
        <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingSale ? '💰 Nova Venda Adicional' : '💰 Registrar Venda'} — {selectedLead?.name || selectedLead?.phone}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingSale && selectedLead?.sale_value && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground text-xs mb-1">Venda atual:</p>
                  <p className="font-semibold text-primary">R$ {Number(selectedLead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {editingSale && (
                <div className="flex gap-2">
                  <Button size="sm" variant={saleMode === 'add' ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setSaleMode('add')}>+ Adicionar</Button>
                  <Button size="sm" variant={saleMode === 'replace' ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setSaleMode('replace')}>Substituir</Button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">{editingSale && saleMode === 'add' ? 'Valor da Nova Venda (R$)' : 'Valor da Venda (R$)'}</label>
                <Input type="number" step="0.01" min="0" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} placeholder="0.00" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmSale(); }} />
              </div>
              {editingSale && saleMode === 'add' && saleValue && !isNaN(parseFloat(saleValue)) && (
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-primary">R$ {(Number(selectedLead?.sale_value || 0) + parseFloat(saleValue.replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
              )}
              <Button className="w-full" onClick={confirmSale}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {editingSale && saleMode === 'add' ? 'Adicionar Venda' : editingSale ? 'Substituir' : 'Confirmar Venda'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lead Profile Dialog */}
        {selectedLead && (
          <CrmLeadProfile
            open={showProfile}
            onOpenChange={setShowProfile}
            lead={selectedLead}
            summary={leadSummary}
            sales={leadSales}
            onReload={loadLeads}
          />
        )}
        {selectedLead && (
          <CrmScheduler
            clientId={clientId}
            leadId={selectedLead.id}
            leadName={selectedLead.name || selectedLead.phone}
            open={showScheduler}
            onOpenChange={setShowScheduler}
          />
        )}
      </div>
    </div>
  );
}
