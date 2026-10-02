# Controls, forms and overlays

[Handbook](README.md) · [React](react.md) · [Verification](verification.md)

## Choose the semantic control first

| Player intent                                   | Preferred pattern                                                                            | Avoid                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Perform a command                               | Button with a verb                                                                           | Link styling for a mutation; an interactive row wrapping nested buttons |
| Navigate to a place/view                        | Link or established navigation control                                                       | A button that silently changes an unrelated object                      |
| Choose one of a few visible alternatives        | Radio group or segmented choice                                                              | Hiding important differences solely for compactness                     |
| Choose from a catalogue                         | Select, editable combobox or explicitly opened searchable picker according to the task below | Treating every searchable selection as the same widget                  |
| Find records without selecting a form value     | Search field plus results region                                                             | Treating highlighted search text as a committed object                  |
| Choose independent options                      | Checkboxes or a checkable collection                                                         | Single-select semantics or tags with no selection state                 |
| Apply an immediate persistent on/off preference | Switch with current state                                                                    | Secretly deferring a switch until Save                                  |
| Edit an on/off value in a staged form           | Checkbox within the form's save model                                                        | Mixing immediate and staged updates without explanation                 |
| Set an exact quantity                           | Number field with units and validation; optional step controls                               | Slider alone for precise inventory quantities                           |
| Explore continuous visual preference            | Slider plus understandable value/reset                                                       | Implying simulation changes from visual settings                        |
| Reveal optional detail                          | Disclosure/accordion                                                                         | Hiding required fields or comparisons                                   |
| Move among peer views                           | Tabs with retained context                                                                   | Tabs for sequential wizard steps or unrelated global navigation         |

These are defaults chosen for clarity, not a ban on another accessible pattern with an explicit save/interaction contract. Prefer existing native or React Aria primitives; selecting a pattern does not mean installing another library. [F07](research.md#f07) [F08](research.md#f08)

## A combobox is one composite control

The reported nested-typeahead failure is a regression case, not a reason to prohibit every search field in an opened picker. Choose between these two legitimate workflows:

| Pattern                         | Use when                                                                 | Structure and meaning                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editable combobox               | The field itself is where the player types and chooses a value           | Label; one field group with input and sibling utilities; associated options popup. Text, active option and selected key remain distinct.                                                      |
| Button-opened searchable picker | Choosing is a separate task, especially a richer or multi-selection task | Named button displaying the current choice opens a labeled panel/dialog with its own search field and collection. The search field is inside that surface, **not inside the trigger button**. |

For the combobox, use one exterior field treatment rather than a complete bordered search field nested inside a second closed-select treatment. For the picker, separate trigger and search appearances are legitimate because they have different jobs. Its modality, initial focus, selection, confirmation and cancellation must be explicit. It may adapt to a sheet/dialog on a small viewport without losing the choice under review.

GitHub Primer documents and implements the second pattern. Its source distinguishes direct anchored selection from an intermediate modal choice. Neither component callbacks nor closing an overlay inherently establish durable game mutation. Retain Open Legend's existing Save/Send/approval boundaries. [S01](research.md#s01)

### State contract

Specify these independently before writing code:

- **Selected key:** the chosen object identity, not its possibly duplicated name.
- **Input text:** editable query or the selected label, as appropriate to the pattern.
- **Active option:** the keyboard candidate, not automatically chosen.
- **Open state:** whether the results or selection task is available.
- **Result state:** query/scope identity, loading/error, continuation and current options.

Also distinguish a locally chosen value from a saved form or executed command. Define typing after selection, blur behavior, whether empty selection is allowed, and whether clear removes the query or the selected value. Do not infer these from library defaults. Coordinated controlled text/key updates must not create a feedback loop; retain the selected label when its row is on another page.

### Interaction contract

Arrow keys follow the selected primitive's navigation pattern. Enter with an active combobox option commits that choice, not a parent form or unrelated world action. Escape closes the child popup before its enclosing surface. Tab follows the field's focus contract; pointer and keyboard selection reach the same semantic callback. IME confirmation finishes composition rather than selecting/submitting. Ordinary explicit Enter-to-send or native form behavior remains available where the owning workflow specifies it.

Do not make focused, highlighted, selected and saved visually or semantically interchangeable. A multi-select picker must expose retained selections while filtering without claiming that invisible selections were removed. Define whether Cancel restores the opening selection or merely closes; do not label a destructive reset Cancel.

Announce results/loading without reading every keystroke. Distinguish no matches from unavailable search. Restart on scope changes, ignore stale completions, deduplicate pages by ID and prevent selecting stale results. Current [SubjectPicker](../../apps/client/src/ui/subject-picker.tsx) already implements several protections; preserve them.

Use only permitted names/facts; do not broaden scope to obtain a nicer label. Preserve the eight-visible-row leaf-picker convention where applicable without turning it into a total-result cap. Results can scroll and the popup can flip/clamp, stay anchored and avoid scrolling the world. Follow APG and the installed React Aria implementation, not the latest upstream code blindly. [F07](research.md#f07) [F08](research.md#f08)

## Clear-X: explicit, quiet and singular

Use the shared neutral utility treatment, a `currentColor` glyph, a specific accessible name such as **Clear item search**, and a usable hit area. Reserve trailing space so text does not run under it. Keep input focus when clearing supports further typing; appearing/disappearing utilities should not shift nearby controls. A clear control must never submit the form or delete the underlying object.

This is a semantic-role rule, **not a prohibition on blue everywhere**. Browser default-blue decoration that conflicts with the theme is different from a deliberate focus ring or user-selected forced-color palette. Preserve accessibility colors and visible focus instead of overriding them to satisfy a screenshot. Adobe's close-button guidance likewise separates the utility from its focus treatment. [S12](research.md#s12)

A native `input[type=search]` can provide browser-specific cancellation. MDN documents the non-standard WebKit/Blink cancel pseudo-element. The current inventory's native search input makes browser chrome a **possible, unconfirmed** explanation of the report. [F09](research.md#f09)

Inspect the rendered control and computed styles. Either deliberately qualify native behavior or use a shared SearchField with a custom utility, suppressing only duplicate native affordances where supported. Do not globally reset browser appearance or remove outlines. Test the relevant Blink, WebKit and Firefox paths: a WebKit pseudo-element is not a cross-browser solution. No double clear buttons or invisible utility hitboxes covering editable text.

## Disabled controls and reachable explanations

A native disabled HTML control is normally absent from keyboard focus. Therefore “show the reason on focus” is not a complete design. Put an important reason inline or provide a separately reachable explanation near the action. Supplementary tooltip content cannot be the only way to discover a blocking condition. Preserve the current unavailable-actions disclosure policy; once that section is opened, its reasons still need a usable route. [S02](research.md#s02) [S11](research.md#s11)

Where discoverability genuinely requires focus on an unavailable action, an appropriate `aria-disabled` pattern may retain focus. It must also suppress activation in every relevant handler and preserve server enforcement: the attribute alone changes neither behavior nor focus order. `pointer-events: none` alone does not prevent keyboard activation. Do not make every disabled action a Tab stop, and do not disable a container indiscriminately when its children still need interaction.

## Forms and validation

Use persistent labels, not placeholder-only names. Keep units, quantities and constraints near the field. Defaults must be safe and understandable, not a hidden destructive destination or amount. Preserve typed drafts through temporary incomplete input; do not coerce a blank numeric field to zero or clamp every keystroke. Parse and validate according to the supported locale and world quantity contract, not presentation formatting alone.

Check required constraints on submit, with earlier feedback after interaction when useful. Do not label untouched fields invalid immediately. On failure retain drafts, associate the specific error, reveal the affected section and bring the error into view without jumping on each edit. Long forms may need an error summary linked to their fields. Server validation remains authoritative. [F05](research.md#f05)

Use one comprehensible save model: **Save** commits; **Discard changes** discards; **Hide** preserves where the owner says so. Owner-editor tabs share one draft until Save. Neither selecting a row nor leaving a field should silently change that contract.

## Accordions, tabs and plain sections

Use accordions for selectively needed independent detail whose headings explain the contents. Allow several open when comparison helps; retain expansion while working. Surface non-default values/errors in summaries and reveal invalid fields after failed submission.

Use plain sections when most content is needed or simultaneous comparison matters. Do not replace scrolling with twenty disclosure clicks. Tabs represent peer views with stable state, not a way to scatter comparison values across screens. [F02](research.md#f02)

## Which overlay?

| Pattern                       | Appropriate use                                                          | Focus and dismissal                                                                        |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Tooltip                       | Short supplementary, noninteractive label/explanation                    | Hover and focus where supported; no essential-only instruction; current plain-text styling |
| Popover                       | Small contextual choice or filter                                        | Defined keyboard route, collision handling and return to anchor                            |
| Context menu                  | Commands for a particular object                                         | Alternative discoverable route; no form inside a menu item                                 |
| Panel / drawer / narrow sheet | Continued inspection, inventory, chat or authoring                       | May be modal or non-modal; declare actual behavior rather than infer it from appearance    |
| Modal dialog                  | Bounded task requiring exclusive attention or consequential confirmation | Background inert, managed focus, clear exit, focus restoration                             |
| Dedicated workspace           | Larger comparison or authoring task                                      | Clear return to the prior world and selection                                              |

A tooltip cannot contain interactive links or controls. Use an explicitly opened popover/detail view for that content. Keep supplementary hover content dismissible and usable when the pointer moves onto it as required by the pattern; never use a tooltip to hide a required decision. [S02](research.md#s02) [S11](research.md#s11)

Do not use a modal for routine success, every parameter edit or each invention turn. Confirmations should address meaningful irreversible consequences rather than routine reversible operations; offer undo only when actually supported. Existing Person creation, Similar inventions and confirmed-conjuring behavior stays controlling. [S14](research.md#s14)

A true modal has a label, deliberate initial focus, keyboard containment and defined cancellation. Long content may warrant initial focus on a heading rather than a destructive action. Return focus to the opener or a sensible surviving target. An unavoidable nested confirmation cannot also dismiss/submit its parent. Modal styling without modal behavior is a defect. [F10](research.md#f10)

## Overlay ownership prevents overlap bugs

Reuse placement/dismissal behavior rather than patching each menu with z-index escalation. Account for portals, theme scope, stacking contexts, zoom, moving anchors, focus rings and software keyboards. Preserve context across a popup-to-sheet adaptation and use actual visible viewport space where needed; browser layout height alone may not describe space above an on-screen keyboard. Adobe's mobile combobox engineering is a useful historical explanation of this problem, not a reason to copy its old browser workaround without rechecking. [S03](research.md#s03)

The modal defines the eligible interaction boundary; **within it, the active child layer handles dismissal before its parent**. Moving focus into a child popover must not close the parent dialog. Escape dismisses one eligible layer; an outside gesture has one owner across start and release. Adobe's overlay source explicitly manages these cases. [S04](research.md#s04)

A world click consumed to dismiss a picker must not become movement. Wheel interaction with its scrollable results must not zoom the camera. Reuse shared input ownership rather than scattered suppression handlers. This does not mean every ordinary non-modal popover must swallow an intentional click on another UI control: document that component's contract separately from the protected world-action boundary. [World contract](world-interaction.md#one-owner-for-each-gesture)
