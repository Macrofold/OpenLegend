import type { Command } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Public intentions bind to closed native operations; this identifies support only.
 * The scoped binder still validates all selected arguments and permissions. */
export function nativeCommandKind(kind: CommandInput['type'] | Command['type']): Command['type'] {
  switch (kind) {
    case 'construction':
      return 'assemble';
    case 'construction-rest':
      return 'status-effect';
    case 'activity-request':
      return 'compose';
    default:
      return kind;
  }
}
