import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  GameView,
  PlayerProfile,
} from '@open-legend/protocol';
import { post } from './api';

/** Text search always visits the entire permitted catalogue, including unavailable
 * rows only when the profile preference allows them. No top-k or paid search. */
export function filterActions(
  actions: CatalogueAction[],
  query: string,
  showUnavailable: boolean,
  targetId?: string,
): CatalogueAction[] {
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return actions
    .filter((action) => {
      if (!showUnavailable && !action.enabled) return false;
      const text = [action.label, action.category, ...action.keywords]
        .join(' ')
        .normalize('NFKC')
        .toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(
      (a, b) =>
        Number(b.enabled) - Number(a.enabled) ||
        Number(b.targetId === targetId && !!targetId) -
          Number(a.targetId === targetId && !!targetId) ||
        a.label.localeCompare(b.label) ||
        a.id.localeCompare(b.id),
    );
}

interface BrowserCallbacks {
  command(action: CatalogueAction): void;
  compose(mode: 'chat' | 'invention', text?: string, npcId?: string): void;
  error(message: string): void;
  closed(): void;
}

/** DOM nodes for search, preferences and individual actions survive world updates.
 * Availability is advisory: clicks still pass through the authoritative command API.
 */
export class ActionBrowser {
  private context: ActionContext = {};
  private anchor = { x: 12, y: 12 };
  private catalogue: CatalogueAction[] = [];
  private profile: PlayerProfile | null = null;
  private showUnavailable = false;
  private saving = false;
  private connected = true;
  private generation = 0;
  private loading = false;
  private catalogueLoaded = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastRevision = -1;
  private readonly search: HTMLInputElement;
  private readonly available: HTMLElement;
  private readonly unavailable: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly clearSearch: HTMLButtonElement;
  private readonly invent: HTMLButtonElement;
  private readonly tooltip: HTMLElement;
  private tooltipActionId: string | undefined;
  private tooltipTimer: ReturnType<typeof setTimeout> | undefined;
  private tooltipDismissTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly rows = new Map<string, HTMLButtonElement>();

  constructor(
    private readonly element: HTMLElement,
    private readonly callbacks: BrowserCallbacks,
  ) {
    element.innerHTML = `<h2 id="contextTitle" class="sr-only"></h2><div class="context-heading">
      <input id="actionSearch" class="action-search" type="search" aria-label="Find an action" maxlength="1000" placeholder="Search actions or invent something…" autocomplete="off"><button type="button" class="icon-button" data-clear-search aria-label="Clear search" hidden>×</button></div>
      <p class="catalogue-status" role="status" aria-live="polite"></p>
      <div class="catalogue-scroll"><div class="available-actions" aria-label="Available actions"></div>
      <button type="button" class="catalogue-action invent-suggestion" hidden><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/></svg>Invent</span></button>
      <div id="unavailableActions" class="unavailable-actions" aria-label="Unavailable actions" hidden></div></div>
      <button type="button" class="unavailable-toggle" aria-expanded="false" aria-controls="unavailableActions"><span class="drawer-chevron" aria-hidden="true">›</span> <span class="preference-label">Show Unavailable Actions</span> <span class="preference-status"></span></button>`;
    this.search = element.querySelector('input')!;
    this.available = element.querySelector('.available-actions')!;
    this.unavailable = element.querySelector('.unavailable-actions')!;
    this.toggle = element.querySelector('.unavailable-toggle')!;
    this.status = element.querySelector('.catalogue-status')!;
    this.clearSearch = element.querySelector('[data-clear-search]')!;
    this.invent = element.querySelector('.invent-suggestion')!;
    this.clearSearch.addEventListener('click', () => {
      this.search.value = '';
      this.hideTooltip();
      this.render();
      this.search.focus({ preventScroll: true });
    });
    this.invent.addEventListener('click', () => {
      if (!this.invent.hidden && this.search.value.trim())
        this.compose('invention', this.search.value.trim());
    });
    // Outside the scrolling list so long descriptions cannot be clipped by it.
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'actionTooltip';
    this.tooltip.className = 'action-tooltip surface';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.hidden = true;
    document.body.append(this.tooltip);
    this.tooltip.addEventListener('pointerenter', () => clearTimeout(this.tooltipDismissTimer));
    this.tooltip.addEventListener('pointerleave', () => this.deferTooltipDismiss());
    this.search.addEventListener('input', () => {
      this.hideTooltip();
      this.render();
    });
    element
      .querySelector('.catalogue-scroll')!
      .addEventListener('scroll', () => this.hideTooltip());
    window.addEventListener('resize', () => this.hideTooltip());
    window.addEventListener('blur', () => this.hideTooltip());
    this.toggle.addEventListener('click', () => {
      void this.togglePreference();
    });
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        document.getElementById('world')?.focus({ preventScroll: true });
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const buttons = [
          ...element.querySelectorAll<HTMLButtonElement>(
            '.catalogue-action, .unavailable-toggle:not(:disabled)',
          ),
        ].filter((button) => !button.closest('[hidden]'));
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          event.key === 'ArrowDown'
            ? (current + 1) % buttons.length
            : current < 0
              ? buttons.length - 1
              : (current - 1 + buttons.length) % buttons.length;
        if (buttons[next]) {
          event.preventDefault();
          buttons[next].focus();
        }
      } else if (event.key === 'Enter' && event.target === this.search) {
        // Unmatched search opens an editable draft, never a paid request.
        event.preventDefault();
        const action = this.available.querySelector<HTMLButtonElement>(
          'button[aria-disabled="false"]',
        );
        if (action) action.click();
        else if (!this.invent.hidden) this.invent.click();
      }
    });
  }

  open(context: ActionContext, point: { x: number; y: number }, title: string): void {
    this.hideTooltip();
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.loading = false;
    this.context = context;
    this.anchor = point;
    this.catalogue = [];
    this.catalogueLoaded = false;
    this.element.querySelector('#contextTitle')!.textContent = title;
    this.search.value = '';
    this.element.hidden = false;
    this.status.textContent = 'Loading actions…';
    this.render();
    this.search.focus({ preventScroll: true });
    void this.refresh();
  }

  close(): void {
    if (this.element.hidden) return;
    this.element.hidden = true;
    this.hideTooltip();
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.loading = false;
    this.callbacks.closed();
  }

  contains(target: Node): boolean {
    return this.element.contains(target) || this.tooltip.contains(target);
  }

  update(view: GameView, connected: boolean): void {
    this.connected = connected;
    if (!this.profile || view.profile.revision >= this.profile.revision) {
      this.profile = view.profile;
      if (!this.saving) this.showUnavailable = view.profile.preferences.showUnavailableActions;
    }
    if (this.element.hidden) return;
    if (view.revision !== this.lastRevision && !this.timer && !this.loading && connected) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        void this.refresh();
      }, 500);
    }
    this.render();
  }

  private async refresh(): Promise<void> {
    const generation = this.generation;
    if (this.loading || this.element.hidden || !this.connected) return;
    this.loading = true;
    try {
      const result = await post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
        '/api/actions',
        this.context,
      );
      if (generation !== this.generation) return;
      if (!result.ok) throw new Error(result.message ?? 'Actions could not be loaded.');
      this.catalogue = result.catalogue.actions;
      this.catalogueLoaded = true;
      this.lastRevision = result.catalogue.revision;
      this.status.textContent = '';
      this.render();
    } catch (error) {
      if (generation === this.generation) {
        this.catalogue = [];
        this.catalogueLoaded = false;
        this.render();
        this.status.textContent =
          error instanceof Error ? error.message : 'Actions could not be loaded.';
      }
    } finally {
      if (generation === this.generation) this.loading = false;
    }
  }

  private compose(mode: 'chat' | 'invention', text?: string, npcId?: string): void {
    this.close();
    this.callbacks.compose(mode, text, npcId);
  }

  private async togglePreference(): Promise<void> {
    if (this.saving) return;
    const previous = this.showUnavailable;
    this.hideTooltip();
    this.showUnavailable = !previous;
    this.saving = true;
    this.render();
    try {
      const result = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { showUnavailableActions: this.showUnavailable },
      );
      if (!result.ok) throw new Error(result.message ?? 'The preference could not be saved.');
      if (!this.profile || result.profile.revision >= this.profile.revision)
        this.profile = result.profile;
      this.showUnavailable = this.profile.preferences.showUnavailableActions;
    } catch (error) {
      this.showUnavailable = previous;
      this.callbacks.error(
        error instanceof Error ? error.message : 'The preference could not be saved.',
      );
    } finally {
      this.saving = false;
      this.render();
    }
  }

  private render(): void {
    if (this.element.hidden) return;
    const matching = filterActions(
      this.catalogue.map((action) =>
        !this.connected ? { ...action, enabled: false, reason: 'Reconnect to the world.' } : action,
      ),
      this.search.value,
      this.showUnavailable,
      this.context.targetId,
    );
    const visible = new Set(matching.map((action) => action.id));
    if (this.tooltipActionId && !visible.has(this.tooltipActionId)) this.hideTooltip();
    for (const [id, row] of this.rows)
      if (!visible.has(id)) {
        row.remove();
        this.rows.delete(id);
      }
    // Reconcile keyed rows instead of replacing innerHTML. A pointer press or
    // keyboard focus must stay attached to its original command across refreshes.
    for (const container of [this.available, this.unavailable]) {
      const options = matching.filter(
        (action) => action.enabled === (container === this.available),
      );
      let previous: Element | null = null;
      for (const action of options) {
        let row = this.rows.get(action.id);
        if (!row) {
          row = document.createElement('button');
          row.type = 'button';
          row.className = 'action-button catalogue-action';
          row.tabIndex = -1;
          row.dataset.catalogueAction = action.id;
          row.append(document.createElement('span'), document.createElement('small'));
          row.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'touch') this.scheduleTooltip(action.id);
          });
          row.addEventListener('pointerleave', () => this.deferTooltipDismiss());
          row.addEventListener('focus', () => this.scheduleTooltip(action.id));
          row.addEventListener('blur', () => this.hideTooltip());
          row.addEventListener('click', () => {
            const latest = this.catalogue.find((candidate) => candidate.id === action.id);
            if (!latest?.enabled || !this.connected) return;
            if (latest.intent.kind === 'compose')
              this.compose(latest.intent.mode, undefined, latest.intent.npcId);
            else if (latest.intent.kind === 'command') {
              this.close();
              this.callbacks.command(latest);
            }
          });
          this.rows.set(action.id, row);
        }
        // Keep blocked options focusable with the arrow keys so keyboard users
        // can inspect their explanations. The click handler still rejects them.
        row.setAttribute('aria-disabled', String(!action.enabled));
        row.querySelector('span')!.textContent = action.label;
        row.querySelector('small')!.textContent = action.category;
        const next: Element | null = previous
          ? previous.nextElementSibling
          : container.firstElementChild;
        if (row !== next) container.insertBefore(row, next);
        previous = row;
      }
    }
    this.clearSearch.hidden = !this.search.value;
    this.invent.hidden =
      !this.catalogueLoaded ||
      !this.connected ||
      !this.search.value.trim() ||
      matching.some((action) => action.enabled);
    this.status.textContent = !this.invent.hidden
      ? ''
      : this.catalogue.length
        ? !matching.length
          ? 'No matching actions'
          : ''
        : this.status.textContent;
    // Scope this to the catalogue, not the current search, so typing does not
    // make the saved visibility preference jump in and out of the menu.
    this.toggle.hidden = !this.catalogue.some((action) => !action.enabled || !this.connected);
    this.unavailable.hidden = !this.showUnavailable;
    this.toggle.setAttribute('aria-expanded', String(this.showUnavailable));
    this.toggle.querySelector('.preference-label')!.textContent = this.showUnavailable
      ? 'Hide Unavailable Actions'
      : 'Show Unavailable Actions';
    this.toggle.disabled = this.saving || !this.connected;
    this.toggle.querySelector('.preference-status')!.textContent = this.saving ? 'Saving…' : '';
    this.element.style.left = `${Math.max(12, Math.min(this.anchor.x, window.innerWidth - this.element.offsetWidth - 12))}px`;
    this.element.style.top = `${Math.max(12, Math.min(this.anchor.y, window.innerHeight - this.element.offsetHeight - 12))}px`;
    if (!this.tooltip.hidden) this.renderTooltip();
  }

  private scheduleTooltip(id: string): void {
    clearTimeout(this.tooltipDismissTimer);
    if (this.tooltipActionId === id) return;
    this.hideTooltip();
    this.tooltipActionId = id;
    this.tooltipTimer = setTimeout(() => {
      this.tooltipTimer = undefined;
      this.renderTooltip();
    }, 1000);
  }

  private hideTooltip(): void {
    clearTimeout(this.tooltipTimer);
    clearTimeout(this.tooltipDismissTimer);
    this.tooltipTimer = undefined;
    if (this.tooltipActionId)
      this.rows.get(this.tooltipActionId)?.removeAttribute('aria-describedby');
    this.tooltipActionId = undefined;
    this.tooltip.hidden = true;
  }

  private deferTooltipDismiss(): void {
    // A pending reveal needs an uninterrupted hover. Once visible, allow the
    // pointer to cross the small gap into the tooltip to read or scroll it.
    if (this.tooltip.hidden) return this.hideTooltip();
    clearTimeout(this.tooltipDismissTimer);
    this.tooltipDismissTimer = setTimeout(() => this.hideTooltip(), 150);
  }

  private renderTooltip(): void {
    const action = this.catalogue.find((entry) => entry.id === this.tooltipActionId);
    const row = this.tooltipActionId && this.rows.get(this.tooltipActionId);
    if (!action || !row || this.element.hidden) {
      this.hideTooltip();
      return;
    }
    const reason = !this.connected
      ? 'Reconnect to the world.'
      : !action.enabled
        ? (action.reason ?? 'Unavailable right now.')
        : '';
    // Invented prose is untrusted text, never markup. Read the latest catalogue
    // at reveal and refresh without restarting the one-second hover delay.
    const text = `${action.description}${reason ? `\n\nUnavailable: ${reason}` : ''}`;
    if (this.tooltip.textContent !== text) this.tooltip.textContent = text;
    this.tooltip.hidden = false;
    row.setAttribute('aria-describedby', this.tooltip.id);
    const menu = this.element.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    const width = this.tooltip.offsetWidth;
    const height = this.tooltip.offsetHeight;
    const beside =
      menu.right + 8 + width <= window.innerWidth - 12 ? menu.right + 8 : menu.left - width - 8;
    const left = Math.max(12, Math.min(beside, window.innerWidth - width - 12));
    const top =
      beside < 12
        ? bounds.bottom + 6 + height <= window.innerHeight - 12
          ? bounds.bottom + 6
          : bounds.top - height - 6
        : bounds.top;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`;
  }
}
