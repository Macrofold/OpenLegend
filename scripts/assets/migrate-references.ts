import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReferenceRewriteOptions {
  /** Original absolute checkout roots recorded in historical file:/// links. */
  sourceRoots?: readonly string[];
  /** An uploaded, verified original-path mirror keeps dynamically assembled gallery paths valid. */
  mirror?: { baseUrl: string; verifiedPaths: ReadonlySet<string> };
  /** Literal URL values in reviewed gallery data arrays or fetch arguments. */
  quotedFileReferences?: boolean;
}

export interface ReferenceRewritePlan {
  documentPath: string;
  sourceSha256: string;
  resultSha256: string;
  text: string;
  changes: { original: string; replacement: string; sourcePath: string }[];
  unmapped: { original: string; sourcePath: string }[];
  dynamicReferences: boolean;
  mirrorApplied: boolean;
}

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const mediaSuffix =
  /\.(?:avif|bin|blend1?|dae|dds|fbx|flac|gif|glb|gltf|gz|jpe?g|mov|mp3|mp4|ogg|otf|pdf|png|psd|svg|tga|tiff?|ttf|wav|webm|webp|woff2?|xlsx|zip)(?:[?#].*)?$/i;

function durableUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Destination must be a credential-free HTTPS URL.');
  for (const name of url.searchParams.keys()) {
    if (/^(?:x-amz-|signature$|token$|key-pair-id$|policy$)/i.test(name))
      throw new Error(
        'A temporary or credential-bearing download URL cannot replace a durable asset reference.',
      );
  }
  return url;
}

function normalizeSource(documentPath: string, input: string, roots: readonly string[]) {
  const source = input.replace(/&amp;/g, '&');
  if (!source || source.startsWith('#') || /^(?:https?:|data:|mailto:|javascript:)/i.test(source))
    return undefined;
  const split = source.search(/[?#]/);
  let path = split < 0 ? source : source.slice(0, split);
  const suffix = split < 0 ? '' : source.slice(split);
  try {
    if (path.startsWith('file:')) {
      path = fileURLToPath(path).replaceAll('\\', '/');
      const root = roots.find((candidate) => path.startsWith(`${candidate.replace(/\/$/, '')}/`));
      if (!root) return undefined;
      path = path.slice(root.replace(/\/$/, '').length + 1);
    } else {
      path = decodeURIComponent(path);
      path = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(documentPath), path);
    }
  } catch {
    return undefined;
  }
  path = posix.normalize(path);
  if (path === '..' || path.startsWith('../') || path.includes('\0')) return undefined;
  return { path, suffix };
}

/** This is a plan only. The caller must verify hosted destinations before supplying the map. */
export function planReferenceRewrite(
  documentPath: string,
  sourceText: string,
  destinations: ReadonlyMap<string, string>,
  options: ReferenceRewriteOptions = {},
): ReferenceRewritePlan {
  const changes: ReferenceRewritePlan['changes'] = [];
  const unmapped: ReferenceRewritePlan['unmapped'] = [];
  const roots = options.sourceRoots ?? [];
  const mapped = new Map<string, string>();
  for (const [path, url] of destinations) mapped.set(posix.normalize(path), durableUrl(url).href);
  const replaceUrl = (original: string) => {
    // A source-code template is evaluated by its original program. Its literal
    // directory is preserved by the verified mirror; URL encoding interpolation
    // syntax here would silently turn the expression into literal link text.
    if (original.includes('${')) return original;
    const source = normalizeSource(documentPath, original, roots);
    if (!source) return original;
    const destination = mapped.get(source.path);
    if (!destination) {
      if (mediaSuffix.test(original) || /scenery-[^/]+\.json(?:[?#].*)?$/.test(original))
        unmapped.push({ original, sourcePath: source.path });
      return original;
    }
    const url = new URL(destination);
    // Existing fragment/query semantics belong to the exact referenced object.
    if (source.suffix.startsWith('?')) {
      const hash = source.suffix.indexOf('#');
      url.search = hash < 0 ? source.suffix : source.suffix.slice(0, hash);
      if (hash >= 0) url.hash = source.suffix.slice(hash);
    } else if (source.suffix) url.hash = source.suffix;
    const replacement = url.href;
    changes.push({ original, replacement, sourcePath: source.path });
    return replacement;
  };
  let text = sourceText;
  // Keep titles, alt text, surrounding markup and whitespace intact. Match only URL positions.
  text = text.replace(
    /\b(href|src|poster|data-src)(\s*=\s*)(["'])([^"']*)\3/gi,
    (match, name: string, equals: string, quote: string, url: string) => {
      const replacement = replaceUrl(url);
      return replacement === url
        ? match
        : `${name}${equals}${quote}${replacement.replaceAll('&', '&amp;')}${quote}`;
    },
  );
  text = text.replace(
    /\b(href|src|poster|data-src)(\s*=\s*)([^"'\s<>`]+)(?=[\s>])/gi,
    (match, name: string, equals: string, url: string) => {
      const replacement = replaceUrl(url);
      return replacement === url
        ? match
        : `${name}${equals}"${replacement.replaceAll('&', '&amp;')}"`;
    },
  );
  text = text.replace(
    /(!?\[[^\]\n]*\]\(\s*)(?:<([^>\n]+)>|([^\s)]+))(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^\n]*\)))?\s*\)/g,
    (
      match,
      prefix: string,
      angle: string | undefined,
      plain: string | undefined,
      title: string | undefined,
    ) => {
      const url = angle ?? plain ?? '';
      const replacement = replaceUrl(url);
      if (replacement === url) return match;
      return `${prefix}${angle === undefined ? replacement : `<${replacement}>`}${title ?? ''})`;
    },
  );
  text = text.replace(
    /\burl\(\s*(["']?)([^)'"\n]+)\1\s*\)/gi,
    (match, quote: string, url: string) => {
      const replacement = replaceUrl(url.trim());
      return replacement === url.trim() ? match : `url(${quote}${replacement}${quote})`;
    },
  );
  // Reference-style Markdown links are another durable evidence entrypoint.
  text = text.replace(
    /^(\s{0,3}\[[^\]\n]+\]:\s*)(?:<([^>\n]+)>|(\S+))/gm,
    (_match, prefix: string, angle: string | undefined, plain: string | undefined) =>
      `${prefix}${angle === undefined ? replaceUrl(plain ?? '') : `<${replaceUrl(angle)}>`}`,
  );
  if (options.quotedFileReferences) {
    text = text.replace(/(["'])([^"'\n<>]+)\1/g, (full, quote: string, value: string) => {
      if (/^\.[A-Za-z0-9]+(?:[?#].*)?$/.test(value)) return full;
      if (!mediaSuffix.test(value) && !/\.(?:json|css|[cm]?js|html)(?:[?#].*)?$/i.test(value))
        return full;
      const replacement = replaceUrl(value);
      return replacement === value ? full : quote + replacement + quote;
    });
  }
  const dynamicReferences = /(?:\$\{[^}]+\}|\.src\s*=|\.href\s*=|new\s+URL\(|\.innerHTML\s*=)/.test(
    sourceText,
  );
  let mirrorApplied = false;
  if (options.mirror && documentPath.endsWith('.html')) {
    if (!options.mirror.verifiedPaths.has(documentPath))
      throw new Error(`Mirror does not verify this historical page: ${documentPath}`);
    for (const entry of unmapped) {
      if (!options.mirror.verifiedPaths.has(entry.sourcePath))
        throw new Error(`Historical mirror is missing a referenced asset: ${entry.sourcePath}`);
    }
    const base = durableUrl(options.mirror.baseUrl);
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const directory = posix.dirname(documentPath);
    const href = new URL(directory === '.' ? './' : `${directory}/`, base).href;
    const tag = `<base href="${href.replaceAll('&', '&amp;')}">`;
    if (/<base\b[^>]*>/i.test(text)) text = text.replace(/<base\b[^>]*>/i, tag);
    else if (/<head\b[^>]*>/i.test(text))
      text = text.replace(/<head\b[^>]*>/i, (head) => `${head}\n${tag}`);
    else text = text.replace(/^(<!doctype[^>]*>)?/i, (doctype) => `${doctype}\n${tag}\n`);
    mirrorApplied = true;
  }
  return {
    documentPath,
    sourceSha256: digest(sourceText),
    resultSha256: digest(text),
    text,
    changes,
    unmapped: [...new Map(unmapped.map((entry) => [JSON.stringify(entry), entry])).values()],
    dynamicReferences,
    mirrorApplied,
  };
}

/** Apply a reviewed plan only if the document still has the bytes used to make that plan. */
export async function applyReferenceRewrite(root: string, plan: ReferenceRewritePlan) {
  const selectedRoot = await realpath(root);
  const path = resolve(selectedRoot, plan.documentPath);
  const local = relative(selectedRoot, await realpath(path));
  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`))
    throw new Error('Document is outside the selected checkout.');
  const before = await lstat(path);
  if (!before.isFile()) throw new Error('Reference migration requires a regular document file.');
  if (
    digest(await readFile(path, 'utf8')) !== plan.sourceSha256 ||
    digest(plan.text) !== plan.resultSha256
  )
    throw new Error(`Document or plan changed: ${plan.documentPath}`);
  if (plan.sourceSha256 === plan.resultSha256) return false;
  const temporary = resolve(dirname(path), `.asset-links-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, plan.text, { flag: 'wx', mode: before.mode });
    if (digest(await readFile(path, 'utf8')) !== plan.sourceSha256)
      throw new Error(`Document changed before replacement: ${plan.documentPath}`);
    await rename(temporary, path);
    return true;
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const at = args.indexOf(name);
    return at < 0 ? undefined : args[at + 1];
  };
  const mapPath = value('--map');
  const documentPath = value('--file');
  const root = resolve(value('--root') ?? process.cwd());
  if (!mapPath || !documentPath)
    throw new Error(
      'Usage: migrate-references.ts --map <verified-path-map.json> --file <repository-document> [--root <checkout>] [--apply]',
    );
  const input: unknown = JSON.parse(await readFile(mapPath, 'utf8'));
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected an object mapping exact repository paths to verified HTTPS URLs.');
  const destinations = new Map<string, string>();
  for (const [path, url] of Object.entries(input)) {
    if (typeof url !== 'string') throw new Error(`Expected a destination URL for ${path}`);
    destinations.set(path, url);
  }
  const plan = planReferenceRewrite(
    documentPath,
    await readFile(resolve(root, documentPath), 'utf8'),
    destinations,
    { sourceRoots: [root] },
  );
  if (args.includes('--apply')) await applyReferenceRewrite(root, plan);
  const { text: _text, ...report } = plan;
  console.log(JSON.stringify({ ...report, applied: args.includes('--apply') }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
