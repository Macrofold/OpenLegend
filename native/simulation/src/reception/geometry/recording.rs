//! Each acquired physical feature owns its own availability boundary. The
//! exposure is provenance, never an alias that merges separate feature lives.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::HeapBytes;
use crate::received::{
    CoverageGap, CurrentMemberPart, ObservationCaptureOptions, TemporalAppendError,
    TemporalCaptureInput, TemporalChange, TemporalCurrentGroupCheckpoint, terminal_member_bytes,
};

fn invalid() -> ExecutionError {
    crate::received::ReceivedError("Geometry recording has no actual matching temporal owner.")
        .into()
}
fn temporal_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(e) => e.into(),
        TemporalAppendError::Work(e) => ExecutionError::Work(e),
    }
}
pub(super) fn close_geometry_feature(
    core: &mut CoreMutation<'_>,
    observer: &str,
    observation: &ObservationContribution,
    mark: Option<&TemporalCurrentGroupCheckpoint>,
    through: f64,
    reason: TemporalChange,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(mark) = mark.filter(|m| !m.gap) else {
        return Ok(());
    };
    let _reservation = budget.reserve(
        mark.members.heap_bytes().ok_or(ExecutionError::Capacity)?
            + observation.id.len()
            + std::mem::size_of::<TemporalCaptureInput>(),
    )?;
    let terminal = mark
        .terminal_bytes
        .checked_mul(mark.members.len() as u64)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    let input = TemporalCaptureInput {
        spatial_context: true,
        availability_at: None,
        coverage_gap: Some(CoverageGap {
            from: mark.last_at.max(through),
            through: core.state.physical.header.sim_time,
        }),
        ended_fields: Some(
            mark.members
                .iter()
                .map(|m| (m.kind.clone(), m.part))
                .collect(),
        ),
        terminal_reservation_bytes: Some(terminal),
        terminal_reservation_delta: None,
        received_at: None,
        received_order: None,
        availability: None,
        receiver_frame: None,
        subject: observation.id.clone(),
        context_subjects: None,
        subject_identity: None,
        change: if reason == TemporalChange::RetainedState {
            TemporalChange::Unchecked
        } else {
            reason
        },
        required: false,
        source_ids: Vec::new(),
        origin: None,
        facets: Vec::new(),
    };
    let policy = &core.state.installed.attention.value().retention;
    core.journal.acquisitions.append_receipt(
        &mut core.state.temporal,
        core.state
            .reception
            .received_values
            .as_mut()
            .ok_or_else(invalid)?,
        &mut core.state.physical.identity,
        &crate::worlds::InstalledEvidenceMeaning,
        &mut core.journal.meters,
        observer,
        observation.observer.physical_life,
        core.state.physical.header.sim_time,
        core.state.physical.header.sequence,
        input,
        &policy.recent,
        policy.maintenance_headroom,
    )?;
    core.state
        .temporal
        .release_terminal_reservation(observer, terminal)?;
    Ok(())
}
pub(super) fn record_geometry(
    core: &mut CoreMutation<'_>,
    observer: &str,
    state: &mut ReceivedGeometryState,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if !crate::received::ensure_temporal_actor(core, observer, budget)? {
        return Ok(());
    }
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
    let actor = core
        .state
        .temporal
        .actor(observer)
        .filter(|a| a.header().physical_life == life)
        .ok_or_else(invalid)?;
    let _reservation = budget.reserve(
        state.heap_bytes().ok_or(ExecutionError::Capacity)?
            + actor.header().epoch.len()
            + observer.len(),
    )?;
    for (observation, recording) in state
        .fragments
        .iter_mut()
        .map(|f| (&f.observation, &mut f.recording))
        .chain(
            state
                .boundaries
                .iter_mut()
                .map(|f| (&f.observation, &mut f.recording)),
        )
    {
        let actor = core.state.temporal.actor(observer).ok_or_else(invalid)?;
        if let Some(prior) = recording.as_ref() {
            if prior.last_source.id == observation.id
                && prior.last_measurement_revision == observation.revision
                && (!prior.gap
                    || prior.refused_at.is_some_and(|r| {
                        actor.header().bytes + actor.header().terminal_reserved_bytes >= r[0]
                            && actor.header().count >= r[1]
                    }))
            {
                continue;
            }
        }
        let members: Vec<_> = observation
            .facets
            .iter()
            .map(|f| (f.value.kind().to_owned(), CurrentReceivedPart::Value))
            .collect();
        let terminal = match recording.as_ref() {
            Some(p) => p.terminal_bytes,
            None => {
                terminal_member_bytes(observer, &actor.header().epoch, &observation.id, &members)?
            }
        };
        let held = terminal
            .checked_mul(members.len() as u64)
            .ok_or_else(invalid)?;
        let prior = recording
            .as_ref()
            .filter(|p| !p.gap)
            .map_or(0, |p| p.terminal_bytes * p.members.len() as u64);
        let delta = i64::try_from(i128::from(held) - i128::from(prior)).map_err(|_| invalid())?;
        let epoch = actor.header().epoch.clone();
        let change = if recording.as_ref().is_some_and(|p| !p.gap) {
            TemporalChange::Change
        } else {
            TemporalChange::Baseline
        };
        let policy = &core.state.installed.attention.value().retention;
        let lease = core
            .journal
            .acquisitions
            .begin_received(observer, life, None)?;
        let mut loan = core.journal.acquisitions.loan(
            lease,
            &core.state.temporal,
            &policy.recent,
            policy.maintenance_headroom,
        )?;
        let result = match loan.parts() {
            Some((prepared, order)) => prepared.capture_observation(
                &mut core.state.temporal,
                core.state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or_else(invalid)?,
                &mut core.state.physical.identity,
                order,
                &crate::worlds::InstalledEvidenceMeaning,
                &mut core.journal.meters,
                core.state.physical.header.sim_time,
                core.state.physical.header.sequence,
                observation,
                std::slice::from_ref(&observation.id),
                false,
                ObservationCaptureOptions {
                    subject: Some(&observation.id),
                    change: Some(change),
                    confirmed_through: Some(state.supported_through),
                    terminal_reservation_delta: Some(delta),
                    ..Default::default()
                },
            ),
            None => return Err(invalid()),
        };
        core.journal.acquisitions.return_loan(loan)?;
        let locator = result.map_err(temporal_error)?;
        retirement::finish_received(core, lease)?;
        if locator.is_none() && recording.as_ref().is_some_and(|p| !p.gap) {
            close_geometry_feature(
                core,
                observer,
                observation,
                recording.as_ref(),
                state.supported_through,
                TemporalChange::RecordingGap,
                budget,
            )?;
        }
        let actor = core.state.temporal.actor(observer).ok_or_else(invalid)?;
        let (bytes, count) = core.journal.acquisitions.pending_charge(observer)?;
        *recording = Some(TemporalCurrentGroupCheckpoint {
            epoch,
            members: members
                .into_iter()
                .map(|(kind, part)| CurrentMemberPart { kind, part })
                .collect(),
            content: Vec::new(),
            last_source: EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                id: observation.id.clone(),
                revision: SourceRevision::Number(observation.revision),
                observer: observation.observer.clone(),
            },
            last_at: core.state.physical.header.sim_time,
            last_measurement_revision: observation.revision,
            terminal_bytes: terminal,
            gap: locator.is_none(),
            refused_at: locator.is_none().then_some([
                actor.header().bytes + actor.header().terminal_reserved_bytes + bytes,
                actor.header().count + count,
            ]),
        });
    }
    Ok(())
}
pub(super) fn end_geometry(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let prior = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|o| o.get(observer))
        .and_then(|o| o.geometry.as_ref());
    let Some(prior) = prior else { return Ok(()) };
    let _reservation = budget.reserve(prior.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    let prior = prior.clone();
    for (observation, recording) in prior
        .fragments
        .iter()
        .map(|f| (&f.observation, &f.recording))
        .chain(
            prior
                .boundaries
                .iter()
                .map(|f| (&f.observation, &f.recording)),
        )
    {
        close_geometry_feature(
            core,
            observer,
            observation,
            recording.as_ref(),
            prior.supported_through,
            TemporalChange::Loss,
            budget,
        )?;
    }
    core.journal
        .current
        .end_geometry(&mut core.state.reception, observer)?;
    attention_control::dirty_attention_relations(
        &core.state.physical,
        &mut core.state.reception,
        &mut core.journal.current,
        observer,
        &[crate::attention::AttentionRelationFamily::ClosingDrop],
    )?;
    Ok(())
}
