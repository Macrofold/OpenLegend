//! An isolated Source command publishes any changed physical encounter input
//! as pending sight work. This is a pre-effect fingerprint, never an observation
//! or a second entity. Private agency/controller changes do not enter it.
use super::NativeCommand;
use crate::execution::{CoreMutation, ExecutionError, PhysicalChange};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::Point;
use crate::status::{
    AttributeAudience, capture_public_attribute_projection, effective_body_profile,
    project_status_effects,
};
use serde::Serialize;
use std::mem::size_of;

pub(super) struct CommandExposure {
    id: String,
    position: Point,
    signature: String,
    _reservation: ByteReservation,
}
impl CommandExposure {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        command: &NativeCommand,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let id = match command {
            NativeCommand::StatusEffect { target_id, .. } => target_id,
            NativeCommand::Move { envelope, .. } | NativeCommand::Cancel { envelope, .. } => {
                let entity = core
                    .state
                    .physical
                    .entities
                    .get(&envelope.actor_id)
                    .ok_or(ExecutionError::MissingActor)?;
                let outward = &core
                    .state
                    .installed
                    .observation_rules
                    .value()
                    .outward_activity
                    .actions;
                if !entity
                    .status_effects
                    .as_ref()
                    .is_some_and(|states| states.values().any(|state| state.active))
                    && !entity
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.action.as_ref())
                        .is_some_and(|action| outward.contains(&action.kind))
                {
                    return Ok(None);
                }
                &envelope.actor_id
            }
            NativeCommand::Say { .. } => return Ok(None),
        };
        if core.state.physical.entities.get(id).is_none() {
            return Ok(None);
        }
        let (position, signature, reservation) = fingerprint(core, id, budget)?;
        let mut reservation = reservation;
        reservation.resize(reservation.bytes() + id.len() + size_of::<Self>())?;
        Ok(Some(Self {
            id: id.clone(),
            position,
            signature,
            _reservation: reservation,
        }))
    }
    pub(super) fn reconcile(
        self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let (position, signature, _guard) = fingerprint(core, &self.id, budget)?;
        if signature != self.signature {
            // Source captureExposureCache queues this at publication without
            // claiming a movement, granting sight or changing placement counters.
            core.journal
                .sensory
                .queue_physical_change(
                    &mut core.state.reception,
                    core.state.physical.header.sim_time,
                    &PhysicalChange::Spatial {
                        entity_id: self.id,
                        before: self.position,
                        after: position,
                        support_unchanged: false,
                        discontinuity: false,
                    },
                    core.state.installed.maximum_change_scopes,
                )
                .map_err(ExecutionError::Received)?;
        }
        Ok(())
    }
}
fn fingerprint(
    core: &CoreMutation<'_>,
    id: &str,
    budget: &ByteBudget,
) -> Result<(Point, String, ByteReservation), ExecutionError> {
    let state = &core.state;
    let entity = state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let position = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let action = actor.action.as_ref();
    let _activity = budget.reserve(
        action.map_or(0, |action| {
            action.id.len() + action.kind.len() + action.stage.len()
        }) * 6
            + 512,
    )?;
    let rules = state.installed.observation_rules.value();
    let activity = rules.outward_body_activity(entity)?;
    let animation = rules.observed_action_animation(entity)?;
    let effects = project_status_effects(
        entity,
        &state.installed.status_policy,
        AttributeAudience::Public,
        budget,
    )?;
    let attributes = capture_public_attribute_projection(
        entity,
        &state.installed.attributes,
        state.physical.pending_values.as_ref(),
        budget,
    )?;
    let profile = effective_body_profile(entity, budget)?;
    #[derive(Serialize)]
    struct Input<'a> {
        position: Point,
        support: Option<&'a str>,
        heading: f64,
        radius: f64,
        height: f64,
        eye: f64,
        alive: bool,
        memory: bool,
        perception_blocked: bool,
        activity: &'a Option<String>,
        animation: &'a Option<crate::worlds::base_observed::ObservedActionAnimation>,
        effects: &'a [crate::worlds::base_observed::StatusEffectProjection],
        attributes: &'a str,
    }
    let support = match &entity.placement {
        Some(crate::state::Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_deref(),
        _ => None,
    };
    let input = Input {
        position,
        support,
        heading: entity.spatial.heading,
        radius: profile.radius,
        height: profile.height,
        eye: profile.eye_height,
        alive: actor.alive,
        memory: entity.has_memory(),
        perception_blocked: state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "perception")?,
        activity: &activity,
        animation: &animation,
        effects: effects.rows(),
        attributes: attributes.key(),
    };
    let bytes = crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
    let reservation = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let signature = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
    Ok((position, signature, reservation))
}
