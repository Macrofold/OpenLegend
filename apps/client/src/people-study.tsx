import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { validateAppearanceFamily } from '@open-legend/domain/appearance';
import { resolveAppearanceRecipe, type AppearanceFamilyDefinition } from '@open-legend/protocol';
import { readAssetJson } from './asset-files';
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

// Four explicit family/preset pairs choose the review wearers. Repeated family
// paths share one definition read; the same scene can compare baked references
// without introducing a separate actor. Exact release/permission reads still own access.
const parameters = new URLSearchParams(location.search);
const familyPaths = parameters.getAll('family');
const presetIds = parameters.getAll('preset');
const outfitParts = parameters.getAll('part');

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
}: {
  wearers: readonly StudyWearer[];
  selected: number;
  dressed: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<PersonStudyScene | undefined>(undefined);
  const [status, setStatus] = useState('Preparing comparison…');
  const [canMove, setCanMove] = useState(false);
  const [movement, setMovement] = useState<PersonStudyMovement>('idle');
  const [paused, setPaused] = useState(true);
  const [view, setView] = useState<PersonStudyView>('front');
  const [control, setControl] = useState<string>();
  const wearer = wearers[selected]!;
  const snapshot = useSyncExternalStore(wearer.draft.subscribe, wearer.draft.getSnapshot);
  useEffect(() => {
    if (!canvas.current) return;
    setCanMove(false);
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
    return () => {
      renderer.current = undefined;
      scene.destroy();
    };
    // Other controls update the existing actors; only a new input kit replaces the scene.
  }, [wearers]);
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
      <p className="ol-caption">
        The height marker is 1.80 m. Movement plays in place; hair can extend above anatomical
        height.
      </p>
      <PersonAppearanceControls
        family={wearer.family}
        draft={wearer.draft}
        selected={control}
        select={setControl}
        visibleControls={wearer.family.controls
          .filter((entry) => entry.maximum > entry.minimum)
          .map((entry) => entry.id)}
      />
    </>
  );
}

function Study({ wearers }: { wearers: readonly StudyWearer[] }) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState('editor');
  const [dressed, setDressed] = useState(true);
  const [count, setCount] = useState('four');
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
      </div>
      {mode === 'editor' ? (
        <PersonAppearanceEditor
          key={selected}
          family={wearer.family}
          draft={wearer.draft}
          parts={outfitParts}
          visibleControls={wearer.family.controls
            .filter((control) => control.maximum > control.minimum)
            .map((control) => control.id)}
          onPreview={() => {}}
        />
      ) : (
        <Comparison wearers={shown} selected={count === 'one' ? 0 : selected} dressed={dressed} />
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
