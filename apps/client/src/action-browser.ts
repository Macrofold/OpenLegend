import type { CatalogueAction, EntityView } from '@open-legend/protocol';

/** Long-lived inspectors refresh when permitted choices change, not for every
 * walking position, animation, distance label or remaining-time update. The
 * current projection already owns native eligibility; the client adds no rules. */
export function actionSubjectKey(subject: EntityView | undefined): string {
  const choice = (action: EntityView['actions'][number]) => [
    action.id,
    action.command,
    action.enabled,
  ];
  return (
    JSON.stringify(
      subject && [
        subject.kind,
        subject.bodyState,
        subject.bodyRevision,
        subject.health,
        subject.quantity,
        subject.storage?.revision,
        subject.canTalk,
        subject.statusEffects?.map((effect) => effect.id),
        subject.actions.map(choice),
        subject.equippedAction && choice(subject.equippedAction),
      ],
    ) ?? ''
  );
}

/** Text search always visits the entire permitted catalogue, including unavailable
 * rows only when the profile preference allows them. No top-k or paid search. */
export function filterActions(
  actions: CatalogueAction[],
  query: string,
  showUnavailable: boolean,
): CatalogueAction[] {
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return actions.filter((action) => {
    if (!showUnavailable && !action.enabled) return false;
    if (!words.length) return true;
    const identity =
      action.facts
        ?.filter(([label]) => label === 'Tool' || label === 'Target')
        .map(([, value]) => value) ?? [];
    const text = [
      action.label,
      action.description,
      action.category,
      ...action.keywords,
      ...identity,
    ]
      .join(' ')
      .normalize('NFKC')
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Refresh updates existing identities in place; newly discovered choices follow them. */
export function retainActionOrder(previous: CatalogueAction[], next: CatalogueAction[]) {
  const remaining = new Map(next.map((action) => [action.id, action]));
  const retained = previous.flatMap((action) => {
    const current = remaining.get(action.id);
    remaining.delete(action.id);
    return current ? [current] : [];
  });
  return [
    ...retained,
    ...[...remaining.values()].sort(
      (a, b) =>
        Number(b.enabled) - Number(a.enabled) ||
        a.category.localeCompare(b.category) ||
        a.label.localeCompare(b.label) ||
        a.id.localeCompare(b.id),
    ),
  ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/** Keep still-offered suggestions in their exact slots while the bar owns input.
 * A retired choice takes a new candidate without moving its surviving neighbors. */
export function retainSuggestionSlots(
  previous: readonly (string | undefined)[],
  candidates: readonly string[],
  offered: ReadonlySet<string>,
): (string | undefined)[] {
  if (!previous.length) return [...candidates];
  const slots = previous.map((id) => (id && offered.has(id) ? id : undefined));
  const retained = new Set(slots);
  const remaining = candidates.filter((id) => !retained.has(id));
  for (let index = 0; index < slots.length; index++)
    if (!slots[index]) slots[index] = remaining.shift();
  // Empty slots preserve the centered bar's width until interaction ends.
  return slots;
}

/** Supplied category labels organize exact choices without inventing a second taxonomy. */
export function actionSections(actions: CatalogueAction[], categories: string[]) {
  const sections = new Map<string, { all: CatalogueAction[]; individual: CatalogueAction[] }>();
  for (const action of actions) {
    let section = sections.get(action.category);
    if (!section) {
      section = { all: [], individual: [] };
      sections.set(action.category, section);
    }
    const takeAll =
      action.intent.kind === 'command' &&
      action.intent.command.type === 'pickup' &&
      !action.intent.command.itemId;
    (takeAll ? section.all : section.individual).push(action);
  }
  for (const category of categories)
    if (!sections.has(category)) sections.set(category, { all: [], individual: [] });
  return [...sections].map(([category, section]) => ({
    category,
    actions: section.all.length ? [...section.all, ...section.individual] : section.individual,
  }));
}

export function actionCommitment(action: CatalogueAction): string | undefined {
  if (!action.enabled) return action.reason ?? 'Unavailable right now.';
  const facts = action.facts ?? [];
  const cost = ['Costs', 'Cost', 'Ammunition', 'Food']
    .flatMap((key) => facts.filter(([label]) => label === key))
    .at(0);
  const time = facts.find(([label]) => label === 'Time');
  return (
    [cost, time]
      .filter((fact) => !!fact)
      .map(([label, value]) => `${label}: ${value}`)
      .join('; ') ||
    facts.find(([label]) =>
      ['Work', 'Requirements', 'Attack', 'Approach', 'Equipment'].includes(label),
    )?.[1]
  );
}
