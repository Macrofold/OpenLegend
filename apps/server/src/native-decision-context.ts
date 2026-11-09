import { namePhrase } from '@open-legend/language';
import { requiredAgencyOutcomeEvidence, type ResultEvidence } from '@open-legend/domain';
import type { Named } from '@open-legend/language';
import { formatDecisionSelfContext } from './decision-self-context.js';
import { formatDecisionFeelings, type DecisionFeeling } from './decision-feelings.js';
import { personalEntityHandle } from './entity-references.js';
import type { NativeActorSelf } from './native-perception.js';

/** Complete identity/About me/current-goal sections from one actual NPC cut.
 * Other request sections and their source/action validity remain separate
 * owners; these facts cannot stand in for a complete decision request. */
export function nativeDecisionSelfContext(self: NativeActorSelf) {
  if (self.identity.id !== self.actorId || !self.mind || !self.agency)
    throw new Error('The captured NPC first-person context is unavailable.');
  const handle = personalEntityHandle(
    { id: self.worldId },
    self.actorId,
    self.actorId,
    self.referenceAttribution,
  );
  const name = namePhrase(self.observerName, 'none');
  return formatDecisionSelfContext({
    label: `${name} (ID:${handle})`,
    species: self.identity.species,
    traits: self.identity.traits,
    mind: { accepted: self.mind.documents.length > 0, documents: self.mind.documents },
    goals: self.agency.goals,
  });
}

/** Addresses retain the source kind, receiving life and independent receipt
 * clocks. The scoped history reader must still admit their actual content. */
export function nativeRequiredOutcomeEvidence(self: NativeActorSelf) {
  if (self.identity.id !== self.actorId || !self.mind || !self.agency)
    throw new Error('The captured NPC first-person context is unavailable.');
  return requiredAgencyOutcomeEvidence(self.agency);
}

/** This is the Source recentResultEligible scalar check, not a grant to read
 * an account body. Missing captured membership stays explicitly unavailable. */
export function nativeRecentResultEligible(
  self: NativeActorSelf,
  evidence: ResultEvidence,
): boolean | undefined {
  if (self.identity.id !== self.actorId || !self.mind || !self.agency)
    throw new Error('The captured NPC first-person context is unavailable.');
  const key = JSON.stringify(evidence);
  return self.recentResultEligibility?.find((value) => JSON.stringify(value.evidence) === key)
    ?.recentEligible;
}

export interface NativeDecisionAppraisals {
  readonly worldId: string;
  readonly actorId: string;
  readonly physicalLife: number;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly at: number;
  readonly sequence: number;
  readonly values: readonly DecisionFeeling[];
  readonly names: readonly { readonly entityId: string; readonly name: Named }[];
  /** Complete subscribed scopes, separate from the convenience page. These
   * private revisions are for later validity, never model-editable authority. */
  readonly subscribed: readonly { readonly id: string; readonly revision: number }[];
}

export function nativeDecisionFeelings(self: NativeActorSelf, read: NativeDecisionAppraisals) {
  // This checks two products belong to the same captured cut. It is not a live
  // world-revision veto after a model wait; semantic validity has its own owner.
  if (
    self.worldId !== read.worldId ||
    self.actorId !== read.actorId ||
    (self.physicalLife ?? 0) !== read.physicalLife ||
    self.generation !== read.generation ||
    self.acceptedCut !== read.acceptedCut ||
    self.at !== read.at ||
    self.sequence !== read.sequence ||
    !self.mind ||
    !self.agency
  )
    throw new Error('The captured NPC feelings are unavailable.');
  return formatDecisionFeelings(
    read.actorId,
    read.values,
    new Map(read.names.map(({ entityId, name }) => [entityId, name])),
  );
}
