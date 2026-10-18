import { Document, isScalar, isSeq, Lexer, parse, Scalar, visit } from 'yaml';

const intrinsicTags = [
  { tag: '!Ref', resolve: (value: string) => ({ Ref: value }) },
  { tag: '!Sub', resolve: (value: string) => ({ 'Fn::Sub': value }) },
  {
    tag: '!GetAtt',
    resolve: (value: string) => {
      const dot = value.indexOf('.');
      if (dot < 1) throw new Error('Invalid CloudFormation attribute reference.');
      return { 'Fn::GetAtt': [value.slice(0, dot), value.slice(dot + 1)] };
    },
  },
];

/** CloudFormation accepts JSON or YAML. Flow YAML preserves every resource,
 * permission, explanation and exact generated handler while reducing inline
 * wire bytes. Approval hashes continue to cover the canonical document value.
 */
export function assetTemplateWire(value: unknown): string {
  // CloudFormation uses YAML 1.1. Its yes/on/date/sexagesimal scalars must not
  // change the meaning of JSON strings when submitted or hashed after reading.
  const document = new Document(value, {
    version: '1.1',
    customTags: intrinsicTags,
    aliasDuplicateObjects: false,
  });
  visit(document, {
    Map(_key, node) {
      if (node.items.length !== 1) return;
      const pair = node.items[0];
      if (!pair || !isScalar(pair.key)) return;
      if (
        (pair.key.value === 'Ref' || pair.key.value === 'Fn::Sub') &&
        isScalar(pair.value) &&
        typeof pair.value.value === 'string'
      ) {
        pair.value.tag = pair.key.value === 'Ref' ? '!Ref' : '!Sub';
        return pair.value;
      }
      // The documented short form joins the static resource and attribute.
      // Keep all other shapes in their original long form, without guessing.
      if (pair.key.value === 'Fn::GetAtt' && isSeq(pair.value) && pair.value.items.length === 2) {
        const [resource, attribute] = pair.value.items;
        if (
          isScalar(resource) &&
          typeof resource.value === 'string' &&
          !resource.value.includes('.') &&
          isScalar(attribute) &&
          typeof attribute.value === 'string'
        ) {
          const result = new Scalar(`${resource.value}.${attribute.value}`);
          result.tag = '!GetAtt';
          return result;
        }
      }
    },
  });
  const source = document.toString({
    collectionStyle: 'flow',
    flowCollectionPadding: false,
    lineWidth: 0,
  });
  // Flow commas delimit nodes without following whitespace. Work on lexer
  // tokens so commas/spaces inside IAM strings or bundled code stay untouched.
  const tokens: string[] = [];
  let comma = false;
  for (const token of new Lexer().lex(source)) {
    if (token === '\x02' || token === '\x1f') continue;
    if (token === '\x18') throw new Error('Invalid generated template flow syntax.');
    if (comma && /^[ \t]+$/.test(token)) continue;
    tokens.push(token);
    comma = token === ',';
  }
  return tokens.join('');
}

export function parseAssetTemplate(value: string): unknown {
  return parse(value, {
    version: '1.1',
    customTags: intrinsicTags,
    maxAliasCount: 0,
    uniqueKeys: true,
  });
}
