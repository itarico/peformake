import { MessageSquare, HelpCircle, GitBranch, Zap, Clock, LayoutList, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CanvasNode } from './FlowCanvas';

const NODE_META: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
  message:       { icon: MessageSquare, label: 'Mensagem',        color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/40',   border: 'border-blue-300 dark:border-blue-700' },
  question:      { icon: HelpCircle,    label: 'Pergunta',        color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700' },
  condition:     { icon: GitBranch,     label: 'Condição',        color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-700' },
  action:        { icon: Zap,           label: 'Ação',            color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/40',  border: 'border-green-300 dark:border-green-700' },
  wait_response: { icon: Clock,         label: 'Aguardar',        color: 'text-cyan-600',   bg: 'bg-cyan-50 dark:bg-cyan-950/40',    border: 'border-cyan-300 dark:border-cyan-700' },
};

interface Props {
  node: CanvasNode;
  isConnecting: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onConnectionStart: (nodeId: string, portType: string, optionIndex?: number) => void;
  onConnectionEnd: () => void;
  nodeWidth: number;
}

export default function FlowNode({ node, isConnecting, onMouseDown, onEdit, onDelete, onConnectionStart, onConnectionEnd, nodeWidth }: Props) {
  const isMenu = node.node_type === 'question' && node.config?.response_type === 'options';
  const meta = isMenu
    ? { icon: LayoutList, label: 'Menu', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-700' }
    : (NODE_META[node.node_type] || NODE_META.message);
  const Icon = meta.icon;
  const c = node.config || {};

  const getPreview = () => {
    if (node.node_type === 'message') return c.text || '(vazio)';
    if (node.node_type === 'question') return c.text || '(pergunta vazia)';
    if (node.node_type === 'wait_response') return c.text || 'Aguardando resposta...';
    if (node.node_type === 'condition') return `{{${c.variable || '?'}}} ${c.operator || '='} ${c.value || '?'}`;
    if (node.node_type === 'action') {
      const labels: Record<string, string> = { tag: 'Tag: ', webhook: 'Webhook', api_call: 'API Call' };
      return (labels[c.action_type] || c.action_type || 'Ação') + (c.tag_value ? c.tag_value : '');
    }
    return '';
  };

  return (
    <div
      className={`flow-node absolute select-none group ${meta.bg} ${meta.border} border-2 rounded-xl shadow-sm hover:shadow-lg transition-shadow`}
      style={{ left: node.position_x || 0, top: node.position_y || 0, width: nodeWidth, zIndex: 10 }}
      onMouseDown={onMouseDown}
      onMouseUp={isConnecting ? onConnectionEnd : undefined}
    >
      {/* Input port (top) */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground/30 bg-background hover:bg-primary hover:border-primary transition-colors cursor-pointer z-20"
        onMouseUp={(e) => { e.stopPropagation(); onConnectionEnd(); }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`h-3.5 w-3.5 ${meta.color} shrink-0`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="h-2.5 w-2.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-2.5 w-2.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-[11px] text-foreground/80 line-clamp-2 leading-relaxed">{getPreview()}</p>
        
        {/* Variable badge */}
        {c.variable_name && (
          <div className="mt-1">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono bg-background/50">
              💾 {`{{${c.variable_name}}}`}
            </Badge>
          </div>
        )}

        {/* Menu options */}
        {isMenu && c.options?.length > 0 && (
          <div className="mt-2 space-y-1">
            {c.options.map((opt: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-background/60 rounded-md px-2 py-1 text-[10px]">
                <span className="font-medium">{opt.label || `Opção ${i + 1}`}</span>
                {/* Option output port */}
                <div
                  className="w-3 h-3 rounded-full border-2 border-orange-400 bg-background hover:bg-orange-400 transition-colors cursor-crosshair shrink-0"
                  onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, 'option', i); }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Condition branches */}
        {node.node_type === 'condition' && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            <div className="flex items-center justify-between bg-emerald-100/50 dark:bg-emerald-900/20 rounded px-2 py-1">
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">✓ Sim</span>
              <div
                className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-background hover:bg-emerald-500 transition-colors cursor-crosshair"
                onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, 'true'); }}
              />
            </div>
            <div className="flex items-center justify-between bg-red-100/50 dark:bg-red-900/20 rounded px-2 py-1">
              <span className="text-[9px] font-bold text-red-700 dark:text-red-400">✗ Não</span>
              <div
                className="w-3 h-3 rounded-full border-2 border-red-500 bg-background hover:bg-red-500 transition-colors cursor-crosshair"
                onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, 'false'); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Default output port (bottom) — hide for condition nodes */}
      {node.node_type !== 'condition' && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground/30 bg-background hover:bg-primary hover:border-primary transition-colors cursor-crosshair z-20"
          onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, 'default'); }}
        />
      )}
    </div>
  );
}
