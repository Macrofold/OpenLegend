import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const fixtureKey = 'controlled-macrofold-fixture';
const requestBytes = 500_000;

type NoulQuestion = { type: 'noul'; instructions?: string };
type Question = NoulQuestion | { type: 'choice'; criteria: Record<string, unknown> };
type JudgeRequest = {
  requestId: string;
  state: unknown;
  questions: Record<string, Question>;
};
type Judgment = {
  choices?: Record<string, string>;
  noul?: (id: string, question: NoulQuestion) => number;
};
type ResponseRequest = {
  requestId: string;
  schema: { required: string[] };
  context: string;
};
type Config = {
  macrofoldKey?: string;
  macrofoldUrl?: string;
  judge?: (request: JudgeRequest) => Judgment | undefined;
};
type InferenceBody = {
  workspace_id?: string;
  model_binding?: { model: string; billing_mode: string };
  input?: {
    state?: unknown;
    questions?: Record<string, Question>;
    messages?: { role: string; content: string }[];
    response_format?: {
      type: string;
      json_schema?: {
        name: string;
        strict: boolean;
        schema: ResponseRequest['schema'];
      };
    };
  };
};

function answerQuestions(request: JudgeRequest, policy?: Judgment) {
  const direct = request.requestId.startsWith('human:');
  return {
    answers: Object.fromEntries(
      Object.entries(request.questions).map(([id, question]) => {
        if (question.type === 'noul') {
          const noul = policy?.noul?.(id, question) ?? (direct ? 0.9 : 0.1);
          return [id, { type: 'noul', noul, confidence: 1 }];
        }
        assert.equal(question.type, 'choice');
        const choices = Object.keys(question.criteria);
        const preferred =
          id === 'route' ? (direct ? 'level2' : 'native') : id === 'reflection' ? 'no' : undefined;
        const choice =
          policy?.choices?.[id] ??
          (preferred && choices.includes(preferred) ? preferred : choices[0]);
        assert(
          choice && choices.includes(choice),
          'Scripted judgment must select a supplied choice',
        );
        return [
          id,
          {
            type: 'choice',
            probabilities: Object.fromEntries(choices.map((key) => [key, key === choice ? 1 : 0])),
            confidence: 1,
          },
        ];
      }),
    ),
  };
}

/** Exercise the native server's production request and receipt handling with only a loopback HTTPS provider. */
export async function startTypedProvider({
  caseName,
  config,
  responses,
}: {
  caseName: string;
  config: Config;
  responses: {
    npc_response: (request: ResponseRequest) => object | Promise<object>;
  };
}) {
  const directory = await mkdtemp(join(tmpdir(), 'ol-native-macrofold-'));
  const exchanges: {
    kind: 'judge' | 'generate';
    requestId: string;
    bytes: number;
    model: string;
    questions?: number;
  }[] = [];
  const problems: string[] = [];
  let server: ReturnType<typeof createServer> | undefined;
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      try {
        const ownedServer = server;
        if (ownedServer?.listening) {
          await new Promise<void>((resolve, reject) => {
            ownedServer.close((error) => (error ? reject(error) : resolve()));
            ownedServer.closeAllConnections();
          });
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    })());

  try {
    const keyPath = join(directory, 'key.pem');
    const leafPath = join(directory, 'leaf.pem');
    const certPath = join(directory, 'ca.pem');
    const rootKey = join(directory, 'ca.key');
    const requestPath = join(directory, 'leaf.csr');
    const extensions = join(directory, 'leaf.cnf');
    await writeFile(
      extensions,
      [
        'basicConstraints=critical,CA:FALSE',
        'keyUsage=critical,digitalSignature,keyEncipherment',
        'extendedKeyUsage=serverAuth',
        'subjectAltName=IP:127.0.0.1',
      ].join('\n'),
    );
    await runFile(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-subj',
        '/CN=Local controlled provider CA',
        '-addext',
        'basicConstraints=critical,CA:TRUE',
        '-addext',
        'keyUsage=critical,keyCertSign,cRLSign',
        '-keyout',
        rootKey,
        '-out',
        certPath,
      ],
      { timeout: 10_000 },
    );
    await runFile(
      'openssl',
      [
        'req',
        '-new',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-subj',
        '/CN=127.0.0.1',
        '-keyout',
        keyPath,
        '-out',
        requestPath,
      ],
      { timeout: 10_000 },
    );
    await runFile(
      'openssl',
      [
        'x509',
        '-req',
        '-CA',
        certPath,
        '-CAkey',
        rootKey,
        '-set_serial',
        '2',
        '-in',
        requestPath,
        '-out',
        leafPath,
        '-days',
        '1',
        '-extfile',
        extensions,
      ],
      { timeout: 10_000 },
    );
    const [key, cert] = await Promise.all([readFile(keyPath), readFile(leafPath)]);
    server = createServer({ key, cert }, async (request, reply) => {
      try {
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/v1/inferences');
        assert.equal(request.headers.authorization, 'Bearer ' + fixtureKey);
        const requestId = request.headers['idempotency-key'];
        assert(
          typeof requestId === 'string' && requestId.length > 0,
          'Missing decision request identity',
        );

        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          assert(bytes <= requestBytes, 'Fixture inference request exceeded byte limit');
          chunks.push(chunk);
        }
        const body: InferenceBody = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
        const { model_binding: model, input } = body;
        assert(model && !body.workspace_id && input, 'Expected a native model request');

        const kind = input.questions ? 'judge' : 'generate';
        let value;
        if (input.questions) {
          const judgment = {
            requestId,
            state: input.state,
            questions: input.questions,
          };
          value = answerQuestions(judgment, config.judge?.(judgment));
        } else {
          const format = input.response_format;
          assert(
            format?.type === 'json_schema' && format.json_schema?.strict,
            'Expected a strict JSON reply',
          );
          assert.equal(format.json_schema.name, 'npc_response');
          const context = input.messages?.find((message) => message.role === 'user')?.content;
          assert(typeof context === 'string', 'Expected the NPC decision prompt');
          const result = await responses.npc_response({
            requestId,
            schema: format.json_schema.schema,
            context,
          });
          value = {
            choices: [
              {
                finish_reason: 'stop',
                message: { content: JSON.stringify(result) },
              },
            ],
          };
        }

        const runId = 'loopback-macrofold-' + (exchanges.length + 1);
        exchanges.push({
          kind,
          requestId,
          bytes,
          model: model.model,
          questions: input.questions ? Object.keys(input.questions).length : undefined,
        });
        reply.writeHead(200, { 'Content-Type': 'application/json' }).end(
          JSON.stringify({
            run_id: runId,
            kind: 'inference',
            status: 'succeeded',
            result: {
              run_id: runId,
              final: true,
              execution_outcome: 'success',
              inference: {
                outcome: 'value',
                provider_outcome: 'responded',
                billing: {
                  billing_mode: model.billing_mode,
                  charged_micro_usd: '0',
                  budget_cost_micro_usd: '0',
                  reported_micro_usd: '0',
                  provisional: false,
                },
                usage: {
                  completeness: 'complete',
                  input_tokens: '0',
                  output_tokens: '0',
                  cached_input_tokens: '0',
                  cache_write_input_tokens: '0',
                },
                value,
              },
            },
          }),
        );
      } catch (error) {
        problems.push(String(error));
        if (!reply.headersSent && !reply.destroyed) {
          reply
            .writeHead(500, { 'Content-Type': 'application/json' })
            .end('{"error":{"code":"fixture_handler_failed"}}');
        }
      }
    });
    const listening = once(server, 'listening');
    server.listen(0, '127.0.0.1');
    await listening;
    server.on('error', (error) => problems.push(String(error)));
    const address = server.address();
    assert(address && typeof address !== 'string');
    config.macrofoldKey = fixtureKey;
    config.macrofoldUrl = 'https://127.0.0.1:' + address.port;
    return {
      certPath,
      close,
      summary: () => ({
        caseName,
        exchanges: exchanges.slice(),
        problems: problems.slice(),
      }),
    };
  } catch (error) {
    await close();
    throw error;
  }
}
