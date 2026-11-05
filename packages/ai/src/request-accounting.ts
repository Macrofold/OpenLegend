import type { GenerateRequest, RequestInputAccounting } from './types.js';

const bytes = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text === undefined) throw new Error('Cannot account for an unserialized request value.');
  return Buffer.byteLength(text);
};

/** Sizes describe the captured adapter representation. They are diagnostics, not
 * tokenizer guarantees or another spending/permission gate. */
export function generationRequestAccounting(
  request: Pick<GenerateRequest, 'instructions' | 'context' | 'schema'>,
  model: string,
  actual: {
    input: unknown;
    transport: string;
    maxOutputTokens: number | null;
    inputScope?: RequestInputAccounting['inputScope'];
  },
): RequestInputAccounting {
  const encodedInputBytes = bytes(actual.input);
  const inputScope = actual.inputScope ?? 'adapter-input';
  return {
    instructionsBytes: bytes(request.instructions),
    contextBytes: bytes(request.context),
    schemaBytes: bytes(request.schema),
    toolDefinitionBytes: inputScope === 'worker-prompt-only' ? null : 0,
    toolResultBytes: inputScope === 'worker-prompt-only' ? null : 0,
    inputScope,
    encodedInputBytes,
    transportBytes: bytes(actual.transport),
    maxOutputTokens: actual.maxOutputTokens,
    estimatedInputTokens: {
      value: Math.ceil(encodedInputBytes / 3),
      basis: 'captured-input-utf8-divided-by-three',
      model,
      exact: false,
    },
  };
}
