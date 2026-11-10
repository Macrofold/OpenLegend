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
      this.text('None supplied.');
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
  out.text('## Me\n');
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
    out.text('\nI cannot speak; talk must be null.');
  }
  out.section();
  out.text('## My commitments\n');
  out.list(context['commitments']);
  out.text('\n');
  out.text(context['activityCoverage'] ?? '');
  out.section();
  out.text('## Trigger\n');
  out.text(context['stimulus']);
  out.section();
  out.text('## Trigger facts\n');
  out.json(context['triggerFacts'] ?? {});
  out.text(
    '\nEvent-time identity and current visibility are separate. Another nearby individual of the same species is not the speaker. Reconsider whether an older social opportunity still warrants a response; overhearing does not imply an invitation, but deliberate participation is allowed.',
  );
  out.section();
  out.text(
    '## Task\nChoose only warranted speech, actions, private thoughts, goals or a short native plan. Each kind is optional and may repeat.',
  );
  if (
    (context['triggerFacts'] as { observerRelationship?: string } | undefined)
      ?.observerRelationship === 'addressed_speech'
  ) {
    out.text(
      ' Speech directed at me normally deserves a natural conversational response, whether a question, statement or greeting.',
    );
  }
  out.text(
    ' Silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.',
  );
  out.section();
  out.text(
    '## Conversation so far\nSelected speech I personally experienced, in chronological order; older unselected history may remain:\n',
  );
  out.list(context['conversation']);
  out.text(
    '\nA turn marked "I said" is my own speech, not a reply from someone else. Avoid repeating an unanswered greeting or question unless the situation warrants it.',
  );
  if (Array.isArray(context['planOffers']) && context['planOffers'].length) {
    out.section();
    out.text('## Known planning techniques\n');
    out.json(context['planOffers'] ?? []);
    out.text(
      '\nPrerequisites must be obtained first. These handles can be queued without a current action shortlist.',
    );
  }
  if (Array.isArray(context['intentActions']) && context['intentActions'].length) {
    out.section();
    out.text('## Private intent controls\n');
    out.json(context['intentActions'] ?? []);
    out.text(
      '\nUse a known action handle to accept the exact revised action or withdraw an unresolved intent. Withdrawal does not cancel physical work; neither control can be queued in a plan. Never accept for another actor.',
    );
  }
  out.section();
  out.text('## Private intentions and native work\n');
  emitIntentions(out, context['agency']);
  out.text(
    '\nThese are intentions and actual step dispositions, never proof that an objective was achieved. Reconsider an existing purpose when its reason has ended, an opportunity was declined, or an unchanged obstacle prevents progress. Continuing for a remaining reason is legitimate; a trait alone does not require restarting completed work.',
  );
  if (Array.isArray(context['supplyOpportunities']) && context['supplyOpportunities'].length) {
    out.section();
    out.text('## Optional personal supply considerations\n');
    out.list(context['supplyOpportunities']);
  }
  out.section();
  out.text('## Native navigation\n');
  out.text(context['navigation'] ?? '');
  out.text(
    '\nSpatial offsets are metres right, above and forward from my position and facing at this decision cut; this is an internal measurement frame, not learned global coordinate vocabulary. Support: ',
  );
  out.text(context['currentSupport']);
  out.text('\nPublic supports: ');
  out.json(context['publicSurfaces'] ?? []);
  out.section();
  out.text('## Current time\n');
  out.text(context['now']);
  out.text(' (simulation seconds: ');
  out.text(context['simTime'] ?? 'unavailable');
  out.text(')');
  if (context['activityRequests']) {
    out.section();
    out.text('## Optional installed activity requests\n');
    out.json(context['activityRequests']);
    out.text(
      '\nThese are optional selected compositions, not goals or learned behavior. Use exact authored parameters only. Later native checks can refuse changed prerequisites.',
    );
  }
  if (context['inspectedContainer']) {
    out.section();
    out.text('## Container I chose to inspect\n');
    out.json(context['inspectedContainer']);
    out.text(
      '\nOnly these exact contents are known from this page. Further pages and nested contents remain unknown. Access or movement can invalidate this inspection.',
    );
  }
  if (context['inspectedActions']) {
    out.section();
    out.text('## Actions I chose to inspect\n');
    out.list(context['inspectedActions']);
  }
  if (context['inspectedMethods']) {
    out.section();
    out.text('## Activities I chose to inspect\n');
    out.list(context['inspectedMethods']);
  }
  out.section();
  out.text(
    '## Recent memories\nThese are earlier personal experiences, not a current scene. Each source keeps its own time, place and participant; its recorded location does not establish my present location. A remembered location, activity, identity association or object state does not establish present conditions; describe it as remembered unless current received evidence supports the present claim. A remembered conditional rule does not establish its condition now.\n',
  );
  out.list(context['recall']);
  if (context['reconsideration']) {
    out.text('\n');
    out.text(context['reconsideration']);
  }
  out.text('\nComplete structured personal history:\n');
  out.json(context['experience'] ?? []);
  out.text(
    "\nThese records preserve who experienced each event, acquisition, exact heard fragments and participant roles. Quoted words remain the speaker's words. Self, addressed, overheard, ambient and seen-only are distinct; none grants consent or forces a reply.",
  );
  if (context['recentWorkResults']) {
    out.section();
    out.text('## Recent work results\n');
    out.json(context['recentWorkResults']);
    out.text(
      '\nThese are outcomes I personally received at the recorded times; they do not establish present conditions.',
    );
  }
  if (context['receivedSituation']) {
    out.section();
    out.text('## Received situation\n');
    out.json(context['receivedSituation']);
    out.text(
      "\nUse this packet for current received surroundings and its explicitly timed retained changes. These are personally received measurements, not access to other people's intentions, knowledge or attention. Original times and gaps matter. Unexpanded or missing detail does not prove absence; an empty list applies only to its supplied subject and received scope, not other people or omitted facts. Use only the supplied references for optional situation queries, further attention or a fallible remembered interpretation.",
    );
  }
  if (surroundings?.length || contacts?.length || !context['receivedSituation']) {
    out.section();
    out.text('## Nearby actors and objects\n');
    if (surroundings?.length || !context['receivedSituation']) {
      out.list(surroundings);
    } else {
    }
    if (contacts?.length) {
      out.text('\nContact evidence:\n');
      out.list(contacts);
    } else {
    }
  }
  out.section();
  out.text('## Inventory\n');
  out.list(context['possessions']);
  if (context['inventoryCoverage']) {
    out.text('\nPartial inventory preparation: ');
    out.json(context['inventoryCoverage']);
    out.text(
      '. Only this page and bound tools were considered. Other possessions may be useful; explicitly inspect another page when needed. Omission is not absence.',
    );
  }
  out.section();
  out.text('## General knowledge notepad\n');
  out.json(context['notepad'] ?? {});
  out.section();
  out.text('## Knowledge\n');
  out.list(context['knowledge']);
  if (includeActions) {
    out.section();
    out.text('## Actions\nOptional relevant executable choices; selection is not mandatory:\n');
    if (actions.length) {
      out.actions(actions);
    } else {
      out.text('No shortlisted mechanical action.');
    }
    out.text(
      '\nI may propose an unlisted action. I should not prefer an existing action just because it is listed. A proposal is an intention, not a completed action; unsupported mechanics cannot execute. A useful partial interpretation must report omissions; uncertain revisions require explicit initiator acceptance, not automatic invention.',
    );
  }
  out.section();
  out.text('## Response format\n');
  if (queryEnvelope) {
    out.text(
      'Choose one mode before writing operations. Write queries first: null means a complete decision; a nonempty supplied query batch means read-only mode with operations:[] and invention:null when that field is offered. Do not combine queries with effects. ',
    );
  }
  out.text('Return ');
  out.text(empty);
  out.text(
    ' to continue without intervention. At most 16 operations and 40000 UTF-8 bytes in total. Each operation has localId (unique lowercase letter followed by letters/digits/underscores, max 24), requiresAccepted (earlier localIds only), and exactly one non-null field among talk, act, think, goal, plan, note, name, appraise, observe, remember; unused fields must be null. Operations are admitted in order; requiresAccepted means admission, never physical completion.\nSpeech: talk={"text":"words","addresseeEntityId":"permitted ID","selfIntroduction":null,"volume":"normal"}, max 1200 characters. Use null addresseeEntityId for ambient speech. Choose volume whisper, normal or shout; whispering is not guaranteed private. Thought: think={"text":"brief private feeling","aboutEntityIds":[]}, max 240 characters.\nAction: act={"kind":"',
  );
  if (capabilities?.expressions) {
    out.text('known|expression|proposal|invoke');
  } else {
    out.text('known|proposal|invoke');
  }
  out.text(
    '","actionId":null,"verb":null,"targetEntityId":null,"description":null,"invocation":null,"slots":null,"mode":"enqueue|replace|interrupt"}. For known, fill only actionId; ',
  );
  if (capabilities?.expressions) {
    out.text('for expression, fill verb and optionally targetEntityId; ');
  }
  out.text(
    'for proposal, fill description (max 500), optionally targetEntityId, and optionally slots={"itemId":null,"instrumentId":null,"recipientId":null,"quantity":null,"quantityMode":null,"until":null,"method":null}: exact permitted IDs for the item acted on, the tool used and the recipient; a whole quantity with quantityMode exact (units handled) or held (total to carry afterwards); ',
  );
  if (namedTimes.length) {
    out.text('until ');
    out.joined(namedTimes, '|');
  } else {
    out.text('until null (this world names no stopping times)');
  }
  out.text(
    '; method keeps required wording such as quietly. Slots are null for other kinds. Complete typed proposals such as "drop 2 ITEM", "pick up ITEM" or "follow NAME at 4 m" bind without interpretation; a refused one states why. For invoke, fill invocation using Native navigation or an optional installed activity request; actionId, verb, description and top-level targetEntityId remain null. Request families use only their exact parameters and null navigation fields; their selected mode equals act.mode. A chosen request is neither a learned method nor completed work. Unlisted attempts remain available with no action suggestions. No unsupported effects are implied.\nGoal: goal={"operation":"create|revise|pause|resume|complete|abandon","goalId":null,"expectedRevision":null,"objective":null,"parentId":null}. Create supplies objective (max 500), optional parentId; revise supplies existing goalId/revision, objective and optional parentId. Status changes supply only existing goalId/revision. Eight active/paused goals maximum. Completion is a subjective declaration.\nPlan: plan={"mode":"enqueue|replace|cancel","expectedRevision":0,"goalId":null,"steps":[]}. Copy current plan revision (0 if absent). At most eight sequential steps. A step selects {"actionId":"supplied handle","itemFromStep":null,"useItemAs":null}, or consumes an earlier item output with {"actionId":null,"itemFromStep":0,"useItemAs":"equip"} (also "eat"). Indexes are zero-based within this submitted frontier. Only ',
  );
  out.joined(outputs, ', ', 'none supplied');
  out.text(
    ' supply item outputs. Later steps wait for earlier completion and recheck prerequisites. Cancel has empty steps and null goalId. A new goal may be referenced as "$localId" only with that localId in requiresAccepted. Physical work takes simulation time. A plan may have no goal.\n',
  );
  out.text(context['knowledgeInstructions'] ?? 'Knowledge edits are unavailable.');
  out.text(
    '\nFurther attention: observe={"subjects":["supplied current reference"]}; this changes attention only, not gaze or physical sensing. Remembered interpretation: remember={"sources":["supplied current fact, receipt or observation reference"],"text":"a fallible interpretation"}; at most eight supplied sources and 1200 characters. It creates no exact knowledge or action permission. Both are optional.\nExamples: empty ',
  );
  out.text(empty);
  out.text('; speech alone ');
  out.text(envelope);
  out.text(
    '{"localId":"reply","requiresAccepted":[],"talk":{"text":"Hello.","addresseeEntityId":"COPY_PERMITTED_ID","selfIntroduction":null,"volume":"normal"},"act":null,"think":null,"goal":null,"plan":null,"note":null,"name":null,"appraise":null,"observe":null,"remember":null}]}; combined decisions can contain separate speech and thought operations, repeated kinds, or a goal creation followed by a plan requiring that goal\'s admission. Never invent a goal or thought just to fill the schema. No reasoning transcript or fabricated completion.',
  );
  out.section();
  out.text(
    '## References\nNames are display prose, never identifiers. Copy the opaque ID token from (ID:token) into structured entity fields. Never invent a token or use a species name as an ID. Include (ID:token) in an unlisted proposal when identifying its target.\n',
  );
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
    out.text(' goal: ');
    out.text(goal.objective);
  }
  line();
  out.text(typeof agency?.plan === 'string' ? agency.plan : 'No remaining work supplied.');
  if (typeof agency?.paused === 'string') {
    line();
    out.text(agency.paused);
  }
  if (agency?.outcomeCoverage) {
    line();
    out.text(agency.outcomeCoverage);
  }
  line();
  out.text('For structured plan changes, current plan revision: ');
  out.text(agency?.planRevision ?? 0);
  out.text('.');
  if (agency?.goals?.length) {
    line();
    out.text('Goal controls for structured goal changes: [');
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
    out.text('Unresolved intention: ');
    out.text(attempt.description);
  }
}
