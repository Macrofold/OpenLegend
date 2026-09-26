# Enable live AI locally

Open Legend selects Macrofold when `MACROFOLD_API_KEY` is configured; otherwise it uses direct Jev/OpenAI adapters. Native play requires neither. Conversation uses compact level-2 inference with Jev escalation. Independent workspace reflection requires Macrofold and PostgreSQL; direct keys support immediate decisions and cleanup. See [memory architecture](memory-architecture.md).

## Macrofold, embeddings and PostgreSQL

Use the settings in `.env.example`: `MACROFOLD_BASE_URL`, backend key, model/harness, billing mode, optional provider/Jev connection IDs, model-run cap, owner-selected `MACROFOLD_WORKER_ID` for native execution and per-agent monthly `AI_BUDGET_USD`. One key authenticates inference and runs; there is no project selector or separate inference key. BYOK defaults to the configured OpenRouter connection for both Contributor and Jev; connection IDs select server-stored credentials, never raw keys in prompts.

Native execution requires a nonzero monthly agent allowance and an authorized existing Worker. OpenLegend does not provision or renew shared compute; its owner manages Worker limits and credit separately from the agent's Run budget. Direct inference needs no Worker. Follow [Worker setup and coordinated cutover](ai-providers.md#shared-worker-setup-and-cutover), including `workers:use` permission and preservation of uncertain operation identities. September 20 live BYOK inference, embeddings and workspace publication are historical evidence for the previous caller, not Worker deployment qualification. See [pending Worker acceptance](maintainers/macrofold-worker-api.md#mw04--remaining-deployment-and-qualification-gates).

Restart after configuration changes and inspect the selected backend. A configured label is not live acceptance. Current model/effort requests and unverified compatibility are described in [AI providers](ai-providers.md). Set `OPEN_LEGEND_DATABASE_URL=postgresql://mzw@127.0.0.1:5432/openlegend` for this local database (adapt username/database elsewhere). An OpenAI embedding key is required even with Macrofold: `OPENAI_EMBEDDING_API_KEY` falls back to `OPENAI_API_KEY`. Install pgvector for your PostgreSQL major version and enable `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public` in the game database (the server also performs this additive setup when its role has permission). Local PostgreSQL 14 now has pgvector 0.8.6 installed. Semantic recall requires PostgreSQL with this extension; SQLite retains structured recall only. Defaults are `text-embedding-3-small`, 512 dimensions; explicit embedding reservations count against the same actor cap. Existing-save imports use `scripts/import-postgres.ts` with the stopped source and an exclusive backup; never point two writers at one save.

The following direct-provider steps apply when the Macrofold key is absent and do not supply file-reflection harness execution.

## 1. Get a Jev key

Sign in at [TypeSafe’s API keys dashboard](https://console.typesafe.ai/keys) and create a key for Open Legend. The [official quickstart](https://docs.typesafe.ai/introduction/quickstart) links this dashboard. TypeSafe’s [home page](https://typesafe.ai/) currently offers a waitlist; if your account cannot access the console, complete that access process first. A key for an unrelated AI gateway cannot be substituted into the current direct TypeSafe adapter.

## 2. Get an OpenAI API key

Sign in at the [OpenAI API keys page](https://platform.openai.com/settings/organization/api-keys), select the project you want to use, and create a secret key for Open Legend. Ensure API billing is enabled for that account/project. The server uses the Responses API, so a restricted key needs permission to create responses. See the official [key setup guide](https://developers.openai.com/api/docs/quickstart#create-and-export-an-api-key) and [billing/key guidance](https://developers.openai.com/api/docs/guides/production-best-practices#setting-up-your-organization).

Copy keys directly into the local file below. Do not put them in a game message, a screenshot, a shared issue or a commit.

## 3. Edit the local environment file

Open `.env` at the root of this repository in a text editor. An existing installation already has this file; preserve its other settings. For a fresh clone only, copy `.env.example` to `.env` first.

Set these three values, replacing the placeholder keys:

```dotenv
TYPESAFE_API_KEY=your_typesafe_key
OPENAI_API_KEY=your_openai_key
AI_BUDGET_USD=1
```

Here, `1` is a $1 ceiling per agent per UTC calendar month. The default ceiling is $50; effective limit is $0–$50; larger legacy limits are clamped to $50. Zero disables paid dispatch. Reservations and uncertain calls consume the admitting agent's allowance, which persists through restarts and cannot be rewound by world restore. See [the accounting contract](architecture.md#monthly-agent-spending).

Keep the existing `JEV_MODEL`, `OPENAI_MODEL`, and price settings for the initial test. The checked-in defaults are `jev-1.13.0` and `gpt-5.6-luna`. A different model needs matching explicit price settings; see [AI providers](ai-providers.md).

## 4. Restart the server

Environment changes take effect at server startup. If you started the server in a terminal, press **Control+C in that terminal**, then run this from the repository root:

```sh
pnpm run dev
```

For the built client, use `pnpm run build` followed by `pnpm start` instead. Do not run both servers on the same port. If Codex is running the current server, ask it to **restart Open Legend** after saving `.env`; it can restart the existing process without resetting the world. Do not delete `.data` to resolve configuration or port errors.

## 5. Refresh and inspect configuration

Refresh [the local game](http://127.0.0.1:3211/), then open the AI status button at the upper right. Jev and Language model should both say **Configured**, and the agent allowance should show available funds. A configured label means the server received a nonempty key; it does not prove authentication, model access or successful inference yet.

## 6. Make a first live request

With immediate inference configured and spending explicitly authorized, resume the world, move near Ada, select Talk, and send a short greeting. Observe the request status and actual response, then review the AI panel’s recent work and execution counts. While the world is running, autonomous NPC thinking can also use the actor’s allowance. Pause when you finish the test.

If a request fails, inspect its recorded reason before sending again. Missing or rejected credentials, inaccessible models, insufficient provider funds, insufficient agent allowance, timeouts and invalid output are separate problems. The application does not silently retry paid requests. Live quality remains a separate acceptance check; follow [verification](verification.md) for the full playtest.

Provider setup links were checked September 19, 2026. The September 20 capped synthetic checks are recorded in maintainer TODO; they do not replace the full live playtest.
