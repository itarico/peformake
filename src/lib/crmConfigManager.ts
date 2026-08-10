import { invokeWithAuth } from '@/lib/invokeWithAuth';

type ManagerResponse<T = unknown> = T & { error?: string };

async function callCrmConfigManager<T = unknown>(action: string, payload: Record<string, unknown>) {
  const { data, error } = await invokeWithAuth('crm-config-manager', {
    action,
    ...payload,
  });

  if (error) {
    throw error;
  }

  const response = (data ?? {}) as ManagerResponse<T>;

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Não foi possível ler o arquivo.'));
        return;
      }

      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };

    reader.onerror = () => reject(new Error('Falha ao processar o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export function saveCrmBotConfig(clientId: string, config: Record<string, unknown>) {
  return callCrmConfigManager<{ config: Record<string, unknown> }>('save_bot_config', {
    clientId,
    config,
  });
}

export function saveCrmAgentConfig(clientId: string, agentType: string, config: Record<string, unknown>) {
  return callCrmConfigManager<{ config: Record<string, unknown> }>('save_agent_config', {
    clientId,
    agentType,
    config,
  });
}

export function addCrmAgentKnowledge(clientId: string, agentType: string, item: Record<string, unknown>) {
  return callCrmConfigManager('add_agent_knowledge', {
    clientId,
    agentType,
    item,
  });
}

export function deleteCrmAgentKnowledge(knowledgeId: string) {
  return callCrmConfigManager('delete_agent_knowledge', {
    knowledgeId,
  });
}

export function addCrmAgentQuestion(clientId: string, agentType: string, question: Record<string, unknown>) {
  return callCrmConfigManager('add_agent_question', {
    clientId,
    agentType,
    question,
  });
}

export function updateCrmAgentQuestion(questionId: string, changes: Record<string, unknown>) {
  return callCrmConfigManager('update_agent_question', {
    questionId,
    changes,
  });
}

export function deleteCrmAgentQuestion(questionId: string) {
  return callCrmConfigManager('delete_agent_question', {
    questionId,
  });
}

export async function uploadCrmAgentFile(clientId: string, agentType: string, file: File) {
  const base64Data = await fileToBase64(file);

  return callCrmConfigManager<{ file: Record<string, unknown> }>('upload_agent_file', {
    clientId,
    agentType,
    fileName: file.name,
    mimeType: file.type,
    base64Data,
  });
}

export function deleteCrmAgentFile(fileId: string) {
  return callCrmConfigManager('delete_agent_file', {
    fileId,
  });
}