import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assetTemplateWire } from './assets/template.js';

/** CloudFormation's inline handler is generated from one reviewed source and
 * the same shared deadline owner used by the application. AWS's runtime SDK
 * remains external exactly as in the current deployed handler contract.
 */
export async function studyAccessCode(): Promise<string> {
  const result = await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    entryPoints: ['infrastructure/assets/study-access.cts'],
    bundle: true,
    write: false,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    minify: true,
    // Only reserved implementation fields in the shared lifetime kernel may be
    // shortened. SDK, event, error and public operation properties stay exact.
    mangleProps: /^__/,
    legalComments: 'none',
    external: ['@aws-sdk/client-secrets-manager'],
  });
  const output = result.outputFiles?.[0];
  if (!output) throw new Error('Study access handler compilation produced no output.');
  return output.text;
}

export async function generateStudyAccess(check: boolean): Promise<void> {
  const path = resolve(import.meta.dirname, '../infrastructure/assets/template.json');
  const template = JSON.parse(await readFile(path, 'utf8')) as {
    Resources: { StudyAccess: { Properties: { Code: { ZipFile: string } } } };
  };
  const generated = await studyAccessCode();
  if (check) {
    if (template.Resources.StudyAccess.Properties.Code.ZipFile !== generated)
      throw new Error(
        'Study access handler is stale. Run pnpm network:generate and review the generated template.',
      );
  } else {
    template.Resources.StudyAccess.Properties.Code.ZipFile = generated;
  }
  // The protected plan still sends one inline document; no bootstrap bucket or
  // extra artifact upload is introduced. YAML round-trips to the approved value.
  if (Buffer.byteLength(assetTemplateWire(template)) > 51200)
    throw new Error('The generated study handler exceeds the existing inline template allowance.');
  if (!check) await writeFile(path, JSON.stringify(template, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await generateStudyAccess(process.argv.includes('--check'));
