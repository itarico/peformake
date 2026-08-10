import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2, Check } from 'lucide-react';

interface PendingTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
}

export function PendingTasksModal({ open, onOpenChange }: PendingTasksModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_tasks')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DashboardTask[];
    },
    enabled: open,
  });

  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('dashboard_tasks')
        .insert({ title });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-staff-stats'] });
      setNewTaskTitle('');
      toast.success('Tarefa adicionada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar: ' + error.message);
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('dashboard_tasks')
        .update({ is_completed: isCompleted })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-staff-stats'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-staff-stats'] });
      toast.success('Tarefa removida!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate(newTaskTitle.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const pendingTasks = tasks?.filter(t => !t.is_completed) || [];
  const completedTasks = tasks?.filter(t => t.is_completed) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Artes Pendentes</DialogTitle>
          <DialogDescription>
            Gerencie suas tarefas e artes pendentes
          </DialogDescription>
        </DialogHeader>

        {/* Add new task */}
        <div className="flex gap-2">
          <Input
            placeholder="Nova tarefa ou arte..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={addTaskMutation.isPending}
          />
          <Button 
            onClick={handleAddTask} 
            disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
            size="icon"
          >
            {addTaskMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Pendentes ({pendingTasks.length})
                  </h4>
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) =>
                          toggleTaskMutation.mutate({
                            id: task.id,
                            isCompleted: checked as boolean,
                          })
                        }
                      />
                      <span className="flex-1 text-sm">{task.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Concluídas ({completedTasks.length})
                  </h4>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) =>
                          toggleTaskMutation.mutate({
                            id: task.id,
                            isCompleted: checked as boolean,
                          })
                        }
                      />
                      <span className="flex-1 text-sm line-through text-muted-foreground">
                        {task.title}
                      </span>
                      <Check className="h-4 w-4 text-success" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {(!tasks || tasks.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma tarefa ainda.</p>
                  <p className="text-xs mt-1">Adicione sua primeira tarefa acima!</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
