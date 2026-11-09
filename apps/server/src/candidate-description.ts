import type { WorkTransitionMode } from '@open-legend/domain';

/** Formatting consumes already-permitted facts. Neither the target label nor
 * this description can grant a physical target or an executable command. */
export function formatCandidateDetails(
  description: string,
  transition: WorkTransitionMode,
  handlingCurrentWork: boolean,
  consequence: string | undefined,
  target: { description: string; health: string; distance: number } | undefined,
): string {
  if (handlingCurrentWork)
    description +=
      transition === 'replace'
        ? ' Choosing this replaces my current work; spent materials and committed effects remain.'
        : transition === 'interrupt'
          ? ' Choosing this pauses the supported current plan; its unfinished step restarts later.'
          : transition === 'enqueue'
            ? ' Choosing this queues it after my current work.'
            : ' This choice keeps my current work.';
  if (consequence) description += ' ' + consequence;
  return target
    ? `${description} Target: ${target.description}.${target.health ? ` Last observed ${target.health}` : ''} Distance to the observed position: ${target.distance.toFixed(1)} m. Route length is not known.`
    : description;
}

export function formatCandidateTemporary(
  description: string,
  blocker: { message: string; nextAt?: number },
): string {
  return `${description} Temporarily unavailable: ${blocker.message}${blocker.nextAt !== undefined ? ` Recovery ends at game time ${blocker.nextAt}.` : ''}`;
}
