import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { inspectNetworkSources, type NetworkSource } from '../scripts/check-network-boundaries.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const denied = [
  ['direct fetch', 'fetch("https://fixture.invalid")'],
  ['renamed fetch', 'const call = fetch; call("https://fixture.invalid")'],
  [
    'object value fetch',
    'const client = { request: fetch }; client.request("https://fixture.invalid")',
  ],
  ['shorthand fetch', 'const client = { fetch }; client.fetch("https://fixture.invalid")'],
  ['global property', 'globalThis.fetch("https://fixture.invalid")'],
  ['bracket property', 'window["fetch"]("https://fixture.invalid")'],
  ['dynamic property', 'declare const name: string; globalThis[name]()'],
  ['destructured property', 'const { fetch: call } = globalThis; call("https://fixture.invalid")'],
  ['quoted destructuring', 'const { "fetch": call } = window; call("https://fixture.invalid")'],
  ['global alias', 'const environment = globalThis; environment.fetch("https://fixture.invalid")'],
  [
    'asserted global alias',
    'const environment = (globalThis as any); environment.fetch("https://fixture.invalid")',
  ],
  ['reflective acquisition', 'Reflect.get(globalThis, "fetch")("https://fixture.invalid")'],
  ['global copying', 'const environment = Object.assign({}, globalThis)'],
  ['XMLHttpRequest', 'new XMLHttpRequest()'],
  ['EventSource', 'new EventSource("https://fixture.invalid")'],
  ['WebSocket', 'new WebSocket("wss://fixture.invalid")'],
  [
    'raw injected transport',
    'import type { NetworkFetch } from "@open-legend/network"; declare const transport: NetworkFetch; transport("https://fixture.invalid", {})',
  ],
  [
    'renamed transport type',
    'import type { NetworkFetch } from "@open-legend/network"; type Dispatch = NetworkFetch; declare const transport: Dispatch; transport("https://fixture.invalid", {})',
  ],
  [
    'typeof fetch injection',
    'function invoke(transport: typeof fetch) { return transport("https://fixture.invalid") }',
  ],
  ['SDK import', 'import { S3Client } from "@aws-sdk/client-s3"; new S3Client({})'],
  ['dynamic SDK import', 'const sdk = await import("@aws-sdk/client-s3")'],
  ['external module import', 'import "https://fixture.invalid/sdk.js"'],
  ['external dynamic module', 'await import("https://fixture.invalid/sdk.js")'],
  ['data module import', 'import "data:text/javascript,export default fetch"'],
  ['require HTTP SDK', 'const sdk = require("axios")'],
  [
    'outgoing Node client',
    'import { request } from "node:https"; request("https://fixture.invalid")',
  ],
  ['private network subpath', 'import { openHttp } from "@open-legend/network/src/http"'],
  [
    'relative network internals',
    'import { openHttp } from "../../../packages/network/src/http.js"',
  ],
  [
    'relative network reexport',
    'export { scopeOf } from "../../../packages/network/src/operation.js"',
  ],
  [
    'dynamic network internals',
    'const adapter = await import("../../../packages/network/src/http.js")',
  ],
  [
    'private network type',
    'import type { OwnedHttp } from "../../../packages/network/src/http.js"',
  ],
  ['fixture import', 'import { helper } from "../tests/network-tools.js"'],
  ['fixture reexport', 'export { helper } from "../tests/network-tools.js"'],
  [
    'browser fixture import',
    'import { qualifyRendererNetwork } from "../test-fixtures/renderer-network.js"',
  ],
  [
    'browser fixture reexport',
    'export { qualifyRendererNetwork } from "../test-fixtures/renderer-network.js"',
  ],
  ['browser fixture dynamic import', 'await import("../test-fixtures/renderer-network.js")'],
  ['dynamic module name', 'declare const name: string; await import(name)'],
  ['executable string', 'eval("fetch(\\\"https://fixture.invalid\\\")")'],
  ['Function constructor', 'new Function("return fetch")()'],
  ['indirect executable string', '(0, eval)("fetch(1)")'],
  ['aliased executable string', 'const run = eval; run("fetch(1)")'],
  ['global executable string', 'globalThis.eval("fetch(1)")'],
  ['bracket executable string', 'globalThis["eval"]("fetch(1)")'],
  ['destructured executable string', 'const { eval: run } = globalThis; run("fetch(1)")'],
  ['global Function constructor', 'new globalThis.Function("return fetch(1)")()'],
  ['aliased Function constructor', 'const Build = Function; new Build("return fetch(1)")()'],
  ['reflective executable string', 'Reflect.get(globalThis, "eval")("fetch(1)")'],
] as const;
const approved = [
  ['local method', 'const object = { fetch() { return 1; } }; object.fetch()'],
  ['shadowed fetch', 'function invoke(fetch: () => number) { return fetch() }'],
  ['shadowed global', 'function invoke(window: { fetch(): number }) { return window.fetch() }'],
  ['shadowed Function', 'function invoke(Function: () => number) { return Function() }'],
  ['type reference', 'type Input = Parameters<typeof fetch>[0]'],
  [
    'body consumer',
    'import { createNetworkOwner, requestText } from "@open-legend/network"; const owner = createNetworkOwner({role:"fixture",capacity:1}); owner.run({timeoutMs:100},operation=>requestText(operation,{url:"https://fixture.invalid",bodyPolicy:{kind:"bounded",maxBytes:10}}))',
  ],
] as const;

describe('network boundary acquisition checks using the pinned compiler', () => {
  it('rejects aliases, SDKs, executable escape paths and fixture authority without flagging unrelated properties', () => {
    const sources: NetworkSource[] = [
      ...denied.map(([name, source]) => ({
        path: `apps/client/src/denied-${name}.ts`,
        source: source + '\nexport {};',
      })),
      ...approved.map(([name, source]) => ({
        path: `apps/client/src/approved-${name}.ts`,
        source: source + '\nexport {};',
      })),
      {
        path: 'packages/network/src/http.ts',
        source: 'globalThis.fetch("https://fixture.invalid"); export {};',
      },
      { path: 'tests/exact-fixture.ts', source: 'fetch("http://127.0.0.1"); export {};' },
      {
        path: 'apps/server/src/http.ts',
        source: 'import { createServer } from "node:http"; createServer(); export {};',
      },
      {
        path: 'apps/server/src/new.ts',
        source: 'import type { IncomingMessage } from "node:http"; export {};',
      },
      {
        path: 'packages/network/src/events.ts',
        source: 'import { openHttp } from "./http.js"; export {};',
      },
      {
        path: 'packages/network/src/network.test.ts',
        source: 'import { openHttp } from "./http.js"; export {};',
      },
      {
        path: 'apps/client/test-fixtures/renderer-network.ts',
        source:
          'import { test } from "@playwright/test"; globalThis.fetch("http://127.0.0.1"); export {};',
      },
      {
        path: 'apps/client/test-fixtures/unreviewed.ts',
        source: 'globalThis.fetch("http://127.0.0.1"); export {};',
      },
    ];
    const failures = inspectNetworkSources(root, sources);
    const paths = new Set(failures.map((failure) => failure.path));
    for (const [name] of denied)
      expect(paths.has(`apps/client/src/denied-${name}.ts`), name).toBe(true);
    for (const [name] of approved)
      expect(paths.has(`apps/client/src/approved-${name}.ts`), name).toBe(false);
    expect(paths.has('packages/network/src/http.ts')).toBe(false);
    expect(paths.has('tests/exact-fixture.ts')).toBe(false);
    expect(paths.has('apps/server/src/http.ts')).toBe(false);
    expect(paths.has('apps/server/src/new.ts')).toBe(false);
    expect(paths.has('packages/network/src/events.ts')).toBe(false);
    expect(paths.has('packages/network/src/network.test.ts')).toBe(false);
    expect(paths.has('apps/client/test-fixtures/renderer-network.ts')).toBe(false);
    expect(paths.has('apps/client/test-fixtures/unreviewed.ts')).toBe(true);
  });

  it('keeps local subprocess and incoming-server exceptions narrow', () => {
    const cases: NetworkSource[] = [
      {
        path: 'scripts/assets/inventory.ts',
        source:
          'import { spawn } from "node:child_process"; spawn("git", ["ls-files"]); export {};',
      },
      {
        path: 'scripts/assets/migration.ts',
        source:
          'import { spawn } from "node:child_process"; const run=spawn; run("git", ["clone", "https://fixture.invalid"]); export {};',
      },
      {
        path: 'scripts/check-assets.ts',
        source:
          'import { execFile } from "node:child_process"; import { promisify } from "node:util"; const run=promisify(execFile); run("curl",["https://fixture.invalid"]); export {};',
      },
      {
        path: 'apps/server/src/http.ts',
        source:
          'import * as http from "node:http"; http.get("https://fixture.invalid"); export {};',
      },
      {
        path: 'apps/server/src/creation-host.ts',
        source:
          'import { request } from "node:http"; request("https://fixture.invalid"); export {};',
      },
      {
        path: 'scripts/stress-data.ts',
        source:
          'import * as subprocess from "node:child_process"; subprocess.spawn("curl",["https://fixture.invalid"]); export {};',
      },
      {
        path: 'scripts/stress-native.ts',
        source:
          'const subprocess=await import("node:child_process"); subprocess.spawn("curl",["https://fixture.invalid"]); export {};',
      },
    ];
    const failures = inspectNetworkSources(root, cases);
    const paths = new Set(failures.map((failure) => failure.path));
    expect(paths.has('scripts/assets/inventory.ts')).toBe(false);
    for (const source of cases.slice(1)) expect(paths.has(source.path), source.path).toBe(true);
  });

  it('resolves source-relative imports before permitting access to the public network API', () => {
    const cases: NetworkSource[] = [
      {
        path: 'packages/ai/src/caller.ts',
        source: 'import { openHttp } from "../../network/src/http.js"; export {};',
      },
      {
        path: 'packages/ai/src/reexport.ts',
        source: 'export { scopeOf } from "../../network/src/operation.js";',
      },
      {
        path: 'packages/ai/src/dynamic.ts',
        source: 'await import("../../network/src/http.js"); export {};',
      },
      {
        path: 'packages/ai/src/source-entry.ts',
        source: 'import { createNetworkOwner } from "../../network/src/index.js"; export {};',
      },
      {
        path: 'packages/ai/src/public-api.ts',
        source:
          'import { createNetworkOwner } from "@open-legend/network"; import { waitSdkValue } from "@open-legend/network/node"; export {};',
      },
    ];
    const failures = inspectNetworkSources(root, cases);
    const paths = new Set(failures.map((failure) => failure.path));
    for (const source of cases.slice(0, -1)) expect(paths.has(source.path), source.path).toBe(true);
    expect(paths.has('packages/ai/src/public-api.ts')).toBe(false);
  });

  it('proves local subprocess commands through constant arrays and direct forwarders', () => {
    const cases = [
      ['literal local command', true, 'execFile("git", ["ls-files"]);'],
      ['constant local command', true, 'const args=["ls-files"]; execFile("git",args);'],
      [
        'spread local command',
        true,
        'const base=["ls-files"]; const args=[...base,"-z"]; execFile("git",args);',
      ],
      [
        'constant remote command',
        false,
        'const args=["clone","https://fixture.invalid"]; execFile("git",args);',
      ],
      [
        'aliased remote command',
        false,
        'const args=["clone"]; const alias=args; execFile("git",alias);',
      ],
      [
        'spread remote command',
        false,
        'const base=["clone"]; execFile("git",[...base,"https://fixture.invalid"]);',
      ],
      [
        'mutated local command',
        false,
        'const args=["ls-files"]; args[0]="clone"; execFile("git",args);',
      ],
      [
        'escaped local command',
        false,
        'declare function alter(a:string[]):void; const args=["ls-files"]; alter(args); execFile("git",args);',
      ],
      ['unknown command', false, 'declare const args:string[]; execFile("git",args);'],
      [
        'Git global options',
        false,
        'execFile("git",["-c","alias.remote=!curl fixture.invalid","remote"]);',
      ],
      [
        'unreviewed Git command',
        false,
        'execFile("git",["config","alias.remote","!curl fixture.invalid"]);',
      ],
      [
        'forwarded local command',
        true,
        'function git(args:string[]){return execFile("git",args)} git(["ls-files"]);',
      ],
      [
        'forwarded remote command',
        false,
        'function git(args:string[]){return execFile("git",args)} const args=["clone"]; git(args);',
      ],
      [
        'escaped forwarder',
        false,
        'function git(args:string[]){return execFile("git",args)} const run=git; run(["clone"]);',
      ],
      ['shell option', false, 'execFile("git",["ls-files"],{shell:true});'],
      ['quoted shell option', false, 'execFile("git",["ls-files"],{"shell":true});'],
      ['computed shell option', false, 'execFile("git",["ls-files"],{["shell"]:true});'],
      [
        'unresolved options',
        false,
        'const options={shell:true}; execFile("git",["ls-files"],options);',
      ],
      ['Node executable string', false, 'execFile(process.execPath,["-e","fetch(1)"]);'],
      ['indirect subprocess call', false, 'execFile.call(null,"git",["clone"]);'],
      ['bound subprocess call', false, 'const run=execFile.bind(null,"git"); run(["clone"]);'],
      [
        'mutated alias',
        false,
        'const args=["ls-files"]; const alias=args; alias[0]="clone"; execFile("git",args);',
      ],
      [
        'mutated forwarded command',
        false,
        'function git(args:string[]){args[0]="clone"; return execFile("git",args)} git(["ls-files"]);',
      ],
    ] as const;
    const sources = cases.map(([, , source], index) => ({
      path: 'scripts/check-assets.ts',
      source:
        '\n'.repeat(index) +
        'import { execFile } from "node:child_process"; ' +
        source +
        ' export {};',
    }));
    const lines = new Set(inspectNetworkSources(root, sources).map((failure) => failure.line));
    cases.forEach(([name, approved], index) => expect(lines.has(index + 1), name).toBe(!approved));
  });
  it('permits only reviewed local Node entry files and startup flags', () => {
    const sources = [
      [
        'scripts/stress-native.ts',
        true,
        'spawn(process.execPath,["--import","tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url)),"local-input"]);',
      ],
      ['scripts/stress-native.ts', false, 'spawn(process.execPath,["--eval","fetch(1)"]);'],
      [
        'scripts/stress-native.ts',
        false,
        'spawn(process.execPath,["--import","other",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'spawn(process.execPath,["--import","tsx",fileURLToPath(new URL("./unreviewed.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'function launch(){function fileURLToPath(...args:unknown[]){return "/tmp/unreviewed.mjs"}; spawn(process.execPath,["--import","tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);} launch();',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'const process={execPath:"curl"}; spawn(process.execPath,["--import","tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'const URL=class {constructor(...args:unknown[]){return {href:"file:///tmp/unreviewed.mjs"}}}; spawn(process.execPath,["--import","tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'declare const flag:"--import"|"--inspect"; spawn(process.execPath,[flag,"tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'declare const flag:"--import"|"--require"; spawn(process.execPath,[flag,"tsx",fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'declare const entry:"./profile-native.ts"|"./unreviewed.ts"; spawn(process.execPath,["--import","tsx",fileURLToPath(new URL(entry,import.meta.url))]);',
      ],
      [
        'scripts/stress-native.ts',
        false,
        'declare const loader:"tsx"|"unreviewed"; spawn(process.execPath,["--import",loader,fileURLToPath(new URL("./profile-native.ts",import.meta.url))]);',
      ],
      [
        'scripts/performance/profile-server.mjs',
        true,
        'fork(fileURLToPath(import.meta.url),["--client"],{execArgv:["--import","tsx"]});',
      ],
      [
        'scripts/performance/profile-server.mjs',
        false,
        'fork(fileURLToPath(import.meta.url),["--client"],{execArgv:["--import","tsx","--import","remote"]});',
      ],
      [
        'scripts/performance/profile-server.mjs',
        false,
        'fork(fileURLToPath(import.meta.url),["--client"],{execArgv:["--import","tsx"],execPath:"curl"});',
      ],
      [
        'scripts/performance/profile-server.mjs',
        false,
        'declare const flag:"--import"|"--inspect"; fork(fileURLToPath(import.meta.url),["--client"],{execArgv:[flag,"tsx"]});',
      ],
    ] as const;
    const failures = inspectNetworkSources(
      root,
      sources.map(([path, , source], index) => ({
        path,
        source:
          '\n'.repeat(index) +
          'import { spawn,fork } from "node:child_process"; import { fileURLToPath } from "node:url"; ' +
          source +
          ' export {};',
      })),
    );
    const lines = new Set(failures.map((failure) => failure.line));
    sources.forEach(([, approved], index) => expect(lines.has(index + 1)).toBe(!approved));
  });
  it('keeps local Git comparisons from launching configured executable helpers', () => {
    const cases = [
      ['diff', true, '"--no-ext-diff","--no-textconv","HEAD"'],
      ['diff', false, '"HEAD"'],
      ['diff', false, '"--no-ext-diff","--no-textconv","--ext-diff"'],
      ['diff', false, '"--no-ext-diff","--no-textconv","--textconv"'],
      ['diff', false, '"--no-ext-diff","--no-textconv","--exec-path=/tmp/unreviewed"'],
      ['log', true, '"--no-ext-diff","--no-textconv","HEAD","--format=%H"'],
      ['log', false, '"--textconv","-p"'],
      ['log', false, '"--no-ext-diff","--no-textconv","--help"'],
      ['log', true, '"--no-ext-diff","--no-textconv","--","--ext-diff"'],
      ['diff', false, 'flag,flag,"HEAD"', 'declare const flag:"--no-ext-diff"|"--no-textconv";'],
    ] as const;
    const failures = inspectNetworkSources(
      root,
      cases.map(([command, , args, declaration = ''], index) => ({
        path:
          command === 'diff' ? 'scripts/decision-benchmark/run.ts' : 'scripts/assets/migration.ts',
        source:
          '\n'.repeat(index) +
          'import {execFileSync} from "node:child_process"; ' +
          declaration +
          ' execFileSync("git",["' +
          command +
          '",' +
          args +
          ']); export {};',
      })),
    );
    const lines = new Set(failures.map((failure) => failure.line));
    cases.forEach(([, approved], index) => expect(lines.has(index + 1)).toBe(!approved));
  });
});
