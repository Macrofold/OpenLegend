# Entity names and articles

Canonical names contain the name itself, without a grammatical article. A hare's observed label is `hare`; its profile heading is **a hare**; a compact action is **Attack hare with Knife**; a sentence about the selected animal says **Attack the hare with the knife**. **Ada** stays **Ada** in all three contexts. A meaningful word inside a proper name, such as **The Nameless**, is part of that name and is preserved.

## One grammar owner

`@open-legend/language` is a dependency-free English presentation module shared by domain, server, protocol and browser. `namePhrase(value, article, options)` accepts a named value or a common-noun string. Callers choose `none` (default), `indefinite` or `definite`; `capitalize` is available for sentence beginnings. Use a named value when its grammar is known, rather than throwing away its metadata and reconstructing it from the string.

| Source label | Form   | No article   | Indefinite   | Definite         |
| ------------ | ------ | ------------ | ------------ | ---------------- |
| Hare         | count  | Hare         | a hare       | the hare         |
| Owl          | count  | Owl          | an owl       | the owl          |
| Knife        | count  | Knife        | a knife      | the knife        |
| Ada          | proper | Ada          | Ada          | Ada              |
| Wild berries | plural | Wild berries | wild berries | the wild berries |
| Raw meat     | mass   | Raw meat     | raw meat     | the raw meat     |

The default form is a singular count noun. World-authored entities and item definitions can declare `nameForm: proper`, `plural` or `mass`. Personal identity and learned names use proper-name semantics; an unfamiliar person uses the observer's common description. New item instances inherit their definition's grammar. The public entity, inventory, destination and event-time speech projections carry only the permitted name's grammar.

Indefinite articles follow pronunciation: **an hourglass**, **a university badge**, **an MRI scanner**. Common sound exceptions are handled centrally; an authored `indefiniteArticle: a` or `an` handles names whose pronunciation cannot reliably be inferred, including acronyms pronounced as words. The helper does not guess a species, item family or identity from spelling. This is English presentation, not a multilingual inflection system.

`canonicalName` removes grammatical leading articles from common labels at creation/admission. Personal names are preserved. Current-format validation rejects invalid naming metadata and article-bearing common entity/item names. Admitted recipe outputs normalize their common label while retaining the exact source proposal and validating that the stored output reproduces that normalization. No save migration or automatic reset is added.

## Choose at the display site

- Lists, inventory rows, selectors, scene labels, search results, structured action facts and compact action labels generally use bare names. Natural-language controls can choose a definite phrase, such as **Talk to the person**; a learned name produces **Talk to Ada**. Quantities already determine the noun; do not add `a/an` after a count.
- A profile heading for an unfamiliar individual uses an indefinite phrase. A learned personal name receives no extra article. Plural/material profiles avoid invented singular articles.
- Descriptions of a selected target, a carried tool, movement, fire care, conversations and offers use a definite reference where the sentence needs one. Introducing a noticed individual uses an indefinite phrase.
- Native outcomes use complete grammatical sentences. Personal memory replaces the attributed source with **I** or the observer's permitted description; quoted speech is never rewritten. Name formatting does not change what an observer knows or resolve separate target-disclosure bugs.
- User-written prose, remembered quotations, activity names and technique titles are not entity-noun slots. Do not mechanically edit their articles or treat every field named `name` as an object name.

Bare names may be read directly from a canonical projection when the surrounding syntax already determines grammar. Do not store a second article-prefixed name, concatenate `a/an/the` at individual call sites, or duplicate the article regex. A profile cannot use a raw global name instead of the observer's permitted label.

## Authored narration templates

The same module renders trusted name placeholders. `{subject.name}` inserts the bare label; `{subject.name:indefinite}` chooses **a/an**; `{subject.name:definite}` chooses **the**. Other supplied bindings follow the same syntax, for example `{item.name:definite}`. Sentence beginnings capitalize the resulting phrase. Body and status narration share this renderer and validate their own permitted bindings. No generated JavaScript or arbitrary expression evaluation is allowed.

The bundled body's death, recovery and eating narration, and sleep/wake narration, explicitly select articles in their authored source. The renderer knows grammar; world content owns vocabulary, labels and the choice inside its templates.

## Maintained records

- Delivery and verification: [entity-name presentation](maintainers/TODO.md#entity-name-presentation).
- Limits and constraints: [English name presentation](limits/objects.md#ob17--english-name-presentation).
- Recognition/disclosure: [base-world knowledge](worlds/base/knowledge.md#identity-and-recognition).
- Runtime evidence: [name/article verification](verification/entity-names.md).
- Scope and completion evidence: [implementation plan](projects/completed/entity-name-articles-plan.md).

No entity-count, query, memory or action limit is introduced. Formatting performs bounded local string work and does not call an AI provider; existing observer, label-length and context budgets remain in force.
