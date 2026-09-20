export function EventTime({ time }: { time: number }) {
  const minutes = Math.floor(time / 60) + 8 * 60;
  const hour = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return (
    <time
      className="ol-event-time"
      aria-label={`Game day ${Math.floor(time / 86400) + 1}, ${hour}:${minute}`}
    >
      Day {Math.floor(time / 86400) + 1} · {hour}:{minute}
    </time>
  );
}
