//! Current actor work under the same accepted grant as live inspection.
//! The action path, private observer receipts and execution-only bindings
//! stay with their owners. These fields describe already accepted work.

use super::*;
use crate::{
    host::CapacityError,
    reception::AttributeView,
    state::{Action, ActorAgency, SurfacePoint, Yield},
    status::{AttributeAudience, ProjectionError, project_attributes},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeLiveActivity<'a> {
    actor_id: &'a str,
    action: Option<CurrentAction<'a>>,
    agency: &'a ActorAgency,
    attributes: Vec<AttributeView>,
    senses: &'a [String],
    controller: &'a str,
    actor_state: ActorStatus,
    coverage: &'static str,
    #[serde(skip)]
    _attributes: ByteReservation,
}

#[derive(Serialize)]
struct ActorStatus {
    alive: bool,
    incapacitated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CurrentAction<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    stage: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_life: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    destination: Option<&'a SurfacePoint>,
    path_length: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    replans: Option<u64>,
    remaining_seconds: f64,
    total_seconds: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    attribute_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_version: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipe_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    weapon_item_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ammo_item_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    heat_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quantity: Option<u64>,
    consumed: &'a [Yield],
}

impl<'a> RuntimeLiveRead<'a> {
    /// Describe accepted action, agency and owner-visible attributes without
    /// capturing history, rebuilding routes or preparing a player view.
    pub fn current_work(
        &self,
        actor_id: &str,
    ) -> Result<Option<RuntimeLiveActivity<'a>>, RuntimeError> {
        let Some(subject) = self.select(actor_id)? else {
            return Ok(None);
        };
        let entity = subject.entity;
        let Some(actor) = &entity.actor else {
            return Ok(None);
        };
        let (attributes, custody) = project_attributes(
            entity,
            &self.state.installed.attributes,
            self.state.physical.pending_values.as_ref(),
            AttributeAudience::Owner,
            self.budget,
        )
        .map_err(|error| match error {
            ProjectionError::Capacity => CapacityError.into(),
            other => failure(other),
        })?
        .into_parts();
        let action = actor
            .action
            .as_ref()
            .map(|action| self.current_action(action))
            .transpose()?;
        Ok(Some(RuntimeLiveActivity {
            actor_id: &entity.id,
            action,
            // ActorAgency owns its existing Source-shaped fields and order,
            // separately from saved minds, memories and model transport.
            agency: &actor.agency,
            attributes,
            senses: subject.senses(),
            controller: &actor.controller,
            actor_state: ActorStatus {
                alive: actor.alive,
                incapacitated: actor.incapacitated,
            },
            coverage: "Current action, goals and plan under the actor’s inspection grant. The action reports its route length.",
            _attributes: custody,
        }))
    }

    fn current_action(&self, action: &'a Action) -> Result<CurrentAction<'a>, RuntimeError> {
        let target_id = self.visible_reference(action.target_id.as_deref())?;
        Ok(CurrentAction {
            id: &action.id,
            kind: &action.kind,
            stage: &action.stage,
            target_id,
            target_life: target_id.and(action.target_life),
            destination: action.destination.as_ref().map(|point| point.physical()),
            path_length: action.path.len(),
            replans: action.replans,
            remaining_seconds: action.remaining_seconds,
            total_seconds: action.total_seconds,
            attribute_id: action.attribute_id.as_deref(),
            definition_id: action.definition_id.as_deref(),
            definition_version: action.definition_version,
            recipe_id: action.recipe_id.as_deref(),
            item_id: self.visible_reference(action.item_id.as_deref())?,
            weapon_item_id: self.visible_reference(action.weapon_item_id.as_deref())?,
            ammo_item_id: self.visible_reference(action.ammo_item_id.as_deref())?,
            heat_id: self.visible_reference(action.heat_id.as_deref())?,
            quantity: action.quantity,
            consumed: &action.consumed,
        })
    }

    fn visible_reference(&self, id: Option<&'a str>) -> Result<Option<&'a str>, RuntimeError> {
        match id {
            Some(id) if self.select(id)?.is_some() => Ok(Some(id)),
            _ => Ok(None),
        }
    }
}
