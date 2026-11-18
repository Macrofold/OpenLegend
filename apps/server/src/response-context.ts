import { decisionPromptText } from './decision-prompt-text.js';
import { jsonByteLength } from '@open-legend/domain';
import { nativeJsonEncodingWorkspace } from './native-consumer.js';
import { formatResponseTrigger, formatResponseTriggerContext } from './response-trigger-format.js';
import {
  formatCurrentReference,
  formatRememberedPersonReference,
  formatRememberedIndividualReference,
} from './response-reference-format.js';
import { nativeText } from '@open-legend/domain';
import { entityGet, entityHas } from '@open-legend/domain';
import { accessiblePossession, worldPosition } from '@open-legend/domain';
import {
  knowledgeDocument,
  characterCount,
  currentBodyValue,
  currentBodyGrant,
  prepareCurrentBodyReadScope,
  currentBodySubject,
  canAddressRememberedSubject,
  recognizesSubject,
  observerIndividual,
  identityForEntity,
  subjectLabel,
  observerName,
  type ObserverSubject,
} from '@open-legend/domain';
import {
  awarenessBindsSubject,
  entityLabel,
  entityReferenceMap,
  entityHandle,
  subjectHandle,
  permittedSourceHandle,
} from './entity-references.js';
import { speechDescription, type Awareness, type WorldState } from '@open-legend/domain';
import { gameTime } from './recall.js';
import {
  experienceForModel,
  experienceModelBindings,
  captureModelSpatialFrame,
  modelSpatialPoint,
  type ModelSpatialFrame,
} from './perceived-context.js';
import type { WorldService } from './world-service.js';

/** Attribution comes from event-time awareness, never a name guessed from a quote. */
export function responseTrigger(
  service: WorldService,
  actorId: string,
  eventId: string | undefined,
  fallback: string,
  evidence?: Awareness[],
): string {
  const world = service.world;
  const aware = eventId
    ? (evidence ?? world.experience?.awareness[actorId])?.find((entry) => entry.eventId === eventId)
    : undefined;
  return formatResponseTrigger(
    aware,
    actorId,
    fallback,
    aware
      ? gameTime(
          aware.at,
          world.statusEffectPolicy.clockOffsetHours,
          world.presentation?.calendar?.dayLabel,
        )
      : undefined,
  );
}

/** Present event-time attribution alongside current perception, without filling unknown roles. */
export function responseTriggerContext(
  service: WorldService,
  actorId: string,
  eventId?: string,
  evidence?: Awareness[],
  frame?: ModelSpatialFrame,
): Record<string, unknown> | undefined {
  if (!eventId) return undefined;
  const world = service.world;
  const aware = (evidence ?? world.experience?.awareness[actorId])?.find(
    (entry) => entry.eventId === eventId,
  );
  if (!aware) return undefined;
  const source =
    aware.sourceId && awarenessBindsSubject(world, actorId, aware, aware.sourceId)
      ? entityGet(world.entities, aware.sourceId)
      : undefined;
  const recipientId = aware.targetId;
  const recipient =
    recipientId && awarenessBindsSubject(world, actorId, aware, recipientId)
      ? entityGet(world.entities, recipientId)
      : undefined;
  const sourceBody =
    aware.sourceBody && currentBodyGrant(world, actorId, aware.sourceBody.entityId);
  const sourceVisible =
    !!sourceBody &&
    sourceBody.leaseId === aware.sourceBody!.leaseId &&
    aware.sourceBody!.physicalLife ===
      (entityGet(world.entities, aware.sourceBody!.entityId)?.actor?.physicalLife ?? 0);
  return formatResponseTriggerContext(aware, {
    experience: experienceForModel(
      { source: 'awareness', value: aware },
      experienceModelBindings(
        world,
        actorId,
        { source: 'awareness', value: aware },
        'trigger',
        frame,
      ),
    ),
    eventTime: gameTime(
      aware.at,
      world.statusEffectPolicy.clockOffsetHours,
      world.presentation?.calendar?.dayLabel,
    ),
    now: world.simTime,
    ...(aware.sourceSubject?.kind === 'individual'
      ? { speakerSubject: subjectHandle(world, actorId, aware.sourceSubject) }
      : {}),
    ...(source ? { source: { myself: source.id === actorId } } : {}),
    ...(recipient
      ? { recipient: { currentBody: !!currentBodyGrant(world, actorId, recipient.id) } }
      : {}),
    sourceCurrentlyVisible: aware.speech
      ? sourceVisible
      : !!(source && currentBodyGrant(world, actorId, source.id)),
  });
}

/** The same newline indentation used by list rendering, measured without
 * constructing another copy of a selected recall description. */
export function indentedContextTextBytes(text: string): number {
  let bytes = Buffer.byteLength(text);
  for (let index = 0; index < text.length; index++) if (text.charCodeAt(index) === 10) bytes += 2;
  return bytes;
}

/** One emitter owns both the text and its allocation measurement. Measurement
 * reads selected fields without constructing the prompt or JSON section bodies. */
class DecisionContextText {
  private readonly parts: string[] | undefined;
  private sections = 0;
  private last = 0;
  bytes = 0;
  units = 0;
  fragments = 0;
  temporaryUnits = 0;
  jsonWorkspace = 0;

  constructor(
    render: boolean,
    private readonly jsonLength: (value: unknown, workspace: number) => number = (value) =>
      jsonByteLength(value),
  ) {
    this.parts = render ? [] : undefined;
  }
  section(): void {
    if (this.sections++) this.text('\n\n');
  }
  text(value: unknown): void {
    const text = `${value}`;
    if (!text.length) return;
    this.bytes += Buffer.byteLength(text);
    if (
      this.last >= 0xd800 &&
      this.last <= 0xdbff &&
      text.charCodeAt(0) >= 0xdc00 &&
      text.charCodeAt(0) <= 0xdfff
    )
      this.bytes -= 2;
    this.units += text.length;
    this.fragments++;
    this.last = text.charCodeAt(text.length - 1);
    this.parts?.push(text);
  }
  json(value: unknown): void {
    if (this.parts) {
      this.text(JSON.stringify(value));
      return;
    }
    if (value === undefined) {
      this.text(undefined);
      return;
    }
    const workspace = nativeJsonEncodingWorkspace(value);
    const bytes = this.jsonLength(value, workspace);
    // UTF-8 bounds the JSON string's UTF-16 units, including escaped isolated
    // surrogates. JSON delimiters cannot pair with a preceding lone surrogate.
    this.bytes += bytes;
    this.units += bytes;
    this.temporaryUnits += bytes;
    this.fragments++;
    this.last = 0;
    this.jsonWorkspace = Math.max(this.jsonWorkspace, 4 * bytes + workspace);
  }
  list(value: unknown): void {
    if (!Array.isArray(value) || !value.length) {
      this.text(decisionPromptText.none);
      return;
    }
    for (let index = 0; index < value.length; index++) {
      if (index) this.text('\n');
      if (!(index in value)) continue;
      this.text('- ');
      const line = String(value[index]);
      if (this.parts) this.text(line.replace(/\n/g, '\n  '));
      else {
        let newlines = 0;
        for (let at = 0; at < line.length; at++) if (line.charCodeAt(at) === 10) newlines++;
        this.text(line);
        this.bytes += indentedContextTextBytes(line) - Buffer.byteLength(line);
        this.units += newlines * 2;
        this.temporaryUnits += line.length + newlines * 2;
      }
    }
  }
  joined(value: readonly unknown[] | undefined, separator: string, absent = ''): void {
    if (!value) {
      this.text(absent);
      return;
    }
    for (let index = 0; index < value.length; index++) {
      if (index) this.text(separator);
      // Array.join represents null/undefined entries as empty text.
      if (value[index] !== null && value[index] !== undefined) this.text(value[index]);
    }
  }
  actions(value: readonly { id: string; description: string }[]): void {
    for (let index = 0; index < value.length; index++) {
      if (index) this.text('\n');
      this.text('- ');
      this.text(value[index]!.id);
      this.text(': ');
      this.text(value[index]!.description);
    }
  }
  finish(): string {
    return this.parts!.join('');
  }
}

export function measureReadableDecisionContext(
  context: Record<string, unknown>,
  actions: { id: string; description: string }[],
  includeActions = false,
  jsonLength?: (value: unknown, workspace: number) => number,
  extra = '',
) {
  const out = new DecisionContextText(false, jsonLength);
  emitReadableDecisionContext(out, context, actions, includeActions);
  out.text(extra);
  return {
    bytes: out.bytes,
    // JSON UTF-8 is an upper bound for its decoded string units; no second
    // JSON serialization is needed merely to compute the builder's allowance.
    stringUnits: out.units,
    workspaceBytes:
      2 * out.units + 2 * out.temporaryUnits + 256 + out.fragments * 64 + out.jsonWorkspace,
  };
}

export function readableDecisionContext(
  context: Record<string, unknown>,
  actions: { id: string; description: string }[],
  includeActions = false,
): string {
  const out = new DecisionContextText(true);
  emitReadableDecisionContext(out, context, actions, includeActions);
  return out.finish();
}

function emitReadableDecisionContext(
  out: DecisionContextText,
  context: Record<string, unknown>,
  actions: { id: string; description: string }[],
  includeActions: boolean,
): void {
  const queryEnvelope = context['situationQueries'] === true;
  const empty = queryEnvelope ? '{"queries":null,"operations":[]}' : '{"operations":[]}';
  const envelope = queryEnvelope ? '{"queries":null,"operations":[' : '{"operations":[';
  const capabilities = context['capabilities'] as
    | { speech: boolean; expressions: boolean }
    | undefined;
  const namedTimes = Array.isArray(context['namedTimes'])
    ? (context['namedTimes'] as string[])
    : [];
  const outputs = Array.isArray(context['outputFamilies'])
    ? (context['outputFamilies'] as string[])
    : undefined;
  const expressionGuidance = context['expressionGuidance'];
  if (typeof expressionGuidance !== 'string')
    throw new Error('The decision has no installed expression presentation.');
  const surroundings = context['surroundings'] as unknown[] | undefined;
  const contacts = context['contacts'] as unknown[] | undefined;
  out.section();
  out.text(decisionPromptText.me);
  out.text(context['identity']);
  out.text('\n');
  out.text(context['aboutMe']);
  out.text('\n');
  out.text(context['body']);
  out.text(' ');
  out.text(context['feelings'] ?? '');
  if (context['carryingConcern']) {
    out.text('\n');
    out.text(context['carryingConcern']);
  }
  out.text('\n');
  out.text(expressionGuidance);
  if (capabilities?.speech === false) {
    out.text(decisionPromptText.speechUnavailable);
  }
  out.section();
  out.text(decisionPromptText.commitments);
  out.list(context['commitments']);
  out.text('\n');
  out.text(context['activityCoverage'] ?? '');
  out.section();
  out.text(decisionPromptText.trigger);
  out.text(context['stimulus']);
  out.section();
  out.text(decisionPromptText.triggerFacts);
  out.json(context['triggerFacts'] ?? {});
  out.text(decisionPromptText.triggerEvidence);
  out.section();
  out.text(decisionPromptText.task);
  if (
    (context['triggerFacts'] as { observerRelationship?: string } | undefined)
      ?.observerRelationship === 'addressed_speech'
  ) {
    out.text(decisionPromptText.addressedTask);
  }
  out.text(decisionPromptText.taskChoices);
  out.section();
  out.text(decisionPromptText.conversation);
  out.list(context['conversation']);
  out.text(decisionPromptText.conversationPerspective);
  if (Array.isArray(context['planOffers']) && context['planOffers'].length) {
    out.section();
    out.text(decisionPromptText.planning);
    out.json(context['planOffers'] ?? []);
    out.text(decisionPromptText.planPrerequisites);
  }
  if (Array.isArray(context['intentActions']) && context['intentActions'].length) {
    out.section();
    out.text(decisionPromptText.intentControls);
    out.json(context['intentActions'] ?? []);
    out.text(decisionPromptText.intentPermission);
  }
  out.section();
  out.text(decisionPromptText.work);
  emitIntentions(out, context['agency']);
  out.text(decisionPromptText.workUncertainty);
  if (Array.isArray(context['supplyOpportunities']) && context['supplyOpportunities'].length) {
    out.section();
    out.text(decisionPromptText.supply);
    out.list(context['supplyOpportunities']);
  }
  out.section();
  out.text(decisionPromptText.navigation);
  out.text(context['navigation'] ?? '');
  out.text(decisionPromptText.relativeNavigation);
  out.text(context['currentSupport']);
  out.text(decisionPromptText.publicSupports);
  out.json(context['publicSurfaces'] ?? []);
  out.section();
  out.text(decisionPromptText.currentTime);
  out.text(context['now']);
  out.text(decisionPromptText.simulationSeconds);
  out.text(context['simTime'] ?? 'unavailable');
  out.text(')');
  if (context['activityRequests']) {
    out.section();
    out.text(decisionPromptText.activityRequests);
    out.json(context['activityRequests']);
    out.text(decisionPromptText.activityPermissions);
  }
  if (context['inspectedContainer']) {
    out.section();
    out.text(decisionPromptText.inspectedContainer);
    out.json(context['inspectedContainer']);
    out.text(decisionPromptText.containerCoverage);
  }
  if (context['inspectedActions']) {
    out.section();
    out.text(decisionPromptText.inspectedActions);
    out.list(context['inspectedActions']);
  }
  if (context['inspectedMethods']) {
    out.section();
    out.text(decisionPromptText.inspectedMethods);
    out.list(context['inspectedMethods']);
  }
  out.section();
  out.text(decisionPromptText.recall);
  out.list(context['recall']);
  if (context['reconsideration']) {
    out.text('\n');
    out.text(context['reconsideration']);
  }
  out.text(decisionPromptText.structuredExperience);
  out.json(context['experience'] ?? []);
  out.text(decisionPromptText.experiencePermission);
  if (context['recentWorkResults']) {
    out.section();
    out.text(decisionPromptText.workResults);
    out.json(context['recentWorkResults']);
    out.text(decisionPromptText.workResultsTime);
  }
  if (context['receivedSituation']) {
    out.section();
    out.text(decisionPromptText.receivedSituation);
    out.json(context['receivedSituation']);
    out.text(decisionPromptText.situationPermission);
  }
  if (surroundings?.length || contacts?.length || !context['receivedSituation']) {
    out.section();
    out.text(decisionPromptText.nearby);
    if (surroundings?.length || !context['receivedSituation']) {
      out.list(surroundings);
    } else {
    }
    if (contacts?.length) {
      out.text(decisionPromptText.contactEvidence);
      out.list(contacts);
    } else {
    }
  }
  out.section();
  out.text(decisionPromptText.inventory);
  out.list(context['possessions']);
  if (context['inventoryCoverage']) {
    out.text(decisionPromptText.partialInventory);
    out.json(context['inventoryCoverage']);
    out.text(decisionPromptText.inventoryCoverage);
  }
  out.section();
  out.text(decisionPromptText.notepad);
  out.json(context['notepad'] ?? {});
  out.section();
  out.text(decisionPromptText.knowledge);
  out.list(context['knowledge']);
  if (includeActions) {
    out.section();
    out.text(decisionPromptText.actions);
    if (actions.length) {
      out.actions(actions);
    } else {
      out.text(decisionPromptText.noActions);
    }
    out.text(decisionPromptText.unlistedActions);
  }
  out.section();
  out.text(decisionPromptText.responseFormat);
  if (queryEnvelope) {
    out.text(decisionPromptText.queryMode);
  }
  out.text(decisionPromptText.continueWith);
  out.text(empty);
  out.text(decisionPromptText.operationFormat);
  if (capabilities?.expressions) {
    out.text(decisionPromptText.expressionKinds);
  } else {
    out.text(decisionPromptText.plainKinds);
  }
  out.text(decisionPromptText.knownAction);
  if (capabilities?.expressions) {
    out.text(decisionPromptText.expressionArguments);
  }
  out.text(decisionPromptText.proposalArguments);
  if (namedTimes.length) {
    out.text(decisionPromptText.untilTime);
    out.joined(namedTimes, '|');
  } else {
    out.text(decisionPromptText.unnamedTime);
  }
  out.text(decisionPromptText.actionGoalPlanRules);
  out.joined(outputs, ', ', 'none supplied');
  out.text(decisionPromptText.itemOutputRules);
  out.text(context['knowledgeInstructions'] ?? 'Knowledge edits are unavailable.');
  out.text(decisionPromptText.attentionExamples);
  out.text(empty);
  out.text(decisionPromptText.speechExampleLabel);
  out.text(envelope);
  out.text(decisionPromptText.speechExample);
  out.section();
  out.text(decisionPromptText.references);
  out.list(context['references']);
}

/** Only visible or explicitly perceived identities enter the reference contract. */
export function responseReferences(
  world: WorldState,
  actorId: string,
  visibleIds: string[],
  evidenceIds: string[],
  rememberedIds: string[] = [],
  retainedEvidence?: Awareness[],
  /** Own accessible possessions already selected into context; usable in action slots. */
  possessionIds: string[] = [],
  /** Portable stacks lying in visible piles; usable for pickup and slots. */
  pileItemIds: string[] = [],
  /** Current prepared request choices and an explicitly inspected container page. */
  inspectedIds: string[] = [],
  learnedSubjects: ObserverSubject[] = [],
  frame = captureModelSpatialFrame(world, actorId),
) {
  const reads = prepareCurrentBodyReadScope(world, actorId);
  visibleIds = visibleIds.filter((id) => !!currentBodyGrant(world, actorId, id, reads));
  const evidence = new Set(evidenceIds);
  const awareness = (retainedEvidence ?? world.experience?.awareness[actorId] ?? []).filter(
    (entry) => evidence.has(entry.eventId),
  );
  const ids = [
    ...new Set([
      actorId,
      ...visibleIds,
      ...awareness
        .flatMap((entry) =>
          [entry.sourceId, entry.targetId, ...entry.entityIds].filter(
            (id): id is string => !!id && awarenessBindsSubject(world, actorId, entry, id),
          ),
        )
        .filter((id): id is string => !!id),
    ]),
  ];
  const visible = new Set(visibleIds);
  const remembered = [
    ...new Set([
      ...rememberedIds,
      ...awareness.flatMap((entry) => (entry.recognized && entry.sourceId ? [entry.sourceId] : [])),
    ]),
  ].filter((id) => id !== actorId && canAddressRememberedSubject(world, actorId, id));
  const rememberedHandle = (id: string) =>
    permittedSourceHandle(world, actorId, ['remembered-person', id]);
  const roleHandle = (id: string) =>
    id === actorId || visible.has(id) ? entityHandle(world, actorId, id) : rememberedHandle(id);
  const identityReferences: Record<string, ObserverSubject> = {};
  const roles = new Map<string, { evidenceId: string; role: string }[]>();
  const rememberedLabels = new Map<string, string>();
  for (const entry of awareness) {
    for (const [id, role] of [
      [entry.sourceId, 'source'],
      [entry.targetId, entry.eventType === 'speech' ? 'intended_recipient' : 'subject'],
    ] as const) {
      if (!id || !awarenessBindsSubject(world, actorId, entry, id)) continue;
      const entries = roles.get(id) ?? [];
      entries.push({ evidenceId: entry.eventId, role });
      roles.set(id, entries);
    }
  }
  const possessions = possessionIds.filter(
    (id) => !ids.includes(id) && accessiblePossession(world, actorId, id),
  );
  const piled = pileItemIds.filter((id) => !ids.includes(id) && !possessions.includes(id));
  const references = ids.map((id) => {
    const entity = entityGet(world.entities, id)!;
    const received = visible.has(id) ? currentBodyValue(world, actorId, id, reads) : undefined;
    const currentSubject = received
      ? (currentBodySubject(world, actorId, id, reads) ??
        (!entity.actor ? { kind: 'entity' as const, entityId: id } : undefined))
      : undefined;
    if (currentSubject) identityReferences[roleHandle(id)] = currentSubject;
    const label =
      id === actorId
        ? entityLabel(world, entity, actorId)
        : received
          ? observerName(world, actorId, id).name
          : 'Unidentified source';
    return formatCurrentReference(
      {
        handle: roleHandle(id),
        label,
        myself: id === actorId,
        ...(received ? { received } : {}),
        ...(currentSubject
          ? {
              knowledge: {
                subject: currentSubject,
                noteRevision: knowledgeDocument(world, actorId, currentSubject)?.revision ?? 0,
                noteCharacters: characterCount(
                  knowledgeDocument(world, actorId, currentSubject)?.text ?? '',
                ),
                nameRevision: observerIndividual(world, actorId, currentSubject)?.revision ?? 0,
              },
            }
          : {}),
        triggerRoles: roles.get(id) ?? [],
      },
      frame,
    );
  });
  for (const id of remembered) {
    const subject: ObserverSubject = { kind: 'entity', entityId: id };
    const handle = rememberedHandle(id);
    identityReferences[handle] = subject;
    references.push(
      formatRememberedPersonReference({
        handle,
        label: subjectLabel(world, actorId, subject),
        nameRevision: identityForEntity(world, actorId, id)?.revision ?? 0,
        noteRevision: knowledgeDocument(world, actorId, subject)?.revision ?? 0,
      }),
    );
  }
  for (const id of possessions)
    references.push(
      JSON.stringify({
        entityId: entityHandle(world, actorId, id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'my possession',
      }),
    );
  for (const id of piled)
    references.push(
      JSON.stringify({
        entityId: entityHandle(world, actorId, id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'lying in a visible pile',
      }),
    );
  const inspected = [...new Set(inspectedIds)].filter(
    (id) =>
      !ids.includes(id) &&
      !possessions.includes(id) &&
      !piled.includes(id) &&
      entityHas(world.entities, id),
  );
  for (const id of inspected)
    references.push(
      JSON.stringify({
        entityId: entityHandle(world, actorId, id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'current permitted activity choice or inspected container page',
      }),
    );
  const all = [...new Set([...ids, ...remembered, ...possessions, ...piled, ...inspected])];
  for (const subject of [
    ...learnedSubjects,
    ...awareness.flatMap((entry) => (entry.sourceSubject ? [entry.sourceSubject] : [])),
  ]) {
    if (subject.kind !== 'individual') continue;
    const identity = observerIndividual(world, actorId, subject);
    if (!identity || identity.seedOnly) continue;
    const handle = subjectHandle(world, actorId, subject);
    if (identityReferences[handle]) continue;
    identityReferences[handle] = subject;
    references.push(
      formatRememberedIndividualReference({
        handle,
        label: subjectLabel(world, actorId, subject),
        nameRevision: identity.revision,
        noteRevision: knowledgeDocument(world, actorId, subject)?.revision ?? 0,
      }),
    );
  }
  const physicalIds = [
    ...new Set([
      actorId,
      ...visibleIds,
      ...possessions,
      ...piled,
      ...inspected.filter(
        (id) =>
          accessiblePossession(world, actorId, id) || !!currentBodyGrant(world, actorId, id, reads),
      ),
    ]),
  ];
  return {
    entityIds: all,
    references,
    entityReferences: {
      ...Object.fromEntries(ids.map((id) => [roleHandle(id), id])),
      ...Object.fromEntries(remembered.map((id) => [rememberedHandle(id), id])),
      ...entityReferenceMap(world, [...possessions, ...piled, ...inspected], actorId),
    },
    physicalEntityReferences: entityReferenceMap(world, physicalIds, actorId),
    entityLeases: Object.fromEntries(
      visibleIds.flatMap((id) => {
        const received = currentBodyGrant(world, actorId, id, reads);
        return received ? [[id, received.leaseId]] : [];
      }),
    ),
    identityReferences,
  };
}

function emitIntentions(out: DecisionContextText, value: unknown): void {
  const agency = value as
    | {
        goals?: { id: string; revision: number; objective: string; status: string }[];
        plan?: unknown;
        paused?: unknown;
        planRevision?: number;
        outcomeCoverage?: string;
        attempts?: { description: string }[];
      }
    | undefined;
  let lines = 0;
  const line = () => {
    if (lines++) out.text('\n');
  };
  for (const goal of agency?.goals ?? []) {
    line();
    out.text(goal.status);
    out.text(decisionPromptText.goal);
    out.text(goal.objective);
  }
  line();
  out.text(typeof agency?.plan === 'string' ? agency.plan : decisionPromptText.noPlan);
  if (typeof agency?.paused === 'string') {
    line();
    out.text(agency.paused);
  }
  if (agency?.outcomeCoverage) {
    line();
    out.text(agency.outcomeCoverage);
  }
  line();
  out.text(decisionPromptText.planRevision);
  out.text(agency?.planRevision ?? 0);
  out.text('.');
  if (agency?.goals?.length) {
    line();
    out.text(decisionPromptText.goalControls);
    for (let index = 0; index < agency.goals.length; index++) {
      if (index) out.text(',');
      const goal = agency.goals[index]!;
      out.text('{');
      let fields = 0;
      for (const key of ['id', 'revision', 'objective'] as const) {
        if (goal[key] === undefined) continue;
        if (fields++) out.text(',');
        out.json(key);
        out.text(':');
        out.json(goal[key]);
      }
      out.text('}');
    }
    out.text(']');
  }
  for (const attempt of agency?.attempts ?? []) {
    line();
    out.text(decisionPromptText.unresolvedIntention);
    out.text(attempt.description);
  }
}
