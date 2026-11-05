import { fromIni } from '@aws-sdk/credential-providers';
import { createNetworkOwner } from '@open-legend/network';
import { waitSdkValue } from '@open-legend/network/node';
import { defaults } from './contracts.mjs';
const owner = createNetworkOwner({ role: 'verification-cloud', capacity: 8 });
export const clientOptions = () => ({
  region: defaults.region,
  maxAttempts: 1,
  ...(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.OPENLEGEND_WORKER_SLOT
    ? {}
    : { credentials: fromIni({ profile: 'openlegend' }) }),
});
// SDK service failures retain their types; the shared owner still bounds transport lifetime.
export function send(client, Command, input, timeoutMs = 20_000) {
  return owner.run({ timeoutMs }, (operation) =>
    waitSdkValue(operation, 'connect', (signal) =>
      client.send(new Command(input), { abortSignal: signal }),
    ),
  );
}
