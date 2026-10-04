/** Count rendered frames over real elapsed time, including foreground stalls. */
export class FrameRateMeter {
  private startedAt: number | null = null;
  private frames = 0;

  record(now: number): void {
    if (this.startedAt === null) this.startedAt = now;
    else this.frames++;
  }

  sample(now: number): number | null {
    if (this.startedAt === null || now <= this.startedAt) return null;
    const fps = (this.frames * 1000) / (now - this.startedAt);
    this.startedAt = now;
    this.frames = 0;
    return fps;
  }

  reset(): void {
    this.startedAt = null;
    this.frames = 0;
  }
}
