import type {
  CognitionLabExpected,
  CognitionLabOperation,
  CognitionLabReceipt,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { browserRequest, type BrowserReply } from '../browser-network';
import { tabClientId, tabIdentityReady } from '../tab-session';
import { browserRequestPolicy, cognitionLabApiRoot } from '../network-policies';
import { createLabReadAdmission } from './read-admission';

export const LAB_API = cognitionLabApiRoot;
const admitRead = createLabReadAdmission();

export class LabResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export class LabAccessError extends LabResponseError {}

function errorMessage(body: unknown): string | undefined {
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : undefined;
}

function headers() {
  return tabIdentityReady.then(() => ({ 'X-OL-Client': tabClientId() }));
}

export function labPath(path: string, query?: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {}))
    if (value !== undefined && value !== '') search.set(key, String(value));
  return `${LAB_API}${path}${search.size ? `?${search}` : ''}`;
}

/** Downloads cannot set the normal tab header; the server rechecks this tab's grant. */
export function labExportUrl(kind: 'scenario' | 'checkpoint' | 'run', id: string): string {
  return labPath(`/exports/${kind}/${encodeURIComponent(id)}`, { client: tabClientId() });
}

export async function labRead<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const url = labPath(path, query);
  const read = (signal?: AbortSignal) =>
    browserRequest(
      url,
      { credentials: 'same-origin', cache: 'no-store', signal },
      undefined,
      headers,
    );
  let reply: BrowserReply;
  if (path === '/changes') reply = await read(signal);
  else {
    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    // Queuing consumes this read's existing observation window, rather than
    // granting another full deadline when its transport can finally start.
    const timeout = setTimeout(
      () => controller.abort(new DOMException('The lab read timed out.', 'TimeoutError')),
      browserRequestPolicy('GET', url).timeoutMs,
    );
    try {
      reply = await admitRead(controller.signal, () => read(controller.signal));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
  if (reply.status === 401 || reply.status === 403)
    throw new LabAccessError(
      reply.status,
      errorMessage(reply.body) ??
        (reply.status === 401
          ? 'Sign in to open Cognition Lab.'
          : 'This account cannot open Cognition Lab.'),
    );
  if (!reply.ok || reply.body === undefined)
    throw new LabResponseError(
      reply.status,
      errorMessage(reply.body) ?? `Could not read this lab information (${reply.status}).`,
    );
  return reply.body as T;
}

export async function labOperation(
  operation: CognitionLabOperation,
  ownerScope: string,
): Promise<CognitionLabReceipt> {
  const reply = await browserRequest(
    labPath('/operations'),
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-OL-Lab-Owner': ownerScope },
      body: JSON.stringify(operation),
    },
    operation,
    headers,
  );
  if (reply.status === 401 || reply.status === 403)
    throw new LabAccessError(
      reply.status,
      errorMessage(reply.body) ?? 'Your lab access has changed. Refresh before continuing.',
    );
  if (
    !reply.body ||
    typeof reply.body !== 'object' ||
    !('ok' in reply.body) ||
    typeof reply.body.ok !== 'boolean' ||
    !('commandId' in reply.body) ||
    reply.body.commandId !== operation.commandId
  )
    throw new Error(
      'This operation is unconfirmed. Check the same operation before sending it again.',
    );
  return reply.body as CognitionLabReceipt;
}

/** Observe the original call only; this cannot submit a new model request. */
export async function labRefreshReceipt(
  runId: string,
  stageId: string,
  ownerScope: string,
  signal: AbortSignal,
): Promise<string> {
  const reply = await browserRequest(
    labPath(`/runs/${encodeURIComponent(runId)}/stages/${encodeURIComponent(stageId)}/receipt`),
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-OL-Lab-Owner': ownerScope },
      body: '{}',
      signal,
    },
    undefined,
    headers,
  );
  if (reply.status === 401 || reply.status === 403)
    throw new LabAccessError(reply.status, errorMessage(reply.body) ?? 'Your lab access changed.');
  if (!reply.ok)
    throw new LabResponseError(
      reply.status,
      errorMessage(reply.body) ?? 'Could not refresh this call’s receipt.',
    );
  const message = errorMessage(reply.body);
  if (!message?.trim())
    throw new LabResponseError(
      reply.status,
      'The receipt check returned no confirmation. Refresh to check the original call again.',
    );
  return message;
}

export interface LabImportRequest {
  commandId: string;
  ownerScope: string;
  expected: CognitionLabExpected;
  file: File;
  validateOnly: boolean;
}
export interface LabImportResult {
  ok: boolean;
  commandId: string;
  unconfirmed?: boolean;
  message: string;
  importId?: string;
  kind?: string;
  name?: string;
}
export async function labImport(request: LabImportRequest): Promise<LabImportResult> {
  const reply = await browserRequest(
    labPath('/imports', {
      commandId: request.commandId,
      runtimeGeneration: request.expected.runtimeGeneration,
      scenarioRevision: request.expected.scenarioRevision,
      validateOnly: String(request.validateOnly),
    }),
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-ndjson', 'X-OL-Lab-Owner': request.ownerScope },
      body: request.file,
    },
    undefined,
    headers,
  );
  if (reply.status === 401 || reply.status === 403)
    throw new LabAccessError(
      reply.status,
      errorMessage(reply.body) ?? 'Your lab access has changed.',
    );
  if (
    !reply.body ||
    typeof reply.body !== 'object' ||
    !('ok' in reply.body) ||
    typeof reply.body.ok !== 'boolean' ||
    !('commandId' in reply.body) ||
    reply.body.commandId !== request.commandId
  )
    throw new Error(
      'The import outcome is unconfirmed. Check the same upload before sending a different file.',
    );
  return reply.body as LabImportResult;
}

export function expected(workspace: CognitionLabWorkspace): CognitionLabExpected {
  return {
    runtimeGeneration: workspace.runtimeGeneration,
    scenarioRevision: workspace.scenarioRevision,
  };
}

export function currentScope(workspace: CognitionLabWorkspace): string {
  return JSON.stringify([
    workspace.workspaceId,
    workspace.privateDraftScope,
    workspace.worldId,
    workspace.timeline,
    workspace.runtimeGeneration,
  ]);
}

export function labMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'This lab operation could not finish.';
}
