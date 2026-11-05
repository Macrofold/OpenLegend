// One bounded HTTP owner for scoped execution controls; never a model transport or receipt ledger.
import { createNetworkOwner, requestText } from '@open-legend/network';
import {
  executionUrl,
  executionCapability,
  SHARED_EXECUTION_CONTROL_BYTES,
} from '../../packages/ai/src/shared-execution.ts';
const owner = createNetworkOwner({ role: 'verification-execution-control', capacity: 8 });
export async function executionRequest(url, token, path, body, timeoutMs = 15000) {
  executionUrl(url);
  return owner.run({ timeoutMs }, async (operation) => {
    const result = await requestText(operation, {
      url: new URL(path, url).href,
      init: {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      bodyPolicy: { kind: 'bounded', maxBytes: SHARED_EXECUTION_CONTROL_BYTES },
      diagnostics: 'omit',
    });
    if (result.status !== 200)
      throw new Error(`Shared execution control returned ${result.status}.`);
    return JSON.parse(result.text);
  });
}

export { executionUrl, executionCapability };
