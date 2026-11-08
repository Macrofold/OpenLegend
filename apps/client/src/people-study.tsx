import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

// Definitions and optional outfit IDs are study inputs. Every file still goes
// through the selected asset release and its current permission/hash checks.
const parameters = new URLSearchParams(location.search);
const familyPaths = parameters.getAll('family');
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
  const [movement, setMovement] = useState<PersonStudyMovement>('idle');
  const [paused, setPaused] = useState(true);
  const [view, setView] = useState<PersonStudyView>('front');
  const [control, setControl] = useState<string>();
  const wearer = wearers[selected]!;
  const snapshot = useSyncExternalStore(wearer.draft.subscribe, wearer.draft.getSnapshot);
  useEffect(() => {
    if (!canvas.current) return;
    const scene = new PersonStudyScene(
      canvas.current,
      wearers.map((entry) => appearance(entry, dressed)),
      () => {
        const states = scene.diagnostics().wearers;
        const error = states.find((state) => state.error)?.error;
        setStatus(
          error ??
            `${states.filter((state) => state.state === 'ready' && !state.preparing).length} of ${states.length} characters ready`,
        );
      },
    );
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
        className="people-study-comparison"
        aria-label="Four characters at the same scale. Use the view and movement controls to inspect their fit."
      />
      <div className="people-study-labels">
        {wearers.map((entry, index) => (
          <span key={index}>
            {entry.label}
            {selected === index ? ' · Editing' : ''}
          </span>
        ))}
      </div>
      <p role="status">{status}</p>
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
  const wearer = wearers[selected]!;
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
        <Comparison wearers={wearers} selected={selected} dressed={dressed} />
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
      if (familyPaths.length !== 2 || outfitParts.length > 8)
        throw new Error(
          'Open this study with its two selected family paths and optional outfit parts.',
        );
      const families = await Promise.all(
        familyPaths.map((path) => readAssetJson<AppearanceFamilyDefinition>(path, request.signal)),
      );
      const next: StudyWearer[] = [];
      for (const [index, family] of families.entries()) {
        validateAppearanceFamily(family);
        if (!family.compiled || !family.compiledPath)
          throw new Error('The selected collection is missing its compiled kit.');
        const presets = family.presets.slice(0, index === 0 ? 3 : 1);
        if (presets.length !== (index === 0 ? 3 : 1))
          throw new Error('The selected collection is missing its review presets.');
        for (const preset of presets) {
          const result = resolveAppearanceRecipe(family, {
            family: family.reference,
            controls: preset.controls,
            selections: preset.selections,
          });
          if (!result.ok) throw new Error(result.message);
          next.push({
            label: preset.label,
            family,
            draft: createPersonAppearanceDraft(family, result.recipe),
          });
        }
      }
      if (!request.signal.aborted) setWearers(next);
    })().catch((problem: unknown) => {
      if (!request.signal.aborted)
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
