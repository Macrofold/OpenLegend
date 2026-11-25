import { deepStrictEqual } from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [manifestPath, receiptPath, indexPath, ...unexpected] = process.argv.slice(2);
if (!manifestPath || !receiptPath || !indexPath || unexpected.length) {
  console.error('Usage: node pin_content.mjs MANIFEST PUBLICATION_RECEIPT NEW_INDEX');
  process.exitCode = 1;
} else {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    const manifestText = JSON.stringify(manifest);
    const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');
    if (
      typeof receipt.operationId !== 'string' ||
      !receipt.operationId ||
      receipt.reference?.manifestSha256 !== manifestSha256 ||
      receipt.manifestArtifact?.sha256 !== manifestSha256 ||
      receipt.manifestArtifact?.bytes !== Buffer.byteLength(manifestText)
    ) {
      throw new Error('The publication receipt must match the exact manifest.');
    }
    const { manifestSha256: committedHash, ...committedIdentity } = receipt.reference;
    deepStrictEqual(
      committedIdentity,
      manifest.identity,
      'The published revision identity differs from the draft.',
    );
    const index = {
      release: { ...committedIdentity, manifestSha256: committedHash },
      files: manifest.files,
    };
    await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
    console.log(indexPath);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
