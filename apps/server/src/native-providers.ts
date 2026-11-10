import type {
  NativeGeometryQueries,
  NativeWorld,
  NativeWorldProvider,
  NativeWorldTurn,
  NativeWorldNpcRead,
  NativeWorldNpcTurn,
  NativeChangedRows,
} from '@open-legend/native-simulation';
import type { TemporalReadContext } from '@open-legend/domain';
import type { NativeGeometryProviders } from './native-geometry.js';
import {
  encodeNativeProviderAnswer,
  type NativeProviderAnswer,
  type NativeProviderCapacity,
} from './native-provider-answer.js';
import { formatNativeProvider } from './native-provider-format.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeProduct,
  withNativeConsumerScope,
  withNativeUtf8Input,
} from './native-consumer.js';
import { withNativeSqlPreparation } from './native-source-preparation.js';
import type { SqlDatabase } from './store.js';
import type { LiveReadCutsProvider } from './live-read-overlay.js';
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
  readNativeActivityHistory,
  type NativeActivityHistoryRequest,
} from './native-activity-history.js';
import {
  readNativeSupportMembership,
  type NativeSupportMembershipRequest,
} from './native-support-retention.js';
import {
  readNativeSourceVersions,
  type NativeSourceVersionsRequest,
} from './native-source-versions.js';
import {
  readNativeRestoreRetention,
  type NativeRestoreRetentionRequest,
  type RetentionCapacity,
} from './native-account-retention.js';

type Question = { kind: string; value: unknown };
export interface NativeHistoryReadContext {
  readonly db: SqlDatabase;
  readonly liveReadCuts: LiveReadCutsProvider;
  readonly restoreView?: <T>(
    projection: NativeChangedRows,
    read: () => Promise<T>,
    archiveBaseline?: readonly import('./native-restore.js').NativeRestoreArchive[],
  ) => Promise<T>;
  readonly retentionCapacity?: RetentionCapacity;
  readonly retentionSignal?: AbortSignal;
  readonly retentionSupportSourceIds?: TemporalReadContext['recognitionSupportSourceIds'];
}

/** Pure physical/language preparation for the real native cursor. The selected
 * question contains no world setter, grant, provider spending or model request. */
export async function answerNativeProvider(
  capacity: NativeProviderCapacity,
  provider: NativeWorldProvider,
  geometry: NativeGeometryProviders,
  history?: NativeHistoryReadContext,
): Promise<NativeProviderAnswer> {
  return withNativeConsumerScope(async () => {
    const question = retainNativeProduct(decodeNativeProduct<Question>(provider.question()));
    try {
      const formatted = formatNativeProvider(question, capacity);
      if (formatted) return retainNativeProduct(formatted);
      const read = () => prepareProviderAnswer(capacity, question, geometry, history);
      const result =
        history && question.kind !== 'geometry' && question.kind !== 'restore-retention'
          ? await withNativeSqlPreparation(capacity, history.db, read)
          : await read();
      return retainNativeProduct(result);
    } finally {
      // A cancelled caller cannot free a still-awaited handler's actual input.
      releaseNativeProduct(question);
    }
  });
}

async function prepareProviderAnswer(
  capacity: NativeProviderCapacity,
  question: Question,
  geometry: NativeGeometryProviders,
  history?: NativeHistoryReadContext,
): Promise<NativeProviderAnswer> {
  const value = question.value;
  switch (question.kind) {
    case 'restore-retention': {
      const request = value as NativeRestoreRetentionRequest & {
        readonly restoreProjection: NativeChangedRows;
      };
      const cut = history?.liveReadCuts();
      if (!history?.restoreView || !history.retentionCapacity || !cut || !request.restoreProjection)
        throw new Error('Restore retention requires its actual private SQL view and admission.');
      return history.restoreView(request.restoreProjection, () =>
        readNativeRestoreRetention(
          history.db,
          cut,
          request,
          history.retentionCapacity!,
          history.retentionSignal,
          history.retentionSupportSourceIds,
        ),
      );
    }
    case 'source-versions': {
      const request = value as NativeSourceVersionsRequest;
      const cut = history?.liveReadCuts();
      if (!history || !cut)
        throw new Error('Native source versions require their actual predecessor SQL cut.');
      if (history.restoreView) {
        if (!request.restoreProjection || !request.archiveBaseline)
          throw new Error('Restore source versions require their exact private archive baseline.');
        return encodeNativeProviderAnswer(
          capacity,
          await history.restoreView(
            request.restoreProjection,
            () => readNativeSourceVersions(history.db, cut, request),
            request.archiveBaseline,
          ),
        );
      }
      if (request.restoreProjection || request.archiveBaseline)
        throw new Error('Restore source versions have no inactive private SQL owner.');
      return encodeNativeProviderAnswer(
        capacity,
        await readNativeSourceVersions(history.db, cut, request),
      );
    }
    case 'support-membership': {
      const request = value as NativeSupportMembershipRequest & {
        readonly restoreProjection?: NativeChangedRows;
      };
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut) throw new Error('Native support cleanup requires its actual SQL cut.');
      if (request.restoreProjection) {
        if (!history.restoreView)
          throw new Error('Restore support cleanup requires its actual private SQL view.');
        return history.restoreView(request.restoreProjection, async () =>
          encodeNativeProviderAnswer(
            capacity,
            await readNativeSupportMembership(history.db, cut, request),
          ),
        );
      }
      return encodeNativeProviderAnswer(
        capacity,
        await readNativeSupportMembership(history.db, cut, request),
      );
    }
    case 'activity-history': {
      const request = value as NativeActivityHistoryRequest;
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut)
        throw new Error('Native activity history requires its scoped SQL provider.');
      return encodeNativeProviderAnswer(
        capacity,
        await readNativeActivityHistory(history.db, request, cut),
      );
    }
    case 'appraisal-outcomes': {
      const request = value as NativeAppraisalOutcomesRequest;
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut)
        throw new Error('Native appraisal preparation has no accepted SQL read cut.');
      return encodeNativeProviderAnswer(
        capacity,
        await readNativeAppraisalOutcomes(history.db, request, cut),
      );
    }
    case 'restore-archives': {
      const cut = history?.liveReadCuts();
      const request = value as NativeRestoreArchivesRequest & {
        readonly restoreProjection: NativeChangedRows;
      };
      if (!history?.restoreView || !cut || !request.restoreProjection)
        throw new Error('Restore archives require their actual protected SQL view.');
      return encodeNativeProviderAnswer(
        capacity,
        await history.restoreView(request.restoreProjection, () =>
          readNativeRestoreArchives(history.db, request, cut),
        ),
      );
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
        return encodeNativeProviderAnswer(
          capacity,
          await history.restoreView(request.restoreProjection, read),
        );
      }
      if (history.restoreView)
        throw new Error('Restore history question omitted its actual private projection.');
      return encodeNativeProviderAnswer(capacity, await read());
    }
    case 'sources': {
      const request = value as NativeNpcSourcesRequest;
      const cut = history?.liveReadCuts({
        worldId: request.origin.worldId,
        actorId: request.origin.actorId,
      });
      if (!history || !cut)
        throw new Error('Native source preparation has no accepted SQL read cut.');
      return encodeNativeProviderAnswer(
        capacity,
        await readNativeNpcSources(history.db, request, cut),
      );
    }
    case 'geometry': {
      const answer = await geometry.compute(value as NativeGeometryQueries);
      try {
        return encodeNativeProviderAnswer(capacity, answer);
      } finally {
        releaseNativeProduct(answer);
      }
    }
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
      const answer = await answerNativeProvider(world, turn.provider, geometry, history);
      try {
        if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
        const { key, provider } = turn;
        turn = await withNativeUtf8Input(world, answer.json, (bytes) =>
          world.answer(key, provider!, bytes),
        );
      } finally {
        releaseNativeProduct(answer);
      }
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
      const answer = await answerNativeProvider(world, turn.provider, geometry, history);
      try {
        signal?.throwIfAborted();
        const { key, provider } = turn;
        turn = await withNativeUtf8Input(world, answer.json, (bytes) =>
          world.answerNpcPreparation(read, key, provider!, bytes),
        );
      } finally {
        releaseNativeProduct(answer);
      }
    } catch (error) {
      await world.cancel(turn.key);
      throw error;
    }
  }
  if (turn.kind !== 'complete')
    throw new Error('Native NPC discovery did not close its read-only checkpoint.');
}
