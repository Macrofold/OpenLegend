      nearbyConversations.set(id, entity.name);
  }
  for (const [id, name] of nearbyConversations)
    actions.push({
      id: `join:${id}`,
