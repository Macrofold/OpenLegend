import type { WorldAgentReply } from '@open-legend/protocol';
import { contextHash, type WorldAgentTurn, type WorldAuthoringService } from './world-authoring.js';

export interface WorldAgentMessage {
  sessionId: string;
  requestId: string;
  conversationId: string;
  worldId: string;
  text: string;
}
type Execute = (message: WorldAgentMessage, turn: WorldAgentTurn) => Promise<WorldAgentReply>;

/** Short HTTP admission, durable results, and bounded in-process execution. The session store
 * owns recovery; this runner never replays a paid turn after a restart or lost response.
 * docs/world-agent-runtime.md#durable-turn-delivery
 */
export class WorldAgentRunner {
  private running = new Map<
    string,
    { sessionId: string; controller: AbortController; work: Promise<void> }
  >();
  private admissions = new Set<Promise<WorldAgentReply>>();
  private draining = false;
  constructor(
    private authoring: WorldAuthoringService,
    private execute: Execute,
    private onPersistenceFailure: () => void,
  ) {}
  submit(message: WorldAgentMessage): Promise<WorldAgentReply> {
    if (this.draining || this.running.size + this.admissions.size >= 4)
      return Promise.resolve({
        ok: false,
        code: 'busy',
        message:
          'Authoring is busy. No new turn was admitted; check existing progress before resubmitting.',
      });
    const admission = this.admit(message);
    this.admissions.add(admission);
    void admission.then(
      () => this.admissions.delete(admission),
      () => this.admissions.delete(admission),
    );
    return admission;
  }
  private async admit(message: WorldAgentMessage): Promise<WorldAgentReply> {
    const started = await this.authoring.beginTurn(
      message.sessionId,
      message.requestId,
      message.text,
    );
    if (started.response) return started.response;
    const controller = new AbortController();
    if (this.draining) controller.abort();
    const key = `${message.sessionId}:${message.requestId}`;
    // Schedule after registering the controller so cancellation can address exactly this turn.
    const work = Promise.resolve()
      .then(() => this.run(message, { ...started.turn!, signal: controller.signal }))
      .catch(() => this.onPersistenceFailure())
      .finally(() => this.running.delete(key));
    this.running.set(key, { sessionId: message.sessionId, controller, work });
    return {
      ok: true,
      code: 'running',
      message: 'Turn accepted. Progress and the final reply are retained with this request.',
      jobId: message.requestId,
    };
  }
  private async run(message: WorldAgentMessage, turn: WorldAgentTurn) {
    let reply: WorldAgentReply;
    let dispatched = false;
    try {
      const current = await this.authoring.requireSession(message.sessionId);
      if (
        turn.signal?.aborted ||
        current.activeTurn !== message.requestId ||
        current.contextHash !== contextHash(turn.contextHandle)
      ) {
        reply = {
          ok: false,
          code: 'cancelled',
          message: 'Turn stopped before execution.',
          jobId: message.requestId,
        };
      } else {
        dispatched = true;
        reply = await this.execute(message, turn);
      }
    } catch {
      reply = {
        ok: false,
        code: dispatched ? 'uncertain' : 'cancelled',
        message: dispatched
          ? 'Completion could not be confirmed. Saved drafts and receipts remain available; this turn was not redispatched.'
          : 'The session was revoked or became unavailable before execution.',
        jobId: message.requestId,
      };
    }
    await this.authoring.finishTurn(message.sessionId, message.requestId, reply);
  }
  async cancel(sessionId: string, requestId: string) {
    const cancelled = await this.authoring.cancelTurn(sessionId, requestId);
    if (cancelled) this.running.get(`${sessionId}:${requestId}`)?.controller.abort();
    return {
      ok: true,
      code: cancelled ? 'cancelling' : 'completed',
      message: cancelled
        ? 'Cancellation requested. Committed changes and incurred costs are retained.'
        : 'No running turn was changed.',
    };
  }
  cancelSession(sessionId: string) {
    for (const run of this.running.values())
      if (run.sessionId === sessionId) run.controller.abort();
  }
  async drain() {
    this.draining = true;
    await Promise.allSettled([...this.admissions]);
    for (const run of this.running.values()) run.controller.abort();
    await Promise.allSettled([...this.running.values()].map((run) => run.work));
  }
  resume() {
    this.draining = false;
  }
}
