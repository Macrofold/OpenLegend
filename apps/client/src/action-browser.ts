import type { CatalogueAction } from '@open-legend/protocol';

/** Text search always visits the entire permitted catalogue, including unavailable
 * rows only when the profile preference allows them. No top-k or paid search. */
export function filterActions(
  actions: CatalogueAction[],
  query: string,
  showUnavailable: boolean,
  targetId?: string,
): CatalogueAction[] {
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return actions
    .filter((action) => {
      if (!showUnavailable && !action.enabled) return false;
      const text = [action.label, action.category, ...action.keywords]
        .join(' ')
        .normalize('NFKC')
        .toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(
      (a, b) =>
        Number(b.enabled) - Number(a.enabled) ||
        Number(b.targetId === targetId && !!targetId) -
          Number(a.targetId === targetId && !!targetId) ||
        a.label.localeCompare(b.label) ||
        a.id.localeCompare(b.id),
    );
}
