import {
  observationDependencies,
  observationLearningSources,
  ownedObservationSources,
  recognitionSupportSources,
  type ExperienceEntry,
  type ObservationContribution,
  type PersonalSourceRef,
} from '@open-legend/domain';

/** Small exact dependency projection, owned by the canonical personal record.
 * It is not a recalled body or a new grant. Keep the same native/personal
 * distinctions as MemoryRepository.writeSources. */
export interface AccountRetentionMetadata {
  aliases: string[];
  versions: PersonalSourceRef[];
  learning: Array<{ kind: PersonalSourceRef['kind']; id: string }>;
}

export function accountObservationInputs(entry: ExperienceEntry): {
  originals: ObservationContribution[];
  learning: ReturnType<typeof recognitionSupportSources>;
} {
  const value = entry.value;
  const manifest = 'manifest' in value ? value.manifest : undefined;
  const evidence = entry.source === 'memory' ? entry.value.evidence : undefined;
  const originals =
    entry.source === 'summary'
      ? entry.value.manifest.observations
      : [
          ...(entry.value.observation ? [entry.value.observation] : []),
          ...(entry.value.observations ?? []),
          ...(evidence?.observation ? [evidence.observation] : []),
          ...(evidence?.observations ?? []),
          ...(manifest?.observations ?? []),
        ];
  const recognition =
    entry.source === 'memory'
      ? evidence?.recognition
      : entry.source === 'awareness'
        ? entry.value.recognition
        : undefined;
  return {
    originals,
    learning: [
      ...recognitionSupportSources(recognition?.learningSupport ?? []),
      ...observationLearningSources(originals),
    ],
  };
}

export function accountRetentionMetadata(entry: ExperienceEntry): AccountRetentionMetadata {
  if (entry.source === 'memory' && entry.value.kind === 'impression')
    return { aliases: [], versions: [], learning: [] };
  const { originals, learning } = accountObservationInputs(entry);
  const aliases = new Set<string>();
  const versions = new Map<string, PersonalSourceRef>();
  const add = (source: PersonalSourceRef) => {
    aliases.add(source.id);
    versions.set(JSON.stringify([source.kind, source.id, source.revision]), source);
  };
  const manifest = 'manifest' in entry.value ? entry.value.manifest : undefined;
  for (const source of manifest?.coverage ?? []) add(source);
  for (const group of manifest?.speech ?? []) for (const source of group.sources) add(source);
  if (entry.source === 'summary') {
    for (const source of entry.value.sources) add(source);
    for (const dependency of observationDependencies(originals)) {
      aliases.add(dependency.source.id);
      for (const alias of dependency.aliases) aliases.add(alias);
    }
  } else {
    for (const source of ownedObservationSources(originals)) aliases.add(source.id);
  }
  for (const source of learning) aliases.add(source.id);
  return {
    aliases: [...aliases],
    versions: [...versions.values()],
    learning: learning.flatMap((source) =>
      'kind' in source ? [{ kind: source.kind, id: source.id }] : [],
    ),
  };
}
