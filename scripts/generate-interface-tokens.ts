import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

interface Token {
  name: string;
  value: string | Record<string, string>;
}
interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  fontStyle?: string;
  letterSpacing?: string;
}
interface Tokens {
  color: { themes: { id: string; name: string }[]; tokens: Token[] };
  type: {
    fonts: { family: string; file: string; weight: string; style: string }[];
    families: Record<string, string>;
    groups: { family: string; styles: TypeStyle[] }[];
  };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  size: { tokens: Token[] };
  shadow: { tokens: Token[] };
  duration: { tokens: Token[] };
  easing: { tokens: Token[] };
  zIndex: { tokens: Token[] };
  variables: Record<string, string>;
  themes: Record<string, { variables: Record<string, string>; night?: Record<string, string> }>;
}

const source = new URL('../apps/client/src/design-system/tokens/tokens.json', import.meta.url);
const target = new URL('../apps/client/src/design-system/tokens/tokens.css', import.meta.url);
const tokens = JSON.parse(await readFile(source, 'utf8')) as Tokens;
const lines = ['/* Generated from tokens.json by scripts/generate-interface-tokens.ts. */'];
function variables(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}
function block(selector: string, values: Record<string, string>) {
  lines.push(`${selector} {\n${variables(values)}\n}`);
}
for (const font of tokens.type.fonts) {
  const path = encodeURIComponent(`apps/client/src/design-system/${font.file}`);
  lines.push(
    `@font-face { font-family: '${font.family}'; src: url('/__assets/${path}') format('woff2'); font-weight: ${font.weight}; font-style: ${font.style}; font-display: swap; }`,
  );
}
for (const theme of tokens.color.themes) {
  const values: Record<string, string> = {};
  for (const token of [...tokens.color.tokens, ...tokens.shadow.tokens]) {
    const value = typeof token.value === 'string' ? token.value : token.value[theme.id];
    if (value !== undefined) values[token.name] = value;
  }
  block(
    theme.id === 'wilderness' ? ':root, [data-theme="wilderness"]' : `[data-theme="${theme.id}"]`,
    values,
  );
}
const common = { ...tokens.variables };
for (const group of ['spacing', 'radius', 'size', 'duration', 'easing', 'zIndex'] as const) {
  for (const token of tokens[group].tokens) {
    if (typeof token.value === 'string') common[token.name] = token.value;
  }
}
for (const [name, family] of Object.entries(tokens.type.families)) common[`font-${name}`] = family;
block(':root, [data-theme]', common);
for (const group of tokens.type.groups) {
  for (const style of group.styles) {
    lines.push(
      `.t-${style.name} { font-family: var(--font-${group.family}); font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: ${style.fontWeight}; ${style.fontStyle ? `font-style: ${style.fontStyle};` : ''} ${style.letterSpacing ? `letter-spacing: ${style.letterSpacing};` : ''} }`,
    );
  }
}
for (const [id, theme] of Object.entries(tokens.themes)) {
  block(`[data-theme="${id}"]`, theme.variables);
  if (theme.night) block(`[data-theme="${id}"][data-lighting="night"]`, theme.night);
}
const css = await format(lines.join('\n'), {
  ...(await resolveConfig(fileURLToPath(target))),
  parser: 'css',
});
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== css)
    throw new Error('Run pnpm tokens:generate to update interface tokens.');
  console.log('Interface tokens match their authored source.');
} else {
  await writeFile(target, css);
}
