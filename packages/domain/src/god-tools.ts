import { draftWorld } from './draft.js';
import { addItem, createActor, nextId, TRAIT_BANK } from './data.js';
import { canonicalJson, emit, finish, outcome } from './events.js';
import { mindFor } from './mind.js';
import {
  experienceEntry,
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
  GodSpawnDraft,
  GodSpawnType,
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

function personTraits(draft: GodPersonDraft) {
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
        animal: {
          species: draft.type,
          health: draft.type === 'hare' ? 18 : 36,
          alive: true,
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
  if (entity.actor) {
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

export function reviveActor(original: WorldState, actorId: string): Transition {
  const current = original.entities[actorId];
  if (!current?.actor) return reject(original, 'actor', 'Choose a character.');
  if (current.actor.alive) return reject(original, 'alive', `${current.name} is already alive.`);
  const world = draftWorld(original);
  const entity = world.entities[actorId]!;
  entity.actor!.alive = true;
  entity.actor!.incapacitated = false;
  entity.actor!.health = Math.max(25, entity.actor!.health);
  entity.actor!.fullness = Math.max(25, entity.actor!.fullness);
  entity.actor!.energy = Math.max(25, entity.actor!.energy);
  entity.actor!.action = null;
  if (entity.actor!.rest) entity.actor!.rest!.asleep = false;
  const events: WorldEvent[] = [];
  emit(world, events, 'god-revived', `${entity.name} returned to life.`, entity, undefined, {
    significant: true,
    godMode: true,
  });
  return finish(world, events, outcome(true, 'revived', `${entity.name} revived.`));
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
  if (!current?.actor || current.kind !== 'npc')
    return reject(original, 'actor', 'Choose a person.');
  if (
    !draft.person.name.trim() ||
    draft.person.name.trim().length > 80 ||
    draft.person.personality.trim().length > 1000 ||
    draft.person.backstory.trim().length > 4000 ||
    draft.person.initialGoals.length > 8 ||
    draft.person.initialGoals.some((goal) => !goal.trim() || goal.trim().length > 500) ||
    !traits
  )
    return reject(original, 'invalid-person', 'The person details are not valid.');
  if (
    new Set(draft.memoryChanges.map((change) => change.entryId)).size !== draft.memoryChanges.length
  )
    return reject(original, 'invalid-memory', 'A memory may only be changed once per save.');
  for (const change of draft.memoryChanges) {
    const current = experienceEntry(original, draft.actorId, change.entryId);
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
  const goals = draft.person.initialGoals.map((goal) => goal.trim());
  const personChanged =
    entity.name !== draft.person.name.trim() ||
    entity.actor!.personality !== draft.person.personality.trim() ||
    entity.actor!.backstory !== draft.person.backstory.trim() ||
    JSON.stringify(entity.actor!.traits ?? []) !== JSON.stringify(traits) ||
    JSON.stringify(entity.actor!.initialGoals ?? []) !== JSON.stringify(goals);
  if (personChanged) {
    entity.name = draft.person.name.trim();
    entity.actor!.personality = draft.person.personality.trim();
    entity.actor!.backstory = draft.person.backstory.trim();
    entity.actor!.traits = traits;
    if (JSON.stringify(entity.actor!.initialGoals ?? []) !== JSON.stringify(goals)) {
      entity.actor!.initialGoals = goals;
      entity.actor!.goal = goals[0] ?? entity.actor!.goal;
    }
  }
  migrateCognition(world);
  const invalidated = new Set<string>();
  const memoryMutations: ExperienceMutation[] = [];
  for (const change of draft.memoryChanges) {
    const previous = experienceEntry(original, draft.actorId, change.entryId)!;
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

  if (personChanged) {
    const mind = mindFor(world, draft.actorId);
    const identity = mind.documents.find((document) => document.id === 'identity');
    if (identity) {
      identity.text = [
        `I am ${entity.name}.`,
        entity.actor!.personality,
        entity.actor!.backstory,
        (entity.actor!.initialGoals ?? []).length
          ? `My starting goals are: ${(entity.actor!.initialGoals ?? []).join('; ')}.`
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
  for (const change of changes) {
    const current = original.events.find((event) => event.id === change.id);
    if (!current) return reject(original, 'invalid-events', 'That event no longer exists.');
    if (change.replacement && !sameStructure(current, change.replacement, ['text']))
      return reject(
        original,
        'invalid-events',
        'Only event text can be edited; identifiers, participants, timing and mechanical data must remain unchanged.',
      );
    if (
      !change.replacement &&
      (Object.values(original.memories).some((memories) =>
        memories.some(
          (memory) =>
            memory.kind === 'commitment' &&
            !memory.resolved &&
            (memory.eventId === change.id || memory.obligation?.evidenceId === change.id),
        ),
      ) ||
        Object.values(original.knowledge).some((knowledge) =>
          knowledge.some((record) => record.evidenceId === change.id),
        ) ||
        original.events.some(
          (event) => event.id !== change.id && Object.values(event.data ?? {}).includes(change.id),
        ))
    )
      return reject(
        original,
        'event-in-use',
        'This event is retained evidence for knowledge, an active commitment or another event and cannot be deleted.',
      );
  }
  const world = draftWorld(original);
  migrateCognition(world);
  const invalidatedMemoryIds: Record<string, string[]> = {};
  for (const change of changes) {
    const index = world.events.findIndex((event) => event.id === change.id);
    const previous = original.events.find((event) => event.id === change.id)!;
    if (change.replacement?.text === previous.text) continue;
    if (change.replacement) {
      const event = world.events[index]!;
      const content = previous.data?.['text'];
      if (typeof content === 'string') {
        const prefix = previous.text.endsWith(content)
          ? previous.text.slice(0, previous.text.length - content.length)
          : '';
        if (!change.replacement.text.startsWith(prefix))
          return reject(
            original,
            'invalid-events',
            'Keep the original speaker prefix when editing attributed event text.',
          );
        event.data!['text'] = change.replacement.text.slice(prefix.length);
      }
      event.text = change.replacement.text;
    } else world.events.splice(index, 1);
    for (const actorId of Object.keys(world.entities).filter((id) => world.entities[id]?.actor)) {
      const awareness = world.experience!.awareness[actorId]?.find(
        (entry) => entry.eventId === change.id,
      );
      const memories = (world.memories[actorId] ?? []).filter(
        (entry) => entry.eventId === change.id,
      );
      const summaries = world.experience!.summaries[actorId] ?? [];
      const corrections = world.experience!.corrections?.[actorId] ?? {};
      if (
        !awareness &&
        !memories.length &&
        !summaries.some((entry) => entry.sourceIds.includes(change.id)) &&
        !Object.hasOwn(corrections, change.id) &&
        !Object.values(corrections).includes(change.id)
      )
        continue;
      if (change.replacement) {
        const text = memoryPerspective(
          world,
          actorId,
          change.replacement.text,
          change.replacement.type === 'speech',
        );
        const mutations: ExperienceMutation[] = [];
        if (awareness)
          mutations.push({
            operation: 'update',
            entryId: `awareness:${awareness.eventId}`,
            entry: {
              source: 'awareness',
              value: {
                ...awareness,
                text,
                content: String(world.events[index]!.data?.['text'] ?? change.replacement.text),
              },
            },
          });
        for (const memory of memories)
          mutations.push({
            operation: 'update',
            entryId: `memory:${memory.id}`,
            entry: { source: 'memory', value: { ...memory, summary: text } },
          });
        const affected = mutations.length
          ? mutateExperience(world, actorId, mutations)
          : invalidateExperience(world, actorId, [change.id]);
        if (!affected)
          return reject(
            original,
            'invalid-memory',
            'The event dependencies changed during editing.',
          );
        invalidatedMemoryIds[actorId] = [
          ...new Set([...(invalidatedMemoryIds[actorId] ?? []), ...affected]),
        ];
      } else {
        const mutations: ExperienceMutation[] = [
          ...(awareness
            ? [{ operation: 'delete' as const, entryId: `awareness:${awareness.eventId}` }]
            : []),
          ...memories.map((memory) => ({
            operation: 'delete' as const,
            entryId: `memory:${memory.id}`,
          })),
        ];
        const affected = mutations.length
          ? mutateExperience(world, actorId, mutations)
          : invalidateExperience(world, actorId, [change.id], true);
        if (!affected)
          return reject(
            original,
            'invalid-memory',
            'The event dependencies changed during deletion.',
          );
        invalidatedMemoryIds[actorId] = [
          ...new Set([...(invalidatedMemoryIds[actorId] ?? []), ...affected]),
        ];
      }
      if (
        !change.replacement &&
        (original.memories[actorId] ?? []).some(
          (memory) =>
            memory.kind === 'commitment' &&
            !memory.resolved &&
            [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
              (id) => !!id && invalidatedMemoryIds[actorId]!.includes(id),
            ),
        )
      )
        return reject(
          original,
          'event-in-use',
          'This event is evidence for an active commitment and cannot be deleted.',
        );
    }
  }
  return {
    ...finish(world, [], outcome(true, 'world-events-saved', 'World events saved.')),
    invalidatedMemoryIds,
  };
}
