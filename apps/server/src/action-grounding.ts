import {
  ACTION_GROUNDING_POLICY,
  actionGroundingQuestions,
  actionFulfillmentQuestions,
} from './jev-questions.js';
import { navigationInvocationSchema } from './navigation-contracts.js';
import { z } from 'zod';
import {
  captureActionTargets,
  observerDescription,
  bindNavigationInvocation,
    : undefined;
};

/** Exact complete forms only: never strip a qualifier to manufacture a free fast path. */
        continue;
      }
      const selected = await ports.judge({
        state: context,
        questions: actionGroundingQuestions(scoped.map((candidate) => candidate.description)),
      });
      const route = confident(selected, 'route');
        await ports.generate({
          instructions:
            ACTION_GROUNDING_POLICY +
            ' Return a faithful executable subset only when useful. Account for every meaningful clause as supported or omitted; the revised description must disclose actual termination and effects. Use confirm when unsure an omission is acceptable, especially changed safety, stealth, recipient, instrument, scope or cost. Never treat a skipped prerequisite as successful. Existing handles keep their exact arguments. Each step selects exactly one actionId or navigation invocation. Only move/follow support generated parameters. Follow has no successful finite termination and cannot precede another step; do not promise unreachable continuation. Return unresolved with no steps when nothing faithful is executable. Do not invent capabilities, definitions, completed effects or output IDs. Return only specified JSON.',
          context,
            native: { description: nativeDescription, commands: boundCommands },
          },
          questions: actionFulfillmentQuestions(),
        });
        await ports.record(
    }
  }
  return additions.map((binding) => ({
    ...binding,
    targetEpisodes: captureActionTargets(world, actorId, binding.commands),
  }));
}
