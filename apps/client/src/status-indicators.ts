import type { EntityView } from '@open-legend/protocol';
import './status-indicators.css';

/** One reusable marker per observed effect; CSS animates without spawning particles. */
export class StatusIndicators {
  private layer = document.createElement('div');
  private markers = new Map<string, { marker: HTMLDivElement; entityId: string }>();

  constructor(canvas: HTMLCanvasElement) {
    this.layer.className = 'ol-status-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    canvas.after(this.layer);
  }

  observe(entities: EntityView[]): void {
    const visible = new Set<string>();
    for (const entity of entities)
      for (const effect of entity.statusEffects ?? []) {
        if (!effect.particle) continue;
        const id = `${entity.id}:${effect.id}`;
        visible.add(id);
        let entry = this.markers.get(id);
        if (!entry) {
          const marker = document.createElement('div');
          marker.className = 'ol-status-marker';
          marker.append(document.createElement('span'));
          marker.hidden = true;
          this.layer.append(marker);
          entry = { marker, entityId: entity.id };
          this.markers.set(id, entry);
        }
        if (entry.marker.firstChild!.textContent !== effect.particle.text)
          entry.marker.firstChild!.textContent = effect.particle.text;
      }
    for (const [id, entry] of this.markers)
      if (!visible.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
  }

  update(anchor: (id: string) => { x: number; y: number } | null, paused: boolean): void {
    this.layer.classList.toggle('is-paused', paused);
    for (const { marker, entityId } of this.markers.values()) {
      const point = anchor(entityId);
      marker.hidden = !point;
      if (point) {
        const transform = `translate(${point.x}px, ${point.y}px)`;
        if (marker.style.transform !== transform) marker.style.transform = transform;
      }
    }
  }

  destroy(): void {
    this.markers.clear();
    this.layer.remove();
  }
}
