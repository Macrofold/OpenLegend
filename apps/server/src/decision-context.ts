  context: Record<string, unknown>,
  candidates: CandidateAction[],
  reservedBytes = 0,
): CandidateAction[] {
  let remaining =
    100000 -
    reservedBytes -
    Buffer.byteLength(readableDecisionContext(context, [], true)) -
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  const planning = planningCandidates(service, actorId);
  const availableActions = distinctActions([...npcCandidates(service, actorId), ...planning]);
  let planOffers = [...planning]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((candidate, index) => ({
      ...candidate,
      : []),
  ]);
  const candidates = candidateSet(
    world,
        : [],
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    planOffers: [],
    references: responseReferences(
      world,
    requiredContext['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  let requiredBytes =
    Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (requiredBytes + actionReserveBytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  // Plan vocabulary is optional: retain every option that fits, not an ID-count prefix.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  const planningAvailable = planOffers.length;
  planOffers = fitActionCandidates(requiredContext, planOffers, actionReserveBytes);
  requiredContext['planOffers'] = planOffers.map(({ id, description }) => ({ id, description }));
  requiredBytes =
    Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  const planActions = Object.fromEntries(
    planOffers
      .map((candidate) => [candidate.id, domainCommand(candidate.command!, actorId, jobId)])
      .concat(intentActions.map((candidate) => [candidate.id, candidate.command])),
  );
  const selection = await recall
    .select(
      triggerFacts: context['triggerFacts'],
      acceptedRevision: currentWorld.innerWorlds?.[actorId]?.revision,
      planningOptions: {
        available: planningAvailable,
        included: planOffers.length,
        omittedForInputSize: planningAvailable - planOffers.length,
      },
      inputBytes: bytes,
      estimatedInputTokens: Math.ceil(bytes / 3),
