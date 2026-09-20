import { renderActionSymbol } from './action-symbol';
import type { ActionOption, GameView } from '@open-legend/protocol';

type QuickAction = { id: string; label: string; enabled: boolean; reason?: string; run(): void };
/** Three deterministic suggestions plus three browser-saved personal bindings. */
export class QuickActions {
  private worldId = '';
  private pins: string[] = ['', '', ''];
  private options: QuickAction[] = [];
  private slots: HTMLButtonElement[] = [];
  private dynamic: HTMLButtonElement[] = [];
  private chooser: HTMLSelectElement;
  private editing = 0;
  constructor(
    private element: HTMLElement,
    private command: (action: ActionOption) => void,
    private talk: (id: string) => void,
  ) {
    element.innerHTML =
      '<div class="quick-group dynamic-slots" aria-label="Suggested actions"></div><div class="quick-group personal-slots" aria-label="Your quick actions"></div><select class="quick-chooser" aria-label="Choose a quick action" hidden></select>';
    this.chooser = element.querySelector('select')!;
    for (let index = 0; index < 3; index++) {
      const suggestion = document.createElement('button');
      suggestion.type = 'button';
      this.dynamic.push(suggestion);
      element.querySelector('.dynamic-slots')!.append(suggestion);
      const slot = document.createElement('div');
      slot.className = 'personal-slot';
      const button = document.createElement('button');
      button.type = 'button';
      this.slots.push(button);
      button.addEventListener('click', () => {
        const action = this.options.find((item) => item.id === this.pins[index]);
        if (action?.enabled) action.run();
        else if (!this.pins[index]) this.configure(index);
      });
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '⚙';
      edit.setAttribute('aria-label', `Configure quick action ${index + 1}`);
      edit.addEventListener('click', () => this.configure(index));
      slot.append(button, edit);
      element.querySelector('.personal-slots')!.append(slot);
    }
    this.chooser.addEventListener('change', () => {
      this.pins[this.editing] = this.chooser.value;
      try {
        localStorage.setItem(this.key(), JSON.stringify(this.pins));
      } catch {}
      this.chooser.hidden = true;
      this.renderPins();
    });
    this.chooser.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.chooser.hidden = true;
      }
    });
  }
  private key(): string {
    return `open-legend:quick-actions:${this.worldId}`;
  }
  update(view: GameView, connected: boolean): void {
    if (view.worldId !== this.worldId) {
      this.worldId = view.worldId;
      this.pins = ['', '', ''];
      this.chooser.hidden = true;
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(this.key()) ?? 'null');
        if (
          Array.isArray(saved) &&
          saved.length === 3 &&
          saved.every((id) => typeof id === 'string')
        )
          this.pins = saved;
      } catch {}
    }
    const native = [
      ...view.player.actions,
      ...view.player.inventory.flatMap((item) =>
        item.actions.map((action) => ({ ...action, label: `${action.label} · ${item.name}` })),
      ),
      ...view.entities.flatMap((entity) =>
        entity.actions.map((action) => ({ ...action, label: `${action.label} · ${entity.name}` })),
      ),
      ...view.recipes.flatMap((recipe) =>
        recipe.actions.map((action) => ({ ...action, label: `${action.label} · ${recipe.name}` })),
      ),
    ];
    this.options = [...new Map(native.map((action) => [action.id, action])).values()].map(
      (action) => ({
        ...action,
        enabled: connected && action.enabled,
        run: () => this.command(action),
      }),
    );
    const people: QuickAction[] = view.entities
      .filter((entity) => entity.canTalk)
      .map((entity) => ({
        id: `talk-${entity.id}`,
        label: `Talk to ${entity.name}`,
        enabled: connected,
        run: () => this.talk(entity.id),
      }));
    this.options.push(...people);
    const suggested = [
      this.options.find((action) => action.id === 'recover'),
      ...(view.player.energy < 35 ? [this.options.find((action) => action.id === 'rest')] : []),
      ...(view.player.hunger > 70
        ? [this.options.find((action) => action.id.startsWith('eat-') && action.enabled)]
        : []),
      ...people,
    ]
      .filter((action): action is QuickAction => !!action)
      .slice(0, 3);
    // Keep suggestions stable while someone is aiming or using the keyboard.
    // Activation resolves the latest candidate so a stale suggestion cannot run.
    if (!this.element.matches(':hover') && !this.element.contains(document.activeElement))
      this.dynamic.forEach((button, index) => {
        const action = suggested[index];
        renderActionSymbol(button, action?.label ?? 'No suggestion right now');
        button.hidden = !action;
        button.disabled = !action?.enabled;
        button.title = action?.reason ?? (action ? action.label : 'No suggestion right now');
        button.onclick = action
          ? () => {
              const current = this.options.find((candidate) => candidate.id === action.id);
              if (current?.enabled) current.run();
            }
          : null;
      });
    this.renderPins();
  }
  private renderPins(): void {
    this.slots.forEach((button, index) => {
      const action = this.options.find((item) => item.id === this.pins[index]);
      renderActionSymbol(
        button,
        action?.label ?? (this.pins[index] ? 'Unavailable action' : '+ Set action'),
      );
      button.disabled = !!this.pins[index] && !action?.enabled;
      button.title = action?.reason ?? '';
    });
  }
  private configure(index: number): void {
    this.editing = index;
    this.chooser.replaceChildren(new Option('Empty slot', ''));
    for (const action of this.options) this.chooser.add(new Option(action.label, action.id));
    this.chooser.value = this.pins[index] ?? '';
    this.chooser.hidden = false;
    this.chooser.focus();
  }
}
