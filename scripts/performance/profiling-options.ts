/** Explicit local tool choice; never inherit an accidental application setting. */
export function profilingOptions(values: readonly string[]): {
  enabled: boolean;
  arguments: string[];
} {
  let mode: string | undefined;
  const positional: string[] = [];
  for (const value of values) {
    if (value === '--app-profiling' || value.startsWith('--app-profiling=')) {
      if (mode !== undefined) throw new Error('Specify --app-profiling only once.');
      const choice = value.slice('--app-profiling='.length);
      if (choice !== 'on' && choice !== 'off')
        throw new Error('--app-profiling must be on or off.');
      mode = choice;
    } else positional.push(value);
  }
  return { enabled: mode !== 'off', arguments: positional };
}
