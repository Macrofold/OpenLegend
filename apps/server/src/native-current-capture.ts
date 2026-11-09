import {
  captureCurrentSourcesFromRead,
  orderedRecordSet,
  receivedBodyBounds,
  receivedSceneFromBodies,
  type CurrentCaptureRead,
  type CurrentContact,
  type DefinitionPin,
  type ObserverLife,
  type CurrentBodyGeometryInput,
  type AttentionEntry,
  type AttentionCandidate,
  type AttentionPresentation,
  type ObserverSubject,
  type currentAttentionCues,
  type TemporalReceiptPrefix,
} from '@open-legend/domain';
import type { NativeActorSelf } from './native-perception.js';
import type { NativeHistoryInput } from './native-history.js';

type CurrentReader = NonNullable<CurrentCaptureRead['state']>;
export interface NativeCurrentCaptureSeed {
  readonly observer: ObserverLife;
  readonly at: number;
  readonly privacyRevision: number;
  readonly lastIncludedOrder: number;
  readonly state:
    | (Omit<CurrentReader, 'current'> & {
        readonly contacts: readonly (readonly [string, CurrentContact])[];
      })
    | null;
  readonly values: CurrentCaptureRead['values'];
  readonly grants: readonly {
    readonly sourceId: string;
    readonly original: string;
    readonly exposure: string;
    readonly channel: DefinitionPin;
    readonly fieldId: string;
    /** Index into this same read's native-owned current evidence cut. */
    readonly ordinal: number;
  }[];
  readonly bodyGrants: readonly string[];
  readonly sceneBodies: readonly CurrentBodyGeometryInput[];
  readonly nonlocalized: number;
  readonly sceneBindings: readonly {
    readonly sourceId: string;
    readonly leaseId: string;
    readonly subject?: ObserverSubject;
    readonly episode?: string;
  }[];
  readonly handleAttributions: readonly (readonly [string, string | number])[];
  readonly receiptPrefix?: TemporalReceiptPrefix;
  readonly receiptTailRequest?: {
    readonly actorId: string;
    readonly physicalLife: number;
    readonly epoch: string;
    readonly tailRevision: number;
  };
  readonly history: {
    readonly releasedThrough?: number;
    readonly recordingGap?: { readonly from: number; readonly through: number };
  };
  readonly attention: {
    readonly entries: readonly AttentionEntry[];
    readonly candidates: Record<string, AttentionCandidate>;
    readonly presentations: readonly AttentionPresentation[];
    readonly cues: ReturnType<typeof currentAttentionCues>;
  };
}

export function nativeReceivedScene(seed: NativeCurrentCaptureSeed) {
  return receivedSceneFromBodies(
    seed.observer.actorId,
    seed.observer.physicalLife,
    new Map(
      seed.sceneBodies.map((value) => {
        const error =
          value.location?.location.kind === 'point' ? value.location.location.errorRadius : 0;
        return [
          value.sourceId,
          { ...value, bounds: receivedBodyBounds(value.body, error) },
        ] as const;
      }),
    ),
    seed.nonlocalized,
  );
}

function grantKey(value: {
  sourceId: string;
  original: string;
  exposure: string;
  channel: DefinitionPin;
  fieldId: string;
}) {
  return JSON.stringify([
    value.sourceId,
    value.original,
    value.exposure,
    value.channel.id,
    value.channel.version,
    value.channel.digest,
    value.fieldId,
  ]);
}

/** Formatting consumes the genuine grant roster, not a physical-world facade.
 * The native read/ticket continues to own every ordinal's evidence guard;
 * these booleans cannot bind or execute a model's response. */
export function nativeCurrentSources(
  self: NativeActorSelf,
  seed: NativeCurrentCaptureSeed,
  history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>,
  selection?: Parameters<typeof captureCurrentSourcesFromRead>[1],
) {
  if (
    history.worldId !== self.worldId ||
    history.generation !== self.generation ||
    history.baseCut !== self.acceptedCut ||
    seed.observer.actorId !== self.actorId ||
    seed.observer.physicalLife !== (self.physicalLife ?? 0) ||
    seed.at !== self.at ||
    history.cuts.length !== 1 ||
    history.cuts[0]?.actorId !== self.actorId
  )
    throw new Error('Native current-source facts belong to a different captured read.');
  const eligibility = new Set(seed.grants.map(grantKey));
  const bodies = new Set(seed.bodyGrants);
  const privacy = history.cuts[0];
  const forgotten = new Set(privacy.forgotten),
    corrected = new Set(privacy.corrected);
  let state: CurrentReader | undefined;
  if (seed.state) {
    const current: CurrentReader['current'] = { size: 0 };
    for (const [id, contact] of seed.state.contacts) orderedRecordSet(current, id, contact);
    state = {
      life: seed.state.life,
      current,
      ...(seed.state.observer ? { observer: seed.state.observer } : {}),
      ...(seed.state.visualConfirmation
        ? { visualConfirmation: seed.state.visualConfirmation }
        : {}),
      ...(seed.state.motionSamples ? { motionSamples: seed.state.motionSamples } : {}),
    };
  }
  return captureCurrentSourcesFromRead(
    {
      observer: seed.observer,
      at: seed.at,
      privacyRevision: seed.privacyRevision,
      lastIncludedOrder: seed.lastIncludedOrder,
      state,
      values: seed.values,
      leaseEligible: (input) => {
        const field = 'field' in input ? input.field : input;
        return eligibility.has(
          grantKey({
            sourceId: input.grant.subjectId,
            original: input.grant.original,
            exposure: input.grant.exposure,
            channel: input.grant.channel,
            fieldId: field.id,
          }),
        );
      },
      hasBodyGrant: (id) => bodies.has(id),
      revoked: (alias) => forgotten.has(alias) || corrected.has(alias),
    },
    selection,
  );
}
