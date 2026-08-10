/**
 * FlowCanvas — Visual drag-and-drop flow builder with SVG connections
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, MessageSquare, HelpCircle, GitBranch, Zap, Clock, LayoutList, Play, ChevronLeft, Save } from 'lucide-react';
import FlowNode from './FlowNode';
import FlowConnections from './FlowConnections';
import CrmFlowNodeEditor from '../CrmFlowNodeEditor';
import CrmFlowSimulator from '../CrmFlowSimulator';

interface Props {
  flowId: string;
  flowName: string;
  flowIsActive: boolean;
  clientId: string;
  onBack: () => void;
}

export interface CanvasNode {
  id: string;
  flow_id: string;
  node_type: string;
  node_order: number;
  config: any;
  next_node_id: string | null;
  position_x: number | null;
  position_y: number | null;
}

export interface Connection {
  from: string;
  to: string;
  label?: string;
  color?: string;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT_BASE = 80;

export default function FlowCanvas({ flowId, flowName, flowIsActive, clientId, onBack }: Props) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portType: string; optionIndex?: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadNodes(); }, [flowId]);

  const loadNodes = async () => {
    const { data } = await supabase.from('crm_flow_nodes').select('*').eq('flow_id', flowId).order('node_order', { ascending: true });
    const nodeList = (data as CanvasNode[]) || [];
    
    // Auto-position nodes that don't have positions
    let needsUpdate = false;
    const positioned = nodeList.map((n, i) => {
      if (n.position_x === null || n.position_y === null) {
        needsUpdate = true;
        return { ...n, position_x: 300, position_y: 80 + i * 140 };
      }
      return n;
    });

    if (needsUpdate) {
      for (const n of positioned) {
        if (nodeList.find(orig => orig.id === n.id && (orig.position_x === null || orig.position_y === null))) {
          await supabase.from('crm_flow_nodes').update({ position_x: n.position_x, position_y: n.position_y }).eq('id', n.id);
        }
      }
    }

    setNodes(positioned);
    buildConnections(positioned);
  };

  const buildConnections = (nodeList: CanvasNode[]) => {
    const conns: Connection[] = [];
    for (const node of nodeList) {
      // Default next_node_id connection
      if (node.next_node_id && nodeList.find(n => n.id === node.next_node_id)) {
        conns.push({ from: node.id, to: node.next_node_id, color: '#6b7280' });
      }
      // Menu/question option connections
      if (node.node_type === 'question' && node.config?.response_type === 'options') {
        const options = node.config.options || [];
        options.forEach((opt: any, i: number) => {
          if (opt.next_node_id && nodeList.find(n => n.id === opt.next_node_id)) {
            conns.push({ from: node.id, to: opt.next_node_id, label: opt.label || `Opção ${i + 1}`, color: '#f97316' });
          }
        });
      }
      // Condition connections
      if (node.node_type === 'condition') {
        if (node.config?.true_node_id && nodeList.find(n => n.id === node.config.true_node_id)) {
          conns.push({ from: node.id, to: node.config.true_node_id, label: 'Sim', color: '#22c55e' });
        }
        if (node.config?.false_node_id && nodeList.find(n => n.id === node.config.false_node_id)) {
          conns.push({ from: node.id, to: node.config.false_node_id, label: 'Não', color: '#ef4444' });
        }
      }
    }
    setConnections(conns);
  };

  const getNodeCenter = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: (node.position_x || 0) + NODE_WIDTH / 2, y: (node.position_y || 0) + NODE_HEIGHT_BASE / 2 };
  }, [nodes]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-bg')) {
      if (addMenuPos) { setAddMenuPos(null); return; }
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left - canvasOffset.x, y: e.clientY - rect.top - canvasOffset.y });
    }

    if (isPanning) {
      setCanvasOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (dragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - canvasOffset.x - dragOffset.x;
      const y = e.clientY - rect.top - canvasOffset.y - dragOffset.y;
      setNodes(prev => prev.map(n => n.id === dragging ? { ...n, position_x: Math.max(0, x), position_y: Math.max(0, y) } : n));
    }
  };

  const handleCanvasMouseUp = async () => {
    if (dragging) {
      const node = nodes.find(n => n.id === dragging);
      if (node) {
        await supabase.from('crm_flow_nodes').update({ position_x: node.position_x, position_y: node.position_y }).eq('id', node.id);
      }
      setDragging(null);
    }
    setIsPanning(false);

    if (connectingFrom) {
      setConnectingFrom(null);
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - canvasOffset.x - (node.position_x || 0),
      y: e.clientY - rect.top - canvasOffset.y - (node.position_y || 0),
    });
  };

  const handleConnectionStart = (nodeId: string, portType: string, optionIndex?: number) => {
    setConnectingFrom({ nodeId, portType, optionIndex });
  };

  const handleConnectionEnd = async (targetNodeId: string) => {
    if (!connectingFrom || connectingFrom.nodeId === targetNodeId) {
      setConnectingFrom(null);
      return;
    }

    const sourceNode = nodes.find(n => n.id === connectingFrom.nodeId);
    if (!sourceNode) { setConnectingFrom(null); return; }

    if (connectingFrom.portType === 'default') {
      await supabase.from('crm_flow_nodes').update({ next_node_id: targetNodeId }).eq('id', connectingFrom.nodeId);
    } else if (connectingFrom.portType === 'option' && connectingFrom.optionIndex !== undefined) {
      const opts = [...(sourceNode.config?.options || [])];
      opts[connectingFrom.optionIndex] = { ...opts[connectingFrom.optionIndex], next_node_id: targetNodeId };
      await supabase.from('crm_flow_nodes').update({ config: { ...sourceNode.config, options: opts } }).eq('id', connectingFrom.nodeId);
    } else if (connectingFrom.portType === 'true') {
      await supabase.from('crm_flow_nodes').update({ config: { ...sourceNode.config, true_node_id: targetNodeId } }).eq('id', connectingFrom.nodeId);
    } else if (connectingFrom.portType === 'false') {
      await supabase.from('crm_flow_nodes').update({ config: { ...sourceNode.config, false_node_id: targetNodeId } }).eq('id', connectingFrom.nodeId);
    }

    setConnectingFrom(null);
    toast.success('Conexão criada!');
    loadNodes();
  };

  const addNode = async (type: string) => {
    const actualType = type === 'menu' ? 'question' : type;
    const pos = addMenuPos || { x: 300, y: 80 + nodes.length * 140 };
    const order = nodes.length;

    const defaultConfig: any = {};
    if (type === 'message') defaultConfig.text = '';
    if (type === 'question') { defaultConfig.text = ''; defaultConfig.response_type = 'open'; defaultConfig.options = []; defaultConfig.variable_name = ''; }
    if (type === 'menu') {
      defaultConfig.text = ''; defaultConfig.response_type = 'options'; defaultConfig.variable_name = '';
      defaultConfig.options = [{ label: 'Opção 1', value: 'opcao_1', next_node_id: null }, { label: 'Opção 2', value: 'opcao_2', next_node_id: null }];
    }
    if (type === 'wait_response') { defaultConfig.text = ''; defaultConfig.variable_name = ''; defaultConfig.timeout_minutes = 0; }
    if (type === 'condition') { defaultConfig.variable = ''; defaultConfig.operator = 'equals'; defaultConfig.value = ''; }
    if (type === 'action') { defaultConfig.action_type = 'tag'; defaultConfig.tag_value = ''; }

    const { data } = await supabase.from('crm_flow_nodes').insert({
      flow_id: flowId, node_type: actualType, node_order: order, config: defaultConfig,
      position_x: pos.x, position_y: pos.y,
    }).select().single();

    setAddMenuPos(null);
    loadNodes();
    if (data) setEditingNode(data as CanvasNode);
  };

  const deleteNode = async (nodeId: string) => {
    // Remove references to this node
    for (const n of nodes) {
      if (n.next_node_id === nodeId) {
        await supabase.from('crm_flow_nodes').update({ next_node_id: null }).eq('id', n.id);
      }
      if (n.config?.true_node_id === nodeId || n.config?.false_node_id === nodeId) {
        const newConfig = { ...n.config };
        if (newConfig.true_node_id === nodeId) newConfig.true_node_id = null;
        if (newConfig.false_node_id === nodeId) newConfig.false_node_id = null;
        await supabase.from('crm_flow_nodes').update({ config: newConfig }).eq('id', n.id);
      }
      if (n.config?.options) {
        const opts = n.config.options.map((o: any) => o.next_node_id === nodeId ? { ...o, next_node_id: null } : o);
        if (JSON.stringify(opts) !== JSON.stringify(n.config.options)) {
          await supabase.from('crm_flow_nodes').update({ config: { ...n.config, options: opts } }).eq('id', n.id);
        }
      }
    }
    await supabase.from('crm_flow_nodes').delete().eq('id', nodeId);
    toast.success('Bloco removido');
    loadNodes();
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.flow-node')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAddMenuPos({ x: e.clientX - rect.left - canvasOffset.x, y: e.clientY - rect.top - canvasOffset.y });
  };

  const onNodeSaved = () => {
    loadNodes();
    setEditingNode(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onBack}>
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <h3 className="text-sm font-semibold">{flowName}</h3>
          <Badge variant={flowIsActive ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
            {flowIsActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{nodes.length} blocos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSimulator(true)}>
            <Play className="h-3.5 w-3.5" /> Simular
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 pb-2 shrink-0 flex-wrap">
        <span className="text-[10px] text-muted-foreground mr-1">Adicionar:</span>
        {[
          { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'text-blue-600' },
          { type: 'question', label: 'Pergunta', icon: HelpCircle, color: 'text-amber-600' },
          { type: 'menu', label: 'Menu', icon: LayoutList, color: 'text-orange-600' },
          { type: 'wait_response', label: 'Aguardar', icon: Clock, color: 'text-cyan-600' },
          { type: 'condition', label: 'Condição', icon: GitBranch, color: 'text-purple-600' },
          { type: 'action', label: 'Ação', icon: Zap, color: 'text-green-600' },
        ].map(item => (
          <Button key={item.type} variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2"
            onClick={() => addNode(item.type)}>
            <item.icon className={`h-3 w-3 ${item.color}`} />
            {item.label}
          </Button>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden rounded-lg border bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,hsl(var(--border)/0.3)_19px,hsl(var(--border)/0.3)_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,hsl(var(--border)/0.3)_19px,hsl(var(--border)/0.3)_20px)] cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
      >
        <div className="canvas-bg absolute inset-0" />
        <div style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`, position: 'absolute', inset: 0 }}>
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <FlowConnections nodes={nodes} connections={connections} nodeWidth={NODE_WIDTH} nodeHeight={NODE_HEIGHT_BASE} />
            {/* Drawing connection line */}
            {connectingFrom && (() => {
              const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
              if (!fromNode) return null;
              const fromX = (fromNode.position_x || 0) + NODE_WIDTH / 2;
              const fromY = (fromNode.position_y || 0) + NODE_HEIGHT_BASE;
              return (
                <line x1={fromX} y1={fromY} x2={mousePos.x} y2={mousePos.y}
                  stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
              );
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <FlowNode
              key={node.id}
              node={node}
              isConnecting={!!connectingFrom}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              onEdit={() => setEditingNode(node)}
              onDelete={() => deleteNode(node.id)}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={() => handleConnectionEnd(node.id)}
              nodeWidth={NODE_WIDTH}
            />
          ))}

          {/* Add menu on double click */}
          {addMenuPos && (
            <div className="absolute z-50 bg-card border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95"
              style={{ left: addMenuPos.x, top: addMenuPos.y }}>
              <p className="text-[10px] text-muted-foreground px-2 pb-1 font-medium">Adicionar bloco</p>
              {[
                { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'text-blue-600' },
                { type: 'question', label: 'Pergunta', icon: HelpCircle, color: 'text-amber-600' },
                { type: 'menu', label: 'Menu', icon: LayoutList, color: 'text-orange-600' },
                { type: 'wait_response', label: 'Aguardar', icon: Clock, color: 'text-cyan-600' },
                { type: 'condition', label: 'Condição', icon: GitBranch, color: 'text-purple-600' },
                { type: 'action', label: 'Ação', icon: Zap, color: 'text-green-600' },
              ].map(item => (
                <button key={item.type}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                  onClick={() => addNode(item.type)}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help text */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">Clique duplo para adicionar blocos</p>
              <p className="text-xs text-muted-foreground mt-1">ou use a barra de ferramentas acima</p>
            </div>
          </div>
        )}
      </div>

      {/* Editor dialog */}
      {editingNode && (
        <CrmFlowNodeEditor
          node={editingNode} flowId={flowId} clientId={clientId}
          allNodes={nodes} onClose={() => setEditingNode(null)} onSaved={onNodeSaved}
        />
      )}

      {/* Simulator */}
      {showSimulator && (
        <CrmFlowSimulator flowId={flowId} clientId={clientId} onClose={() => setShowSimulator(false)} />
      )}
    </div>
  );
}
