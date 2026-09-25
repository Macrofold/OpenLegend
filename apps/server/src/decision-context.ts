  context: Record<string, unknown>,
  candidates: CandidateAction[],
): CandidateAction[] {
  let remaining =
    100000 -
    Buffer.byteLength(readableDecisionContext(context, [], true)) -
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  const planning = planningCandidates(service, actorId);
  const availableActions = distinctActions([...npcCandidates(service, actorId), ...planning]);
  const planOffers = [...planning]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 16)
    .map((candidate, index) => ({
      ...candidate,
      : []),
  ]);
  const planActions = Object.fromEntries(
    planOffers
      .map((candidate) => [candidate.id, domainCommand(candidate.command!, actorId, jobId)])
      .concat(intentActions.map((candidate) => [candidate.id, candidate.command])),
  );
  const candidates = candidateSet(
    world,
        : [],
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    planOffers: planOffers.map(({ id, description }) => ({ id, description })),
    references: responseReferences(
      world,
    requiredContext['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  const requiredBytes =
    Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (requiredBytes + actionReserveBytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  const selection = await recall
    .select(
      triggerFacts: context['triggerFacts'],
      acceptedRevision: currentWorld.innerWorlds?.[actorId]?.revision,
      inputBytes: bytes,
      estimatedInputTokens: Math.ceil(bytes / 3),
