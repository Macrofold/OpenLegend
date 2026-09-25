    entityIds: Object.values(entityReferences),
    entityEpisodes: Object.fromEntries(
      [
        ...new Set([
          ...Object.values(entityReferences),
          ...currentObserved.visibleEntities.map((entity) => entity.id),
        ]),
      ].flatMap((id) => {
        const episode = currentWorld.perceptionEpisodes?.[actorId]?.[id];
        return episode ? [[id, episode]] : [];
