/** Offline, source-bound probe preparation. This imports the repository's pinned
 * formatter parser, never a game module. Generated probes only observe existing
 * operations; they do not create work, change return values or retry effects. */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import type { ParserOptions } from 'prettier';
import { parsers } from 'prettier/plugins/typescript';
import type { ProfilingBinding, ProfilingDefinition } from './profiling-registry.js';
import { PROFILING_SQL_OWNERS } from './profiling-registry.js';

type Ast = {
  type: string;
  range: [number, number];
  loc?: { start: { line: number }; end: { line: number } };
  [key: string]: unknown;
};
interface FunctionSite {
  node: Ast;
  body: Ast;
  parent?: Ast;
  symbol: string;
  async: boolean;
  generator: boolean;
  promise: boolean;
}
interface Edit {
  start: number;
  end: number;
  text: string;
  order?: number;
}
export interface AppliedProfilingBinding extends ProfilingBinding {
  id: string;
  numericId: number;
}
export interface SourceInstrumentation {
  source: string;
  bindings: AppliedProfilingBinding[];
}
function ast(value: unknown): Ast | undefined {
  if (!value || typeof value !== 'object' || !('type' in value) || typeof value.type !== 'string')
    return;
  return value as Ast;
}
function name(value: unknown): string | undefined {
  const node = ast(value);
  if (!node) return;
  return typeof node.name === 'string'
    ? node.name
    : typeof node.value === 'string'
      ? node.value
      : undefined;
}
function children(node: Ast): Ast[] {
  const result: Ast[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (['parent', 'comments', 'tokens', 'loc', 'range'].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        const child = ast(item);
        if (child) result.push(child);
      }
    } else {
      const child = ast(value);
      if (child) result.push(child);
    }
  }
  return result;
}
function functionNode(node: Ast): boolean {
  return ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
    node.type,
  );
}
function text(source: string, node: Ast): string {
  return source.slice(node.range[0], node.range[1]);
}
function parse(source: string, path: string): Ast {
  // Source is repository-owned, and this parser's documented ESTree result is
  // consumed only for offline exact range binding; it never executes the input.
  try {
    // Honor the pinned plugin's full parser interface, including its own source
    // locations. Formatting options supply context only; this never prints or
    // rewrites the parsed text.
    const options: ParserOptions<Ast> = {
      parser: 'typescript',
      filepath: path,
      originalText: source,
      locStart: parsers.typescript.locStart,
      locEnd: parsers.typescript.locEnd,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      jsxSingleQuote: false,
      trailingComma: 'all',
      bracketSpacing: true,
      objectWrap: 'preserve',
      bracketSameLine: false,
      rangeStart: 0,
      rangeEnd: Infinity,
      requirePragma: false,
      insertPragma: false,
      checkIgnorePragma: false,
      proseWrap: 'preserve',
      arrowParens: 'always',
      plugins: [],
      htmlWhitespaceSensitivity: 'css',
      endOfLine: 'lf',
      quoteProps: 'as-needed',
      vueIndentScriptAndStyle: false,
      embeddedLanguageFormatting: 'off',
      singleAttributePerLine: false,
      experimentalOperatorPosition: 'end',
      experimentalTernaries: false,
    };
    return parsers.typescript.parse(source, options) as Ast;
  } catch (error) {
    const line = (error as { loc?: { start?: { line?: number } } }).loc?.start?.line;
    throw new Error(
      `Profiling source parse refused ${path}${
        line
          ? `:${line}: ${source
              .split('\n')
              .slice(line - 2, line + 1)
              .join('\n')}`
          : ''
      }: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
function sites(source: string, path: string): FunctionSite[] {
  const result: FunctionSite[] = [];
  const visit = (node: Ast, parent: Ast | undefined, ancestors: readonly string[]) => {
    let label: string | undefined;
    const body = ast(node.body);
    if (functionNode(node)) {
      label = name(node.id);
      if (!label && parent?.type === 'VariableDeclarator') label = name(parent.id);
      if (
        !label &&
        parent &&
        ['MethodDefinition', 'Property', 'PropertyDefinition'].includes(parent.type)
      )
        label = name(parent.key);
      if (!label && parent?.type === 'CallExpression') {
        const arguments_ = parent.arguments as unknown[];
        const index = arguments_.indexOf(node);
        const callee = ast(parent.callee);
        if (callee && index >= 0) {
          const first = ast(arguments_[0]);
          const event =
            first?.type === 'Literal' && typeof first.value === 'string' ? `(${first.value})` : '';
          label = `@${text(source, callee).replace(/\s+/g, '')}${event}:${index}`;
        }
      }
      if (!label && parent?.type === 'ReturnStatement') label = '@return';
      if (!label && body?.type === 'BlockStatement') {
        let local: string | undefined;
        const firstDeclaration = (value: Ast) => {
          if (local || (value !== body && functionNode(value))) return;
          if (value.type === 'VariableDeclarator') {
            const candidate = name(value.id);
            if (candidate && !candidate.startsWith('__ol_')) {
              local = candidate;
              return;
            }
          }
          for (const child of children(value)) firstDeclaration(child);
        };
        firstDeclaration(body);
        if (local) label = `@body:${local}`;
      }
      const annotation = ast(ast(node.returnType)?.typeAnnotation);
      const promise =
        annotation?.type === 'TSTypeReference' &&
        ['Promise', 'PromiseLike'].includes(name(annotation.typeName) ?? '');
      if (label && body?.type === 'BlockStatement')
        result.push({
          node,
          body,
          parent,
          symbol: [...ancestors, label].join('.'),
          async: node.async === true,
          generator: node.generator === true,
          promise,
        });
    }
    const className =
      node.type === 'ClassDeclaration' || node.type === 'ClassExpression'
        ? name(node.id)
        : undefined;
    const next = className ? [...ancestors, className] : label ? [...ancestors, label] : ancestors;
    for (const child of children(node)) visit(child, node, next);
  };
  visit(parse(source, path), undefined, []);
  return result;
}
export function sourceFunctionBindings(path: string, source: string): ProfilingBinding[] {
  const hash = createHash('sha256').update(source).digest('hex');
  return sites(source, path).map((site) => ({
    path,
    symbol: site.symbol,
    start: site.node.range[0],
    end: site.node.range[1],
    startLine: site.node.loc?.start.line,
    endLine: site.node.loc?.end.line,
    sourceHash: hash,
    anchorHash: createHash('sha256').update(text(source, site.node)).digest('hex'),
    async: site.async,
    generator: site.generator,
    promise: site.promise,
    ...(site.async ? { latencyBoundary: 'async-body-and-native-return-settlement' as const } : {}),
    counterNames: sourceCounters(site),
    kind:
      site.async || site.generator ? 'active-segments' : site.promise ? 'async-latency' : 'sync',
  }));
}

export interface ProfilingEntrypoint {
  kind:
    | 'http-route'
    | 'native-command'
    | 'timer'
    | 'worker-handler'
    | 'worker-start'
    | 'database-write';
  path: string;
  line: number;
  symbol: string;
  operation: string;
  bindings: string[];
  enclosingBindings: string[];
  disposition: 'bound' | 'not-selected' | 'unmapped';
}
/** Offline census of actual executable entrypoints, not an inferred promise that
 * every catalogue scenario ran. New routes/commands/writers remain visible even
 * when no selected probe names their immediate owner. */
export function sourceEntrypointCensus(
  path: string,
  source: string,
  definitions: readonly ProfilingDefinition[],
  selectedIds: ReadonlySet<string>,
): ProfilingEntrypoint[] {
  const functions = sites(source, path);
  const bindings = definitions.flatMap((definition) =>
    definition.bindings
      .filter((binding) => binding.path === path)
      .map((binding) => ({ id: definition.id, binding })),
  );
  const entries: ProfilingEntrypoint[] = [];
  const add = (node: Ast, kind: ProfilingEntrypoint['kind'], operation: string) => {
    const owners = functions
      .filter((site) => site.node.range[0] <= node.range[0] && site.node.range[1] >= node.range[1])
      .sort((a, b) => a.node.range[1] - a.node.range[0] - (b.node.range[1] - b.node.range[0]));
    const symbol = owners[0]?.symbol ?? '<module>';
    const direct = bindings.filter(({ binding }) => binding.symbol === symbol).map(({ id }) => id);
    const enclosing = bindings
      .filter(({ binding }) => owners.some((owner) => owner.symbol === binding.symbol))
      .map(({ id }) => id);
    entries.push({
      kind,
      path,
      line: node.loc?.start.line ?? 0,
      symbol,
      operation,
      bindings: direct,
      enclosingBindings: enclosing,
      disposition: direct.some((id) => selectedIds.has(id))
        ? 'bound'
        : enclosing.length
          ? 'not-selected'
          : 'unmapped',
    });
  };
  const visit = (node: Ast) => {
    if (
      node.type === 'Literal' &&
      typeof node.value === 'string' &&
      /^\/(?:api\/|health(?:\/|$)|ready(?:\/|$))/.test(node.value)
    )
      add(node, 'http-route', node.value);
    if (node.type === 'SwitchStatement') {
      const discriminant = ast(node.discriminant);
      if (discriminant && text(source, discriminant).replace(/\s+/g, '') === 'command.type')
        for (const value of node.cases as unknown[]) {
          const branch = ast(value),
            test = branch && ast(branch.test);
          if (test?.type === 'Literal' && typeof test.value === 'string')
            add(test, 'native-command', test.value);
        }
    }
    if (node.type === 'NewExpression' && name(node.callee) === 'Worker')
      add(node, 'worker-start', text(source, node));
    if (node.type === 'CallExpression') {
      const callee = ast(node.callee),
        called = callee ? text(source, callee).replace(/\s+/g, '') : '';
      if (['setTimeout', 'setInterval', 'setImmediate'].includes(called))
        add(node, 'timer', called);
      const first = ast((node.arguments as unknown[])[0]);
      if (
        /(?:parentPort|port)\??\.on$/.test(called) &&
        first?.type === 'Literal' &&
        first.value === 'message'
      )
        add(node, 'worker-handler', called);
      if (
        path.startsWith('apps/server/') &&
        callee?.type === 'MemberExpression' &&
        ['exec', 'query', 'transaction'].includes(name(callee.property) ?? '')
      ) {
        const receiver = ast(callee.object),
          owner = receiver ? text(source, receiver) : '';
        if (/(?:^|\.)(?:db|database)$/.test(owner)) {
          const statement =
            first?.type === 'Literal' && typeof first.value === 'string'
              ? first.value.trim()
              : first?.type === 'TemplateLiteral'
                ? text(source, first).slice(1, 40).trim()
                : '';
          if (
            name(callee.property) === 'transaction' ||
            /^(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|BEGIN|COMMIT|ROLLBACK)\b/i.test(
              statement,
            )
          )
            add(
              node,
              'database-write',
              `${called}${statement ? ' ' + statement.slice(0, 80) : ''}`,
            );
        }
      }
    }
    for (const child of children(node)) visit(child);
  };
  visit(parse(source, path));
  return entries;
}

function sourceCounters(site: FunctionSite): string[] {
  const names = new Set<string>();
  const visit = (node: Ast) => {
    if (node !== site.node && functionNode(node)) return;
    if (node.type === 'CallExpression' && name(node.callee) === 'countDomainWork') {
      const first = ast((node.arguments as unknown[])[0]);
      if (first?.type === 'Literal' && typeof first.value === 'string') names.add(first.value);
    }
    for (const child of children(node)) visit(child);
  };
  for (const child of children(site.body)) visit(child);
  return [...names];
}
function applyEdits(source: string, start: number, end: number, edits: readonly Edit[]): string {
  const ordered = [...edits].sort(
    (a, b) => a.start - b.start || (a.order ?? 0) - (b.order ?? 0) || a.end - b.end,
  );
  let position = start,
    output = '';
  for (const edit of ordered) {
    if (edit.start < start || edit.end > end || edit.start < position)
      throw new Error('Overlapping or out-of-owner profiling source edit.');
    output += source.slice(position, edit.start) + edit.text;
    position = edit.end;
  }
  return output + source.slice(position, end);
}
function imports(path: string): string {
  const module = path.startsWith('packages/spatial/src/')
    ? posix.relative(posix.dirname(path), 'packages/spatial/src/diagnostic-measurements.js')
    : path.startsWith('packages/domain/src/')
      ? posix.relative(posix.dirname(path), 'packages/domain/src/diagnostic-measurements.js')
      : '@open-legend/domain/diagnostic-measurements';
  const specifier = module.startsWith('.') || module.startsWith('@') ? module : `./${module}`;
  const names = [
    'measurementsEnabled',
    'measurementSelected',
    'beginMeasurement',
    'endMeasurement',
    'resumeMeasurementIfPaused',
    'pauseMeasurement',
    'pauseMeasurementValue',
    'resumeMeasurementValue',
    'segmentMeasurementIterator',
    'segmentMeasurementAsyncIterable',
    'countMeasurementWork',
    'measurementWorkValue',
    'measurementOutputValue',
    'finishMeasurementReturn',
    'measurementResultOutcome',
  ];
  return `\nimport { ${names.map((value) => `${value} as __ol_${value}`).join(', ')} } from ${JSON.stringify(specifier)};\n`;
}
function sourceOutcome(expression: Ast | undefined): string | undefined {
  // A negative predicate or a fully drained host tick can return false after
  // successful work. Only declared result owners give booleans refusal meaning.
  if (expression?.type === 'CallExpression') {
    const called = name(expression.callee);
    if (called && ['reject', 'refuse', 'unavailable'].includes(called)) return 'refused';
  }
  if (expression?.type === 'ObjectExpression') {
    for (const property of expression.properties as unknown[]) {
      const member = ast(property),
        key = member && name(member.key),
        value = member && ast(member.value);
      if (key === 'ok' && value?.type === 'Literal' && value.value === false) return 'refused';
      if (
        key === 'status' &&
        value?.type === 'Literal' &&
        ['stale', 'cancelled', 'timeout', 'refused'].includes(String(value.value))
      )
        return String(value.value);
    }
  }
}

/** The observer's logical lifetime crosses shared preparation and round-robin
 * resumes. Its token stays paused outside that observer's actual code; shared
 * worker time belongs to the independent batch. Exact AST anchors deliberately
 * refuse preparation when this owner is reorganized. */
function instrumentSightObserverSource(path: string, source: string, scope: number): string {
  const functions = sites(source, path);
  const owner = functions.filter((site) => site.symbol === 'updateEncounters');
  const ray = functions.filter((site) => site.symbol === 'updateEncounters.@body:prepareRay');
  if (owner.length !== 1 || ray.length !== 1)
    throw new Error('Sight observer/ray logical owner must match exactly once.');
  const edits: Edit[] = [];
  let order = 0;
  const insert = (position: number, value: string) =>
    edits.push({ start: position, end: position, text: value, order: ++order });
  const surround = (start: number, end: number, prefix: string, suffix: string) => {
    const serial = ++order;
    edits.push({ start, end: start, text: prefix, order: serial });
    edits.push({ start: end, end, text: suffix, order: -serial });
  };
  const expressions: Ast[] = [],
    actorLoops: Ast[] = [],
    completionLoops: Ast[] = [],
    clean: Ast[] = [];
  const walk = (node: Ast) => {
    if (node !== owner[0]!.node && functionNode(node)) return;
    if (node.type === 'ExpressionStatement') {
      const expression = ast(node.expression);
      if (
        expression?.type === 'CallExpression' &&
        text(source, expression).replace(/\s+/g, '') === 'routine.set(id,timing)'
      )
        expressions.push(node);
      if (
        expression?.type === 'AssignmentExpression' &&
        text(source, expression).replace(/\s+/g, '') === 'timing.sight=false'
      )
        clean.push(node);
    }
    if (
      node.type === 'ForOfStatement' &&
      text(source, ast(node.right)!).replace(/\s+/g, '') === 'frame.observers'
    ) {
      const left = text(source, ast(node.left)!).replace(/\s+/g, '');
      if (left === 'constactor') actorLoops.push(node);
      if (left === 'constobserver') completionLoops.push(node);
    }
    for (const child of children(node)) walk(child);
  };
  walk(owner[0]!.node);
  if (
    expressions.length !== 1 ||
    actorLoops.length !== 2 ||
    completionLoops.length !== 1 ||
    clean.length !== 1
  )
    throw new Error('Sight observer admission/prepare/apply/complete anchors changed.');
  const rootBody = owner[0]!.body;
  insert(
    rootBody.range[0] + 1,
    `\nconst __ol_observerTokens = __ol_measurementsEnabled() && __ol_measurementSelected(${scope}) ? new Map<string, number>() : undefined; let __ol_observerFailure: 'error' | 'cancelled' = 'cancelled'; try {`,
  );
  insert(
    rootBody.range[1] - 1,
    `}catch(__ol_observerError){__ol_observerFailure='error';throw __ol_observerError;}finally{if(__ol_observerTokens)for(const __ol_token of __ol_observerTokens.values())__ol_endMeasurement(__ol_token,__ol_observerFailure);}\n`,
  );
  insert(
    expressions[0]!.range[1],
    `if(__ol_observerTokens){const __ol_token=__ol_beginMeasurement(${scope});__ol_pauseMeasurement(__ol_token);__ol_observerTokens.set(id,__ol_token);}`,
  );
  insert(
    clean[0]!.range[1],
    `if(__ol_observerTokens)__ol_countMeasurementWork(__ol_observerTokens.get(id)??0,1,5);`,
  );
  const segment = (node: Ast, token: string, makeLocal: boolean, finish: string) => {
    if (node.type !== 'BlockStatement')
      throw new Error('Sight observer segment requires its actual source block.');
    insert(
      node.range[0] + 1,
      `${makeLocal ? `const ${token}=__ol_observerTokens?.get(actor.id)??0;` : ''}if(${token})__ol_resumeMeasurementIfPaused(${token});try{`,
    );
    insert(
      node.range[1] - 1,
      `}finally{if(${token}){__ol_resumeMeasurementIfPaused(${token});${finish}}}`,
    );
    const visit = (value: Ast) => {
      if (value !== node && functionNode(value)) return;
      if (value.type === 'YieldExpression') {
        const argument = ast(value.argument);
        if (!argument) {
          edits.push({
            start: value.range[0],
            end: value.range[1],
            text: `__ol_resumeMeasurementValue(${token}, yield __ol_pauseMeasurementValue(${token},undefined))`,
          });
          return;
        }
        surround(value.range[0], value.range[1], `__ol_resumeMeasurementValue(${token}, `, ')');
        surround(
          argument.range[0],
          argument.range[1],
          value.delegate
            ? `__ol_segmentMeasurementIterator(${token}, `
            : `__ol_pauseMeasurementValue(${token}, `,
          ')',
        );
      }
      if (value.type === 'CatchClause')
        insert(
          ast(value.body)!.range[0] + 1,
          `if(${token})__ol_resumeMeasurementIfPaused(${token});`,
        );
      if (value.type === 'TryStatement' && ast(value.finalizer))
        insert(
          ast(value.finalizer)!.range[0] + 1,
          `if(${token})__ol_resumeMeasurementIfPaused(${token});`,
        );
      for (const child of children(value)) visit(child);
    };
    for (const child of children(node)) visit(child);
  };
  for (const loop of actorLoops)
    segment(
      ast(loop.body)!,
      '__ol_observerToken',
      true,
      '__ol_pauseMeasurement(__ol_observerToken);',
    );
  // Bracket actual iterator resumes OUTSIDE the generator body. Descendant
  // probe scopes therefore nest inside the resumed observer; a ray returning
  // DONE also pauses the observer before round-robin visits another one.
  const rayCall = ray[0]!.parent;
  if (rayCall?.type !== 'CallExpression' || ast(rayCall.callee) !== ray[0]!.node)
    throw new Error('Sight ray iterator construction anchor changed.');
  surround(
    rayCall.range[0],
    rayCall.range[1],
    '__ol_segmentMeasurementIterator(__ol_observerToken, ',
    ') as Generator<SightRay | undefined>',
  );
  const completion = ast(completionLoops[0]!.body)!;
  const completionStart = completion.range[0] + 1,
    completionEnd = completion.range[1] - 1;
  insert(
    completionStart,
    "const __ol_observerToken=__ol_observerTokens?.get(observer.id)??0;let __ol_observerOutcome:'success'|'error'='success';if(__ol_observerToken)__ol_resumeMeasurementIfPaused(__ol_observerToken);try{",
  );
  insert(
    completionEnd,
    `}catch(__ol_completionError){__ol_observerOutcome='error';throw __ol_completionError;}finally{if(__ol_observerToken){__ol_resumeMeasurementIfPaused(__ol_observerToken);__ol_endMeasurement(__ol_observerToken,__ol_observerOutcome);__ol_observerTokens!.delete(observer.id);}}`,
  );
  return applyEdits(source, 0, source.length, edits);
}

/** Bind each requested definition to exactly one real function or callback. The
 * complete instrumented source contains all sites; startup selection decides
 * which at-most-32 series run. The disabled branch is the ordinary body, with
 * independently selected nested probes retained. */
export function instrumentSource(
  path: string,
  source: string,
  definitions: readonly ProfilingDefinition[],
): SourceInstrumentation {
  const logical = definitions.flatMap((definition) =>
    definition.bindings
      .filter((binding) => binding.path === path && binding.logical)
      .map((binding) => ({ definition, binding })),
  );
  if (logical.length) {
    if (logical.length !== 1 || logical[0]!.binding.logical !== 'sight-observer')
      throw new Error(`Unsupported logical source boundaries: ${path}`);
    const original = sourceFunctionBindings(path, source);
    const authored = definitions.flatMap((definition) =>
      definition.bindings
        .filter((binding) => binding.path === path && !binding.installed)
        .map((binding) => {
          const matches = original.filter((candidate) => candidate.symbol === binding.symbol);
          if (matches.length !== 1)
            throw new Error(
              `${definition.id}: ${path}#${binding.symbol} matched ${matches.length} source boundaries.`,
            );
          const resolved = matches[0]!;
          if (binding.sourceHash && binding.sourceHash !== resolved.sourceHash)
            throw new Error(`Source changed after profiling binding: ${path}`);
          if (binding.anchorHash && binding.anchorHash !== resolved.anchorHash)
            throw new Error(`Function changed after profiling binding: ${binding.symbol}`);
          return { ...binding, ...resolved, id: definition.id, numericId: definition.numericId };
        }),
    );
    const changed = instrumentSightObserverSource(path, source, logical[0]!.definition.numericId);
    const remaining = definitions.map((definition) => ({
      ...definition,
      bindings: definition.bindings
        .filter((binding) => !binding.logical)
        .map(({ sourceHash: _sourceHash, anchorHash: _anchorHash, ...binding }) => binding),
    }));
    const result = instrumentSource(path, changed, remaining);
    if (!result.source.includes('measurementSelected as __ol_measurementSelected')) {
      const offset = result.source.startsWith('#!') ? result.source.indexOf('\n') + 1 : 0;
      result.source = result.source.slice(0, offset) + imports(path) + result.source.slice(offset);
      parse(result.source, path);
    }
    return { source: result.source, bindings: authored };
  }
  const wanted = definitions.flatMap((definition) =>
    definition.bindings
      .filter((binding) => binding.path === path && !binding.installed)
      .map((binding) => ({ definition, binding })),
  );
  const sqlOwners = PROFILING_SQL_OWNERS.filter((owner) => owner.site.path === path);
  if (!wanted.length && !sqlOwners.length) return { source, bindings: [] };
  if (source.includes('measurementSelected as __ol_measurementSelected'))
    throw new Error(`Source is already instrumented: ${path}`);
  const functions = sites(source, path),
    selected = new Map<Ast, { site: FunctionSite; definitions: ProfilingDefinition[] }>();
  const applied: AppliedProfilingBinding[] = [];
  const hash = createHash('sha256').update(source).digest('hex');
  for (const { definition, binding } of wanted) {
    const matches = functions.filter((site) => site.symbol === binding.symbol);
    if (matches.length !== 1)
      throw new Error(
        `${definition.id}: ${path}#${binding.symbol} matched ${matches.length} source boundaries.`,
      );
    const site = matches[0]!;
    const annotation = ast(ast(site.node.returnType)?.typeAnnotation);
    if (annotation?.type === 'TSTypeReference' && name(annotation.typeName) === 'PromiseLike')
      throw new Error(`Thenable return needs an explicit probe boundary: ${path}#${site.symbol}`);
    if (binding.sourceHash && binding.sourceHash !== hash)
      throw new Error(`Source changed after profiling binding: ${path}`);
    const anchor = createHash('sha256').update(text(source, site.node)).digest('hex');
    if (binding.anchorHash && binding.anchorHash !== anchor)
      throw new Error(`Function changed after profiling binding: ${binding.symbol}`);
    let owner = selected.get(site.node);
    if (!owner) selected.set(site.node, (owner = { site, definitions: [] }));
    owner.definitions.push(definition);
    applied.push({
      ...binding,
      id: definition.id,
      numericId: definition.numericId,
      sourceHash: hash,
      anchorHash: anchor,
      start: site.node.range[0],
      end: site.node.range[1],
      startLine: site.node.loc?.start.line,
      endLine: site.node.loc?.end.line,
      async: site.async,
      generator: site.generator,
    });
  }
  const sqlWrappers: string[] = [];
  const sqlExports: string[] = [];
  const sqlModuleEdits: Edit[] = [];
  for (const owner of sqlOwners) {
    const matches = functions.filter((site) => site.symbol === owner.site.symbol);
    if (matches.length !== 1)
      throw new Error(
        `SQL owner ${path}#${owner.site.symbol} matched ${matches.length} boundaries.`,
      );
    if (matches[0]!.generator)
      throw new Error(
        `SQL generator owner needs explicit caller attribution: ${owner.site.symbol}`,
      );
    const site = matches[0]!,
      serial = sqlWrappers.length + sqlExports.length,
      original = `__ol_sqlOriginal${serial}`,
      label = JSON.stringify(owner.owner);
    if (site.parent?.type === 'MethodDefinition') {
      const separator = site.symbol.lastIndexOf('.'),
        className = site.symbol.slice(0, separator),
        methodName = site.symbol.slice(separator + 1);
      if (!/^[A-Za-z_$][\w$]*$/.test(className) || !/^[A-Za-z_$][\w$]*$/.test(methodName))
        throw new Error(`SQL attribution needs an explicit method owner: ${site.symbol}`);
      sqlWrappers.push(
        `const ${original} = ${className}.prototype[${JSON.stringify(methodName)}];Object.defineProperty(${className}.prototype, ${JSON.stringify(methodName)}, {configurable:true,writable:true,value:function(this:${className},...__ol_args:Parameters<typeof ${original}>){return __ol_withDatabaseAttribution(${label},()=>Reflect.apply(${original},this,__ol_args));}});`,
      );
    } else if (
      site.node.type === 'FunctionDeclaration' &&
      name(site.node.id) === site.symbol &&
      site.parent?.type === 'ExportNamedDeclaration' &&
      ast(site.parent.declaration) === site.node
    ) {
      const prefix = source.slice(site.parent.range[0], site.node.range[0]);
      if (!/^export\b/.test(prefix))
        throw new Error(`SQL attribution export anchor changed: ${site.symbol}`);
      sqlModuleEdits.push({
        start: site.parent.range[0],
        end: site.node.range[0],
        text: prefix.replace(/^export\b/, ''),
      });
      // The two audited owners have no internal recursion or import-time
      // callers. Keep their original declarations hoisted, and export a typed
      // alias instead of assigning to a TypeScript function declaration.
      const exposed = `__ol_sqlExport${serial}`;
      sqlExports.push(
        `const ${exposed}: typeof ${site.symbol} = __ol_sqlProfilingEnabled() ? (...__ol_args:Parameters<typeof ${site.symbol}>)=>__ol_withDatabaseAttribution(${label},()=>${site.symbol}(...__ol_args)) : ${site.symbol};export {${exposed} as ${site.symbol}};`,
      );
    } else throw new Error(`SQL attribution needs an explicit caller: ${site.symbol}`);
  }
  const transformed = new Map<Ast, string>();
  // Children first: outer off paths must still run an independently selected
  // child, without duplicating calls or accidentally enabling descendant clocks.
  for (const site of [...functions].sort(
    (a, b) => a.body.range[1] - a.body.range[0] - (b.body.range[1] - b.body.range[0]),
  )) {
    const owner = selected.get(site.node);
    const childEdits: Edit[] = [];
    const visitChildren = (node: Ast) => {
      if (node !== site.node && functionNode(node)) {
        const body = ast(node.body),
          replacement = body && transformed.get(node);
        if (body && replacement) {
          childEdits.push({ start: body.range[0], end: body.range[1], text: replacement });
          return;
        }
      }
      for (const child of children(node)) visitChildren(child);
    };
    for (const child of children(site.body)) visitChildren(child);
    const start = site.body.range[0] + 1,
      end = site.body.range[1] - 1;
    const ordinary = applyEdits(source, start, end, childEdits);
    if (!owner) {
      if (childEdits.length) transformed.set(site.node, `{${ordinary}}`);
      continue;
    }
    const resultOwner = owner.definitions.flatMap((definition) =>
      definition.bindings.filter(
        (binding) => binding.path === path && binding.symbol === site.symbol && binding.resultKind,
      ),
    )[0];
    const tokens = owner.definitions.map((definition) => `__ol_t${definition.numericId}`);
    const first = tokens[0]!;
    const edits: Edit[] = [...childEdits];
    let sequence = 0;
    const surround = (start: number, end: number, prefix: string, suffix: string) => {
      const order = ++sequence;
      edits.push({ start, end: start, text: prefix, order });
      edits.push({ start: end, end, text: suffix, order: -order });
    };
    const insert = (position: number, value: string) =>
      edits.push({ start: position, end: position, text: value, order: ++sequence });
    const predicate = (definition: ProfilingDefinition) => {
      const filter = definition.bindings.find(
        (binding) => binding.path === path && binding.symbol === site.symbol,
      )?.filter;
      const selected = `__ol_measurementSelected(${definition.numericId})`;
      return filter
        ? `${selected} && (${filter.values.map((value) => `(${filter.expression}) === ${JSON.stringify(value)}`).join(' || ')})`
        : selected;
    };
    const begin = owner.definitions
      .map(
        (definition, index) =>
          `const ${tokens[index]} = (${predicate(definition)}) ? __ol_beginMeasurement(${definition.numericId}, 1${index ? `, ${tokens[index - 1]}` : ''}) : 0;`,
      )
      .join('\n');
    const resume = tokens.map((token) => `__ol_resumeMeasurementIfPaused(${token});`).join('');
    const pause = [...tokens]
      .reverse()
      .map((token) => `__ol_pauseMeasurement(${token});`)
      .join('');
    const count = (dimension: number, amount = '1') =>
      tokens
        .map((token) => `__ol_countMeasurementWork(${token}, ${amount}, ${dimension});`)
        .join('');
    const wrapValue = (expression: Ast, operation: string) => {
      const prefix = [...tokens]
        .reverse()
        .map((token) => `__ol_${operation}(${token}, `)
        .join('');
      surround(expression.range[0], expression.range[1], prefix, ')'.repeat(tokens.length));
    };
    const visit = (node: Ast, parent?: Ast) => {
      if (node !== site.node && functionNode(node)) return;
      if (node.type === 'AwaitExpression') {
        const argument = ast(node.argument)!;
        wrapValue(node, 'resumeMeasurementValue');
        // Inner token pauses before the enclosing parent token.
        const prefix = tokens.map((token) => `__ol_pauseMeasurementValue(${token}, `).join('');
        surround(argument.range[0], argument.range[1], prefix, ')'.repeat(tokens.length));
      }
      if (node.type === 'YieldExpression') {
        const argument = ast(node.argument);
        if (!argument) {
          edits.push({
            start: node.range[0],
            end: node.range[1],
            text: `${[...tokens]
              .reverse()
              .map((token) => `__ol_resumeMeasurementValue(${token}, `)
              .join(
                '',
              )}yield ${tokens.map((token) => `__ol_pauseMeasurementValue(${token}, `).join('')}undefined${')'.repeat(tokens.length * 2)}`,
          });
          return;
        }
        wrapValue(node, 'resumeMeasurementValue');
        if (node.delegate && argument) {
          // yield* forwards return/throw and may itself yield from finally.
          const helper = site.async
            ? 'segmentMeasurementAsyncIterable'
            : 'segmentMeasurementIterator';
          surround(
            argument.range[0],
            argument.range[1],
            tokens.map((token) => `__ol_${helper}(${token}, `).join(''),
            ')'.repeat(tokens.length),
          );
        } else if (argument) {
          const prefix = tokens.map((token) => `__ol_pauseMeasurementValue(${token}, `).join('');
          surround(argument.range[0], argument.range[1], prefix, ')'.repeat(tokens.length));
        } else {
          insert(
            node.range[1],
            ` (${tokens.map((token) => `__ol_pauseMeasurementValue(${token}, `).join('')}undefined${')'.repeat(tokens.length)})`,
          );
        }
      }
      if (node.type === 'CatchClause') {
        const body = ast(node.body)!;
        insert(body.range[0] + 1, resume);
      }
      if (node.type === 'TryStatement') {
        const finalizer = ast(node.finalizer);
        if (finalizer) insert(finalizer.range[0] + 1, resume);
      }
      if (
        [
          'ForStatement',
          'ForOfStatement',
          'ForInStatement',
          'WhileStatement',
          'DoWhileStatement',
        ].includes(node.type)
      ) {
        const body = ast(node.body)!;
        if (node.type === 'ForOfStatement' && node.await === true) {
          if (parent?.type === 'LabeledStatement')
            throw new Error(
              `Labeled for-await needs an explicit probe boundary: ${path}#${site.symbol}`,
            );
          const right = ast(node.right)!;
          surround(node.range[0], node.range[1], '{try{', `}finally{${resume}}}`);
          surround(
            right.range[0],
            right.range[1],
            tokens.map((token) => `__ol_segmentMeasurementAsyncIterable(${token}, `).join(''),
            ')'.repeat(tokens.length),
          );
          const bodyStart = body.type === 'BlockStatement' ? body.range[0] + 1 : body.range[0];
          const bodyEnd = body.type === 'BlockStatement' ? body.range[1] - 1 : body.range[1];
          surround(
            bodyStart,
            bodyEnd,
            `${body.type === 'BlockStatement' ? '' : '{'}${resume}try{${count(1)}`,
            `}finally{${resume}${pause}}${body.type === 'BlockStatement' ? '' : '}'}`,
          );
        } else if (body.type === 'BlockStatement') {
          insert(body.range[0] + 1, count(1));
        } else {
          surround(body.range[0], body.range[1], `{${count(1)}`, '}');
        }
      }
      if (node.type === 'ReturnStatement') {
        if (!site.generator && (site.async || site.promise) && ast(node.argument)) {
          const returned = ast(node.argument)!;
          surround(returned.range[0], returned.range[1], '(__ol_returned = (', '))');
        }
        if (!site.generator && (site.async || site.promise) && !ast(node.argument))
          edits.push({
            start: node.range[0],
            end: node.range[1],
            text: 'return (__ol_returned = undefined);',
          });
        if (
          resultOwner &&
          !resultOwner.resultExpression &&
          !site.async &&
          !site.promise &&
          ast(node.argument)
        ) {
          const returned = ast(node.argument)!;
          surround(returned.range[0], returned.range[1], '__ol_returnedValue(', ')');
        }
        const argument = ast(node.argument),
          outcome = sourceOutcome(argument);
        if (argument) {
          const outcomePrefix = outcome ? `(__ol_outcome = ${JSON.stringify(outcome)}, ` : '';
          const knownPlainArray =
            argument.type === 'ArrayExpression' ||
            (argument.type === 'CallExpression' &&
              ['map', 'filter', 'flatMap', 'slice', 'concat'].includes(
                name(ast(argument.callee)?.property) ?? '',
              ));
          if (knownPlainArray)
            surround(
              argument.range[0],
              argument.range[1],
              `${outcomePrefix}${tokens.map((token) => `__ol_measurementOutputValue(${token}, `).join('')}`,
              `${')'.repeat(tokens.length)}${outcome ? ')' : ''}`,
            );
          else if (outcome) surround(argument.range[0], argument.range[1], outcomePrefix, ')');
        }
      }
      if (node.type === 'CallExpression' && name(node.callee) === 'countDomainWork') {
        const args = node.arguments as unknown[],
          named = ast(args[0]);
        if (named?.type === 'Literal' && typeof named.value === 'string') {
          const counters = owner.definitions.flatMap((definition, index) => {
            const dimension = definition.dimensions.indexOf(String(named.value));
            return dimension < 0 ? [] : [{ token: tokens[index]!, dimension }];
          });
          if (counters.length) {
            const argument = ast(args[1]);
            if (argument)
              surround(
                argument.range[0],
                argument.range[1],
                counters.map(({ token }) => `__ol_measurementWorkValue(${token}, `).join(''),
                [...counters]
                  .reverse()
                  .map(({ dimension }) => `, ${dimension})`)
                  .join(''),
              );
            else
              insert(
                node.range[1] - 1,
                `, ${counters.map(({ token }) => `__ol_measurementWorkValue(${token}, `).join('')}1${[
                  ...counters,
                ]
                  .reverse()
                  .map(({ dimension }) => `, ${dimension})`)
                  .join('')}`,
              );
          }
        }
      }
      for (const child of children(node)) visit(child, node);
    };
    for (const child of children(site.body)) visit(child, site.body);
    const measured = applyEdits(source, start, end, edits);
    const selectedExpression = `__ol_measurementsEnabled() && (${owner.definitions.map((definition) => `(${predicate(definition)})`).join(' || ')})`;
    const finish = [...tokens]
      .reverse()
      .map((token) => `__ol_endMeasurement(${token}, __ol_outcome);`)
      .join('');
    const prefix = `${begin}\nlet __ol_outcome: 'success' | 'refused' | 'error' | 'cancelled' | 'timeout' | 'stale' = 'success';\n${resultOwner && !resultOwner.resultExpression && !site.async && !site.promise ? `const __ol_returnedValue = <T,>(value:T):T => {__ol_outcome=__ol_measurementResultOutcome(value,${JSON.stringify(resultOwner.resultKind)},__ol_outcome);return value;};` : ''}`;
    let instrumentedBody: string;
    if (!site.generator && (site.async || site.promise)) {
      const observed = [...tokens]
        .reverse()
        .map(
          (token) =>
            `if(${token})__ol_finishMeasurementReturn(${token}, __ol_returned, () => ${resultOwner?.resultExpression ? `__ol_measurementResultOutcome(${resultOwner.resultExpression},${JSON.stringify(resultOwner.resultKind)},__ol_outcome)` : '__ol_outcome'}${resultOwner && !resultOwner.resultExpression ? `, ${JSON.stringify(resultOwner.resultKind)}` : ''});`,
        )
        .join('');
      // Keep the actual async body in this function. An async IIFE followed by
      // returning its promise adds adoption jobs and changes continuation order.
      // Capture only the winning return value, after original finally blocks.
      instrumentedBody = `${prefix}let __ol_returned: unknown;try{${measured}}catch(__ol_error){__ol_outcome='error';throw __ol_error;}finally{${resume}${pause}if(__ol_outcome==='error'){${finish}}else{${observed}}}`;
    } else
      instrumentedBody = `${prefix}try{${measured}}catch(__ol_error){__ol_outcome='error';throw __ol_error;}finally{${resume}${resultOwner?.resultExpression ? `__ol_outcome=__ol_measurementResultOutcome(${resultOwner.resultExpression},${JSON.stringify(resultOwner.resultKind)},__ol_outcome);` : ''}${finish}}`;
    transformed.set(
      site.node,
      `{if (${selectedExpression}) {${instrumentedBody}}else{${ordinary}}}`,
    );
  }
  const outer: Edit[] = [...sqlModuleEdits];
  const replacementByStart = new Map(
    [...transformed].map(([node, replacement]) => [node.range[0], replacement]),
  );
  const visit = (node: Ast) => {
    if (functionNode(node)) {
      const body = ast(node.body),
        replacement = body && replacementByStart.get(node.range[0]);
      if (body && replacement) {
        outer.push({ start: body.range[0], end: body.range[1], text: replacement });
        return;
      }
    }
    for (const child of children(node)) visit(child);
  };
  visit(parse(source, path));
  const instrumented = applyEdits(source, 0, source.length, outer);
  const offset = instrumented.startsWith('#!') ? instrumented.indexOf('\n') + 1 : 0;
  const sqlImport = sqlOwners.length
    ? `\nimport { sqlProfilingEnabled as __ol_sqlProfilingEnabled, withDatabaseAttribution as __ol_withDatabaseAttribution } from './performance.js';\n`
    : '';
  const output =
    instrumented.slice(0, offset) +
    imports(path) +
    sqlImport +
    instrumented.slice(offset) +
    // Startup selection precedes application imports. Keep original async
    // functions intact: an async wrapper would add promise-adoption jobs even
    // when its body returned the same promise. Default-off imports allocate no
    // forwarding wrappers or attribution callbacks.
    (sqlWrappers.length ? `\nif (__ol_sqlProfilingEnabled()) {${sqlWrappers.join('\n')}}\n` : '') +
    sqlExports.join('\n');
  // Parsing the prepared source is an offline syntax/anchor operation, not a
  // runtime equivalence check. Execution acceptance deliberately remains open.
  parse(output, path);
  return { source: output, bindings: applied };
}
