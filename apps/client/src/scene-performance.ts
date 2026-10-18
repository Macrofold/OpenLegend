import type { GameView } from '@open-legend/protocol';
import type * as pc from 'playcanvas';
import type { MercenaryActor } from './characters/mercenary';
import type { LibraryActor } from './library-actors';

const MAX_SAMPLES = 100_000;
type Point = { x: number; y: number; z: number };
export type GroundInputConstraint = { anchor: Point; radius: number };
type GroundInputProbe = (x: number, y: number, constraint?: GroundInputConstraint) => boolean;
type ModelProbe = () => Array<
  ReturnType<MercenaryActor['diagnostics'] | LibraryActor['diagnostics']> & {
    id: string;
    screen: { x: number; y: number } | null;
  }
>;
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
type Sample = number[];
type DurationSeries =
  | 'browserFrame'
  | 'renderedFrame'
  | 'longTask'
  | 'rendererCpu'
  | 'sceneUpdate'
  | 'sceneView'
  | 'gpu';
export interface DurationHistogram {
  count: number;
  totalMs: number;
  maxMs: number;
  /** 0.25 ms buckets; the final bucket contains all durations >= 1024 ms. */
  bins: number[];
  above25Ms: number;
  above50Ms: number;
  above100Ms: number;
}
export interface SceneProfileReport {
  startedAt: number;
  stoppedAt: number;
  renderedFrames: {
    count: number;
    firstAt: number | null;
    lastAt: number | null;
    maxGapAt: number | null;
  };
  frames: Sample[];
  views: Sample[];
  gpu: Sample[];
  dropped: { frames: number; views: number; gpu: number };
  gpuUnavailable: string | null;
  renderer: string | null;
  pendingGpuQueries: number;
  gpuQuerySkips: number;
  gpuDisjointDiscarded: number;
  gpuContextLostDiscarded: number;
  histograms: Record<DurationSeries, DurationHistogram>;
  latestFrame: Sample | null;
  stationarySince: number;
  peakEstimatedGraphicsBytes: number;
  maxRenderedEntries: number;
  hoverQuadPreparationMs: number;
}
declare global {
  interface Window {
    __openLegendSceneProfile?: {
      start(): void;
      isRecording(): boolean;
      stop(): SceneProfileReport;
      snapshot(): SceneProfileReport;
      recordBrowserFrame(ms: number): void;
      recordLongTask(ms: number): void;
      recordHoverPreparation(ms: number): void;
      isGroundInput: GroundInputProbe;
      characterModels: ModelProbe;
    };
  }
}

/** Explicit local profiling only. Retains numeric public presentation samples, never
 * world records or private panels. The browser runner owns timing and report export.
 * Columns are documented beside their writes; every series has an explicit ceiling.
 */
export class ScenePerformance {
  private recording = false;
  private destroyed = false;
  private frameStarted = 0;
  private updateMs = 0;
  private viewAt = 0;
  private report: SceneProfileReport;
  private readonly gl: WebGL2RenderingContext | null;
  private timer: TimerExtension | null;
  private active?: { query: WebGLQuery; at: number };
  private pending: Array<{ query: WebGLQuery; at: number }> = [];
  private readonly api;
  private stationaryAnchor?: Point;

  static create(
    canvas: HTMLCanvasElement,
    groundInput: GroundInputProbe,
    models: ModelProbe,
  ): ScenePerformance | undefined {
    return new URLSearchParams(location.search).get('profile') === '1'
      ? new ScenePerformance(canvas, groundInput, models)
      : undefined;
  }
  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private groundInput: GroundInputProbe | undefined,
    private models: ModelProbe | undefined,
  ) {
    this.gl = canvas.getContext('webgl2');
    this.timer = null;
    this.report = this.empty();
    canvas.addEventListener('webglcontextlost', this.contextLost);
    canvas.addEventListener('webglcontextrestored', this.contextRestored);
    this.api = {
      start: () => this.startCapture(),
      isRecording: () => this.recording,
      stop: () => this.stopCapture(),
      snapshot: () => this.report,
      recordBrowserFrame: (ms: number) => this.duration('browserFrame', ms),
      recordLongTask: (ms: number) => this.duration('longTask', ms),
      recordHoverPreparation: (ms: number) => {
        if (this.recording) this.report.hoverQuadPreparationMs += ms;
      },
      isGroundInput: (x: number, y: number, constraint?: GroundInputConstraint) =>
        this.groundInput?.(x, y, constraint) ?? false,
      // On-demand only: ordinary frames retain neither model records nor sample arrays.
      characterModels: () => this.models?.() ?? [],
    };
    window.__openLegendSceneProfile = this.api;
    // Capture cold scene preparation separately; the runner resets at its measured boundary.
    this.startCapture();
  }
  private startCapture(): void {
    if (this.recording || this.destroyed) return;
    this.releaseQueries();
    this.timer =
      this.gl && !this.gl.isContextLost()
        ? this.gl.getExtension('EXT_disjoint_timer_query_webgl2')
        : null;
    this.report = this.empty();
    this.report.gpuUnavailable = this.timer ? null : 'WebGL2 timer queries unavailable';
    this.stationaryAnchor = undefined;
    this.frameStarted = 0;
    this.updateMs = 0;
    this.viewAt = 0;
    for (const name of [
      'sceneryCount',
      'landscapeResourceCount',
      'landscapeResourceBuildCount',
      'landscapeBuildMs',
      'landscapeBuildCount',
    ])
      delete this.canvas.dataset[name];
    this.report.startedAt = performance.now();
    this.recording = true;
  }
  private stopCapture(): SceneProfileReport {
    if (!this.recording) return this.report;
    this.recording = false;
    this.report.stoppedAt = performance.now();
    const uncollected = this.pending.length + (this.active ? 1 : 0);
    if (this.gl?.isContextLost()) {
      this.report.gpuContextLostDiscarded += uncollected;
      this.report.pendingGpuQueries = 0;
      this.report.gpuUnavailable = 'WebGL context lost';
    } else {
      // A historical count at stop, not a count of resources kept alive afterward.
      this.report.pendingGpuQueries = uncollected;
    }
    this.releaseQueries();
    return this.report;
  }
  private contextLost = (): void => {
    if (this.recording) {
      this.report.gpuContextLostDiscarded += this.pending.length + (this.active ? 1 : 0);
      this.report.pendingGpuQueries = 0;
      this.report.gpuUnavailable = 'WebGL context lost';
    }
    // Invalid handles belong to the lost context; never call GL to release them.
    this.active = undefined;
    this.pending.length = 0;
    this.timer = null;
  };
  private contextRestored = (): void => {
    if (!this.recording) return;
    this.timer = this.gl?.getExtension('EXT_disjoint_timer_query_webgl2') ?? null;
    this.report.gpuUnavailable = this.timer ? null : 'WebGL2 timer queries unavailable';
  };
  private empty(): SceneProfileReport {
    return {
      startedAt: 0,
      stoppedAt: 0,
      renderedFrames: { count: 0, firstAt: null, lastAt: null, maxGapAt: null },
      frames: [],
      views: [],
      gpu: [],
      dropped: { frames: 0, views: 0, gpu: 0 },
      gpuUnavailable: null,
      renderer: null,
      pendingGpuQueries: 0,
      gpuQuerySkips: 0,
      gpuDisjointDiscarded: 0,
      gpuContextLostDiscarded: 0,
      histograms: Object.fromEntries(
        (
          [
            'browserFrame',
            'renderedFrame',
            'longTask',
            'rendererCpu',
            'sceneUpdate',
            'sceneView',
            'gpu',
          ] as const
        ).map((series) => [
          series,
          {
            count: 0,
            totalMs: 0,
            maxMs: 0,
            bins: Array<number>(4097).fill(0),
            above25Ms: 0,
            above50Ms: 0,
            above100Ms: 0,
          },
        ]),
      ) as Record<DurationSeries, DurationHistogram>,
      latestFrame: null,
      stationarySince: 0,
      peakEstimatedGraphicsBytes: 0,
      maxRenderedEntries: 0,
      hoverQuadPreparationMs: 0,
    };
  }
  isRecording(): boolean {
    return this.recording;
  }
  begin(): number | undefined {
    return this.recording ? performance.now() : undefined;
  }
  view(started: number | undefined, view: GameView, actors: number): void {
    if (started === undefined || !this.recording) return;
    this.viewAt = performance.now();
    this.report.maxRenderedEntries = Math.max(this.report.maxRenderedEntries, actors);
    this.duration('sceneView', this.viewAt - started);
    this.append('views', [
      started,
      this.viewAt - started,
      view.clock.seconds,
      view.player.position.x,
      view.player.position.y,
      view.player.position.z,
      actors,
    ]);
  }
  update(started: number | undefined): void {
    if (started !== undefined && this.recording) this.updateMs += performance.now() - started;
  }
  /** Foreground postrender submissions; update callbacks can outnumber actual draws. */
  renderedFrame(at: number): void {
    if (!this.recording) return;
    const frames = this.report.renderedFrames;
    if (frames.lastAt !== null) {
      const interval = at - frames.lastAt;
      if (interval > this.report.histograms.renderedFrame.maxMs) frames.maxGapAt = at;
      this.duration('renderedFrame', interval);
    } else frames.firstAt = at;
    frames.count++;
    frames.lastAt = at;
  }
  beginFrame = (): void => {
    if (!this.recording) return;
    this.frameStarted = performance.now();
    this.updateMs = 0;
    const gl = this.gl;
    if (!gl || !this.timer || gl.isContextLost()) {
      this.report.gpuUnavailable = 'WebGL2 timer queries unavailable or context lost';
      return;
    }
    if (!this.report.renderer) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      this.report.renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null;
    }
    if (gl.getParameter(this.timer.GPU_DISJOINT_EXT)) {
      this.report.gpuDisjointDiscarded += this.pending.length;
      this.releaseQueries();
    }
    while (this.pending.length) {
      const pending = this.pending[0]!;
      if (!gl.getQueryParameter(pending.query, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      const ms = gl.getQueryParameter(pending.query, gl.QUERY_RESULT) / 1e6;
      this.duration('gpu', ms);
      this.append('gpu', [pending.at, ms]);
      gl.deleteQuery(pending.query);
    }
    // Never wait for the GPU or accumulate an unbounded query backlog.
    if (this.pending.length >= 16) {
      this.report.gpuQuerySkips++;
      return;
    }
    const query = gl.createQuery();
    if (query) {
      this.active = { query, at: this.frameStarted };
      gl.beginQuery(this.timer.TIME_ELAPSED_EXT, query);
    }
  };
  endFrame(view: GameView | null, displayed: Point | undefined, app: pc.Application): void {
    if (!this.recording) return;
    const at = performance.now();
    if (this.gl?.isContextLost()) this.contextLost();
    if (this.active && this.gl && this.timer) {
      this.gl.endQuery(this.timer.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = undefined;
    }
    if (!view || !displayed) return;
    const p = view.player.position;
    // at, renderer CPU bracket, scene update CPU, latest scene-view time,
    // authoritative XYZ, displayed XYZ, simulation time, estimated graphics bytes,
    // whether the public player projection still has an active action (0/1).
    const sample = [
      at,
      at - this.frameStarted,
      this.updateMs,
      this.viewAt,
      p.x,
      p.y,
      p.z,
      displayed.x,
      displayed.y,
      displayed.z,
      view.clock.seconds,
      app.stats.vram.tex + app.stats.vram.vb + app.stats.vram.ib,
      view.player.action ? 1 : 0,
    ];
    this.report.latestFrame = sample;
    this.report.peakEstimatedGraphicsBytes = Math.max(
      this.report.peakEstimatedGraphicsBytes,
      sample[11]!,
    );
    if (
      !this.stationaryAnchor ||
      Math.hypot(
        displayed.x - this.stationaryAnchor.x,
        displayed.y - this.stationaryAnchor.y,
        displayed.z - this.stationaryAnchor.z,
      ) > 0.005
    ) {
      this.stationaryAnchor = { x: displayed.x, y: displayed.y, z: displayed.z };
      this.report.stationarySince = at;
    }
    this.duration('rendererCpu', at - this.frameStarted);
    this.duration('sceneUpdate', this.updateMs);
    this.append('frames', sample);
  }
  private duration(series: DurationSeries, ms: number): void {
    if (!this.recording) return;
    const histogram = this.report.histograms[series];
    histogram.count++;
    histogram.totalMs += ms;
    histogram.maxMs = Math.max(histogram.maxMs, ms);
    const bucket = Math.min(4096, Math.floor(ms * 4));
    histogram.bins[bucket] = histogram.bins[bucket]! + 1;
    if (ms > 25) histogram.above25Ms++;
    if (ms > 50) histogram.above50Ms++;
    if (ms > 100) histogram.above100Ms++;
  }
  private append(series: 'frames' | 'views' | 'gpu', sample: Sample): void {
    if (this.report[series].length < MAX_SAMPLES) this.report[series].push(sample);
    else this.report.dropped[series]++;
  }
  private releaseQueries(): void {
    if (this.gl?.isContextLost()) {
      this.active = undefined;
      this.pending.length = 0;
      this.timer = null;
      return;
    }
    if (this.active && this.gl) {
      if (this.timer) this.gl.endQuery(this.timer.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active.query);
      this.active = undefined;
    }
    for (const pending of this.pending) this.gl?.deleteQuery(pending.query);
    this.pending.length = 0;
  }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopCapture();
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.groundInput = undefined;
    this.models = undefined;
    this.releaseQueries();
    if (window.__openLegendSceneProfile === this.api) delete window.__openLegendSceneProfile;
  }
}
