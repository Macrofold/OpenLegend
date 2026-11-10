//! The replacement mechanism constructs exactly the current corpse fields. It
//! does not copy the person's agency, traits, private attributes or cognition.
use crate::execution::ExecutionError;
use crate::host::retained_size::heap_sum;
use crate::state::*;
use std::mem::size_of;

pub(super) fn allocation_bound(entity: &Entity) -> Option<usize> {
    let actor = entity.actor.as_ref()?;
    let body = actor.body.as_ref()?;
    let profiles = std::iter::once(&entity.spatial.body)
        .chain(entity.spatial.inactive_body.iter())
        .try_fold(0usize, |bytes, p| bytes.checked_add(p.id.len()))?;
    let ports = body.equipment_ports.iter().try_fold(
        body.equipment_ports
            .len()
            .checked_mul(size_of::<EquipmentPort>())?,
        |bytes, p| {
            heap_sum([
                bytes,
                p.id.len(),
                p.label.len(),
                p.icon.as_ref().map_or(0, String::len),
            ])
        },
    )?;
    heap_sum([
        size_of::<Entity>(),
        size_of::<ActorState>(),
        entity.name.storage_bytes(),
        entity.name_form.as_ref().map_or(0, String::len),
        entity
            .appearance
            .as_ref()
            .map_or(0, crate::text::JsText::storage_bytes),
        entity.id.len(),
        actor.species.as_ref().map_or(0, String::len),
        ports,
        profiles,
        body.plan.len(),
        match &entity.placement {
            Some(Placement::World {
                support_surface_id, ..
            }) => support_surface_id.as_ref().map_or(0, String::len),
            _ => 0,
        },
        256,
    ])
}
pub(super) fn construct(entity: &Entity, id: String, kind: &str) -> Result<Entity, ExecutionError> {
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let body = actor.body.as_ref().ok_or(ExecutionError::MissingBody)?;
    let remains = entity.remains.as_ref().ok_or(ExecutionError::Invariant)?;
    if entity.spatial.flight.is_some() || entity.spatial.local_pose.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    Ok(Entity {
        id,
        name: entity.name.clone(),
        name_form: entity.name_form.clone(),
        kind: kind.into(),
        appearance: entity.appearance.clone(),
        placement: entity.placement.clone(),
        spatial: EntitySpatial {
            body: entity.spatial.body.clone(),
            inactive_body: entity.spatial.inactive_body.clone(),
            soft_footprint: entity.spatial.soft_footprint.clone(),
            heading: entity.spatial.heading,
            local_pose: None,
            local_avoidance_ready_at: None,
            flight: None,
            fall_velocity: entity.spatial.fall_velocity,
        },
        remains: Some(Remains {
            died_at: remains.died_at,
            rot_at: remains.rot_at,
            remove_at: remains.remove_at,
            phase: remains.phase.clone(),
            source_id: entity.id.clone(),
            harvested: remains.harvested,
            yields: Vec::new(),
        }),
        actor: Some(ActorState {
            controller: "native".into(),
            species: actor.species.clone(),
            capabilities: Some(Capabilities {
                cognition: false,
                memory: false,
                inner_world: false,
                speech: false,
                language: false,
            }),
            body: Some(LivingBody {
                equipment_ports: body.equipment_ports.clone(),
                plan: body.plan.clone(),
                max_health: body.max_health,
                revision: body.revision,
                conditions: body.conditions.clone(),
                susceptibility: body.susceptibility.clone(),
                harvest_yield: Vec::new(),
            }),
            health: 0.0,
            alive: false,
            incapacitated: false,
            born_at: actor.born_at,
            physical_life: Some(actor.physical_life.unwrap_or(0)),
            action: None,
            plan_generation: 0,
            agency: ActorAgency {
                semantic: Some(SemanticContinuation {
                    interval: 0,
                    discovery: "available".into(),
                    occupied_purpose: None,
                    reservation: None,
                    resolved: Default::default(),
                }),
                revision: 0,
                goals: Vec::new(),
                plan: None,
                history: Vec::new(),
                attempts: Vec::new(),
                suspended: None,
                places: None,
                last_result_evidence: None,
                order: crate::state::AgencyOrder::opening(),
            },
            attack_mode_notice: None,
            encounters: None,
            practice: None,
            coaching_episode_id: None,
            natural_strike_ids: None,
            pending_death: None,
            inventory_inspection: None,
            attention_capacity: None,
            scars: None,
            conditions: None,
            combat_ready_at: None,
            evasion_ready_at: None,
            participation: None,
            senses: None,
            contacts: None,
            attributes: None,
            traits: None,
            voice_profile: None,
            individual_recognition: None,
            description: None,
            personality: None,
            backstory: None,
            initial_goals: None,
            birth_time_known: None,
        }),
        hearth: None,
        practice_target: None,
        threat: None,
        assembly: None,
        inventory_revision: None,
        item: None,
        container: None,
        declared_owner: None,
        retirement: None,
        sensory_progress: None,
        icon: None,
        description: None,
        status_effects: None,
        attributes: None,
        mechanism_fields: None,
        indefinite_article: None,
        animal: None,
        replenisher: None,
        resource: None,
        heat: None,
    })
}
