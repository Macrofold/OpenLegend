import type { CatalogueAction } from '@open-legend/protocol';

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
  ];
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
      .join(' · ') ||
    facts.find(([label]) =>
      ['Work', 'Requirements', 'Attack', 'Approach', 'Equipment'].includes(label),
    )?.[1]
  );
}
