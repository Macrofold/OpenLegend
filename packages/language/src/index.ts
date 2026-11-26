export { formatDisplayNumber } from './numbers.js';
/** English presentation only: no world vocabulary, identity policy or simulation dependencies. */
export type NameForm = 'count' | 'proper' | 'plural' | 'mass';
export type NameArticle = 'none' | 'indefinite' | 'definite';
export interface Named {
  /** Canonical label, without a grammatical article. */
  name: string;
  nameForm?: NameForm;
  /** Authored pronunciation override, for example an unfamiliar acronym. */
  indefiniteArticle?: 'a' | 'an';
}

/** Personal names can contain meaningful words such as "The"; do not rewrite them. */
export function canonicalName(name: string, form: NameForm = 'count'): string {
  const trimmed = name.trim();
  return form === 'proper' ? trimmed : trimmed.replace(/^(?:an?|the)\s+/i, '');
}

/** Current-format validation; invalid grammar must not silently become a different label. */
export function validName(value: unknown): value is Named {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const named = value as Record<string, unknown>;
  return (
    typeof named.name === 'string' &&
    !!named.name &&
    (named.nameForm === undefined ||
      named.nameForm === 'count' ||
      named.nameForm === 'proper' ||
      named.nameForm === 'plural' ||
      named.nameForm === 'mass') &&
    (named.indefiniteArticle === undefined ||
      named.indefiniteArticle === 'a' ||
      named.indefiniteArticle === 'an') &&
    canonicalName(named.name, named.nameForm) === named.name
  );
}

function indefiniteArticle(name: string): 'a' | 'an' {
  // Articles follow pronunciation, not spelling. World authors can override unfamiliar names.
  if (/^(?:honest|honou?r|hour|heir|herb\b|x-ray\b)/i.test(name)) return 'an';
  if (
    /^(?:one\b|once\b|ewe|eu[lr]|uni(?:[^nmd]|$)|u[bcfhjkqrst][aeiou]|user|use\b|usual)/i.test(name)
  )
    return 'a';
  const initialism = name.match(/^([A-Z]+)(?:\b|[-\d])/);
  if (initialism) return /^[AEFHILMNORSX]/.test(initialism[1]!) ? 'an' : 'a';
  if (/^(?:8|11|18)(?:\b|[-])/i.test(name)) return 'an';
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

/** Callers choose grammar for their context; names never contain the choice. */
export function namePhrase(
  value: Named | string,
  article: NameArticle = 'none',
  options: { capitalize?: boolean } = {},
): string {
  const named = typeof value === 'string' ? { name: value } : value;
  const name = canonicalName(named.name, named.nameForm);
  if (!name) return '';
  const form = named.nameForm ?? 'count';
  const prefix =
    form === 'proper' || article === 'none'
      ? ''
      : article === 'definite'
        ? 'the'
        : form === 'count'
          ? (named.indefiniteArticle ?? indefiniteArticle(name))
          : '';
  // Common labels are often title-cased in menus; sentence references use ordinary casing.
  const noun =
    article !== 'none' && form !== 'proper' && !/^[A-Z](?:[A-Z]|\b)/.test(name)
      ? name[0]!.toLowerCase() + name.slice(1)
      : name;
  const phrase = prefix ? `${prefix} ${noun}` : noun;
  return options.capitalize && form !== 'proper'
    ? phrase[0]!.toUpperCase() + phrase.slice(1)
    : phrase;
}

const nameToken = /^([A-Za-z]\w*)\.name(?::(none|indefinite|definite))?$/;

/** Trusted authored templates choose articles explicitly; no executable interpolation. */
export function validNameTemplate(template: string, bindings: readonly string[]): boolean {
  return !template
    .replace(/\{([^{}]*)\}/g, (token, contents: string) => {
      const parsed = nameToken.exec(contents);
      return parsed && bindings.includes(parsed[1]!) ? '' : token;
    })
    .match(/[{}]/);
}

export function renderNameTemplate(
  template: string,
  bindings: Readonly<Record<string, Named | undefined>>,
): string {
  return template.replace(/\{([^{}]*)\}/g, (token, contents: string, offset: number) => {
    const parsed = nameToken.exec(contents);
    if (!parsed || !Object.hasOwn(bindings, parsed[1]!)) return token;
    return namePhrase(
      bindings[parsed[1]!] ?? { name: 'unknown' },
      (parsed[2] ?? 'none') as NameArticle,
      {
        capitalize: offset === 0 || /[.!?]\s*$/.test(template.slice(0, offset)),
      },
    );
  });
}

/** Participant grammar shared by native experience and observer-aware narration. */
export type PersonRole = 'subject' | 'object' | 'possessive' | 'reflexive';
export function personalPronoun(role: PersonRole, person: 'first' | 'second' = 'first'): string {
  return (
    person === 'second'
      ? { subject: 'you', object: 'you', possessive: 'your', reflexive: 'yourself' }
      : { subject: 'I', object: 'me', possessive: 'my', reflexive: 'myself' }
  )[role];
}
export function personPhrase(
  named: Named,
  role: PersonRole,
  self: boolean,
  article: NameArticle,
  grammaticalPerson: 'first' | 'second' = 'first',
): string {
  if (self) return personalPronoun(role, grammaticalPerson);
  if (role === 'reflexive') return named.nameForm === 'plural' ? 'themselves' : 'themself';
  const phrase = namePhrase(named, article);
  return `${phrase}${role === 'possessive' ? (named.nameForm === 'plural' && phrase.endsWith('s') ? '’' : '’s') : ''}`;
}
export function presentTense(
  verb: string,
  first: boolean,
  plural: boolean,
  person: 'first' | 'second' = 'first',
): string {
  if (verb === 'be') return first ? (person === 'first' ? 'am' : 'are') : plural ? 'are' : 'is';
  if (first || plural) return verb;
  if (verb === 'have') return 'has';
  if (verb === 'do') return 'does';
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}${/(?:s|x|z|ch|sh|o)$/.test(verb) ? 'es' : 's'}`;
}
const narrationToken =
  /^([A-Za-z]\w*)\.(?:(name|subject|object|possessive|reflexive)(?::(none|indefinite|definite))?|verb:([a-z]+))$/;
export function validNarrationTemplate(template: string, bindings: readonly string[]): boolean {
  return !template
    .replace(/\{([^{}]*)\}/g, (token, contents: string) => {
      const parsed = narrationToken.exec(contents);
      return parsed && bindings.includes(parsed[1]!) ? '' : token;
    })
    .match(/[{}]/);
}
export function parseNarrationToken(
  token: string,
):
  | { binding: string; role?: 'name' | PersonRole; article?: NameArticle; verb?: string }
  | undefined {
  const parsed = narrationToken.exec(token);
  if (!parsed) return;
  return {
    binding: parsed[1]!,
    role: parsed[2] as 'name' | PersonRole | undefined,
    article: parsed[3] as NameArticle | undefined,
    verb: parsed[4],
  };
}

/** English speech grammar only. Callers supply their already-admitted participants
 * and reception; this function discovers no recipient, identity or unheard word. */
export function speechPresentation(input: {
  speaker: Named | null;
  addressee: Named | null;
  self: boolean;
  addressed: boolean;
  directed: boolean;
  seen: boolean;
  intelligibility: 'clear' | 'partial' | 'none';
  delivery: 'whisper' | 'normal' | 'shout' | null;
  words: string;
  perspective?: 'first' | 'second';
}): { attribution: string; quotation: string | null; detail: string; description: string } {
  const first = input.perspective !== 'second';
  const speaker = input.self
    ? first
      ? 'I'
      : 'You'
    : input.speaker
      ? namePhrase(input.speaker, 'indefinite', { capitalize: true })
      : 'Someone nearby';
  const plural = !input.self && input.speaker?.nameForm === 'plural';
  const recipient = input.addressed
    ? input.self
      ? first
        ? 'myself'
        : 'yourself'
      : first
        ? 'me'
        : 'you'
    : input.addressee
      ? namePhrase(input.addressee, 'indefinite')
      : input.directed
        ? input.self
          ? 'someone'
          : 'someone else'
        : null;
  const destination = recipient ? ` to ${recipient}` : input.directed ? '' : ' aloud';
  if (input.seen) {
    const attribution = `${speaker} ${input.self || plural ? 'appear' : 'appears'} to be speaking`;
    return {
      attribution,
      quotation: null,
      detail: 'No words were heard.',
      description: `${attribution}.`,
    };
  }
  if (input.intelligibility === 'none') {
    const verb =
      input.delivery === 'whisper'
        ? 'whispering'
        : input.delivery === 'shout'
          ? 'shouting'
          : 'speaking';
    const attribution = `${speaker} ${input.self ? (first ? 'am' : 'are') : plural ? 'are' : 'is'} ${verb}${destination}`;
    return {
      attribution,
      quotation: null,
      detail: 'The words are unintelligible.',
      description: `${attribution}; the words are unintelligible.`,
    };
  }
  const verb =
    input.delivery === 'whisper' ? 'whispered' : input.delivery === 'shout' ? 'shouted' : 'said';
  const attribution = `${speaker} ${verb}${destination}`;
  return {
    attribution,
    quotation: input.words,
    detail: input.words,
    description: `${attribution}: “${input.words}”${input.intelligibility === 'partial' ? ' (partly heard).' : ''}`,
  };
}
