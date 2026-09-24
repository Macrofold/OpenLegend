import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Validate this repository's small instruction format, not arbitrary Markdown/YAML.
// General specification links and actual agent loading still need review.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['node_modules', '.git', '.data', 'dist']);
const sources = new Map();
const errors = [];
const warnings = [];
const portable = (path) => path.split(sep).join('/');

async function collect(directory, allMarkdown = false) {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(path, allMarkdown);
    else if (
      entry.isFile() &&
      (entry.name === 'AGENTS.md' || (allMarkdown && path.endsWith('.md')))
    )
      sources.set(path, await readFile(resolve(root, path), 'utf8'));
  }
}

async function main() {
  for (const path of ['AGENTS.md', 'CLAUDE.md'])
    sources.set(path, await readFile(resolve(root, path), 'utf8'));
  await collect('.agents', true);
  for (const path of ['apps', 'packages', 'docs']) await collect(path);
  const entrypoint = sources.get('AGENTS.md');
  if (sources.get('CLAUDE.md').trim() !== '@AGENTS.md')
    errors.push('CLAUDE.md must remain a thin @AGENTS.md import.');

  let skillCount = 0;
  let checkedLinks = 0;
  const names = new Set();
  for (const [path, text] of sources) {
    const isSkill = path.endsWith('/SKILL.md');
    const isRule = path.startsWith('.agents/rules/') && path.endsWith('.md');
    if ((isSkill || isRule) && !entrypoint.includes(`](${path})`))
      errors.push(`${path}: missing explicit root task route.`);
    if (isSkill) {
      skillCount += 1;
      const frontmatter = text
        .match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
        ?.replace(/\r/g, '');
      const nameFields = [...(frontmatter ?? '').matchAll(/^name: (.+)$/gm)];
      const descriptionFields = [
        ...(frontmatter ?? '').matchAll(/^description: >-\n((?:[ \t]+[^\n]*(?:\n|$))+)/gm),
      ];
      const name = nameFields[0]?.[1];
      if (
        nameFields.length !== 1 ||
        !name ||
        name.length > 64 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
      )
        errors.push(`${path}: use one valid unquoted name.`);
      if (name !== path.split('/').at(-2) || names.has(name))
        errors.push(`${path}: skill name must be unique and match its directory.`);
      names.add(name);
      const description = (descriptionFields[0]?.[1] ?? '')
        .split('\n')
        .map((line) => line.trim())
        .join(' ')
        .trim();
      if (
        (frontmatter?.match(/^description:/gm)?.length ?? 0) !== 1 ||
        descriptionFields.length !== 1 ||
        !description ||
        description.length > 1024
      )
        errors.push(`${path}: use one folded description (>-) of 1–1024 characters.`);
      if (description.length > 240) warnings.push(`${path}: review a long skill description.`);
    }

    const budget =
      path === 'AGENTS.md'
        ? 8192
        : path.endsWith('/AGENTS.md')
          ? 2048
          : isSkill || isRule
            ? 4096
            : undefined;
    const bytes = Buffer.byteLength(text);
    if (budget && bytes > budget)
      warnings.push(`${path}: ${bytes} bytes exceeds advisory ${budget}; review, do not truncate.`);

    const prose = text.replace(/```[^\n]*\n[\s\S]*?```/g, '');
    for (const match of prose.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
      const target = portable(
        relative(root, resolve(root, dirname(path), decodeURIComponent(href.split('#')[0]))),
      );
      if (target === '..' || target.startsWith('../') || target.startsWith('/')) {
        errors.push(`${path}: link escapes repository: ${href}`);
        continue;
      }
      // Only instruction-system targets are checked here; do not invent a generic doc parser.
      if (
        target.startsWith('.agents/') ||
        target === 'AGENTS.md' ||
        target === 'CLAUDE.md' ||
        target.endsWith('/AGENTS.md')
      ) {
        checkedLinks += 1;
        if (!sources.has(target)) errors.push(`${path}: missing instruction target ${target}`);
      }
    }
  }
  for (const message of warnings) console.warn(`Guidance warning: ${message}`);
  for (const message of errors) console.error(`Guidance error: ${message}`);
  console.log(
    `Guidance: ${sources.size} Markdown files, ${skillCount} skills, ${checkedLinks} instruction links; root ${Buffer.byteLength(entrypoint)} bytes.`,
  );
  if (errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Guidance check could not complete: ${error.message}`);
  process.exitCode = 1;
});
