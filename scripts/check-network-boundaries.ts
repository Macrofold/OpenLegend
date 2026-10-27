import * as ts from 'typescript/unstable/ast';
import { API, type Checker, type Symbol, type Type } from 'typescript/unstable/sync';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { browserRequestPolicies } from '../apps/client/src/network-policies.js';
import {
  acquisitionObservers,
  continuousBrowserPaths,
  dynamicModuleOwners,
  fixtureToolOwners,
  generatedNetworkArtifacts,
  inboundOwners,
  localDependencies,
  localGitCommands,
  localNodeEntries,
  localProcessOwners,
  networkDependencies,
  rawNetworkOwners,
  sdkOwners,
  testSourceOwners,
} from './network-boundary-inventory.js';

export interface BoundaryFailure {
  path: string;
  line: number;
  message: string;
}
export interface NetworkSource {
  path: string;
  source: string;
}
const restricted = new Set(['fetch', 'EventSource', 'XMLHttpRequest', 'WebSocket']);
const executable = new Set(['eval', 'Function']);
const acquired = new Set([...restricted, ...executable]);
const globals = new Set(['globalThis', 'window', 'self', 'global']);
const rawTypes = new Set(['NetworkFetch', 'FetchTransport']);
const fixture = (path: string) =>
  path.startsWith('tests/') ||
  /\.test\.[cm]?[jt]sx?$/.test(path) ||
  Object.hasOwn(testSourceOwners, path);
const sdk = (name: string) =>
  /^@(?:aws-sdk|smithy|modelcontextprotocol)\//.test(name) ||
  name === '@playwright/test' ||
  /^(?:openid-client|undici|axios|got|node-fetch|cross-fetch|ws|eventsource|xmlhttprequest)(?:\/|$)/.test(
    name,
  );
const libraryDeclaration = (path: string) =>
  /(?:lib\..*\.d\.ts|@types\/node|undici-types)/.test(path);
const portable = (path: string) => path.replaceAll('\\', '/');
const processes = new Set(['node:child_process', 'child_process']);

function unwrap(node: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertion(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    node = node.expression;
  return node;
}
function memberName(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): string | undefined {
  return ts.isPropertyAccessExpression(node)
    ? node.name.text
    : node.argumentExpression && ts.isStringLiteralLikeNode(node.argumentExpression)
      ? node.argumentExpression.text
      : undefined;
}
function literalValues(node: ts.Expression, checker?: Checker): readonly string[] | undefined {
  node = unwrap(node);
  if (ts.isStringLiteralLikeNode(node)) return [node.text];
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literalValues(node.left, checker),
      right = literalValues(node.right, checker);
    return left && right && left.length * right.length <= 256
      ? left.flatMap((a) => right.map((b) => a + b))
      : undefined;
  }
  if (ts.isTemplateExpression(node)) {
    let values = [node.head.text];
    for (const span of node.templateSpans) {
      const next = literalValues(span.expression, checker);
      if (!next || values.length * next.length > 256) return undefined;
      values = values.flatMap((prefix) => next.map((value) => prefix + value + span.literal.text));
    }
    return values;
  }
  const type = checker?.getTypeAtLocation(node);
  if (type?.isStringLiteralType()) return [type.value];
  if (type?.isUnionType() && type.getTypes().every((part) => part.isStringLiteralType()))
    return type.getTypes().flatMap((part) => (part.isStringLiteralType() ? [part.value] : []));
  return undefined;
}

/** Acquisition is checked before a renamed function can hide its later call. */
export function inspectNetworkSource(
  path: string,
  _source: string,
  checker: Checker | undefined,
  file: ts.SourceFile,
): BoundaryFailure[] {
  const failures: BoundaryFailure[] = [];
  const raw = Object.hasOwn(rawNetworkOwners, path),
    test = fixture(path);
  const observer = Object.hasOwn(acquisitionObservers, path);
  const report = (node: ts.Node, message: string) =>
    failures.push({
      path,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      message,
    });
  const symbolIsGlobal = (symbol: Symbol | undefined) =>
    !symbol?.declarations.length ||
    symbol.declarations.every((value) => {
      const declaration = value.resolve();
      // A dependency may augment a global's type without replacing its value.
      return (
        (declaration &&
          (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration))) ||
        libraryDeclaration(declaration?.getSourceFile().fileName ?? value.path)
      );
    });
  const globalReference = (node: ts.Identifier) =>
    !checker ||
    symbolIsGlobal(
      ts.isShorthandPropertyAssignment(node.parent)
        ? checker.getShorthandAssignmentValueSymbol(node.parent)
        : checker.getSymbolAtLocation(node),
    );
  const globalObject = (expression: ts.Expression): boolean => {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression))
      return globals.has(expression.text) && globalReference(expression);
    return (
      (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
      globals.has(memberName(expression) ?? '') &&
      globalObject(expression.expression)
    );
  };
  const transportType = (type: Type | undefined, seen = new Set<number>()): boolean => {
    if (!type || seen.has(type.id)) return false;
    seen.add(type.id);
    if (type.isUnionType() || type.isIntersectionType())
      return type.getTypes().some((part) => transportType(part, seen));
    const symbol = type.getAliasSymbol() ?? type.getSymbol();
    if (!symbol) return false;
    if (rawTypes.has(symbol.name) || (restricted.has(symbol.name) && symbolIsGlobal(symbol)))
      return true;
    return (
      !!checker &&
      symbol.declarations.some((handle) => {
        const declaration = handle.resolve();
        return (
          declaration &&
          ts.isTypeAliasDeclaration(declaration) &&
          ts.isTypeReferenceNode(declaration.type) &&
          transportType(checker.getTypeAtLocation(declaration.type), seen)
        );
      })
    );
  };
  const inspectImport = (node: ts.Node, name: string, typeOnly = false) => {
    if (
      !test &&
      !Object.hasOwn(fixtureToolOwners, path) &&
      (/(?:^|\/)(?:tests|test-fixtures)\//.test(name) || /\.test(?:\.|$)/.test(name))
    )
      report(node, 'Production source cannot import fixture network authority.');
    if (test) return;
    if (
      /^[a-z][a-z0-9+.-]*:/i.test(name) &&
      !name.startsWith('node:') &&
      !name.startsWith('virtual:')
    )
      report(
        node,
        'Executable URL imports bypass reviewed local source and bounded network ownership.',
      );
    // Resolve relative spellings too: the internal raw-body adapter must not
    // become an alternative API merely by reaching it through a source path.
    const target = portable(
      name.startsWith('.') ? resolve('/', dirname(path.split('#')[0] ?? path), name) : name,
    );
    if (
      !path.startsWith('packages/network/') &&
      (/(?:^|\/)packages\/network\/src\//.test(target) ||
        (name.startsWith('@open-legend/network/') &&
          !['@open-legend/network/node', '@open-legend/network/sdk'].includes(name)))
    )
      report(node, 'Consume the network package through its reviewed public entrypoints.');
    if (typeOnly) return;
    if (
      !name.startsWith('.') &&
      !name.startsWith('/') &&
      !name.startsWith('node:') &&
      !name.startsWith('@open-legend/')
    ) {
      const dependency = name.startsWith('@')
        ? name.split('/').slice(0, 2).join('/')
        : (name.split('/')[0] ?? name);
      if (
        !Object.hasOwn(networkDependencies, dependency) &&
        !Object.hasOwn(localDependencies, dependency) &&
        !['http', 'https', 'http2', 'net', 'tls', 'dns', 'dgram', 'child_process'].includes(
          dependency,
        )
      )
        report(
          node,
          `Runtime dependency ${dependency} needs a reviewed networking classification.`,
        );
    }
    if (sdk(name) && !sdkOwners[path]?.includes(name))
      report(node, `Networking dependency ${name} belongs in its exact reviewed SDK adapter.`);
    if (/^(?:node:)?(?:http|https|http2|net|tls|dgram|dns)(?:\/|$)/.test(name) && !raw) {
      if (
        !Object.hasOwn(inboundOwners, path) ||
        !ts.isImportDeclaration(node) ||
        !node.importClause
      )
        report(
          node,
          'Node network imports require an exact incoming server-symbol boundary or owned outgoing adapter.',
        );
      else {
        const bindings = node.importClause.namedBindings;
        if (
          !bindings ||
          !ts.isNamedImports(bindings) ||
          bindings.elements.some(
            (value) =>
              ![
                'createServer',
                'IncomingMessage',
                'ServerResponse',
                'Server',
                'ServerOptions',
              ].includes((value.propertyName ?? value.name).text),
          )
        )
          report(node, 'Incoming owners may import only incoming server symbols.');
      }
    }
    if (processes.has(name) && !raw) {
      if (!Object.hasOwn(localProcessOwners, path))
        report(
          node,
          'Child processes require the owned remote runner or an inventoried local-only runner.',
        );
      else if (
        !ts.isImportDeclaration(node) ||
        node.importClause?.name ||
        !node.importClause?.namedBindings ||
        !ts.isNamedImports(node.importClause.namedBindings)
      )
        report(node, 'Local subprocess owners must import explicit reviewed process functions.');
    }
  };
  const childFunctions = new Map<string, string>();
  for (const statement of file.statements)
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      processes.has(statement.moduleSpecifier.text)
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          childFunctions.set(element.name.text, (element.propertyName ?? element.name).text);
    }
  const processFunction = (
    expression: ts.Expression,
    seen = new Set<string>(),
  ): string | undefined => {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression)) {
      if (seen.has(expression.text)) return undefined;
      seen.add(expression.text);
      const direct = childFunctions.get(expression.text);
      if (
        direct &&
        (!checker ||
          checker.getSymbolAtLocation(expression)?.declarations.some((handle) => {
            const declaration = handle.resolve();
            return declaration && ts.isImportSpecifier(declaration);
          }))
      )
        return direct;
      for (const handle of checker?.getSymbolAtLocation(expression)?.declarations ?? []) {
        const declaration = handle.resolve();
        if (
          declaration &&
          ts.isVariableDeclaration(declaration) &&
          declaration.initializer &&
          ts.isIdentifier(declaration.initializer)
        )
          return processFunction(declaration.initializer, seen);
        if (
          declaration &&
          ts.isVariableDeclaration(declaration) &&
          declaration.initializer &&
          ts.isCallExpression(declaration.initializer) &&
          ts.isIdentifier(declaration.initializer.expression) &&
          declaration.initializer.expression.text === 'promisify'
        ) {
          const target = declaration.initializer.arguments[0];
          if (target && ts.isIdentifier(target)) return childFunctions.get(target.text);
        }
      }
    }
    if (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'promisify'
    ) {
      const target = expression.arguments[0];
      if (target && ts.isIdentifier(target)) return childFunctions.get(target.text);
    }
    return undefined;
  };
  const declarationOf = (node: ts.Identifier) =>
    checker?.getSymbolAtLocation(node)?.declarations[0]?.resolve();
  const referenceCache = new Map<ts.Node, ts.Identifier[]>();
  const referencesTo = (declaration: ts.Node): ts.Identifier[] => {
    const cached = referenceCache.get(declaration);
    if (cached) return cached;
    const references: ts.Identifier[] = [];
    const scan = (node: ts.Node) => {
      if (ts.isIdentifier(node) && declarationOf(node) === declaration) references.push(node);
      node.forEachChild(scan);
    };
    scan(file);
    referenceCache.set(declaration, references);
    return references;
  };
  const safeArgvBinding = (
    declaration: ts.VariableDeclaration,
    seen = new Set<ts.Node>(),
  ): boolean => {
    if (seen.has(declaration)) return false;
    seen = new Set(seen).add(declaration);
    return referencesTo(declaration).every((reference) => {
      const parent = reference.parent;
      if (reference === declaration.name || ts.isSpreadElement(parent)) return true;
      if (ts.isVariableDeclaration(parent) && parent.initializer === reference)
        return (
          ts.isVariableDeclarationList(parent.parent) &&
          (parent.parent.flags & ts.NodeFlags.Const) !== 0 &&
          safeArgvBinding(parent, seen)
        );
      return (
        ts.isCallExpression(parent) &&
        !!(processFunction(parent.expression) || forwardedParameters(parent.expression).length)
      );
    });
  };
  // Resolve only constant argv and direct local forwarding functions. Unknown
  // data after a proven command is harmless; an unknown command is never local.
  const argv = (
    expression: ts.Expression,
    seen = new Set<ts.Node>(),
  ): readonly (readonly (ts.Expression | undefined)[])[] | undefined => {
    expression = unwrap(expression);
    if (seen.has(expression)) return undefined;
    seen = new Set(seen).add(expression);
    if (ts.isArrayLiteralExpression(expression)) {
      let values: (ts.Expression | undefined)[] = [];
      for (const element of expression.elements) {
        if (ts.isSpreadElement(element)) {
          const spread = argv(element.expression, seen);
          values = [...values, ...(spread?.length === 1 ? spread[0]! : [undefined])];
        } else values.push(ts.isOmittedExpression(element) ? undefined : element);
      }
      return [values];
    }
    if (!ts.isIdentifier(expression)) return undefined;
    const declaration = declarationOf(expression);
    if (
      declaration &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer &&
      ts.isVariableDeclarationList(declaration.parent) &&
      (declaration.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      // A const array may still be mutated or escape into an unreviewed helper.
      if (!safeArgvBinding(declaration)) return undefined;
      return argv(declaration.initializer, seen);
    }
    if (declaration && ts.isParameterDeclaration(declaration)) {
      const owner = declaration.parent;
      if (!ts.isFunctionDeclaration(owner) && !ts.isArrowFunction(owner)) return undefined;
      if (
        referencesTo(declaration).some(
          (reference) =>
            reference !== declaration.name &&
            !(
              ts.isCallExpression(reference.parent) && processFunction(reference.parent.expression)
            ),
        )
      )
        return undefined;
      const name = ts.isFunctionDeclaration(owner)
        ? owner.name
        : ts.isArrowFunction(owner) &&
            ts.isVariableDeclaration(owner.parent) &&
            ts.isIdentifier(owner.parent.name)
          ? owner.parent.name
          : undefined;
      const binding = name && declarationOf(name);
      if (!name || !binding) return undefined;
      const calls: ts.CallExpression[] = [];
      for (const reference of referencesTo(binding)) {
        if (reference === name) continue;
        if (!ts.isCallExpression(reference.parent) || reference.parent.expression !== reference)
          return undefined;
        calls.push(reference.parent);
      }
      const index = owner.parameters.indexOf(declaration);
      const values = calls.flatMap((call) =>
        declaration.dotDotDotToken
          ? [call.arguments.slice(index)]
          : call.arguments[index]
            ? (argv(call.arguments[index]!, seen) ?? [])
            : [],
      );
      return values.length === calls.length && values.length > 0 ? values : undefined;
    }
    return undefined;
  };
  const forwardedParameters = (expression: ts.Expression): readonly ts.ParameterDeclaration[] => {
    if (!ts.isIdentifier(expression)) return [];
    const declaration = declarationOf(expression);
    const owner =
      declaration &&
      (ts.isFunctionDeclaration(declaration)
        ? declaration
        : ts.isVariableDeclaration(declaration) &&
            declaration.initializer &&
            ts.isArrowFunction(declaration.initializer)
          ? declaration.initializer
          : undefined);
    if (!owner?.body) return [];
    const parameters = new Set<ts.ParameterDeclaration>();
    const scan = (node: ts.Node) => {
      if (ts.isCallExpression(node) && processFunction(node.expression)) {
        const args = node.arguments[1];
        const parameter = args && ts.isIdentifier(args) && declarationOf(args);
        if (parameter && ts.isParameterDeclaration(parameter) && parameter.parent === owner)
          parameters.add(parameter);
      }
      node.forEachChild(scan);
    };
    scan(owner.body);
    return [...parameters];
  };
  const stringAt = (value: ts.Expression | undefined) => value && literalValues(value, checker);
  const exactLiteral = (expression: ts.Expression | undefined, expected: string): boolean => {
    const values = stringAt(expression);
    return !!values?.length && values.every((value) => value === expected);
  };
  const localEntry = (expression: ts.Expression | undefined, entry: string): boolean => {
    if (
      !expression ||
      !ts.isCallExpression(expression) ||
      !ts.isIdentifier(expression.expression) ||
      expression.expression.text !== 'fileURLToPath'
    )
      return false;
    const declaration = declarationOf(expression.expression);
    const imported =
      declaration &&
      ts.isImportSpecifier(declaration) &&
      (declaration.propertyName ?? declaration.name).text === 'fileURLToPath' &&
      declaration.parent.parent.parent;
    if (
      !imported ||
      !ts.isImportDeclaration(imported) ||
      !ts.isStringLiteral(imported.moduleSpecifier) ||
      imported.moduleSpecifier.text !== 'node:url'
    )
      return false;
    const input = expression.arguments[0];
    if (entry === 'self') return input?.getText(file) === 'import.meta.url';
    return (
      !!input &&
      ts.isNewExpression(input) &&
      ts.isIdentifier(input.expression) &&
      input.expression.text === 'URL' &&
      globalReference(input.expression) &&
      input.arguments?.length === 2 &&
      exactLiteral(input.arguments[0], entry) &&
      input.arguments[1]?.getText(file) === 'import.meta.url'
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
      inspectImport(
        node,
        node.moduleSpecifier.text,
        node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword,
      );
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      inspectImport(node, node.moduleSpecifier.text, node.isTypeOnly);
    if (ts.isTypeNode(node)) return;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const name = node.arguments[0];
      if (name && ts.isStringLiteralLikeNode(name)) inspectImport(node, name.text);
      else if (!test && !Object.hasOwn(dynamicModuleOwners, path))
        report(node, 'Dynamic module loading needs an exact reviewed local-source owner.');
    }
    if (!raw && !test) {
      if (
        ts.isIdentifier(node) &&
        Object.hasOwn(localProcessOwners, path) &&
        processFunction(node)
      ) {
        const parent = node.parent;
        const direct = ts.isCallExpression(parent) && parent.expression === node;
        const alias =
          ts.isVariableDeclaration(parent) &&
          (parent.name === node ||
            (parent.initializer === node &&
              ts.isVariableDeclarationList(parent.parent) &&
              (parent.parent.flags & ts.NodeFlags.Const) !== 0));
        const promisified =
          ts.isCallExpression(parent) &&
          ts.isIdentifier(parent.expression) &&
          parent.expression.text === 'promisify' &&
          parent.arguments[0] === node;
        if (!direct && !alias && !promisified && !ts.isImportSpecifier(parent))
          report(
            node,
            'Local subprocess functions may only be called directly or forwarded by a reviewed constant alias.',
          );
      }
      if (ts.isIdentifier(node) && acquired.has(node.text) && globalReference(node)) {
        const parent = node.parent;
        const key =
          (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isMethodDeclaration(parent) && parent.name === node) ||
          ts.isPropertySignatureDeclaration(parent) ||
          ts.isImportSpecifier(parent);
        const declaration =
          (ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isParameterDeclaration(parent) && parent.name === node);
        if (
          !key &&
          !declaration &&
          (executable.has(node.text) ||
            !observer ||
            (ts.isCallExpression(parent) && parent.expression === node))
        )
          report(node, `Acquire ${node.text} only inside the shared network boundary.`);
      }
      if (
        (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
        globalObject(node.expression)
      ) {
        const name = memberName(node);
        const invokes =
          (ts.isCallExpression(node.parent) && node.parent.expression === node) ||
          (ts.isNewExpression(node.parent) && node.parent.expression === node);
        if (
          (name === undefined || acquired.has(name)) &&
          (executable.has(name ?? '') || !observer || invokes)
        )
          report(
            node,
            'Raw global network acquisition/dynamic escape requires the shared boundary.',
          );
      }
      if (ts.isIdentifier(node) && globals.has(node.text) && globalReference(node)) {
        let value: ts.Node = node;
        while (
          ts.isParenthesizedExpression(value.parent) ||
          ts.isAsExpression(value.parent) ||
          ts.isTypeAssertion(value.parent) ||
          ts.isNonNullExpression(value.parent)
        )
          value = value.parent;
        const parent = value.parent;
        const escape =
          (ts.isVariableDeclaration(parent) &&
            parent.initializer === value &&
            !ts.isObjectBindingPattern(parent.name)) ||
          (ts.isPropertyAssignment(parent) && parent.initializer === value) ||
          ts.isShorthandPropertyAssignment(parent) ||
          ts.isReturnStatement(parent) ||
          ts.isSpreadAssignment(parent) ||
          (ts.isBinaryExpression(parent) &&
            parent.right === value &&
            parent.operatorToken.kind === ts.SyntaxKind.EqualsToken);
        if (escape && !observer)
          report(node, 'Do not alias or export the global network-bearing object.');
      }
      if (ts.isObjectBindingPattern(node) && ts.isVariableDeclaration(node.parent)) {
        const initial = node.parent.initializer;
        if (
          initial &&
          globalObject(initial) &&
          node.elements.some(
            (element) =>
              element.dotDotDotToken ||
              (element.propertyName && ts.isComputedPropertyName(element.propertyName)) ||
              acquired.has(
                ((element.propertyName ?? element.name)?.getText(file) ?? '').replace(
                  /^['"]|['"]$/g,
                  '',
                ),
              ),
          )
        )
          report(node, 'Destructured raw network acquisition bypasses the shared boundary.');
      }
      if (
        checker &&
        (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        node.expression &&
        transportType(checker.getTypeAtLocation(node.expression))
      )
        report(node, 'Injected/global raw transport must be invoked by the shared adapter.');
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        const receiver = node.expression.expression.text,
          method = node.expression.name.text,
          target = node.arguments[0],
          key = node.arguments[1];
        if (
          target &&
          globalObject(target) &&
          ((receiver === 'Reflect' && method === 'get') ||
            (receiver === 'Object' &&
              [
                'getOwnPropertyDescriptor',
                'getOwnPropertyDescriptors',
                'entries',
                'values',
              ].includes(method))) &&
          (!key || !ts.isStringLiteralLikeNode(key) || acquired.has(key.text))
        )
          report(node, 'Reflective network acquisition requires the shared boundary.');
        if (
          receiver === 'Object' &&
          method === 'assign' &&
          node.arguments.slice(1).some((argument) => globalObject(argument))
        )
          report(node, 'Copying a global network-bearing object bypasses the shared boundary.');
      }
      if (ts.isCallExpression(node) && Object.hasOwn(localProcessOwners, path)) {
        const command = processFunction(node.expression);
        if (command) {
          const program = node.arguments[0],
            args = node.arguments[1],
            options = node.arguments[2];
          const values = args && argv(args);
          const git = program && stringAt(program)?.every((value) => value === 'git');
          const nodePolicy = localNodeEntries[path];
          const nodeProgram =
            program &&
            ts.isPropertyAccessExpression(program) &&
            ts.isIdentifier(program.expression) &&
            program.expression.text === 'process' &&
            globalReference(program.expression) &&
            program.name.text === 'execPath';
          let allowed = false;
          if (git && command !== 'fork') {
            const commands = localGitCommands[path] ?? [];
            allowed =
              !!values?.length &&
              values.every((arguments_) => {
                const first = stringAt(arguments_[0]);
                if (!first?.length || !first.every((value) => commands.includes(value)))
                  return false;
                const options: string[] = [];
                let noExternalDiff = false,
                  noTextConversion = false;
                for (const argument of arguments_.slice(1)) {
                  const values = stringAt(argument);
                  if (values?.length === 1 && values[0] === '--') break;
                  noExternalDiff ||= exactLiteral(argument, '--no-ext-diff');
                  noTextConversion ||= exactLiteral(argument, '--no-textconv');
                  options.push(...(values ?? []));
                }
                if (
                  options.some((value) =>
                    /^(?:--(?:ext-diff|textconv|exec-path|config-env|help|filters|edit-description))(?:=|$)/.test(
                      value,
                    ),
                  )
                )
                  return false;
                // These commands otherwise enable configured executable helpers
                // even though their command names look like local inspection.
                return (
                  !first.some((value) => value === 'diff' || value === 'log') ||
                  (noExternalDiff && noTextConversion)
                );
              });
          } else if (nodePolicy?.kind === command && nodeProgram && values?.length === 1) {
            const arguments_ = values[0]!;
            allowed =
              exactLiteral(arguments_[0], '--import') &&
              exactLiteral(arguments_[1], 'tsx') &&
              localEntry(arguments_[2], nodePolicy.entry);
          } else if (nodePolicy?.kind === 'fork' && command === 'fork' && program) {
            // fork's module and startup flags are both executable acquisition.
            const execArgv =
              options &&
              ts.isObjectLiteralExpression(options) &&
              options.properties.find(
                (property) =>
                  ts.isPropertyAssignment(property) && property.name.getText(file) === 'execArgv',
              );
            const flags =
              execArgv && ts.isPropertyAssignment(execArgv) && argv(execArgv.initializer);
            allowed =
              localEntry(program, nodePolicy.entry) &&
              !!flags &&
              flags.length === 1 &&
              flags[0]?.length === 2 &&
              exactLiteral(flags[0][0], '--import') &&
              exactLiteral(flags[0][1], 'tsx');
          }
          if (['exec', 'execSync'].includes(command)) allowed = false;
          if (
            options &&
            !ts.isObjectLiteralExpression(options) &&
            !ts.isArrowFunction(options) &&
            !ts.isFunctionExpression(options)
          )
            allowed = false;
          if (
            options &&
            ts.isObjectLiteralExpression(options) &&
            options.properties.some((property) => {
              if (ts.isSpreadAssignment(property)) return true;
              const name =
                ts.isIdentifier(property.name) || ts.isStringLiteralLikeNode(property.name)
                  ? property.name.text
                  : undefined;
              return (
                !name ||
                name === 'execPath' ||
                (name === 'shell' &&
                  !(
                    ts.isPropertyAssignment(property) &&
                    property.initializer.kind === ts.SyntaxKind.FalseKeyword
                  ))
              );
            })
          )
            allowed = false;
          if (!allowed)
            report(
              node,
              'Local subprocesses require a proven reviewed Git command or exact local Node entry; remote or unresolved work uses the bounded adapter.',
            );
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(file);
  return failures;
}

/** One pinned compiler snapshot for adversarial or extracted executable source. */
export function inspectNetworkSources(
  root: string,
  sources: readonly NetworkSource[],
): BoundaryFailure[] {
  const configuration = resolve(root, 'tsconfig.network-analysis.json');
  const paths = sources.map((_, index) => resolve(root, `scripts/.network-analysis-${index}.ts`));
  const virtual = new Map(paths.map((path, index) => [path, sources[index]?.source ?? '']));
  virtual.set(
    configuration,
    JSON.stringify({ extends: './tsconfig.network.json', files: paths, include: [] }),
  );
  const api = new API({
    cwd: root,
    fs: {
      readFile: (path) => virtual.get(resolve(path)),
      fileExists: (path) => (virtual.has(resolve(path)) ? true : undefined),
    },
  });
  const snapshot = api.updateSnapshot({ openProjects: [configuration] });
  try {
    const project = snapshot.getProject(configuration);
    if (!project) throw new Error('Pinned TypeScript analysis project could not be loaded.');
    return paths.flatMap((path, index) => {
      const file = project.program.getSourceFile(path),
        source = sources[index];
      if (!file || !source) throw new Error('Network analysis source could not be loaded.');
      return inspectNetworkSource(source.path, source.source, project.checker, file);
    });
  } finally {
    snapshot.dispose();
    api.close();
  }
}

export function checkNetworkBoundaries(root: string): BoundaryFailure[] {
  const files: string[] = [],
    manifests: string[] = [],
    jsonFiles: string[] = [];
  const scan = (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
        files.push(path);
      else if (entry.name === 'package.json') manifests.push(path);
      else if (entry.name.endsWith('.json') && portable(path).includes('/infrastructure/'))
        jsonFiles.push(path);
    }
  };
  for (const directory of ['apps', 'packages', 'scripts', 'infrastructure', 'tests'])
    scan(resolve(root, directory));
  manifests.push(resolve(root, 'package.json'));
  const configurationPath = resolve(root, 'tsconfig.network.json');
  const configuration = JSON.parse(readFileSync(configurationPath, 'utf8')) as object;
  const api = new API({
    cwd: root,
    fs: {
      readFile: (path) =>
        resolve(path) === configurationPath
          ? JSON.stringify({ ...configuration, files, include: [] })
          : undefined,
    },
  });
  const snapshot = api.updateSnapshot({ openProjects: [configurationPath] });
  const failures: BoundaryFailure[] = [],
    embedded: NetworkSource[] = [];
  const used = new Set<string>();
  try {
    const project = snapshot.getProject(configurationPath);
    if (!project)
      throw new Error('Pinned TypeScript network analysis project could not be loaded.');
    for (const absolute of files) {
      const path = portable(relative(root, absolute)),
        file = project.program.getSourceFile(absolute);
      if (!file) throw new Error(`Network source missing from analysis project: ${path}`);
      failures.push(...inspectNetworkSource(path, file.text, project.checker, file));
      const collect = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const name = node.moduleSpecifier.text;
          if (processes.has(name)) used.add(`process:${path}`);
          if (sdk(name)) used.add(`sdk:${path}:${name}`);
        }
        if (
          (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
          restricted.has(memberName(node) ?? '')
        )
          used.add(`observer:${path}`);
        if (
          path.startsWith('apps/client/') &&
          !fixture(path) &&
          !path.endsWith('/network-policies.ts')
        ) {
          let values: readonly string[] | undefined;
          if (ts.isTemplateExpression(node) && node.head.text.startsWith('/api/')) {
            values = node.head.text.includes('?')
              ? [node.head.text]
              : literalValues(node, project.checker);
            if (!values)
              failures.push({
                path,
                line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
                message: 'Dynamic browser API path must have a finite literal-union path set.',
              });
          } else if (ts.isStringLiteralLikeNode(node) && node.text.startsWith('/api/')) {
            if (
              !(
                ts.isBinaryExpression(node.parent) &&
                node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken
              )
            )
              values = [node.text];
          } else if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            ts.isStringLiteralLikeNode(node.left) &&
            node.left.text.startsWith('/api/')
          )
            values = literalValues(node, project.checker);
          for (const value of values ?? []) {
            const pathname = value.split('?')[0];
            if (
              pathname &&
              !continuousBrowserPaths.has(pathname) &&
              !browserRequestPolicies.some((policy) => policy.pathname === pathname)
            )
              failures.push({
                path,
                line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
                message: `Browser API path ${pathname} has no reviewed request policy.`,
              });
          }
        }
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === 'bootstrap' &&
          node.initializer &&
          (ts.isNoSubstitutionTemplateLiteral(node.initializer) ||
            ts.isTemplateExpression(node.initializer))
        ) {
          const value = ts.isNoSubstitutionTemplateLiteral(node.initializer)
            ? node.initializer.text
            : node.initializer.head.text +
              node.initializer.templateSpans
                .map((span) => JSON.stringify('__local_bootstrap_value__') + span.literal.text)
                .join('');
          embedded.push({ path: `${path}#bootstrap`, source: value });
        }
        node.forEachChild(collect);
      };
      collect(file);
    }
  } finally {
    snapshot.dispose();
    api.close();
  }
  for (const path of Object.keys({
    ...rawNetworkOwners,
    ...sdkOwners,
    ...localProcessOwners,
    ...acquisitionObservers,
    ...inboundOwners,
    ...fixtureToolOwners,
    ...testSourceOwners,
    ...dynamicModuleOwners,
  }))
    if (!existsSync(resolve(root, path)))
      failures.push({ path, line: 1, message: 'Stale reviewed network inventory path.' });
  for (const path of Object.keys(localProcessOwners))
    if (!used.has(`process:${path}`))
      failures.push({
        path,
        line: 1,
        message: 'Stale local-process exception has no subprocess import.',
      });
  for (const path of Object.keys(acquisitionObservers))
    if (!used.has(`observer:${path}`))
      failures.push({ path, line: 1, message: 'Stale global acquisition observer exception.' });
  for (const [path, names] of Object.entries(sdkOwners))
    for (const name of names)
      if (!used.has(`sdk:${path}:${name}`))
        failures.push({ path, line: 1, message: `Stale SDK exception for ${name}.` });
  for (const absolute of manifests) {
    const value = JSON.parse(readFileSync(absolute, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const name of Object.keys({ ...value.dependencies, ...value.devDependencies }))
      if (
        !name.startsWith('@open-legend/') &&
        !Object.hasOwn(networkDependencies, name) &&
        !Object.hasOwn(localDependencies, name)
      )
        failures.push({
          path: portable(relative(root, absolute)),
          line: 1,
          message: `Unclassified direct dependency ${name}; review its networking role before adding it.`,
        });
  }
  const artifacts = new Set<string>();
  for (const absolute of jsonFiles) {
    const path = portable(relative(root, absolute));
    const visit = (value: unknown, pointer: string) => {
      if (!value || typeof value !== 'object') return;
      for (const [name, child] of Object.entries(value)) {
        const next = pointer ? `${pointer}.${name}` : name;
        if ((name === 'ZipFile' || name === 'FunctionCode') && typeof child === 'string') {
          const label = `${path}#${next}`;
          if (Object.hasOwn(generatedNetworkArtifacts, label)) artifacts.add(label);
          else embedded.push({ path: label, source: child });
        } else visit(child, next);
      }
    };
    visit(JSON.parse(readFileSync(absolute, 'utf8')), '');
  }
  for (const [path, source] of Object.entries(generatedNetworkArtifacts))
    if (!artifacts.has(path) || !existsSync(resolve(root, source)))
      failures.push({
        path,
        line: 1,
        message: 'Stale generated network artifact/source inventory.',
      });
  if (embedded.length) failures.push(...inspectNetworkSources(root, embedded));
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const failures = checkNetworkBoundaries(resolve(fileURLToPath(new URL('..', import.meta.url))));
  if (failures.length) {
    for (const failure of failures)
      console.error(`${failure.path}:${failure.line}: ${failure.message}`);
    process.exitCode = 1;
  } else
    console.log(
      'Network boundary check passed: all dispatch/acquisition sites have reviewed owners.',
    );
}
