import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveTemplateButtonProps {
  clientId: string;
  frameworkId: string;
  answers: Record<string, string>;
  frameworkName: string;
  disabled?: boolean;
}

export function SaveTemplateButton({
  clientId,
  frameworkId,
  answers,
  frameworkName,
  disabled = false,
}: SaveTemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState(`Template ${frameworkName}`);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Informe um nome para o template");
      return;
    }

    const answeredCount = Object.values(answers).filter(a => a?.trim()).length;
    if (answeredCount === 0) {
      toast.error("Não há respostas para salvar");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('answer_templates')
        .insert({
          client_id: clientId,
          framework_id: frameworkId,
          name: templateName.trim(),
          answers: answers,
        });

      if (error) throw error;

      toast.success("Template salvo com sucesso!");
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Erro ao salvar template");
    } finally {
      setIsSaving(false);
    }
  };

  const answeredCount = Object.values(answers).filter(a => a?.trim()).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || answeredCount === 0}>
          <Save className="mr-2 h-4 w-4" />
          Salvar como Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar Template de Respostas</DialogTitle>
          <DialogDescription>
            Salve as respostas atuais para reutilizar em meses futuros.
            {answeredCount > 0 && (
              <span className="block mt-1 text-primary">
                {answeredCount} respostas serão salvas
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Nome do Template</Label>
            <Input
              id="templateName"
              placeholder="Ex: Template SWOT - Cliente X"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !templateName.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
