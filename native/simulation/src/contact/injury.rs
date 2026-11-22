//! The installed injury calculation is shared by attack review and impact.
use crate::body::{ScarEffect, scar_factor};
use crate::execution::ExecutionError;
use crate::simulation::InstalledWorld;
use crate::state::Entity;

/// Individual factors also bind a reviewed commitment. Two changes that happen
/// to cancel arithmetically do not preserve consent to the original attack.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ContactInjury {
    pub outgoing: f64,
    pub susceptibility: f64,
    pub incoming: f64,
}

impl ContactInjury {
    pub(crate) fn read(
        installed: &InstalledWorld,
        source: &Entity,
        target: &Entity,
    ) -> Result<Self, ExecutionError> {
        let body = target
            .actor
            .as_ref()
            .and_then(|actor| actor.body.as_ref())
            .ok_or(ExecutionError::MissingBody)?;
        let policy = installed.body_policy.as_ref().map(|policy| policy.value());
        Ok(Self {
            outgoing: scar_factor(policy, source, ScarEffect::OutgoingInjury),
            susceptibility: body.susceptibility.injury,
            incoming: scar_factor(policy, target, ScarEffect::IncomingInjury),
        })
    }

    pub(crate) fn maximum(self, damage: f64) -> f64 {
        damage * self.outgoing * self.susceptibility * self.incoming
    }
}
