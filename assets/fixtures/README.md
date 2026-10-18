# Public asset fixture

`public-runtime.json` selects one 9,956-byte licensed font from the exact published runtime release. It is a subset of that release, not a separate asset revision. The font bytes remain outside Git at the registered public delivery URL; the adjacent family license remains in `apps/client/src/design-system/fonts/`.

Use this index with anonymous public materialization to verify a cold download and a warm offline read without AWS credentials or a PostgreSQL connection. Private files must be refused before checking the cache. The normal game and full study tools use their complete locks under `assets/locks/`.

The code-check workflow runs this bounded public check for pushes and pull requests, including forks:

```sh
pnpm assets verify --public --index assets/fixtures/public-runtime.json --all
```

The job receives no private storage credentials or asset publication role. Private publication and promotion require the operator's separately authenticated workflow.
