//! Deliberate retention of a permitted dated current capture. It copies the
//! supplied measurement and its independent proofs, never senses again or
//! recreates a current-body grant after ordinary loss.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::HeapBytes;
use crate::received::{
    AvailabilityReason, TemporalAvailability, TemporalCaptureFacet, TemporalCaptureInput,
    TemporalDetailSupport, retain_received_value,
};
use crate::reception::{CapturedCurrentFacet, ReceivedFacetProof};
use std::mem::size_of;

fn role(role: FacetRole) -> ReceivedRole {
    match role {
        FacetRole::Direct => ReceivedRole::Direct,
        FacetRole::Inference => ReceivedRole::Inference,
        FacetRole::Testimony => ReceivedRole::Testimony,
    }
}
fn proof(snapshot: &CapturedCurrentFacet) -> ReceivedFacetProof {
    ReceivedFacetProof {
        original: snapshot.original.clone(),
        confirmation: snapshot.confirmation.clone(),
        confirmed_from: snapshot.confirmed_from,
        confirmed_through: snapshot.confirmed_through,
        aliases: snapshot.original_aliases.clone(),
    }
}
fn append_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => ExecutionError::Received(error),
        TemporalAppendError::Work(error) => ExecutionError::Work(error),
    }
}

/// This is the Source deliberate-admission gate. Explicit privacy fencing is
/// performed on the enclosing evidence cut before the caller selects a facet;
/// ordinary loss of sight does not invalidate that supplied dated capture.
pub(crate) fn record_snapshot_support(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    snapshot: &CapturedCurrentFacet,
    budget: &ByteBudget,
) -> Result<Option<Arc<TemporalSupportRecord>>, ExecutionError> {
    if snapshot.observer.actor_id != actor_id
        || !core
            .state
            .physical
            .entities
            .get(actor_id)
            .is_some_and(|entity| {
                entity.has_memory()
                    && entity.physical_life() == Some(snapshot.observer.physical_life)
            })
    {
        return Ok(None);
    }
    let capacity = || ExecutionError::Capacity;
    // At most two supplied values and four repeated proof views are copied.
    // Count their owned typed allocations, not encoded gameplay byte quotas.
    let bytes = snapshot
        .heap_bytes()
        .and_then(|n| n.checked_mul(8))
        .and_then(|n| {
            n.checked_add(
                2 * size_of::<TemporalCaptureFacet>()
                    + 2 * size_of::<TemporalFacetReference>()
                    + 2 * size_of::<ReceivedValueFragment>()
                    + size_of::<TemporalCaptureInput>(),
            )
        })
        .ok_or_else(capacity)?;
    let _scratch = budget.reserve(bytes)?;
    if !super::super::actor::ensure_temporal_actor(core, actor_id, budget)? {
        return Ok(None);
    }
    let is_body = matches!(&snapshot.value, SensoryFacet::Body { .. });
    let pose = is_body.then_some(snapshot.pose_support.as_ref()).flatten();
    let description = is_body
        .then_some(snapshot.description_support.as_ref())
        .flatten();
    let (mut value, reception) = split(&snapshot.value)?;
    if description.is_some() {
        if let ReceivedValueFragment::Body(body) = &mut value {
            body.body.description = None;
        }
    }
    let primary_proof = pose.map_or_else(
        || proof(snapshot),
        |pose| ReceivedFacetProof {
            original: pose.original.clone(),
            confirmation: pose.confirmation.clone(),
            confirmed_from: pose.confirmed_from,
            confirmed_through: pose.confirmed_through,
            aliases: pose.aliases.clone(),
        },
    );
    // The captured value date and confirmation date remain independent. A
    // separate location proof supplies a body's pose date, never its detail.
    let clocks_pose = snapshot.pose_support.as_ref();
    let from = clocks_pose.map_or(snapshot.value_measured_from, |pose| pose.pose_measured_from);
    let through = clocks_pose.map_or(snapshot.value_measured_through, |pose| {
        pose.pose_measured_through
    });
    let acquired = clocks_pose.map_or(snapshot.value_acquired_at, |pose| pose.pose_acquired_at);
    let mut facets = Vec::with_capacity(1 + usize::from(description.is_some()));
    facets.push(TemporalCaptureFacet {
        value,
        preferred: None,
        reception,
        clock: ReceivedFieldClock {
            role: role(pose.map_or(snapshot.role, |pose| pose.role)),
            as_of: through,
            measured_from: from,
            measured_through: through,
            acquired_at: acquired,
            confirmed_through: None,
        },
        member_index: None,
        track: None,
        support: Some(primary_proof),
        detail_support: pose.map(|_| TemporalDetailSupport {
            proof: proof(snapshot),
            role: role(snapshot.role),
            from: snapshot.value_measured_from,
            through: snapshot.value_measured_through,
            acquired_at: snapshot.value_acquired_at,
        }),
        pose_frame: pose.map(|pose| pose.frame.clone()),
        original: Some(
            clocks_pose
                .map_or(&snapshot.original, |pose| &pose.original)
                .clone(),
        ),
        received_from: Some(
            clocks_pose
                .map_or(&snapshot.confirmation, |pose| &pose.confirmation)
                .clone(),
        ),
    });
    let mut availability = Vec::with_capacity(2);
    let unchecked = snapshot
        .availability
        .as_ref()
        .map(|v| v.at)
        .into_iter()
        .chain(
            snapshot
                .pose_support
                .as_ref()
                .and_then(|pose| pose.availability.as_ref())
                .map(|v| v.at),
        )
        .reduce(f64::min);
    if let Some(at) = unchecked {
        availability.push(TemporalAvailability {
            reason: AvailabilityReason::Unchecked,
            at,
            fields: vec![0],
        });
    }
    if let Some(description) = description {
        let SensoryFacet::Body { body } = &snapshot.value else {
            return Err(ExecutionError::Invariant);
        };
        facets.push(TemporalCaptureFacet {
            value: ReceivedValueFragment::Sensory(SensoryFacet::Description {
                text: body.description.clone().unwrap_or_default(),
            }),
            preferred: None,
            reception: None,
            clock: ReceivedFieldClock {
                role: role(description.role),
                as_of: description.description_measured_through,
                measured_from: description.description_measured_from,
                measured_through: description.description_measured_through,
                acquired_at: description.description_acquired_at,
                confirmed_through: None,
            },
            member_index: None,
            track: None,
            support: Some(ReceivedFacetProof {
                original: description.original.clone(),
                confirmation: description.confirmation.clone(),
                confirmed_from: description.confirmed_from,
                confirmed_through: description.confirmed_through,
                aliases: description.aliases.clone(),
            }),
            detail_support: None,
            pose_frame: None,
            original: Some(description.original.clone()),
            received_from: Some(description.confirmation.clone()),
        });
        if let Some(availability_at) = &description.availability {
            availability.push(TemporalAvailability {
                reason: AvailabilityReason::Unchecked,
                at: availability_at.at,
                fields: vec![1],
            });
        }
    }
    let source_ids = std::iter::once(snapshot.original.source.id.clone())
        .chain(std::iter::once(snapshot.confirmation.id.clone()))
        .chain(snapshot.original_aliases.iter().flatten().cloned())
        .collect();
    let installed = Arc::clone(&core.state.installed);
    retain_capture(
        core,
        actor_id,
        TemporalCaptureInput {
            spatial_context: false,
            availability_at: None,
            coverage_gap: None,
            ended_fields: None,
            terminal_reservation_bytes: None,
            terminal_reservation_delta: None,
            received_at: None,
            received_order: None,
            // Even an empty availability array is supplied by this Source factory.
            availability: Some(availability),
            receiver_frame: None,
            subject: snapshot.exposure.track.clone(),
            context_subjects: None,
            subject_identity: snapshot.local_subject.clone(),
            change: TemporalChange::Baseline,
            required: false,
            source_ids,
            origin: None,
            facets,
        },
        false,
        &installed.attention.value().retention.optional,
        &installed.attention.value().retention,
        SupportEncoding::Snapshot,
        budget,
    )
}

/// A supplied historical receipt can be retained after its live recent window
/// closes. Its canonical capture remains the only source of values and proof;
/// the caller performs explicit privacy/source fencing before this operation.
pub(crate) fn retain_captured_support(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    capture: &crate::received::CapturedTemporalReceipt,
    required: bool,
    limits: &AccountRetentionLimits,
    budget: &ByteBudget,
) -> Result<Option<Arc<TemporalSupportRecord>>, ExecutionError> {
    let receipt = capture.receipt();
    if receipt.locator.actor_id != actor_id || receipt.facets.len() != capture.fragments().len() {
        return Ok(None);
    }
    let error = || ExecutionError::Capacity;
    let values_bytes = capture
        .fragments()
        .iter()
        .try_fold(0_usize, |sum, value| sum.checked_add(value.heap_bytes()?))
        .ok_or_else(error)?;
    let copied = receipt
        .heap_bytes()
        .and_then(|n| n.checked_add(values_bytes))
        .and_then(|n| n.checked_mul(5))
        .ok_or_else(error)?;
    // Each raw metadata view borrows its bytes. Only its bounded facet pointer
    // vector and one field map at a time are materialized by the serializer.
    let metadata = receipt
        .facets
        .len()
        .checked_mul(size_of::<&serde_json::value::RawValue>())
        .and_then(|n| {
            n.checked_add(crate::host::retained_size::map_storage::<
                &str,
                &serde_json::value::RawValue,
            >(16)?)
        })
        .ok_or_else(error)?;
    let _scratch = budget.reserve(
        copied
            .checked_add(metadata)
            .and_then(|n| {
                n.checked_add(receipt.facets.len().checked_mul(
                    size_of::<TemporalCaptureFacet>()
                        + size_of::<TemporalFacetReference>()
                        + size_of::<ReceivedValueFragment>(),
                )?)
            })
            .ok_or_else(error)?,
    )?;
    if !super::super::actor::ensure_temporal_actor(core, actor_id, budget)? {
        return Ok(None);
    }
    let mut facets = Vec::with_capacity(receipt.facets.len());
    for (field, value) in receipt.facets.iter().zip(capture.fragments()) {
        let value = if let (
            ReceivedValueFragment::BodyPose(pose),
            Some(TemporalReception::Location { .. }),
        ) = (value, &field.reception)
        {
            // A pose received as location expands into the same precise point
            // as Source before splitTemporalValue runs again.
            ReceivedValueFragment::Location(crate::received::values::LocationFragment {
                kind: crate::received::values::LocationKind::Location,
                location: crate::reception::ObservedLocation::Point {
                    point: crate::reception::ObservedPoint::World(pose.pose.position),
                    error_radius: 0.0,
                },
            })
        } else {
            value.clone()
        };
        facets.push(TemporalCaptureFacet {
            value,
            preferred: None,
            reception: field.reception.clone(),
            clock: field.clock.clone(),
            member_index: None,
            track: field.track.clone(),
            support: field.support.clone(),
            detail_support: field.detail_support.clone(),
            pose_frame: field.pose_frame.clone(),
            original: field.original.clone(),
            received_from: field.received_from.clone(),
        });
    }
    let mut ids = indexmap::IndexSet::with_capacity(receipt.header.source_ids.len() + 1);
    ids.insert(receipt.id.clone());
    ids.extend(receipt.header.source_ids.iter().cloned());
    let installed = Arc::clone(&core.state.installed);
    retain_capture(
        core,
        actor_id,
        TemporalCaptureInput {
            spatial_context: false,
            availability_at: None,
            coverage_gap: None,
            ended_fields: None,
            terminal_reservation_bytes: None,
            terminal_reservation_delta: None,
            received_at: None,
            received_order: None,
            availability: None,
            receiver_frame: None,
            subject: receipt.header.subject.clone(),
            context_subjects: None,
            subject_identity: receipt.header.subject_identity.clone(),
            change: TemporalChange::Baseline,
            required,
            source_ids: ids.into_iter().collect(),
            origin: None,
            facets,
        },
        required,
        limits,
        &installed.attention.value().retention,
        SupportEncoding::Captured {
            source: capture.support_payload(),
        },
        budget,
    )
}

fn retain_capture(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    input: TemporalCaptureInput,
    required: bool,
    limits: &AccountRetentionLimits,
    policy: &AttentionRetentionPolicy,
    encoding: SupportEncoding<'_>,
    budget: &ByteBudget,
) -> Result<Option<Arc<TemporalSupportRecord>>, ExecutionError> {
    let actor = core.state.temporal.actor(actor_id).ok_or_else(invalid)?;
    if actor.header().accounts.is_none() {
        return Err(ReceivedError(
            "Captured support requires complete personal account ownership.",
        )
        .into());
    }
    let epoch = actor.header().epoch.clone();
    let physical_life = actor.header().physical_life;
    let now = core.state.physical.header.sim_time;
    let sequence = core.state.physical.header.sequence;
    let batch_order = core
        .state
        .physical
        .identity
        .allocate("retained-support")?
        .sequence;
    let mut values = Vec::with_capacity(input.facets.len());
    let mut facets = Vec::with_capacity(input.facets.len());
    for (index, field) in input.facets.into_iter().enumerate() {
        let retained = retain_received_value(
            &mut core.state.reception.received_values,
            field.value.clone(),
            field.preferred.as_ref(),
            now,
            sequence,
            &mut core.state.physical.identity,
            &core.state.activity.display,
            budget,
        )?;
        let mut reception = field.reception;
        if let Some(TemporalReception::Body {
            pose: BodyReception::Reference { pose_ref },
        }) = &reception
        {
            let Some(ReceivedValueFragment::BodyPose(pose)) = core
                .state
                .reception
                .received_values
                .as_ref()
                .and_then(|values| values.value_at(pose_ref))
            else {
                return Err(ReceivedError("Captured support has no received body pose.").into());
            };
            reception = Some(TemporalReception::Body {
                pose: BodyReception::Pose {
                    pose: pose.pose.clone(),
                },
            });
        }
        values.push(field.value);
        facets.push(TemporalFacetReference {
            clock: field.clock,
            member_index: field.member_index.unwrap_or(index as u64),
            value_ref: retained.reference,
            track: field.track,
            original: field.original,
            received_from: field.received_from,
            support: field.support,
            detail_support: field.detail_support,
            pose_frame: field.pose_frame,
            reception,
        });
    }
    let locator = TemporalReceiptLocator {
        actor_id: actor_id.to_owned(),
        physical_life,
        epoch,
        batch_order,
        entry_index: 0,
    };
    let receipt = TemporalReceipt {
        header: ReceivedReceiptHeader {
            acquisition: batch_order,
            subject: input.subject,
            change: TemporalChange::RetainedState,
            spatial_context: None,
            source_ids: input.source_ids,
            subject_identity: input.subject_identity,
            context_subjects: None,
            availability: input.availability,
            availability_at: None,
            coverage_gap: None,
            ended_fields: None,
        },
        id: locator.id(),
        locator,
        at: now,
        order: core
            .journal
            .acquisitions
            .received_order(actor_id, &mut core.state.physical.identity)?,
        required,
        receiver_frame: None,
        origin: None,
        facets,
    };
    core.state
        .temporal
        .admit_support(
            actor_id,
            TemporalSupportCapsule {
                receipt: Arc::new(receipt),
                values: Arc::from(values),
                bytes: 0,
                required,
            },
            limits,
            &core.state.reception.received_values.as_ref(),
            now,
            policy,
            &mut core.journal.meters,
            None,
            encoding,
            budget,
        )
        .map_err(append_error)
}
