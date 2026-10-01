# Camp fire care and sharing verification

September 28, 2026, local macOS arm64, Node 22.23.2, PostgreSQL 14 on loopback. Base `origin/main` at `be68b1e0` plus this branch's implementation ([plan](../projects/camp-fire-and-sharing.md)). All worlds and databases were disposable. No provider was contacted: native runs have no AI configuration, and service runs inject a fixture Jev client that never makes network calls (additional Jev cost **$0**). Fixture choices prove the plumbing from candidate to effect, not what live Jev would choose. The scenarios are ad hoc scripts, not committed suites.

## Fire care

**Native domain scenario** (`executeCommand` and `advanceWorld` on a fresh bundled world). All checks passed:

- **Refusals:** lighting a burning fire (`already-lit`), fuelling a full fire (`fire-full`), lighting a fire with no fuel (`no-fuel`) and lighting without tinder (`missing-material`). Choosing a knife as fuel is refused (“Knife is not fuel.”).
- **Putting out:** Ada put out the banked fire after approach and 30 s of work. It burned only while lit, and 172,757 of 172,800 fuel seconds remained. A cold fire did not burn over 600 s.
- **Cancelling:** stopping part-way through fuelling kept the branch and added no fuel.
- **Fuelling:** consumed exactly one branch and added exactly 3,600 s.
- **Lighting:** used one prepared-fiber tinder unit and kept the branch drill. The fire read exactly 3,600 s immediately after lighting, so no burn was charged for the slice in which lighting finished.
- **Cooking:** Ada cooked at the relit fire, and the fire burned 90 s during cooking. While Mike was cooking, Ada's attempt to put the fire out was refused (`in-use`); Mike finished his meal.
- **Non-wood fuel:** a scenario-only `fuel`-property definition (not wood) burned, confirming that eligibility comes from the definition.
- **Plans:** a persistent plan of gather branches → fuel the fire completed through plan admission and dispatch.
- **Burning out:** an untended lit fire burned out on its own and emitted `fire-out`.
- **Integrity:** the world passed `validateWorldModules`. Action records named “Light a fire”, “Add fuel to a fire” and “Put out a fire”.

**Service scenario**: real `WorldService` on disposable PostgreSQL, with the real `AiDirector` configured Jev-only and a fixture client.

- **Player menu:**
  - The selected fire's menu offered **Put out Banked campfire** and disabled fuelling with the reason “cannot hold more fuel yet”.
  - Put out, **Add Supple branch** (one branch spent, 600 → 4,200 s), **Light** (one fiber spent), cooking at the relit fire and putting out again all committed through `/api/command`'s service path.
  - The fire's quick actions showed **Light** and **Add Supple branch** with live availability.
- **Player typed text:** “add a branch to the campfire”, “light the campfire” and “put the fire out”. Each was grounded to the matching fire option, queued as a plan and completed with the expected fire state.
  - An earlier run correctly failed to light once Mike had burned both branches and had no drill left.
- **Ada deciding for herself:** through repeated thought opportunities, fixture choices committed through the ordinary response, plan and kernel path made Ada light the cold fire, add a branch, cook her meat and put the fire out, in that order. Every plan step completed with a readable result, for example “Banked campfire is out; about 1 hour of fuel remains for relighting.”

**Finding outside this branch.** A step dispatched from a persistent plan leaves a live immer draft proxy in `actionExperience.occurrences[].command`. `structuredClone` of the world then fails, which breaks `tests/fixtures/service.ts` `editWorld`; JSON serialization still works. It reproduces on the base commit with an ordinary gather plan. It was reported for the action-experience owner rather than changed here. The service scenarios use a JSON copy for fixture edits.

## Consent-aware handover

**Native domain scenario** (37 checks, all passed):

- **Refusals:** a self-offer, a direct `transfer-item` into Ada (`needs-acceptance`), and offering more than was carried.
- **Offer, then accept:**
  - The offer moved nothing.
  - Its event targeted Ada at importance 6.
  - The same lot could not be offered twice.
  - Mike could not accept his own offer, and Ada could not withdraw it or accept it naming the wrong offerer (all `no-offer`).
  - Ada's acceptance moved exactly one branch, and a second acceptance was refused.
- **Other outcomes:**
  - A declined offer moved nothing, as did a withdrawn one; the withdrawn offer could not be accepted afterwards.
  - An ignored offer expired exactly at its 1,800 s deadline (`offer-expired`), moved nothing and could not be accepted afterwards.
  - An offered stone tool that Mike dropped made acceptance fail generically and lapsed at the next boundary.
- **Bags:**
  - The offer text named only “1 Woven bag”, not its contents.
  - After Mike put his knife into the bag, acceptance was refused and the offer lapsed.
  - An unchanged bag moved whole, with its contents.
- **Limits:** three pending offers per offerer were admitted and a fourth was refused.
- **Load validation:** a world with pending offers validates. An offer longer than the authored lifetime is rejected, and a dangling offer is valid saved state.
- **Incapacitation:** when Mike became incapacitated, all three of his offers lapsed.

**Service scenario**: real `WorldService` and `AiDirector` on disposable PostgreSQL, with the fixture Jev client.

- **Player offers from the menu; Ada decides:**
  - Mike's menu on Ada listed bounded offers named from his own perspective (“to a person”, since he has not learned her name).
  - Ada accepted a branch through her own thought decision and fixture choice, and the branch moved.
  - Ada declined a stone the same way, and nothing moved.
  - A cord offer Ada ignored expired after 30 wall seconds of ticks, with nothing moved. (That run's text, “Mike's offer of 1 Fiber cord to Ada expired.”, still named Ada; see the fix below.)
- **Ada offers; the player replies:**
  - Ada offered Wild berries to Mike through her own decision.
  - Mike accepted through Ada's quick action **Accept 1 Wild berries**.
  - A later berry offer was declined by the typed text “no thanks, decline the berries”.
- **Player typed text:** “offer Ada a branch” created an offer immediately.
- **Inventory:** it listed Ada as an offer **recipient**, and **Offer to** created an offer for a knife. The server path refused a direct transfer into Ada.
- **Fixes found by this check and the browser pass:** refusal, success and event texts named the other person to a player who had not learned that name. The browser event feed showed “I offered 1 Supple branch to Bo.” while Mike's menu called Bo “a person”. Observer perspective renames only an event's leading acting subject. Outcome messages and offer events now name only the acting person; the recipient still perceives the offer as directed at them. Teaching and attack events have the same pre-existing leak, which was reported separately.

## Same-version persistence

**Disposable PostgreSQL, service restart on the same database.**

- **Before restart:** a burning fire (7,194 fuel seconds), a pending offer, Ada's in-progress fuelling action (approaching) and her queued second fuelling step.
- **After restart:** all four were identical. The plan then completed, burning two branches and extending the fuel.
- **After moving back within reach,** Ada accepted the restored offer.
- **A malformed saved offer** (lifetime beyond the authored limit) stopped the reloaded world with `Invalid item offer.` rather than becoming live state.

## Browser pass

Production build on a local server with a disposable database, no AI configured, driven through the in-app browser:

- **The lit campfire's right-click menu** offered **Put out Banked campfire**. The unavailable fuel option's hover card explained the effect, current fuel (“about 48 hours”), the refusal (“cannot hold more fuel yet”), cost and time.
- **Putting out** changed the scene lighting and the panel to “A cold campfire with about 46 hours of fuel…”.
- **The quick actions** **Add Supple branch** (about 47 hours, then refused at the cap) and **Light** worked. The floating status read “I lit Banked campfire.” and “−1 Prepared fibers”.
- **Offers:** a created person's menu listed bounded offers named from Mike's perspective (“to a person”). Offering a branch showed “Offered 1 Supple branch. Nothing moves unless they accept within 30 game minutes…”. With no AI, the recipient never replied and the offer expired.
- **Leak found here:** this pass exposed the event-name leak fixed above.

**Not exercised in the browser**, and covered only by the service scenarios:

- the inventory's **Offer to** button (the pass ran out of time while Mike starved at 1× speed);
- replying to an incoming offer (no NPC can offer without AI).

## Review fixes

A five-lens branch review with an adversarial check confirmed eleven defects; all are fixed and re-verified. Scenario counts after the fixes: fire native 39/39, handover native 40/40, fire service 19/19, handover service 18/18, restart 8/8.

- **Load validation** compared a floating-point difference, so about 2% of legitimate offers made at fractional game times would have stopped the world from loading. It now uses the creation expression, and 2,000 fractional creation times all validate.
- **Replies** to pending offers are listed for every visible party. New offers go to the nearest three people who can take items within reach, so a person created after the animals gets accept and decline candidates, and animals get no offers.
- **Fuel refusals** no longer name the type of an item the actor cannot access.
- **Cooking guard:** a cook still walking over no longer blocks putting a fire out. The guard reads the frozen roster instead of proxying every entity.
- **Bags with an access grant** are refused until the grant is cleared.
- **Fire work** now starts with readable text (“Ada started lighting Banked campfire.”).
- **The direct-give refusal** runs after scope checks, through the same recipient rule as offers, and the now-unneeded deposit path in container access is removed.
- **Existing tests:** the catalogue and HTTP assertions affected by the new options were updated. `action-catalogue.test.ts` and `http.test.ts` ran 15/16 on a private temporary PostgreSQL; the shared one was saturated by other suites.
  - The remaining failure, “supports presence, controls and idempotent native actions without AI”, is pre-existing: it expects Mike to carry berries, which the lean-camp start removed before this branch.

**Not yet covered:** live Jev choice quality and committed automated regression coverage ([TODO](../maintainers/TODO.md#camp-fire-care-and-sharing--deferred-automated-coverage)).

## Rebase onto composed activities

After rebasing onto local `main` at `1e373cbb`, which merged composed activities and typed requests, two integration problems appeared and were fixed:

- **Character choices failed on that `main`.** Every action a character picked through Jev failed schema validation, because main's new decision schema requires `act.slots` and the shared `actionResponse` helper left it out. The thought job ended with “The workflow failed safely”. It reproduced with a main-only choice (inspecting one's own possessions). `actionResponse` now defaults missing slots to null; the other callers already pass them explicitly.
- **The new typed-request vocabulary still described this work as missing.** It refused “give/offer” and turned “feed/fuel/stoke the fire” into staying by the heat. Giving now reaches ordinary grounding and binds to offers. Single fuelling requests ground to fire care. Only ongoing tending (“tend/keep/mind the fire … until …”) remains a disclosed stay-by-heat revision, with truthful wording.

Re-run on the rebased tree: fire native 39/39, fire service 21/21, handover native 40/40, handover service 18/18, restart 8/8. The fire service run now includes typed “fuel the fire” adding fuel and “keep the fire going” being refused truthfully.
