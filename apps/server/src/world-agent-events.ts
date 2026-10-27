import { consumeEventStream, type NetworkOperation } from '@open-legend/network';
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
 * docs/projects/parallel-batch-01-playable-week-tech-design.md#one-ordered-provider-event-consumer
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

/** Private Run fragments use the admitted operation and omit optional raw diagnostics.
 * Terminal events detach observation while exact Run/result accounting remains its owner.
 */
export async function consumeProviderStream(
  operation: NetworkOperation,
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
  await consumeEventStream<void>(
    operation,
    {
      url,
      diagnostics: 'omit',
      init: {
        method: 'GET',
        redirect: 'error',
        signal,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'text/event-stream',
          'Last-Event-ID': after,
        },
      },
      framePolicy: { kind: 'bounded', maxFrameBytes: FRAME_BYTES },
    },
    {
      headers(metadata) {
        if (metadata.status < 200 || metadata.status >= 300)
          throw new MacrofoldHttpError(metadata.status, '');
        if (
          metadata.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
          'text/event-stream'
        )
          throw new InvalidData('Macrofold did not return a Run event stream.');
      },
      async event(frame, context) {
        if (frame.kind !== 'event' || !frame.data) return { kind: 'continue' };
        if (frame.event === 'transport.error')
          throw new ProviderStreamInterrupted('Run stream interrupted.');
        let raw: unknown;
        try {
          raw = JSON.parse(frame.data);
        } catch {
          throw new InvalidData('Macrofold event frame is invalid JSON.');
        }
        const event = providerRunEvent(raw, runId);
        if (frame.id !== event.sequence || frame.event !== event.type)
          throw new InvalidData('Macrofold stream framing disagrees with its event.');
        await consume(event);
        context.throwIfStopped();
        if (/^run\.(succeeded|failed|cancelled|timed_out)$/.test(event.type))
          return { kind: 'complete', value: undefined };
        await idle();
        context.throwIfStopped();
        return { kind: 'continue' };
      },
      end() {},
      idle: {
        intervalMs: 250,
        async consume(context) {
          await idle();
          context.throwIfStopped();
        },
      },
    },
  );
}
