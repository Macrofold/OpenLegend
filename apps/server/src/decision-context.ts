    entityIds: Object.values(entityReferences),
    entityEpisodes: Object.fromEntries(
      Object.values(entityReferences).flatMap((id) => {
        const episode = currentWorld.perceptionEpisodes?.[actorId]?.[id];
        return episode ? [[id, episode]] : [];
