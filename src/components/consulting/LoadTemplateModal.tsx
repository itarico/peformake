import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Loader2, Calendar, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Template {
  id: string;
  name: string;
  answers: Record<string, string>;
  created_at: string;
}

interface PreviousMonth {
  id: string;
  month: number;
  year: number;
  instance_id: string;
  answers: Record<string, string>;
}

interface LoadTemplateModalProps {
  clientId: string;
  frameworkId: string;
  currentInstanceId: string;
  onLoadAnswers: (answers: Record<string, string>) => void;
  disabled?: boolean;
}

export function LoadTemplateModal({
  clientId,
  frameworkId,
  currentInstanceId,
  onLoadAnswers,
  disabled = false,
}: LoadTemplateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previousMonths, setPreviousMonths] = useState<PreviousMonth[]>([]);
  const [activeTab, setActiveTab] = useState("previous");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('answer_templates')
        .select('*')
        .eq('client_id', clientId)
        .eq('framework_id', frameworkId)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates((templatesData || []).map(t => ({
        ...t,
        answers: t.answers as Record<string, string>
      })));

      // Load previous months with same framework
      const { data: instancesData, error: instancesError } = await supabase
        .from('framework_instances')
        .select(`
          id,
          consulting_month:consulting_months(
            id,
            month,
            year,
            client_id
          ),
          answers:framework_answers(
            question_id,
            answer_text
          )
        `)
        .eq('framework_id', frameworkId)
        .neq('id', currentInstanceId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (instancesError) throw instancesError;

      const monthsWithAnswers: PreviousMonth[] = [];
      for (const instance of instancesData || []) {
        const consultingMonth = instance.consulting_month as any;
        if (consultingMonth?.client_id === clientId && instance.answers?.length > 0) {
          const answers: Record<string, string> = {};
          for (const answer of instance.answers as any[]) {
            if (answer.answer_text) {
              answers[answer.question_id] = answer.answer_text;
            }
          }
          if (Object.keys(answers).length > 0) {
            monthsWithAnswers.push({
              id: consultingMonth.id,
              month: consultingMonth.month,
              year: consultingMonth.year,
              instance_id: instance.id,
              answers,
            });
          }
        }
      }
      setPreviousMonths(monthsWithAnswers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Erro ao carregar templates e meses anteriores");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadFromMonth = (month: PreviousMonth) => {
    onLoadAnswers(month.answers);
    toast.success(`Respostas de ${format(new Date(month.year, month.month - 1), "MMMM 'de' yyyy", { locale: ptBR })} carregadas!`);
    setIsOpen(false);
  };

  const handleLoadFromTemplate = (template: Template) => {
    onLoadAnswers(template.answers);
    toast.success(`Template "${template.name}" carregado!`);
    setIsOpen(false);
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('answer_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Template excluído");
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Erro ao excluir template");
    }
  };

  const getMonthLabel = (month: PreviousMonth) => {
    return format(new Date(month.year, month.month - 1), "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Carregar Respostas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Carregar Respostas</DialogTitle>
          <DialogDescription>
            Carregue respostas de meses anteriores ou templates salvos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="previous">
                <Calendar className="mr-2 h-4 w-4" />
                Meses Anteriores
              </TabsTrigger>
              <TabsTrigger value="templates">
                <FileText className="mr-2 h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="previous">
              <ScrollArea className="h-[300px]">
                {previousMonths.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum mês anterior encontrado para este framework</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {previousMonths.map((month) => (
                      <button
                        key={month.id}
                        onClick={() => handleLoadFromMonth(month)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium capitalize">
                              {getMonthLabel(month)}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {Object.keys(month.answers).length} respostas
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates">
              <ScrollArea className="h-[300px]">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum template salvo para este framework</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleLoadFromTemplate(template)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium">{template.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Criado em {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {Object.keys(template.answers).length} respostas
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteTemplate(template.id, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
