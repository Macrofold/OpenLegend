# Body, senses and survival

`bodies.ts` owns initial anatomy, health maxima, harvest yields and native animal capabilities; `spawn.ts` owns the God creation templates. Generic lifecycle and admission remain outside the world directory.

The base world uses bounded health, fullness and energy attributes, initial values and concern descriptions from `packages/domain/src/worlds/base/attributes.ts`. Sight and hearing definitions in `senses.ts` default to 28 and 10 world units respectively. Their generic detectors still apply geometry, transmission and receiver scope; naming a sense never grants an actor all world knowledge.

`needs.ts` owns the base physiology: fullness drains 0.003 percentage points per simulation second; zero fullness costs 0.009 health points per second and zero energy costs 0.003. These rates and the presence of these needs are not universal engine laws. [Sleep and waking](sleep.md) owns authored recovery and expenditure of energy. Native urgency, seeking and eating thresholds remain distinct from cognitive concern thresholds.

Initial item definitions and the known fiber/cord preparations live in `items.ts`. World creation, basic possessions, people, resource sources and finite initial supplies live in `world.ts`; the starting clearing, lookout and bird routes live in `spatial.ts`. These authored definitions are the single code source for the bundled reality. The generic simulation still hosts finite adapters for gathering, preparation, cooking, hunting and body needs; directory separation does not claim full runtime replacement of these adapters.

`actions.ts` owns movement/interaction defaults, gather yield and initial harvest/cook/shot durations consumed by those adapters. Simulation step size and bounded advancement remain engine execution concerns. World-configurable replacement of the remaining finite adapters follows their existing extension owners.
