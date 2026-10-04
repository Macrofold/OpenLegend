import { JSONParser, TokenType } from '@streamparser/json';
import { InvalidData } from './validation.js';

/** Only complete objects at a trusted caller's path are released. The library owns
 * JSON syntax; these guards reject ambiguous or unsafe values even after disclosure.
 * docs/projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#2-one-bounded-deterministic-json-decoder
 */
export class JsonObjectStream {
  private parser: JSONParser;
  private frames: (Set<string> | null)[] = [];
  private expectingKey = false;
  private bytes = 0;
  private maxBytes: number;

  constructor(
    options: { path: readonly (string | number)[]; maxBytes: number; rootKeys: readonly string[] },
    object: (value: unknown) => void,
  ) {
    this.maxBytes = options.maxBytes;
    const rootKeys = new Set(options.rootKeys);
    this.parser = new JSONParser({
      paths: ['$' + options.path.map((part) => `.${part}`).join('')],
      keepStack: false,
      emitPartialTokens: false,
      emitPartialValues: false,
    });
    this.parser.onError = () => this.invalid();
    this.parser.onValue = ({ value, key, stack }) => {
      // The library's selector conflates object key "0" with array index 0.
      // Check its actual typed keys before releasing the selected object.
      if (
        stack.length === options.path.length &&
        options.path.every(
          (part, i) => part === (i + 1 === options.path.length ? key : stack[i + 1]?.key),
        ) &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      )
        object(value);
    };
    this.parser.onToken = ({ token, value }) => {
      if (token === TokenType.LEFT_BRACE || token === TokenType.LEFT_BRACKET) {
        if (this.frames.length >= 32) this.invalid();
        this.frames.push(token === TokenType.LEFT_BRACE ? new Set() : null);
        this.expectingKey = token === TokenType.LEFT_BRACE;
      } else if (token === TokenType.RIGHT_BRACE || token === TokenType.RIGHT_BRACKET) {
        this.frames.pop();
        this.expectingKey = false;
      } else if (token === TokenType.COMMA) {
        this.expectingKey = this.frames.at(-1) instanceof Set;
      } else if (token === TokenType.STRING) {
        // JSON permits lone surrogates; a Unicode-mode range excludes valid pairs.
        if (typeof value !== 'string' || /[\ud800-\udfff]/u.test(value)) this.invalid();
        if (!this.expectingKey) return;
        const keys = this.frames.at(-1);
        if (!keys || keys.has(value) || keys.size >= 256) this.invalid();
        if (this.frames.length === 1 && !rootKeys.has(value)) this.invalid();
        keys.add(value);
        this.expectingKey = false;
      } else if (token === TokenType.NUMBER && !Number.isFinite(value)) {
        this.invalid();
      }
    };
  }

  private invalid(): never {
    throw new InvalidData('Malformed or oversized streamed JSON.');
  }

  write(text: string) {
    this.bytes += Buffer.byteLength(text);
    if (this.bytes > this.maxBytes) this.invalid();
    this.parser.write(text);
  }

  finish() {
    // A closed document already ends the library parser; end() then would throw.
    if (!this.parser.isEnded) this.parser.end();
  }
}
