# Controls, forms and overlays

[Handbook](README.md) · [React](react.md) · [Verification](verification.md)

## Choose the semantic control first

| Player intent | Preferred pattern | Avoid |
| --- | --- | --- |
| Perform a command | Button with a verb | Link styling for a mutation; an entire interactive row wrapping nested buttons |
| Navigate to a place/view | Link or established navigation control | A button that silently changes an unrelated object |
| Choose one of a few visible alternatives | Radio group or segmented choice | Hiding important differences in a select solely for compactness |
| Choose one from a long known catalogue | Select or searchable combobox | Command menu masquerading as a value field |
| Find records without selecting a form value | Search field plus results region | Treating highlighted search text as a committed object |
| Choose independent options | Checkboxes; checkable list for larger sets | Single-select semantics or tags with no selection state |
| Apply an immediate persistent on/off preference | Switch with current state | Switch whose change is secretly deferred until Save |
| Edit an on/off value in a staged form | Checkbox within the form's save model | Mixing immediate and staged updates without telling the player |
| Set an exact quantity | Number field with units and validation; optional step controls | Slider alone for precise inventory quantities |
| Explore continuous visual preference | Slider plus understandable value/reset | Inferring simulation mechanics from a visual setting |
| Reveal optional detail | Disclosure/accordion | Hiding required fields or comparisons |
| Move among peer views | Tabs with retained context | Tabs for sequential wizard steps or unrelated global navigation |

Prefer native or existing React Aria primitives. Selecting a pattern does not mean installing a new component library. [F07](research.md#f07) [F08](research.md#f08)

## A combobox is one composite control

The user's reported nested-typeahead failure is an explicit regression case. It does **not** mean an input and a popup cannot coexist. They must form one coherent widget, rather than two independently styled and focused widgets stacked inside each other.

A suitable structure is: associated label; one field group containing the input and sibling utility buttons; one anchored popup containing the options. There is one exterior control treatment. The popup is a distinct results surface, not a second closed select around another bordered search field. A separate searchable picker dialog can legitimately have its own search input, but it is explicitly a different selection workflow, not a faux combobox.

### State contract

Specify these independently before writing code:

- **Selected key:** the committed object identity, not its possibly duplicated name.
- **Input text:** the editable query or displayed selected label.
- **Active option:** the candidate navigated by keyboard, not yet committed.
- **Open state:** whether the result surface is available.
- **Result state:** query/scope identity, loading/error, continuation and current options.

Define what typing after a selection does, what blur restores, whether an empty selection is allowed, and whether clear removes only the query or also the selected value. Do not guess from whatever the library happens to do. A controlled key and controlled text require coordinated updates without a feedback loop. Preserve a selected object's label when its row is not on the current result page.

### Interaction contract

Arrow keys navigate options according to the primitive's pattern; Enter commits the active choice, not the parent form or an unrelated world action. Escape closes the popup before any enclosing panel; do not also clear an unsent draft. Tab follows the field's normal focus contract. Pointer selection and keyboard selection use the same callback. IME Enter completes composition before it can select or submit.

Announce loading and result changes without reading every keystroke aloud. Distinguish no matches from unavailable search. Scope changes restart the search. Ignore stale responses by request/query/scope identity, deduplicate paged rows by stable ID and prevent stale keyboard selection. Current Open Legend subject search already implements several of these protections; preserve them. [Implementation](../../apps/client/src/ui/subject-picker.tsx)

For asynchronous options, display only facts and names the caller is permitted to know. Do not broaden scope to obtain a better label. Keep the current eight-visible-row leaf-picker convention where applicable, but retain scrolling/paging; it is not a total result cap. A popup may flip and clamp within the viewport, remain anchored as the field moves, and scroll internally without moving the world camera.

These contracts follow APG and React Aria semantics, with Open Legend-specific safety rules. [F07](research.md#f07) [F08](research.md#f08)

## Clear-X: explicit, quiet and singular

A text-clear utility is not a primary action. Use the shared neutral utility treatment, `currentColor` for its glyph, an accessible name such as **Clear item search**, and a hit area distinct from the tiny drawing. Reserve layout space so text does not run beneath it. Keep the field focused after clearing when that supports continued typing. Show it only when there is something meaningful to clear; avoid shifting the surrounding layout when it appears.

A native `input[type=search]` can provide a browser-specific cancel button. MDN documents `::-webkit-search-cancel-button` as non-standard and associated with WebKit/Blink. The current inventory uses a native search input; this is a **possible**, not reproduced, explanation for the blue-X report. [F09](research.md#f09)

Inspect the actual rendered control and computed styles in the affected browser. Choose one owner: either deliberately accept and qualify native behavior, or use a shared SearchField with a custom clear control and suppress only the duplicate native affordance where supported. Do not globally remove browser appearance or focus outlines. Test Blink, WebKit and Firefox; a WebKit pseudo-element is not a cross-browser solution. No input may end up with two clear buttons, an invisible button intercepting text, or a clear button that submits the form.

## Forms and validation

Show persistent labels. Placeholders can provide an example, not the sole name or required format. Use defaults when they are safe and understandable; a default destination or quantity must not silently cause a destructive action. Keep units, available quantity and pertinent constraints close to the field. Preserve what the player typed while explaining the problem; do not coerce an empty number field to zero or clamp a typed value on every keystroke.

Validate at an appropriate point: constraints that matter on submission must be checked then, with earlier feedback after interaction when useful. Do not mark untouched fields invalid immediately. When a submit fails, preserve drafts, identify the affected fields and bring an error into view without jumping on every keystroke. For long forms provide an error summary with links to fields. Associate hints/errors programmatically. Server validation remains authoritative. [F05](research.md#f05)

Use one save model per form. **Save** commits the draft; **Discard changes** explicitly discards it; **Hide** can preserve it under the owning workflow. Changes across owner-editor tabs remain one draft until Save under the current contract. Do not save each field opportunistically because one input handler is easier to write.

## Accordions, tabs and plain sections

Use an accordion when users usually need only a subset of independent detail and the collapsed heading conveys what is inside. Permit multiple sections open when comparing them is useful. Retain expansion state while the player works. Surface non-default values and error counts in a collapsed summary; automatically reveal the actual invalid field on a failed submission.

Use plain sections when most content is needed, the page is already short, or users must compare parts. Do not replace ordinary scrolling with twenty disclosure clicks. Use tabs for peer views with clear names and stable state, not merely to hide a long form. A selected item's core comparison values belong together rather than in separate tabs that force memorization. [F02](research.md#f02)

## Which overlay?

| Pattern | Appropriate use | Focus and dismissal |
| --- | --- | --- |
| Tooltip | Short noninteractive explanation or label | Hover and focus; no hidden essential action; follow current plain-text style |
| Popover | Small contextual choice or filter tied to an anchor | Deliberate keyboard route, collision handling and return to anchor |
| Context menu | Commands for a specific object | Alternative discoverable route; no form embedded in a menu item |
| Docked panel / drawer / narrow sheet | Continued inspection, inventory, chat or authoring alongside play | Non-modal when the world remains interactive; preserve draft and reading position |
| Modal dialog | Bounded task that genuinely needs exclusive attention, or consequential confirmation | Background truly inert, managed focus, a clear exit and focus restoration |
| Dedicated workspace | Large comparison, complex authoring or settings beyond a small overlay | Clear navigation and return to prior world context |

Do not use a modal for a success notice, routine tooltip, every parameter edit or each step of an invention conversation. Do not chain dialogs when one structured review is clearer. Person creation and existing confirmed-conjuring/Similar inventions flows retain their canonical behavior.

A true modal has a label, appropriate initial focus, keyboard containment and a defined close/cancel outcome. Long explanatory content may need initial focus on a heading rather than the first destructive action. Closing returns focus to the opener or a sensible surviving destination. Nested confirmation, when unavoidable, must not dismiss or submit its parent too. Modal appearance without modal behavior is a bug. [F10](research.md#f10)

## Overlay ownership prevents overlap bugs

Share placement and dismissal behavior rather than patching each menu with larger z-index numbers. Account for portal theme scope, stacking contexts, viewport edges, browser zoom, moving anchors and software keyboards. Reserve space for focus outlines. A popup belongs above its host surface but must not escape the active modal's interaction boundary.

Handle outside pointer-down, drag completion and Escape once. A click that closes a picker is consumed by that dismissal and cannot become a world movement. A wheel over a scrollable result list scrolls the list, not the camera. Use existing input ownership where available; do not scatter event suppression across unrelated components. [World input contract](world-interaction.md#one-owner-for-each-gesture)
