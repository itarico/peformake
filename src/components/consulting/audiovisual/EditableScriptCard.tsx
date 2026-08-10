import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Check, Copy, ChevronDown, ChevronUp, Pencil, Save, X,
  Video, Lightbulb, Camera, Hash, MessageSquare, Brain,
  CheckCircle2, XCircle, Trash2, Shuffle, CopyPlus, Loader2,
} from 'lucide-react';
import type { GeneratedScript } from './AudiovisualContext';
import { useAudiovisual } from './AudiovisualContext';

interface EditableScriptCardProps {
  script: GeneratedScript;
  index: number;
  isApproved: boolean;
  onToggleApproval: (id: string) => void;
  onUpdate: (id: string, updates: Partial<GeneratedScript>) => void;
  onRemove?: (id: string) => void;
  defaultExpanded?: boolean;
}

const ALL_EDITABLE_FIELDS: Array<{ key: keyof GeneratedScript; label: string; icon: typeof Lightbulb; color: string; isExtra?: boolean }> = [
  { key: 'gancho', label: 'Gancho (0-3s)', icon: Lightbulb, color: 'text-yellow-500' },
  { key: 'desenvolvimento', label: 'Desenvolvimento', icon: Video, color: 'text-blue-500' },
  { key: 'cta', label: 'CTA Final', icon: MessageSquare, color: 'text-green-500' },
  { key: 'legendaSugerida', label: 'Legenda Sugerida', icon: Hash, color: 'text-purple-500', isExtra: true },
  { key: 'dicasGravacao', label: 'Dicas de Gravação', icon: Camera, color: 'text-red-500', isExtra: true },
  { key: 'observacoesEstrategicas', label: 'Observações Estratégicas', icon: Brain, color: 'text-indigo-500', isExtra: true },
];

export function EditableScriptCard({
  script, index, isApproved, onToggleApproval, onUpdate, onRemove, defaultExpanded = false,
}: EditableScriptCardProps) {
  const { generateVariation, addScript } = useAudiovisual();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [isFullEdit, setIsFullEdit] = useState(false);
  const [fullEditData, setFullEditData] = useState<Partial<GeneratedScript>>({});

  const startEdit = (field: string, value: string) => { setEditingField(field); setEditValue(value); };
  const saveEdit = () => { if (!editingField) return; onUpdate(script.id, { [editingField]: editValue }); setEditingField(null); toast.success('Campo atualizado!'); };
  const cancelEdit = () => { setEditingField(null); setEditValue(''); };

  const startFullEdit = () => {
    setIsFullEdit(true);
    setFullEditData({
      titulo: script.titulo,
      gancho: script.gancho,
      desenvolvimento: script.desenvolvimento,
      cta: script.cta,
      legendaSugerida: script.legendaSugerida,
      dicasGravacao: script.dicasGravacao,
      observacoesEstrategicas: script.observacoesEstrategicas,
      estruturaUsada: script.estruturaUsada,
    });
  };

  const saveFullEdit = () => {
    onUpdate(script.id, fullEditData);
    setIsFullEdit(false);
    toast.success('Roteiro atualizado!');
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullScript = async () => {
    const parts = [
      script.titulo && `TÍTULO: ${script.titulo}`,
      script.gancho && `GANCHO: ${script.gancho}`,
      script.desenvolvimento && `DESENVOLVIMENTO: ${script.desenvolvimento}`,
      script.cta && `CTA: ${script.cta}`,
      script.legendaSugerida && `LEGENDA: ${script.legendaSugerida}`,
      script.dicasGravacao && `DICAS: ${script.dicasGravacao}`,
      script.observacoesEstrategicas && `OBSERVAÇÕES: ${script.observacoesEstrategicas}`,
    ].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(parts);
    toast.success('Roteiro completo copiado!');
  };

  const handleVariation = async () => {
    setIsGeneratingVariation(true);
    try {
      const variation = await generateVariation(script);
      if (variation) toast.success('Variação gerada com sucesso!');
      else toast.error('Não foi possível gerar variação');
    } catch { toast.error('Erro ao gerar variação'); }
    finally { setIsGeneratingVariation(false); }
  };

  const handleDuplicate = () => {
    const duplicate: GeneratedScript = {
      ...script,
      id: crypto.randomUUID(),
      titulo: `${script.titulo} (Cópia)`,
      createdAt: new Date(),
      source: 'manual',
    };
    addScript(duplicate);
    toast.success('Roteiro duplicado!');
  };

  // Full edit mode
  if (isFullEdit) {
    const fullEditFields = [
      { key: 'titulo', label: 'Título', singleLine: true },
      { key: 'gancho', label: '🎯 Gancho' },
      { key: 'desenvolvimento', label: '📝 Desenvolvimento' },
      { key: 'cta', label: '🚀 CTA' },
      { key: 'legendaSugerida', label: '💬 Legenda' },
      { key: 'dicasGravacao', label: '🎥 Dicas de Gravação' },
      { key: 'observacoesEstrategicas', label: '💡 Observações Estratégicas' },
      { key: 'estruturaUsada', label: '📐 Estrutura Narrativa', singleLine: true },
    ];

    return (
      <Card className="ring-2 ring-primary border-primary/50">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm text-primary flex items-center gap-2"><Pencil className="h-4 w-4" /> Editando Roteiro Completo</p>
            <Button variant="ghost" size="sm" onClick={() => setIsFullEdit(false)} className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
          </div>
          {fullEditFields.map(({ key, label, singleLine }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{label}</label>
              {singleLine ? (
                <Input
                  value={(fullEditData[key as keyof GeneratedScript] as string) || ''}
                  onChange={(e) => setFullEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm"
                />
              ) : (
                <Textarea
                  value={(fullEditData[key as keyof GeneratedScript] as string) || ''}
                  onChange={(e) => setFullEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm min-h-[70px]"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={saveFullEdit} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              <Save className="h-3.5 w-3.5" /> Salvar Tudo
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsFullEdit(false)}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden transition-all", isApproved && "ring-2 ring-green-500 border-green-500/50")}>
      <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline">
                {script.source === 'manual' ? 'Manual' : script.source === 'chat' ? 'Chat' : 'Lote'} #{index + 1}
              </Badge>
              {script.estruturaUsada && <Badge variant="secondary" className="text-xs">{script.estruturaUsada}</Badge>}
              {isApproved && <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Selecionado</Badge>}
            </div>
            <h4 className="font-medium truncate">{script.titulo || 'Roteiro'}</h4>
            {!isExpanded && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{script.gancho}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant={isApproved ? "default" : "outline"} size="sm" className={cn("gap-1", isApproved && "bg-green-600 hover:bg-green-700")} onClick={(e) => { e.stopPropagation(); onToggleApproval(script.id); }}>
              {isApproved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {isApproved ? '✓' : 'Selecionar'}
            </Button>
            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          <Separator />
          <EditableField label="Título" value={script.titulo} isEditing={editingField === 'titulo'} editValue={editValue} onStartEdit={() => startEdit('titulo', script.titulo)} onSave={saveEdit} onCancel={cancelEdit} onEditValueChange={setEditValue} onCopy={(text) => handleCopy(text, `${script.id}-titulo`)} isCopied={copiedField === `${script.id}-titulo`} singleLine />

          {ALL_EDITABLE_FIELDS.map(({ key, label, icon: Icon, color }) => {
            const value = script[key] as string;
            if (!value) return null;
            return (
              <EditableField key={key} label={label} icon={<Icon className={cn("h-4 w-4", color)} />} value={value} isEditing={editingField === key} editValue={editValue} onStartEdit={() => startEdit(key, value)} onSave={saveEdit} onCancel={cancelEdit} onEditValueChange={setEditValue} onCopy={(text) => handleCopy(text, `${script.id}-${key}`)} isCopied={copiedField === `${script.id}-${key}`} />
            );
          })}

          {script.justificativa && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm font-medium">Justificativa:</p>
              <p className="text-sm text-muted-foreground">{script.justificativa}</p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); startFullEdit(); }}>
                <Pencil className="h-3.5 w-3.5" />
                Editar Tudo
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); copyFullScript(); }}>
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); handleVariation(); }} disabled={isGeneratingVariation}>
                {isGeneratingVariation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                Variação
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                <CopyPlus className="h-3.5 w-3.5" />
                Duplicar
              </Button>
            </div>
            {onRemove && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onRemove(script.id)}>
                <Trash2 className="h-3.5 w-3.5" />Remover
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function EditableField({ label, icon, value, isEditing, editValue, onStartEdit, onSave, onCancel, onEditValueChange, onCopy, isCopied, singleLine = false }: {
  label: string; icon?: React.ReactNode; value: string; isEditing: boolean; editValue: string;
  onStartEdit: () => void; onSave: () => void; onCancel: () => void; onEditValueChange: (val: string) => void;
  onCopy: (text: string) => void; isCopied: boolean; singleLine?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">{icon}{label}</div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-green-600" onClick={onSave}><Save className="h-3.5 w-3.5" /> Salvar</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onStartEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onCopy(value)}>
                {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        singleLine ? (
          <Input value={editValue} onChange={(e) => onEditValueChange(e.target.value)} className="text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
        ) : (
          <Textarea value={editValue} onChange={(e) => onEditValueChange(e.target.value)} className="text-sm min-h-[100px]" autoFocus />
        )
      ) : (
        <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">{value}</div>
      )}
    </div>
  );
}