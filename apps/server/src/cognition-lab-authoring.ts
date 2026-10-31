import { randomUUID } from 'node:crypto';
import {
  entityGet,
  entityValues,
  godAuthoringCatalogue,
  projectAttributes,
  projectStatusEffects,
  observerDescription,
  attributeDefinition,
  HOST_IMPLEMENTATIONS,
  knowledgeDocument,
  canRememberSubject,
  appraisalById,
  appraisalDefinition,
  definitionPin,
  nativeValueHoldSupported,
  isDefinitionPin,
  type DefinitionPin,
  validateNativeValueHolds,
  type NativeValueHold,
  type WorldState,
  type GodPersonEditorDraft,
  type AttributeDefinition,
} from '@open-legend/domain';
import type {
  CognitionLabActor,
  CognitionLabCategory,
  CognitionLabCurrent,
  CognitionLabCustomField,
  CognitionLabEdit,
  CognitionLabExpected,
  CognitionLabField,
  CognitionLabJson,
  CognitionLabPage,
  CognitionLabSource,
} from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, mayDiscloseSubject, type RequestScope } from './authority.js';
import { continuityView, projectKnowledgeNote } from './continuity-view.js';
import {
  CognitionLabRecords,
  labJson,
  type LabPageOptions,
  type LabRecord,
} from './cognition-lab-records.js';
import { labCustomFieldSchema } from './cognition-lab-contracts.js';
import { memoryHistory } from './memory-history.js';
import {
  godMemoryEdit,
  godPersonEditor,
  godWorldEvent,
  authoredHistory,
} from './person-editor-contracts.js';
import type { WorldService } from './world-service.js';

const identityFields = ['name', 'description', 'personality', 'backstory', 'traitIds'] as const;
const holdSchema = z
  .object({
    entityId: z.string().min(1),
    definition: z.custom<DefinitionPin>(isDefinitionPin),
    physicalLife: z.number().int().nonnegative(),
    value: z.number().finite(),
  })
  .strict();
const nativeToken = z
  .object({
    generation: z.string(),
    manifestRevision: z.number().int(),
    bodyPolicyPin: z
      .object({ id: z.string(), version: z.number(), digest: z.string() })
      .strict()
      .nullable(),
  })
  .strict();
type SourceBinding = {
  actorId: string;
  id: string;
  generation: string;
  kind: 'memory' | 'worldEvent';
};
export interface LabProjectionPage {
  query?: string;
  cursor?: string;
  limit?: number;
  fieldIds?: string[];
}

function knowledgeField(
  service: WorldService,
  actorId: string,
  note: ReturnType<typeof projectKnowledgeNote>,
): CognitionLabField {
  const unavailableReason =
    note.subjectKind === 'place'
      ? 'Place notes are read-only in this editor.'
      : note.subjectKind === 'map-marker' && !service.world.mapMarkers?.[actorId]?.[note.subjectId!]
        ? 'This map marker is no longer available.'
        : undefined;
  return {
    id: JSON.stringify(['knowledge', note.subjectId, note.subjectKind ?? null]),
    category: 'relations',
    label: note.label,
    datatype: 'text',
    meaning: 'narrative',
    value: note.text,
    multiline: true,
    editable: unavailableReason === undefined,
    ...(unavailableReason ? { unavailableReason } : {}),
    owner: 'knowledge',
    token: {
      worldId: service.world.id,
      generation: service.generation,
      actorId,
      subjectId: note.subjectId,
      ...(note.subjectKind ? { subjectKind: note.subjectKind } : {}),
      expectedRevision: note.revision,
    },
  };
}

/** Applied and restored experiment bindings use the same native identities and
 * human-private boundary. Model-only prose never supplies an entity or grant. */
export function labExperimentEntity(
  world: WorldState,
  id: string,
  authority: Pick<RequestScope, 'accountId' | 'actorId'>,
  person = false,
) {
  const value = entityGet(world.entities, id);
  if (!value || value.retirement || (person && !value.actor))
    throw new Error('The experiment refers to a person or object unavailable in this scenario.');
  if (
    !mayDiscloseSubject(world, id, (actorId) => {
      const actor = entityGet(world.entities, actorId)?.actor;
      const owner = world.authorship?.playerAccountIds[actorId];
      return (
        actor?.controller !== 'player' ||
        (actorId === authority.actorId && (!owner || owner === authority.accountId))
      );
    })
  )
    throw new AuthorityError('forbidden');
  return value;
}

export function validateLabCustomFieldBindings(
  fields: readonly CognitionLabCustomField[],
  world: WorldState,
  authority: Pick<RequestScope, 'accountId' | 'actorId'>,
): void {
  const ids = new Set<string>();
  for (const field of fields) {
    if (ids.has(field.id))
      throw new Error('The experiment contains duplicate model-only field identities.');
    ids.add(field.id);
    for (const id of field.recipientActorIds) labExperimentEntity(world, id, authority, true);
    if (field.subject.kind === 'person')
      labExperimentEntity(world, field.subject.actorId, authority, true);
    else if (field.subject.kind === 'relation') {
      labExperimentEntity(world, field.subject.fromActorId, authority, true);
      labExperimentEntity(world, field.subject.toActorId, authority, true);
    } else if (field.subject.kind === 'object')
      labExperimentEntity(world, field.subject.objectId, authority);
  }
}

/** Cursor summaries are selected before any selected source's full text is read. */
export function labPage<T extends { id: string; advanced?: boolean }>(
  values: Iterable<T>,
  options: LabProjectionPage = {},
): CognitionLabPage<T> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const query = options.query?.trim().toLocaleLowerCase();
  const key = (value: T) => `${value.advanced ? '1' : '0'}:${value.id}`;
  const rows: T[] = [];
  for (const value of values) {
    if (options.cursor && key(value) <= options.cursor) continue;
    if (query && !JSON.stringify(value).toLocaleLowerCase().includes(query)) continue;
    rows.push(value);
  }
  rows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return {
    items: rows.slice(0, limit),
    ...(rows.length > limit ? { nextCursor: key(rows[limit - 1]!) } : {}),
  };
}

/** Current editable projections compose native owners; they never become saved actor state. */
export class CognitionLabAuthoring {
  private readonly sources = new Map<string, SourceBinding>();
  constructor(
    readonly service: WorldService,
    readonly records: CognitionLabRecords,
    private readonly identity: () => CognitionLabExpected & { workspaceId: string },
  ) {}
  private async customRecord(fieldId: string): Promise<LabRecord | undefined> {
    const page = await this.records.pageRecords('customField', { sourceId: fieldId, limit: 1 });
    const id = page.items[0]?.id;
    return id ? this.records.getRecord(id, 'customField') : undefined;
  }
  private async publishCustomFields(
    changes: Array<{ before?: LabRecord; field?: CognitionLabCustomField }>,
    scope: RequestScope,
  ): Promise<void> {
    const checks = changes.map(({ before, field }) => {
      const old = before && labCustomFieldSchema.parse(before.data);
      return () => {
        this.service.assertScope(scope, 'create');
        // A shared field changes every recipient, even when opened through one
        // permitted NPC. Replacing recipients cannot shed an old private owner.
        for (const id of new Set([
          ...(old?.recipientActorIds ?? []),
          ...(field?.recipientActorIds ?? []),
        ]))
          if (!this.service.mayInspectPrivate(id, scope)) throw new AuthorityError('forbidden');
        if (field) validateLabCustomFieldBindings([field], this.service.world, scope);
      };
    });
    const current = () => {
      this.service.assertScope(scope, 'create');
      for (const check of checks) check();
    };
    current();
    if (changes.some((change) => !change.field)) {
      if (changes.length !== 1) throw new Error('Remove one model-only field at a time.');
      const before = changes[0]!.before;
      if (before) await this.records.removeRecord(before.id, current);
      return;
    }
    await this.records.putRecordBatch(
      changes.map(({ before, field }, index) => ({
        record: {
          id: before?.id ?? randomUUID(),
          kind: 'customField',
          sourceId: field!.id,
          name: field!.label,
          createdAt: before?.createdAt ?? new Date().toISOString(),
          summary: { datatype: field!.datatype },
          data: labJson(field!),
        },
        options: { recipientActorIds: field!.recipientActorIds, beforePublish: checks[index] },
      })),
      current,
    );
  }
  async setCustomField(field: CognitionLabCustomField, scope: RequestScope): Promise<void> {
    this.service.assertScope(scope, 'create');
    const parsed = labCustomFieldSchema.parse(field);
    await this.publishCustomFields(
      [{ before: await this.customRecord(parsed.id), field: parsed }],
      scope,
    );
  }
  async removeCustomField(fieldId: string, scope: RequestScope): Promise<void> {
    this.service.assertScope(scope, 'create');
    await this.publishCustomFields([{ before: await this.customRecord(fieldId) }], scope);
  }
  snapshotHolds(): import('./cognition-lab-records.js').LabJson[] {
    return this.service.nativeValueHolds.map(labJson);
  }
  validateHolds(
    values: readonly import('./cognition-lab-records.js').LabJson[],
    world: WorldState = this.service.world,
  ): readonly NativeValueHold[] {
    return validateNativeValueHolds(world, z.array(holdSchema).parse(values));
  }
  restoreHolds(
    values: readonly import('./cognition-lab-records.js').LabJson[],
    scope: RequestScope,
  ): void {
    this.service.setNativeValueHolds(this.validateHolds(values), scope);
  }
  private assertActor(actorId: string, scope: RequestScope) {
    this.service.assertScope(scope, 'inspect');
    if (!this.service.mayInspectPrivate(actorId, scope)) throw new AuthorityError('forbidden');
    const actor = entityGet(this.service.world.entities, actorId);
    if (!actor?.actor) throw new Error('Choose an available person.');
    return actor;
  }
  actors(
    scope: RequestScope,
    options: LabProjectionPage & { id?: string } = {},
  ): CognitionLabPage<CognitionLabActor> {
    this.service.assertScope(scope, 'inspect');
    const service = this.service;
    function* rows() {
      for (const entity of options.id
        ? [entityGet(service.world.entities, options.id)]
        : entityValues(service.world.entities)) {
        if (!entity) continue;
        if (!entity.actor || entity.retirement || (options.id && entity.id !== options.id))
          continue;
        if (!service.mayInspectPrivate(entity.id, scope)) continue;
        yield {
          id: entity.id,
          name: entity.name,
          kind: entity.kind,
          description: entity.actor.description,
          participation: entity.actor.participation?.phase,
          controlled: entity.id === scope.actorId,
          canAuthor: service.currentScope(scope, 'create'),
        };
      }
    }
    return labPage(rows(), options);
  }
  private customField(row: import('./cognition-lab-records.js').LabRecord): CognitionLabField {
    const field = labCustomFieldSchema.parse(row.data);
    return {
      id: JSON.stringify(['custom', row.id]),
      category: 'custom',
      label: field.label,
      datatype: field.datatype,
      meaning: 'modelOnly',
      value: field.value,
      description: field.description,
      editable: true,
      owner: 'custom',
      token: { recordId: row.id, fieldId: field.id },
      minimum: field.minimum,
      maximum: field.maximum,
      unit: field.unit,
      holdable: false,
      holdUnavailableReason: 'Model-only context stays applied until you edit or remove it.',
    };
  }
  private source(binding: SourceBinding): string {
    for (const [id, prior] of this.sources)
      if (JSON.stringify(prior) === JSON.stringify(binding)) return id;
    const id = randomUUID();
    this.sources.set(id, binding);
    if (this.sources.size > 1000) this.sources.delete(this.sources.keys().next().value!);
    return id;
  }
  async current(
    actorId: string,
    category: CognitionLabCategory,
    options: LabProjectionPage,
    scope: RequestScope,
  ): Promise<CognitionLabCurrent> {
    const entity = this.assertActor(actorId, scope),
      service = this.service;
    const expected = this.identity(),
      generation = service.generation;
    const token = labJson({
      generation,
      manifestRevision: service.world.moduleManifest.revision,
      bodyPolicyPin: service.world.moduleManifest.bodyPolicyPin,
    });
    const fields: CognitionLabField[] = [];
    const create: CognitionLabField[] = [];
    const person = (keys: readonly (keyof GodPersonEditorDraft)[]) =>
      service.personEditorFields(actorId, scope, keys);
    const native = (
      key: keyof GodPersonEditorDraft,
      value: unknown,
      label: string,
      datatype: CognitionLabField['datatype'] = 'text',
    ) =>
      fields.push({
        id: `person.${key}`,
        category: key === 'inventory' ? 'possessions' : key === 'goals' ? 'work' : 'person',
        label,
        datatype,
        meaning: 'native',
        value: labJson(value),
        editable: service.currentScope(scope, 'create'),
        owner: 'person',
        token,
        ...(datatype === 'text' && key !== 'name' ? { multiline: true } : {}),
      });
    const currentAction = (id: string): CognitionLabField => ({
      id,
      label: 'Current action',
      datatype: 'json',
      meaning: 'derived',
      value: labJson(entity.actor!.action ?? null),
      ...(!entity.actor!.action ? { preview: 'No action in progress' } : {}),
      editable: false,
    });
    let page: CognitionLabPage<CognitionLabField>;
    if (category === 'history') {
      const before = options.cursor
        ? z.number().finite().nonnegative().parse(Number(options.cursor))
        : undefined;
      const history = await service.worldEventsEditor(before, scope);
      page = {
        items: history.events
          .filter(
            (entry) =>
              !options.query ||
              `${entry.type} ${entry.text}`.toLowerCase().includes(options.query.toLowerCase()),
          )
          .map((entry) => ({
            id: JSON.stringify(['event', entry.id]),
            category: 'history',
            label: entry.type,
            datatype: 'json',
            meaning: 'native',
            value: null,
            preview: entry.text.slice(0, 240),
            editable: true,
            owner: 'worldEvent',
            token: { entryId: entry.id, hash: entry.hash, generation },
            detail: {
              kind: 'source',
              id: this.source({ actorId, id: entry.id, generation, kind: 'worldEvent' }),
            },
            description:
              'Only text correction or deletion is supported. The native history owner updates affected perspectives and derived memories.',
          })),
        ...(history.before !== undefined ? { nextCursor: String(history.before) } : {}),
      };
      create.push({
        id: 'create.event',
        category: 'history',
        label: 'Add historical event',
        datatype: 'json',
        meaning: 'narrative',
        value: null,
        initialValue: labJson({
          kind: 'event',
          event: { type: 'authored-event', text: '', at: service.world.simTime },
          perspectives: [],
        }),
        editable: true,
        owner: 'worldEvent',
        token: { generation, insert: true },
        description:
          'Declare the past event and each actual observer’s perspective. An empty observer list grants nobody a memory. This does not replay mechanical effects.',
      });
    } else if (category === 'memories') {
      const history = await memoryHistory(service, actorId, scope, {
        ...options,
        thoughts: false,
        limit: options.limit ?? 50,
      });
      page = {
        items: history.entries.map((entry) => ({
          id: JSON.stringify([entry.sourceKind, entry.id]),
          label: entry.sourceKind,
          datatype: 'json',
          meaning: 'native',
          value: null,
          preview: entry.text.slice(0, 240),
          editable: service.currentScope(scope, 'create'),
          owner: 'memory',
          token: { entryId: `${entry.sourceKind}:${entry.id}`, generation },
          detail: {
            kind: 'source',
            id: this.source({
              actorId,
              id: `${entry.sourceKind}:${entry.id}`,
              kind: 'memory',
              generation,
            }),
          },
        })),
        ...(history.next ? { nextCursor: history.next } : {}),
      };
      create.push({
        id: 'create.memory',
        category: 'memories',
        label: 'Add personal memory',
        datatype: 'json',
        meaning: 'narrative',
        value: null,
        initialValue: labJson({
          kind: 'memory',
          actorId,
          memory: {
            kind: 'episode',
            source: 'internal',
            summary: '',
            at: service.world.simTime,
            importance: 5,
            entityIds: [],
          },
        }),
        editable: true,
        owner: 'memory',
        token: { generation, insert: true },
        description: 'Explicit authored history for this person. Other people do not acquire it.',
      });
    } else if (category === 'custom') {
      const saved = await this.records.pageRecords('customField', {
        search: options.query,
        cursor: options.cursor,
        limit: options.limit,
        recipientActorId: actorId,
      });
      const rows = await this.records.recordData(saved.items.map((row) => row.id));
      page = { items: rows.map((row) => this.customField(row)), nextCursor: saved.nextCursor };
    } else {
      switch (category) {
        case 'person': {
          const selected = identityFields.filter(
            (key) => !options.fieldIds || options.fieldIds.includes(`person.${key}`),
          );
          const draft = person(selected);
          for (const key of selected)
            native(
              key,
              draft[key],
              {
                name: 'Name',
                description: 'Description',
                personality: 'Personality',
                backstory: 'Backstory',
                traitIds: 'Installed traits',
              }[key],
              key === 'traitIds' ? 'json' : 'text',
            );
          const traits = fields.find((field) => field.id === 'person.traitIds');
          if (traits)
            traits.options = godAuthoringCatalogue(service.world, entity.id).traits.map(
              (trait) => ({
                id: trait.id,
                label: trait.name,
              }),
            );
          break;
        }
        case 'body': {
          const selectedIds = options.fieldIds?.flatMap((id) => {
            try {
              const key: unknown = JSON.parse(id);
              return Array.isArray(key) &&
                ['meter', 'attributeDefinition', 'initializeAttribute'].includes(String(key[0])) &&
                typeof key[1] === 'string'
                ? [key[1]]
                : [];
            } catch {
              return [];
            }
          });
          for (const meter of projectAttributes(service.world, entity, 'owner', selectedIds)) {
            const definition = attributeDefinition(service.world, meter.id)!;
            const sparse = ['attributes', 'practice'].includes(
              HOST_IMPLEMENTATIONS[definition.implementation].storage,
            );
            fields.push({
              id: JSON.stringify(['meter', meter.id]),
              label: meter.name,
              category: 'body',
              datatype: typeof meter.value === 'number' ? 'meter' : 'choice',
              meaning: 'native',
              value: meter.value,
              description: meter.meaning,
              editable: meter.status === 'known',
              owner: sparse ? 'attribute' : 'person',
              token: sparse
                ? labJson({
                    generation,
                    manifestRevision: service.world.moduleManifest.revision,
                    expectedRevision: meter.revision,
                  })
                : token,
              unit: meter.unit,
              minimum: meter.min,
              maximum: meter.max,
              ...(definition.schema.kind === 'category'
                ? { options: definition.schema.choices.map((id) => ({ id, label: id })) }
                : {}),
              holdable: nativeValueHoldSupported(service.world, actorId, meter.id),
              held: service.nativeValueHolds.some(
                (hold) => hold.entityId === actorId && hold.definition.id === meter.id,
              ),
              holdUnavailableReason: nativeValueHoldSupported(service.world, actorId, meter.id)
                ? undefined
                : 'This native owner does not support a hold for health, reservoirs, practice or derived values.',
              unavailableReason:
                meter.status === 'unknown' ? 'The native value is unknown.' : undefined,
            });
          }
          for (const definition of selectedIds
            ? selectedIds.flatMap((id) => {
                const definition = attributeDefinition(service.world, id);
                return definition ? [definition] : [];
              })
            : service.world.moduleManifest.definitions) {
            if (
              !['attributes', 'practice'].includes(
                HOST_IMPLEMENTATIONS[definition.implementation].storage,
              )
            )
              continue;
            fields.push({
              id: JSON.stringify(['attributeDefinition', definition.id]),
              advanced: true,
              category: 'body',
              label: `${definition.name} definition`,
              datatype: 'json',
              meaning: 'native',
              value: labJson(definition),
              editable: true,
              owner: 'attribute',
              applyGroup: `definition:${definition.id}`,
              token: {
                generation,
                manifestRevision: service.world.moduleManifest.revision,
                declaration: true,
              },
              description:
                'The native installation owner permits supported presentation revisions. Increment version by one; mechanics and existing state remain protected. Apply null to remove an unused definition.',
            });
            if (
              !entity.actor!.attributes?.[definition.id] &&
              !entity.actor!.practice?.[definition.id]
            )
              create.push({
                id: JSON.stringify(['initializeAttribute', definition.id]),
                category: 'body',
                label: `Initialize ${definition.name}`,
                datatype: definition.schema.kind === 'number' ? 'number' : 'choice',
                meaning: 'native',
                value: null,
                initialValue: definition.schema.initial,
                editable: true,
                owner: 'attribute',
                token: {
                  generation,
                  manifestRevision: service.world.moduleManifest.revision,
                  expectedRevision: null,
                },
                ...(definition.schema.kind === 'number'
                  ? {
                      minimum: definition.schema.min,
                      maximum: definition.schema.max,
                      unit: definition.schema.unit,
                    }
                  : { options: definition.schema.choices.map((id) => ({ id, label: id })) }),
              });
          }
          if (!selectedIds) {
            const sample = service.world.moduleManifest.definitions.find(
              (definition) =>
                HOST_IMPLEMENTATIONS[definition.implementation].storage === 'attributes',
            );
            if (sample)
              create.push({
                id: 'create.attributeDefinition',
                advanced: true,
                category: 'body',
                label: 'Install native attribute definition',
                datatype: 'json',
                meaning: 'native',
                value: null,
                initialValue: labJson({
                  id: 'experiment:attribute',
                  version: 1,
                  implementation: 'number-v1',
                  name: 'Experimental attribute',
                  disclosure: 'owner',
                  presentation: sample.presentation,
                  schema: { kind: 'number', min: 0, max: 100, initial: 0, unit: '' },
                }),
                editable: true,
                owner: 'attribute',
                applyGroup: 'installDefinition',
                token: {
                  generation,
                  manifestRevision: service.world.moduleManifest.revision,
                  declaration: true,
                },
                description:
                  'Installs an actual supported native definition through ordinary declaration admission. Initialize its actor value separately. This differs from model-only context.',
              });
          }
          break;
        }
        case 'feelings':
        case 'relations': {
          const view = continuityView(service, actorId, scope, options.cursor);
          for (const appraisal of view.continuity?.appraisals ?? [])
            fields.push({
              id: JSON.stringify(['appraisal', appraisal.id]),
              label: appraisal.label,
              datatype: 'json',
              meaning: 'native',
              value: labJson(appraisal),
              editable: true,
              owner: 'appraisal',
              category: 'feelings',
              token: labJson({
                worldId: service.world.id,
                generation,
                epoch: view.continuity?.authoring?.epoch,
                actorId,
                id: appraisal.id,
                expectedRevision: appraisal.revision,
              }),
              description:
                'Private native appraisal. Apply null to resolve it through its owner; arbitrary JSON cannot rewrite a feeling.',
            });
          for (const note of view.notepads ?? [])
            fields.push(knowledgeField(service, actorId, note));
          for (const policy of view.continuity?.authoring?.policies ?? [])
            create.push({
              id: JSON.stringify(['createAppraisal', policy.pin.id]),
              category: 'feelings',
              label: `Author ${policy.label}`,
              datatype: 'json',
              meaning: 'native',
              value: null,
              initialValue: { definitionPin: policy.pin, targetId: null },
              editable: true,
              owner: 'appraisal',
              token: labJson({
                worldId: service.world.id,
                generation,
                epoch: view.continuity!.authoring!.epoch,
                actorId,
                insert: true,
              }),
              description:
                'A private authored feeling. Choose a subject already known by this person, or null.',
            });
          create.push({
            id: 'create.recognition',
            category: 'relations',
            label: 'Add authored acquaintance',
            datatype: 'reference',
            meaning: 'narrative',
            value: null,
            initialValue: '',
            editable: true,
            owner: 'knowledge',
            choiceSource: 'recognition',
            token: {
              generation,
              expectedRevision: service.world.knowledgeRevisions?.[actorId] ?? 0,
            },
            description:
              'Bind who this person already knows. This grants recognition without inventing an encounter or shared memory.',
          });
          page = {
            items: fields.filter(
              (field) =>
                !options.query ||
                JSON.stringify(field).toLowerCase().includes(options.query.toLowerCase()),
            ),
            ...(view.continuity?.cursor ? { nextCursor: view.continuity.cursor } : {}),
          };
          break;
        }
        case 'work':
          if (!options.fieldIds || options.fieldIds.includes('person.goals'))
            native('goals', person(['goals']).goals ?? [], 'Goals', 'json');
          fields.push({
            ...currentAction('currentAction'),
            description: 'The native action owner controls progress and completion.',
          });
          break;
        case 'possessions':
          native('inventory', person(['inventory']).inventory ?? [], 'Possessions', 'json');
          break;
        case 'surroundings':
          for (const other of options.fieldIds
            ? options.fieldIds.flatMap((id) => {
                const selected = entityGet(service.world.entities, id);
                return selected ? [selected] : [];
              })
            : entityValues(service.world.entities)) {
            if (other.retirement || !other.placement || other.id === actorId) continue;
            if (
              !mayDiscloseSubject(service.world, other.id, (id) =>
                service.mayInspectPrivate(id, scope),
              )
            )
              continue;
            fields.push({
              id: other.id,
              label: other.name,
              datatype: 'json',
              meaning: 'native',
              value: labJson({ kind: other.kind, placement: other.placement }),
              editable: false,
              description:
                'Scenario truth. This projection does not grant the character perception or knowledge.',
            });
          }
          break;
        case 'overview': {
          const current = person(['name', 'description']);
          fields.push({
            id: 'identity',
            label: String(current.name),
            datatype: 'text',
            meaning: 'native',
            value: current.description ?? '',
            editable: false,
          });
          fields.push({
            id: 'life',
            label: 'Condition',
            datatype: 'text',
            meaning: 'derived',
            value: entity.actor!.alive
              ? entity.actor!.incapacitated
                ? 'Incapacitated'
                : 'Alive'
              : 'Dead',
            editable: false,
          });
          for (const effect of projectStatusEffects(service.world, entity, 'owner'))
            fields.push({
              id: effect.id,
              label: effect.label,
              datatype: 'text',
              meaning: 'derived',
              value: effect.label,
              editable: false,
            });
          fields.push(currentAction('action'));
          break;
        }
      }
      if (category !== 'feelings' && category !== 'relations') page = labPage(fields, options);
    }
    this.assertActor(actorId, scope);
    if (generation !== service.generation)
      throw new Error('The scenario changed. Refresh this category.');
    const result = this.projection(actorId, category, expected, page!);
    for (const field of create) field.applyGroup ??= field.id;
    result.create = create;
    for (const field of result.fields.items)
      if (field.owner === 'appraisal') field.applyGroup = field.id;
    for (const field of result.fields.items) {
      field.category ??= category;
      field.holdable ??= false;
      if (!field.holdable)
        field.holdUnavailableReason ??=
          field.meaning === 'derived'
            ? 'A derived consequence follows its native causes.'
            : 'This owner does not support holding this field.';
    }
    if (category === 'overview' && options.fieldIds?.length)
      await this.addPinnedFields(result, actorId, options.fieldIds, scope);
    return result;
  }
  private projection(
    actorId: string,
    category: CognitionLabCategory,
    expected: CognitionLabExpected & { workspaceId: string },
    fields: CognitionLabPage<CognitionLabField>,
  ): CognitionLabCurrent {
    return {
      ok: true,
      ...expected,
      worldId: this.service.world.id,
      timeline: this.service.timelineId,
      nativeRevision: this.service.durabilityTicket(),
      actorId,
      category,
      fields,
    };
  }
  private async addPinnedFields(
    result: CognitionLabCurrent,
    actorId: string,
    requested: string[],
    scope: RequestScope,
  ) {
    const ids = z.array(z.string().min(1).max(2048)).max(100).parse(requested);
    if (new Set(ids).size !== ids.length) throw new Error('Choose each pinned field once.');
    const wanted = new Set(ids),
      existing = new Set(result.fields.items.map((field) => field.id));
    const categories = new Set<CognitionLabCategory>(),
      customIds: string[] = [];
    for (const id of ids) {
      if (id === 'currentAction') categories.add('work');
      else if (id === 'create.memory') categories.add('memories');
      else if (id === 'create.event') categories.add('history');
      else if (id === 'create.recognition') categories.add('relations');
      else if (id === 'create.attributeDefinition') categories.add('body');
      else if (id.startsWith('person.'))
        categories.add(
          id === 'person.inventory' ? 'possessions' : id === 'person.goals' ? 'work' : 'person',
        );
      else {
        let key: unknown;
        try {
          key = JSON.parse(id);
        } catch {
          if (entityGet(this.service.world.entities, id)) categories.add('surroundings');
          continue;
        }
        if (!Array.isArray(key)) continue;
        if (['meter', 'attributeDefinition', 'initializeAttribute'].includes(key[0]))
          categories.add('body');
        else if (key[0] === 'createAppraisal') categories.add('feelings');
        else if (key[0] === 'custom' && typeof key[1] === 'string') customIds.push(key[1]);
        else if (
          ['event', 'awareness', 'memory', 'summary'].includes(key[0]) &&
          typeof key[1] === 'string'
        ) {
          const event = key[0] === 'event';
          const entryId = event ? key[1] : `${key[0]}:${key[1]}`;
          // Exact selected native reads preserve cold-history eligibility and privacy; a
          // pin never scans earlier pages to discover the source again.
          const source = event
            ? await this.service.worldEventJson(entryId, scope)
            : await this.service.personMemoryJson(actorId, entryId, scope);
          if (!source.ok || !('json' in source)) continue;
          const entry = JSON.parse(source.json) as Record<string, unknown>;
          const preview =
            typeof entry['text'] === 'string'
              ? entry['text']
              : typeof entry['summary'] === 'string'
                ? entry['summary']
                : 'Full source available';
          result.fields.items.push({
            id,
            category: event ? 'history' : 'memories',
            label: event && typeof entry['type'] === 'string' ? entry['type'] : String(key[0]),
            datatype: 'json',
            meaning: 'native',
            value: null,
            preview: preview.slice(0, 240),
            editable: this.service.currentScope(scope, 'create'),
            owner: event ? 'worldEvent' : 'memory',
            token: { entryId, hash: source.hash, generation: this.service.generation },
            detail: {
              kind: 'source',
              id: this.source({
                actorId,
                id: entryId,
                generation: this.service.generation,
                kind: event ? 'worldEvent' : 'memory',
              }),
            },
            holdable: false,
            holdUnavailableReason: 'This historical source follows its native correction owner.',
          });
          existing.add(id);
        } else if (key[0] === 'appraisal' && typeof key[1] === 'string') {
          const appraisal = appraisalById(this.service.world, actorId, key[1]);
          if (appraisal)
            result.fields.items.push({
              id,
              category: 'feelings',
              label:
                appraisalDefinition(this.service.world, appraisal.definitionPin)?.label ??
                appraisal.definitionPin.id,
              datatype: 'json',
              meaning: 'native',
              value: labJson(appraisal),
              editable: true,
              owner: 'appraisal',
              applyGroup: id,
              token: {
                worldId: this.service.world.id,
                generation: this.service.generation,
                epoch: this.service.commandEpoch,
                actorId,
                id: appraisal.id,
                expectedRevision: appraisal.revision,
              },
              holdable: false,
              holdUnavailableReason:
                'This appraisal follows its installed lifetime; its owner does not support a hold.',
            });
        } else if (
          key.length === 3 &&
          key[0] === 'knowledge' &&
          (key[1] === null || typeof key[1] === 'string') &&
          (key[2] === null || key[2] === 'place' || key[2] === 'map-marker')
        ) {
          const subjectKind = key[2] === null ? undefined : key[2];
          const note = knowledgeDocument(this.service.world, actorId, key[1], subjectKind);
          if (
            note ||
            (subjectKind === undefined &&
              key[1] !== null &&
              canRememberSubject(this.service.world, actorId, key[1]))
          )
            result.fields.items.push(
              knowledgeField(
                this.service,
                actorId,
                projectKnowledgeNote(this.service.world, actorId, note, key[1]),
              ),
            );
        }
      }
    }
    for (const category of categories) {
      const selected = await this.current(
        actorId,
        category,
        {
          limit: 100,
          ...(ids.includes('create.attributeDefinition') && category === 'body'
            ? {}
            : { fieldIds: ids }),
        },
        scope,
      );
      for (const field of selected.fields.items)
        if (wanted.has(field.id) && !existing.has(field.id)) {
          existing.add(field.id);
          result.fields.items.push(field);
        }
      for (const field of selected.create ?? [])
        if (wanted.has(field.id)) (result.create ??= []).push(field);
    }
    for (const row of await this.records.recordData(customIds)) {
      if (row.kind !== 'customField') continue;
      const definition = labCustomFieldSchema.parse(row.data);
      if (!definition.recipientActorIds.includes(actorId)) continue;
      const field = this.customField(row);
      if (!existing.has(field.id)) {
        existing.add(field.id);
        result.fields.items.push(field);
      }
    }
    this.assertActor(actorId, scope);
    if (result.runtimeGeneration !== this.identity().runtimeGeneration)
      throw new Error('The scenario changed. Refresh pinned fields.');
  }
  choices(
    actorId: string,
    fieldId: string,
    options: LabProjectionPage,
    scope: RequestScope,
  ): CognitionLabPage<{ id: string; label: string }> {
    this.assertActor(actorId, scope);
    const world = this.service.world;
    if (fieldId === 'person.inventory')
      return labPage(
        Object.keys(world.itemDefinitions).map((id) => ({
          id,
          label: world.itemDefinitions[id]!.name,
        })),
        options,
      );
    const page = this.actors(scope, options);
    return {
      ...page,
      items: page.items.map((actor) => ({
        id: actor.id,
        label: actor.name,
      })),
    };
  }
  async readSource(id: string, scope: RequestScope): Promise<CognitionLabSource> {
    const binding = this.sources.get(id);
    if (!binding || binding.generation !== this.service.generation)
      throw new Error('This current source changed. Reopen its category.');
    this.assertActor(binding.actorId, scope);
    const value =
      binding.kind === 'worldEvent'
        ? await this.service.worldEventJson(binding.id, scope)
        : await this.service.personMemoryJson(binding.actorId, binding.id, scope);
    this.assertActor(binding.actorId, scope);
    if (!value.ok || !('json' in value)) throw new Error(value.message);
    if (binding.generation !== this.service.generation)
      throw new Error('The scenario changed. Reopen this source.');
    return {
      id,
      label: binding.id,
      scope: 'current',
      actorId: binding.actorId,
      content: labJson({
        entry: JSON.parse(value.json),
        hash: value.hash,
        entryId: binding.id,
        ...(binding.kind === 'worldEvent' ? { eventId: binding.id } : {}),
        generation: binding.generation,
      }),
    };
  }
  async apply(edits: CognitionLabEdit[], scope: RequestScope) {
    if (edits.length > 100 || new Set(edits.map((edit) => edit.fieldId)).size !== edits.length)
      throw new Error('Apply at most 100 distinct fields together.');
    const first = edits[0];
    if (!first?.actorId) throw new Error('Select the person whose fields you are applying.');
    if (edits.some((edit) => edit.actorId !== first.actorId || edit.owner !== first.owner))
      throw new Error('Apply one named owner and person at a time; other drafts remain unchanged.');
    this.assertActor(first.actorId, scope);
    this.service.assertScope(scope, 'create');
    if (first.owner !== 'attribute' && edits.some((edit) => edit.hold))
      throw new Error('This native owner does not yet support value holds.');
    if (first.fieldId === 'create.memory' || first.fieldId === 'create.event') {
      if (edits.length !== 1 || first.baseValue !== null)
        throw new Error('Apply one new historical source at a time.');
      const token = z
        .object({ generation: z.string(), insert: z.literal(true) })
        .strict()
        .parse(first.token);
      const history = authoredHistory.parse(first.value);
      if (
        (history.kind === 'memory' &&
          (first.owner !== 'memory' || history.actorId !== first.actorId)) ||
        (history.kind === 'event' && first.owner !== 'worldEvent')
      )
        throw new Error('The historical source belongs to a different owner.');
      return this.service.authorHistory({ generation: token.generation, history }, scope);
    }
    if (first.owner === 'custom') {
      const records = await this.records.recordData(
        edits.map(
          (edit) =>
            z.object({ recordId: z.string(), fieldId: z.string() }).strict().parse(edit.token)
              .recordId,
        ),
      );
      if (records.length !== edits.length)
        throw new Error('A model-only field was removed. Refresh before applying.');
      const changed = edits.map((edit, index) => {
        const record = records[index]!;
        const field = labCustomFieldSchema.parse(record.data);
        if (
          record.kind !== 'customField' ||
          JSON.stringify(['custom', record.id]) !== edit.fieldId ||
          !field.recipientActorIds.includes(first.actorId!) ||
          JSON.stringify(field.value) !== JSON.stringify(edit.baseValue)
        )
          throw new Error('A model-only field changed. Refresh and review this draft.');
        return { record, field: labCustomFieldSchema.parse({ ...field, value: edit.value }) };
      });
      await this.publishCustomFields(
        changed.map(({ record, field }) => ({ before: record, field })),
        scope,
      );
      return { ok: true, message: 'Model-only values applied. Native mechanics are unchanged.' };
    }
    if (first.owner === 'attribute') {
      if (
        first.fieldId === 'create.attributeDefinition' ||
        first.fieldId.startsWith('["attributeDefinition",')
      ) {
        if (edits.length !== 1) throw new Error('Apply one installed definition at a time.');
        if (first.hold) throw new Error('A declaration is not a native value and cannot be held.');
        const token = z
          .object({
            generation: z.string(),
            manifestRevision: z.number().int(),
            declaration: z.literal(true),
          })
          .strict()
          .parse(first.token);
        const definition =
          first.value === null
            ? undefined
            : (z.record(z.string(), z.json()).parse(first.value) as unknown as AttributeDefinition);
        const removeId =
          first.value === null
            ? z
                .tuple([z.literal('attributeDefinition'), z.string()])
                .parse(JSON.parse(first.fieldId))[1]
            : undefined;
        return this.service.godAttributeDeclaration(
          {
            id: randomUUID(),
            expectedManifestRevision: token.manifestRevision,
            ...(definition ? { definition } : { removeId }),
          },
          token.generation,
          scope,
        );
      }
      const parsed = edits.map((edit) => ({
        edit,
        token: z
          .object({
            generation: z.string(),
            manifestRevision: z.number().int(),
            expectedRevision: z.number().int().nonnegative().nullable(),
          })
          .strict()
          .parse(edit.token),
        field: z
          .tuple([z.enum(['meter', 'initializeAttribute']), z.string()])
          .parse(JSON.parse(edit.fieldId)),
      }));
      const token = parsed[0]!.token;
      if (
        parsed.some(
          (row) =>
            row.token.generation !== token.generation ||
            row.token.manifestRevision !== token.manifestRevision,
        )
      )
        throw new Error('The installed attributes changed. Refresh before applying.');
      return this.service.godAttributeEdit(
        {
          id: randomUUID(),
          actorId: first.actorId,
          expectedManifestRevision: token.manifestRevision,
          changes: parsed.map(({ edit, token, field }) => ({
            attributeId: field[1],
            expectedRevision: token.expectedRevision,
            value: z.union([z.number().finite(), z.string()]).parse(edit.value),
          })),
        },
        token.generation,
        scope,
        parsed
          .filter(({ edit }) => edit.hold !== undefined)
          .map(({ edit, field }) => ({ attributeId: field[1], held: edit.hold! })),
      );
    }
    if (first.owner === 'appraisal' && edits.length === 1) {
      const token = z
        .object({
          worldId: z.string(),
          generation: z.string(),
          epoch: z.string(),
          actorId: z.string(),
          insert: z.boolean().optional(),
          id: z.string().optional(),
          expectedRevision: z.number().int().optional(),
        })
        .strict()
        .parse(first.token);
      if (token.actorId !== first.actorId) throw new Error('Select this feeling’s owner.');
      const change = token.insert
        ? {
            kind: 'create' as const,
            ...z
              .object({
                definitionPin: z
                  .object({
                    id: z.string(),
                    version: z.number().int().positive(),
                    digest: z.string(),
                  })
                  .strict(),
                targetId: z.string().nullable(),
              })
              .strict()
              .parse(first.value),
          }
        : {
            kind: 'resolve' as const,
            id: z.string().parse(token.id),
            expectedRevision: z.number().int().positive().parse(token.expectedRevision),
          };
      if (!token.insert && first.value !== null)
        throw new Error(
          'Apply null to resolve this appraisal. Its native owner preserves the original evidence.',
        );
      return this.service.authorCharacterAppraisal(
        {
          id: randomUUID(),
          worldId: token.worldId,
          generation: token.generation,
          epoch: token.epoch,
          actorId: first.actorId,
          change,
        },
        scope,
      );
    }
    if (first.owner === 'worldEvent') {
      const changes = edits.map((edit) => {
        const token = z
          .object({ entryId: z.string(), hash: z.string(), generation: z.string() })
          .passthrough()
          .parse(edit.token);
        if (token.generation !== this.service.generation)
          throw new Error('The scenario changed. Reopen the historical event.');
        return {
          id: token.entryId,
          expectedHash: token.hash,
          replacement: edit.value === null ? null : godWorldEvent.parse(edit.value),
        };
      });
      return this.service.saveWorldEventsEditor(changes, scope);
    }
    if (first.owner === 'person' || first.owner === 'memory') {
      const base = this.service.personEditorFields(first.actorId, scope);
      const person = structuredClone(base),
        memories: Parameters<WorldService['savePersonEditor']>[3] = [];
      let token: z.infer<typeof nativeToken> | undefined;
      for (const edit of edits) {
        if (edit.owner === 'person') {
          token = nativeToken.parse(edit.token);
          if (edit.fieldId.startsWith('person.')) {
            const key = edit.fieldId.slice(7);
            if (!Object.hasOwn(godPersonEditor.shape, key))
              throw new Error('This person field is unavailable.');
            const values = { ...person, [key]: edit.value },
              bases = { ...base, [key]: edit.baseValue };
            Object.assign(person, godPersonEditor.parse(values));
            Object.assign(base, godPersonEditor.parse(bases));
          } else {
            const [kind, id] = z
              .tuple([z.literal('meter'), z.string()])
              .parse(JSON.parse(edit.fieldId));
            void kind;
            if (!Object.hasOwn(person.meters, id))
              throw new Error('This native meter is unavailable.');
            person.meters[id] = z.number().finite().parse(edit.value);
            base.meters[id] = z.number().finite().parse(edit.baseValue);
          }
        } else {
          const evidence = z
            .object({ entryId: z.string(), hash: z.string(), generation: z.string() })
            .passthrough()
            .parse(edit.token);
          if (evidence.generation !== this.service.generation)
            throw new Error('The memory belongs to a replaced scene.');
          memories.push({
            entryId: evidence.entryId,
            expectedHash: evidence.hash,
            replacement:
              edit.value === null
                ? null
                : godMemoryEdit.parse({
                    source: evidence.entryId.slice(0, evidence.entryId.indexOf(':')),
                    value: edit.value,
                  }),
          });
        }
      }
      token ??= {
        generation: this.service.generation,
        manifestRevision: this.service.world.moduleManifest.revision,
        bodyPolicyPin: this.service.world.moduleManifest.bodyPolicyPin,
      };
      return this.service.savePersonEditor(first.actorId, base, person, memories, token, scope);
    }
    if (first.owner === 'knowledge' && edits.length === 1) {
      if (first.fieldId === 'create.recognition') {
        const token = z
          .object({ generation: z.string(), expectedRevision: z.number().int().nonnegative() })
          .strict()
          .parse(first.token);
        return this.service.authorRecognition(
          { ...token, actorId: first.actorId, subjectId: z.string().parse(first.value) },
          scope,
        );
      }
      const token = z
        .object({
          worldId: z.string(),
          generation: z.string(),
          actorId: z.string(),
          subjectId: z.string().nullable(),
          subjectKind: z.enum(['place', 'map-marker']).optional(),
          expectedRevision: z.number().int().nonnegative(),
        })
        .strict()
        .parse(first.token);
      return this.service.editCharacterKnowledge(
        { ...token, text: z.string().parse(first.value) },
        scope,
        'creator',
      );
    }
    throw new Error(
      'This field needs its supported native authoring form. It has not been changed.',
    );
  }
}
