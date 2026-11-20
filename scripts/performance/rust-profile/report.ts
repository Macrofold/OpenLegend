import { mkdir, realpath, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { digest, isMissing, object } from './contract.js';
import { readPlan } from './plan.js';
import { managedReader, readCase } from './report-evidence.js';
import type { CaseResult } from './report-evidence.js';
import { compare, finite, readFixedWork, statistics, value } from './report-qualification.js';
import type { FixedWork } from './report-qualification.js';

function csv(rows: (string | number | null | undefined)[][]) {
  return (
    rows
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n') + '\n'
  );
}
const escape = (value: unknown) =>
  String(value ?? 'unavailable').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

async function publish(directory: string, name: string, contents: string) {
  const staging = join(directory, `.${randomUUID()}.tmp`);
  await writeFile(staging, contents, { flag: 'wx', mode: 0o600 });
  await rename(staging, join(directory, name));
}

/** Rebuilds the private report using only current local claim and artifact receipts. */
export async function summarizeCampaign(campaignPath: string, collectedPath?: string) {
  const campaign = await realpath(resolve(campaignPath));
  const collection = resolve(collectedPath ?? join(campaign, 'ownership', 'collected'));
  const plan = await readPlan(join(campaign, 'plan.json'));
  const runs: CaseResult[] = [];
  for (const comparison of plan.comparisons) {
    const members = plan.cases.filter((item) => item.comparisonId === comparison.id);
    let reader;
    try {
      reader = await managedReader(join(collection, comparison.id), plan, comparison.id);
    } catch (error) {
      if (!isMissing(error)) {
        for (const member of members)
          runs.push({ plan: member, status: 'failed', reason: String(error) });
        continue;
      }
    }
    for (const member of members) runs.push(await readCase(campaign, collection, member, reader));
  }
  const comparisons = await Promise.all(
    plan.comparisons.map(async (item) => {
      let proof: FixedWork | undefined, proofError: string | undefined;
      try {
        proof = await readFixedWork(campaign, item.id);
      } catch (error) {
        proofError = isMissing(error) ? 'No fixed-work safety proof was collected.' : String(error);
      }
      return compare(
        item,
        runs.filter((run) => run.plan.comparisonId === item.id),
        proof,
        proofError,
      );
    }),
  );
  const coverage = runs.flatMap((run) =>
    plan.registry.map((probe) => {
      const metric = run.metrics?.metrics.find((item) => item.id === probe.id);
      const selected = run.plan.probeIds.includes(probe.id);
      const status = !selected
        ? run.plan.mode === 'disabled'
          ? 'disabled'
          : 'not-selected'
        : (metric?.status ?? (run.status === 'unsupported' ? 'unsupported' : 'failed'));
      const qualified =
        comparisons.find((item) => item.id === run.plan.comparisonId)?.status === 'qualified';
      return {
        caseId: run.plan.id,
        id: probe.id,
        parent: probe.parent,
        unit: probe.unit,
        status,
        overhead: selected && !qualified ? 'unqualified-overhead' : null,
        reason: run.reason ?? null,
        metric,
      };
    }),
  );
  const cases = runs.map((run) => {
    const wallMs = value(run, 'wallMs');
    const core = (name: string) => {
      const time = value(run, name);
      return wallMs && time !== null ? (time * 100) / wallMs : null;
    };
    const completed = value(run, 'completedGameSeconds'),
      offered = value(run, 'offeredGameSeconds');
    const server = value(run, 'serverCpuMs'),
      postgres = value(run, 'postgresCpuMs');
    return {
      ...run,
      serverCorePercent: core('serverCpuMs'),
      postgresCorePercent: core('postgresCpuMs'),
      clientCorePercent: core('clientCpuMs'),
      driverCorePercent: core('driverCpuMs'),
      launcherCorePercent: core('launcherCpuMs'),
      samplerCorePercent: core('samplerCpuMs'),
      achievedGameSpeedPercent: offered && completed !== null ? (100 * completed) / offered : null,
      ownedCpuMsPerGameSecond:
        completed && server !== null && postgres !== null ? (server + postgres) / completed : null,
    };
  });
  const byArm = plan.comparisons.map((item) => ({
    comparison: item.id,
    arms: [item.baseline, item.measured].map((mode) => {
      const selected = cases.filter(
        (run) =>
          run.plan.comparisonId === item.id && run.plan.mode === mode && run.status === 'completed',
      );
      return {
        mode,
        n: selected.length,
        statistics: {
          serverCorePercent: statistics(selected.flatMap((run) => run.serverCorePercent ?? [])),
          postgresCorePercent: statistics(selected.flatMap((run) => run.postgresCorePercent ?? [])),
          achievedGameSpeedPercent: statistics(
            selected.flatMap((run) => run.achievedGameSpeedPercent ?? []),
          ),
          ownedCpuMsPerGameSecond: statistics(
            selected.flatMap((run) => run.ownedCpuMsPerGameSecond ?? []),
          ),
        },
      };
    }),
  }));
  const output = join(campaign, 'summary');
  await mkdir(output, { recursive: true, mode: 0o700 });
  if ((await realpath(output)) !== output) throw new Error('Report output traverses a symlink.');
  const report = {
    schema: 1,
    id: plan.id,
    gameSource: plan.gameSource,
    toolSource: plan.toolSource,
    planSha256: digest(plan),
    comparisons,
    cases,
    byArm,
    coverage,
  };
  await publish(output, 'report.json', JSON.stringify(report, null, 2) + '\n');
  await publish(
    output,
    'coverage.csv',
    csv([
      ['case', 'id', 'parent', 'unit', 'status', 'overhead', 'reason'],
      ...coverage.map((m) => [m.caseId, m.id, m.parent, m.unit, m.status, m.overhead, m.reason]),
    ]),
  );
  await publish(
    output,
    'hierarchy.csv',
    csv([
      [
        'case',
        'id',
        'unit',
        'eligible',
        'sampled',
        'completed',
        'censored',
        'work',
        'active elapsed ns',
        'self elapsed ns',
        'latency median ns upper',
        'latency p95 ns upper',
      ],
      ...coverage.flatMap(({ caseId, id, unit, metric }) =>
        metric
          ? [
              [
                caseId,
                id,
                unit,
                metric.eligible,
                metric.sampled,
                metric.completed,
                metric.censored,
                metric.work,
                metric.windowActiveNs,
                metric.windowSelfNs,
                metric.latency.median?.upperNs,
                metric.latency.p95?.upperNs,
              ],
            ]
          : [],
      ),
    ]),
  );
  await publish(
    output,
    'comparisons.csv',
    csv([
      [
        'comparison',
        'status',
        'repetition',
        'baseline',
        'measured',
        'server CPU per game-second increase fraction',
        'owned CPU per game-second increase fraction',
        'command p95 increase ms',
        'reasons',
      ],
      ...comparisons.flatMap((comparison) =>
        comparison.pairs.map((row) => [
          comparison.id,
          comparison.status,
          row.repetition,
          row.baseline,
          row.measured,
          row.server,
          row.owned,
          row.commandIncreaseMs,
          comparison.reasons.join(' '),
        ]),
      ),
    ]),
  );
  const rounded = (value: number | null) => (value === null ? 'unavailable' : value.toFixed(3));
  const summary = (value: ReturnType<typeof statistics>) =>
    value
      ? `${rounded(value.median)} / ${rounded(value.mean)} / ${rounded(value.p95)} (n=${value.n})`
      : 'unavailable';
  function latencyCell(run: CaseResult, key: string) {
    const latency = object(run.workload?.latency ?? {})[key];
    if (typeof latency === 'number') return rounded(latency);
    if (latency === null || latency === undefined) return 'unavailable';
    const row = object(latency);
    return `${rounded(finite(row.medianMs))} / ${rounded(finite(row.meanMs))} / ${rounded(finite(row.p95Ms))} (n=${escape(row.count)}, omitted=${escape(row.omitted)})`;
  }
  function diagnosticSection(run: CaseResult) {
    if (!run.diagnostic) return '';
    const { data, file } = run.diagnostic;
    const title = `<h3>${escape(run.plan.id)} · ${escape(data.status)}</h3>`;
    if (file === 'sql.json') return title + `<pre>${escape(JSON.stringify(data, null, 2))}</pre>`;
    return (
      title +
      `<p>${escape(data.limitations)}</p><pre>${escape(JSON.stringify(data.coverage, null, 2))}</pre>` +
      ['leaf', 'inclusive']
        .map((kind) => {
          const entries = Array.isArray(data[kind]) ? data[kind].slice(0, 15) : [];
          return `<h4>${kind === 'leaf' ? 'Exclusive instruction' : 'Inclusive caller'} samples</h4><ol>${entries
            .map((item) => {
              const site = object(item);
              return `<li>${escape(site.site)} — ${escape(site.samples)} samples</li>`;
            })
            .join('')}</ol>`;
        })
        .join('')
    );
  }
  function resourceRow(run: (typeof cases)[number]) {
    const memory = object(run.resources?.memory ?? {});
    const database = object(run.resources?.database ?? {});
    const mib = (bytes: unknown) => {
      const count = finite(bytes);
      return count === null ? 'unavailable' : rounded(count / 1024 ** 2);
    };
    const row = [
      run.plan.id,
      run.workload?.offeredGameSeconds,
      run.workload?.completedGameSeconds,
      run.workload?.ownerDebt,
      rounded(run.clientCorePercent),
      rounded(run.driverCorePercent),
      rounded(run.launcherCorePercent),
      rounded(run.samplerCorePercent),
      mib(memory.concurrentServerPostgresPeakBytes),
      mib(memory.concurrentAllPeakBytes),
      database.walBytes,
      database.growthBytes,
    ];
    return `<tr>${row.map((cell) => '<td>' + escape(cell) + '</td>').join('')}</tr>`;
  }
  function clockSection(run: CaseResult) {
    if (!run.metrics) return '';
    const { trace, lost, traceLost } = run.metrics;
    const join = trace.clockTurn;
    const confidence =
      lost || traceLost
        ? 'Collection lost observations. The remaining records are diagnostic.'
        : join && join.acceptedGameMicroseconds === null
          ? 'The clock steps join, but this capture does not record how much game time this turn accepted.'
          : '';
    return `<h3>${escape(run.plan.id)}</h3><p>${escape(confidence)}</p>
<pre>${escape(JSON.stringify(join ?? 'No complete steady clock turn joined.', null, 2))}</pre>
<details><summary>Longest captured turn waits and visible holders</summary><pre>${escape(JSON.stringify(trace.longestTurnWaits, null, 2))}</pre></details>`;
  }
  await publish(
    output,
    'report.html',
    `<!doctype html>
<meta charset="utf-8"><title>Rust game-server profile</title>
<style>body{font:16px system-ui;max-width:90rem;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse}td,th{padding:.5rem;border:1px solid #aaa;text-align:left}code{overflow-wrap:anywhere}</style>
<h1>${escape(plan.id)}</h1>
<p>Game <code>${escape(plan.gameSource)}</code> · Tools <code>${escape(plan.toolSource)}</code></p>
<p><a href="report.json">Full evidence</a> · <a href="hierarchy.csv">Hierarchy</a> · <a href="coverage.csv">Coverage</a> · <a href="comparisons.csv">Comparison pairs</a></p>
<h2>Steady play</h2>
<table><thead><tr><th>Case</th><th>Outcome</th><th>Server % of one core</th><th>PostgreSQL %</th><th>Game speed %</th><th>Owned CPU ms/game-s</th></tr></thead><tbody>
${cases.map((run) => `<tr><td>${escape(run.plan.id)}</td><td>${escape(run.status)}${run.reason ? ': ' + escape(run.reason) : ''}</td><td>${rounded(run.serverCorePercent)}</td><td>${rounded(run.postgresCorePercent)}</td><td>${rounded(run.achievedGameSpeedPercent)}</td><td>${rounded(run.ownedCpuMsPerGameSecond)}</td></tr>`).join('\n')}
</tbody></table>
<h2>Per-arm median / average / p95</h2>
<table><thead><tr><th>Comparison / arm</th><th>Server % of one core</th><th>PostgreSQL %</th><th>Game speed %</th><th>Owned CPU ms/game-s</th></tr></thead><tbody>
${byArm.flatMap((item) => item.arms.map((arm) => `<tr><td>${escape(item.comparison)} / ${escape(arm.mode)}</td><td>${summary(arm.statistics.serverCorePercent)}</td><td>${summary(arm.statistics.postgresCorePercent)}</td><td>${summary(arm.statistics.achievedGameSpeedPercent)}</td><td>${summary(arm.statistics.ownedCpuMsPerGameSecond)}</td></tr>`)).join('\n')}
</tbody></table>
<h2>Player-facing latency in ms</h2>
<p>Median / average / p95 for actual steady commands. Stream receipt, browser display, and durable observation are separate.</p>
<table><thead><tr><th>Case</th><th>Reply</th><th>Stream receipt</th><th>Browser display</th><th>Durable observation</th><th>Cold reopen</th></tr></thead><tbody>
${cases.map((run) => `<tr><td>${escape(run.plan.id)}</td>${['commandReply', 'firstStreamReceipt', 'firstBrowserDisplay', 'firstDurableObservation', 'coldOpen'].map((key) => `<td>${latencyCell(run, key)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table>
<h2>Game time, other processes and storage</h2>
<p>CPU is a percentage of one logical core. The client, driver, launcher and any separate sampler are outside server and PostgreSQL CPU.</p>
<table><thead><tr><th>Case</th><th>Offered game-s</th><th>Completed game-s</th><th>Owner debt</th><th>Client CPU</th><th>Driver CPU</th><th>Launcher CPU</th><th>Sampler CPU</th><th>Server + PostgreSQL MiB peak</th><th>All observed MiB peak</th><th>WAL bytes</th><th>Database growth bytes</th></tr></thead><tbody>
${cases.map(resourceRow).join('\n')}
</tbody></table>
<h2>Qualification</h2><ul>${comparisons.map((item) => `<li>${escape(item.id)} — ${escape(item.status)}. ${escape(item.reasons.join(' '))}</li>`).join('')}</ul>
<h2>Additional measurement passes</h2>${cases.map(diagnosticSection).join('') || '<p>No separate CPU or SQL diagnostic was collected.</p>'}
<h2>Clock-turn witness</h2>${cases.map(clockSection).join('')}
<p>Worker time, queue latency, and sampled CPU have different meanings. Overlapping scopes cannot be added. Unavailable observations remain distinct from measured zero.</p>
`,
  );
  return {
    report: join(output, 'report.html'),
    cases: cases.length,
    status: comparisons.map(({ id, status }) => ({ id, status })),
  };
}
