/** Explicit AJV 8.20.0 CodeGen storage for the admitted no-reference profile.
 * This is an allocation envelope, separate from V8's compiler/JIT and RSS.
 * docs/limits/native-simulation-core.md#nsc-l03--requests-captures-and-pending-data
 *
 * The coefficients count the templates in compile/{codegen,errors,validate}
 * and vocabularies/{applicator,validation}. Code optimization is disabled and
 * required/enum use loops, so there is no UsedNames optimizer graph or growing
 * required/enum expression fold. Unsupported keywords fail before compilation.
 */
const carrier = 256;
// The fixed CodeGen classes are smaller than a general JSON/dictionary owner.
// Node22.23.2 js-objects.tq gives a three-word JSObject. The largest selected
// AST constructor has five own fields. Late _Code/ValueScopeName/If fields can
// use a three-slot PropertyArray (two header words), fitting 80 bytes in total.
// JSFunction::CalculateExpectedNofProperties adds eight initial slack slots;
// Map's seven-allocation slack tracking is covered once for all 22 classes.
const fixedCarrier = 80;
const initialClassSlack = 22 * 7 * 8 * 8;
// object-macros.h packs the String hash/length after its map into 16 bytes.
// Seq strings add at most seven padding bytes; Cons/Sliced add two words.
const textHeader = 32;
const nameUnits = 24;
// Pinned Node 22 V8 capacity growth is at most 1.5n+16. Twenty-four
// bytes/item covers the old and replacement backing, using eight-byte slots.
const itemBytes = 24;
// JSArray has four words. A completed FixedArray adds two header words and
// <=16 spare slots. During growth, one extra backing header is also present.
const arrayCarrier = 32 + 2 * 16 + 16 * 8;
const renderedArrayCarrier = 32 + 16 + 16 * 8;
const renderedItemBytes = 12;
const concatBytes = 40;
const keywords = new Set([
  '$schema',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'anyOf',
  'items',
  'enum',
  'const',
  'pattern',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
]);
const identifier = /^[a-zA-Z$_][a-zA-Z$_0-9]*$/;
const uriUnescaped = /[a-zA-Z0-9\-_.!*'()]/;
const groups = [
  ['minimum', 'maximum'],
  ['minLength', 'maxLength', 'pattern'],
  ['minItems', 'maxItems', 'items'],
  ['properties', 'required', 'additionalProperties'],
];
const emptyProperties = Object.freeze({});
const predicates: Readonly<Record<string, readonly [number, number]>> = {
  null: [3, nameUnits + 10],
  string: [7, nameUnits + 22],
  boolean: [7, nameUnits + 22],
  array: [13, nameUnits + 20],
  object: [27, 3 * nameUnits + 52],
  number: [67, 2 * nameUnits + 40],
  integer: [157, 5 * nameUnits + 85],
};
const scalarTemplates: readonly [string, number, number, number, number, number][] = [
  ['minLength', 22, 4, 11, 3, 9],
  ['maxLength', 22, 4, 11, 3, 9],
  ['minItems', 7, 1, 7, 3, 9],
  ['maxItems', 7, 1, 7, 3, 9],
  ['minimum', 9, 1, 9, 5, 9],
  ['maximum', 9, 1, 9, 5, 9],
  ['pattern', 18, 4, 3, 5, 7],
  ['const', 8, 2, 5, 5, 1],
];

function unsupported(): never {
  throw new RangeError('schema_compiler_capacity_unsupported');
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** JSON.stringify plus AJV's U+2028/U+2029 escaping, without a new string. */
export function jsonQuotedUnits(value: unknown): number {
  if (value === null) return 4;
  if (typeof value === 'boolean') return 5;
  if (typeof value === 'number' && Number.isFinite(value)) return 25;
  if (typeof value !== 'string') return unsupported();
  let units = 2;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    units +=
      code < 32 || code === 0x2028 || code === 0x2029 || (code >= 0xd800 && code <= 0xdfff)
        ? 6
        : code === 34 || code === 92
          ? 2
          : 1;
  }
  return units;
}

function countFields(value: Record<string, unknown>): number {
  let count = 0;
  for (const key in value) if (Object.hasOwn(value, key)) count++;
  return count;
}

// AdditionalProperties has an unrolled comparison only for at most eight keys.
function foldedSlots(size: number, count: number): number {
  return count < 2
    ? 0
    : size * (count * (count + 1) - 2) + 9 * (count - 2) * (count - 1) + 13 * (count - 1);
}

/** Values are primitive coefficients from one keyword's CodeGen template.
 * nodes includes error/control nodes; codes/items includes discarded expression
 * intermediates; kept/keptCodes counts expressions referenced during rendering.
 */
type Template = [
  nodes: number,
  codes: number,
  items: number,
  kept: number,
  keptCodes: number,
  sourceUnits: number,
];

export function schemaCompileWorkspace(schema: unknown): {
  peakBytes: number;
  retainedBytes: number;
} {
  if (process.versions.node !== '22.23.2')
    throw new RangeError('schema_compiler_runtime_unsupported');
  let nodes = 0,
    codes = 0,
    items = 0,
    kept = 0,
    keptCodes = 0;
  let sourceExpressions = 0,
    textHeaders = 0,
    textUnits = 0;
  let schemas = 0,
    typeChecks = 0,
    properties = 0,
    dataEdges = 0,
    additional = 0;
  let required = 0,
    unions = 0,
    arrays = 0,
    enums = 0,
    scopeCalls = 0,
    loops = 0;
  let errors = 0,
    errorPathUnits = 0,
    largestFrame = 0;
  const add = (row: Template) => {
    nodes += row[0];
    codes += row[1];
    items += row[2];
    kept += row[3];
    keptCodes += row[4];
    sourceExpressions += row[5];
  };
  const text = (headers: number, units: number) => {
    textHeaders += headers;
    textUnits += units;
  };
  const quote = (units: number) => text(3, 3 * units);
  const joinedText = (quotes: number, merges: number, literal: number, result: number) =>
    text(3 * quotes + 5 * merges, 3 * literal + 3 * merges * result);
  const withError = (row: Template, failure: Template) => {
    add(row);
    add(failure);
  };
  const walk = (
    value: unknown,
    schemaItems = 1,
    dataItems = 1,
    indexedDepth = 0,
    schemaUnits = 0,
    pathQuote = 3,
    instanceUnits = 2,
    depth = 0,
    dataDepth = 0,
    ancestors = 0,
  ): void => {
    if (!record(value) || depth > 32 || ++schemas > 20_000) unsupported();
    for (const key in value) if (Object.hasOwn(value, key) && !keywords.has(key)) unsupported();
    if (value.$schema !== undefined && value.$schema !== 'http://json-schema.org/draft-07/schema#')
      unsupported();
    const props = value.properties === undefined ? emptyProperties : value.properties;
    if (!record(props)) unsupported();
    const propertyCount = countFields(props);
    const frame =
      32 * carrier +
      itemBytes * (4 * propertyCount + 2 * (dataDepth + 1) + 2 * schemaItems + dataItems + 16);
    largestFrame = Math.max(largestFrame, ancestors + frame);
    ancestors += frame;
    const error = (
      keyword: string,
      paramItems: number,
      messageItems: number,
      paramUnits: number,
      messageUnits: number,
    ): Template => {
      errors++;
      errorPathUnits += instanceUnits;
      const pathUnits = pathQuote + keyword.length + 9;
      joinedText(5, 2, pathUnits, pathUnits);
      joinedText(3, 0, 6, 0);
      quote(jsonQuotedUnits(keyword));
      if (
        ['minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum'].includes(keyword)
      )
        joinedText(4, 4, messageUnits, messageUnits);
      else if (keyword === 'required') joinedText(2, 0, messageUnits, 0);
      else if (keyword === 'pattern') joinedText(2, 2, messageUnits, messageUnits);
      else quote(messageUnits);
      if (keyword === 'minimum' || keyword === 'maximum' || keyword === 'type') quote(paramUnits);
      return [
        0,
        10,
        3 * dataItems + 90 + 3 * paramItems + 3 * messageItems,
        51 + dataItems + paramItems + messageItems,
        6,
        100 +
          8 * nameUnits +
          instanceUnits +
          pathQuote +
          keyword.length +
          3 +
          jsonQuotedUnits(keyword) +
          paramUnits +
          messageUnits,
      ];
    };

    add(depth ? [2, 1, 5, 5, 1, 2 * nameUnits + 5] : [7, 17, 367, 23, 3, 390]);
    if (['type', 'const', 'enum', 'anyOf'].some((key) => Object.hasOwn(value, key)))
      add([1, 1, 5, 5, 1, 2 * nameUnits + 5]);
    for (const group of groups)
      if (group.some((key) => Object.hasOwn(value, key)))
        add([2, 6, 36, 20, 2, 6 * nameUnits + 69]);
    if (value.type !== undefined) {
      typeChecks++;
      const type = value.type;
      const nullable = Array.isArray(type);
      if (
        nullable &&
        (type.length !== 2 || !['string', 'number'].includes(type[0]) || type[1] !== 'null')
      )
        unsupported();
      const scalar = typeof type === 'string' ? type : '';
      const predicate = nullable ? predicates.integer : predicates[scalar];
      if (!predicate) unsupported();
      const typeUnits = nullable ? jsonQuotedUnits(type[0]) + 5 : jsonQuotedUnits(type);
      withError(
        // The registered type keyword has no code handler. KeywordCxt still
        // creates its own _errs declaration, apart from the type-error body.
        [8, 15, predicate[0] + 2 * (schemaItems + 7), 33, 1, predicate[1]],
        error(
          'type',
          nullable ? schemaItems + 8 : 3,
          1,
          nullable ? nameUnits + schemaUnits + 16 : typeUnits + 8,
          32,
        ),
      );
      quote(typeUnits);
    }
    if (value.properties !== undefined) {
      properties++;
      add([0, 2, schemaItems + 7, 0, 0, 0]);
      for (const key in props)
        if (Object.hasOwn(props, key)) {
          dataEdges++;
          scopeCalls++;
          const quoted = jsonQuotedUnits(key);
          const extraItems = identifier.test(key) ? 0 : 2;
          add([
            5,
            13 + extraItems,
            73 + schemaItems + dataItems + 6 * extraItems,
            24 + extraItems,
            2 + extraItems,
            5 * nameUnits + 2 * (1 + key.length) + quoted + 31,
          ]);
          // Schema fragments use JSON-pointer escaping followed by URI
          // encoding. Instance paths use only JSON-pointer escaping.
          let pointerUnits = 2;
          let instancePointerUnits = quoted;
          for (let index = 0; index < key.length; index++) {
            const character = key[index]!;
            const code = key.charCodeAt(index);
            if (character === '~' || character === '/') {
              pointerUnits += 2;
              instancePointerUnits++;
            } else if (uriUnescaped.test(character)) pointerUnits++;
            else pointerUnits += code < 128 ? 3 : code < 2048 ? 6 : 9;
          }
          const childPath = pathQuote + 12 + pointerUnits - 2;
          const childInstance = instanceUnits + instancePointerUnits + 11;
          text(16, 8 * childPath + 5 * quoted + 16);
          quote(quoted);
          joinedText(6, 1, instancePointerUnits + 12, childInstance);
          walk(
            props[key],
            schemaItems + 6 + extraItems,
            1 + 6 * indexedDepth,
            indexedDepth,
            schemaUnits + 12 + quoted,
            childPath,
            childInstance,
            depth + 1,
            dataDepth + 1,
            ancestors,
          );
        }
    }
    if (value.additionalProperties !== undefined) {
      if (value.additionalProperties !== false) unsupported();
      additional++;
      loops++;
      if (propertyCount > 8) scopeCalls++;
      const folded = propertyCount ? propertyCount * 5 + 9 * (propertyCount - 1) : 0;
      const predicate =
        propertyCount > 8
          ? 4 * schemaItems + 55
          : propertyCount
            ? 5 * propertyCount + foldedSlots(5, propertyCount) + 2 * folded + 6
            : 0;
      let width = 0;
      if (propertyCount > 8) width = 3 * nameUnits + schemaUnits + 25;
      else {
        for (const key in props)
          if (Object.hasOwn(props, key)) {
            width += nameUnits + 5 + jsonQuotedUnits(key);
            quote(jsonQuotedUnits(key));
          }
        width += 8 * Math.max(propertyCount - 1, 0) + 3;
      }
      withError(
        [
          11,
          propertyCount > 8 ? 9 : 4 + propertyCount + 3 * Math.max(propertyCount - 1, 0),
          8 + predicate,
          8 + (propertyCount > 8 ? schemaItems + 16 : folded + 4),
          3,
          3 * nameUnits + 18 + width,
        ],
        error('additionalProperties', 3, 1, 20 + nameUnits, 43),
      );
    }
    if (value.required !== undefined) {
      if (!Array.isArray(value.required)) unsupported();
      if (value.required.length) {
        required++;
        scopeCalls++;
        loops++;
        withError(
          [13, 9, schemaItems + 50, schemaItems + 26, 3, 8 * nameUnits + schemaUnits + 55],
          error('required', 3, 5, nameUnits + 21, 64 + nameUnits),
        );
      }
    }
    if (value.items !== undefined) {
      dataEdges++;
      arrays++;
      loops++;
      add([7, 11, 2 * schemaItems + 44 + dataItems, 13, 3, 6 * nameUnits + 11]);
      const childPath = pathQuote + 6,
        childInstance = instanceUnits + nameUnits + 16;
      text(8, 6 * childPath + 16);
      joinedText(5, 1, 12, childInstance);
      walk(
        value.items,
        schemaItems + 4,
        1 + 6 * (indexedDepth + 1),
        indexedDepth + 1,
        schemaUnits + 6,
        childPath,
        childInstance,
        depth + 1,
        dataDepth + 1,
        ancestors,
      );
    }
    if (value.anyOf !== undefined) {
      if (!Array.isArray(value.anyOf)) unsupported();
      unions++;
      withError([19, 5, schemaItems + 16, 9, 3, 6 * nameUnits + 26], error('anyOf', 1, 1, 2, 37));
      for (let index = 0; index < value.anyOf.length; index++) {
        add([2, 5, schemaItems + 20, 8, 2, 3 * nameUnits + 5]);
        const indexUnits = 1 + Math.floor(Math.log10(Math.max(index, 1)));
        const childPath = pathQuote + 7 + indexUnits;
        text(10, 8 * childPath + 16);
        walk(
          value.anyOf[index],
          schemaItems + 8,
          dataItems,
          indexedDepth,
          schemaUnits + 8 + indexUnits,
          childPath,
          instanceUnits,
          depth + 1,
          dataDepth,
          ancestors,
        );
      }
    }
    if (value.enum !== undefined) {
      if (!Array.isArray(value.enum)) unsupported();
      // This finite compiler profile covers primitive constants only.
      for (let index = 0; index < value.enum.length; index++) jsonQuotedUnits(value.enum[index]);
      enums++;
      scopeCalls++;
      loops++;
      withError(
        [14, 6, schemaItems + 23, schemaItems + 16, 3, 6 * nameUnits + schemaUnits + 24],
        error('enum', schemaItems + 8, 1, nameUnits + schemaUnits + 24, 49),
      );
    }
    for (const [key, count, codeCount, live, params, message] of scalarTemplates)
      if (Object.hasOwn(value, key)) {
        const quoted = jsonQuotedUnits(value[key]);
        if (key === 'minLength' || key === 'maxLength' || key === 'pattern') scopeCalls++;
        withError(
          [8, codeCount, count, live, 1, 2 * nameUnits + 24 + quoted],
          error(key, params, message, 24 + quoted, 52 + quoted),
        );
        if (key === 'pattern' || key === 'const') {
          quote(quoted);
          if (key === 'pattern') {
            quote(quoted);
            text(1, 2 * quoted + 8);
          }
        }
      }
  };
  walk(schema);
  const names =
    schemas -
    1 +
    typeChecks +
    errors +
    properties +
    dataEdges +
    2 * additional +
    2 * required +
    3 * unions +
    3 * arrays +
    2 * enums +
    scopeCalls +
    10;
  const literalBytes = textHeaders * textHeader + 2 * textUnits;
  const contextBytes = largestFrame + 512 * (schemas + dataEdges) + 64 * carrier;
  // Every child-list entry is an edge of this tree, so their total is <=nodes.
  // The fixed array allowance is intentionally granted even to leaf nodes.
  const astBytes = nodes * (fixedCarrier + arrayCarrier + itemBytes) + initialClassSlack;
  const nameBytes = names * (fixedCarrier + textHeader + 2 * nameUnits);
  const emitting =
    astBytes +
    nameBytes +
    literalBytes +
    codes * (fixedCarrier + arrayCarrier) +
    itemBytes * items +
    contextBytes;
  const sourceUnits = 64 * nodes + 32 * loops + sourceExpressions;
  // Rendered sibling prefixes represent disjoint portions of this source.
  // Allow both the rope/flat overlap and the scanner's flat source copy.
  // str.optimize removes two logical items per successful splice. Its backing
  // can retain that capacity. Each error has two path expressions and at most
  // a two-argument message (<=12 splices); a data edge has <=6. Other selected
  // templates use plain Code and no str. Include the fixed outer expression.
  const splices = 12 * errors + 6 * dataEdges + 64;
  const renderedAst =
    nodes * (fixedCarrier + renderedArrayCarrier + renderedItemBytes) + initialClassSlack;
  const render =
    renderedAst +
    nameBytes +
    literalBytes +
    keptCodes * (fixedCarrier + renderedArrayCarrier) +
    renderedItemBytes * kept +
    24 * splices +
    contextBytes +
    4 * (sourceUnits + 128) +
    // Each ordinary render has <=5 concatenations, amortizing an If with its
    // Else. Parent-child joining adds <=nodes. Loop headers add <=10 more.
    // This profile has no coercion/else-if chain; the outer function has slack.
    concatBytes * (kept + 6 * nodes + 10 * loops + 384);
  // Fixed draft-07 profile, audited separately through the pinned constructors:
  // <=1024 nodes, 2048 Code objects, 16384 item slots, 384 names, 65536 source
  // units, 8192 quoted/merged text carriers and 262144 literal units. The
  // remaining MiB covers its finite schema/ref/keyword registries and contexts.
  const metaCompile =
    1024 * (2 * carrier + 3 * itemBytes) +
    2048 * 2 * carrier +
    16384 * itemBytes +
    384 * (carrier + textHeader + 2 * nameUnits) +
    8192 * textHeader +
    2 * 262144 +
    4 * 65536 +
    concatBytes * (16384 + 8 * 1024 + 384) +
    1024 * 1024;
  // Compiling the request begins after built-in meta compilation has ended.
  // Scope entries retain their names/path/code/ref and registry backing. The
  // JSON schema graph is independently admitted by prepareSchema's caller.
  const metaRetained = 256 * 1024;
  const retainedBytes =
    metaRetained +
    2 * (sourceUnits + 128) +
    textHeader +
    (scopeCalls + 16) * (4 * carrier + 2 * textHeader + 4 * itemBytes) +
    // A failed anyOf can keep one error and one params record per error site
    // until the caller consumes validate.errors. allErrors=false stops a
    // failing array at its first invalid item. Successful unions reset their
    // discarded branch errors before the next item is examined.
    errors * (2 * carrier + 6 * 512 + 64 + textHeader) +
    2 * errorPathUnits;
  const peakBytes = Math.max(metaCompile, Math.max(emitting, render) + metaRetained, retainedBytes);
  if (!Number.isSafeInteger(peakBytes)) unsupported();
  return { peakBytes, retainedBytes };
}
