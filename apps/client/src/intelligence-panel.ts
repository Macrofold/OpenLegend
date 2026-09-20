import type { IntelligenceCall } from '@open-legend/protocol';
import { post } from './api';
type TraceRow = IntelligenceCall & {
  stageCount: number;
  knownCostUsd: number;
  costIncomplete: boolean;
};
function jsonSection(label: string, value: unknown, key: string): HTMLDetailsElement {
  const section = document.createElement('details');
  section.dataset.key = key;
  const title = document.createElement('summary');
  title.textContent = label;
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(value, null, 2);
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'json-copy';
  copy.textContent = 'Copy';
  copy.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    void navigator.clipboard.writeText(pre.textContent ?? '').then(
      () => {
        copy.textContent = 'Copied';
      },
      () => {
        copy.textContent = 'Copy failed';
      },
    );
  };
  title.append(copy);
  section.append(title, pre);
  return section;
}
export class IntelligencePanel {
  private worldId = '';
  private generation = 0;
  private offset = 0;
  private loading = false;
  private follow = false;
  private list = document.createElement('div');
  private status = document.createElement('p');
  private notice = document.createElement('button');
  private filters: Record<string, HTMLInputElement> = {};
  private next = document.createElement('button');
  private previous = document.createElement('button');
  private details = new Map<string, HTMLElement>();
  private rows = new Map<string, HTMLDetailsElement>();
  private latest = '';
  constructor(private root: HTMLElement) {
    const content = root.querySelector('.panel-content')!;
    const controls = document.createElement('div');
    controls.className = 'inspect-actions';
    const refresh = document.createElement('button');
    refresh.textContent = 'Refresh';
    refresh.onclick = () => void this.refresh();
    const follow = document.createElement('button');
    follow.textContent = 'Follow: off';
    follow.onclick = () => {
      this.follow = !this.follow;
      follow.textContent = `Follow: ${this.follow ? 'on' : 'off'}`;
    };
    this.notice.hidden = true;
    this.notice.onclick = () => {
      this.offset = 0;
      void this.refresh();
    };
    this.previous.textContent = 'Newer';
    this.next.textContent = 'Older';
    this.previous.onclick = () => {
      this.offset = Math.max(0, this.offset - 25);
      void this.refresh();
    };
    this.next.onclick = () => {
      this.offset += 25;
      void this.refresh();
    };
    controls.append(refresh, follow, this.previous, this.next, this.notice);
    const filterControls = document.createElement('details');
    const heading = document.createElement('summary');
    heading.textContent = 'Filter triggers';
    const fields = document.createElement('div');
    fields.className = 'cognition-filters';
    filterControls.append(heading, fields);
    for (const name of ['search', 'actor', 'route', 'outcome', 'stage', 'from', 'to']) {
      const label = document.createElement('label');
      label.textContent = name;
      const input = document.createElement('input');
      input.type = name === 'from' || name === 'to' ? 'datetime-local' : 'search';
      input.setAttribute('aria-label', name);
      input.onchange = () => {
        this.offset = 0;
        void this.refresh();
      };
      this.filters[name] = input;
      label.append(input);
      fields.append(label);
    }
    const note = document.createElement('p');
    note.className = 'small-note';
    note.textContent =
      'One row per trigger. Expand for routing, recall, provider calls and accepted effects. Costs are known estimates; missing usage stays unknown. Retention: 1,000 roots/stages combined. Inspection never reruns inference.';
    content.append(controls, filterControls, this.status, note, this.list);
    window.setInterval(() => {
      if (!root.hidden) void this.poll();
    }, 3000);
  }
  setAccess(allowed: boolean): void {
    if (!allowed) this.clear();
  }
  setWorld(id: string): void {
    if (id === this.worldId) return;
    this.clear();
    this.worldId = id;
  }
  private clear() {
    this.generation++;
    this.details.clear();
    this.rows.clear();
    this.list.replaceChildren();
    this.latest = '';
    this.offset = 0;
  }
  private query() {
    return {
      offset: this.offset,
      ...Object.fromEntries(
        Object.entries(this.filters)
          .filter(([, input]) => input.value)
          .map(([key, input]) => [
            key,
            key === 'from' || key === 'to' ? new Date(input.value).toISOString() : input.value,
          ]),
      ),
    };
  }
  private async poll() {
    if (this.loading) return;
    if (this.follow && this.offset === 0 && !this.list.contains(document.activeElement)) {
      await this.refresh();
      return;
    }
    try {
      const result = await post<{ ok: boolean; roots?: TraceRow[] }>('/api/god/triggers', {
        offset: 0,
      });
      if (!result.ok) {
        this.clear();
        return;
      }
      const newest = result.roots?.[0]?.id;
      if (newest && newest !== this.latest) {
        this.notice.hidden = false;
        this.notice.textContent = 'New activity · show newest';
      }
    } catch {
      /* Next user refresh reports connection failure. */
    }
  }
  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    const generation = this.generation;
    try {
      const response = await post<{
        ok: boolean;
        worldId?: string;
        roots?: TraceRow[];
        hasMore?: boolean;
        message?: string;
      }>('/api/god/triggers', this.query());
      if (generation !== this.generation) return;
      if (!response.ok || !response.roots) {
        this.clear();
        throw new Error(response.message ?? 'God diagnostics unavailable.');
      }
      if (this.worldId && response.worldId !== this.worldId) {
        this.clear();
        return;
      }
      const content = this.root.querySelector('.panel-content')!;
      const scroll = content.scrollTop;
      const retained = new Set(response.roots.map((c) => c.id));
      for (const [id, node] of this.rows)
        if (!retained.has(id)) {
          node.remove();
          this.rows.delete(id);
          this.details.delete(id);
        }
      for (const row of response.roots) {
        let node = this.rows.get(row.id);
        if (!node) {
          node = document.createElement('details');
          node.dataset.key = row.id;
          const summary = document.createElement('summary');
          summary.className = 'intelligence-call-summary';
          node.append(summary);
          node.ontoggle = () => {
            if (node!.open) void this.load(row.id, node!);
          };
          this.rows.set(row.id, node);
        }
        const trigger = row.trigger ?? row.kind;
        const preview = trigger.length > 160 ? `${trigger.slice(0, 157)}…` : trigger;
        node.querySelector('summary')!.title = trigger;
        node.querySelector('summary')!.textContent =
          `${new Date(row.startedAt).toLocaleTimeString()} · ${row.actorName ?? 'World agent'} · ${preview} · ${row.route ?? (row.status === 'running' ? 'pending' : '—')} · ${row.disposition ?? row.status} · $${row.knownCostUsd.toFixed(4)}${row.costIncomplete ? ' + unknown' : ''}`;
        this.list.append(node);
      }
      content.scrollTop = scroll;
      this.latest = response.roots[0]?.id ?? '';
      this.notice.hidden = true;
      this.previous.disabled = this.offset === 0;
      this.next.disabled = !response.hasMore;
      this.status.textContent = response.roots.length
        ? `Triggers ${this.offset + 1}–${this.offset + response.roots.length}`
        : 'No matching retained triggers.';
    } catch (error) {
      this.status.textContent = error instanceof Error ? error.message : 'Cannot load diagnostics.';
    } finally {
      this.loading = false;
    }
  }
  private async load(id: string, node: HTMLDetailsElement) {
    if (this.details.has(id)) return;
    const generation = this.generation;
    const container = document.createElement('div');
    container.textContent = 'Loading recorded stages…';
    this.details.set(id, container);
    node.append(container);
    const renderCall = (call: IntelligenceCall): HTMLElement => {
      const detail = document.createElement('details');
      const summary = document.createElement('summary');
      const receipt = (
        call.output as
          | {
              receipt?: {
                latencyMs?: number;
                estimatedCostUsd?: number;
                usage?: { inputTokens: number; outputTokens: number };
              };
            }
          | undefined
      )?.receipt;
      const usage = receipt?.usage;
      summary.textContent = `${call.kind} · ${call.status}${receipt ? ` · ${receipt.latencyMs ?? '?'} ms · ${usage ? `${usage.inputTokens} in / ${usage.outputTokens} out` : 'tokens unknown'} · ${receipt.estimatedCostUsd === undefined ? 'cost unknown' : `$${receipt.estimatedCostUsd.toFixed(6)}`}` : ''}`;
      detail.append(summary);
      detail.append(
        jsonSection('Input', call.input, `${call.id}:input`),
        jsonSection(
          'Output / receipts',
          call.output ?? 'Pending or unavailable',
          `${call.id}:output`,
        ),
        jsonSection('Provider requests and responses', call.exchanges, `${call.id}:provider`),
      );
      if (
        call.exchanges.some(
          (e) => e.method === 'POST' && ['/v1/runs', '/v1/inferences'].includes(e.path),
        )
      ) {
        const button = document.createElement('button');
        button.textContent = 'Fetch provider billing/details';
        button.onclick = async () => {
          button.disabled = true;
          try {
            const value = await post<{ ok: boolean; details?: unknown }>(
              '/api/god/intelligence-details',
              { id: call.id },
            );
            if (generation !== this.generation) return;
            if (!value.ok) {
              this.clear();
              return;
            }
            detail.append(jsonSection('Provider details', value.details, `${call.id}:remote`));
          } finally {
            button.disabled = false;
          }
        };
        detail.append(button);
      }
      return detail;
    };
    try {
      const response = await post<{
        ok: boolean;
        details?: { root: IntelligenceCall; children: IntelligenceCall[]; coverage: string };
      }>('/api/god/trigger', { id });
      if (generation !== this.generation) return;
      if (!response.ok || !response.details) {
        this.clear();
        return;
      }
      const { root, children, coverage } = response.details;
      container.replaceChildren(
        jsonSection('Trigger and outcome', root, `${id}:root`),
        ...children.map(renderCall),
      );
      const note = document.createElement('p');
      note.textContent = coverage;
      container.append(note);
      const refresh = document.createElement('button');
      refresh.textContent = 'Refresh stages';
      refresh.onclick = () => {
        this.details.delete(id);
        container.remove();
        void this.load(id, node);
      };
      container.append(refresh);
    } catch {
      container.textContent = 'Details unavailable or expired.';
      this.details.delete(id);
    }
  }
}
