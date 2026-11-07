import { sameAppearanceFamily } from '@open-legend/protocol';
import type { AppearanceControlDefinition, AppearanceRecipe } from '@open-legend/protocol';

export interface PersonDraftSnapshot {
  readonly recipe: AppearanceRecipe;
  readonly text: Readonly<Record<string, string>>;
  readonly errors: Readonly<Record<string, string>>;
  readonly dirty: boolean;
  readonly editing: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface PersonDraftAdmission {
  validate(recipe: AppearanceRecipe): string | undefined;
  range(
    recipe: AppearanceRecipe,
    control: string,
  ): { minimum: number; maximum: number } | undefined;
}

function copyRecipe(recipe: AppearanceRecipe): AppearanceRecipe {
  return {
    family: { ...recipe.family },
    controls: { ...recipe.controls },
    selections: { ...recipe.selections },
  };
}

function sameValues<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/** Equality follows recipe meaning, not JSON property order from a save or local file. */
export function sameAppearanceRecipe(a: AppearanceRecipe, b: AppearanceRecipe): boolean {
  return (
    sameAppearanceFamily(a.family, b.family) &&
    sameValues(a.controls, b.controls) &&
    sameValues(a.selections, b.selections)
  );
}

/** One private editing owner for sliders, text, handles, keyboard and presets.
 * A gesture retains one starting recipe, never one history entry per pointer event.
 * docs/projects/people-from-parts-tech-design.md#assembly-storage-and-renderer */
export class PersonAppearanceDraft {
  private baseline: AppearanceRecipe;
  private current: PersonDraftSnapshot;
  private gesture?: { id: string; before: PersonDraftSnapshot };
  private readonly undoRecipes: AppearanceRecipe[] = [];
  private readonly redoRecipes: AppearanceRecipe[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly definitions: ReadonlyMap<string, AppearanceControlDefinition>;

  constructor(
    initial: AppearanceRecipe,
    controls: readonly AppearanceControlDefinition[],
    private readonly admission: PersonDraftAdmission,
  ) {
    this.baseline = copyRecipe(initial);
    this.definitions = new Map(controls.map((control) => [control.id, control]));
    this.current = {
      recipe: copyRecipe(initial),
      text: {},
      errors: {},
      dirty: false,
      editing: false,
      canUndo: false,
      canRedo: false,
    };
  }

  getSnapshot = (): PersonDraftSnapshot => this.current;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(next: Partial<PersonDraftSnapshot>): void {
    const snapshot = { ...this.current, ...next };
    this.current = {
      ...snapshot,
      dirty:
        !sameAppearanceRecipe(snapshot.recipe, this.baseline) ||
        Object.keys(snapshot.errors).length > 0,
      editing: !!this.gesture,
      canUndo: this.undoRecipes.length > 0,
      canRedo: this.redoRecipes.length > 0,
    };
    for (const listener of this.listeners) listener();
  }

  begin(id: string): void {
    if (this.gesture?.id === id) return;
    this.end();
    this.gesture = { id, before: this.current };
    this.publish({});
  }

  end(): void {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = undefined;
    if (!sameAppearanceRecipe(gesture.before.recipe, this.current.recipe)) {
      this.undoRecipes.push(gesture.before.recipe);
      this.redoRecipes.length = 0;
    }
    this.publish({});
  }

  cancelGesture(): void {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = undefined;
    this.publish({
      recipe: gesture.before.recipe,
      text: gesture.before.text,
      errors: gesture.before.errors,
    });
  }

  /** Direct input keeps an invalid request visible; dragging stops at its supported boundary. */
  setControl(id: string, requested: number, clamp = false, text?: string): void {
    const control = this.definitions.get(id);
    if (!control) return;
    const range = this.admission.range(this.current.recipe, id);
    if (!range) return;
    const value = clamp ? Math.max(range.minimum, Math.min(range.maximum, requested)) : requested;
    const next = {
      ...this.current.recipe,
      controls: { ...this.current.recipe.controls, [id]: value },
    };
    const problem = !Number.isFinite(value)
      ? `Enter a number for ${control.label}.`
      : this.admission.validate(next);
    const texts = { ...this.current.text };
    const errors = { ...this.current.errors };
    if (text === undefined) delete texts[id];
    else texts[id] = text;
    if (problem) {
      errors[id] = problem;
      this.publish({ text: texts, errors });
      return;
    }
    delete errors[id];
    const implicit = !this.gesture;
    if (implicit) this.begin(id);
    this.publish({ recipe: next, text: texts, errors });
    if (implicit) this.end();
  }

  setText(id: string, text: string): void {
    this.setControl(id, text.trim() ? Number(text) : Number.NaN, false, text);
  }

  /** Whole-group operations are single undo steps and preserve every unnamed field. */
  apply(patch: {
    controls?: Readonly<Record<string, number>>;
    selections?: Readonly<Record<string, string>>;
  }): string | undefined {
    this.end();
    const next: AppearanceRecipe = {
      ...this.current.recipe,
      controls: { ...this.current.recipe.controls, ...patch.controls },
      selections: { ...this.current.recipe.selections, ...patch.selections },
    };
    const problem = this.admission.validate(next);
    if (problem) return problem;
    if (!sameAppearanceRecipe(next, this.current.recipe)) {
      this.undoRecipes.push(this.current.recipe);
      this.redoRecipes.length = 0;
    }
    const text = { ...this.current.text };
    const errors = { ...this.current.errors };
    for (const id of Object.keys(patch.controls ?? {})) {
      delete text[id];
      delete errors[id];
    }
    this.publish({ recipe: next, text, errors });
    return undefined;
  }

  load(recipe: AppearanceRecipe): string | undefined {
    this.end();
    const problem = this.admission.validate(recipe);
    if (problem) return problem;
    if (!sameAppearanceRecipe(recipe, this.current.recipe)) {
      this.undoRecipes.push(this.current.recipe);
      this.redoRecipes.length = 0;
    }
    this.publish({ recipe: copyRecipe(recipe), text: {}, errors: {} });
    return undefined;
  }

  undo(): void {
    this.end();
    const recipe = this.undoRecipes.pop();
    if (!recipe) return;
    this.redoRecipes.push(this.current.recipe);
    this.publish({ recipe, text: {}, errors: {} });
  }

  redo(): void {
    this.end();
    const recipe = this.redoRecipes.pop();
    if (!recipe) return;
    this.undoRecipes.push(this.current.recipe);
    this.publish({ recipe, text: {}, errors: {} });
  }

  discard(): void {
    this.gesture = undefined;
    this.undoRecipes.length = this.redoRecipes.length = 0;
    this.publish({ recipe: copyRecipe(this.baseline), text: {}, errors: {} });
  }

  /** Called only after the owning Save acknowledges this exact submitted recipe. */
  acknowledge(recipe: AppearanceRecipe): void {
    this.baseline = copyRecipe(recipe);
    this.publish({});
  }
}
