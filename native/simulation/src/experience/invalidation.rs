//! A real source selection for explicit privacy edits. Whole-account expansion
//! precedes any body pruning; one-way learning is applied only after the exact
//! temporal owner reports which sparse proof it actually released.

use super::privacy_prepare::ClosedPrivacyScope;
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{ReceivedValueFragment, ReceivedValues, TemporalAccountAliases};
use crate::reception::ReceivedValueLookup;
use crate::reception::{ObservationOrigin, ReceivedObservation, SensoryFacet};
use crate::simulation::SimulationState;
use std::mem::size_of;

pub(crate) struct PrivacySelection {
    pub actor_id: String,
    pub generation: String,
    pub accepted_cut: u64,
    pub privacy_revision: u64,
    pub roots: IndexSet<String>,
    pub affected: IndexSet<String>,
    aliases: TemporalAccountAliases,
    pub(crate) scope: ClosedPrivacyScope,
    _reservation: ByteReservation,
}
pub(crate) struct PrivacyConsequences {
    pub selection: PrivacySelection,
    pub recognition_affected: IndexSet<String>,
    pub revoked_facts: IndexSet<String>,
    pub retained_direct: IndexSet<String>,
    pub removals: Vec<PersonalSourceRef>,
    _reservation: ByteReservation,
}
fn invalid() -> ExecutionError {
    ExecutionError::Experience(ExperienceError::UnknownCoverage)
}
fn collection<'a>(
    state: &'a ExperienceState,
    actor: &str,
    kind: PersonalSourceKind,
) -> Result<Option<&'a PersonalSourceCollection>, ExecutionError> {
    let source = state.optional_collection(actor, kind)?;
    Ok(source)
}
fn claim_depends(
    original: &ReceivedObservation,
    values: &impl ReceivedValueLookup,
    affected: &IndexSet<String>,
) -> Result<bool, ExecutionError> {
    for facet in &original.facets {
        if facet.value.kind != "claim" {
            continue;
        }
        let Some(ReceivedValueFragment::Sensory(SensoryFacet::Claim {
            support,
            support_aliases,
            ..
        })) = values.value_at(&facet.value.reference)
        else {
            return Err(ExecutionError::Invariant);
        };
        if support
            .iter()
            .any(|fact| affected.contains(&fact.source.id))
            || support_aliases
                .iter()
                .flatten()
                .any(|alias| affected.contains(&alias.id))
        {
            return Ok(true);
        }
    }
    Ok(false)
}
pub(crate) fn prepare_privacy_selection(
    state: &SimulationState,
    actor: &str,
    source_ids: &[String],
    scope: ClosedPrivacyScope,
    budget: &ByteBudget,
) -> Result<PrivacySelection, ExecutionError> {
    let history = state.experience.actor(actor).ok_or_else(invalid)?;
    if !scope.matches(state, actor) {
        return Err(invalid());
    }
    let values = &state.reception.received_values.as_ref();
    let awareness = collection(&state.experience, actor, PersonalSourceKind::Awareness)?;
    let memories = collection(&state.experience, actor, PersonalSourceKind::Memory)?;
    let summaries = collection(&state.experience, actor, PersonalSourceKind::Summary)?;
    let original_owner = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(actor));
    let activities = state.activity.collections.get(actor);
    let mut bytes = heap_sum([
        size_of::<PrivacySelection>(),
        actor.len(),
        state.generation.len(),
        source_ids.iter().try_fold(
            source_ids
                .len()
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |sum, id| {
                sum.checked_add(id.capacity())
                    .ok_or(ExecutionError::Capacity)
            },
        )?,
        history
            .privacy
            .corrections
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    for source in [awareness, memories, summaries].into_iter().flatten() {
        for record in source.records() {
            bytes = bytes
                .checked_add(record.header.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?;
        }
    }
    for original in original_owner
        .into_iter()
        .flat_map(|owner| owner.received.iter())
    {
        bytes = bytes
            .checked_add(
                original
                    .as_ref()
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        for facet in &original.facets {
            if ["claim", "association", "physical-boundary"].contains(&facet.value.kind.as_str()) {
                bytes = bytes
                    .checked_add(
                        values
                            .value_at(&facet.value.reference)
                            .ok_or(ExecutionError::Invariant)?
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?;
            }
        }
    }
    for record in activities
        .into_iter()
        .flat_map(|owner| owner.records.values())
    {
        bytes = heap_sum([
            bytes,
            record.occurrence.id.len(),
            record
                .occurrence
                .result_evidence
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
    }
    let reservation = budget.reserve(bytes.checked_mul(16).ok_or(ExecutionError::Capacity)?)?;
    let mut aliases = state.temporal.resident_account_alias_index(
        actor,
        values,
        &state.installed.account_law(),
        budget,
    )?;
    let mut roots = source_ids.iter().cloned().collect::<IndexSet<_>>();
    aliases.expand(&mut roots)?;
    let mut affected = roots.clone();
    loop {
        let before = affected.len();
        aliases.expand(&mut affected)?;
        for record in awareness
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if affected.contains(&header.reference.id)
                || header
                    .source_receipt
                    .as_ref()
                    .is_some_and(|receipt| affected.contains(&receipt.id()))
                || header
                    .privacy
                    .primary_observation
                    .as_ref()
                    .is_some_and(|id| affected.contains(id))
            {
                affected.insert(header.reference.id.clone());
                affected.extend(header.owned_observations.iter().cloned());
            }
        }
        for record in memories
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if affected.contains(&header.reference.id)
                || header
                    .privacy_dependencies
                    .iter()
                    .any(|id| affected.contains(id))
            {
                affected.insert(header.reference.id.clone());
                affected.extend(header.owned_observations.iter().cloned());
            }
        }
        for original in original_owner
            .into_iter()
            .flat_map(|owner| owner.received.iter())
        {
            if matches!(&original.origin,ObservationOrigin::Occurrence{event_id,..} if affected.contains(event_id))
                || claim_depends(original, values, &affected)?
            {
                affected.insert(original.id.clone());
            }
        }
        for record in memories
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if header
                .event_id
                .as_ref()
                .is_some_and(|id| affected.contains(id))
                || header
                    .source_receipt
                    .as_ref()
                    .is_some_and(|receipt| affected.contains(&receipt.id()))
                || header
                    .activity_id
                    .as_ref()
                    .is_some_and(|id| affected.contains(id))
            {
                affected.insert(header.reference.id.clone());
            }
            if affected.contains(&header.reference.id) {
                affected.extend(
                    header
                        .activity_id
                        .iter()
                        .chain(header.event_id.iter())
                        .cloned(),
                );
            }
        }
        for record in activities
            .into_iter()
            .flat_map(|owner| owner.records.values())
        {
            let occurrence = &record.occurrence;
            if let Some(evidence) = &occurrence.result_evidence {
                let evidence = evidence.id();
                if affected.contains(&occurrence.id) {
                    affected.insert(evidence.clone());
                }
                if affected.contains(&evidence) {
                    affected.insert(occurrence.id.clone());
                }
            }
        }
        for (source, correction) in &history.privacy.corrections {
            if affected.contains(correction) {
                affected.insert(source.clone());
            }
        }
        for record in summaries
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if header
                .privacy_dependencies
                .iter()
                .any(|id| affected.contains(id))
            {
                affected.insert(header.reference.id.clone());
            }
        }
        if before == affected.len() {
            break;
        }
    }
    Ok(PrivacySelection {
        actor_id: actor.to_owned(),
        generation: state.generation.clone(),
        accepted_cut: state.accepted_cut,
        privacy_revision: history.privacy.revision(),
        roots,
        affected,
        aliases,
        scope,
        _reservation: reservation,
    })
}

fn edge(edges: &mut IndexMap<String, IndexSet<String>>, from: &str, to: &str) {
    edges
        .entry(from.to_owned())
        .or_default()
        .insert(to.to_owned());
}
/// The argument comes from the temporal mutation owner's actual released
/// source report. This continuation grants no receiver/cognition completion.
pub(crate) fn continue_privacy_selection(
    mut selection: PrivacySelection,
    state: &SimulationState,
    released_proofs: &[String],
    forget: bool,
    budget: &ByteBudget,
) -> Result<PrivacyConsequences, ExecutionError> {
    if selection.generation != state.generation || selection.accepted_cut != state.accepted_cut {
        return Err(ExecutionError::InvalidCheckpoint);
    }
    let actor = selection.actor_id.as_str();
    let history = state.experience.actor(actor).ok_or_else(invalid)?;
    let values = &state.reception.received_values.as_ref();
    let awareness = collection(&state.experience, actor, PersonalSourceKind::Awareness)?;
    let memories = collection(&state.experience, actor, PersonalSourceKind::Memory)?;
    let summaries = collection(&state.experience, actor, PersonalSourceKind::Summary)?;
    let original_owner = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(actor));
    let bytes = released_proofs.iter().try_fold(
        released_proofs
            .len()
            .checked_mul(size_of::<String>())
            .ok_or(ExecutionError::Capacity)?,
        |sum, id| sum.checked_add(id.len()).ok_or(ExecutionError::Capacity),
    )?;
    let reservation = budget.reserve(bytes.checked_mul(16).ok_or(ExecutionError::Capacity)?)?;
    // The selection's guard already funds these derived edges/facts from the
    // actual source headers and required original dependency fragments.
    let mut edges = IndexMap::<String, IndexSet<String>>::new();
    for source in [awareness, memories].into_iter().flatten() {
        for record in source.records() {
            let header = &record.header;
            for original in &header.privacy.learning_observations {
                edge(&mut edges, &header.reference.id, original);
                edge(&mut edges, original, &header.reference.id);
            }
            for source in &header.privacy.learning_sources {
                edge(&mut edges, source, &header.reference.id);
            }
        }
    }
    for original in original_owner
        .into_iter()
        .flat_map(|owner| owner.received.iter())
    {
        for field in &original.facets {
            let fragment = values
                .value_at(&field.value.reference)
                .ok_or(ExecutionError::Invariant)?;
            match fragment {
                ReceivedValueFragment::Sensory(SensoryFacet::Association {
                    learning_support,
                    ..
                }) => {
                    for source in state
                        .installed
                        .account_law()
                        .recognition_source_ids(learning_support.as_deref().unwrap_or(&[]))
                    {
                        edge(&mut edges, &source, &original.id);
                    }
                }
                ReceivedValueFragment::Sensory(SensoryFacet::PhysicalBoundary { boundary }) => {
                    for fact in [
                        &boundary.near_surface.support,
                        &boundary.far_surface.support,
                    ] {
                        edge(&mut edges, &fact.source.id, &original.id);
                    }
                }
                _ => {}
            }
        }
    }
    let mut recognition_affected = selection.affected.clone();
    recognition_affected.extend(released_proofs.iter().cloned());
    let mut position = 0;
    while position < recognition_affected.len() {
        if let Some(next) = edges.get(
            recognition_affected
                .get_index(position)
                .ok_or(ExecutionError::Invariant)?,
        ) {
            recognition_affected.extend(next.iter().cloned());
        }
        position += 1;
    }
    for record in summaries
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
    {
        if record
            .header
            .privacy_dependencies
            .iter()
            .any(|id| recognition_affected.contains(id))
        {
            selection
                .affected
                .insert(record.header.reference.id.clone());
        }
    }
    let mut revoked_facts = IndexSet::new();
    for source in [awareness, memories, summaries].into_iter().flatten() {
        for record in source.records() {
            for fact in &record.header.privacy.associations {
                if recognition_affected.contains(&fact.observation_id)
                    || fact
                        .learning_sources
                        .iter()
                        .any(|id| recognition_affected.contains(id))
                {
                    revoked_facts.insert(personal_fact_alias(&fact.observation_id, fact.ordinal)?);
                }
            }
        }
    }
    for original in original_owner
        .into_iter()
        .flat_map(|owner| owner.received.iter())
    {
        for (index, field) in original.facets.iter().enumerate() {
            if field.value.kind != "association" {
                continue;
            }
            let Some(ReceivedValueFragment::Sensory(SensoryFacet::Association {
                learning_support,
                ..
            })) = values.value_at(&field.value.reference)
            else {
                return Err(ExecutionError::Invariant);
            };
            if recognition_affected.contains(&original.id)
                || state
                    .installed
                    .account_law()
                    .recognition_source_ids(learning_support.as_deref().unwrap_or(&[]))
                    .iter()
                    .any(|id| recognition_affected.contains(id))
            {
                revoked_facts.insert(personal_fact_alias(
                    &original.id,
                    field.ordinal.unwrap_or(index as u64),
                )?);
            }
        }
    }
    let mut retained_direct = IndexSet::new();
    if forget {
        for (source, correction) in &history.privacy.corrections {
            if selection.affected.contains(correction) && !selection.roots.contains(source) {
                retained_direct.insert(source.clone());
            }
        }
        for record in awareness
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            if retained_direct.contains(&record.header.reference.id) {
                retained_direct.extend(record.header.privacy.direct_observations.iter().cloned());
            }
        }
        for record in memories
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if retained_direct.contains(&header.reference.id)
                || header
                    .event_id
                    .as_ref()
                    .is_some_and(|id| retained_direct.contains(id))
            {
                retained_direct.insert(header.reference.id.clone());
                retained_direct.extend(header.privacy.direct_observations.iter().cloned());
            }
        }
    }
    let mut removals = Vec::new();
    if forget {
        for record in awareness
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            if selection.affected.contains(&record.header.reference.id)
                && !retained_direct.contains(&record.header.reference.id)
            {
                removals.push(record.header.reference.clone());
            }
        }
        for record in memories
            .into_iter()
            .flat_map(PersonalSourceCollection::records)
        {
            let header = &record.header;
            if !header.unresolved_commitment
                && selection.affected.contains(&header.reference.id)
                && !retained_direct.contains(&header.reference.id)
            {
                removals.push(header.reference.clone());
            }
        }
    }
    for record in summaries
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
    {
        if selection.affected.contains(&record.header.reference.id)
            && (forget || !selection.roots.contains(&record.header.reference.id))
        {
            removals.push(record.header.reference.clone());
        }
    }
    Ok(PrivacyConsequences {
        selection,
        recognition_affected,
        revoked_facts,
        retained_direct,
        removals,
        _reservation: reservation,
    })
}
