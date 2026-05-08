type LlmHistoryItem = { role: 'user' | 'assistant' | 'system'; content: string };

interface QvacLlmState {
  modelId: string;
  unload?: (args: { modelId: string }) => Promise<void>;
  completion: (args: { modelId: string; history: LlmHistoryItem[]; stream?: boolean }) => any;
}

interface QvacEmbedState {
  modelId: string;
  // Key fix: SDK expects 'text', not 'input'
  embed: (args: { modelId: string; text: string | string[] }) => Promise<{ embedding: number[] | number[][] }>;
}

let llmState: QvacLlmState | null = null;
let embedState: QvacEmbedState | null = null;

function isEnabled(flag: string): boolean {
  return (process.env[flag] ?? 'false').toLowerCase() === 'true';
}

// Helper to ensure we get the right export from the SDK or specific modules
function pickExport(mod: any, key: string): any {
  return mod?.[key] ?? mod?.default?.[key] ?? mod?.[key.toLowerCase()];
}

async function ensureLlmLoaded(): Promise<QvacLlmState> {
  if (llmState) return llmState;
  
  const mod = await import('@qvac/sdk');
  const loadModel = pickExport(mod, 'loadModel');
  const completion = pickExport(mod, 'completion');
  const unloadModel = pickExport(mod, 'unloadModel');

  const modelSrc = process.env.QVAC_LLM_MODEL_SRC || mod.LLAMA_3_2_1B_INST_Q4_0;

  const modelId = await loadModel({
    modelSrc,
    modelType: 'llm',
    modelConfig: {
      gpuLayers: 99, // Offload to Macbook Metal GPU
      device: 'gpu'
    }
  });

  llmState = { modelId: String(modelId), unload: unloadModel, completion };
  return llmState;
}

async function ensureEmbedLoaded(): Promise<QvacEmbedState> {
  if (embedState) return embedState;
  
  const mod = await import('@qvac/sdk');
  const loadModel = pickExport(mod, 'loadModel');
  const embed = pickExport(mod, 'embed');

  const modelSrc = process.env.QVAC_EMBED_MODEL_SRC || mod.GTE_LARGE_FP16;

  const modelId = await loadModel({
    modelSrc,
    modelType: 'embeddings', // Fix: Must be 'embeddings'
    modelConfig: {
      gpuLayers: 99, // Required for real-time performance
      device: 'gpu'
    }
  });

  embedState = { modelId: String(modelId), embed };
  return embedState;
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
  
  // SDK returns an object { embedding: [...] }
  const { embedding } = await state.embed({ 
    modelId: state.modelId, 
    text: texts // Fix: Key must be 'text'
  });

  if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
    return embedding as number[][];
  }
  if (Array.isArray(embedding)) {
    return [embedding as number[]];
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
function collectCompletion(output: any): string | PromiseLike<string> {
  throw new Error('Function not implemented.');
}

