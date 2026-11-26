//! The installed scar definitions choose their factors. Preserve source order
//! and saved numeric truthiness; no derived factor becomes writable authority.
use super::BodyPolicy;
use crate::state::Entity;
#[derive(Clone, Copy)]
pub(crate) enum ScarEffect {
    Movement,
    OutgoingInjury,
    IncomingInjury,
}
pub(crate) fn scar_factor(policy: Option<&BodyPolicy>, entity: &Entity, effect: ScarEffect) -> f64 {
    let mut factor = 1.0;
    if let Some(policy) = policy.and_then(|p| p.reincarnation.as_ref()) {
        for scar in &policy.scars {
            if entity
                .actor
                .as_ref()
                .and_then(|a| a.scars.as_ref())
                .and_then(|s| s.get(&scar.id))
                .is_some_and(|at| *at != 0.0 && !at.is_nan())
            {
                factor *= match effect {
                    ScarEffect::Movement => scar.movement_factor,
                    ScarEffect::OutgoingInjury => scar.outgoing_injury_factor,
                    ScarEffect::IncomingInjury => scar.incoming_injury_factor,
                };
            }
        }
    }
    factor
}
