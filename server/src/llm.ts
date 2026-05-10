/**
 * Unified LLM client for agent specialists.
 * Chain: Groq -> Gemini -> Anthropic
 * Set API keys in server/.env: GROQ_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY
 */

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callGroq(messages: LlmMessage[], maxTokens = 500): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq HTTP ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as any;
    return String(payload?.choices?.[0]?.message?.content ?? '').trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(messages: LlmMessage[], maxTokens = 500): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  // Convert messages to Gemini format
  const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as any;
    return String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(messages: LlmMessage[], maxTokens = 500): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
        max_tokens: maxTokens,
        temperature: 0.7,
        system: messages.find((m) => m.role === 'system')?.content,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic HTTP ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as any;
    return String(payload?.content?.[0]?.text ?? '').trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
): Promise<string> {
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // 1. Try Groq (fastest)
  try {
    const result = await callGroq(messages, maxTokens);
    if (result) return result;
  } catch (groqError: any) {
    console.warn('[LLM] Groq failed, trying Gemini fallback', { error: groqError?.message });
  }

  // 2. Try Gemini (Google)
  try {
    const result = await callGemini(messages, maxTokens);
    if (result) return result;
  } catch (geminiError: any) {
    console.warn('[LLM] Gemini failed, trying Anthropic fallback', { error: geminiError?.message });
  }

  // 3. Fallback to Anthropic (highest quality)
  try {
    const result = await callAnthropic(messages, maxTokens);
    if (result) return result;
  } catch (anthropicError: any) {
    console.error('[LLM] Anthropic also failed', { error: anthropicError?.message });
  }

  throw new Error('All LLM providers failed. Check GROQ_API_KEY, GEMINI_API_KEY, and ANTHROPIC_API_KEY in server/.env');
}
