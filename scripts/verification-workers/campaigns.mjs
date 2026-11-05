// Durable roster and funding owner; jobs use the existing physical-run executor.
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { clientOptions } from './aws.mjs';
import { mapBounded } from './parallel.mjs';
import { executionRequest, executionUrl } from './execution.mjs';
import {
  campaign,
  executionPlan,
  digest,
  secret,
  id,
  authenticate,
  defaults,
  estimate,
  integer,
} from './contracts.mjs';
export const jobRunId = (campaignId, ordinal) => digest([campaignId, ordinal]).slice(0, 32);
export function storageGrants(plan, config, workers, at = Date.now()) {
  return Object.fromEntries(
    workers.map((worker) => {
      const retention =
        Number(worker.workerId.slice(5)) <= (config.warmSlots ?? 2)
          ? defaults.retentionMs
          : 86400000;
      const until = at + plan.deadlineSeconds * 1000 + retention;
      const extension = Math.max(0, until - Math.max(at, worker.storageUntil ?? 0));
      return [
        worker.workerId,
        {
          until: Math.max(until, worker.storageUntil ?? 0),
          microUsd: Math.ceil((extension / defaults.retentionMs) * config.storageMicroUsd),
        },
      ];
    }),
  );
}
// Only bounded aggregate facts cross admission before the immutable manifest is uploaded.
export function campaignSummary(plan, preparationBytes = 0) {
  return {
    taskId: plan.taskId,
    cloudAllocationId: plan.cloudAllocationId,
    concurrency: plan.concurrency,
    jobCount: plan.jobs.length,
    deadlineSeconds: plan.deadlineSeconds,
    lifetime: plan.lifetime,
    jobSeconds: plan.jobs.reduce((sum, job) => sum + job.timeoutSeconds + 480, 0),
    outputBytes: plan.jobs.reduce((sum, job) => sum + executionPlan(plan, job).outputLimitBytes, 0),
    preparationBytes,
    paidMicroUsd: plan.jobs.reduce((sum, job) => sum + (job.paid?.limitMicroUsd ?? 0), 0),
  };
}
export function validateSummary(value) {
  id(value.taskId);
  id(value.cloudAllocationId);
  integer(value.concurrency, 'concurrency', 1, 128);
  integer(value.jobCount, 'job count', value.concurrency, 4096);
  integer(value.deadlineSeconds, 'campaign deadline', 180, 28800);
  integer(value.jobSeconds, 'job seconds', value.jobCount * 660, value.jobCount * 29280);
  integer(value.outputBytes, 'output bytes', value.jobCount * 1024, value.jobCount * 8 * 1024 ** 3);
  integer(value.paidMicroUsd, 'paid grants', 0, 100_000_000);
  integer(value.preparationBytes, 'captured bytes', 0, Number.MAX_SAFE_INTEGER);
  if (!['attached', 'durable'].includes(value.lifetime)) throw new Error('Invalid lifetime.');
  // DynamoDB does not preserve object insertion order; fingerprints use this fixed field order.
  return Object.fromEntries(
    [
      'taskId',
      'cloudAllocationId',
      'concurrency',
      'jobCount',
      'deadlineSeconds',
      'lifetime',
      'jobSeconds',
      'outputBytes',
      'preparationBytes',
      'paidMicroUsd',
    ].map((name) => [name, value[name]]),
  );
}
export function campaignEstimate(summary, config, workers, at) {
  const compute = Math.ceil(
    (Math.min(summary.concurrency * (summary.deadlineSeconds + 480), summary.jobSeconds) / 3600) *
      config.hourlyMicroUsd,
  );
  const operations =
    summary.concurrency * 100000 +
    Math.ceil(((summary.outputBytes + summary.preparationBytes) / 1024 ** 3) * 200000);
  const selected =
    workers ??
    Array.from({ length: summary.concurrency }, (_, index) => ({ workerId: `slot-${index + 1}` }));
  const grants = storageGrants(summary, config, selected, at);
  const storage = Object.values(grants).reduce((sum, grant) => sum + grant.microUsd, 0);
  return {
    computeMicroUsd: compute,
    operationsMicroUsd: operations,
    storageMicroUsd: storage,
    totalMicroUsd: compute + operations + storage + summary.paidMicroUsd,
  };
}
export function campaigns(api) {
  const {
    config,
    db,
    table,
    send,
    read,
    write,
    transact,
    put,
    lock,
    getObject,
    slots,
    operation,
    scheduleState,
  } = api;
  const lambda = new LambdaClient(clientOptions());
  const key = (campaignId) => `campaign:${id(campaignId)}`;
  const publicCampaign = (row) => {
    if (!row) return null;
    const { secretHash, dispatchSecret, executionControlToken, ...value } = row;
    return value;
  };
  async function wake(event) {
    await send(
      lambda,
      InvokeCommand,
      {
        FunctionName: config.functionName,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(event)),
      },
      5000,
    );
  }
  async function page(group, cursor, limit = 25, due) {
    const result = await send(db, QueryCommand, {
      TableName: table,
      IndexName: 'group-order',
      KeyConditionExpression: '#group = :group' + (due ? ' AND #order <= :due' : ''),
      ExpressionAttributeNames: { '#group': 'group', ...(due ? { '#order': 'order' } : {}) },
      ExpressionAttributeValues: {
        ':group': group,
        ...(due ? { ':due': `${String(due).padStart(16, '0')}:\uffff` } : {}),
      },
      Limit: limit,
      ExclusiveStartKey: cursor,
    });
    result.Items = (await mapBounded(result.Items ?? [], 8, (row) => read(row.pk))).filter(Boolean);
    return result;
  }
  async function roster(row, cursor = 0) {
    if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > row.jobCount)
      throw new Error('Invalid roster cursor.');
    const end = Math.min(row.jobCount, cursor + 25);
    const jobs = await mapBounded(
      Array.from({ length: end - cursor }, (_, index) => index + cursor),
      8,
      async (ordinal) => {
        const run = (await read(`run:${jobRunId(row.campaignId, ordinal)}`)) ?? {
          runId: jobRunId(row.campaignId, ordinal),
          ordinal,
          phase: 'staging',
        };
        // Cancellation closes the immutable pending roster; avoid rewriting every queued job.
        return row.cancelledAt && run.phase === 'staging' && !run.workerId
          ? { ...run, phase: 'finished', outcome: 'not-started', failure: 'campaign_cancelled' }
          : run;
      },
    );
    return { jobs, cursor: end < row.jobCount ? end : undefined };
  }
  function skipPending(row) {
    const skipped = row.jobCount - row.nextJob;
    row.completed += skipped;
    row.failed = (row.failed ?? 0) + skipped;
    row.nextJob = row.jobCount;
  }
  async function paidClosure(row) {
    if (!row.summary.paidMicroUsd)
      return {
        campaignId: row.campaignId,
        spentMicroUsd: 0,
        reservedMicroUsd: 0,
        uncertainMicroUsd: 0,
        uncertain: false,
      };
    try {
      const paid = await executionRequest(
        row.executionUrl,
        row.executionControlToken,
        `/campaigns/${row.campaignId}/close`,
        {},
      );
      // This response can release real funding, so accept only exact campaign amounts.
      if (paid.campaignId !== row.campaignId) throw new Error('Paid closure identity differs.');
      for (const field of ['spentMicroUsd', 'reservedMicroUsd', 'uncertainMicroUsd'])
        integer(paid[field], field, 0, Number.MAX_SAFE_INTEGER);
      if (
        !Number.isSafeInteger(paid.spentMicroUsd + paid.reservedMicroUsd + paid.uncertainMicroUsd)
      )
        throw new Error('Paid closure exceeds safe arithmetic.');
      return {
        campaignId: row.campaignId,
        spentMicroUsd: paid.spentMicroUsd,
        reservedMicroUsd: paid.reservedMicroUsd,
        uncertainMicroUsd: paid.uncertainMicroUsd,
        uncertain: paid.reservedMicroUsd + paid.uncertainMicroUsd > 0,
      };
    } catch (error) {
      console.error('Paid closure remains unconfirmed:', row.campaignId, error.name);
      return undefined;
    }
  }
  async function settle(row, explicit = false) {
    if (row.settlementMonitoringEndedAt && !explicit) return publicCampaign(row);
    const paid = await paidClosure(row);
    const runs = await mapBounded(Object.values(row.usage), 8, (item) => read(`run:${item.runId}`));
    const uses = Object.values(row.usage);
    let compute = 0,
      storage = 0;
    for (let index = 0; index < runs.length; index++) {
      const life = runs[index]?.lifecycle;
      const endedAt = Math.min(
        life?.reusedAt ?? Infinity,
        life?.stoppedAt ?? Infinity,
        life?.terminatedAt ?? Infinity,
      );
      if (!Number.isFinite(endedAt)) return publicCampaign(row);
      const grant = row.storageGrants[uses[index].workerId];
      storage += life?.terminatedAt
        ? Math.min(
            grant?.microUsd ?? 0,
            Math.ceil(
              (Math.max(0, life.terminatedAt - uses[index].startedAt) / defaults.retentionMs) *
                config.storageMicroUsd,
            ),
          )
        : (grant?.microUsd ?? 0);
      compute += Math.ceil(
        (Math.max(60000, endedAt - uses[index].startedAt) / 3600000) * config.hourlyMicroUsd,
      );
    }
    if (!paid) {
      // Hardware must be confirmed quiescent before financial monitoring can become passive.
      // Unknown money remains held; explicit reconciliation never reruns the experiment.
      if (!row.settlementMonitoringEndedAt && Date.now() >= row.deadline + defaults.cleanupMs) {
        row.settlementMonitoringEndedAt = Date.now();
        delete row.group;
        delete row.order;
        await write(row);
      }
      return publicCampaign(row);
    }
    const value = await lock(`allocation:${row.cloudAllocationId}`, async () => {
      const current = await read(row.pk);
      if (current.settled) return current;
      const estimatedUsage =
        compute + current.cost.operationsMicroUsd + storage + paid.spentMicroUsd;
      const held = paid.reservedMicroUsd + paid.uncertainMicroUsd;
      const monitoringEnded =
        Boolean(current.settlementMonitoringEndedAt) ||
        Date.now() >= current.deadline + defaults.cleanupMs;
      const indexed = held > 0 && !monitoringEnded;
      if (
        current.computeMicroUsd === compute &&
        current.retainedStorageMicroUsd === storage &&
        current.remainingReservedMicroUsd === held &&
        current.estimatedUsageMicroUsd === estimatedUsage &&
        current.settled === (held === 0) &&
        (current.group === 'settlements') === indexed &&
        ['campaignId', 'spentMicroUsd', 'reservedMicroUsd', 'uncertainMicroUsd', 'uncertain'].every(
          (field) => current.paid?.[field] === paid[field],
        )
      )
        return current;
      const reservedDelta = held - (current.remainingReservedMicroUsd ?? current.reservation);
      const usageDelta = estimatedUsage - (current.estimatedUsageMicroUsd ?? 0);
      current.computeMicroUsd = compute;
      current.retainedStorageMicroUsd = storage;
      current.paid = paid;
      current.remainingReservedMicroUsd = held;
      current.estimatedUsageMicroUsd = estimatedUsage;
      current.releasedMicroUsd = Math.max(0, current.reservation - estimatedUsage - held);
      current.settled = held === 0;
      if (!indexed) {
        if (!current.settled) current.settlementMonitoringEndedAt ??= Date.now();
        delete current.group;
        delete current.order;
      }
      const updates = [put(current)];
      if (reservedDelta || usageDelta) {
        const allocation = await read(`allocation:${row.cloudAllocationId}`);
        allocation.reserved += reservedDelta;
        allocation.charged += usageDelta;
        updates.unshift(put(allocation));
      }
      await transact(updates);
      return current;
    });
    return value?.busy ? value : publicCampaign(value);
  }
  async function advance(row) {
    if (['completed', 'cancelled'].includes(row.phase))
      return row.settled ? publicCampaign(row) : settle(row);
    const until = Date.now() + 15000;
    // Only the small active set is revisited; completed history is never scanned by the scheduler.
    if (row.deadline <= Date.now() || (row.lifetime === 'attached' && row.leaseUntil <= Date.now()))
      row.cancelledAt ??= Date.now();
    const active = [];
    const workers = await mapBounded(row.workerIds, 8, (workerId) => read(`worker:${workerId}`));
    const freeWorker = (run) => {
      const target =
        run.assignedWorkerId ??
        (run.ordinal < row.concurrency ? row.workerIds[run.ordinal] : undefined);
      return workers.find(
        (w) =>
          (!target || w.workerId === target) &&
          !w.runId &&
          ['available', 'empty'].includes(w.state),
      );
    };
    async function claimRun(run) {
      const worker = freeWorker(run);
      if (!worker) return;
      worker.runId = run.runId;
      const result = await operation({
        action: 'claim',
        runId: run.runId,
        workerId: worker.workerId,
        secret: row.dispatchSecret,
      });
      if (!result?.busy) {
        worker.runId = run.runId;
        worker.instanceId = result.machine.instanceId;
        worker.state = 'leased';
        worker.leaseUntil = Date.now() + defaults.leaseMs;
      }
    }
    const remember = (run) => {
      if (!run.workerId || !run.machine?.instanceId) return;
      const prior = row.usage[run.workerId];
      row.usage[run.workerId] = {
        workerId: run.workerId,
        startedAt: Math.min(prior?.startedAt ?? Infinity, run.claimedAt),
        runId: run.runId,
      };
    };
    const activeRuns = await mapBounded(row.active ?? [], 8, (runId) => read(`run:${runId}`));
    for (const run of activeRuns) {
      const runId = run.runId;
      if (run.phase === 'finished') {
        remember(run);
        if (run.capacityFailure || run.completion?.failureKind === 'integrity')
          row.cancelledAt ??= Date.now();
        row.completed = (row.completed ?? 0) + 1;
        if (run.outcome !== 'completed') row.failed = (row.failed ?? 0) + 1;
      } else {
        active.push(runId);
        if (run.phase === 'staging' && !row.cancelledAt) await claimRun(run);
      }
    }
    row.active = active;
    if (row.cancelledAt) {
      await paidClosure(row);
      // Bounded cancellation of actual active work; terminal jobs are never replayed.
      const batch = active.slice(row.cancelCursor ?? 0, (row.cancelCursor ?? 0) + 8);
      for (const runId of batch) {
        const result = await operation({ action: 'cancel', runId, secret: row.dispatchSecret });
        if (!result?.busy) row.cancelCursor = (row.cancelCursor ?? 0) + 1;
      }
      if ((row.cancelCursor ?? 0) >= active.length) row.cancelCursor = 0;
      if (!active.length) skipPending(row);
    }
    if (!row.cancelledAt) {
      let assignments = 0;
      while (
        row.nextJob < row.jobCount &&
        row.active.length < row.concurrency &&
        assignments < 8 &&
        Date.now() < until
      ) {
        const index = row.nextJob;
        const runId = jobRunId(row.campaignId, index);
        const run = await read(`run:${runId}`);
        if (run.phase !== 'staging') {
          // Recover an assignment whose acknowledgement was lost; no second job attempt.
          if (run.phase === 'finished') {
            remember(run);
            row.completed++;
            if (run.outcome !== 'completed') row.failed = (row.failed ?? 0) + 1;
          } else row.active.push(runId);
          row.nextJob++;
          continue;
        }
        if (Date.now() + run.plan.deadlineSeconds * 1000 > row.deadline) {
          run.phase = 'finished';
          run.outcome = 'not-started';
          run.failure = 'campaign_deadline';
          await write(run);
          row.nextJob++;
          row.completed++;
          row.failed = (row.failed ?? 0) + 1;
          continue;
        }
        const worker = freeWorker(run);
        if (!worker) break;
        run.deadline = Date.now() + run.plan.deadlineSeconds * 1000;
        run.assignedWorkerId = worker.workerId;
        await write(run);
        // Commit the dispatch queue before any cloud operation; assignment recovery reads this exact run.
        row.active.push(runId);
        row.nextJob++;
        assignments++;
        await write(row);
        await claimRun(run);
      }
    }
    if (
      !row.capacityReady &&
      row.nextJob >= row.concurrency &&
      workers.every((worker) => worker.instanceId && worker.state === 'leased')
    )
      row.capacityReady = true;
    await write(row);
    // Dispatch independently through the same controller; boot waits never occupy the allocator.
    await mapBounded(row.active, 8, async (runId) => {
      const run = await read(`run:${runId}`);
      if (
        row.capacityReady &&
        !row.cancelledAt &&
        ['starting', 'preparing', 'dispatching'].includes(run.phase)
      )
        await wake({ action: 'dispatch', runId, secret: row.dispatchSecret });
      const worker = workers.find((worker) => worker.workerId === run.workerId);
      if (
        run.workerId &&
        !row.cancelledAt &&
        worker?.state !== 'quarantined' &&
        (worker?.leaseUntil ?? 0) <= Date.now() + defaults.leaseMs - defaults.heartbeatMs
      )
        await operation({ action: 'heartbeat', runId, secret: row.dispatchSecret }).catch((error) =>
          console.error('Job lease cannot renew:', runId, error.message),
        );
    });
    if (row.nextJob === row.jobCount) {
      const pool = (await read('pool')) ?? { owners: {} };
      const released = await mapBounded(row.workerIds, 8, (workerId) =>
        lock(`worker:${workerId}`, async () => {
          if (pool.owners[workerId] !== row.campaignId) return workerId;
          const worker = await read(`worker:${workerId}`);
          if (worker.runId) return null;
          delete worker.campaignId;
          if (Number(workerId.slice(5)) > (config.warmSlots ?? 2) && worker.instanceId) {
            worker.storageUntil = 0;
            worker.state = 'retiring';
          }
          await write(worker);
          return workerId;
        }),
      );
      const result = await lock('pool', async () => {
        const pool = (await read('pool')) ?? { pk: 'pool', owners: {} };
        for (const workerId of released.filter((value) => typeof value === 'string'))
          if (pool.owners[workerId] === row.campaignId) delete pool.owners[workerId];
        await write(pool);
        return {};
      });
      if (
        !result?.busy &&
        !row.active.length &&
        released.every((value) => typeof value === 'string')
      ) {
        const closed = await lock('pool', async () => {
          const pool = await read('pool');
          pool.admittedCampaigns--;
          row.phase = row.cancelledAt ? 'cancelled' : 'completed';
          row.finishedAt = Date.now();
          row.group = 'settlements';
          row.order = `${row.finishedAt}:${row.campaignId}`;
          await transact([put(pool), put(row)]);
          return row;
        });
        if (!closed?.busy) return settle(closed);
      }
    }
    return {
      ...publicCampaign(row),
      needsWake:
        (!row.cancelledAt && row.active.length < row.concurrency && row.nextJob < row.jobCount) ||
        Boolean(row.cancelCursor),
    };
  }
  async function act(event, context) {
    const campaignId = id(event.campaignId);
    if (event.action === 'campaign-admit') {
      if (
        !/^[a-f0-9]{64}$/.test(event.secret ?? '') ||
        !/^[a-f0-9]{64}$/.test(event.dispatchSecret ?? '') ||
        event.secret === event.dispatchSecret
      )
        throw new Error('Campaign admission needs distinct operator and job capabilities.');
      const plan = validateSummary(event.summary);
      if (!/^[a-f0-9]{64}$/.test(event.manifestHash ?? ''))
        throw new Error('Captured manifest fingerprint required.');
      const executor = plan.paidMicroUsd ? executionUrl(event.executionUrl).origin : undefined;
      if (plan.paidMicroUsd && !/^[a-f0-9]{64}$/.test(event.executionControlToken ?? ''))
        throw new Error('Scoped execution closure capability required.');
      if (executor && !executor.startsWith('https://'))
        throw new Error('Remote paid jobs require HTTPS.');
      if (plan.concurrency > (config.capacity ?? 2))
        throw new Error('Requested concurrency exceeds configured capacity; no jobs started.');
      if (typeof event.worktree !== 'string' || !event.worktree || event.worktree.length > 4096)
        throw new Error('Originating checkout required.');
      const old = await read(key(campaignId));
      if (old) {
        authenticate(old, event.secret);
        if (
          old.manifestHash !== event.manifestHash ||
          old.worktree !== event.worktree ||
          old.dispatchSecret !== event.dispatchSecret ||
          digest(validateSummary(old.summary)) !== digest(plan) ||
          old.executionUrl !== executor ||
          old.executionControlToken !== (executor ? event.executionControlToken : undefined)
        )
          throw new Error('Campaign identity already admitted differently.');
        return publicCampaign(old);
      }
      return lock('pool', () =>
        lock(`allocation:${plan.cloudAllocationId}`, async () => {
          const pool = (await read('pool')) ?? { pk: 'pool', owners: {}, admittedCampaigns: 0 };
          if (pool.admissionClosed)
            throw new Error('Pool deployment/maintenance has closed new admission.');
          pool.admittedCampaigns = (pool.admittedCampaigns ?? 0) + 1;
          const selected = (await slots()).filter(
            (w) =>
              !w.runId &&
              !w.campaignId &&
              !pool.owners[w.workerId] &&
              ['available', 'empty'].includes(w.state),
          );
          selected.sort((a, b) => Number(Boolean(b.instanceId)) - Number(Boolean(a.instanceId)));
          if (selected.length < plan.concurrency)
            throw new Error(
              'The complete requested capacity is unavailable; no campaign admitted.',
            );
          const workers = selected.slice(0, plan.concurrency),
            at = Date.now();
          const cost = campaignEstimate(plan, config, workers, at);
          const reservation = cost.totalMicroUsd;
          const allocation = await read(`allocation:${plan.cloudAllocationId}`);
          if (
            !allocation ||
            allocation.taskId !== plan.taskId ||
            allocation.charged + allocation.reserved + reservation > allocation.limit
          )
            throw new Error('Task cloud allocation cannot fund the complete campaign.');
          allocation.reserved += reservation;
          const row = {
            pk: key(campaignId),
            campaignId,
            taskId: plan.taskId,
            cloudAllocationId: plan.cloudAllocationId,
            secretHash: digest(event.secret),
            dispatchSecret: event.dispatchSecret,
            worktree: event.worktree,
            manifestHash: event.manifestHash,
            reservation,
            phase: 'uploading',
            summary: plan,
            executionUrl: executor,
            executionControlToken: executor ? event.executionControlToken : undefined,
            taskLimitMicroUsd: allocation.limit,
            cost,
            usage: {},
            staged: 0,
            jobCount: plan.jobCount,
            concurrency: plan.concurrency,
            lifetime: plan.lifetime,
            deadline: at + plan.deadlineSeconds * 1000,
            leaseUntil: Date.now() + defaults.leaseMs,
            createdAt: Date.now(),
            nextJob: 0,
            completed: 0,
            active: [],
            workerIds: workers.map((w) => w.workerId),
            storageGrants: storageGrants(plan, config, workers, at),
            recoveryRemainingMicroUsd: plan.concurrency * 100000,
            group: 'queue',
            order: `${Date.now()}:${campaignId}`,
          };
          for (const workerId of row.workerIds) pool.owners[workerId] = campaignId;
          await transact([put(allocation), put(pool), put(row, 'attribute_not_exists(pk)')]);
          return publicCampaign(row);
        }),
      );
    }
    const row = await read(key(campaignId));
    if (!row) {
      if (event.action === 'campaign-status') return { campaign: null, jobs: [] };
      throw new Error('Unknown campaign.');
    }
    if (!['campaign-advance', 'campaign-stage'].includes(event.action))
      authenticate(row, event.secret);
    if (event.action === 'campaign-status') {
      const jobs = await roster(row, event.cursor ?? 0);
      return {
        campaign: publicCampaign(row),
        jobs: jobs.jobs.map(({ secretHash, workerSecretHash, ...run }) => run),
        cursor: jobs.cursor,
      };
    }
    if (
      ['completed', 'cancelled'].includes(row.phase) &&
      [
        'campaign-heartbeat',
        'campaign-cancel',
        'campaign-stage',
        'campaign-advance',
        'campaign-reconcile',
      ].includes(event.action)
    )
      return ['campaign-advance', 'campaign-reconcile'].includes(event.action) && !row.settled
        ? settle(row, event.action === 'campaign-reconcile')
        : publicCampaign(row);
    if (event.action === 'campaign-heartbeat') {
      if (row.cancelledAt || (row.lifetime === 'attached' && row.leaseUntil <= Date.now())) {
        row.cancelledAt ??= Date.now();
        if (['uploading', 'staging'].includes(row.phase)) {
          skipPending(row);
          row.active = [];
          row.phase = 'running';
        }
        await write(row);
        return advance(row);
      }
      row.leaseUntil = Math.min(row.deadline, Date.now() + defaults.leaseMs);
      await write(row);
      return publicCampaign(row);
    }
    if (event.action === 'campaign-cancel') {
      row.cancelledAt ??= Date.now();
      if (['uploading', 'staging'].includes(row.phase)) {
        skipPending(row);
        row.active = [];
        row.phase = 'running';
      }
      await write(row);
    }
    if (
      event.action === 'campaign-stage' &&
      (row.deadline <= Date.now() || (row.lifetime === 'attached' && row.leaseUntil <= Date.now()))
    ) {
      row.cancelledAt ??= Date.now();
      skipPending(row);
      row.phase = 'running';
      await write(row);
      return advance(row);
    }
    if (event.action === 'campaign-stage') {
      if (!['uploading', 'staging'].includes(row.phase)) return publicCampaign(row);
      let manifest;
      try {
        manifest = await getObject(`campaigns/${campaignId}/manifest.json`, 16 * 1024 ** 2);
      } catch (error) {
        if (error.name === 'NoSuchKey') return publicCampaign(row);
        throw error;
      }
      if (digest(manifest) !== row.manifestHash) throw new Error('Immutable campaign changed.');
      const plan = campaign(manifest.plan);
      if (
        digest(campaignSummary(plan, manifest.preparationBytes)) !==
        digest(validateSummary(row.summary))
      )
        throw new Error('Published campaign differs from its admitted summary.');
      for (const job of plan.jobs)
        for (const item of job.cases) {
          if (!/^[a-f0-9]{64}$/.test(item.sourceHash ?? ''))
            throw new Error('Missing captured source hash.');
          for (const mount of item.inputs ?? []) {
            const bundle = manifest.inputs?.[mount.bundle];
            if (
              !bundle ||
              !/^[a-f0-9]{64}$/.test(bundle.archiveSha256 ?? '') ||
              bundle.key !== `inputs/${bundle.archiveSha256}` ||
              !/^[a-f0-9]{64}$/.test(bundle.sha256 ?? '') ||
              !Number.isSafeInteger(bundle.archiveBytes) ||
              bundle.archiveBytes < 1 ||
              bundle.archiveBytes > 513 * 1024 ** 2
            )
              throw new Error('Missing admitted input descriptor.');
          }
        }
      row.phase = 'staging';
      const end = Math.min(row.staged + 20, plan.jobs.length),
        items = [];
      for (let index = row.staged; index < end; index++) {
        const job = plan.jobs[index],
          runId = jobRunId(campaignId, index),
          spec = executionPlan(plan, job);
        const inputKeys = {};
        for (const item of spec.cases)
          for (const mount of item.inputs ?? []) {
            const bundle = manifest.inputs[mount.bundle];
            if (!bundle || !/^inputs\/[a-f0-9]{64}$/.test(bundle.key))
              throw new Error('Missing admitted input descriptor.');
            inputKeys[mount.bundle] = bundle;
          }
        const run = {
          pk: `run:${runId}`,
          runId,
          campaignId,
          jobId: job.id,
          ordinal: index,
          group: `jobs:${campaignId}`,
          order: String(index).padStart(6, '0'),
          plan: spec,
          planHash: digest(spec),
          secretHash: digest(row.dispatchSecret),
          phase: 'staging',
          worktree: row.worktree,
          inputs: inputKeys,
          estimateMicroUsd: estimate(spec, config) - config.storageMicroUsd,
          admittedAt: Date.now(),
        };
        items.push(put(run, 'attribute_not_exists(pk)'));
      }
      row.staged = end;
      await transact([...items, put(row)]);
      if (end < row.jobCount) return { ...publicCampaign(row), needsWake: true };
      row.phase = 'running';
      await write(row);
    }
    if (['campaign-advance', 'campaign-stage', 'campaign-cancel'].includes(event.action)) {
      return advance(row);
    }
    throw new Error('Unknown campaign operation.');
  }
  return async (event, context) => {
    if (event.action === 'campaign-tick') {
      if (!event.section || event.section === 'queue') {
        const queue = await page('queue', event.cursor, 8);
        for (const row of queue.Items.filter((row) => row.group === 'queue'))
          await wake({
            action: ['uploading', 'staging'].includes(row.phase)
              ? 'campaign-stage'
              : 'campaign-advance',
            campaignId: row.campaignId,
          });
        if (queue.LastEvaluatedKey)
          await wake({ action: 'campaign-tick', section: 'queue', cursor: queue.LastEvaluatedKey });
      }
      if (!event.section || event.section === 'settlements') {
        const rows = await page('settlements', event.cursor, 8);
        for (const row of rows.Items)
          await wake({ action: 'campaign-advance', campaignId: row.campaignId });
        if (rows.LastEvaluatedKey)
          await wake({
            action: 'campaign-tick',
            section: 'settlements',
            cursor: rows.LastEvaluatedKey,
          });
      }
      if (!event.section || event.section === 'images') {
        const builds = await page('images', event.cursor, 8);
        for (const row of builds.Items)
          await wake({ action: 'image-maintain', buildId: row.buildId });
        if (builds.LastEvaluatedKey)
          await wake({
            action: 'campaign-tick',
            section: 'images',
            cursor: builds.LastEvaluatedKey,
          });
      }
      if (!event.section || event.section === 'workers') {
        const workers = await page('workers', event.cursor, 25, Date.now());
        for (const worker of workers.Items)
          await wake({ action: 'maintain', workerId: worker.workerId });
        if (workers.LastEvaluatedKey)
          await wake({
            action: 'campaign-tick',
            section: 'workers',
            cursor: workers.LastEvaluatedKey,
          });
      }
      if (!event.section && Date.now() > Number(config.expiresAt)) {
        const groups = await Promise.all(
          ['queue', 'settlements', 'images', 'workers'].map((group) => page(group, undefined, 1)),
        );
        if (groups.every((result) => result.Count === 0)) await scheduleState('DISABLED');
      }
      return { scheduled: true };
    }
    if (event.action === 'campaign-notify') {
      await write({ pk: `wake:${id(event.campaignId)}`, token: secret() });
      await wake({ action: 'campaign-advance', campaignId: id(event.campaignId) });
      return {};
    }
    if (event.action === 'campaign-status') return act(event, context);
    const initial = await read(`wake:${id(event.campaignId)}`);
    const value = await lock(`campaign:${id(event.campaignId)}`, () => act(event, context));
    const changed =
      !value?.busy && (await read(`wake:${event.campaignId}`))?.token !== initial?.token;
    if (
      value?.needsWake ||
      changed ||
      (!value?.busy &&
        ['campaign-heartbeat', 'campaign-admit'].includes(event.action) &&
        !['completed', 'cancelled'].includes(value.phase))
    )
      await wake({
        action: ['uploading', 'staging'].includes(value.phase)
          ? 'campaign-stage'
          : 'campaign-advance',
        campaignId: event.campaignId,
      });
    return value;
  };
}
