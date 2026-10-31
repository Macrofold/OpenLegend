/** Discovery is derived from already permitted sources, never a second biography
 * or a request to resolve a referent from hidden world state.
 * docs/technical/situation-aware-cognition-context.md#conversational-discovery-cues */
export interface RecallDiscoveryCues {
  /** Complete attributed sources, in their existing chronological order. */
  lines: readonly string[];
  /** Real admitted consumer question; never an inferred scene or preferred answer. */
  question?: string;
  partial: boolean;
}

export const MEMORY_QUERY_BYTES = 8000;

export function recallQueries(input: {
  stimulus: string;
  goal: string;
  aboutMe?: string;
  discovery?: RecallDiscoveryCues;
}) {
  const question = input.discovery?.question;
  const base = `${question ? `Decision question: ${question}\n` : ''}${input.stimulus}\nMy current goal: ${input.goal}`;
  const lines = input.discovery?.lines ?? [];
  const baseBytes = Buffer.byteLength(base);
  if (baseBytes > MEMORY_QUERY_BYTES)
    return {
      lexical: undefined,
      lexicalSources: undefined,
      semantic: undefined,
      coverage: 'unavailable' as const,
      includedSources: 0,
      omittedSources: lines.length,
      identityIncluded: false,
    };

  const heading = '\nPersonally experienced conversation (chronological):\n';
  const selected: string[] = [];
  let bytes = baseBytes + Buffer.byteLength(heading);
  // Reuse the conversation owner's suffix priority. Never cut a quotation or
  // skip an intervening turn to pretend the resulting exchange is continuous.
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index]!;
    const added = Buffer.byteLength(line) + (selected.length ? 1 : 0);
    if (bytes + added > MEMORY_QUERY_BYTES) break;
    selected.push(line);
    bytes += added;
  }
  selected.reverse();
  const lexical = selected.length ? `${base}${heading}${selected.join('\n')}` : base;
  // Persona words must not dominate lexical source matching. Semantic discovery
  // retains the accepted profile only as a complete optional cue after discourse.
  const identity = input.aboutMe ? `\nAbout me:\n${input.aboutMe}` : '';
  const identityIncluded =
    !!identity && Buffer.byteLength(lexical) + Buffer.byteLength(identity) <= MEMORY_QUERY_BYTES;
  return {
    lexical,
    // Keep each complete cue independently meaningful. Flattening unrelated turns
    // into one term set dilutes a specific match in the indexed lexical rank.
    lexicalSources: [
      ...(question ? [question] : []),
      input.stimulus,
      ...(input.goal ? [input.goal] : []),
      ...selected,
    ],
    semantic: identityIncluded ? `${lexical}${identity}` : lexical,
    coverage:
      input.discovery?.partial || selected.length < lines.length
        ? ('partial' as const)
        : ('complete' as const),
    includedSources: selected.length,
    omittedSources: lines.length - selected.length,
    identityIncluded,
  };
}
