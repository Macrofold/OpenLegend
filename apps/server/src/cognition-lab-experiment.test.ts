import { describe, expect, it } from 'vitest';
import {
  decodeLabExperiment,
  labExperimentChunks,
  labExperimentMetadata,
} from './cognition-lab-experiment.js';
import type { LabExperimentSnapshot } from './cognition-lab-records.js';

async function* chunks(bytes: Uint8Array, size = 733) {
  for (let offset = 0; offset < bytes.length; offset += size)
    yield bytes.subarray(offset, offset + size);
}
describe('complete saved experiment context', () => {
  it('roundtrips large strings, ordinary JSON keys and split Unicode without provider-only JSON restrictions', async () => {
    const snapshot: LabExperimentSnapshot = {
      settings: JSON.parse('{"__proto__":{"authored":true}}'),
      customFields: [
        {
          text: ('🌿\\\n"' + '\ud800').repeat(100_000),
          values: Object.fromEntries(Array.from({ length: 300 }, (_, index) => [index, index])),
        },
      ],
      holds: [],
      participants: ['person'],
      autonomy: [],
    };
    const metadata = labExperimentMetadata(snapshot);
    const encoded = [...labExperimentChunks(snapshot)];
    expect(Math.max(...encoded.map((part) => part.length))).toBeLessThanOrEqual(64 * 1024);
    const bytes = Buffer.concat(encoded);
    expect(bytes.length).toBe(metadata.bytes);
    expect(await decodeLabExperiment(chunks(bytes), metadata.bytes)).toEqual(snapshot);
    expect(Object.prototype).not.toHaveProperty('authored');
  });

  it('refuses duplicate keys, invalid UTF-8 and incomplete or mismatched context before installation', async () => {
    const text =
      '{"settings":{"model":1,"model":2},"customFields":[],"holds":[],"participants":[],"autonomy":[]}';
    const duplicate = Buffer.from(text);
    await expect(decodeLabExperiment(chunks(duplicate), duplicate.length)).rejects.toThrow();
    const invalidUnicode = Buffer.from(
      '{"settings":"!","customFields":[],"holds":[],"participants":[],"autonomy":[]}',
    );
    invalidUnicode[invalidUnicode.indexOf(33)] = 0xff;
    await expect(
      decodeLabExperiment(chunks(invalidUnicode), invalidUnicode.length),
    ).rejects.toThrow();
    const truncated = Buffer.from(text.slice(0, -1));
    await expect(decodeLabExperiment(chunks(truncated), truncated.length)).rejects.toThrow();
    const valid = Buffer.from(text.replace(',"model":2', ''));
    await expect(decodeLabExperiment(chunks(valid), valid.length + 1)).rejects.toThrow();
  });
});
