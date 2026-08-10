/**
 * Utility for streaming SSE responses from AI edge functions.
 * Handles both SSE streaming (Lovable AI) and JSON fallback (OpenRouter).
 */
export async function streamChat(opts: {
  url: string;
  body: Record<string, any>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onFallbackJson?: (data: any) => void;
  signal?: AbortSignal;
}) {
  const { url, body, onDelta, onDone, onFallbackJson, signal } = opts;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (resp.status === 429) throw new Error('Rate limit atingido. Aguarde e tente novamente.');
    if (resp.status === 402) throw new Error('Créditos insuficientes.');
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Erro HTTP ${resp.status}`);
    }

    const ct = resp.headers.get('content-type') || '';

    if (ct.includes('text/event-stream') && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buf.trim()) {
        for (let raw of buf.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch { /* ignore partial leftovers */ }
        }
      }
      onDone();
    } else {
      // JSON fallback response
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      if (onFallbackJson) {
        onFallbackJson(data);
      } else {
        onDelta(data.result || '');
      }
      onDone();
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Stream aborted');
    } else {
      console.error('Streaming error:', error);
      throw error;
    }
  }
}
