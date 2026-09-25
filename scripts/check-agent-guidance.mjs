import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isMap, parseDocument } from 'yaml';

// Structural checks only: a link path does not prove appropriate task routing or agent compliance.
const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const sources = new Map();
const links = new Map();
const errors = [];
const warnings = [];
const portable = (path) => path.split(sep).join('/');
const isAgent = (path) => path === 'AGENTS.md' || path.endsWith('/AGENTS.md');
const isSkill = (path) => path.startsWith('.agents/skills/') && path.endsWith('/SKILL.md');
const isRule = (path) => path.startsWith('.agents/rules/') && path.endsWith('.md');
const isOperational = (path) => isAgent(path) || isSkill(path) || isRule(path);
const companions = new Set([
  'CLAUDE.md',
  'CONTRIBUTING.md',
  '.github/pull_request_template.md',
  'docs/maintainers/agent-guidance.md',
]);
const outside = (path) => path === '..' || path.startsWith('../') || isAbsolute(path);
const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function prose(text) {
  let fence;
  return text
    .replace(frontmatter, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = undefined;
        return false;
      }
      return !fence;
    })
    .join('\n')
    .replace(/(`+)[\s\S]*?\1(?!`)/g, '');
}

function checkSkill(path, text, names) {
  const match = text.match(frontmatter);
  if (!match) {
    errors.push(`${path}: missing YAML frontmatter.`);
    return 0;
  }
  if (path.split('/').length !== 4)
    errors.push(`${path}: keep shared skills at .agents/skills/<name>/SKILL.md.`);
  if (!text.slice(match[0].length).trim()) errors.push(`${path}: missing skill instructions.`);
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length || document.warnings.length || !isMap(document.contents)) {
    const issue = [...document.errors, ...document.warnings][0]?.message;
    errors.push(`${path}: invalid YAML metadata: ${issue ?? 'expected a mapping'}`);
    return 0;
  }
  const name = document.get('name');
  const description = document.get('description');
  if (
    typeof name !== 'string' ||
    name.length > 64 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
    name !== path.split('/').at(-2) ||
    names.has(name)
  )
    errors.push(`${path}: name must be unique, directory-matched and 1–64 lowercase slug characters.`);
  names.add(name);
  if (typeof description !== 'string' || !description.trim() || description.length > 1024)
    errors.push(`${path}: description must be a nonempty string of at most 1024 characters.`);
  else if (description.length > 240) warnings.push(`${path}: review a long skill description.`);
  return typeof name === 'string' && typeof description === 'string'
    ? Buffer.byteLength(`${name}\n${description}\n${path}`)
    : 0;
}

async function main() {
  // Include untracked, non-ignored additions without scanning local saves or installed dependencies.
  const { stdout } = await promisify(execFile)(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 10_000 },
  );
  const paths = [...new Set(stdout.split('\0').filter(Boolean))].sort();
  const inventory = new Set(paths);
  for (const path of paths)
    for (let parent = portable(dirname(path)); parent !== '.'; parent = portable(dirname(parent)))
      inventory.add(parent);
  inventory.add('');
  const entries = new Map();
  async function entry(path) {
    if (entries.has(path)) return entries.get(path);
    let value = null;
    if (inventory.has(path)) {
      try {
        const physical = portable(relative(root, await realpath(resolve(root, path))));
        const metadata = await lstat(resolve(root, path));
        // Resolve before reading; a repository path may have a replaced/symlinked parent.
        if (physical !== path || metadata.isSymbolicLink())
          errors.push(`${path}: guidance sources/targets must stay inside the repo without symlinks.`);
        else if (metadata.isFile() || metadata.isDirectory()) value = metadata;
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      }
    }
    entries.set(path, value);
    return value;
  }
  for (const path of paths) {
    if (
      path.endsWith('AGENTS.override.md') ||
      path.endsWith('CLAUDE.local.md') ||
      path.endsWith('/CLAUDE.md')
    )
      warnings.push(
        `${path}: native loader precedence may bypass canonical guidance; verify actual loading.`,
      );
    if (
      !isAgent(path) &&
      !companions.has(path) &&
      !(path.startsWith('.agents/') && path.endsWith('.md'))
    )
      continue;
    if ((await entry(path))?.isFile())
      sources.set(path, await readFile(resolve(root, path), 'utf8'));
  }
  const entrypoint = sources.get('AGENTS.md');
  if (!entrypoint?.trim()) errors.push('Missing or empty root AGENTS.md.');
  if (sources.get('CLAUDE.md')?.trim() !== '@AGENTS.md')
    errors.push('CLAUDE.md must remain a thin @AGENTS.md import.');

  let skillCount = 0;
  let discoveryBytes = 0;
  let checkedLinks = 0;
  const names = new Set();
  for (const [path, text] of sources) {
    if (isSkill(path)) {
      skillCount += 1;
      discoveryBytes += checkSkill(path, text, names);
    }
    const budget =
      path === 'AGENTS.md'
        ? 8192
        : isAgent(path)
          ? 2048
          : isSkill(path) || isRule(path)
            ? 4096
            : undefined;
    const bytes = Buffer.byteLength(text);
    if (budget && bytes > budget)
      warnings.push(`${path}: ${bytes} bytes exceeds advisory ${budget}; review, do not truncate.`);
    const targets = new Set();
    links.set(path, targets);
    // Inline relative links only. Heading anchors and reference-style links need separate review.
    for (const match of prose(text).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
      let target;
      try {
        target = portable(
          relative(root, resolve(root, dirname(path), decodeURIComponent(href.split('#')[0]))),
        );
      } catch {
        errors.push(`${path}: malformed link encoding: ${href}`);
        continue;
      }
      if (outside(target)) {
        errors.push(`${path}: link escapes repository: ${href}`);
        continue;
      }
      checkedLinks += 1;
      if (!(await entry(target)))
        errors.push(`${path}: missing, ignored or invalid local target ${target}`);
      else if (isOperational(path) && isOperational(target) && sources.has(target))
        targets.add(target);
    }
  }

  // Structural reachability only. Optional guide/research links cannot rescue an orphan.
  const agents = [...sources.keys()].filter(isAgent);
  const reachable = new Set(agents);
  const pending = [...reachable];
  while (pending.length)
    for (const target of links.get(pending.pop()) ?? []) {
      if (reachable.has(target)) continue;
      reachable.add(target);
      pending.push(target);
    }
  for (const path of sources.keys())
    if ((isSkill(path) || isRule(path)) && !reachable.has(path))
      errors.push(`${path}: no link path from root/scoped AGENTS through operational instructions.`);

  const chainBytes = Math.max(
    0,
    ...agents.map((path) =>
      agents
        .filter(
          (ancestor) =>
            ancestor === 'AGENTS.md' ||
            ancestor === path ||
            path.startsWith(`${portable(dirname(ancestor))}/`),
        )
        .reduce((sum, ancestor) => sum + Buffer.byteLength(sources.get(ancestor)), 0),
    ),
  );
  for (const message of warnings) console.warn(`Guidance warning: ${message}`);
  for (const message of errors) console.error(`Guidance error: ${message}`);
  console.log(
    `Guidance: ${sources.size} Markdown files, ${skillCount} skills, ${checkedLinks} local links; root ${Buffer.byteLength(entrypoint ?? '')} bytes.`,
  );
  console.log(
    `Context sizes (bytes, not tokens): longest AGENTS chain ${chainBytes}; skill names/descriptions/paths ${discoveryBytes}. Excludes harness overhead and loaded topic bodies.`,
  );
  if (errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Guidance check could not complete: ${error.message}`);
  process.exitCode = 1;
});
