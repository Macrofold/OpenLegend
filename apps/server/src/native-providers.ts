import {
  selectTypedNavigation,
  type TypedNavigationSyntax,
  type TypedNavigationRead,
} from './typed-navigation.js';
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
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
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
import {
  nativeConsolidationReadings,
  type NativeConsolidationFormatRequest,
} from './native-consolidation-format.js';
import {
  nativeActivityLearningFormat,
  type NativeActivityLearningFormatRequest,
} from './native-activity-learning-format.js';
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
  const question = retainNativeProduct(decodeNativeProduct<Question>(provider.question()));
  try {
    const json = await prepareProviderAnswer(question, geometry, history);
    return retainNativeSources({ json }, question);
  } finally {
    // A cancelled caller cannot free a still-awaited handler's actual input.
    releaseNativeProduct(question);
  }
}

async function prepareProviderAnswer(
  question: Question,
  geometry: NativeGeometryProviders,
  history?: NativeHistoryReadContext,
): Promise<string> {
  const value = question.value;
  switch (question.kind) {
    case 'source-versions': {
      const request = value as NativeSourceVersionsRequest;
      const cut = history?.liveReadCuts();
      if (!history || !cut)
        throw new Error('Native source versions require their actual predecessor SQL cut.');
      return JSON.stringify(await readNativeSourceVersions(history.db, cut, request));
    }
    case 'support-membership': {
      const request = value as NativeSupportMembershipRequest;
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut) throw new Error('Native support cleanup requires its actual SQL cut.');
      return JSON.stringify(await readNativeSupportMembership(history.db, cut, request));
    }
    case 'activity-learning-format':
      return JSON.stringify(
        nativeActivityLearningFormat(value as NativeActivityLearningFormatRequest),
      );
    case 'activity-history': {
      const request = value as NativeActivityHistoryRequest;
      const cut = history?.liveReadCuts({ worldId: request.worldId, actorId: request.actorId });
      if (!history || !cut)
        throw new Error('Native activity history requires its scoped SQL provider.');
      return JSON.stringify(await readNativeActivityHistory(history.db, request, cut));
    }
    case 'maintenance-format':
      return JSON.stringify(nativeMaintenanceFormat(value as NativeMaintenanceFormatRequest));
    case 'consolidation-format':
      return JSON.stringify(nativeConsolidationReadings(value as NativeConsolidationFormatRequest));
    case 'typed-actions': {
      const request = value as {
        readonly binding: Binding;
        readonly phase: 'name' | 'format';
        readonly input?: {
          readonly syntax: TypedNavigationSyntax;
          readonly read: TypedNavigationRead;
        };
        readonly limits: Parameters<typeof formatFreeTypedActionPreparation>[0]['limits'];
        readonly requests: readonly Omit<
          Parameters<typeof formatFreeTypedActionPreparation>[0],
          'limits'
        >[];
      };
      if (request.phase === 'name') {
        if (!request.input) throw new Error('Native typed name selection has no captured roster.');
        return JSON.stringify({
          binding: request.binding,
          output: {
            kind: 'name',
            selection: selectTypedNavigation(request.input.syntax, request.input.read),
          },
        });
      }
      if (request.phase !== 'format')
        throw new Error('Native typed preparation has no valid phase.');
      return JSON.stringify({
        binding: request.binding,
        output: {
          kind: 'format',
          results: request.requests.map((item) =>
            formatFreeTypedActionPreparation({ ...item, limits: request.limits }),
          ),
        },
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
      try {
        if (signal?.aborted) throw signal.reason ?? new Error('Native request was canceled.');
        turn = await world.answer(turn.key, turn.provider, Buffer.from(answer.json, 'utf8'));
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
      const answer = await answerNativeProvider(turn.provider, geometry, history);
      try {
        signal?.throwIfAborted();
        turn = await world.answerNpcPreparation(
          read,
          turn.key,
          turn.provider,
          Buffer.from(answer.json),
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
