    at: world.simTime,
    sequence: world.nextId,
    // Preserve who/what a memory concerns; prompt selection owns request size.
    // docs/memory-architecture.md#personal-perspective-and-acquisition
    entityIds: [...memory.entityIds],
    importance: Math.max(0, Math.min(10, memory.importance)),
  };
