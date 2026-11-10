//! Quiet recognition expiry uses the same identity retirement as voice learning.
//! Its saved deadline is independent of cold personal-account aging.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, retained_size::heap_sum};
use crate::received::TemporalState;
use crate::reception::{ReceivingMutation, ReceptionState};
use crate::simulation::{InstalledWorld, PhysicalState};
use std::mem::size_of;

fn expired_seed(
    identity: &crate::worlds::base_knowledge::ObserverIdentity,
    now: f64,
    duration: f64,
) -> bool {
    identity.seed_only == Some(true)
        && identity.voice.as_ref().is_some_and(|voice| {
            voice
                .samples
                .iter()
                .all(|sample| sample.at + duration <= now)
        })
}

pub(super) fn expire_seeds(
    physical: &mut PhysicalState,
    state: &mut ReceptionState,
    installed: &InstalledWorld,
    temporal: &mut TemporalState,
    journal: &mut RecognitionJournal,
    receiving: &mut ReceivingMutation<'_>,
    observer: &str,
) -> Result<(), ExecutionError> {
    let duration = installed.recognition.value().seed_seconds
        * installed.content.time_policy.normal_game_seconds_per_second;
    let now = physical.header.sim_time;
    let expired = |identity: &crate::worlds::base_knowledge::ObserverIdentity| {
        expired_seed(identity, now, duration)
    };
    let records = state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer));
    let mut count = 0usize;
    let mut bytes = 0usize;
    if let Some(records) = records {
        for (key, _) in records.iter().filter(|(_, identity)| expired(identity)) {
            count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
            bytes = heap_sum([bytes, size_of::<(usize, String)>(), key.len()])
                .ok_or(ExecutionError::Capacity)?;
        }
    }
    let _storage = receiving.budget.reserve(bytes)?;
    let mut keys = Vec::with_capacity(count);
    if let Some(records) = records {
        keys.extend(
            records
                .iter()
                .filter(|(_, identity)| expired(identity))
                .enumerate()
                .map(|(order, (key, _))| (order, key.clone())),
        );
    }
    // Source Object.entries visits integer keys first, then insertion order.
    // Native's guarded owner stores keys in insertion order, so apply its same
    // existing JavaScript property-order comparator before deleting them.
    keys.sort_unstable_by(|(a_order, a), (b_order, b)| {
        super::journal::property_order(a, b).then(a_order.cmp(b_order))
    });
    for (_, key) in keys {
        journal.retire(
            state,
            temporal,
            observer,
            &key,
            now,
            &installed.attention.value().retention,
            physical,
            installed,
            receiving,
        )?;
    }
    Ok(())
}

pub(crate) fn maintain_recognition(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let now = core.state.physical.header.sim_time;
    if !core
        .state
        .temporal
        .actor(observer)
        .and_then(|actor| actor.header().accounts.as_ref())
        .and_then(|accounts| accounts.knowledge_due)
        .is_some_and(|due| due <= now)
    {
        return Ok(());
    }
    let installed = core.state.installed.clone();
    let duration = installed.recognition.value().seed_seconds
        * installed.content.time_policy.normal_game_seconds_per_second;
    let correspondence = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .is_some_and(|records| {
            records
                .values()
                .any(|identity| expired_seed(identity, now, duration))
        });
    if correspondence
        && core
            .state
            .physical
            .entities
            .get(observer)
            .is_some_and(|actor| actor.has_memory())
        && core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .is_some_and(|owner| owner.attention.is_some())
    {
        // Source's correspondence lifetime first opens the current sequence's
        // received prefix. Reuse that owner before capturing old/new cohorts.
        core.journal.originals.ensure_owner(
            &mut core.state.reception,
            core.state
                .physical
                .entities
                .get(observer)
                .ok_or(ExecutionError::MissingActor)?,
            core.state.physical.header.sequence,
        )?;
    }
    let mut receiving = ReceivingMutation {
        experience: &core.state.experience,
        cognition: &mut core.journal.cognition,
        current: &mut core.journal.current,
        acquisitions: &mut core.journal.acquisitions,
        meters: &mut core.journal.meters,
        budget,
    };
    expire_seeds(
        &mut core.state.physical,
        &mut core.state.reception,
        &installed,
        &mut core.state.temporal,
        &mut core.journal.recognition,
        &mut receiving,
        observer,
    )?;
    let due = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .into_iter()
        .flat_map(|records| records.iter())
        .filter_map(|(_, identity)| {
            super::journal::recognition_seed_deadline(
                identity,
                installed.recognition.value(),
                installed.content.time_policy.normal_game_seconds_per_second,
            )
        })
        .reduce(f64::min);
    core.state.temporal.set_knowledge_due(observer, due)?;
    Ok(())
}
