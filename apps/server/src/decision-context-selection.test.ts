import { describe, expect, it } from 'vitest';
import { WORK_LIMITS } from '@open-legend/domain';
import {
  composeDecisionRequirements,
  contextUnitKey,
  DecisionContextSelectionError,
  DecisionPreparationWork,
  finalizeDecisionRequest,
  orderDecisionContextRoots,
  selectDecisionContext,
  type ContextUnit,
} from './decision-context-selection.js';

const scope = {
  worldId: 'world',
  actorId: 'person',
  generation: 'timeline',
  decisionId: 'turn',
  sourceTime: 5,
};
const unit = (
  id: string,
  bytes = 1,
  extra: Partial<ContextUnit<string>> = {},
): ContextUnit<string> => ({
  key: id,
  family: 'evidence',
  source: { id, revision: 'r', view: 'personal' },
  dependencies: [],
  requiredReasons: [],
  coverage: 'complete',
  bytes,
  value: id,
  ...extra,
});
const relevant = (id: string, bytes: number, rank: number, dependencies: string[] = []) =>
  unit(id, bytes, { dependencies, relevance: { source: 'recall', order: rank, rank } });

describe('complete decision context selection', () => {
  it('unions owner requirements and preserves complete source namespaces', () => {
    const key = contextUnitKey(scope, { family: 'evidence', id: 'a:b', revision: 'c' });
    expect(key).not.toBe(contextUnitKey(scope, { family: 'evidence', id: 'a', revision: 'b:c' }));
    expect(key).not.toBe(contextUnitKey(scope, { family: 'work', id: 'a:b', revision: 'c' }));
    const requirements = composeDecisionRequirements('What happened?', [
      { requiredRoots: new Map([[key, ['trigger']]]), queryCues: [], enabledSemantics: ['act'] },
      {
        requiredRoots: new Map([[key, ['outcome']]]),
        queryCues: [],
        enabledSemantics: ['talk', 'act'],
      },
    ]);
    expect(requirements.requiredRoots.get(key)).toEqual(['trigger', 'outcome']);
    expect(requirements.enabledSemantics).toEqual(['act', 'talk']);
  });

  it('counts shared support once and continues after a nonfitting optional root', () => {
    const result = selectDecisionContext({
      units: [
        unit('source', 3),
        relevant('too-large', 20, 3, ['source']),
        relevant('a', 2, 2, ['source']),
        relevant('b', 2, 1, ['source']),
      ],
      maxBytes: 7,
      basis: 'shared-rank',
    });
    expect(result.units.map((entry) => entry.key).sort()).toEqual(['a', 'b', 'source']);
    expect(result.bytes).toBe(7);
    expect(result.omitted.get('too-large')).toBe('size');
  });

  it('refuses missing required meaning but preserves unrelated optional roots', () => {
    expect(() =>
      selectDecisionContext({
        units: [
          unit('answer', 1, {
            requiredReasons: ['current question'],
            dependencies: ['missing utterance'],
          }),
        ],
        maxBytes: 10,
        basis: 'source-local',
      }),
    ).toThrow(DecisionContextSelectionError);
    const selected = selectDecisionContext({
      units: [relevant('dependent', 1, 2, ['missing']), relevant('independent', 1, 1)],
      maxBytes: 10,
      basis: 'shared-rank',
    });
    expect(selected.roots).toEqual(['independent']);
    expect(selected.omitted.get('dependent')).toBe('unavailable');
    expect(selected.optionalCoverage).toBe('unavailable');
  });

  it('handles cycles and chains beyond native call depth without recursion', () => {
    const units = Array.from({ length: 100 }, (_, index) =>
      unit(`s${index}`, 1, {
        dependencies: [`s${(index + 1) % 100}`],
        ...(index === 0 ? { requiredReasons: ['bound work'] } : {}),
      }),
    );
    const result = selectDecisionContext({ units, maxBytes: 100, basis: 'source-local' });
    expect(result.units).toHaveLength(100);
    expect(result.bytes).toBe(100);
  });

  it('preserves local relevance order independently of source completion order', () => {
    const a = unit('a', 1, { relevance: { source: 'first', order: 0 } });
    const b = unit('b', 1, { relevance: { source: 'first', order: 1 } });
    const c = unit('c', 1, { relevance: { source: 'second', order: 0 } });
    const order = (values: ContextUnit<string>[]) =>
      orderDecisionContextRoots(values, 'source-local').map((entry) => entry.key);
    expect(order([a, b, c])).toEqual(order([c, b, a]));
    expect(order([a, b, c]).indexOf('a')).toBeLessThan(order([a, b, c]).indexOf('b'));
  });

  it('does not call an uncertain upper estimate a measured overflow', () => {
    const result = selectDecisionContext({
      units: [{ ...relevant('bounded', 20, 1), minimumBytes: 2 }],
      maxBytes: 10,
      basis: 'shared-rank',
    });
    expect(result.omitted.get('bounded')).toBe('preparation');
    expect(result.optionalCoverage).toBe('unavailable');
    const accumulated = selectDecisionContext({
      units: [
        { ...relevant('first', 9, 2), minimumBytes: 1 },
        { ...relevant('next', 9, 1), minimumBytes: 2 },
      ],
      maxBytes: 10,
      basis: 'shared-rank',
    });
    // Earlier admitted upper bounds are not actual consumed bytes either.
    expect(accumulated.omitted.get('next')).toBe('preparation');
    for (const minimumBytes of [2, 20]) {
      let failure: unknown;
      try {
        selectDecisionContext({
          units: [unit('required', 20, { minimumBytes, requiredReasons: ['cause'] })],
          maxBytes: 10,
          basis: 'source-local',
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toMatchObject({
        code: minimumBytes === 2 ? 'required-context-unavailable' : 'required-context-overflow',
      });
    }
  });

  it('optional exhaustion retains required meaning and reserved completion', () => {
    const work = new DecisionPreparationWork({ ...WORK_LIMITS.group, tests: 3 });
    work.reserveCompletion({ tests: 1 });
    const result = selectDecisionContext({
      units: [
        unit('required', 1, { requiredReasons: ['identity'] }),
        relevant('optional', 1, 1, ['dependency']),
        unit('dependency'),
      ],
      maxBytes: 10,
      basis: 'shared-rank',
      work,
    });
    expect(result.units.map((entry) => entry.key)).toEqual(['required']);
    expect(result.optionalCoverage).toBe('unavailable');
    expect(() => work.finish(() => work.charge({ tests: 1 }))).not.toThrow();
  });

  it('captures the final schema, source cut and references independently of caller mutation', () => {
    const schema = { type: 'object', properties: { answer: { type: 'string' } } };
    const references = { abcd: 'person' };
    const captured = finalizeDecisionRequest({
      scope,
      context: 'A complete account.',
      instructions: 'Choose.',
      schema,
      sourceKeys: ['source'],
      references,
    });
    schema.properties.answer.type = 'number';
    references.abcd = 'someone else';
    expect(captured.schema).toMatchObject({ properties: { answer: { type: 'string' } } });
    expect(captured.references.abcd).toBe('person');
    expect(captured.bytes.schema).toBe(Buffer.byteLength(JSON.stringify(captured.schema)));
  });
});
