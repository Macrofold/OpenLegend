import type {
  NativeGeometryQueries,
  NativeWorld,
  NativeWorldProvider,
  NativeWorldTurn,
} from '@open-legend/native-simulation';
import { nativeActivityDisplay } from './native-activity.js';
import { nativeCanonicalCommand } from './native-command.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
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

/** Pure physical/language preparation for the real native cursor. The selected
 * question contains no world setter, grant, provider spending or model request. */
export async function answerNativeProvider(
  provider: NativeWorldProvider,
  geometry: NativeGeometryProviders,
): Promise<NativeProviderAnswer> {
  const question = decodeNativeProduct<Question>(provider.question());
  const json = await prepareProviderAnswer(question, geometry);
  return retainNativeSources({ json }, question);
}

async function prepareProviderAnswer(
  question: Question,
  geometry: NativeGeometryProviders,
): Promise<string> {
  const value = question.value;
  switch (question.kind) {
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
): Promise<NativeWorldTurn> {
  let turn = first;
  while (turn.kind === 'provider') {
    if (!turn.provider) throw new Error('Native provider continuation has no owned question.');
    try {
      if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
      const answer = await answerNativeProvider(turn.provider, geometry);
      if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
      turn = await world.answer(turn.key, turn.provider, Buffer.from(answer.json, 'utf8'));
    } catch (error) {
      await world.cancel(turn.key);
      throw error;
    }
  }
  return turn;
}
