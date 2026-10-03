import { InvalidData } from './validation.js';

/** Incremental UTF-8/SSE framing with one bounded pending frame, no replay log. */
export async function consumeEventStream(
  response: Response,
  maxBytes: number,
  event: (value: unknown) => void | false | Promise<void | false>,
  signal?: AbortSignal,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new InvalidData('Missing provider stream.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  let line = '';
  let data: string[] = [];
  let frameBytes = 0;
  let afterCr = false;
  let bytes = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const part = await reader.read();
      signal?.throwIfAborted();
      bytes += part.value?.byteLength ?? 0;
      if (bytes > maxBytes) throw new InvalidData('Provider stream exceeds its byte limit.');
      const text = part.done ? decoder.decode() : decoder.decode(part.value, { stream: true });
      // Consume each character once, including split CR/LF. Rescanning a large
      // pending frame on every tiny network chunk would make work quadratic.
      for (const ch of text) {
        if (afterCr && ch === '\n') {
          afterCr = false;
          continue;
        }
        afterCr = ch === '\r';
        frameBytes += Buffer.byteLength(ch);
        if (frameBytes > 1_000_000)
          throw new InvalidData('Provider stream frame exceeds its byte limit.');
        if (ch !== '\n' && ch !== '\r') {
          line += ch;
          continue;
        }
        if (line) {
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
          line = '';
        } else {
          const payload = data.join('\n');
          data = [];
          frameBytes = 0;
          if (payload && payload !== '[DONE]' && (await event(JSON.parse(payload))) === false)
            return;
        }
      }
      if (part.done) {
        if (line.trim() || data.length) throw new InvalidData('Incomplete provider stream frame.');
        return;
      }
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
  }
}
