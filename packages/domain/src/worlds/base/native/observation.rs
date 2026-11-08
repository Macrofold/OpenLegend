//! The selected world's outward vocabulary, supplied from its one authored
//! descriptor. Physical state selects a marker; no private plan is projected.
use crate::install::DefinitionIdentity;
use crate::state::Entity;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OutwardMarkers {
    pub incapacitated: String,
    pub alive: String,
    pub dead: String,
    pub burning: String,
    pub unlit: String,
    pub material_present: String,
    pub depleted: String,
    pub harvested: String,
    pub unharvested: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ObservationRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub outward: OutwardMarkers,
}
impl DefinitionIdentity for ObservationRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl ObservationRules {
    pub(crate) fn outward_states<'a>(&'a self, entity: &Entity) -> [&'a str; 4] {
        let words = &self.outward;
        [
            entity.actor.as_ref().map_or("", |actor| {
                if !actor.alive {
                    &words.dead
                } else if actor.incapacitated {
                    &words.incapacitated
                } else {
                    &words.alive
                }
            }),
            entity.heat.as_ref().map_or("", |heat| {
                if heat.lit {
                    &words.burning
                } else {
                    &words.unlit
                }
            }),
            entity.resource.as_ref().map_or("", |resource| {
                if resource.quantity > 0 {
                    &words.material_present
                } else {
                    &words.depleted
                }
            }),
            entity.remains.as_ref().map_or("", |remains| {
                if remains.harvested {
                    &words.harvested
                } else {
                    &words.unharvested
                }
            }),
        ]
    }
}

impl ObservationRules {
    /// The selected Move/Status/Say closure has no working strike. A genuine
    /// strike needs its installed strike, item and permitted sight owners;
    /// installation/admission refuses that active family before effects.
    pub(crate) fn observed_action_animation(
        &self,
        entity: &Entity,
    ) -> Result<
        Option<crate::worlds::base_observed::ObservedActionAnimation>,
        crate::status::ProjectionError,
    > {
        if entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.kind == "strike" && action.stage == "working")
        {
            return Err(crate::status::ProjectionError::UnsupportedFamily);
        }
        Ok(None)
    }
}
