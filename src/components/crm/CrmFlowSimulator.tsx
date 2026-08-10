import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, RotateCcw } from 'lucide-react';

interface Props {
  flowId: string;
  clientId: string;
  onClose: () => void;
}

interface SimMessage {
  from: 'bot' | 'user';
  text: string;
}

export default function CrmFlowSimulator({ flowId, clientId, onClose }: Props) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [nodes, setNodes] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionVars, setSessionVars] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAndStart();
  }, [flowId]);

  const loadAndStart = async () => {
    const { data } = await supabase
      .from('crm_flow_nodes')
      .select('*')
      .eq('flow_id', flowId)
      .order('node_order', { ascending: true });
    
    const nodeList = data || [];
    setNodes(nodeList);
    setMessages([]);
    setCompleted(false);
    setSessionVars({});
    setCurrentIdx(0);
    
    if (nodeList.length > 0) {
      processNodeLocal(nodeList, 0, {});
    }
  };

  const processNodeLocal = (nodeList: any[], idx: number, vars: Record<string, any>) => {
    if (idx >= nodeList.length) {
      setCompleted(true);
      setVariables(vars);
      setMessages(prev => [...prev, { from: 'bot', text: '✅ Fluxo finalizado!' }]);
      return;
    }

    const node = nodeList[idx];
    const config = node.config || {};

    if (node.node_type === 'message') {
      const text = replaceVars(config.text || '(mensagem vazia)', vars);
      setMessages(prev => [...prev, { from: 'bot', text }]);
      // Auto-advance
      const nextIdx = findNextIdx(nodeList, node, idx);
      setTimeout(() => processNodeLocal(nodeList, nextIdx, vars), 500);
    } else if (node.node_type === 'question') {
      const text = replaceVars(config.text || '(pergunta vazia)', vars);
      setMessages(prev => [...prev, { from: 'bot', text }]);
      setQuestion(config);
      setWaiting(true);
      setCurrentIdx(idx);
      setSessionVars(vars);
    } else if (node.node_type === 'condition') {
      const varValue = vars[config.variable] ?? '';
      let result = false;
      switch (config.operator) {
        case 'equals': result = String(varValue).toLowerCase() === String(config.value).toLowerCase(); break;
        case 'not_equals': result = String(varValue).toLowerCase() !== String(config.value).toLowerCase(); break;
        case 'contains': result = String(varValue).toLowerCase().includes(String(config.value).toLowerCase()); break;
        case 'greater_than': result = Number(varValue) > Number(config.value); break;
        case 'less_than': result = Number(varValue) < Number(config.value); break;
        default: result = String(varValue) === String(config.value);
      }

      setMessages(prev => [...prev, { from: 'bot', text: `⚙️ Condição: ${config.variable} ${config.operator} ${config.value} → ${result ? '✅ Verdadeiro' : '❌ Falso'}` }]);

      const targetId = result ? config.true_node_id : config.false_node_id;
      if (targetId) {
        const targetIdx = nodeList.findIndex(n => n.id === targetId);
        if (targetIdx >= 0) {
          setTimeout(() => processNodeLocal(nodeList, targetIdx, vars), 500);
          return;
        }
      }
      // No target = end
      setCompleted(true);
      setVariables(vars);
      setMessages(prev => [...prev, { from: 'bot', text: '✅ Fluxo finalizado!' }]);
    } else if (node.node_type === 'action') {
      const actionLabel = config.action_type === 'tag' ? `🏷️ Tag: ${config.tag_value}` :
        config.action_type === 'webhook' ? `📡 Webhook disparado` :
        config.action_type === 'api_call' ? `🔗 API: ${config.api_url}` : `⚡ Ação: ${config.action_type}`;
      setMessages(prev => [...prev, { from: 'bot', text: actionLabel }]);
      const nextIdx = findNextIdx(nodeList, node, idx);
      setTimeout(() => processNodeLocal(nodeList, nextIdx, vars), 500);
    } else if (node.node_type === 'wait_response') {
      const text = replaceVars(config.text || '⏳ Aguardando resposta...', vars);
      setMessages(prev => [...prev, { from: 'bot', text }]);
      setQuestion({ response_type: 'open', variable_name: config.variable_name });
      setWaiting(true);
      setCurrentIdx(idx);
      setSessionVars(vars);
    }
  };

  const findNextIdx = (nodeList: any[], node: any, currentIdx: number): number => {
    if (node.next_node_id) {
      const targetIdx = nodeList.findIndex(n => n.id === node.next_node_id);
      if (targetIdx >= 0) return targetIdx;
    }
    return currentIdx + 1;
  };

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || !waiting) return;

    setMessages(prev => [...prev, { from: 'user', text: msg }]);
    setInput('');
    setWaiting(false);

    const node = nodes[currentIdx];
    const config = node?.config || {};
    const newVars = { ...sessionVars };
    if (config.variable_name) newVars[config.variable_name] = msg;

    setQuestion(null);

    // Find next node
    let nextIdx: number;
    if (config.response_type === 'options' && config.options) {
      const opt = config.options.find((o: any) => o.value === msg || o.label === msg);
      if (opt?.next_node_id) {
        nextIdx = nodes.findIndex(n => n.id === opt.next_node_id);
        if (nextIdx < 0) nextIdx = currentIdx + 1;
      } else {
        nextIdx = findNextIdx(nodes, node, currentIdx);
      }
    } else {
      nextIdx = findNextIdx(nodes, node, currentIdx);
    }

    setTimeout(() => processNodeLocal(nodes, nextIdx, newVars), 300);
  };

  const replaceVars = (text: string, vars: Record<string, any>) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm">Simulador de Fluxo</DialogTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadAndStart}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 pb-2 max-h-[50vh]">
          <div className="space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${
                  m.from === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Quick options */}
        {waiting && question?.response_type === 'options' && question.options?.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {question.options.map((opt: any, i: number) => (
              <Button key={i} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleSend(opt.value || opt.label)}>
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={completed ? 'Fluxo finalizado' : waiting ? 'Digite sua resposta...' : 'Aguarde...'}
            disabled={completed || !waiting}
            className="text-xs"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleSend()} disabled={completed || !waiting}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Variables display */}
        {completed && Object.keys(variables).length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Variáveis capturadas:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(variables).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[10px]">
                  {k}: {String(v)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
