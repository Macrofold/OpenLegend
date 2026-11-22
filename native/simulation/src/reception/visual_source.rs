//! Physical outward values for an actually proved sight target. Receiver names,
//! exposure, clocks and evidence ownership are acquired by the visual driver.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use crate::state::{Named, Placement};
use crate::status::{
    AttributeAudience, capture_public_attribute_projection, effective_body_profile,
    project_attributes, project_status_effects,
};
use serde::Deserialize;
use std::mem::size_of;

pub(super) struct PreparedVisualSource {
    pub location: ObservedLocation,
    pub pose: ObservedBodyPose,
    pub facets: Vec<SensoryFacet>,
    pub inventory_revision: u64,
    pub token: String,
    pub reservation: ByteReservation,
}
fn invalid() -> ExecutionError {
    ExecutionError::UnsupportedFamily
}
pub(super) fn prepare_visual_source(
    state: &SimulationState,
    subject_id: &str,
    detailed: bool,
    budget: &ByteBudget,
) -> Result<PreparedVisualSource, ExecutionError> {
    let subject = state
        .physical
        .entities
        .get(subject_id)
        .ok_or(ExecutionError::MissingActor)?;
    let Some(Placement::World {
        revision,
        support_surface_id,
        ..
    }) = &subject.placement
    else {
        return Err(invalid());
    };
    if subject.assembly.is_some() {
        return Err(invalid());
    }
    let resource = subject
        .resource
        .as_ref()
        .map(|stock| {
            state
                .installed
                .retained
                .items
                .get(&stock.definition_id)
                .map(|definition| (stock, &definition.icon))
                .ok_or_else(invalid)
        })
        .transpose()?;
    let icon = match resource {
        Some((_, icon)) => icon,
        None => &subject.icon,
    };
    let subtype = match resource {
        Some((stock, _)) => Some(&stock.definition_id),
        None => subject
            .actor
            .as_ref()
            .and_then(|actor| actor.species.as_ref()),
    };
    // Broad reception may reuse an unchanged eligible relation even when a
    // separate detail check is negative. Do not replace the receiving owner's
    // scoped broad roster with that detail result. Neither path reads a hidden
    // personal name: the world factory supplies only the outward body category.
    let label = crate::worlds::base_knowledge::outward_body_name(
        state.installed.name_rules.value(),
        subject,
    );
    let rules = state.installed.observation_rules.value();
    let description = subject
        .actor
        .as_ref()
        .and_then(|actor| actor.description.as_ref())
        .or(subject.description.as_ref());
    let activity_bound = subject
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .map_or(Some(0), |action| {
            heap_sum([
                action.id.len(),
                action.kind.len(),
                action.stage.len(),
                rules.outward_activity.preparing_phase.len(),
            ])?
            .checked_mul(6)?
            .checked_add(32)
        })
        .ok_or(ExecutionError::Capacity)?;
    let bytes = heap_sum([
        size_of::<PreparedVisualSource>(),
        6 * size_of::<SensoryFacet>(),
        subject.kind.len(),
        subject
            .appearance
            .as_ref()
            .map_or(Some("sprite".len()), HeapBytes::heap_bytes)
            .ok_or(ExecutionError::Capacity)?,
        icon.heap_bytes().ok_or(ExecutionError::Capacity)?,
        label.name.storage_bytes(),
        label.name_form.map_or(0, str::len),
        label.indefinite_article.map_or(0, str::len),
        subtype.map_or(0, String::len),
        if detailed {
            description.map_or(0, crate::text::JsText::storage_bytes)
        } else {
            0
        },
        support_surface_id
            .as_ref()
            .map_or(0, String::len)
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?,
        rules
            .outward_states(subject)
            .iter()
            .try_fold(0usize, |sum, word| sum.checked_add(word.len()))
            .ok_or(ExecutionError::Capacity)?,
        activity_bound,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(bytes)?;
    let profile = effective_body_profile(subject, budget)?;
    let position = subject
        .world_position()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let pose = ObservedBodyPose {
        position,
        heading: subject.spatial.heading,
        support_surface_id: support_surface_id.clone(),
    };
    let body_plan = subject
        .actor
        .as_ref()
        .and_then(|actor| actor.body.as_ref())
        .map(|body| {
            crate::worlds::base_observed::BodyPlan::deserialize(
                serde::de::value::BorrowedStrDeserializer::<serde::de::value::Error>::new(
                    &body.plan,
                ),
            )
            .map_err(|_| invalid())
        })
        .transpose()?;
    let (effects, animation) = if subject.actor.is_some() {
        let (effects, guard) = project_status_effects(
            subject,
            &state.installed.status_policy,
            AttributeAudience::Public,
            budget,
        )?
        .into_parts();
        reservation.merge(guard)?;
        (
            Some(effects),
            Some(
                rules.observed_action_animation(subject, &state.installed.retained.native_strike_read)?,
            ),
        )
    } else {
        (None, None)
    };
    let body = ObservedBody {
        kind: subject.kind.clone(),
        appearance: subject
            .appearance
            .clone()
            .unwrap_or_else(|| "sprite".into()),
        radius: profile.radius,
        height: profile.height,
        outward: rules.outward_states(subject).map(str::to_owned),
        activity: rules.outward_body_activity(subject)?,
        animation,
        effects,
        body_plan,
        subtype: subtype.cloned(),
        icon: icon.as_ref().filter(|icon| !icon.is_empty()).cloned(),
        label: Some(Named {
            name: label.name.to_owned().into(),
            name_form: label.name_form.map(str::to_owned),
            indefinite_article: label.indefinite_article.map(str::to_owned),
        }),
        assembly: None,
        quantity: resource
            .filter(|(stock, _)| stock.cast.is_none())
            .map(|(stock, _)| stock.quantity as f64),
        heat_lit: subject.heat.as_ref().map(|heat| heat.lit),
        remains_phase: subject
            .remains
            .as_ref()
            .map(|remains| {
                crate::worlds::base_observed::RemainsPhase::deserialize(
                    serde::de::value::BorrowedStrDeserializer::<serde::de::value::Error>::new(
                        &remains.phase,
                    ),
                )
                .map_err(|_| invalid())
            })
            .transpose()?,
        storage: (subject.container.is_some()
            || subject.remains.is_some()
            || subject.kind == rules.pile_kind)
            .then_some(ObservedStorage {
                placement_revision: *revision,
            }),
        description: None,
        position,
        heading: pose.heading,
        support_surface_id: pose.support_surface_id.clone(),
    };
    let mut facets = Vec::new();
    facets
        .try_reserve_exact(6)
        .map_err(|_| ExecutionError::Capacity)?;
    facets.push(SensoryFacet::Detected {
        detected: if subject.actor.is_some() {
            DetectedKind::Body
        } else {
            DetectedKind::Surface
        },
        limits: Vec::new(),
    });
    facets.push(SensoryFacet::Body { body });
    if detailed {
        let mut equipped = Vec::new();
        let mut pile = Vec::new();
        let exposed_pile = subject.kind == rules.pile_kind || subject.remains.is_some();
        for item in state
            .inventory
            .children(&state.physical.entities, subject_id, !exposed_pile)
        {
            let attached = matches!(item.placement, Some(Placement::Attached { .. }));
            if !attached && !exposed_pile {
                continue;
            }
            let lot = item.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let definition = state
                .installed
                .retained
                .items
                .get(&lot.definition_pin.id)
                .ok_or(ExecutionError::Invariant)?;
            let name = &definition.named.name;
            if attached {
                admit_item(
                    &mut reservation,
                    size_of::<CarriedItem>(),
                    name.storage_bytes(),
                )?;
                equipped
                    .try_reserve_exact(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                equipped.push(CarriedItem {
                    item_kind_as_observed: name.clone(),
                });
            }
            if exposed_pile {
                let bytes =
                    heap_sum([name.storage_bytes(), item.id.len(), definition.pin.id.len()])
                        .ok_or(ExecutionError::Capacity)?;
                admit_item(&mut reservation, size_of::<ObservedPileItem>(), bytes)?;
                pile.try_reserve_exact(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                pile.push(ObservedPileItem {
                    id: item.id.clone(),
                    definition_id: definition.pin.id.clone(),
                    name: name.clone(),
                    quantity: lot.quantity as f64,
                    portable: definition.portable,
                });
            }
        }
        facets.push(SensoryFacet::Carried { items: equipped });
        if let Some(text) = description.filter(|text| !text.is_empty()) {
            facets.push(SensoryFacet::Description {
                text: text.clone().into(),
            });
        }
        if exposed_pile {
            facets.push(SensoryFacet::PileContents { items: pile });
        }
        let (attributes, guard) = project_attributes(
            subject,
            &state.installed.attributes,
            state.physical.pending_values.as_ref(),
            AttributeAudience::Public,
            budget,
        )?
        .into_parts();
        reservation.merge(guard)?;
        if !attributes.is_empty() {
            facets.push(SensoryFacet::PublicAttributes { attributes });
        }
    }
    let location = ObservedLocation::Point {
        point: ObservedPoint::from(position),
        error_radius: 0.0,
    };
    // The selected source has no mutable item definitions, assembly or live
    // contribution family. These are precisely the remaining encounter-frame
    // dependencies: outward body/pose, description, life and the captured
    // public inputs (including revisions even when wording is unchanged).
    // Equality alone is consumed; the Source's ephemeral identity number for
    // its immutable item-definition object has no cross-process meaning.
    let public = capture_public_attribute_projection(
        subject,
        &state.installed.attributes,
        state.physical.pending_values.as_ref(),
        budget,
    )?;
    let descriptor = (
        &facets[1],
        description,
        subject.actor.as_ref().and_then(|a| a.physical_life),
        &pose,
        public.key(),
    );
    let token_bytes = crate::encoding::json_record_len(&descriptor).map_err(|_| invalid())?;
    reservation.resize(
        reservation
            .bytes()
            .checked_add(token_bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let token = crate::encoding::json_record(&descriptor).map_err(|_| invalid())?;
    reservation.resize(
        heap_sum([
            size_of::<PreparedVisualSource>(),
            location.heap_bytes().ok_or(ExecutionError::Capacity)?,
            pose.heap_bytes().ok_or(ExecutionError::Capacity)?,
            facets.heap_bytes().ok_or(ExecutionError::Capacity)?,
            token.capacity(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(PreparedVisualSource {
        location,
        pose,
        facets,
        inventory_revision: state.administration.object_membership.revision,
        token,
        reservation,
    })
}

fn admit_item(
    reservation: &mut ByteReservation,
    element: usize,
    body: usize,
) -> Result<(), ExecutionError> {
    let size = heap_sum([reservation.bytes(), element, body]).ok_or(ExecutionError::Capacity)?;
    reservation.resize(size)?;
    Ok(())
}
