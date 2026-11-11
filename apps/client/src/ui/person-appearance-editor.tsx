import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import {
  appearanceControlRange,
  resolveAppearanceRecipe,
  validAppearanceRecipeShape,
  type AppearanceFamilyDefinition,
  type AppearanceRecipe,
} from '@open-legend/protocol';
import { Button, SelectField } from '../design-system/components';
import { useLoadingStatus } from '../design-system/loading';
import { downloadJson } from '../download-json';
import type {
  PersonPreview,
  PersonPreviewHandle,
  PersonPreviewState,
  PersonPreviewView,
} from '../world-renderer';
import { PersonAppearanceControls } from './person-appearance-controls';
import type { PersonAppearanceDraft, PersonDraftSnapshot } from './person-appearance-draft';

const emptySnapshot = () => undefined;
const emptySubscription = () => () => {};
export function useAppearanceDraft(draft: PersonAppearanceDraft | undefined) {
  return useSyncExternalStore(
    draft?.subscribe ?? emptySubscription,
    draft?.getSnapshot ?? emptySnapshot,
  );
}
export interface AppearancePreviewValidity {
  recipe: AppearanceRecipe;
  parts?: readonly string[];
  ready: boolean;
  error?: string;
}

export function appearancePreviewProblem(
  snapshot: PersonDraftSnapshot,
  preview: AppearancePreviewValidity | undefined,
  parts: readonly string[],
): string | undefined {
  const error = Object.values(snapshot.errors)[0];
  if (error) return error;
  if (!preview || preview.recipe !== snapshot.recipe || !preview.ready)
    return preview?.error ?? 'Wait for the appearance preview to finish.';
  if (
    !preview.parts ||
    preview.parts.length !== parts.length ||
    parts.some((part) => !preview.parts?.includes(part))
  )
    return 'Show the outfit to check its fit before saving.';
  return undefined;
}

export function PersonAppearanceEditor({
  family,
  draft,
  parts,
  disabled = false,
  onPreview,
  visibleControls,
}: {
  family: AppearanceFamilyDefinition;
  draft: PersonAppearanceDraft;
  parts: readonly string[];
  disabled?: boolean;
  onPreview(value: AppearancePreviewValidity): void;
  visibleControls?: readonly string[];
}) {
  const id = useId();
  const snapshot = useSyncExternalStore(draft.subscribe, draft.getSnapshot);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<PersonPreview | undefined>(undefined);
  const callback = useRef(onPreview);
  callback.current = onPreview;
  const [state, setState] = useState<PersonPreviewState>({
    status: 'loading',
    preparing: true,
    motions: [],
  });
  const [selected, setSelected] = useState<string>();
  const [view, setView] = useState<PersonPreviewView>('front');
  const [clip, setClip] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [dressed, setDressed] = useState(true);
  const partsRef = useRef(parts);
  // Lazy renderer creation consumes the latest displayed outfit, including a
  // base-clothing choice made before the module has finished loading.
  partsRef.current = dressed ? parts : [];
  const [fileError, setFileError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const gesture = useRef<
    | { pointer: number; x: number; y: number; value: number; handle: PersonPreviewHandle }
    | undefined
  >(undefined);
  const orbit = useRef<{ pointer: number; x: number } | undefined>(undefined);
  const active = useRef(true);
  const fileRequest = useRef(0);
  const loadingVisible = useLoadingStatus(
    state.status === 'loading' || (state.preparing && !snapshot.editing),
    'Preparing appearance',
  );
  useEffect(() => {
    let disposed = false;
    active.current = true;
    const { compiled, compiledPath } = family;
    if (!compiled || !compiledPath || !canvas.current) return;
    const initial = draft.getSnapshot();
    callback.current({ recipe: initial.recipe, ready: false });
    void import('../characters/person-preview')
      .then(({ PersonPreviewRenderer }) => {
        if (disposed || !canvas.current) return;
        renderer.current = new PersonPreviewRenderer(
          canvas.current,
          {
            recipe: initial.recipe,
            compiled,
            compiledPath,
            definition: family,
            parts: partsRef.current,
          },
          (next) => {
            if (disposed) return;
            setState(next);
            if (next.view) setView(next.view);
            callback.current({
              recipe: next.recipe ?? initial.recipe,
              parts: next.parts,
              ready: !!next.recipe && next.status === 'ready' && !next.preparing && !next.error,
              error: next.error,
            });
          },
        );
        const latest = draft.getSnapshot();
        renderer.current.setAppearance(latest.recipe, partsRef.current, latest.editing);
      })
      .catch(() => {
        if (disposed) return;
        const error = 'The appearance preview could not open. Try reopening the editor.';
        setState({ status: 'failed', preparing: false, motions: [], error });
        callback.current({ recipe: draft.getSnapshot().recipe, ready: false, error });
      });
    return () => {
      disposed = true;
      active.current = false;
      fileRequest.current++;
      renderer.current?.destroy();
      renderer.current = undefined;
      draft.cancelGesture();
    };
  }, [family, draft]);
  useEffect(() => {
    callback.current({ recipe: snapshot.recipe, ready: false });
    renderer.current?.setAppearance(snapshot.recipe, dressed ? parts : [], snapshot.editing);
  }, [snapshot.recipe, snapshot.editing, dressed, parts]);
  function select(control: string) {
    setSelected(control);
    setClip(undefined);
    setPlaying(false);
    renderer.current?.setMotion(undefined, false);
    renderer.current?.selectControl(control);
  }
  async function load(file: File) {
    const request = ++fileRequest.current;
    try {
      // Recipe files contain small semantic values, never textures or mesh payloads.
      if (file.size > 1024 * 1024) throw new Error('Choose an appearance file smaller than 1 MB.');
      const value: unknown = JSON.parse(await file.text());
      if (!active.current || request !== fileRequest.current) return;
      if (!validAppearanceRecipeShape(value))
        throw new Error('This file does not contain an appearance.');
      const result = resolveAppearanceRecipe(family, value);
      if (!result.ok) throw new Error(result.message);
      const error = draft.load(result.recipe);
      if (error) throw new Error(error);
      setFileError('');
    } catch (error) {
      if (active.current && request === fileRequest.current)
        setFileError(
          error instanceof Error ? error.message : 'The appearance file could not be read.',
        );
    }
  }
  function download() {
    downloadJson('appearance.json', snapshot.recipe);
  }
  const selectedDefinition = family.controls.find((control) => control.id === selected);
  const range =
    selectedDefinition && appearanceControlRange(family, snapshot.recipe, selectedDefinition.id);
  const handle = state.handle;
  return (
    <div className="ol-appearance-editor">
      <div className="ol-appearance-inspection">
        <div className="ol-appearance-views" aria-label="View direction">
          {(['front', 'profile', 'quarter', 'face'] as const).map((direction) => (
            <Button
              key={direction}
              size="sm"
              variant="quiet"
              aria-pressed={view === direction}
              onPress={() => {
                setView(direction);
                renderer.current?.setView(direction);
              }}
            >
              {
                { front: 'Front', profile: 'Side', quarter: 'Three-quarter', face: 'Face' }[
                  direction
                ]
              }
            </Button>
          ))}
        </div>
        <div className="ol-appearance-canvas-wrap">
          <canvas
            ref={canvas}
            id={`appearance-${id}`}
            aria-label="Appearance preview. Use the view buttons to turn the person and the adjacent controls to change their appearance."
            onPointerDown={(event) => {
              if (event.button === 0) {
                orbit.current = { pointer: event.pointerId, x: event.clientX };
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              const turn = orbit.current;
              if (turn?.pointer !== event.pointerId) return;
              renderer.current?.rotate((event.clientX - turn.x) * 0.01);
              turn.x = event.clientX;
              setView('quarter');
            }}
            onPointerUp={() => {
              orbit.current = undefined;
            }}
            onPointerCancel={() => {
              orbit.current = undefined;
            }}
            onLostPointerCapture={() => {
              orbit.current = undefined;
            }}
          />
          {handle && selectedDefinition && range && (
            <button
              type="button"
              role="slider"
              className="ol-appearance-handle"
              disabled={disabled}
              style={{ left: handle.x, top: handle.y }}
              aria-label={`Drag ${selectedDefinition.label}`}
              aria-valuemin={range.minimum}
              aria-valuemax={range.maximum}
              aria-valuenow={snapshot.recipe.controls[selectedDefinition.id]}
              aria-valuetext={`${snapshot.recipe.controls[selectedDefinition.id]}${selectedDefinition.unit ? ` ${selectedDefinition.unit}` : ''}`}
              aria-orientation={handle.axis === 'vertical' ? 'vertical' : 'horizontal'}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                draft.begin(handle.control);
                gesture.current = {
                  pointer: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  value:
                    snapshot.recipe.controls[handle.control] ?? selectedDefinition.defaultValue,
                  handle,
                };
              }}
              onPointerMove={(event) => {
                const drag = gesture.current;
                if (!drag || drag.pointer !== event.pointerId) return;
                const delta =
                  drag.handle.axis === 'horizontal'
                    ? event.clientX - drag.x
                    : drag.y - event.clientY;
                draft.setControl(
                  drag.handle.control,
                  drag.value +
                    (delta / drag.handle.travelPixels) *
                      (selectedDefinition.maximum - selectedDefinition.minimum) *
                      drag.handle.direction,
                  true,
                );
              }}
              onPointerUp={() => {
                gesture.current = undefined;
                draft.end();
              }}
              onPointerCancel={() => {
                gesture.current = undefined;
                draft.cancelGesture();
              }}
              onLostPointerCapture={() => {
                if (gesture.current) {
                  gesture.current = undefined;
                  draft.cancelGesture();
                }
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Escape' && draft.getSnapshot().editing) {
                  event.preventDefault();
                  event.stopPropagation();
                  gesture.current = undefined;
                  draft.cancelGesture();
                  return;
                }
                const direction = ['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)
                  ? 1
                  : ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)
                    ? -1
                    : 0;
                if (!direction && event.key !== 'Home' && event.key !== 'End') return;
                event.preventDefault();
                draft.begin(handle.control);
                const step =
                  (selectedDefinition.maximum - selectedDefinition.minimum) *
                  (event.shiftKey || event.key.startsWith('Page') ? 0.1 : 0.01);
                draft.setControl(
                  handle.control,
                  event.key === 'Home'
                    ? range.minimum
                    : event.key === 'End'
                      ? range.maximum
                      : (snapshot.recipe.controls[handle.control] ??
                          selectedDefinition.defaultValue) +
                        direction * step,
                  true,
                );
              }}
              onKeyUp={() => draft.end()}
              onBlur={() => {
                gesture.current = undefined;
                draft.end();
              }}
            >
              ↔
            </button>
          )}
          {loadingVisible && (
            <p className="ol-appearance-status" role="status">
              Preparing appearance…
            </p>
          )}
        </div>
        {state.error && (
          <p className="ol-form-error" role="alert">
            {state.error}
          </p>
        )}
        <p className="ol-caption">
          Choose a feature to drag its handle. Arrow keys make small changes; Shift makes larger
          changes. Your edits stay private until you save.
        </p>
        <div className="ol-appearance-actions">
          {!!parts.length && (
            <Button
              size="sm"
              variant="quiet"
              aria-pressed={dressed}
              onPress={() => setDressed(!dressed)}
            >
              {dressed ? 'Show base clothing' : 'Show outfit'}
            </Button>
          )}
          <SelectField
            label="Movement"
            disabled={snapshot.editing || state.preparing || state.status !== 'ready'}
            value={clip ?? 'rest'}
            options={[
              { id: 'rest', label: 'Rest pose' },
              ...state.motions.map((name) => ({ id: name, label: name })),
            ]}
            onChange={(name) => {
              const next = name === 'rest' ? undefined : name;
              if (!renderer.current?.setMotion(next, false)) return;
              setClip(next);
              setPlaying(false);
            }}
          />
          <Button
            size="sm"
            variant="quiet"
            disabled={!clip || snapshot.editing || state.preparing || state.status !== 'ready'}
            aria-pressed={playing}
            onPress={() => {
              if (!renderer.current?.setMotion(clip, !playing)) return;
              setPlaying(!playing);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
        </div>
        <div className="ol-appearance-actions">
          <Button
            size="sm"
            variant="quiet"
            disabled={disabled || !!Object.keys(snapshot.errors).length}
            onPress={download}
          >
            Save appearance file
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={disabled}
            onPress={() => input.current?.click()}
          >
            Load appearance file
          </Button>
          <input
            ref={input}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void load(file);
            }}
          />
        </div>
        {fileError && (
          <p className="ol-form-error" role="alert">
            {fileError}
          </p>
        )}
      </div>
      <PersonAppearanceControls
        visibleControls={visibleControls}
        family={family}
        draft={draft}
        selected={selected}
        select={select}
        disabled={disabled}
      />
    </div>
  );
}
