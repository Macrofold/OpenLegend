import { z } from 'zod';
import type { WorldService } from './world-service.js';
import { WORLD_READ_TOOLS, WorldToolService } from './world-tools.js';
import { WorldAuthoring } from './world-authoring.js';
import { AUTHORING_KINDS, previewAuthoring } from './authoring-kinds.js';
import type { AuthoringSession } from './authoring-records.js';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
const draft = { draftId: id, expectedRevision: z.number().int().min(1).max(64) };
const edit = {
  intent: z.string().trim().min(1).max(2000),
  candidateJson: z.string().min(2).max(16000),
};
/** Operation semantics live in the application; this catalogue is shared by HTTP and MCP. */
export const WORLD_AUTHORING_TOOLS = {
  ol_authoring_catalogue: {
    readOnly: true,
    description:
      'Read the implemented authoring kinds and exact recipe/action shape. Attribute creation/revision remains native-validated. No paid work.',
    schema: z.object({}).strict(),
  },
  ol_session: {
    readOnly: true,
    description:
      'Inspect this session, retained draft heads, pending approval cards and the shared image-inclusive allowance. No new allowance or paid work.',
    schema: z.object({}).strict(),
  },
  ol_budget: {
    readOnly: true,
    description:
      'Inspect spent, reserved, uncertain and available funds in this session. Cannot increase the cap.',
    schema: z.object({}).strict(),
  },
  ol_draft_create: {
    readOnly: false,
    description:
      'Retain a new recipe, attribute declaration or native action draft. Does not install, act, teach, spawn or spend. Reuse operationId only for identical content.',
    schema: z
      .object({
        operationId: id,
        kind: z.enum(AUTHORING_KINDS),
        ...edit,
        base: z
          .object({ kind: z.literal('recipe'), id, version: z.string().min(1).max(100) })
          .strict()
          .optional(),
      })
      .strict(),
  },
  ol_draft_update: {
    readOnly: false,
    description:
      'Submit a new immutable revision of a session draft. Expected revision prevents lost edits. Inherited derivation cannot change silently.',
    schema: z.object({ operationId: id, ...draft, ...edit }).strict(),
  },
  ol_draft_read: {
    readOnly: true,
    description:
      'Read an exact retained draft or its current revision. Full candidate bytes, requested intent and derivation remain available.',
    schema: z
      .object({ draftId: id, revision: z.number().int().min(1).max(64).optional() })
      .strict(),
  },
  ol_validate: {
    readOnly: true,
    description:
      'Run unpaid native checks/preview on the selected saved draft. Returns actual limitations, not proof of every interaction or installation authority.',
    schema: z.object(draft).strict(),
  },
  ol_change_prepare: {
    readOnly: false,
    description:
      'Prepare an immutable native change and inline human approval card for the exact current draft. No live change. Supported kinds only; blocked native preview cannot be applied.',
    schema: z.object({ operationId: id, ...draft }).strict(),
  },
  ol_approval_request: {
    readOnly: true,
    description:
      'Inspect the existing approval card for a prepared change. Tell the player to review it in OpenLegend. This tool cannot grant approval.',
    schema: z.object({ planId: id }).strict(),
  },
  ol_change_apply: {
    readOnly: false,
    description:
      'Apply an exactly approved plan through native admission. Uses plan identity for idempotency. Current world, draft and permissions are rechecked. No model call, automatic crafting or refund.',
    schema: z.object({ planId: id }).strict(),
  },
} as const;

type AuthoringRequest = {
  [K in keyof typeof WORLD_AUTHORING_TOOLS]: {
    name: K;
    input: z.infer<(typeof WORLD_AUTHORING_TOOLS)[K]['schema']>;
  };
}[keyof typeof WORLD_AUTHORING_TOOLS];
export interface WorldToolDescriptor {
  name: string;
  description: string;
  schema: z.ZodObject;
  readOnly: boolean;
  session: boolean;
}

export class WorldAgentTools {
  constructor(
    readonly service: WorldService,
    readonly reads: WorldToolService,
    readonly authoring: WorldAuthoring,
  ) {}
  descriptors(withWrites: boolean): WorldToolDescriptor[] {
    return [
      ...Object.entries(WORLD_READ_TOOLS).map(([name, t]) => ({
        name,
        ...t,
        readOnly: true,
        session: false,
      })),
      ...(withWrites
        ? Object.entries(WORLD_AUTHORING_TOOLS).map(([name, t]) => ({ name, ...t, session: true }))
        : []),
    ];
  }
  async execute(
    name: string,
    input: unknown,
    session?: AuthoringSession,
    guard: () => void = () => {},
  ): Promise<Record<string, unknown>> {
    if (Object.hasOwn(WORLD_READ_TOOLS, name)) {
      const result = this.reads.execute(name, input, {
        worldId: this.service.world.id,
        principal: 'world-agent',
      });
      if (
        name === 'ol_context' &&
        result.status === 'ok' &&
        session &&
        result.data &&
        typeof result.data === 'object'
      ) {
        result.data = {
          ...result.data,
          authoringSession: session.id,
          authoringTools: Object.keys(WORLD_AUTHORING_TOOLS),
          limitations: [
            'Native recipe, attribute and action draft/apply adapters are implemented. General interaction closure, art generation and arbitrary laws are not.',
          ],
          instruction:
            'Use ol_authoring_catalogue, inspect exact definitions, save and validate drafts, then prepare a human approval card. Final prose never executes changes.',
        };
      }
      return { ...result };
    }
    if (!session || !Object.hasOwn(WORLD_AUTHORING_TOOLS, name))
      return {
        status: 'forbidden',
        message: 'This tool requires a current application-bound authoring session.',
      };
    const tool = WORLD_AUTHORING_TOOLS[name as keyof typeof WORLD_AUTHORING_TOOLS];
    const parsed = tool.schema.safeParse(input);
    if (!parsed.success)
      return {
        status: 'invalid',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      };
    try {
      guard();
      // The matching strict schema above establishes this discriminated request.
      const data = await this.dispatch(
        { name, input: parsed.data } as AuthoringRequest,
        session,
        guard,
      );
      const result = { status: 'ok', data, cost: 'no-paid-work' };
      const text = JSON.stringify(result);
      if (Buffer.byteLength(text) > 80 * 1024)
        return { status: 'capacity', message: 'Select one draft or a smaller inspection.' };
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      return {
        status: 'blocked',
        message: error instanceof Error ? error.message : 'Authoring operation failed.',
      };
    }
  }
  private async dispatch(
    request: AuthoringRequest,
    session: AuthoringSession,
    guard: () => void,
  ): Promise<unknown> {
    switch (request.name) {
      case 'ol_authoring_catalogue':
        return this.authoring.catalogue();
      case 'ol_session':
        return this.authoring.view(session);
      case 'ol_budget':
        return this.authoring.budgetView(session);
      case 'ol_draft_create':
      case 'ol_draft_update':
        return this.authoring.saveDraft(session, request.input);
      case 'ol_draft_read':
        return this.authoring.draft(session, request.input.draftId, request.input.revision);
      case 'ol_validate': {
        const draft = await this.authoring.draft(session, request.input.draftId);
        if (draft.revision !== request.input.expectedRevision)
          throw new Error('Draft changed; read it again.');
        return {
          preview: previewAuthoring(this.service, session, draft),
          coverage: 'native-family-only',
          limitations: [
            'No claim of general interaction closure, intent fidelity, live agent quality or new physics.',
          ],
        };
      }
      case 'ol_change_prepare':
        return this.authoring.prepare(session, request.input);
      case 'ol_approval_request':
        return this.authoring.plan(session, request.input.planId);
      case 'ol_change_apply':
        return this.authoring.apply(session, request.input.planId, guard);
      default:
        throw new Error('Unknown authoring operation.');
    }
  }
}
