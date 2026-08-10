import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface FlowNode {
  id: string;
  flow_id: string;
  node_type: string;
  node_order: number;
  config: any;
  next_node_id: string | null;
}

interface FlowWebhook {
  id: string;
  name: string;
}

interface Props {
  node: FlowNode;
  flowId: string;
  clientId: string;
  allNodes: FlowNode[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CrmFlowNodeEditor({ node, flowId, clientId, allNodes, onClose, onSaved }: Props) {
  const [config, setConfig] = useState<any>({ ...node.config });
  const [nextNodeId, setNextNodeId] = useState<string>(node.next_node_id || '__none__');
  const [saving, setSaving] = useState(false);
  const [webhooks, setWebhooks] = useState<FlowWebhook[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    if (node.node_type !== 'action') return;
    supabase
      .from('crm_flow_webhooks')
      .select('id, name')
      .eq('client_id', clientId)
      .order('name')
      .then(({ data }) => setWebhooks((data as FlowWebhook[]) || []));
  }, [clientId, node.node_type]);

  const mediaAccept = useMemo(() => {
    switch (config.media_type) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'audio':
        return 'audio/*';
      case 'document':
        return '.pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx,.csv,application/*';
      default:
        return '*/*';
    }
  }, [config.media_type]);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const sanitizedConfig = {
      ...config,
      options: Array.isArray(config.options)
        ? config.options.map((opt: any) => ({
            ...opt,
            next_node_id: !opt?.next_node_id || opt.next_node_id === '__default__' ? null : opt.next_node_id,
          }))
        : config.options,
      webhook_id: config.webhook_id === '__none__' ? null : config.webhook_id,
    };
    const { error } = await supabase
      .from('crm_flow_nodes')
      .update({ config: sanitizedConfig, next_node_id: nextNodeId === '__none__' ? null : nextNodeId || null })
      .eq('id', node.id);
    setSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Bloco salvo!');
    onSaved();
  };

  const otherNodes = allNodes.filter(n => n.id !== node.id);

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setUploadingMedia(true);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `flows/${clientId}/${Date.now()}-${safeName}.${ext}`;
      const { error } = await supabase.storage.from('crm-media').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('crm-media').getPublicUrl(path);
      setConfig((prev: any) => ({
        ...prev,
        media_url: data.publicUrl,
        media_name: file.name,
      }));
      toast.success('Mídia anexada ao bloco');
    } catch (error: any) {
      toast.error(`Erro ao subir mídia: ${error.message}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Editar {node.node_type === 'message' ? 'Mensagem' : node.node_type === 'question' ? 'Pergunta' : node.node_type === 'condition' ? 'Condição' : node.node_type === 'wait_response' ? 'Aguardar Resposta' : 'Ação'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* MESSAGE */}
          {node.node_type === 'message' && (
            <>
              <div>
                <Label className="text-xs">Texto da mensagem</Label>
                <Textarea
                  value={config.text || ''}
                  onChange={e => updateConfig('text', e.target.value)}
                  placeholder="Use {{nome}} para variáveis"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">URL de mídia (opcional)</Label>
                <Input value={config.media_url || ''} onChange={e => updateConfig('media_url', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Tipo de mídia</Label>
                <Select value={config.media_type || 'text'} onValueChange={v => updateConfig('media_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.media_type && config.media_type !== 'text' && (
                <>
                  <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-3">
                    <Label className="text-xs">Arquivo da mídia</Label>
                    <input
                      type="file"
                      accept={mediaAccept}
                      className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                      onChange={handleMediaUpload}
                      disabled={uploadingMedia}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Envie aqui a mídia do bloco ou cole uma URL pública abaixo.
                    </p>
                  </div>
                  {config.media_type === 'document' && (
                    <div>
                      <Label className="text-xs">Nome do arquivo</Label>
                      <Input
                        value={config.media_name || ''}
                        onChange={e => updateConfig('media_name', e.target.value)}
                        placeholder="Ex: catálogo.pdf"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* QUESTION */}
          {node.node_type === 'question' && (
            <>
              <div>
                <Label className="text-xs">Pergunta</Label>
                <Textarea
                  value={config.text || ''}
                  onChange={e => updateConfig('text', e.target.value)}
                  placeholder="Ex: Qual seu faturamento mensal?"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Nome da variável</Label>
                <Input
                  value={config.variable_name || ''}
                  onChange={e => updateConfig('variable_name', e.target.value)}
                  placeholder="Ex: faturamento, nome, interesse"
                />
              </div>
              <div>
                <Label className="text-xs">Tipo de resposta</Label>
                <Select
                  value={config.response_type || 'open'}
                  onValueChange={v => {
                    updateConfig('response_type', v);
                    if (v === 'options' && !(config.options || []).length) {
                      updateConfig('options', [
                        { label: 'Opção 1', value: 'opcao_1', next_node_id: null },
                        { label: 'Opção 2', value: 'opcao_2', next_node_id: null },
                      ]);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Resposta aberta</SelectItem>
                    <SelectItem value="options">Opções</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.response_type === 'options' && (
                <div className="space-y-2">
                  <Label className="text-xs">Opções</Label>
                  {(config.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={opt.label || ''}
                        onChange={e => {
                          const opts = [...(config.options || [])];
                          opts[i] = {
                            ...opts[i],
                            label: e.target.value,
                            value: e.target.value.trim().toLowerCase().replace(/\s+/g, '_') || `opcao_${i + 1}`,
                          };
                          updateConfig('options', opts);
                        }}
                        placeholder={`Saída ${i + 1}`}
                        className="flex-1"
                      />
                      <Select
                        value={opt.next_node_id || '__default__'}
                        onValueChange={v => {
                          const opts = [...(config.options || [])];
                          opts[i] = { ...opts[i], next_node_id: v === '__default__' ? null : v };
                          updateConfig('options', opts);
                        }}
                      >
                        <SelectTrigger className="w-32"><SelectValue placeholder="Próximo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Padrão</SelectItem>
                          {otherNodes.map(n => (
                            <SelectItem key={n.id} value={n.id}>#{n.node_order + 1} {n.node_type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                        const opts = (config.options || []).filter((_: any, j: number) => j !== i);
                        updateConfig('options', opts);
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      updateConfig('options', [...(config.options || []), { label: '', value: '', next_node_id: null }]);
                  }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar saída
                  </Button>
                </div>
              )}
            </>
          )}

          {/* CONDITION */}
          {node.node_type === 'condition' && (
            <>
              <div>
                <Label className="text-xs">Variável</Label>
                <Input value={config.variable || ''} onChange={e => updateConfig('variable', e.target.value)} placeholder="Ex: faturamento" />
              </div>
              <div>
                <Label className="text-xs">Operador</Label>
                <Select value={config.operator || 'equals'} onValueChange={v => updateConfig('operator', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input value={config.value || ''} onChange={e => updateConfig('value', e.target.value)} placeholder="Ex: 50000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-green-600">Se verdadeiro →</Label>
                  <Select value={config.true_node_id || '__none__'} onValueChange={v => updateConfig('true_node_id', v === '__none__' ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (fim)</SelectItem>
                      {otherNodes.map(n => (
                        <SelectItem key={n.id} value={n.id}>#{n.node_order + 1} {n.node_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-red-600">Se falso →</Label>
                  <Select value={config.false_node_id || '__none__'} onValueChange={v => updateConfig('false_node_id', v === '__none__' ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (fim)</SelectItem>
                      {otherNodes.map(n => (
                        <SelectItem key={n.id} value={n.id}>#{n.node_order + 1} {n.node_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ACTION */}
          {node.node_type === 'action' && (
            <>
              <div>
                <Label className="text-xs">Tipo de ação</Label>
                <Select value={config.action_type || 'tag'} onValueChange={v => updateConfig('action_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag">Adicionar Tag</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="api_call">Chamada API</SelectItem>
                    <SelectItem value="crm_update">Atualizar CRM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.action_type === 'tag' && (
                <div>
                  <Label className="text-xs">Tag</Label>
                  <Input value={config.tag_value || ''} onChange={e => updateConfig('tag_value', e.target.value)} placeholder="Ex: lead quente" />
                </div>
              )}
              {config.action_type === 'webhook' && (
                <div>
                  <Label className="text-xs">Webhook</Label>
                  <Select value={config.webhook_id || '__none__'} onValueChange={v => updateConfig('webhook_id', v === '__none__' ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um webhook" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum webhook</SelectItem>
                      {webhooks.map((webhook) => (
                        <SelectItem key={webhook.id} value={webhook.id}>{webhook.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {config.action_type === 'api_call' && (
                <div>
                  <Label className="text-xs">URL da API</Label>
                  <Input value={config.api_url || ''} onChange={e => updateConfig('api_url', e.target.value)} placeholder="https://..." />
                </div>
              )}
            </>
          )}

          {/* WAIT RESPONSE */}
          {node.node_type === 'wait_response' && (
            <>
              <div>
                <Label className="text-xs">Mensagem (exibida antes de aguardar)</Label>
                <Textarea
                  value={config.text || ''}
                  onChange={e => updateConfig('text', e.target.value)}
                  placeholder="Ex: Por favor, me envie seu CPF para prosseguir..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Nome da variável (salvar resposta)</Label>
                <Input
                  value={config.variable_name || ''}
                  onChange={e => updateConfig('variable_name', e.target.value)}
                  placeholder="Ex: cpf, endereco, resposta"
                />
              </div>
              <div>
                <Label className="text-xs">Timeout (minutos, 0 = sem limite)</Label>
                <Input
                  type="number"
                  value={config.timeout_minutes || 0}
                  onChange={e => updateConfig('timeout_minutes', Number(e.target.value))}
                  placeholder="0"
                  min={0}
                />
              </div>
            </>
          )}

          {/* Next node (for non-condition, non-question-with-options) */}
          {!(node.node_type === 'condition') && !(node.node_type === 'question' && config.response_type === 'options') && (
            <div>
              <Label className="text-xs">Próximo bloco</Label>
              <Select value={nextNodeId} onValueChange={setNextNodeId}>
                <SelectTrigger><SelectValue placeholder="Automático (próximo na lista)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (fim do fluxo)</SelectItem>
                  {otherNodes.map(n => (
                    <SelectItem key={n.id} value={n.id}>#{n.node_order + 1} {n.node_type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
