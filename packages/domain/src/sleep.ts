import type { ActorComponent } from './types.js';
export const REST_RULES = {
  daySeconds: 86400,
  requiredSeconds: 28800,
  sleepOnsetSeconds: 900,
  dreamSeconds: 7200,
  maxDebtSeconds: 86400,
} as const;
export interface RestState {
  day: number;
  restedSeconds: number;
  debtSeconds: number;
  episode: string | null;
  restingSeconds: number;
  sleepingSeconds: number;
  asleep: boolean;
}
export function accountRest(actor: ActorComponent, at: number, seconds: number): void {
  const rest = (actor.rest ??= {
    day: Math.floor(at / 86400),
    restedSeconds: 0,
    debtSeconds: 0,
    episode: null,
    restingSeconds: 0,
    sleepingSeconds: 0,
    asleep: false,
  });
  const day = Math.floor(at / 86400);
  if (rest.day !== day) {
    rest.debtSeconds = Math.min(86400, Math.max(0, rest.debtSeconds + 28800 - rest.restedSeconds));
    rest.restedSeconds = 0;
    rest.day = day;
  }
  const episode = actor.action?.type === 'rest' ? actor.action.id : null;
  if (episode !== rest.episode) {
    rest.episode = episode;
    rest.restingSeconds = 0;
    rest.sleepingSeconds = 0;
  }
  rest.asleep = !!episode && rest.restingSeconds >= REST_RULES.sleepOnsetSeconds;
  if (episode) {
    rest.restingSeconds += seconds;
    rest.restedSeconds += seconds;
    if (rest.asleep) rest.sleepingSeconds += seconds;
  }
  // Debt modestly increases fatigue; native rest always remains available.
  if (!episode && rest.debtSeconds)
    actor.energy = Math.max(0, actor.energy - (seconds * 0.0005 * rest.debtSeconds) / 28800);
}
