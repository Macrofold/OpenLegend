//! Naming has its own real preparation cut after recall. It does not recapture
//! the initial scene, renew a body lease, or turn a participant ID into a grant.
use super::*;
use crate::execution::ExecutionError;
use crate::simulation::{AcceptedActorRead, SimulationState};
use serde::Deserialize;

#[derive(Clone, Copy, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum NpcPerspectiveEntity {
    Myself,
    Body {
        ordinal: usize,
    },
    Personal {
        inventory: usize,
        ordinal: usize,
        entity: usize,
    },
}
pub(crate) struct NpcPerspectiveSnapshot {
    identities: crate::worlds::CapturedAttributionIdentities,
}
impl NpcPerspectiveSnapshot {
    pub(crate) fn capture(
        state: &SimulationState,
        read: &AcceptedActorRead,
        sources: &[PreparedNpcSources],
        selected: &[NpcPerspectiveEntity],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let id = |selection: &NpcPerspectiveEntity| match *selection {
            NpcPerspectiveEntity::Myself => Some(read.perception.actor_id.as_str()),
            NpcPerspectiveEntity::Body { ordinal } => read
                .perception
                .bodies
                .get(ordinal)
                .map(|body| body.source_id.as_str()),
            NpcPerspectiveEntity::Personal {
                inventory,
                ordinal,
                entity,
            } => sources
                .get(inventory)
                .and_then(|inventory| inventory.personal.get(ordinal))
                .and_then(|source| source.attribution.perspective_entity(entity)),
        };
        let ids = selected.iter().map(id);
        if ids.clone().any(|id| id.is_none()) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            &read.perception.actor_id,
        )?;
        Ok(Self {
            identities: names.capture_attribution_identities(ids.flatten(), budget)?,
        })
    }
    pub(crate) fn entity(&self, ordinal: usize) -> Option<&str> {
        self.identities.key(ordinal)
    }
    pub(crate) fn matches(
        &self,
        ordinal: usize,
        current: &crate::worlds::CapturedAttributionIdentities,
    ) -> bool {
        self.identities.matches_entry(ordinal, current)
    }
    pub(crate) fn identities(&self) -> &impl Serialize {
        &self.identities
    }
}
