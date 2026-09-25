    at: world.simTime,
    sequence: world.nextId,
    entityIds: memory.entityIds.slice(0, 8),
    importance: Math.max(0, Math.min(10, memory.importance)),
  };
