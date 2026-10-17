/** Local review media only. No upload, server mutation or saved-world access. */
export class StudyCapture {
  private recorder?: MediaRecorder;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  constructor(private readonly canvas: HTMLCanvasElement) {}
  private download(blob: Blob, name: string): void {
    if (this.disposed) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    // Preserve distinct iterations even outside browsers that rename collisions.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.download = name.replace(/(\.[^.]+)$/, '-' + stamp + '$1');
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  image(name: string): void {
    requestAnimationFrame(() => {
      if (!this.disposed)
        this.canvas.toBlob((blob) => {
          if (blob) this.download(blob, name + '.png');
        });
    });
  }
  record(name: string, finished: (message: string) => void): boolean {
    if (this.recorder || this.disposed) return false;
    if (!('MediaRecorder' in window)) {
      finished('Video recording is unavailable in this browser.');
      return false;
    }
    const chunks: Blob[] = [];
    let stream: MediaStream | undefined;
    let recorder: MediaRecorder;
    try {
      stream = this.canvas.captureStream(30);
      const mimeType = ['video/webm', 'video/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType) throw new Error('No supported review-video format.');
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      finished('This browser cannot record the canvas.');
      return false;
    }
    this.recorder = recorder;
    let failed = false;
    recorder.onerror = () => {
      failed = true;
    };
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      clearTimeout(this.timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (!this.disposed) {
        if (!chunks.length) failed = true;
        if (!failed)
          this.download(
            new Blob(chunks, { type: recorder.mimeType }),
            name + (recorder.mimeType.startsWith('video/mp4') ? '.mp4' : '.webm'),
          );
        finished(failed ? 'Recording failed; no incomplete video was saved.' : 'Recording saved.');
      }
      this.recorder = undefined;
    };
    try {
      recorder.start();
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      this.recorder = undefined;
      finished('This browser could not start recording.');
      return false;
    }
    this.timer = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 8000);
    return true;
  }
  destroy(): void {
    this.disposed = true;
    clearTimeout(this.timer);
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }
}
