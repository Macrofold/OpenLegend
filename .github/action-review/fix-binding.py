from pathlib import Path
p=Path('apps/server/src/ai-director.ts')
s=p.read_text()
old="    let nativeReply: import('@open-legend/domain').ActorResponse = { operations: reply.operations };"
new="""    // Ground against the same decoded references used by native admission.
    // docs/action-capabilities.md#references-targets-quantities-and-evidence
    const nativeReply = resolveResponseEntities(
      { operations: reply.operations },
      prepared.entityReferences,
      prepared.binding.knowledgeReferences,
    );"""
assert old in s
s=s.replace(old,new)
later="""    nativeReply = resolveResponseEntities(
      nativeReply,
      prepared.entityReferences,
      prepared.binding.knowledgeReferences,
    );"""
assert later in s
s=s.replace(later,'')
p.write_text(s)
