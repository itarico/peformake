import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, X, PenLine } from 'lucide-react';

interface ManualScriptFormProps {
  onSave: (script: {
    titulo: string;
    gancho: string;
    desenvolvimento: string;
    cta: string;
    legendaSugerida: string;
    dicasGravacao: string;
    observacoesEstrategicas: string;
  }) => void;
  onCancel: () => void;
}

const FIELDS = [
  { key: 'gancho', label: 'Gancho', placeholder: 'A abertura que prende a atenção...' },
  { key: 'desenvolvimento', label: 'Desenvolvimento', placeholder: 'O conteúdo principal do roteiro...' },
  { key: 'cta', label: 'CTA (Call to Action)', placeholder: 'A chamada para ação final...' },
  { key: 'legendaSugerida', label: 'Legenda Sugerida', placeholder: 'Texto para a legenda do post...' },
  { key: 'dicasGravacao', label: 'Dicas de Gravação', placeholder: 'Orientações para captação...' },
  { key: 'observacoesEstrategicas', label: 'Observações Estratégicas', placeholder: 'Notas sobre estratégia e edição...' },
] as const;

export function ManualScriptForm({ onSave, onCancel }: ManualScriptFormProps) {
  const [titulo, setTitulo] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({
    gancho: '', desenvolvimento: '', cta: '',
    legendaSugerida: '', dicasGravacao: '', observacoesEstrategicas: '',
  });

  const handleSave = () => {
    if (!titulo.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    onSave({
      titulo: titulo.trim(),
      gancho: fields.gancho,
      desenvolvimento: fields.desenvolvimento,
      cta: fields.cta,
      legendaSugerida: fields.legendaSugerida,
      dicasGravacao: fields.dicasGravacao,
      observacoesEstrategicas: fields.observacoesEstrategicas,
    });
  };

  return (
    <Card className="border-2 border-dashed border-amber-400/60 bg-amber-50/30">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-700">
          <PenLine className="h-4 w-4" />
          <span className="text-sm font-semibold">Novo Roteiro Manual</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="manual-titulo" className="text-sm font-medium">
            Título <span className="text-destructive">*</span>
          </Label>
          <Input
            id="manual-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Lançamento do produto X"
            autoFocus
          />
        </div>

        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`manual-${key}`} className="text-sm font-medium">{label}</Label>
            <Textarea
              id={`manual-${key}`}
              value={fields[key]}
              onChange={(e) => setFields(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className="min-h-[70px]"
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Salvar Roteiro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
