import {
  acquiredActivities,
  bindActivityCommand,
  nativeActivityView,
  renderActivity,
  ACTIVITY_SYNTAX,
  itemFor,
  accessiblePossession,
  availableItemQuantity,
  possessionItems,
  NATIVE_PREPARATIONS,
  type ActivityOutput,
  type ActivityMethod,
  type ActivityNode,
  type ActivityView,
  type ActivityBinding,
  type WorldState,
} from '@open-legend/domain';
import { decisionObservation } from './decision-observation.js';
import { consumptionDescription } from './body-services.js';
import { gameTime } from './recall.js';
import type { CandidateAction } from './context.js';
import type { WorldService } from './world-service.js';

/** Read-only rendering of a supplied structure. Future outputs are described as
 * future requirements, never installed into the world or treated as possessions. */
export function activityChoiceView(
  world: WorldState,
  actorId: string,
  method: Pick<ActivityMethod, 'root'> & Partial<Pick<ActivityMethod, 'roles'>>,
  bindings: Record<string, ActivityBinding>,
  root = method.root,
  actualOutputs: Record<string, ActivityOutput[]> = {},
): ActivityView {
  const products = new Map<string, Omit<ActivityOutput, 'itemId'>>();
  const index = (node: ActivityNode): void => {
    if (node.kind === 'invoke')
      for (const output of node.outputs ?? []) products.set(`${node.key}:${output.port}`, output);
    if (node.kind === 'sequence') node.children.forEach(index);
    if (node.kind === 'branch') {
      index(node.yes);
      if (node.no) index(node.no);
    }
    if (node.kind === 'repeat') index(node.body);
  };
  index(method.root);
  const futureKeys = new Set<string>();
  const upcoming = (node: ActivityNode): void => {
    if (node.kind === 'invoke') futureKeys.add(node.key);
    if (node.kind === 'sequence') node.children.forEach(upcoming);
    if (node.kind === 'branch') {
      upcoming(node.yes);
      if (node.no) upcoming(node.no);
    }
    if (node.kind === 'repeat') upcoming(node.body);
  };
  upcoming(root);
  const availableOutputs = Object.fromEntries(
    Object.entries(actualOutputs).filter(([key]) => !futureKeys.has(key)),
  );
  const view = (node: ActivityNode): ActivityView => {
    if (node.kind === 'invoke') {
      const outputs: Record<
        string,
        { port: string; itemId: string; definitionId: string; quantity: number }[]
      > = { ...availableOutputs };
      const required: string[] = [];
      for (const arg of Object.values(node.args))
        if ('output' in arg) {
          if (
            outputs[arg.output]?.some(
              (output) => output.port === arg.port && output.quantity >= arg.quantity,
            )
          )
            continue;
          if (Object.hasOwn(availableOutputs, arg.output)) {
            required.push(
              'Earlier work did not produce enough of the required result. This remaining step cannot start without a newly chosen way to obtain it.',
            );
            continue;
          }
          const product = products.get(`${arg.output}:${arg.port}`);
          const name =
            world.itemDefinitions[product?.definitionId ?? arg.port]?.name ?? 'an earlier result';
          (outputs[arg.output] ??= []).push({
            port: arg.port,
            itemId: `future-${arg.output}`,
            definitionId: product?.definitionId ?? arg.port,
            quantity: arg.quantity,
          });
          required.push(
            `Requires ${arg.quantity} ${name} actually produced by earlier work; it is not owned yet`,
          );
        }
      const command = bindActivityCommand(node, { bindings, outputs }, actorId, 'view-only');
      const result = command ? nativeActivityView(world, command) : { name: node.name, facts: [] };
      result.name = node.name;
      result.facts.push(
        ...required.map((value) => ({ name: 'later requirement', value, critical: true })),
      );
      const input = node.args.itemId;
      if (node.command === 'eat' && input && 'output' in input) {
        const product = products.get(`${input.output}:${input.port}`);
        const definition = product && world.itemDefinitions[product.definitionId];
        if (definition?.nutrition)
          result.facts.push({
            name: 'consumption',
            value: consumptionDescription(world, world.entities[actorId]!, definition),
            critical: true,
          });
      }
      for (const output of node.outputs ?? [])
        result.facts.push(
          // Learned methods carry real past results; a requested composition only declares
          // what a later step may use, so it must not claim an earlier attempt.
          method.roles
            ? {
                name: 'previous result',
                value: `My earlier attempt produced ${output.quantity} ${world.itemDefinitions[output.definitionId]?.name ?? 'items'}; this attempt may fail or produce less`,
                critical: true,
              }
            : {
                name: 'expected result',
                value: `A later step uses the ${world.itemDefinitions[output.definitionId]?.name ?? 'items'} this produces, if it actually produces any`,
                critical: true,
              },
        );
      return result;
    }
    if (node.kind === 'sequence') {
      const children: ActivityView[] = [];
      // Only adjacent identical *offers* share wording; the saved execution tree
      // and individual historical effects keep their distinct step identities.
      let prior = '',
        count = 0,
        name = '';
      for (const child of node.children.map(view)) {
        const key = JSON.stringify(child);
        if (key === prior) {
          count++;
          children.at(-1)!.name = `${name}, ${count} separate attempts in order`;
        } else {
          prior = key;
          count = 1;
          name = child.name;
          children.push(child);
        }
      }
      return {
        name: children
          .map((child) => child.name)
          .join('; ')
          .slice(0, 500),
        facts: [],
        children,
      };
    }
    const condition = node.kind === 'branch' ? node.when : node.until;
    const labels = {
      alive: 'is alive',
      available: 'is available',
      equipped: 'is equipped',
      lit: 'is lit',
      output: 'the earlier work produced enough of the required result',
      holding:
        condition.test === 'holding'
          ? `I carry at least ${condition.quantity} ${world.itemDefinitions[condition.definitionId]?.name ?? condition.definitionId}`
          : '',
      time:
        condition.test === 'time'
          ? `it is ${gameTime(condition.at, world.statusEffectPolicy.clockOffsetHours)}`
          : '',
    };
    const subject = !('role' in condition)
      ? ''
      : (() => {
          const id = bindings[condition.role];
          const command = {
            type: 'follow' as const,
            id: 'view-only',
            actorId,
            targetId: typeof id === 'string' ? id : '',
          };
          return nativeActivityView(world, command).target ?? 'the required object';
        })();
    const text = `${subject} ${labels[condition.test]}`.trim();
    if (node.kind === 'branch')
      return {
        name: `If ${text}`,
        facts: [
          { name: 'uncertainty', value: 'Stop and reconsider if I cannot tell', critical: true },
        ],
        children: [
          view(node.yes),
          ...(node.no
            ? [{ name: 'Otherwise', facts: [], children: [view(node.no)] }]
            : [{ name: 'Otherwise stop', facts: [] }]),
        ],
      };
    if (node.kind === 'repeat')
      return {
        name: `Repeat at most ${node.maximum} times; stop when ${text}`,
        facts: [
          {
            name: 'failure',
            value:
              'Stop on an unavailable target, blocked native step or unknown stopping condition',
            critical: true,
          },
        ],
        children: [view(node.body)],
      };
    return {
      name: `Wait until ${text}`,
      facts: [{ name: 'waiting limit', value: `${node.seconds} game seconds`, critical: true }],
    };
  };
  const result = view(root);
  if (root.kind !== 'invoke') {
    type Demand = { quantity: number; available?: number; name: string; future: boolean };
    const needs = (node: ActivityNode): Map<string, Demand> => {
      const totals = new Map<string, Demand>();
      const combine = (other: Map<string, Demand>, maximum = false) => {
        for (const [key, need] of other) {
          const prior = totals.get(key);
          totals.set(key, {
            ...need,
            quantity: maximum
              ? Math.max(prior?.quantity ?? 0, need.quantity)
              : (prior?.quantity ?? 0) + need.quantity,
          });
        }
      };
      if (node.kind === 'sequence') node.children.forEach((child) => combine(needs(child)));
      else if (node.kind === 'branch') {
        combine(needs(node.yes));
        if (node.no) combine(needs(node.no), true);
      } else if (node.kind === 'repeat')
        for (const [key, need] of needs(node.body))
          totals.set(key, {
            ...need,
            quantity: need.quantity * node.maximum,
            ...(need.future && need.available !== undefined
              ? { available: need.available * node.maximum }
              : {}),
          });
      else if (node.kind === 'invoke') {
        const literal = (field: string) => {
          const arg = node.args[field];
          return arg && 'literal' in arg ? String(arg.literal) : '';
        };
        const recipe = node.command === 'craft' ? world.recipes[literal('recipeId')] : undefined;
        const preparation =
          node.command === 'prepare'
            ? NATIVE_PREPARATIONS[literal('preparation') as keyof typeof NATIVE_PREPARATIONS]
            : undefined;
        const inputs =
          recipe?.inputs ??
          (preparation
            ? [{ definitionId: preparation.input, quantity: preparation.inputQuantity }]
            : []);
        for (const input of inputs)
          totals.set(`definition:${input.definitionId}`, {
            quantity: input.quantity,
            available: [...possessionItems(world, actorId)]
              .filter((item) => item.definitionId === input.definitionId)
              .reduce((sum, item) => sum + availableItemQuantity(world, item.id), 0),
            name: world.itemDefinitions[input.definitionId]?.name ?? 'required material',
            future: false,
          });
        const field = ['eat', 'cook', 'drop'].includes(node.command)
          ? 'itemId'
          : node.command === 'hunt'
            ? 'ammoItemId'
            : undefined;
        const arg = field && node.args[field];
        const quantity =
          node.command === 'drop' && node.args.quantity && 'literal' in node.args.quantity
            ? Number(node.args.quantity.literal)
            : 1;
        if (arg && 'output' in arg) {
          const key = `${arg.output}:${arg.port}`,
            product = products.get(key);
          const actual = availableOutputs[arg.output]?.find((output) => output.port === arg.port);
          const available = actual
            ? accessiblePossession(world, actorId, actual.itemId)
              ? availableItemQuantity(world, actual.itemId)
              : 0
            : product?.quantity;
          totals.set(key, {
            quantity,
            available,
            name:
              world.itemDefinitions[product?.definitionId ?? arg.port]?.name ?? 'earlier product',
            future: !actual,
          });
        } else if (arg && 'role' in arg) {
          const id = bindings[arg.role],
            item =
              typeof id === 'string' && accessiblePossession(world, actorId, id)
                ? itemFor(world, id)
                : undefined;
          const key = item ? `definition:${item.definitionId}` : arg.role;
          const prior = totals.get(key)?.quantity ?? 0;
          totals.set(key, {
            quantity: quantity + prior,
            available: item
              ? [...possessionItems(world, actorId)]
                  .filter((other) => other.definitionId === item.definitionId)
                  .reduce((sum, other) => sum + availableItemQuantity(world, other.id), 0)
              : 0,
            name: item
              ? (world.itemDefinitions[item.definitionId]?.name ?? 'carried item')
              : 'required carried item',
            future: false,
          });
        }
      }
      return totals;
    };
    for (const need of needs(root).values())
      result.facts.push({
        name: 'total consumption',
        value: `Up to ${need.quantity} ${need.name}; ${need.future ? `earlier work produced ${need.available ?? 'an unknown amount'}, but future yield is uncertain` : `${need.available ?? 'unknown quantity'} currently free`}${need.available !== undefined && need.quantity > need.available ? '; shortage: this sequence needs more than that supply' : ''}`,
        critical: true,
      });
    result.facts.push({
      name: 'travel and interruption',
      value:
        'Distances below are from my current position. Later travel and future conditions may change. Spent materials and actual injury remain after interruption; failed work stops the sequence.',
      critical: true,
    });
  }
  if (root === method.root)
    for (const requirement of Object.values(method.roles ?? {}))
      if (requirement.maximumHealth !== undefined)
        result.facts.push({
          name: 'observed entry condition',
          value: `This method was learned with target health at most ${requirement.maximumHealth}; it does not establish how to defeat a healthier target`,
          critical: true,
        });
  return result;
}

export function learnedActivityCandidates(
  service: WorldService,
  actorId: string,
  observed = decisionObservation(service.world, actorId),
  methodOffset = 0,
  methodIds?: readonly string[],
): CandidateAction[] {
  const world = service.world;
  if (!observed) return [];
  const results: CandidateAction[] = [];
  const plan = world.entities[actorId]?.actor?.agency.plan;
  if (
    plan?.status === 'blocked' &&
    plan.activity?.methodId &&
    !plan.steps.some((step) => step.status === 'blocked')
  ) {
    results.push({
      id: 'continue-learned-activity',
      description: `Continue my chosen activity. ${remainingActivityText(world, actorId)}`,
      command: {
        type: 'activity',
        methodId: plan.activity.methodId,
        bindings: plan.activity.bindings,
        resume: true,
      },
    });
  }
  // The acquisition owner bounds this to 64 private definitions. No shared
  // catalogue is exposed; one bounded binding per method avoids a Cartesian product.
  const acquired = acquiredActivities(world, actorId);
  const selected = methodIds
    ? methodIds.flatMap((id) => {
        const method = acquired.find((method) => method.id === id);
        return method ? [method] : [];
      })
    : acquired.slice(methodOffset);
  for (const method of selected) {
    if (!method.executable) continue;
    if (results.length >= 4) break;
    const bindings: Record<string, ActivityBinding> = {};
    let available = true;
    for (const [role, requirement] of Object.entries(method.roles)) {
      if (requirement.kind === 'text') {
        const remembered =
          world.actionExperience.acquisitions[actorId]?.[method.id]?.bindings[role];
        if (typeof remembered === 'string') bindings[role] = remembered;
        else available = false;
      } else if (requirement.kind === 'place') {
        const remembered =
          world.actionExperience.acquisitions[actorId]?.[method.id]?.bindings[role];
        if (remembered && typeof remembered === 'object') bindings[role] = remembered;
        else available = false;
      } else if (requirement.definitionId) {
        const item = observed.inventory.find(
          (item) =>
            item.definitionId === requirement.definitionId &&
            item.quantity > 0 &&
            world.entities[item.id]?.item?.definitionPin.version ===
              requirement.definitionVersion &&
            world.entities[item.id]?.item?.definitionPin.digest === requirement.definitionDigest,
        );
        if (item) bindings[role] = item.id;
        else available = false;
      } else {
        const fields = requirement.commandFields;
        const firstUse = (node: ActivityNode): string | undefined => {
          if (node.kind === 'invoke')
            return Object.values(node.args).some(
              (argument) => 'role' in argument && argument.role === role,
            )
              ? node.command
              : undefined;
          const children =
            node.kind === 'sequence'
              ? node.children
              : node.kind === 'branch'
                ? [node.yes, ...(node.no ? [node.no] : [])]
                : node.kind === 'repeat'
                  ? [node.body]
                  : [];
          for (const child of children) {
            const command = firstUse(child);
            if (command) return command;
          }
        };
        const use = firstUse(method.root);
        const entity = observed.visibleEntities.find((entity) =>
          fields.includes('heatId')
            ? !!entity.heat
            : entity.id !== actorId &&
              (!requirement.entityKind || entity.kind === requirement.entityKind) &&
              (requirement.maximumHealth === undefined ||
                (!!entity.actor?.alive && entity.actor.health <= requirement.maximumHealth)) &&
              (use !== 'harvest' || (!!entity.remains && !entity.remains.harvested)),
        );
        if (entity) bindings[role] = entity.id;
        else available = false;
      }
    }
    if (!available) continue;
    results.push({
      id: `learned-${method.id}`,
      description: `${renderActivity(activityChoiceView(world, actorId, method, bindings), 'Can do')}. Learned from my own attempts; future success is uncertain.`,
      command: { type: 'activity', methodId: method.id, bindings },
    });
  }
  return results;
}
export function remainingActivityText(world: WorldState, actorId: string): string {
  const plan = world.entities[actorId]?.actor?.agency.plan;
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled')
    return 'No remaining chosen work.';
  const execution = plan.activity;
  const children = plan.steps
    .filter((step) => step.status === 'queued' || step.status === 'running')
    .map((step) =>
      'itemFromStep' in step.command
        ? { name: 'Use an actual earlier output', facts: [] }
        : nativeActivityView(world, step.command),
    );
  const method =
    execution &&
    (execution.request ??
      (execution.methodId ? world.actionExperience.methods[execution.methodId] : undefined));
  if (execution && method)
    children.push(
      ...[...execution.pending]
        .reverse()
        .map((frame) =>
          activityChoiceView(
            world,
            actorId,
            method,
            execution.bindings,
            frame.node,
            execution.outputs,
          ),
        ),
    );
  return `${ACTIVITY_SYNTAX}\n${renderActivity({ name: method?.name ?? 'Chosen work', facts: execution?.reason ? [{ name: 'stopped because', value: execution.reason, critical: true }] : [], children }, 'Remaining')}${plan.status === 'blocked' ? ' Choosing a new action replaces this stopped plan. Completed effects and spent materials remain.' : ' Choosing a different action interrupts this activity; completed effects and spent materials remain.'}`;
}
