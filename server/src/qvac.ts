type LlmHistoryItem = { role: 'user' | 'assistant' | 'system'; content: string };

interface QvacLlmState {
  modelId: string;
  unload?: (args: { modelId: string }) => Promise<void>;
  completion: (args: { modelId: string; history: LlmHistoryItem[]; stream?: boolean }) => any;
}

interface QvacEmbedState {
  modelId: string;
  embed: (args: { modelId: string; input: string | string[] }) => Promise<number[] | number[][]>;
}

let llmState: QvacLlmState | null = null;
let embedState: QvacEmbedState | null = null;

function isEnabled(flag: string): boolean {
  return (process.env[flag] ?? 'false').toLowerCase() === 'true';
}

async function loadLlmModule(): Promise<any> {
  try {
    return await import('@qvac/llm-llamacpp');
  } catch {
    return await import('@qvac/sdk');
  }
}

async function loadEmbedModule(): Promise<any> {
  try {
    return await import('@qvac/embed-llamacpp');
  } catch {
    return await import('@qvac/sdk');
  }
}

function pickExport<T extends keyof any>(mod: any, key: T): any {
  return mod?.[key] ?? mod?.default?.[key];
}

async function ensureLlmLoaded(): Promise<QvacLlmState> {
  if (llmState) return llmState;
  const mod = await loadLlmModule();
  const loadModel = pickExport(mod, 'loadModel');
  const completion = pickExport(mod, 'completion');
  const unloadModel = pickExport(mod, 'unloadModel');
  if (!loadModel || !completion) {
    throw new Error('QVAC LLM module is missing loadModel or completion exports');
  }

  const modelSrc = process.env.QVAC_LLM_MODEL_SRC ?? pickExport(mod, 'LLAMA_3_2_1B_INST_Q4_0');
  if (!modelSrc) {
    throw new Error('QVAC_LLM_MODEL_SRC is required when LLAMA_3_2_1B_INST_Q4_0 is unavailable');
  }

  const modelId = await loadModel({
    modelSrc,
    modelType: 'llm',
  });

  llmState = {
    modelId: String(modelId),
    unload: unloadModel,
    completion,
  };

  return llmState;
}

async function ensureEmbedLoaded(): Promise<QvacEmbedState> {
  if (embedState) return embedState;
  const mod = await loadEmbedModule();
  const loadModel = pickExport(mod, 'loadModel');
  const embed = pickExport(mod, 'embed') ?? pickExport(mod, 'embedding') ?? pickExport(mod, 'embeddings');
  if (!loadModel || !embed) {
    throw new Error('QVAC embed module is missing loadModel or embed exports');
  }

  const modelSrc = process.env.QVAC_EMBED_MODEL_SRC ?? pickExport(mod, 'LLAMA_3_2_1B_INST_Q4_0');
  if (!modelSrc) {
    throw new Error('QVAC_EMBED_MODEL_SRC is required when default embed model is unavailable');
  }

  const modelId = await loadModel({
    modelSrc,
    modelType: 'embed',
  });

  embedState = {
    modelId: String(modelId),
    embed,
  };

  return embedState;
}

async function collectCompletion(output: any): Promise<string> {
  if (!output) return '';
  if (typeof output === 'string') return output;
  if (typeof output.text === 'string') return output.text;

  const tokenStream = output.tokenStream;
  if (tokenStream && typeof tokenStream[Symbol.asyncIterator] === 'function') {
    let text = '';
    for await (const token of tokenStream) {
      text += String(token);
    }
    return text;
  }

  return '';
}

export async function runQvacCompletion(prompt: string): Promise<string> {
  if (!isEnabled('QVAC_LLM_ENABLED')) {
    throw new Error('QVAC_LLM_ENABLED is false');
  }
  const state = await ensureLlmLoaded();
  const history: LlmHistoryItem[] = [{ role: 'user', content: prompt }];
  const output = await state.completion({ modelId: state.modelId, history, stream: true });
  return collectCompletion(output);
}

export async function runQvacEmbedding(texts: string[]): Promise<number[][]> {
  if (!isEnabled('QVAC_EMBED_ENABLED')) {
    throw new Error('QVAC_EMBED_ENABLED is false');
  }
  const state = await ensureEmbedLoaded();
  const output = await state.embed({ modelId: state.modelId, input: texts });
  if (Array.isArray(output) && Array.isArray(output[0])) {
    return output as number[][];
  }
  if (Array.isArray(output)) {
    return [output as number[]];
  }
  return [];
}

export async function unloadQvacModels(): Promise<void> {
  if (llmState?.unload) {
    await llmState.unload({ modelId: llmState.modelId });
  }
  llmState = null;
  embedState = null;
}
