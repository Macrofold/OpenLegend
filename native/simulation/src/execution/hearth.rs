//! Completion uses the ordinary physical writer and custody debit. The
//! construction effect is staged before the new hearth becomes accepted.
use super::*;
use crate::hearth::{Definition, PlacedHearth};
use crate::state::{BodyProfile, Entity, EntitySpatial, Heat, SurfacePoint};

impl CoreMutation<'_> {
    pub(crate) fn place_cold_hearth(
        &mut self,
        actor_id: &str,
        definition: &Definition,
    ) -> Result<String, ExecutionError> {
        let state = &mut self.state.physical;
        let budget = self.journal.physical.budget.clone();
        let id = state
            .identity
            .allocate_entity("hearth", |id| state.entities.get(id).is_some())?
            .id;
        let action = state
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let work = action
            .hearth_work
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let _guard = budget.reserve(
            1024 + 2 * id.len()
                + actor_id.len()
                + action.id.len()
                + work.definition.id.len()
                + work.definition.digest.len()
                + work.site.surface_id.len()
                + definition.name.storage_bytes()
                + definition.description.storage_bytes(),
        )?;
        self.journal.material_gather.record_hearth(
            actor_id,
            state.header.sim_time,
            action,
            &id,
            definition,
            &budget,
        )?;
        let placed = PlacedHearth {
            definition: work.definition.clone(),
            actor_id: actor_id.to_owned(),
            physical_life: work.physical_life,
            action_id: action.id.clone(),
        };
        let SurfacePoint {
            x,
            y,
            z,
            surface_id,
        } = work.site.clone();
        let height = definition.height_metres;
        let entity = Entity {
            id: id.clone(),
            name: definition.name.clone(),
            description: Some(definition.description.clone()),
            kind: "campfire".into(),
            name_form: None,
            indefinite_article: None,
            spatial: EntitySpatial {
                body: BodyProfile {
                    id: work.definition.id.clone(),
                    radius: definition.radius_metres,
                    height,
                    eye_height: height * 0.5,
                    ear_height: height * 0.5,
                    interaction_height: height * 0.5,
                    max_slope: 0.0,
                },
                heading: 0.0,
                inactive_body: None,
                soft_footprint: None,
                local_pose: None,
                local_avoidance_ready_at: None,
                flight: None,
                fall_velocity: None,
            },
            placement: Some(Placement::World {
                position: Point { x, y, z },
                support_surface_id: Some(surface_id),
                revision: 0,
                motion_continuity_revision: None,
            }),
            heat: Some(Heat {
                lit: false,
                fuel_seconds: 0.0,
            }),
            hearth: Some(placed),
            item: None,
            actor: None,
            animal: None,
            remains: None,
            resource: None,
            replenisher: None,
            attributes: None,
            container: None,
            inventory_revision: None,
            declared_owner: None,
            retirement: None,
            sensory_progress: None,
            icon: None,
            status_effects: None,
            mechanism_fields: None,
            appearance: None,
            threat: None,
            assembly: None,
            practice_target: None,
        };
        self.physical().insert_entity(entity, true)?;
        Ok(id)
    }
}
