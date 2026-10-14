"""Apply the remaining reviewed corrections to the committed recovery checkpoint."""
from pathlib import Path


def edit(path, changes):
    file = Path(path)
    text = file.read_text()
    for before, after in changes:
        assert text.count(before) == 1, (path, before[:100], text.count(before))
        text = text.replace(before, after, 1)
    file.write_text(text)


edit('apps/client/src/ui/action-attempts.tsx', [
    ('  targetId?: string;\n  timeline: string;', '  targetId?: string;\n  subjectLabel: string;\n  timeline: string;'),
    ("    ['enqueue', 'replace', 'interrupt'].includes(String(value.mode)) &&", "    typeof value.mode === 'string' &&\n    ['enqueue', 'replace', 'interrupt'].includes(value.mode) &&\n    'subjectLabel' in value && boundedText(value.subjectLabel, 500) &&"),
    ('    retainedRef.current = next;\n    setRetained(next);', "    retainedRef.current = next;\n    submission.current = next.status === 'pending' ? next.request : null;\n    setRetained(next);"),
    ("  const [busy, setBusy] = useState(false);", "  const [busy, setBusy] = useState(false);\n  const [requestPhase, setRequestPhase] = useState<'sending' | 'checking' | null>(null);"),
    ('      targetId: targetId || undefined,\n      mode:', "      targetId: targetId || undefined,\n      subjectLabel: currentSubject?.name ?? 'No fixed subject',\n      mode:"),
    ("      const { timeline: _timeline, ...body } = submitted;\n      const result = await post('/api/action-attempt', body);", "      setRequestPhase('sending');\n      const { timeline: _timeline, subjectLabel: _subjectLabel, ...body } = submitted;\n      const result = await post('/api/action-attempt', body);"),
    ("      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', submitted);", "      setRequestPhase('checking');\n      const { subjectLabel: _subjectLabel, ...request } = submitted;\n      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', request);"),
    ('          <strong>Original action result not confirmed</strong>', "          <strong>{requestPhase === 'sending' ? 'Sending original action…' : requestPhase === 'checking' ? 'Checking original action…' : 'Original action result not confirmed'}</strong>"),
    ('              <p>{retained.request.text}</p>', '              <p>{retained.request.text}</p>\n              <p className="ol-caption">Original subject: {retained.request.subjectLabel}</p>'),
])
path = Path('apps/client/src/ui/action-attempts.tsx')
text = path.read_text()
needle = '      inFlight.current = false;\n      if (alive.current) setBusy(false);'
assert text.count(needle) == 2
path.write_text(text.replace(needle, '      inFlight.current = false;\n      if (alive.current) { setRequestPhase(null); setBusy(false); }'))

edit('apps/client/src/ui/game-saves.tsx', [
    ('{confirm && !unresolved && (', '{confirm && (!unresolved || rowBusy) && ('),
    ('            <strong>Checkpoint result not confirmed</strong>', "            <strong>{creating || rowBusy ? 'Checkpoint operation in progress…' : checking ? 'Checking original checkpoint…' : 'Checkpoint result not confirmed'}</strong>"),
])

# The diagnostic world deliberately reuses camp materials and practice objects. Keep
# their authored definitions without making those laws defaults for other worlds.
edit('packages/domain/src/world-presets.ts', [
    ("import { worldPlacement } from './spatial-state.js';", "import { CANOPY_ATTRIBUTES } from './worlds/base/canopies.js';\nimport { SLING_HANDLING } from './worlds/base/practical-competence.js';\nimport { worldPlacement } from './spatial-state.js';"),
    ('    [integrity, ...RESERVOIR_DEMO_ATTRIBUTES],', "    // This preset reuses the camp's actual shelter materials and practice target.\n    // Their rules remain authored dependencies; human food/energy meters do not.\n    [integrity, ...RESERVOIR_DEMO_ATTRIBUTES, ...CANOPY_ATTRIBUTES, SLING_HANDLING],"),
])
print('Prepared recovery context/focus corrections and selected clockwork material/practice definitions.')
