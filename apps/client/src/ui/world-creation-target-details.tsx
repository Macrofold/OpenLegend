import type { WorldCreationTargetView } from '@open-legend/protocol';
import './world-creation.css';

/** Read only the destination's safe, human-readable projection. */
export function WorldCreationTargetDetails({ target }: { target: WorldCreationTargetView }) {
  if (!target.operatingSettings && !target.controlCapabilities) return null;
  return (
    <details className="ol-world-creation-target-details" open>
      <summary>Host settings and account permissions</summary>
      {target.controlCapabilities && (
        <>
          <h5>Permissions for the assigned account</h5>
          {target.controlCapabilities.length ? (
            <ul>
              {target.controlCapabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          ) : (
            <p>No account permissions were reported.</p>
          )}
        </>
      )}
      {target.operatingSettings && (
        <>
          <h5>Operating settings</h5>
          <dl>
            {target.operatingSettings.map((setting) => (
              <div key={setting.label}>
                <dt>{setting.label}</dt>
                <dd>
                  {typeof setting.value === 'boolean'
                    ? setting.value
                      ? 'Yes'
                      : 'No'
                    : setting.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </details>
  );
}
