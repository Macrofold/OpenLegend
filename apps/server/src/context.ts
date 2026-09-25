      nearbyConversations.set(id, entity.name);
  }
  for (const [id, name] of [...nearbyConversations].slice(0, 4))
    actions.push({
      id: `join:${id}`,
