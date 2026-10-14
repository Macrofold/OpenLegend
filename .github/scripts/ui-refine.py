"""Apply corrections supported by the original ae12 recovery traces."""
from pathlib import Path


def edit(path, changes):
    file = Path(path)
    text = file.read_text()
    for before, after in changes:
        assert text.count(before) == 1, (path, before[:100], text.count(before))
        text = text.replace(before, after, 1)
    file.write_text(text)


plan = Path('docs/projects/game-interaction-redesign-completion.md')
plan.write_text(plan.read_text() + '''

### Trace-supported completion corrections

The ae12 native browser run passes checkpoint creation through reply loss, reload
and phone adaptation. Its recorded load retains the same native checkpoint owner
while replacing the timeline, but the old stream sends an undifferentiated access
invalidation. Classify a timeline-only stream reset only after the existing authority
owner accepts the exact old scope with the new timeline and current save permission.
That public signal contains no private payload and permits retaining only the local
read-only checkpoint description; genuine revocation still clears all private drafts.
Fresh state and every receipt read continue to validate current authority.

The action scheduling label is present but is clipped by competing nested scroll
areas. Use the existing Character page as the single vertical scroll owner while
editing; keep Practice in the retained browsing content, not above the focused form.
The action footer scrolls with its form rather than covering fields. Keep ordinary
pointer selection, keyboard navigation, exact request identity and the original
60-second journey deadline.

Construct bodies deliberately have no equipment attachment points. The fresh
clockwork preset must release inherited worn items into the same character's carried
belongings through the existing object owner before replacing those bodies. Preserve
real items, quantities and custody; do not change universal anatomy or weaken current
validation. This is initial preset composition, not a stored-world migration.
''')

edit('apps/server/src/http.ts', [
    ("    if (streams.get(stream)?.blocked) stream.destroy();\n    else stream.end('event: access-changed\\ndata: {}\\n\\n');", """    const state = streams.get(stream);
    if (state?.blocked) stream.destroy();
    else {
      // A load changes the timeline, not current account/grant ownership. Prove
      // that distinction with the existing authority owner before permitting a
      // client to retain only its read-only checkpoint outcome description.
      // docs/save-and-load.md#continuation-and-identity
      const timelineOnly =
        state &&
        state.scope.timelineId !== service.timelineId &&
        service.currentScope({ ...state.scope, timelineId: service.timelineId }, 'save');
      stream.end(`event: ${timelineOnly ? 'timeline-changed' : 'access-changed'}\\ndata: {}\\n\\n`);
    }"""),
])
edit('apps/client/src/main.tsx', [
    ("      source.addEventListener('access-changed', () => {", """      source.addEventListener('timeline-changed', () => {
        if (!active || source !== connection) return;
        // The server proved that only the saved timeline changed. Old gameplay
        // commands and other private drafts still disappear; checkpoint recovery
        // is read-only and fresh state rechecks the exact retained owner.
        pauseTab();
        clearAccess({ preserveCheckpointResultsFor: current.checkpoint?.recoveryScope });
        resetApplication();
      });
      source.addEventListener('access-changed', () => {"""),
])

file = Path('apps/client/src/ui/panels.tsx')
text = file.read_text()
start = text.index('          {!!view.player.practice?.length && (')
end = text.index('          <OutingStatus', start)
practice = text[start:end].rstrip()
text = text[:start] + text[end:]
anchor = '            <Section title="Actions available to you">'
assert text.count(anchor) == 1
text = text.replace(anchor, '\n'.join('  ' + line for line in practice.splitlines()) + '\n' + anchor, 1)
file.write_text(text)
edit('apps/client/src/ui/character-actions.css', [
    (".ol-character-page:has(.ol-action-intention:not([hidden])),\n.ol-character-actions:has(.ol-action-intention:not([hidden])) {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-block-size: 0;\n  overflow: hidden;\n}\n.ol-character-actions:has(.ol-action-intention:not([hidden])) {\n  overflow: auto;\n}", """/* One vertical scroll owner keeps scheduling choices and the action footer
 * reachable together, including after current work or recovery text changes. */
.ol-character-page:has(.ol-action-intention:not([hidden])) {
  display: block;
  overflow: auto;
}
.ol-character-actions:has(.ol-action-intention:not([hidden])) {
  display: grid;
  flex: none;
  overflow: visible;
}"""),
    ('.ol-action-intention {\n  display: flex;\n  flex-direction: column;\n  flex: 1;', '.ol-action-intention {\n  display: flex;\n  flex-direction: column;\n  flex: none;'),
    ('.ol-action-fields {\n  display: grid;\n  flex: 1;\n  min-block-size: 64px;\n  gap: var(--space-3);\n  overflow: auto;', '.ol-action-fields {\n  display: grid;\n  flex: none;\n  min-block-size: 0;\n  gap: var(--space-3);\n  overflow: visible;'),
])
edit('packages/domain/src/world-presets.ts', [
    ("import { worldPlacement } from './spatial-state.js';", "import { directChildIds, unequipLot } from './objects.js';\nimport { worldPlacement } from './spatial-state.js';"),
    ("    if (actor.controller !== 'native') {\n      actor.species = 'construct';", """    if (actor.controller !== 'native') {
      // Fresh constructs have no wearing ports. Keep inherited equipment as the
      // same carried belongings through the ordinary placement/revision owner.
      for (const id of directChildIds(world, entity.id))
        if (world.entities[id]?.placement?.mode === 'attached') unequipLot(world, entity.id, id);
      actor.species = 'construct';"""),
])
print('Prepared trace-supported stream reset, focused action scrolling and fresh construct equipment reconciliation.')
