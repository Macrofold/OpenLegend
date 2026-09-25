  height: number;
  eyeHeight: number;
  bodyRadius: number;
  radius: number;
  alive: boolean;
    height: body.height,
    eyeHeight: body.eyeHeight,
    bodyRadius: body.radius,
    radius: entity.actor ? visionRadius(world, entity) : 0,
    alive: !!entity.actor?.alive,
