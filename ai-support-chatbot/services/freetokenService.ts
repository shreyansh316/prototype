export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const FREETOKEN_BASE_URL =
  process.env.EXPO_PUBLIC_FREETOKEN_URL || 'http://10.0.2.2:8000/v1';

export async function streamChatCompletion({
  messages,
  model = 'default',
  signal,
  onChunk,
}: {
  messages: ChatMessage[];
  model?: string;
  signal?: AbortSignal;
  onChunk: (delta: string) => void;
}) {
  const startTime = Date.now();
  let firstTokenLogged = false;
  let ttft = 0;

  let response: Response | null = null;
  let attempt = 0;
  const maxRetries = 3;

  while (attempt <= maxRetries) {
    try {
      if (signal?.aborted) throw new Error('AbortError');
      
      response = await fetch(`${FREETOKEN_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dummy-token',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal,
      });

      if (response.ok) break;
      
      // If 4xx (except 429), don't retry, it's a client error
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`FreeToken API Error: ${response.status} ${response.statusText}`);
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError' || attempt === maxRetries) {
        if (!response) throw err;
        throw new Error(`FreeToken API Error after ${maxRetries} retries: ${err.message}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[FreeToken] Stream fetch failed (${err.message}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  if (!response || !response.ok) {
    throw new Error(`FreeToken API request failed`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      if (trimmed === 'data: [DONE]') return { ttft, totalDuration: Date.now() - startTime };

      try {
        const json = JSON.parse(trimmed.replace('data: ', ''));
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          if (!firstTokenLogged) {
            ttft = Date.now() - startTime;
            firstTokenLogged = true;
          }
          onChunk(delta);
        }
      } catch {
        // Continue buffering if JSON split across chunks
      }
    }
  }

  return { ttft, totalDuration: Date.now() - startTime };
}
