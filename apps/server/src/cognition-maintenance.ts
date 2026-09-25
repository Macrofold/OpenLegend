import { resolveResponseEntities } from './entity-references.js';
import { dreamStatus, dreamPolicy } from '@open-legend/domain';
import { experiencesSince } from '@open-legend/domain';
import { nativeNeedBelow } from '@open-legend/domain';
import { timedSync } from './performance.js';
      const current = this.service.world;
      timedSync('cognition.maintenanceRefresh', () =>
        this.work.refresh(
          current,
          (id) => {
            const actor = current.entities[id]!.actor!;
            return [
              actor.controller,
              actor.incapacitated,
              actor.health >= 0.4 * (actor.body?.maxHealth ?? 100),
              !nativeNeedBelow(actor, 'fullness', 30),
              actor.action?.type,
              dreamStatus(current, current.entities[id])?.episode,
              current.memories[id],
              current.experience?.awareness[id],
              current.experience?.summaries[id],
              current.minds?.[id],
              current.innerWorlds?.[id],
              current.cognitionPolicy,
              this.service.memoryBacklog,
            ];
          },
          this.service.memoryBacklog,
        ),
      );
      const actors = this.work
        .ready(this.now(), current.simTime)
        .map((id) => current.entities[id]!);
      const workVersions = new Map(actors.map((e) => [e.id, this.work.version(e.id)]));
      const times = new Map(
        await Promise.all(actors.map(async (e) => [e.id, await this.last(e.id)] as const)),
          ),
        ].filter((at) => at > world.simTime);
        this.work.inspected(entity.id, Math.min(...future), workVersions.get(entity.id));
        const dreamReady =
          safe &&
          dreamStatus(world, world.entities[entity.id])!.elapsedSeconds >=
            dreamPolicy(world).afterSeconds;
        const hasMemories = !experiencesSince(world, entity.id, -1).next().done;
        const day = Math.floor(world.simTime / 86400);
        const reflectedToday =
