import { expect, it } from 'vitest';
import type { CatalogueAction } from '@open-legend/protocol';
import { filterActions } from './action-browser.js';

it('searches every entry and includes unavailable matches only under the saved preference', () => {
  const options: CatalogueAction[] = Array.from({ length: 80 }, (_, index) => ({
    id: `fixture-${index}`,
    label: `Fixture tool ${index}`,
    category: 'Create',
    description: 'Test fixture action.',
    keywords: index === 79 ? ['weave cord'] : [],
    enabled: index % 2 === 0,
    intent: { kind: 'unavailable' },
  }));
  expect(filterActions(options, '', false)).toHaveLength(40);
  expect(filterActions(options, 'weave', false)).toEqual([]);
  expect(filterActions(options, 'CORD weave', true).map((action) => action.id)).toEqual([
    'fixture-79',
  ]);
  const all = filterActions(options, 'fixture', true);
  expect(all).toHaveLength(80);
  expect(all.slice(0, 40).every((action) => action.enabled)).toBe(true);
  expect(all.slice(40).every((action) => !action.enabled)).toBe(true);
});
