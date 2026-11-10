import { canonicalJson, subjectKey, type ObserverSubject } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type {
  NativeNpcBindingSelection,
  NativeNpcEntityOrdinal,
  NativeNpcSubjectOrdinal,
} from './native-npc-sources.js';
import type { CapturedSituation } from './situation-context.js';
import type { CurrentMemorySource } from './memory-repository.js';
import type { NativeFormattedNpcOffer } from './native-npc-candidates.js';
import type { nativeResponseReferences } from './native-response-context.js';
import { nativeReceiptLocator } from './native-temporal-context.js';

/** The request owner chooses spellings and exact ordinals. Only the consumed
 * native read can turn those selections into permissions or executable work. */
export function nativeResponseSelection(input: {
  original: NativeNpcCapture;
  current: NativeNpcCapture;
  validity: NativeNpcBindingSelection['validity'];
  purpose: 'decision' | 'reflection';
  consumer: 'chat' | 'thought' | 'reflection';
  references: ReturnType<typeof nativeResponseReferences>;
  knowledge: Readonly<Record<string, ObserverSubject>>;
  situation: CapturedSituation;
  sources: readonly CurrentMemorySource[];
  actions: readonly Pick<NativeFormattedNpcOffer, 'id' | 'ordinal'>[];
  actionSource: 'original' | 'current';
  prototypeSource: 'original' | 'current';
  perspectives: NativeNpcBindingSelection['perspectives'];
  semanticCauses: readonly number[];
  intents: readonly { id: string; ordinal: number }[];
  appraisals: NativeNpcBindingSelection['appraisals'];
  receivedBodies?: ReadonlySet<string>;
}): NativeNpcBindingSelection {
  const { original, current, situation } = input;
  const metadata = current.facts.referenceFacts;
  const personal = original
    .sources()
    .flatMap((source, inventory) =>
      source.personal.map((record, ordinal) => ({ inventory, ordinal, record })),
    );
  const entity = (id: string, alias: string): NativeNpcEntityOrdinal => {
    if (input.receivedBodies?.has(alias)) {
      const ordinal = original.facts.perception.bodies.findIndex((body) => body.sourceId === id);
      if (ordinal < 0) throw new Error('The expanded body has no originating native grant.');
      return { kind: 'received-body', ordinal };
    }
    if (id === current.facts.self.actorId) return { kind: 'myself' };
    const body = current.facts.perception.bodies.findIndex((body) => body.sourceId === id);
    if (body >= 0) return { kind: 'body', ordinal: body };
    for (const kind of ['knowledge', 'social'] as const) {
      const ordinal = metadata[kind].findIndex(
        (fact) =>
          fact.canAddressRemembered &&
          fact.subject.kind === 'entity' &&
          fact.subject.entityId === id,
      );
      if (ordinal >= 0) return { kind, ordinal };
    }
    for (const source of personal) {
      const index = source.record.attribution.entitySubjects.findIndex(
        (fact) => fact.subject.kind === 'entity' && fact.subject.entityId === id,
      );
      if (index >= 0)
        return {
          kind: 'personal',
          inventory: source.inventory,
          ordinal: source.ordinal,
          entity: index,
        };
    }
    throw new Error('The native response reference has no acquired entity source.');
  };
  const subject = (value: ObserverSubject, alias: string): NativeNpcSubjectOrdinal => {
    const key = subjectKey(value);
    if (input.receivedBodies?.has(alias)) {
      const id = input.references.entityReferences[alias];
      const ordinal = original.facts.perception.bodies.findIndex((body) => body.sourceId === id);
      const body = original.facts.referenceFacts.bodies.find((body) => body.ordinal === ordinal);
      if (body?.subject && subjectKey(body.subject.subject) === key)
        return { kind: 'received-body', ordinal };
      const index = body?.subjects.findIndex((fact) => subjectKey(fact.subject) === key) ?? -1;
      if (index >= 0) return { kind: 'received-body-subject', ordinal, subject: index };
      if (
        body?.entity.identityPresent &&
        !body.entity.seedOnly &&
        body.entity.canAddressRemembered &&
        subjectKey(body.entity.subject) === key
      )
        return { kind: 'received-body-entity', ordinal };
      throw new Error('The expanded identity has no originating native subject.');
    }
    if (subjectKey(metadata.myself.subject) === key) return { kind: 'myself' };
    for (const body of metadata.bodies) {
      if (body.subject && subjectKey(body.subject.subject) === key)
        return { kind: 'body', ordinal: body.ordinal };
      const index = body.subjects.findIndex((fact) => subjectKey(fact.subject) === key);
      if (index >= 0) return { kind: 'body-subject', ordinal: body.ordinal, subject: index };
      if (
        body.entity.identityPresent &&
        !body.entity.seedOnly &&
        body.entity.canAddressRemembered &&
        subjectKey(body.entity.subject) === key
      )
        return { kind: 'body-entity', ordinal: body.ordinal };
    }
    for (const kind of ['knowledge', 'social'] as const) {
      const ordinal = metadata[kind].findIndex((fact) => subjectKey(fact.subject) === key);
      if (ordinal >= 0) return { kind, ordinal };
    }
    const record = current.facts.self.mind.records.findIndex(
      (record) => record.subjectId && subjectKey(record.subjectId) === key,
    );
    if (record >= 0) return { kind: 'mind-record', ordinal: record };
    for (const source of personal) {
      const index = source.record.attribution.subjects.findIndex(
        (fact) => subjectKey(fact.subject) === key,
      );
      if (index >= 0)
        return {
          kind: 'personal',
          inventory: source.inventory,
          ordinal: source.ordinal,
          subject: index,
        };
    }
    for (const body of original.facts.referenceFacts.bodies) {
      if (
        body.entity.identityPresent &&
        !body.entity.seedOnly &&
        body.entity.canAddressRemembered &&
        subjectKey(body.entity.subject) === key
      )
        return { kind: 'received-body-entity', ordinal: body.ordinal };
    }
    throw new Error('The native response reference has no acquired subject source.');
  };
  const evidence = input.sources.flatMap((source) => {
    if (source.receipt) return [];
    const found = personal.find(
      ({ record }) =>
        record.reference.kind === source.sourceKind &&
        record.reference.id === source.id &&
        record.reference.revision === source.revision,
    );
    if (!found) throw new Error('Included personal evidence has no native admitted body.');
    return [{ inventory: found.inventory, ordinal: found.ordinal }];
  });
  const acquired = original.facts.perception.cut.acquired;
  const currentFacets = original.facts.perception.cut.current;
  const observations = Object.entries(situation.observationReferences).map(
    ([alias, observation]) => {
      const ordinal = acquired.findIndex(
        (value) =>
          value.id === observation.id &&
          value.revision === observation.revision &&
          canonicalJson(value) === canonicalJson(observation),
      );
      if (ordinal >= 0) return { alias, source: { kind: 'acquired' as const, ordinal } };
      for (const source of personal) {
        const index = source.record.originals.findIndex(
          (value) => value.id === observation.id && value.revision === observation.revision,
        );
        if (index >= 0)
          return {
            alias,
            source: {
              kind: 'personal' as const,
              inventory: source.inventory,
              ordinal: source.ordinal,
              observation: index,
            },
          };
      }
      throw new Error('Included observation has no native captured source.');
    },
  );
  const received = Object.entries(situation.currentReferences).map(([alias, facet]) => {
    const ordinal = currentFacets.findIndex(
      (value) =>
        value.id === facet.id && canonicalJson(value.original) === canonicalJson(facet.original),
    );
    if (ordinal < 0) throw new Error('Included current evidence has no native captured facet.');
    return { alias, ordinal };
  });
  const receipts = Object.entries(situation.receiptDetails).map(([alias, selection]) => {
    for (const [inventory, sources] of original.sources().entries()) {
      const ordinal = sources.receipts.findIndex(
        (value) =>
          canonicalJson(nativeReceiptLocator(value.receipt)) ===
            canonicalJson(nativeReceiptLocator(selection.receipt)) &&
          canonicalJson(value.receipt.facets) === canonicalJson(selection.receipt.facets) &&
          canonicalJson(value.values) === canonicalJson(selection.values),
      );
      if (ordinal >= 0) return { alias, inventory, ordinal };
    }
    throw new Error('Included history has no native admitted receipt.');
  });
  const presentations = original.facts.perception.npcCurrent.attention.presentations;
  const presentation = (key: string) => {
    const ordinal = presentations.findIndex((value) => value.key === key);
    if (ordinal < 0) throw new Error('Included attention has no native captured presentation.');
    return ordinal;
  };
  return {
    validity: input.validity,
    actions: input.actions.map(({ id: alias, ordinal }) => ({
      alias,
      ordinal,
      source: input.actionSource,
    })),
    prototypeSource: input.prototypeSource,
    perspectives: input.perspectives,
    semanticCauses: input.semanticCauses,
    purpose: input.purpose,
    consumer: input.consumer,
    intents: input.intents.map(({ id: alias, ordinal }) => ({ alias, ordinal })),
    evidence,
    entities: Object.entries(input.references.entityReferences).map(([alias, id]) => ({
      alias,
      source: entity(id, alias),
    })),
    identities: Object.entries(input.references.identityReferences).map(([alias, value]) => ({
      alias,
      source: subject(value, alias),
    })),
    knowledge: Object.entries(input.knowledge).map(([alias, value]) => ({
      alias,
      source: subject(value, alias),
    })),
    observations,
    current: received,
    receipts,
    attention: Object.entries(situation.attentionReferences).map(([alias, key]) => ({
      alias,
      ordinal: presentation(key),
    })),
    presented: situation.presented.map((value) => presentation(value.key)),
    appraisals: input.appraisals,
  };
}
