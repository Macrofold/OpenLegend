import type { GameView, PlayerProfile } from '@open-legend/protocol';
import { post } from './api';

/** A small, persistent control surface. The server owns pause policy and clock
 * advancement; this control only patches the local player's preference. */
export class TimeSettings {
  private readonly trigger: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly checkbox: HTMLInputElement;
  private profile: PlayerProfile | null = null;
  private connected = false;
  private saving = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly error: (message: string) => void,
  ) {
    this.trigger = element.querySelector('button')!;
    this.panel = element.querySelector('[role="group"]')!;
    this.checkbox = element.querySelector('input')!;
    this.trigger.addEventListener('click', () => {
      this.setOpen(!!this.panel.hidden);
      if (!this.panel.hidden) this.checkbox.focus();
    });
    this.checkbox.addEventListener('change', () => void this.save());
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || this.panel.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      this.setOpen(false);
      this.trigger.focus();
    });
    window.addEventListener('pointerdown', (event) => {
      if (!element.contains(event.target as Node)) this.setOpen(false);
    });
    element.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !element.contains(event.relatedTarget as Node))
        this.setOpen(false);
    });
  }

  update(view: GameView, connected: boolean): void {
    this.connected = connected;
    this.acceptProfile(view.profile);
    this.element.querySelector('.time-rate')!.textContent =
      `1×: ${view.clock.baseRatio / 60} game minute per real second. A day takes ${1440 / view.clock.baseRatio} real minutes.`;
    this.render();
  }

  private acceptProfile(profile: PlayerProfile): void {
    if (!this.profile || profile.revision >= this.profile.revision) this.profile = profile;
  }

  private setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.trigger.setAttribute('aria-expanded', String(open));
  }

  private render(): void {
    this.checkbox.disabled = this.saving || !this.connected || !this.profile;
    if (!this.saving && this.profile)
      this.checkbox.checked = this.profile.preferences.pauseWhenHidden;
    this.element.querySelector('[role="status"]')!.textContent = this.saving ? 'Saving…' : '';
  }

  private async save(): Promise<void> {
    if (this.saving || !this.connected) return;
    this.saving = true;
    this.render();
    try {
      const result = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { pauseWhenHidden: this.checkbox.checked },
      );
      if (!result.ok) throw new Error(result.message ?? 'Time settings could not be saved.');
      this.acceptProfile(result.profile);
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Time settings could not be saved.');
    } finally {
      this.saving = false;
      this.render();
    }
  }
}
