import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const sitesFile = 'native/simulation/src/profile/sites.rs';

export type Probe = {
  id: string;
  parent: string;
  ordinal: number;
  symbol: string;
  unit: string;
  bindings: { file: string; line: number; anchor: string; sha256: string }[];
};

export function gitBlob(root: string, commit: string, path: string) {
  return execFileSync('git', ['cat-file', 'blob', `${commit}:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 ** 2,
  });
}

export function gitToolFiles(root: string, commit: string) {
  return execFileSync(
    'git',
    [
      'ls-tree',
      '-r',
      '--name-only',
      commit,
      '--',
      'scripts/performance/profile-campaign.ts',
      'scripts/performance/rust-profile',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1024 ** 2,
    },
  )
    .trim()
    .split('\n');
}

export function gitChanges(root: string, base: string, candidate: string) {
  return execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--no-textconv', '--name-only', base, candidate, '--'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1024 ** 2,
    },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
}

/** Reads bindings from the exact commit. The compiled catalogue owns IDs and units. */
export function readRegistry(root: string, commit: string): Probe[] {
  const catalogue = gitBlob(root, commit, sitesFile);
  const probes: Probe[] = [];
  const declarations =
    /^\s*(\d+),\s*([A-Z_][A-Z_0-9]*),\s*"(S\d{2}(?:\.[A-Za-z0-9_-]+)+)",\s*"([^"\n]+)";\s*$/gm;
  for (const [, ordinal, symbol, id, unit] of catalogue.matchAll(declarations)) {
    if (ordinal === undefined || !id || !symbol || !unit) throw new Error('Invalid probe site.');
    probes.push({
      ordinal: Number(ordinal),
      id,
      parent: id.slice(0, 3),
      symbol,
      unit,
      bindings: [],
    });
  }
  if (
    !probes.length ||
    probes.length > 64 ||
    new Set(probes.map((p) => p.id)).size !== probes.length ||
    new Set(probes.map((p) => p.symbol)).size !== probes.length ||
    probes.some((p, index) => p.ordinal !== index)
  )
    throw new Error('Compiled probe declarations are missing, duplicate, or out of order.');

  const candidates = execFileSync(
    'git',
    [
      'grep',
      '-l',
      '-E',
      'profile_(scope|measure|count|body|result|call)!|sites::',
      commit,
      '--',
      'native',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1024 ** 2,
    },
  )
    .trim()
    .split('\n')
    .map((line) => line.slice(commit.length + 1));
  for (const file of candidates) {
    if (!file.endsWith('.rs') || file === sitesFile) continue;
    const source = gitBlob(root, commit, file);
    const sha256 = createHash('sha256').update(source).digest('hex');
    for (const probe of probes) {
      const call = new RegExp(
        `(?:profile_(?:scope|measure|count|body|result|call)!\\s*\\(\\s*|sites::)${probe.symbol}\\b`,
        'g',
      );
      for (const match of source.matchAll(call)) {
        const line = source.slice(0, match.index).split('\n').length;
        probe.bindings.push({ file, line, anchor: match[0].replace(/\s+/g, ' '), sha256 });
      }
    }
  }
  return probes;
}

/** A group expands only the bindings available at freeze. Unknown sites fail before dispatch. */
export function selectProbes(registry: Probe[], selectors: string[]) {
  const ids = new Set<string>();
  for (const selector of selectors) {
    const matches = registry.filter((p) => p.parent === selector || p.id === selector);
    if (!matches.length) throw new Error(`Unknown probe selection ${selector}.`);
    for (const probe of matches) {
      if (!probe.bindings.length) throw new Error(`Probe ${probe.id} has no bound Rust caller.`);
      ids.add(probe.id);
    }
  }
  if (ids.size > 32) throw new Error('Use at most 32 timing series per capture.');
  return [...ids].sort();
}
