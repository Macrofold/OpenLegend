import type {
  NativeGeometryQueries,
  NativeWorld,
  NativeWorldProvider,
  NativeWorldTurn,
  NativeWorldNpcRead,
  NativeWorldNpcTurn,
  NativeChangedRows,
} from '@open-legend/native-simulation';
import { baseActivityChoiceLabel, type BaseActivityChoiceLabel } from '@open-legend/domain';
import { nativeActivityDisplay } from './native-activity.js';
import { nativeCanonicalCommand } from './native-command.js';
import { worldControlOutcome } from './world-control-outcome.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
import type { SqlDatabase } from './store.js';
import type { LiveReadCutsProvider } from './live-read-overlay.js';
import {
  formatNativeNpcCandidateDescriptions,
  type NativeNpcDescriptionRead,
} from './native-npc-candidates.js';
import {
  readNativeHistoryEdit,
  type NativeHistoryEditReadRequest,
} from './native-temporal-pages.js';
import { readNativeNpcSources, type NativeNpcSourcesRequest } from './native-npc-sources.js';
import {
  readNativeAppraisalOutcomes,
  type NativeAppraisalOutcomesRequest,
} from './native-appraisal-outcomes.js';
import {
  readNativeRestoreArchives,
  type NativeRestoreArchivesRequest,
} from './native-restore-archives.js';
import {
  nativeAttemptNormalization,
  nativeCollation,
  nativeCanonicalJson,
  nativeUtterance,
  nativeWordSegments,
} from './native-language.js';
import { formatFreeTypedActionPreparation } from './typed-action-syntax.js';
import {
  nativeMaintenanceFormat,
  type NativeMaintenanceFormatRequest,
} from './native-maintenance-format.js';
import { nativeConsolidationReadings, type NativeConsolidationFormatRequest } from './native-consolidation-format.js';

type Binding = NativeGeometryQueries['binding'];
type Question = { kind: string; value: unknown };
export interface NativeProviderAnswer {
  readonly json: string;
}
export interface NativeHistoryReadContext {
  readonly db: SqlDatabase;
  readonly liveReadCuts: LiveReadCutsProvider;
  readonly restoreView?: <T>(projection: NativeChangedRows, read: () => Promise<T>) => Promise<T>;
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
    case 'maintenance-format':
      return JSON.stringify(nativeMaintenanceFormat(value as NativeMaintenanceFormatRequest));
    case 'consolidation-format':
      return JSON.stringify(nativeConsolidationReadings(value as NativeConsolidationFormatRequest));
    case 'typed-actions': {
      const request = value as {
        readonly binding: Binding;
        readonly limits: Parameters<typeof formatFreeTypedActionPreparation>[0]['limits'];
        readonly requests: readonly Omit<
          Parameters<typeof formatFreeTypedActionPreparation>[0],
          'limits'
        >[];
      };
      return JSON.stringify({
        binding: request.binding,
        results: request.requests.map((item) =>
          formatFreeTypedActionPreparation({ ...item, limits: request.limits }),
        ),
      });
    }
    case 'choice-descriptions': {
      const request = value as NativeNpcDescriptionRead & {
        readonly binding: Binding;
        readonly activityLabels: readonly BaseActivityChoiceLabel[];
      };
      return JSON.stringify({
        binding: request.binding,
        descriptions: formatNativeNpcCandidateDescriptions(request).map(
          (offer) => offer.description,
        ),
        activityLabels: request.activityLabels.map(baseActivityChoiceLabel),
      });
    }
    case 'appraisal-outcomes': {
      const request = value as NativeAppraisalOutcomesRequest;
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut)
        throw new Error('Native appraisal preparation has no accepted SQL read cut.');
      return JSON.stringify(await readNativeAppraisalOutcomes(history.db, request, cut));
    }
    case 'restore-archives': {
      const cut = history?.liveReadCuts();
      const request = value as NativeRestoreArchivesRequest & {
        readonly restoreProjection: NativeChangedRows;
      };
      if (!history?.restoreView || !cut || !request.restoreProjection)
        throw new Error('Restore archives require their actual protected SQL view.');
      return JSON.stringify(
        await history.restoreView(request.restoreProjection, () =>
          readNativeRestoreArchives(history.db, request, cut),
        ),
      );
    }
    case 'control': {
      const request = value as { binding: Binding; paused: boolean; speed: number };
      return JSON.stringify({
        binding: request.binding,
        message: worldControlOutcome(request.paused, request.speed).message,
      });
    }
    case 'history': {
      const cut = history?.liveReadCuts();
      if (!history || !cut)
        throw new Error('Native history preparation has no accepted SQL read cut.');
      const request = value as NativeHistoryEditReadRequest & {
        readonly restoreProjection?: NativeChangedRows;
      };
      const read = () => readNativeHistoryEdit(history.db, request, cut);
      if (request.restoreProjection) {
        if (!history.restoreView)
          throw new Error('Private restore projection has no protected SQL view owner.');
        return JSON.stringify(await history.restoreView(request.restoreProjection, read));
      }
      if (history.restoreView)
        throw new Error('Restore history question omitted its actual private projection.');
      return JSON.stringify(await read());
    }
    case 'sources': {
      const request = value as NativeNpcSourcesRequest;
      const cut = history?.liveReadCuts({
        worldId: request.origin.worldId,
        actorId: request.origin.actorId,
      });
      if (!history || !cut)
        throw new Error('Native source preparation has no accepted SQL read cut.');
      return JSON.stringify(await readNativeNpcSources(history.db, request, cut));
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
        nativeCanonicalJson(value as Parameters<typeof nativeCanonicalJson>[0]),
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
  return driveNativeNpcPreparation(world, read, first, geometry, signal);
}

export async function driveNativeNpcSources(
  world: NativeWorld,
  read: NativeWorldNpcRead,
  first: NativeWorldNpcTurn,
  geometry: NativeGeometryProviders,
  history: NativeHistoryReadContext,
  signal?: AbortSignal,
): Promise<void> {
  return driveNativeNpcPreparation(world, read, first, geometry, signal, history);
}

async function driveNativeNpcPreparation(
  world: NativeWorld,
  read: NativeWorldNpcRead,
  first: NativeWorldNpcTurn,
  geometry: NativeGeometryProviders,
  signal?: AbortSignal,
  history?: NativeHistoryReadContext,
): Promise<void> {
  let turn = first;
  while (turn.kind === 'provider') {
    if (!turn.provider) throw new Error('Native NPC choices have no owned provider question.');
    try {
      signal?.throwIfAborted();
      const answer = await answerNativeProvider(turn.provider, geometry, history);
      signal?.throwIfAborted();
      turn = await world.answerNpcPreparation(
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
