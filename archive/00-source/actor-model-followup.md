# Actor model follow-up

User direction recorded September 20, 2026:

- “Actor” is the general concept for a living thing, including people and animals.
- The current implementation does not need to migrate animals into the actor model yet.
- Actions and effects that apply to living things should target actors by capability or lifecycle state rather than assume a human body. Revive, for example, should eventually apply to any dead actor, including an animal.
- An animal may later receive richer intelligence, memory, an inner world or speech. A particular deer could be made unusually intelligent and able to talk without ceasing to be a deer.
- Shared physical effects should work across compatible actors. Wetness or being on fire can affect an animal's health just as those conditions can affect a human's health, with species/body differences handled explicitly.

This is an accepted design direction, not a claim that animals currently use the person-style actor component or that cross-species revival and generic status effects are implemented.
