/** Presentation-only panel ordering: opening appends outward, closing preserves peers. */
export class PanelDock {
  constructor(private root: HTMLElement) {}
  set(id: string, open: boolean): void {
    const panel = document.getElementById(id)!;
    panel.hidden = !open;
    if (open) panel.parentElement!.append(panel);
    document.querySelectorAll<HTMLButtonElement>(`[data-panel="${id}"]`).forEach((button) => {
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('active', open);
    });
    this.root.style.setProperty(
      '--panel-count',
      String(Math.max(1, this.root.querySelectorAll('.dock-panel:not([hidden])').length)),
    );
  }
  toggle(id: string): void {
    this.set(id, !!document.getElementById(id)!.hidden);
  }
}
