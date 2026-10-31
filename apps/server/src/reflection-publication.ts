import {
  entityGet,
  publishInnerWorld,
  subjectKey,
  type ObserverSubject,
  type WorldState,
  type Transition,
} from '@open-legend/domain';
import { boundReflectionSchema } from './cognition-contracts.js';
import { resolveResponseEntities, resolveIntentionMarkers } from './entity-references.js';
import { resolveInterpretationRecords } from './reflection-records.js';
import type { prepareDecision } from './decision-context.js';
import type { bindReflectionAppraisals } from './appraisal-context.js';
import type { MacrofoldBackend } from './macrofold.js';

type ReflectionValue = Extract<
  Awaited<ReturnType<MacrofoldBackend['reflect']>>,
  { outcome: 'value' }
>['value'];
/** One finite response resolver for the live maintenance caller and its verifier.
 * World mutation, protection and receipts remain in publishInnerWorld. Callers
 * must run prepared.validateConversation(false) in transition's source-validation
 * callback: the synchronous checks here do not cover cold speech/recall changes. */
export function prepareReflectionPublication(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  appraisals: Awaited<ReturnType<typeof bindReflectionAppraisals>>,
  value: ReflectionValue,
  actorId: string,
  jobId: string,
  expectedRevision: number,
  dreamEpisode: string | null = null,
): (world: WorldState) => Transition {
  const parsedReflection = boundReflectionSchema(
    Object.keys(prepared.binding.identityReferences ?? {}),
    Object.keys(prepared.binding.evidenceReferences ?? {}),
  ).parse({
    appraisalChanges: value.appraisalChanges ?? [],
    recordChanges: value.recordChanges ?? [],
    thoughts: value.thoughts,
    goalChanges: value.goalChanges,
    knowledgeChanges: value.knowledgeChanges,
    nameChanges: value.nameChanges,
  });
  const edits = resolveResponseEntities(
    {
      operations: [
        ...parsedReflection.nameChanges.map((name, i) => ({
          localId: `name${i}`,
          requiresAccepted: [],
          talk: null,
          act: null,
          think: null,
          goal: null,
          plan: null,
          name,
        })),
        ...parsedReflection.knowledgeChanges.map((note, i) => ({
          localId: `note${i}`,
          requiresAccepted: [],
          talk: null,
          act: null,
          think: null,
          goal: null,
          plan: null,
          note,
        })),
      ],
    },
    prepared.entityReferences,
    prepared.intentionReferences,
    prepared.binding.knowledgeReferences,
    [],
    prepared.binding.identityReferences,
  );
  const subjectFromReference = (reference: string): ObserverSubject => {
    const subject =
      prepared.binding.knowledgeReferences?.[reference] ??
      prepared.binding.identityReferences?.[reference];
    if (subject) return subject;
    if (prepared.binding.entityIds.includes(reference))
      return { kind: 'entity', entityId: reference };
    throw new Error('The reflected subject was not supplied.');
  };
  const appraisalChanges = appraisals.resolve(parsedReflection.appraisalChanges);
  const goalChanges = parsedReflection.goalChanges.map((goal) => ({
    ...goal,
    objective: goal.objective
      ? resolveIntentionMarkers(
          goal.objective,
          prepared.entityReferences,
          prepared.intentionReferences,
        )
      : goal.objective,
  }));
  const thoughts = parsedReflection.thoughts.map((thought) =>
    resolveIntentionMarkers(thought, prepared.entityReferences, prepared.intentionReferences),
  );
  return (world) => {
    if (!prepared.temporalSourcesCurrent() || !prepared.situation.valid(world))
      throw new Error('Selected personal evidence changed before reflection publication.');
    return publishInnerWorld(
      world,
      actorId,
      expectedRevision,
      jobId,
      value.revision,
      value.files,
      thoughts,
      prepared.binding.evidenceIds,
      dreamEpisode,
      goalChanges,
      edits.operations.flatMap((op) =>
        op.note
          ? [
              {
                ...op.note,
                subjectId:
                  op.note.subjectId === null ? null : subjectFromReference(op.note.subjectId),
              },
            ]
          : [],
      ),
      edits.operations.flatMap((op) =>
        op.name ? [{ ...op.name, subjectId: subjectFromReference(op.name.subjectId) }] : [],
      ),
      [
        ...prepared.binding.entityIds.map((entityId) => ({
          kind: 'entity' as const,
          entityId,
        })),
        ...Object.values(prepared.binding.identityReferences ?? {}),
      ],
      prepared.binding.entityEpisodes,
      Object.fromEntries(
        Object.values(prepared.binding.knowledgeReferences ?? {}).map((subject) => [
          subjectKey(subject),
          subject,
        ]),
      ),
      appraisalChanges,
      appraisals.bindings,
      resolveInterpretationRecords(parsedReflection.recordChanges, prepared.binding),
    );
  };
}

/** Existing downtime cadence; caller separately owns safety and model admission. */
export function reflectionTimeDue(
  world: WorldState,
  actorId: string,
  hasMemories: boolean,
): boolean {
  const mind = world.minds?.[actorId];
  const at = mind?.lastReflectionAt ?? -86400;
  return (
    hasMemories &&
    !entityGet(world.entities, actorId)?.actor?.action &&
    !(at > 0 && Math.floor(at / 86400) === Math.floor(world.simTime / 86400)) &&
    world.simTime - at >= 3600
  );
}
