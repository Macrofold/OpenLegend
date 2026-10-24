import { expect, it } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { creationOperatingConfiguration, creationOperatingSettings } from './creation-host.js';
import { digest } from './content-digest.js';

const workspace = '11111111-1111-4111-8111-111111111111';
const deployment = '22222222-2222-4222-8222-222222222222';
const revision = '33333333-3333-4333-8333-333333333333';
const target = { model_binding: { deployment_id: deployment } };

it('includes effective deployment settings in exact world-host review and configuration fencing', () => {
  const config = (purposes: unknown, workspaceId = workspace) =>
    readConfig({
      MACROFOLD_API_KEY: 'fixture-only-secret',
      OPENLEGEND_MODEL_TARGETS_JSON: JSON.stringify({
        schema_version: 1,
        workspace_id: workspaceId,
        purposes,
      }),
    });
  const original = creationOperatingConfiguration(
    config({ judgment: target, npc_response_fast: target }),
  );
  const fingerprint = digest(original);
  for (const changed of [
    config({ judgment: target, npc_response_fast: target }, revision),
    config({
      judgment: { model_binding: { deployment_id: deployment, deployment_revision_id: revision } },
      npc_response_fast: target,
    }),
    config({ judgment: { ...target, max_output_tokens: 512 }, npc_response_fast: target }),
    config({
      judgment: target,
      npc_response_fast: { ...target, structured_output: 'prompted_json' },
    }),
    config({ judgment: target, npc_response_fast: target, npc_response_complex: target }),
  ])
    expect(digest(creationOperatingConfiguration(changed))).not.toBe(fingerprint);
  expect(original.macrofoldJevModel).toBe(`deployment:${deployment}`);
  expect(creationOperatingSettings(original)).toContainEqual({
    label: 'Deployment for character decisions',
    value: expect.stringContaining(deployment),
  });
  expect(JSON.stringify(original)).not.toContain('fixture-only-secret');
});

it('retains existing provider selections when deployment configuration is absent', () => {
  const config = readConfig({ MACROFOLD_API_KEY: 'fixture-only-secret' });
  expect(creationOperatingConfiguration(config)).toMatchObject({
    macrofoldJevModel: config.macrofoldJevModel,
    macrofoldJudgmentDeployment: 'Use existing provider settings',
    macrofoldFastDeployment: 'Use existing provider settings',
    macrofoldComplexDeployment: 'Use existing provider settings',
  });
});
