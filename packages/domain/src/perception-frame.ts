  height: number;
  eyeHeight: number;
  radius: number;
  alive: boolean;
    height: body.height,
    eyeHeight: body.eyeHeight,
    radius: entity.actor ? visionRadius(world, entity) : 0,
    alive: !!entity.actor?.alive,
