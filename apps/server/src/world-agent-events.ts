import { InvalidData, MacrofoldHttpError, macrofoldObject } from '@open-legend/ai';

export const WORLD_AGENT_PREVIEW_BYTES = 64 * 1024;
const FRAME_BYTES = 256 * 1024;
export type ProviderRunEvent = {
  runId: string;
  sequence: string;
  type: string;
  data: Record<string, unknown>;
};
export class ProviderEventGap extends Error {}
export class ProviderStreamInterrupted extends Error {}

export function providerRunEvent(raw: unknown, runId: string): ProviderRunEvent {
  const event = macrofoldObject(raw);
  if (Buffer.byteLength(JSON.stringify(event)) > FRAME_BYTES)
    throw new InvalidData('Macrofold event exceeds its byte limit.');
  if (
    event['schema_version'] !== 1 ||
    event['run_id'] !== runId ||
    typeof event['sequence'] !== 'string' ||
    !/^(0|[1-9][0-9]{0,19})$/.test(event['sequence']) ||
    typeof event['type'] !== 'string' ||
    !/^[a-z][a-z0-9_.]{0,79}$/.test(event['type'])
  )
    throw new InvalidData('Macrofold event identity, version or sequence is invalid.');
  const data = macrofoldObject(event['data']);
  if (event['type'] === 'output.delta' && typeof data['text'] !== 'string')
    throw new InvalidData('Macrofold answer fragment is invalid.');
  return { runId, sequence: event['sequence'], type: event['type'], data };
}

/** Carry only a possible protected prefix. It belongs to this exact Run and never
 * enters diagnostics or the owner-visible projection. EOF discards the carry.
 * docs/projects/next-playable-week-tech-design.md#one-ordered-provider-event-consumer
 */
export function redactRunFragment(
  carry: string,
  fragment: string,
  protectedValues: readonly string[],
): { text: string; carry: string } {
  let text = carry + fragment;
  for (const value of protectedValues) {
    if (!value || value.length > 256) throw new InvalidData('Invalid protected Run value.');
    text = text.split(value).join('[session context redacted]');
  }
  let held = 0;
  for (const value of protectedValues)
    for (let size = Math.min(value.length - 1, text.length); size > held; size--)
      if (text.endsWith(value.slice(0, size))) {
        held = size;
        break;
      }
  // Providers can split a Unicode character between their JSON string fragments.
  if (!held && /[\uD800-\uDBFF]$/.test(text)) held = 1;
  return { text: held ? text.slice(0, -held) : text, carry: held ? text.slice(-held) : '' };
}

export function boundedPreview(text: string, fragment: string) {
  const remaining = WORLD_AGENT_PREVIEW_BYTES - Buffer.byteLength(text);
  if (remaining < 0) throw new InvalidData('Retained preview exceeds its byte limit.');
  // Escaped control characters can make a 64 KiB text exceed the 128 KiB record.
  // Reserve space for the bounded private cursor/fingerprints and owner metadata.
  const serializedRemaining = 96 * 1024 - Buffer.byteLength(JSON.stringify(text));
  if (
    Buffer.byteLength(fragment) <= remaining &&
    Buffer.byteLength(JSON.stringify(text + fragment)) <= 96 * 1024
  )
    return { text: text + fragment, omitted: 0 };
  let bytes = 0;
  let serializedBytes = 0;
  let retained = '';
  for (const character of fragment) {
    const size = Buffer.byteLength(character);
    const serializedSize = Buffer.byteLength(JSON.stringify(character)) - 2;
    if (bytes + size > remaining || serializedBytes + serializedSize > serializedRemaining) break;
    bytes += size;
    serializedBytes += serializedSize;
    retained += character;
  }
  return { text: text + retained, omitted: Buffer.byteLength(fragment) - bytes };
}

/** A read-only transport deliberately avoids IntelligenceLog.fetch: that wrapper
 * waits for a complete cloned response and would capture unsanitized fragments.
 * The existing receipts and terminal-result owner still account for the Run.
 */
export async function consumeProviderStream(
  baseUrl: string,
  key: string,
  runId: string,
  after: string,
  signal: AbortSignal,
  consume: (event: ProviderRunEvent) => Promise<void>,
  idle: () => Promise<void>,
): Promise<void> {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || !key)
    throw new InvalidData('Invalid Macrofold stream configuration.');
  const url = new URL(`/v1/runs/${encodeURIComponent(runId)}/stream?after=${after}`, base);
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'text/event-stream',
      'Last-Event-ID': after,
    },
    signal,
  });
  if (!response.ok) {
    void response.body?.cancel();
    throw new MacrofoldHttpError(response.status, '');
  }
  if (!response.headers.get('content-type')?.startsWith('text/event-stream') || !response.body) {
    void response.body?.cancel();
    throw new InvalidData('Macrofold did not return a Run event stream.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let pending: Promise<ReadableStreamReadResult<Uint8Array>> | undefined;
  try {
    for (;;) {
      signal.throwIfAborted();
      pending ??= reader.read();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const chunk = await Promise.race([
        pending,
        new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), 250))),
      ]).finally(() => clearTimeout(timer));
      if (!chunk) {
        await idle();
        continue;
      }
      pending = undefined;
      if (chunk.done) break;
      // Network chunks do not align with events. Decode bounded slices while
      // enforcing the limit on each unfinished frame, never the transport batch.
      for (let offset = 0; offset < chunk.value.byteLength; offset += 64 * 1024) {
        signal.throwIfAborted();
        buffer += decoder.decode(chunk.value.subarray(offset, offset + 64 * 1024), {
          stream: true,
        });
        for (;;) {
          const boundary = /\r?\n\r?\n/.exec(buffer);
          if (!boundary) break;
          const frame = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          if (Buffer.byteLength(frame) > FRAME_BYTES)
            throw new InvalidData('Macrofold event frame exceeds its byte limit.');
          let id: string | undefined;
          let type: string | undefined;
          const data: string[] = [];
          for (const line of frame.split(/\r?\n/)) {
            if (!line || line.startsWith(':')) continue;
            const colon = line.indexOf(':');
            const field = colon < 0 ? line : line.slice(0, colon);
            const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
            if (field === 'id') id = value;
            else if (field === 'event') type = value;
            else if (field === 'data') data.push(value);
          }
          if (!data.length) continue;
          if (type === 'transport.error')
            throw new ProviderStreamInterrupted('Run stream interrupted.');
          let raw: unknown;
          try {
            raw = JSON.parse(data.join('\n'));
          } catch {
            // JSON diagnostics may quote private provider content.
            throw new InvalidData('Macrofold event frame is invalid JSON.');
          }
          const event = providerRunEvent(raw, runId);
          if (id !== event.sequence || type !== event.type)
            throw new InvalidData('Macrofold stream framing disagrees with its event.');
          await consume(event);
          // A proxy can keep the HTTP connection open after a terminal event.
          // Detach so the existing owner can independently check result/usage;
          // the event itself still cannot mark the outer turn complete.
          if (/^run\.(succeeded|failed|cancelled|timed_out)$/.test(event.type)) return;
        }
        if (Buffer.byteLength(buffer) > FRAME_BYTES)
          throw new InvalidData('Macrofold event frame exceeds its byte limit.');
      }
      await idle();
    }
    buffer += decoder.decode();
    // An interrupted frame is recovered from event history; it is never applied.
    if (buffer.trim()) throw new ProviderStreamInterrupted('Run stream ended within a frame.');
  } finally {
    await reader.cancel().catch(() => {});
  }
}
