import { STIMULUS_POLICY } from '@open-legend/domain';
import { digest } from './content-digest.js';
import type { AttentionCandidate } from './recall.js';

/** These are received presentation facts, not a physical entity lookup. */
export function formatEntityRecallCandidate(read: {
  readonly id: string;
  readonly description: string;
  readonly relativeLocation: string | undefined;
  readonly acquiredAt: number;
  readonly outward: readonly string[];
}): AttentionCandidate {
  const embeddingText = read.description.replace(/ \(ID:[a-f0-9]+\)/g, '');
  return {
    id: `entity:${read.id}`,
    kind: 'entity',
    text: `${read.description} ${read.relativeLocation}`,
    embeddingText,
    revision: digest(embeddingText),
    required: false,
    automatic: false,
    entityIds: [read.id],
    at: read.acquiredAt,
    // Ongoing outward states rank optional attention; they do not force a
    // character to consider them or provide evidence for mechanical effects.
    salience:
      3 +
      Math.max(
        0,
        ...read.outward.map(
          (state) =>
            Object.entries(STIMULUS_POLICY.salience).find(([name]) => name === state)?.[1] ?? 0,
        ),
      ),
  };
}
