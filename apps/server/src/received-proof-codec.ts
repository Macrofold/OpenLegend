import type {
  EvidenceSource,
  ObservationFactKey,
  ObserverLife,
  ReceivedBinding,
  ReceivedFacetProof,
  TemporalFacetReference,
} from '@open-legend/domain';
import { validateEvidenceSource } from '@open-legend/domain';

/** A record-local encoding, never another evidence owner. Native consumers see
 * the exact original proofs after decoding. See the batch design sections 3/5. */
export interface ReceivedProofOwner extends ObserverLife {
  epoch?: string;
}
type Source = [
  family: EvidenceSource['family'],
  id: string,
  revision: string | number,
  observer?: [actorId: string, physicalLife: number],
];
type Fact = [source: number, ordinal: number];
type Proof = [
  original: Fact,
  confirmation: number,
  from: number,
  through: number,
  aliases?: string[],
];
export interface ReceivedProofTable {
  sources: Source[];
  proofs: Proof[];
}
type Facet = Omit<
  TemporalFacetReference,
  'original' | 'receivedFrom' | 'support' | 'detailSupport'
> & {
  original?: Fact;
  receivedFrom?: number;
  support?: number;
  detailSupport?: Omit<NonNullable<TemporalFacetReference['detailSupport']>, 'proof'> & {
    proof: number;
  };
};
export type EncodedReceivedBinding = Omit<ReceivedBinding, 'seed' | 'parts'> & {
  seed: Omit<ReceivedBinding['seed'], 'actorId' | 'physicalLife' | 'epoch'> & { epoch?: string };
  parts: Array<Omit<ReceivedBinding['parts'][number], 'facet'> & { facet: Facet }>;
};

export function receivedProofEncoder(owner: ReceivedProofOwner) {
  const table: ReceivedProofTable = { sources: [], proofs: [] },
    sources = new Map<string, number>(),
    proofs = new Map<string, number>();
  const source = (value: EvidenceSource): number => {
    const encoded: Source = [value.family, value.id, value.revision];
    if (
      value.observer.actorId !== owner.actorId ||
      value.observer.physicalLife !== owner.physicalLife
    )
      encoded.push([value.observer.actorId, value.observer.physicalLife]);
    const key = JSON.stringify(encoded),
      prior = sources.get(key);
    if (prior !== undefined) return prior;
    const index = table.sources.length;
    sources.set(key, index);
    table.sources.push(encoded);
    return index;
  };
  const fact = (value: ObservationFactKey): Fact => [source(value.source), value.ordinal];
  const proof = (value: ReceivedFacetProof): number => {
    const encoded: Proof = [
      fact(value.original),
      source(value.confirmation),
      value.confirmedFrom,
      value.confirmedThrough,
    ];
    if (value.aliases) encoded.push(value.aliases);
    const key = JSON.stringify(encoded),
      prior = proofs.get(key);
    if (prior !== undefined) return prior;
    const index = table.proofs.length;
    proofs.set(key, index);
    table.proofs.push(encoded);
    return index;
  };
  const facet = (value: TemporalFacetReference): Facet => {
    const { original, receivedFrom, support, detailSupport, ...fields } = value;
    return {
      ...fields,
      ...(original ? { original: fact(original) } : {}),
      ...(receivedFrom ? { receivedFrom: source(receivedFrom) } : {}),
      ...(support ? { support: proof(support) } : {}),
      ...(detailSupport
        ? { detailSupport: { ...detailSupport, proof: proof(detailSupport.proof) } }
        : {}),
    };
  };
  const binding = (value: ReceivedBinding): EncodedReceivedBinding => {
    const { actorId, physicalLife, epoch, ...seed } = value.seed;
    if (actorId !== owner.actorId || physicalLife !== owner.physicalLife)
      throw new Error('A received binding cannot inherit another observer.');
    return {
      ...value,
      seed: { ...seed, ...(epoch === owner.epoch ? {} : { epoch }) },
      parts: value.parts.map((part) => ({ ...part, facet: facet(part.facet) })),
    };
  };
  return { table, binding };
}

const ordinal = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function observer(value: unknown): value is ObserverLife {
  return (
    object(value) &&
    Object.keys(value).every((key) => key === 'actorId' || key === 'physicalLife') &&
    typeof value['actorId'] === 'string' &&
    !!value['actorId'] &&
    ordinal(value['physicalLife'])
  );
}

/** Resolve only the typed codec references here. Complete semantic validation
 * remains at the existing native current-format boundary after reconstruction. */
export function receivedProofDecoder(input: unknown, owner: ReceivedProofOwner) {
  if (
    !object(input) ||
    Object.keys(input).some((key) => key !== 'sources' && key !== 'proofs') ||
    !Array.isArray(input['sources']) ||
    !Array.isArray(input['proofs']) ||
    !observer({ actorId: owner.actorId, physicalLife: owner.physicalLife })
  )
    throw new Error('Invalid received proof table.');
  const rawSources: unknown[] = input['sources'],
    rawProofs: unknown[] = input['proofs'],
    sources = new Map<number, EvidenceSource>(),
    proofs = new Map<number, ReceivedFacetProof>();
  const source = (index: number): EvidenceSource => {
    if (!ordinal(index) || index >= rawSources.length)
      throw new Error('Invalid received source reference.');
    const prior = sources.get(index);
    if (prior) return prior;
    const row = rawSources[index];
    if (
      !Array.isArray(row) ||
      (row.length !== 3 && row.length !== 4) ||
      typeof row[1] !== 'string' ||
      !row[1]
    )
      throw new Error('Invalid received source descriptor.');
    let subject: ObserverLife = { actorId: owner.actorId, physicalLife: owner.physicalLife };
    if (row.length === 4) {
      const saved = row[3];
      if (!Array.isArray(saved) || saved.length !== 2)
        throw new Error('Invalid received source observer.');
      const value = { actorId: saved[0], physicalLife: saved[1] };
      if (!observer(value)) throw new Error('Invalid received source observer.');
      subject = value;
    }
    // The existing source owner validates family-specific revision semantics.
    // The cast describes this untrusted boundary, never validation by itself.
    const value = {
      family: row[0],
      id: row[1],
      revision: row[2],
      observer: subject,
    } as EvidenceSource;
    validateEvidenceSource(value);
    sources.set(index, value);
    return value;
  };
  const fact = (value: unknown): ObservationFactKey => {
    if (!Array.isArray(value) || value.length !== 2 || !ordinal(value[1]))
      throw new Error('Invalid received fact reference.');
    return { source: source(value[0]), ordinal: value[1] };
  };
  const proof = (index: number): ReceivedFacetProof => {
    if (!ordinal(index) || index >= rawProofs.length)
      throw new Error('Invalid received proof reference.');
    const prior = proofs.get(index);
    if (prior) return prior;
    const row = rawProofs[index];
    if (
      !Array.isArray(row) ||
      (row.length !== 4 && row.length !== 5) ||
      typeof row[2] !== 'number' ||
      !Number.isFinite(row[2]) ||
      typeof row[3] !== 'number' ||
      !Number.isFinite(row[3]) ||
      (row.length === 5 &&
        (!Array.isArray(row[4]) || row[4].some((alias: unknown) => typeof alias !== 'string')))
    )
      throw new Error('Invalid received proof descriptor.');
    const value = {
      original: fact(row[0]),
      confirmation: source(row[1]),
      confirmedFrom: row[2],
      confirmedThrough: row[3],
      ...(row.length === 5 ? { aliases: row[4] as string[] } : {}),
    };
    proofs.set(index, value);
    return value;
  };
  const facet = (value: Facet): TemporalFacetReference => {
    const { original, receivedFrom, support, detailSupport, ...fields } = value;
    return {
      ...fields,
      ...(original !== undefined ? { original: fact(original) } : {}),
      ...(receivedFrom !== undefined ? { receivedFrom: source(receivedFrom) } : {}),
      ...(support !== undefined ? { support: proof(support) } : {}),
      ...(detailSupport
        ? { detailSupport: { ...detailSupport, proof: proof(detailSupport.proof) } }
        : {}),
    };
  };
  const binding = (value: EncodedReceivedBinding): ReceivedBinding => {
    if (
      !value ||
      !object(value.seed) ||
      Object.hasOwn(value.seed, 'actorId') ||
      Object.hasOwn(value.seed, 'physicalLife') ||
      !Array.isArray(value.parts)
    )
      throw new Error('Invalid received binding encoding.');
    const { epoch = owner.epoch, ...seed } = value.seed;
    if (typeof epoch !== 'string' || !epoch) throw new Error('Missing received binding epoch.');
    return {
      ...value,
      seed: { ...seed, actorId: owner.actorId, physicalLife: owner.physicalLife, epoch },
      parts: value.parts.map((part) => ({ ...part, facet: facet(part.facet) })),
    };
  };
  const finish = () => {
    if (sources.size !== rawSources.length || proofs.size !== rawProofs.length)
      throw new Error('Unused received proof descriptors.');
  };
  return { binding, finish };
}
