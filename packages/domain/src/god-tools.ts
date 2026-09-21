import { nativeActor, canSpeak, hasMemory, reconcileBody } from './living.js';
import { draftWorld } from './draft.js';
import { addItem, createActor, nextId, TRAIT_BANK } from './data.js';
import { canonicalJson, emit, finish, outcome } from './events.js';
import { mindFor } from './mind.js';
import {
  experienceEntry,
  experienceEntries,
  invalidateExperience,
  migrateCognition,
  mutateExperience,
  type ExperienceMutation,
} from './experience.js';
import { memoryPerspective } from './memory-perspective.js';
import { distance, isWalkable } from './spatial.js';
import type {
  Entity,
  GodPersonEdit,
  GodPersonDraft,
  GodPersonEditorDraft,
  GodSpawnDraft,
  GodSpawnType,
  MemoryRecord,
  Transition,
  WorldEvent,
  WorldState,
} from './types.js';

export const GOD_SPAWN_OPTIONS: ReadonlyArray<{ id: GodSpawnType; label: string }> = [
  { id: 'person', label: 'Person' },
  { id: 'banked-campfire', label: 'Banked campfire' },
  { id: 'berry-bush', label: 'Berry bush' },
  { id: 'berry-thicket', label: 'Berry thicket' },
  { id: 'deer', label: 'Deer' },
  { id: 'dry-grass-fibers', label: 'Dry grass fibers' },
  { id: 'fallen-branches', label: 'Fallen branches' },
  { id: 'hare', label: 'Hare' },
  { id: 'river-reeds', label: 'River reeds' },
  { id: 'river-stones', label: 'River stones' },
];

function reject(world: WorldState, code: string, message: string): Transition {
  return { world, events: [], outcome: outcome(false, code, message) };
}

function personTraits(draft: Pick<GodPersonDraft | GodPersonEditorDraft, 'traitIds'>) {
  const ids = [...new Set(draft.traitIds)];
  if (ids.length > 8) return null;
  const traits = ids.map((id) => TRAIT_BANK.find((trait) => trait.id === id));
  return traits.every((trait) => !!trait) ? traits.map((trait) => ({ ...trait! })) : null;
}

function spawnedEntity(world: WorldState, draft: GodSpawnDraft): Entity | null {
  const id = nextId(world, draft.type === 'person' ? 'person' : draft.type);
  const base = { id, position: { ...draft.position } };
  switch (draft.type) {
    case 'person': {
      if (!draft.person) return null;
      const traits = personTraits(draft.person);
      if (!traits) return null;
      return {
        ...base,
        name: draft.person.name.trim(),
        kind: 'npc',
        actor: createActor(world, 'npc', 75, {
          ...(traits.length ? { traits } : {}),
          personality: draft.person.personality.trim(),
          backstory: draft.person.backstory.trim(),
          initialGoals: draft.person.initialGoals,
        }),
      };
    }
    case 'banked-campfire':
      return {
        ...base,
        name: 'Banked campfire',
        kind: 'campfire',
        heat: { lit: true, fuelSeconds: 172800 },
      };
    case 'berry-bush':
    case 'berry-thicket':
      return {
        ...base,
        name: draft.type === 'berry-bush' ? 'Berry bush' : 'Berry thicket',
        kind: 'resource',
        resource: { definitionId: 'berries', quantity: 36, workSeconds: 30 },
      };
    case 'dry-grass-fibers':
    case 'river-reeds':
      return {
        ...base,
        name: draft.type === 'river-reeds' ? 'River reeds' : 'Dry grass fibers',
        kind: 'resource',
        resource: { definitionId: 'raw_fiber', quantity: 36, workSeconds: 36 },
      };
    case 'fallen-branches':
      return {
        ...base,
        name: 'Fallen branches',
        kind: 'resource',
        resource: { definitionId: 'wood', quantity: 36, workSeconds: 42 },
      };
    case 'river-stones':
      return {
        ...base,
        name: 'River stones',
        kind: 'resource',
        resource: { definitionId: 'stone', quantity: 60, workSeconds: 24 },
      };
    case 'hare':
    case 'deer':
      return {
        ...base,
        name: draft.type === 'hare' ? 'Hare' : 'Deer',
        kind: 'animal',
        actor: nativeActor(draft.type, world.simTime),
        animal: {
          fleeFrom: null,
          fleeSeconds: 0,
          wanderSeconds: draft.type === 'hare' ? 150 : 200,
        },
      };
  }
}

export function spawnWorldEntity(original: WorldState, draft: GodSpawnDraft): Transition {
  if (!GOD_SPAWN_OPTIONS.some((option) => option.id === draft.type))
    return reject(original, 'unsupported', 'That object type cannot be added.');
  if (!isWalkable(original, draft.position))
    return reject(original, 'blocked', 'Choose open grass or sand.');
  if (
    Object.values(original.entities).some(
      (entity) => distance(entity.position, draft.position) < 0.5,
    )
  )
    return reject(original, 'occupied', 'Choose blank space away from another object.');
  if (draft.type === 'person') {
    const person = draft.person;
    if (
      !person ||
      !person.name.trim() ||
      person.name.trim().length > 80 ||
      person.personality.trim().length > 1000 ||
      person.backstory.trim().length > 4000 ||
      person.initialGoals.length > 8 ||
      person.initialGoals.some((goal) => !goal.trim() || goal.trim().length > 500) ||
      !personTraits(person)
    )
      return reject(original, 'invalid-person', 'The person details are not valid.');
  } else if (draft.person) {
    return reject(original, 'invalid-object', 'Person details only apply to a person.');
  }
  const world = draftWorld(original);
  const entity = spawnedEntity(world, draft);
  if (!entity) return reject(original, 'invalid-object', 'That object could not be added.');
  world.entities[entity.id] = entity;
  if (hasMemory(entity)) {
    world.memories[entity.id] = [];
    world.knowledge[entity.id] = [];
    addItem(world, entity.id, 'stone_tool', 1);
    addItem(world, entity.id, 'berries', 3);
  }
  const events: WorldEvent[] = [];
  emit(
    world,
    events,
    'god-spawned',
    `${entity.name} appeared in the clearing.`,
    entity,
    undefined,
    {
      significant: true,
      godMode: true,
    },
  );
  return finish(world, events, outcome(true, 'spawned', `${entity.name} added.`));
}

export function reviveActor(
  original: WorldState,
  actorId: string,
  requestId?: string,
  expectedRevision?: number,
): Transition {
  const digest = canonicalJson({ operation: 'revive', actorId, expectedRevision });
  const prior = requestId ? original.commandReceipts[requestId] : undefined;
  if (prior)
    return prior.digest === digest
      ? { world: original, events: [], outcome: prior.outcome }
      : reject(original, 'identity', 'Request identity reused.');
  const current = original.entities[actorId];
  if (!current?.actor?.body)
    return reject(original, 'actor', 'Choose an actor with a compatible body.');
  if (expectedRevision !== undefined && current.actor.body.revision !== expectedRevision)
    return reject(original, 'stale', 'The body changed.');
  if (current.actor.alive) return reject(original, 'alive', `${current.name} is already alive.`);
  const world = draftWorld(original);
  const entity = world.entities[actorId]!;
  const actor = entity.actor!;
  actor.alive = true;
  actor.incapacitated = false;
  actor.health = actor.body!.maxHealth;
  actor.fullness = 100;
  actor.energy = 100;
  actor.action = null;
  actor.planGeneration++;
  actor.body!.conditions = { injury: 0, wetness: 0, burning: 0 };
  delete entity.remains;
  if (actor.rest) actor.rest.asleep = false;
  const events: WorldEvent[] = [];
  reconcileBody(world, entity, events, 'revival');
  emit(world, events, 'god-revived', `${entity.name} returned to life.`, entity, undefined, {
    significant: true,
    godMode: true,
  });
  const result = outcome(true, 'revived', `${entity.name} revived.`);
  if (requestId) world.commandReceipts[requestId] = { digest, outcome: result };
  return finish(world, events, result);
}

/** Explicit owner admission; physical identity, species and needs policy do not change. */
export function enableActorCognition(original: WorldState, actorId: string): Transition {
  const current = original.entities[actorId];
  if (!current?.actor?.body) return reject(original, 'actor', 'Choose a compatible actor.');
  if (current.actor.capabilities?.cognition && canSpeak(current))
    return reject(original, 'unchanged', 'These capabilities are already enabled.');
  const world = draftWorld(original);
  const entity = world.entities[actorId]!;
  entity.actor!.capabilities = {
    ...entity.actor!.capabilities!,
    cognition: true,
    memory: true,
    innerWorld: true,
    speech: true,
  };
  if (entity.actor!.controller === 'native') entity.actor!.controller = 'npc';
  entity.actor!.planGeneration++;
  world.memories[actorId] ??= [];
  world.knowledge[actorId] ??= [];
  migrateCognition(world);
  const events: WorldEvent[] = [];
  emit(
    world,
    events,
    'god-cognition-enabled',
    `${entity.name} gained cognition and speech.`,
    entity,
    undefined,
    { significant: true, godMode: true },
  );
  return finish(world, events, outcome(true, 'cognition-enabled', 'Actor capabilities enabled.'));
}

function sameStructure(left: object, right: object, editable: string[]): boolean {
  const fields = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...fields].every(
    (key) =>
      editable.includes(key) ||
      canonicalJson((left as Record<string, unknown>)[key]) ===
        canonicalJson((right as Record<string, unknown>)[key]),
  );
}

export function editPerson(original: WorldState, draft: GodPersonEdit): Transition {
  const current = original.entities[draft.actorId];
  const traits = personTraits(draft.person);
  if (!current?.actor || !hasMemory(current)) return reject(original, 'actor', 'Choose a person.');
  if (
    !draft.person.name.trim() ||
    draft.person.name.trim().length > 80 ||
    draft.person.description.trim().length > 2000 ||
    draft.person.personality.trim().length > 1000 ||
    draft.person.backstory.trim().length > 4000 ||
    draft.person.goals.length > 8 ||
    draft.person.goals.some((goal) => !goal.trim() || goal.trim().length > 500) ||
    Object.values(draft.person.stats).some(
      (value) => !Number.isFinite(value) || value < 0 || value > 100,
    ) ||
    !traits
  )
    return reject(original, 'invalid-person', 'The person details are not valid.');
  if (
    new Set(draft.memoryChanges.map((change) => change.entryId)).size !== draft.memoryChanges.length
  )
    return reject(original, 'invalid-memory', 'A memory may only be changed once per save.');
  const currentExperience = experienceEntries(original, draft.actorId);
  for (const change of draft.memoryChanges) {
    const current = currentExperience.get(change.entryId);
    if (!current) return reject(original, 'invalid-memory', 'That memory no longer exists.');
    if (
      change.replacement &&
      (current.source !== change.replacement.source ||
        !sameStructure(current.value, change.replacement.value, ['text', 'summary', 'importance']))
    )
      return reject(
        original,
        'invalid-memory',
        'Only memory text and importance can be edited; identifiers, evidence links and mechanical fields must remain unchanged.',
      );
    if (
      !change.replacement &&
      (original.memories[draft.actorId] ?? []).some(
        (memory) =>
          memory.kind === 'commitment' &&
          !memory.resolved &&
          [memory.id, memory.eventId, memory.obligation?.evidenceId].includes(
            current.source === 'awareness' ? current.value.eventId : current.value.id,
          ),
      )
    )
      return reject(
        original,
        'commitment',
        'Resolve an active commitment before forgetting its evidence.',
      );
  }

  const world = draftWorld(original);
  const entity = world.entities[draft.actorId]!;
  const goals = draft.person.goals.map((goal) => goal.trim());
  const identityChanged =
    entity.name !== draft.person.name.trim() ||
    entity.actor!.description !== draft.person.description.trim() ||
    entity.actor!.personality !== draft.person.personality.trim() ||
    entity.actor!.backstory !== draft.person.backstory.trim() ||
    JSON.stringify(entity.actor!.traits ?? []) !== JSON.stringify(traits) ||
    JSON.stringify(entity.actor!.goals ?? [entity.actor!.goal].filter(Boolean)) !==
      JSON.stringify(goals);
  const statsChanged =
    entity.actor!.health !== draft.person.stats.health ||
    entity.actor!.fullness !== draft.person.stats.fullness ||
    entity.actor!.energy !== draft.person.stats.energy;
  if (identityChanged) {
    entity.name = draft.person.name.trim();
    entity.actor!.description = draft.person.description.trim();
    entity.actor!.personality = draft.person.personality.trim();
    entity.actor!.backstory = draft.person.backstory.trim();
    entity.actor!.traits = traits;
    if (
      JSON.stringify(entity.actor!.goals ?? [entity.actor!.goal].filter(Boolean)) !==
      JSON.stringify(goals)
    ) {
      entity.actor!.goals = goals;
      entity.actor!.goal = goals[0] ?? '';
      entity.actor!.planGeneration++;
    }
  }
  if (statsChanged) {
    entity.actor!.health = draft.person.stats.health;
    entity.actor!.fullness = draft.person.stats.fullness;
    entity.actor!.energy = draft.person.stats.energy;
  }
  migrateCognition(world);
  const invalidated = new Set<string>();
  const memoryMutations: ExperienceMutation[] = [];
  for (const change of draft.memoryChanges) {
    const previous = currentExperience.get(change.entryId)!;
    const replacement = change.replacement;
    if (replacement && canonicalJson(previous.value) === canonicalJson(replacement.value)) continue;
    memoryMutations.push(
      replacement
        ? { operation: 'update', entryId: change.entryId, entry: replacement }
        : { operation: 'delete', entryId: change.entryId },
    );
  }
  const affected = mutateExperience(world, draft.actorId, memoryMutations);
  if (!affected)
    return reject(
      original,
      'invalid-memory',
      'An edit conflicts with another changed memory or its evidence. Save these changes separately.',
    );
  for (const id of affected) invalidated.add(id);
  if (
    draft.memoryChanges.some(
      (change) => change.replacement && !experienceEntry(world, draft.actorId, change.entryId),
    )
  )
    return reject(
      original,
      'invalid-memory',
      'An edited memory also depends on evidence removed by this save. Save these changes separately.',
    );
  if (
    (original.memories[draft.actorId] ?? []).some(
      (memory) =>
        memory.kind === 'commitment' &&
        !memory.resolved &&
        [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
          (id) =>
            !!id &&
            world.experience!.forgotten[draft.actorId]?.includes(id) &&
            !original.experience?.forgotten[draft.actorId]?.includes(id),
        ),
    )
  )
    return reject(
      original,
      'commitment',
      'Resolve an active commitment before forgetting its evidence.',
    );

  if (identityChanged) {
    const mind = mindFor(world, draft.actorId);
    const identity = mind.documents.find((document) => document.id === 'identity');
    if (identity) {
      identity.text = [
        `I am ${entity.name}.`,
        entity.actor!.description,
        entity.actor!.personality,
        entity.actor!.backstory,
        (entity.actor!.goals ?? []).length
          ? `My goals are: ${(entity.actor!.goals ?? []).join('; ')}.`
          : entity.actor!.goal,
      ]
        .filter(Boolean)
        .join(' ');
      identity.revision++;
      mind.revision++;
      (world.minds ??= {})[draft.actorId] = mind;
    }
    const inner = world.innerWorlds?.[draft.actorId];
    const identityFile = inner?.files.find((file) => file.path === 'identity.md');
    if (inner && identityFile && identity) {
      identityFile.text = `${identity.title}\n${identity.text}`;
      inner.text = inner.files
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path, 'en'))
        .map((file) => `# ${file.path}\n${file.text}`)
        .join('\n\n');
      inner.revision++;
      inner.reconsiderationRequired = true;
    }
  }
  return {
    ...finish(world, [], outcome(true, 'person-saved', `${entity.name} saved.`)),
    invalidatedMemoryIds: invalidated.size ? { [draft.actorId]: [...invalidated] } : undefined,
  };
}

export function editWorldEvents(
  original: WorldState,
  changes: Array<{ id: string; replacement: WorldEvent | null }>,
): Transition {
  if (new Set(changes.map((change) => change.id)).size !== changes.length)
    return reject(original, 'invalid-events', 'An event may only be changed once per save.');
  const eventsById = new Map(original.events.map((event) => [event.id, event]));
  const protectedEventIds = new Set<string>();
  for (const memories of Object.values(original.memories))
    for (const memory of memories)
      if (memory.kind === 'commitment' && !memory.resolved) {
        if (memory.eventId) protectedEventIds.add(memory.eventId);
        if (memory.obligation?.evidenceId) protectedEventIds.add(memory.obligation.evidenceId);
      }
  for (const knowledge of Object.values(original.knowledge))
    for (const record of knowledge) protectedEventIds.add(record.evidenceId);
  for (const event of original.events)
    for (const value of Object.values(event.data ?? {}))
      if (typeof value === 'string' && value !== event.id && eventsById.has(value))
        protectedEventIds.add(value);
  for (const change of changes) {
    const current = eventsById.get(change.id);
    if (!current) return reject(original, 'invalid-events', 'That event no longer exists.');
    if (change.replacement && !sameStructure(current, change.replacement, ['text']))
      return reject(
        original,
        'invalid-events',
        'Only event text can be edited; identifiers, participants, timing and mechanical data must remain unchanged.',
      );
    if (!change.replacement && protectedEventIds.has(change.id))
      return reject(
        original,
        'event-in-use',
        'This event is retained evidence for knowledge, an active commitment or another event and cannot be deleted.',
      );
  }
  const world = draftWorld(original);
  migrateCognition(world);
  const changed = new Map(
    changes
      .filter((change) => change.replacement?.text !== eventsById.get(change.id)!.text)
      .map((change) => [change.id, change] as const),
  );
  const rawContent = new Map<string, string>();
  for (const [eventId, change] of changed) {
    if (!change.replacement) continue;
    const previous = eventsById.get(eventId)!;
    const content = previous.data?.['text'];
    if (typeof content !== 'string') continue;
    const prefix = previous.text.endsWith(content)
      ? previous.text.slice(0, previous.text.length - content.length)
      : '';
    if (!change.replacement.text.startsWith(prefix))
      return reject(
        original,
        'invalid-events',
        'Keep the original speaker prefix when editing attributed event text.',
      );
    rawContent.set(eventId, change.replacement.text.slice(prefix.length));
  }
  world.events = world.events.filter((event) => {
    const change = changed.get(event.id);
    if (!change) return true;
    if (!change.replacement) return false;
    event.text = change.replacement.text;
    if (rawContent.has(event.id)) event.data!['text'] = rawContent.get(event.id)!;
    return true;
  });

  const affectedActors = new Map<string, Set<string>>();
  const mark = (actorId: string, sourceId: string) => {
    if (!changed.has(sourceId)) return;
    const sources = affectedActors.get(actorId) ?? new Set<string>();
    sources.add(sourceId);
    affectedActors.set(actorId, sources);
  };
  for (const [actorId, entries] of Object.entries(world.experience!.awareness))
    for (const entry of entries) mark(actorId, entry.eventId);
  for (const [actorId, entries] of Object.entries(world.memories))
    for (const entry of entries) if (entry.eventId) mark(actorId, entry.eventId);
  for (const [actorId, entries] of Object.entries(world.experience!.summaries))
    for (const entry of entries) for (const sourceId of entry.sourceIds) mark(actorId, sourceId);
  for (const [actorId, corrections] of Object.entries(world.experience!.corrections ?? {}))
    for (const [sourceId, evidenceId] of Object.entries(corrections)) {
      mark(actorId, sourceId);
      mark(actorId, evidenceId);
    }

  const invalidatedMemoryIds: Record<string, string[]> = {};
  for (const [actorId, sourceIds] of affectedActors) {
    if (!world.entities[actorId]?.actor) continue;
    const awareness = new Map(
      (world.experience!.awareness[actorId] ?? []).map((entry) => [entry.eventId, entry]),
    );
    const memories = new Map<string, MemoryRecord[]>();
    for (const memory of world.memories[actorId] ?? [])
      if (memory.eventId)
        memories.set(memory.eventId, [...(memories.get(memory.eventId) ?? []), memory]);
    const mutations: ExperienceMutation[] = [];
    const fallbackUpdates: string[] = [];
    const fallbackDeletes: string[] = [];
    for (const sourceId of sourceIds) {
      const change = changed.get(sourceId)!;
      const aware = awareness.get(sourceId);
      const remembered = memories.get(sourceId) ?? [];
      if (change.replacement) {
        const text = memoryPerspective(
          world,
          actorId,
          change.replacement.text,
          change.replacement.type === 'speech',
          change.replacement.actorId,
        );
        if (aware)
          mutations.push({
            operation: 'update',
            entryId: `awareness:${aware.eventId}`,
            entry: {
              source: 'awareness',
              value: {
                ...aware,
                text,
                content: rawContent.get(sourceId) ?? change.replacement.text,
              },
            },
          });
        for (const memory of remembered)
          mutations.push({
            operation: 'update',
            entryId: `memory:${memory.id}`,
            entry: { source: 'memory', value: { ...memory, summary: text } },
          });
        if (!aware && !remembered.length) fallbackUpdates.push(sourceId);
      } else {
        if (aware) mutations.push({ operation: 'delete', entryId: `awareness:${aware.eventId}` });
        for (const memory of remembered)
          mutations.push({ operation: 'delete', entryId: `memory:${memory.id}` });
        if (!aware && !remembered.length) fallbackDeletes.push(sourceId);
      }
    }
    const invalidated = new Set<string>();
    const affected = mutations.length ? mutateExperience(world, actorId, mutations) : [];
    if (!affected)
      return reject(original, 'invalid-memory', 'The event dependencies changed during editing.');
    for (const id of affected) invalidated.add(id);
    if (fallbackUpdates.length)
      for (const id of invalidateExperience(world, actorId, fallbackUpdates)) invalidated.add(id);
    if (fallbackDeletes.length)
      for (const id of invalidateExperience(world, actorId, fallbackDeletes, true))
        invalidated.add(id);
    if (
      [...sourceIds].some((sourceId) => !changed.get(sourceId)!.replacement) &&
      (original.memories[actorId] ?? []).some(
        (memory) =>
          memory.kind === 'commitment' &&
          !memory.resolved &&
          [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
            (id) => !!id && invalidated.has(id),
          ),
      )
    )
      return reject(
        original,
        'event-in-use',
        'This event is evidence for an active commitment and cannot be deleted.',
      );
    invalidatedMemoryIds[actorId] = [...invalidated];
  }
  return {
    ...finish(world, [], outcome(true, 'world-events-saved', 'World events saved.')),
    invalidatedMemoryIds,
  };
}
