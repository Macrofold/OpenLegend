import type { WorldAgentPreparation, WorldAgentValidation } from '@open-legend/protocol';

/** Render only recorded native findings. Labels do not infer a new validity class. */
export function WorldAgentPreparationDetails({
  preparation,
  preparationRevision,
  validation,
}: {
  preparation?: WorldAgentPreparation;
  preparationRevision?: number;
  validation?: WorldAgentValidation;
}) {
  if (!preparation && !validation)
    return <p className="ol-caption">This revision has no retained native check yet.</p>;
  const label = (ref: { kind: string; id: string; version: string }) =>
    preparation?.graph.nodes.find(
      (node) =>
        node.ref.kind === ref.kind && node.ref.id === ref.id && node.ref.version === ref.version,
    )?.label ?? ref.id;
  return (
    <>
      {validation && (
        <>
          <p>{validation.semantics}</p>
          <p>{validation.message}</p>
          {!!validation.structuralErrors.length && (
            <ul>
              {validation.structuralErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
          <p className="ol-caption">
            Native coverage: {validation.coverage}. Broader interactions and balance are not
            established by these checks.
          </p>
        </>
      )}
      {preparation && (
        <>
          {preparationRevision !== undefined && (
            <>
              <h4>Preparation retained with revision {preparationRevision}</h4>
              <p className="ol-caption">
                Saved findings describe this revision when it was prepared. Use Check saved revision
                in Work to inspect current conditions.
              </p>
            </>
          )}
          <p>{preparation.presentation.description}</p>
          <section aria-label="Source requirements">
            <h4>Requested meaning and source requirements</h4>
            <ul>
              {preparation.requirements.map((requirement) => (
                <li key={requirement.id}>
                  <q>{requirement.source.text}</q> — {requirement.finding} (
                  {requirement.status.replaceAll('-', ' ')})
                </li>
              ))}
            </ul>
          </section>
          {(['passed', 'failed', 'pending'] as const).map((status) => {
            const checks = preparation.checks.filter((check) => check.status === status);
            if (!checks.length) return null;
            const findings = (
              <ul>
                {checks.map((check) => (
                  <li key={check.id}>{check.finding}</li>
                ))}
              </ul>
            );
            if (status === 'passed')
              return (
                <details key={status}>
                  <summary>
                    {preparationRevision === undefined
                      ? 'Passed native checks for this preview'
                      : `Passed native checks retained with revision ${preparationRevision}`}
                  </summary>
                  {findings}
                </details>
              );
            const heading = status === 'failed' ? 'Failed requirements' : 'Checks still pending';
            return (
              <section key={status} aria-label={heading}>
                <h4>{heading}</h4>
                {findings}
              </section>
            );
          })}
          {!!preparation.graph.unresolved.length && (
            <section aria-label="Missing dependencies">
              <h4>Missing dependencies</h4>
              {preparation.graph.unresolved.map((finding, index) => (
                <p key={index}>
                  {finding.field}: {finding.message}
                </p>
              ))}
            </section>
          )}
          <p className="ol-caption">
            Untested broader interaction: these findings cover the supported native rules; other
            interactions have not been evaluated.
          </p>
          <details>
            <summary>Materials and dependencies</summary>
            <ul>
              {preparation.graph.edges.map((edge) => (
                <li key={edge.id}>
                  {label(edge.source)} → {edge.relation.replaceAll('_', ' ')} → {label(edge.target)}
                  {edge.role && ` (${edge.role})`}
                  {edge.quantity !== undefined && ` × ${edge.quantity}`}
                </li>
              ))}
            </ul>
            <p className="ol-caption">
              {preparation.graph.coverage.scope}: {preparation.graph.coverage.projection}. A
              proposed output is not an installed definition or a possessed item.
            </p>
          </details>
        </>
      )}
    </>
  );
}
