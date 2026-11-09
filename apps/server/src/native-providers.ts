import type {
  NativeGeometryQueries,
  NativeWorld,
  NativeWorldProvider,
  NativeWorldTurn,
  NativeWorldNpcRead,
  NativeWorldNpcTurn,
} from '@open-legend/native-simulation';
import { nativeActivityDisplay } from './native-activity.js';
import { nativeCanonicalCommand } from './native-command.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
import type { SqlDatabase } from './store.js';
import type { LiveReadCutsProvider } from './live-read-overlay.js';
import {
  readNativeHistoryEdit,
  type NativeHistoryEditReadRequest,
} from './native-temporal-pages.js';
import {
  nativeAttemptNormalization,
  nativeCollation,
  nativeResponseDigest,
  nativeUtterance,
  nativeWordSegments,
} from './native-language.js';

type Binding = NativeGeometryQueries['binding'];
type Question = { kind: string; value: unknown };
export interface NativeProviderAnswer {
  readonly json: string;
}
export interface NativeHistoryReadContext {
  readonly db: SqlDatabase;
  readonly liveReadCuts: LiveReadCutsProvider;
}

/** Pure physical/language preparation for the real native cursor. The selected
 * question contains no world setter, grant, provider spending or model request. */
export async function answerNativeProvider(
  provider: NativeWorldProvider,
  geometry: NativeGeometryProviders,
  history?: NativeHistoryReadContext,
): Promise<NativeProviderAnswer> {
  const question = decodeNativeProduct<Question>(provider.question());
  const json = await prepareProviderAnswer(question, geometry, history);
  return retainNativeSources({ json }, question);
}

async function prepareProviderAnswer(
  question: Question,
  geometry: NativeGeometryProviders,
  history?: NativeHistoryReadContext,
): Promise<string> {
  const value = question.value;
  switch (question.kind) {
    case 'history': {
      const cut = history?.liveReadCuts();
      if (!history || !cut)
        throw new Error('Native history preparation has no accepted SQL read cut.');
      return JSON.stringify(
        await readNativeHistoryEdit(history.db, value as NativeHistoryEditReadRequest, cut),
      );
    }
    case 'geometry':
      return JSON.stringify(await geometry.compute(value as NativeGeometryQueries));
    case 'utterance': {
      const request = value as { binding: Binding; text: Parameters<typeof nativeUtterance>[0] };
      return JSON.stringify({ binding: request.binding, ...nativeUtterance(request.text) });
    }
    case 'collation': {
      const request = value as {
        binding: Binding;
        strings: Parameters<typeof nativeCollation>[0];
      };
      return JSON.stringify({ binding: request.binding, ...nativeCollation(request.strings) });
    }
    case 'words': {
      const request = value as {
        binding: Binding;
        strings: Parameters<typeof nativeWordSegments>[0];
      };
      return JSON.stringify({
        binding: request.binding,
        words: nativeWordSegments(request.strings),
      });
    }
    case 'display':
      return JSON.stringify(
        nativeActivityDisplay(value as Parameters<typeof nativeActivityDisplay>[0]),
      );
    case 'canonical':
      return JSON.stringify(
        nativeCanonicalCommand(value as Parameters<typeof nativeCanonicalCommand>[0]),
      );
    case 'normalization':
      return JSON.stringify(
        nativeAttemptNormalization(value as Parameters<typeof nativeAttemptNormalization>[0]),
      );
    case 'digest':
      return JSON.stringify(
        nativeResponseDigest(value as Parameters<typeof nativeResponseDigest>[0]),
      );
    default:
      throw new Error('Native operation requested an uncompiled preparation family.');
  }
}

/** Awaiting a provider parks the native writer and releases its compute job.
 * An abandoned caller still cancels the real outer checkpoint before returning;
 * detached provider buffers retain their own capacity until actually released. */
export async function driveNativeOperation(
  world: NativeWorld,
  first: NativeWorldTurn,
  geometry: NativeGeometryProviders,
  signal?: AbortSignal,
  history?: NativeHistoryReadContext,
): Promise<NativeWorldTurn> {
  let turn = first;
  while (turn.kind === 'provider') {
    if (!turn.provider) throw new Error('Native provider continuation has no owned question.');
    try {
      if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
      const answer = await answerNativeProvider(turn.provider, geometry, history);
      if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
      turn = await world.answer(turn.key, turn.provider, Buffer.from(answer.json, 'utf8'));
    } catch (error) {
      await world.cancel(turn.key);
      throw error;
    }
  }
  return turn;
}

/** Choice discovery parks the same native checkpoint for real providers and
 * closes it through the read-only completion. It produces no Ready/accept path. */
export async function driveNativeNpcCandidates(
  world: NativeWorld,
  read: NativeWorldNpcRead,
  first: NativeWorldNpcTurn,
  geometry: NativeGeometryProviders,
  signal?: AbortSignal,
): Promise<void> {
  let turn = first;
  while (turn.kind === 'provider') {
    if (!turn.provider) throw new Error('Native NPC choices have no owned provider question.');
    try {
      signal?.throwIfAborted();
      const answer = await answerNativeProvider(turn.provider, geometry);
      signal?.throwIfAborted();
      turn = await world.answerNpcCandidates(
        read,
        turn.key,
        turn.provider,
        Buffer.from(answer.json),
      );
    } catch (error) {
      await world.cancel(turn.key);
      throw error;
    }
  }
  if (turn.kind !== 'complete')
    throw new Error('Native NPC discovery did not close its read-only checkpoint.');
}
