import { describe, expect, it } from 'vitest';
import {
  armById,
  outputTokens,
  reservationForInputUsd,
  reservationUsd,
} from '../scripts/decision-benchmark/arms.js';

describe('benchmark request reservations', () => {
  it('funds the escaped native chat body for a dense quotation-heavy archive', () => {
    const arm = armById.get('meta/muse-spark-1.3-contributor')!;
    const input = {
      instructions: 'Use only the supplied evidence. Return the requested JSON.',
      input: {
        memories: Array.from({ length: 512 }, (_, i) => ({
          id: `memory-${i}`,
          text: 'She said "keep the label \\ intact".\nThe correction was witnessed.',
        })),
      },
      schema: { type: 'object', properties: { answer: { type: 'string' } } },
    };
    const native = {
      model: arm.model,
      messages: [
        { role: 'system', content: input.instructions },
        { role: 'user', content: JSON.stringify(input.input) },
      ],
      max_tokens: outputTokens,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'benchmark', strict: true, schema: input.schema },
      },
      reasoning: { effort: 'medium' },
      provider: { require_parameters: true, max_price: { prompt: 0.1, completion: 0.2 } },
    };
    const upstreamMicro =
      Math.ceil((Buffer.byteLength(JSON.stringify(native)) + 1024) * arm.inputRate) +
      Math.ceil(outputTokens * arm.outputRate);
    expect(reservationForInputUsd(arm, input) * 1e6).toBeGreaterThanOrEqual(upstreamMicro);
    expect(reservationUsd(arm, Buffer.byteLength(JSON.stringify(input))) * 1e6).toBeLessThan(
      upstreamMicro,
    );
  });

  it('keeps the direct OpenAI reservation unchanged', () => {
    const arm = armById.get('openai/gpt-6-luna:high')!;
    const input = { instructions: 'Decide.', input: { memory: '"quoted"' }, schema: {} };
    expect(reservationForInputUsd(arm, input)).toBe(
      reservationUsd(arm, Buffer.byteLength(JSON.stringify(input))),
    );
  });
});
