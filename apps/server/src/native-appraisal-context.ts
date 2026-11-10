import {
  appraisalPin,
  sameDefinitionPin,
  experienceReading,
  type AppraisalScope,
  type AppraisalDefinition,
  type PersonalSourceRef,
} from '@open-legend/domain';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeNpcBindingSelection } from './native-npc-sources.js';
import { nativeNpcPersonalSelection } from './native-npc-sources.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import {
  APPRAISAL_SOURCE_BINDINGS,
  memorySourceProof,
  type MemoryScope,
} from './memory-repository.js';
import { nativeExperienceEntry } from './native-recall.js';
import {
  appraisalContextFromRead,
  appraisalDecisionSchema,
  appraisalValueSchema,
} from './appraisal-context-view.js';
import type { ModelSpatialFrame, SharedModelExperience } from './perceived-context.js';
import { retainNativeSources } from './native-consumer.js';
import { ViewChangedError } from './player-view-async.js';

/** SQL chooses the exact same personal sources/order as Source. Native then
 * owns their historical eligibility, appraisal records and response ordinals;
 * this formatter cannot supply a policy, cause body or permission map. */
export async function nativeAppraisals(input: {
  readonly purpose: 'decision' | 'reflection';
  readonly service: NativeWorldService;
  readonly original: NativeNpcCapture;
  readonly current: NativeNpcCapture;
  readonly definitions: NativeDefinitionCapture;
  readonly scope: MemoryScope;
  readonly evidenceIds: readonly string[];
  readonly triggerEvidenceId?: string;
  readonly subjects: Readonly<Record<string, string>>;
  readonly sharedExperiences?: ReadonlyMap<string, SharedModelExperience>;
  readonly frame?: ModelSpatialFrame;
  readonly guard?: 'all' | 'required';
  readonly requiredFeelings?: readonly AppraisalScope[];
  /** Supplied by the final genuine ticket; invoked only after issuance. */
  readonly currentTicket: () => Promise<boolean>;
}) {
  const { service, original, definitions, scope } = input;
  const originalFacts = original.facts,
    currentFacts = input.current.facts;
  if (
    scope.worldId !== service.worldId ||
    scope.actorId !== originalFacts.self.actorId ||
    currentFacts.self.actorId !== scope.actorId ||
    currentFacts.self.worldId !== scope.worldId ||
    definitions.worldId !== scope.worldId
  )
    throw new ViewChangedError();
  const requested = [
    ...new Set([
      ...(input.triggerEvidenceId ? [input.triggerEvidenceId] : []),
      ...input.evidenceIds,
    ]),
  ].slice(0, APPRAISAL_SOURCE_BINDINGS);
  const selected = await service.withActorMemoryRead(scope.actorId, () =>
    service.store.memories.appraisalSources(scope, requested),
  );
  const refs: PersonalSourceRef[] = selected.map((source) => ({
    kind: source.entry.source,
    id: source.memory.id,
    revision: source.revision,
  }));
  const inventory = await service.prepareNpcSources(original, {
    receipts: [],
    personal: selected.map(nativeNpcPersonalSelection),
  });
  const inventoryIndex = original.sources().indexOf(inventory);
  if (inventoryIndex < 0)
    throw new Error('Appraisal preparation lost its native source inventory.');
  const ordinals = refs.map((ref, index) => {
    const ordinal = inventory.personal.findIndex(
      (source) =>
        source.selection === index &&
        source.reference.kind === ref.kind &&
        source.reference.id === ref.id &&
        source.reference.revision === ref.revision,
    );
    if (ordinal < 0) throw new ViewChangedError();
    return ordinal;
  });
  const entries = ordinals.map((ordinal) => nativeExperienceEntry(inventory.personal[ordinal]!));
  const presentation = await service.prepareNpcExperiencePresentation(input.current, entries);
  const installed = definitions.facts.definitions.moduleManifest.appraisals?.definitions ?? [];
  const policies = new Map<string, AppraisalDefinition>(),
    policyOrdinals: { alias: string; ordinal: number }[] = [];
  for (const [ordinal, definition] of installed.entries())
    if (input.purpose === 'decision' ? definition.decision : definition.reflection) {
      const alias = `policy${policies.size + 1}`;
      policies.set(alias, definition);
      policyOrdinals.push({ alias, ordinal });
    }
  const records = new Map(
    currentFacts.appraisals.values.map((value, index) => [`feeling${index + 1}`, value]),
  );
  const recordDefinitions = new Map(
    [...records].map(([alias, record]) => [
      alias,
      installed.find((definition) =>
        sameDefinitionPin(appraisalPin(definition), record.definitionPin),
      ),
    ]),
  );
  const sources = new Map(
    entries.map((entry, index) => {
      const reading = experienceReading(entry, scope.actorId);
      return [
        `cause${index + 1}`,
        { coverage: reading.source, subjectIds: reading.entityIds },
      ] as const;
    }),
  );
  const contextForFrame = (frame = input.frame, shared = input.sharedExperiences) =>
    appraisalContextFromRead(
      {
        actorId: scope.actorId,
        subjects: input.subjects,
        records,
        recordDefinitions,
        definitions: policies,
        sources,
        selected: entries.map((entry, index) => ({ entry, revision: refs[index]!.revision })),
        presentation,
        purpose: input.purpose,
      },
      frame,
      shared,
    );
  const context = contextForFrame();
  const valueSchema = (handle: string) =>
    appraisalValueSchema(policies.get(handle) ?? recordDefinitions.get(handle));
  const triggerIndex = selected.findIndex(
    (source) =>
      input.purpose === 'decision' &&
      !!source.awareness &&
      source.memory.eventId === input.triggerEvidenceId,
  );
  const selection: NonNullable<NativeNpcBindingSelection['appraisals']> = {
    purpose: input.purpose,
    guard: input.guard ?? 'all',
    policies: policyOrdinals,
    records: context.feelings.flatMap((feeling, ordinal) =>
      feeling.editable ? [{ alias: feeling.handle, ordinal }] : [],
    ),
    sources: ordinals.map((ordinal, index) => ({
      alias: `cause${index + 1}`,
      inventory: inventoryIndex,
      ordinal,
    })),
    trigger:
      triggerIndex < 0 ? null : { inventory: inventoryIndex, ordinal: ordinals[triggerIndex]! },
  };
  const proof = selected.map(memorySourceProof);
  const sourceCurrent = () =>
    service.withActorMemoryRead(scope.actorId, () => service.store.memories.current(scope, proof));
  await service.publishNpcHistory(original, () => true);
  if (!(await sourceCurrent())) throw new ViewChangedError();
  return retainNativeSources(
    {
      context,
      contextForFrame,
      schema: appraisalDecisionSchema(context, input.subjects, valueSchema),
      selection,
      current: async () => (await sourceCurrent()) && (await input.currentTicket()),
    },
    original.facts,
    currentFacts,
    definitions.facts,
    inventory,
    presentation,
  );
}
