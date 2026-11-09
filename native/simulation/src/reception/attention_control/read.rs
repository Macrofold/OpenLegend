//! Read the actual attention owner using the same candidate computation as
//! selection. Presentation never acknowledges those candidates or renews them.

use super::*;
use crate::host::{ByteBudget, ByteReservation};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Presentation<'a> {
    key: &'a str,
    description_revision: &'a str,
    change_revision: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    point: Option<AttentionPoint>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Cue<'a> {
    id: String,
    anchor_key: &'a str,
    source_id: &'a str,
    description_revision: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    subject: Option<&'a ObserverSubject>,
    family: AttentionRelationFamily,
    generation: u64,
    proof: &'a [ObservationFactKey],
    at: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    entries: &'a [AttentionEntry],
    candidates: &'a IndexMap<String, AttentionCandidate>,
    presentations: &'a [Presentation<'a>],
    cues: &'a [Cue<'a>],
}

pub(crate) fn capture_attention_read(
    state: &crate::simulation::SimulationState,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), crate::execution::ExecutionError> {
    let mut scratch = CurrentJournal::new(budget)?;
    let attention = owner(&state.reception, observer).and_then(|owner| owner.attention.as_ref());
    let candidates = if let Some(attention) = attention {
        build_candidates(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            observer,
            attention,
            None,
            &mut scratch,
        )?
    } else {
        IndexMap::new()
    };
    let latches = attention.map_or(0, |state| state.latches.len());
    scratch.reserve_growth(
        candidates
            .len()
            .checked_mul(size_of::<Presentation<'_>>())
            .and_then(|n| n.checked_add(latches.checked_mul(size_of::<Cue<'_>>())?))
            .ok_or_else(capacity)?,
    )?;
    let mut presentations = Vec::new();
    presentations
        .try_reserve_exact(candidates.len())
        .map_err(|_| capacity())?;
    let scope = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?;
    for (key, candidate) in &candidates {
        let scope = scope.as_ref().ok_or_else(invalid)?;
        let body = scope
            .attention_source(
                &candidate.annotation.source_id,
                &candidate.annotation.lease_id,
            )?
            .ok_or_else(invalid)?;
        presentations.push(Presentation {
            key,
            description_revision: &candidate.description_revision,
            change_revision: &candidate.change_revision,
            // Source presentation selects the channel without narrowing the
            // exposure; an ambiguous current location therefore stays absent.
            point: current_point(
                scope,
                &candidate.annotation.source_id,
                CurrentFacetSelector {
                    channel: Some(&body.grant.channel),
                    ..Default::default()
                },
                &mut scratch,
            )?,
        });
    }
    let mut cues = Vec::new();
    cues.try_reserve_exact(latches).map_err(|_| capacity())?;
    let life = owner(&state.reception, observer).map_or(0, |owner| owner.life);
    scratch.reserve_growth(64)?;
    let self_revision = json_record(&("self", life)).map_err(|_| invalid())?;
    if let Some(attention) = attention {
        let mut ordered: Vec<_> = Vec::new();
        scratch.reserve_growth(
            latches
                .checked_mul(size_of::<(&String, &AttentionRelationLatch)>())
                .ok_or_else(capacity)?,
        )?;
        ordered.try_reserve_exact(latches).map_err(|_| capacity())?;
        ordered.extend(attention.latches.iter());
        ordered.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
        for (key, latch) in ordered {
            let (Some(proof), Some(at)) = (&latch.entry_proof, latch.entered_at) else {
                continue;
            };
            if !latch.active {
                continue;
            }
            let (source_id, description_revision, subject) =
                if latch.anchor_key == SELF_RELATION_KEY {
                    (observer, self_revision.as_str(), None)
                } else if let Some(candidate) = candidates.get(&latch.anchor_key) {
                    (
                        candidate.annotation.source_id.as_str(),
                        candidate.description_revision.as_str(),
                        candidate.subject.as_ref(),
                    )
                } else {
                    continue;
                };
            scratch.reserve_growth(
                key.len()
                    .checked_mul(6)
                    .and_then(|n| n.checked_add(64))
                    .ok_or_else(capacity)?,
            )?;
            cues.push(Cue {
                id: json_record(&(key, latch.generation)).map_err(|_| invalid())?,
                anchor_key: &latch.anchor_key,
                source_id,
                description_revision,
                subject,
                family: latch.family,
                generation: latch.generation,
                proof,
                at,
            });
        }
    }
    let product = Product {
        entries: attention.map_or(&[], |attention| attention.entries.as_slice()),
        candidates: &candidates,
        presentations: &presentations,
        cues: &cues,
    };
    let length = crate::encoding::json_record_len(&product)
        .map_err(|_| crate::execution::ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        length
            .checked_mul(2)
            .ok_or(crate::execution::ExecutionError::Capacity)?,
    )?;
    let json = crate::encoding::json_record(&product)
        .map_err(|_| crate::execution::ExecutionError::Invariant)?;
    storage.resize(json.capacity())?;
    Ok((json, storage))
}
