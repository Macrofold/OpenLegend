# Comprehensive profiling results

This collection indexes permanently preserved hierarchical server/world campaigns. Raw profiles, logs, result JSON and source/input packages stay outside Git; each small committed manifest pins exact private S3 object versions, byte lengths and SHA-256 checksums. Smaller diagnostics retain their existing evidence owners.

| Campaign                   | Human findings                                                     | Archive descriptor                                             |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| November 7–8, 2026 opening | [Subsystem analysis](../hierarchical-server-opening-2026-11-07.md) | [Manifest](2026-11-07-hierarchical-opening-3812/manifest.json) |

The opening archive contains **1,646 inventoried payload files / 2,008,413,333 logical bytes** in a **1,052,618,241-byte** compressed bundle, including all failed attempts, 22 owned managed-campaign metadata/package closures and four exact source snapshots. It preserves 27 completed timed observations and five accepted safety configurations; performance/coverage qualification remains incomplete as explained in the human report. The inventory lists every member and its checksum. Quick-access objects separately provide the HTML, compressed measurement JSON and analysis.

## Storage and retention

The private bucket is `openlegend-profiling-archive-027677879749-us-east-2`, in project `027677879749`, Region `us-east-2`. It is separate from expiring managed-worker storage, with public access blocked, bucket-owner-enforced ownership, AES256 encryption and HTTPS required. Versioning and Object Lock are enabled; every recorded object version has an indefinite legal hold, and there is no lifecycle expiration configuration. Lifecycle cannot delete a held version; always retrieve the pinned version even if a delete marker or newer version appears. [AWS Object Lock semantics](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html) explain that distinction.

Keep these archives outside disposable tagging and automatic deletion. Only explicit project-owner instruction authorizes removing an archive or releasing its holds. Original worker copies retain their separate operational lifecycle; the verified permanent copies do not depend on them.

The local root is `/Users/mzw/.codex/verification/OpenLegend/comprehensive-profiling-results/2026-11-07-hierarchical-opening-3812/`, with the moved original under `campaign/`. One old-path filesystem alias preserves existing viewers, collection links and historical paths without rewriting sealed evidence. Archive members use relative paths, so retrieval does not require that alias or a particular Git branch. Credentials, private capabilities, unrelated campaigns, node_modules, worker caches and EC2 disks are excluded.

## Retrieve from any branch

No game build or branch checkout is required. Use an authorized OpenLegend AWS profile; the commands below use Mike's supported local CLI. Another machine can use a current AWS CLI with equivalent project access. These links require authentication and are not public or expiring signed URLs.

Remote archive manifest: [exact S3 version](https://s3.console.aws.amazon.com/s3/object/openlegend-profiling-archive-027677879749-us-east-2?region=us-east-2&prefix=2026-11-07-hierarchical-opening-3812%2Fobjects%2F3f9539b933aa147caf91406ca99dcd0155af48e629114b5893c2d7f940d00c21%2Fmanifest.json&versionId=kwoZJJ0frqI8TAiaX1evWw4Fwacu7WH.). Its SHA-256 is `3f9539b933aa147caf91406ca99dcd0155af48e629114b5893c2d7f940d00c21` and size is **12518 bytes**. Recording this receipt here avoids a self-referential manifest checksum. Git also retains the same file; `git show <archive-commit>:docs/verification/performance/comprehensive-profiling-results/2026-11-07-hierarchical-opening-3812/manifest.json` reads it from another branch without switching checkouts.

```sh
"$HOME/.local/bin/aws" s3api get-object \
  --profile openlegend --region us-east-2 \
  --bucket openlegend-profiling-archive-027677879749-us-east-2 \
  --key 2026-11-07-hierarchical-opening-3812/objects/3f9539b933aa147caf91406ca99dcd0155af48e629114b5893c2d7f940d00c21/manifest.json \
  --version-id kwoZJJ0frqI8TAiaX1evWw4Fwacu7WH. \
  --checksum-mode ENABLED archive-manifest.json

shasum -a 256 -c <<'SHA256'
3f9539b933aa147caf91406ca99dcd0155af48e629114b5893c2d7f940d00c21  archive-manifest.json
SHA256

"$HOME/.local/bin/aws" s3api get-object \
  --profile openlegend --region us-east-2 \
  --bucket openlegend-profiling-archive-027677879749-us-east-2 \
  --key 2026-11-07-hierarchical-opening-3812/objects/888ac0230658138f9deaa389e0428bee874deea436c0e678b8914c581750972a/complete-results.tar.gz \
  --version-id k3.pOd1tGa9kSEN9hcyaocBEn4gR7umb \
  --checksum-mode ENABLED complete-results.tar.gz

shasum -a 256 -c <<'SHA256'
888ac0230658138f9deaa389e0428bee874deea436c0e678b8914c581750972a  complete-results.tar.gz
SHA256

mkdir restored-profile-2026-11-07
tar -xzf complete-results.tar.gz -C restored-profile-2026-11-07
```

The original measured viewer is at `restored-profile-2026-11-07/campaign/run-9/summary/report.html`; the readable analysis is `reports/analysis.md`. Use `inventory.json` for exact file-level checksums. On publication, all five payload objects were downloaded by exact version, the archive's 1,646 inventoried payload files were checked against the independently downloaded inventory, and the compressed measurement JSON was verified against the original uncompressed bytes. The archive manifest was also downloaded and checked separately.

Storage for the current payload is estimated at about **$0.025/month**, plus requests/download transfer, at the retrieved Ohio first-tier Standard rate of **$0.023/GB-month** ([pricing](https://aws.amazon.com/s3/pricing/)); this is an estimate, not an invoice. Permanent storage continues until the owner explicitly ends preservation. No profiling workers or model calls are needed to retain or access it.
