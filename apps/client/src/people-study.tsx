import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { validateAppearanceFamily } from '@open-legend/domain/appearance';
import { resolveAppearanceRecipe, type AppearanceFamilyDefinition } from '@open-legend/protocol';
import { readAssetJson } from './asset-files';
import { downloadJson } from './download-json';
import { StudyCapture } from './study-capture';
import {
  PersonStudyScene,
  type PersonStudyMovement,
  type PersonStudyView,
} from './characters/person-study-scene';
import { Button, SelectField } from './design-system/components';
import {
  createPersonAppearanceDraft,
  PersonAppearanceControls,
} from './ui/person-appearance-controls';
import { PersonAppearanceEditor } from './ui/person-appearance-editor';
import type { PersonAppearanceDraft } from './ui/person-appearance-draft';
import './design-system/tokens/tokens.css';
import './design-system/components.css';
import './people-study.css';

interface StudyWearer {
  label: string;
  family: AppearanceFamilyDefinition;
  draft: PersonAppearanceDraft;
}

type LifetimeReport = NonNullable<ReturnType<PersonStudyScene['destroy']>>;

// Four explicit family/preset pairs choose the review wearers. Repeated family
// paths share one definition read; the same scene can compare baked references
// without introducing a separate actor. Exact release/permission reads still own access.
const parameters = new URLSearchParams(location.search);
const familyPaths = parameters.getAll('family');
const presetIds = parameters.getAll('preset');
const outfitParts = parameters.getAll('part');
const profiling = parameters.get('profile') === '1';

function appearance(wearer: StudyWearer, dressed: boolean) {
  const { compiled, compiledPath } = wearer.family;
  if (!compiled || !compiledPath) throw new Error('This collection has no compiled character kit.');
  return {
    recipe: wearer.draft.getSnapshot().recipe,
    definition: wearer.family,
    compiled,
    compiledPath,
    parts: dressed ? outfitParts : [],
  };
}

function Comparison({
  wearers,
  selected,
  dressed,
  clay,
  onDestroyed,
}: {
  wearers: readonly StudyWearer[];
  selected: number;
  dressed: boolean;
  clay: boolean;
  onDestroyed(report: LifetimeReport): void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<PersonStudyScene | undefined>(undefined);
  const videoCapture = useRef<StudyCapture | undefined>(undefined);
  const [status, setStatus] = useState('Preparing comparison…');
  const [recordingStatus, setRecordingStatus] = useState('');
  const [recording, setRecording] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturingEdits, setCapturingEdits] = useState(false);
  const [movement, setMovement] = useState<PersonStudyMovement>('idle');
  const [paused, setPaused] = useState(true);
  const [view, setView] = useState<PersonStudyView>('front');
  const [control, setControl] = useState<string>();
  const wearer = wearers[selected]!;
  const snapshot = useSyncExternalStore(wearer.draft.subscribe, wearer.draft.getSnapshot);
  const recordInput = profiling
    ? (event: { timeStamp: number }) => renderer.current?.recordInput(event.timeStamp)
    : undefined;
  useEffect(() => {
    if (!canvas.current) return;
    setCanMove(false);
    setCapturing(false);
    setCapturingEdits(false);
    setRecording(false);
    setRecordingStatus('');
    setStatus('Preparing comparison…');
    const scene = new PersonStudyScene(
      canvas.current,
      wearers.map((entry) => appearance(entry, dressed)),
      () => {
        const states = scene.diagnostics().wearers;
        const error = states.find((state) => state.error)?.error;
        const ready = states.filter(
          (state) => state.state === 'ready' && !state.preparing && !state.error,
        ).length;
        const motionReady =
          ready === states.length &&
          states.every(
            (state) =>
              !!state.motion &&
              ['Idle', 'Walk', 'Run'].every((clip) => state.availableMotions.includes(clip)),
          );
        setCanMove(motionReady);
        setStatus(
          error ??
            `${ready} of ${states.length} characters ready${ready === states.length && !motionReady ? ' · Usable Idle, Walk and Run clips are required for movement.' : ''}`,
        );
      },
    );
    // A one/four-wearer replacement preserves the visible control choices.
    scene.setView(view);
    scene.setMovement(movement);
    scene.setPaused(paused);
    renderer.current = scene;
    const capture = new StudyCapture(canvas.current);
    videoCapture.current = capture;
    return () => {
      renderer.current = undefined;
      videoCapture.current = undefined;
      capture.destroy();
      const report = scene.destroy();
      if (report) onDestroyed(report);
    };
    // Other controls update the existing actors; only a new input kit replaces the scene.
  }, [wearers, onDestroyed]);
  useEffect(() => {
    renderer.current?.setClay(clay);
  }, [clay, wearers, onDestroyed]);
  useEffect(() => {
    renderer.current?.setAppearance(selected, appearance(wearer, dressed), snapshot.editing);
  }, [selected, wearer, dressed, snapshot.recipe, snapshot.editing]);
  useEffect(() => {
    wearers.forEach((entry, index) =>
      renderer.current?.setAppearance(
        index,
        appearance(entry, dressed),
        entry.draft.getSnapshot().editing,
      ),
    );
  }, [wearers, dressed]);
  return (
    <>
      <div className="people-study-toolbar">
        <SelectField
          label="View"
          value={view}
          options={[
            { id: 'front', label: 'Front' },
            { id: 'quarter', label: 'Three-quarter' },
            { id: 'left', label: 'Left side' },
            { id: 'right', label: 'Right side' },
            { id: 'back', label: 'Back' },
            { id: 'game', label: 'Game camera' },
          ]}
          onChange={(value) => {
            const next = value as PersonStudyView;
            setView(next);
            renderer.current?.setView(next);
          }}
        />
        <SelectField
          label="Movement"
          disabled={!canMove}
          value={movement}
          options={[
            { id: 'idle', label: 'Idle' },
            { id: 'walk', label: 'Walk' },
            { id: 'run', label: 'Run' },
            { id: 'transitions', label: 'Start, walk, run and stop' },
          ]}
          onChange={(value) => {
            const next = value as PersonStudyMovement;
            setMovement(next);
            renderer.current?.setMovement(next);
          }}
        />
        <Button
          variant="quiet"
          aria-pressed={!paused}
          disabled={!canMove && paused}
          onPress={() => {
            renderer.current?.setPaused(!paused);
            setPaused(!paused);
          }}
        >
          {paused ? 'Play movement' : 'Pause movement'}
        </Button>
        <Button
          variant="quiet"
          disabled={!canMove || paused || recording || capturing || capturingEdits}
          onPress={() => {
            const capture = videoCapture.current;
            if (!capture || !canMove || paused || recording || capturing || capturingEdits) return;
            const started = capture.record(
              `character-study-${wearers.length}-${movement}-${view}`,
              (message) => {
                if (videoCapture.current !== capture) return;
                setRecording(false);
                setRecordingStatus(message);
              },
            );
            if (started) {
              setRecording(true);
              setRecordingStatus('Recording 8 seconds…');
            }
          }}
        >
          Record 8 seconds
        </Button>
        {profiling && (
          <>
            <Button
              variant="quiet"
              disabled={!canMove || paused || capturing || capturingEdits || recording}
              onPress={() => {
                renderer.current?.startCapture();
                setCapturing(true);
              }}
            >
              Start frame capture
            </Button>
            <Button
              variant="quiet"
              disabled={!canMove || capturing || capturingEdits || recording}
              onPress={() => {
                renderer.current?.startEditCapture();
                setCapturingEdits(true);
              }}
            >
              Start edit capture
            </Button>
            <Button
              variant="quiet"
              disabled={!capturingEdits || recording}
              onPress={() => {
                const report = renderer.current?.stopEditCapture();
                setCapturingEdits(false);
                if (report) downloadJson('character-edit-capture.json', report);
              }}
            >
              Save edit capture
            </Button>
            <Button
              variant="quiet"
              disabled={!capturing || recording}
              onPress={() => {
                const report = renderer.current?.stopCapture();
                setCapturing(false);
                if (report) downloadJson('character-frame-capture.json', report);
              }}
            >
              Save frame capture
            </Button>
          </>
        )}
      </div>
      <canvas
        ref={canvas}
        id="people-study-comparison"
        className="people-study-comparison"
        aria-label={`${wearers.length === 1 ? 'Selected character' : 'Four characters at the same scale'}. Use the view and movement controls to inspect their fit.`}
      />
      <div
        className="people-study-labels"
        style={{ gridTemplateColumns: `repeat(${wearers.length}, minmax(0, 1fr))` }}
      >
        {wearers.map((entry, index) => (
          <span key={index}>
            {entry.label}
            {selected === index ? ' · Editing' : ''}
          </span>
        ))}
      </div>
      <p role="status">{status}</p>
      {recordingStatus && <p role="status">{recordingStatus}</p>}
      <p className="ol-caption">
        The height marker is 1.80 m. Movement plays in place; hair can extend above anatomical
        height.
      </p>
      {profiling && (
        <p className="ol-caption" role="status">
          {capturingEdits
            ? 'Sweep the same control 20 times, let the final update appear, then save the edit capture.'
            : capturing
              ? 'Capturing frames. Keep this view in front without changing its controls; save after 30 seconds.'
              : 'For each frame sample, play the same movement for 10 seconds before starting a 30-second capture.'}
        </p>
      )}
      <div
        onPointerDownCapture={recordInput}
        onPointerMoveCapture={recordInput}
        onPointerUpCapture={recordInput}
        onKeyDownCapture={recordInput}
        onInputCapture={recordInput}
      >
        <PersonAppearanceControls
          family={wearer.family}
          draft={wearer.draft}
          selected={control}
          select={setControl}
          visibleControls={wearer.family.controls
            .filter((entry) => entry.maximum > entry.minimum)
            .map((entry) => entry.id)}
        />
      </div>
    </>
  );
}

function Study({ wearers }: { wearers: readonly StudyWearer[] }) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState('editor');
  const [dressed, setDressed] = useState(true);
  const [clay, setClay] = useState(false);
  const [count, setCount] = useState('four');
  const [lifetimes, setLifetimes] = useState<{ total: number; samples: LifetimeReport[] }>({
    total: 0,
    samples: [],
  });
  const recordLifetime = useCallback((report: LifetimeReport) => {
    setLifetimes((previous) => ({
      total: previous.total + 1,
      samples: [...previous.samples.slice(-63), report],
    }));
  }, []);
  const wearer = wearers[selected]!;
  // This identity owns the scene lifetime. Selecting a different wearer in the
  // four-person view must not replace the other three actors.
  const shown = useMemo(() => (count === 'one' ? [wearer] : wearers), [count, wearer, wearers]);
  return (
    <main className="people-study">
      <header>
        <p className="ol-caption">Private developer study · Experimental foundations</p>
        <h1>Build a character from the kit</h1>
        <p>
          Adjust body and face proportions, then compare clothing and movement at a shared scale.
          These choices do not change game abilities.
        </p>
      </header>
      <div className="people-study-toolbar">
        <SelectField
          label="Character to edit"
          value={String(selected)}
          options={wearers.map((entry, index) => ({ id: String(index), label: entry.label }))}
          onChange={(value) => setSelected(Number(value))}
        />
        <SelectField
          label="Inspection"
          value={mode}
          options={[
            { id: 'editor', label: 'One character' },
            { id: 'comparison', label: 'Compare characters' },
          ]}
          onChange={setMode}
        />
        <Button
          variant={clay ? 'solid' : 'secondary'}
          aria-pressed={clay}
          onPress={() => setClay(!clay)}
        >
          Gray clay
        </Button>
        {mode === 'comparison' && (
          <SelectField
            label="Characters shown"
            value={count}
            options={[
              { id: 'one', label: 'Selected character' },
              { id: 'four', label: 'All four characters' },
            ]}
            onChange={setCount}
          />
        )}
        {mode === 'comparison' && !!outfitParts.length && (
          <Button variant="quiet" aria-pressed={dressed} onPress={() => setDressed(!dressed)}>
            {dressed ? 'Show base clothing' : 'Show outfit'}
          </Button>
        )}
        {profiling && (
          <Button
            variant="quiet"
            disabled={!lifetimes.total}
            onPress={() =>
              downloadJson('character-resource-capture.json', {
                ...lifetimes,
                dropped: lifetimes.total - lifetimes.samples.length,
                familyPaths,
                presetIds,
                browser: navigator.userAgent,
              })
            }
          >
            Save resource capture
          </Button>
        )}
      </div>
      {mode === 'editor' ? (
        <PersonAppearanceEditor
          key={selected}
          family={wearer.family}
          draft={wearer.draft}
          parts={outfitParts}
          clay={clay}
          visibleControls={wearer.family.controls
            .filter((control) => control.maximum > control.minimum)
            .map((control) => control.id)}
          onPreview={() => {}}
        />
      ) : (
        <Comparison
          wearers={shown}
          selected={count === 'one' ? 0 : selected}
          dressed={dressed}
          clay={clay}
          onDestroyed={recordLifetime}
        />
      )}
    </main>
  );
}

function LoadStudy() {
  const [wearers, setWearers] = useState<StudyWearer[]>();
  const [error, setError] = useState('');
  useEffect(() => {
    const request = new AbortController();
    void (async () => {
      if (familyPaths.length !== 4 || presetIds.length !== 4 || outfitParts.length > 8)
        throw new Error(
          'Open this study with four selected family/preset pairs and optional outfit parts.',
        );
      const families = new Map<string, AppearanceFamilyDefinition>();
      await Promise.all(
        [...new Set(familyPaths)].map(async (path) => {
          const family = await readAssetJson<AppearanceFamilyDefinition>(path, request.signal);
          validateAppearanceFamily(family);
          if (!family.compiled || !family.compiledPath)
            throw new Error('The selected collection is missing its compiled kit.');
          families.set(path, family);
        }),
      );
      const next = familyPaths.map((path, index): StudyWearer => {
        const family = families.get(path);
        if (!family) throw new Error('The selected character collection did not open.');
        const preset = family.presets.find((entry) => entry.id === presetIds[index]);
        if (!preset) throw new Error('The selected collection is missing its review preset.');
        const result = resolveAppearanceRecipe(family, {
          family: family.reference,
          controls: preset.controls,
          selections: preset.selections,
        });
        if (!result.ok) throw new Error(result.message);
        return {
          label: preset.label,
          family,
          draft: createPersonAppearanceDraft(family, result.recipe),
        };
      });
      if (!request.signal.aborted) setWearers(next);
    })().catch((problem: unknown) => {
      if (request.signal.aborted) return;
      request.abort();
      setError(problem instanceof Error ? problem.message : 'The character kit could not open.');
    });
    return () => request.abort();
  }, []);
  if (error)
    return (
      <main className="people-study">
        <h1>Character study unavailable</h1>
        <p role="alert">{error}</p>
        <p>Check the selected asset release and your access, then reopen the study.</p>
      </main>
    );
  return wearers ? (
    <Study wearers={wearers} />
  ) : (
    <main className="people-study">
      <h1>Character foundation study</h1>
      <p role="status">Opening the selected character kits…</p>
    </main>
  );
}

const root = document.getElementById('people-study');
if (!root) throw new Error('Character study root is missing.');
createRoot(root).render(<LoadStudy />);
