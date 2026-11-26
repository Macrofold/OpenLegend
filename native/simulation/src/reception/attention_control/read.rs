//! Read the actual attention owner using the same candidate computation as
//! selection. Presentation never acknowledges those candidates or renews them.

use super::*;
use crate::encoding::json_record_len;
use crate::host::{ByteBudget, ByteReservation};
use serde::Serialize;

/// These exact same presentations feed the read's JSON and its opaque response
/// ticket. Formatting never reconstructs an acknowledgment from an encoded row.
pub(crate) struct CapturedAttentionPresentations {
    pub(crate) entries: Vec<AttentionPresentation>,
    _storage: ByteReservation,
}
pub(crate) struct CapturedAttentionRead {
    pub(crate) bridge: Option<AttentionBridgeRead>,
    pub(crate) has_unpresented_description: bool,
    pub(crate) cue_inputs_token: String,
    pub(crate) semantic_causes: CapturedSemanticCauses,
    _storage: ByteReservation,
}
#[derive(Clone, Copy)]
pub(crate) enum AttentionReadProduct {
    Cues,
    Schedule,
    Bridge,
}
pub(crate) struct AttentionBridgeRead {
    pub(crate) json: String,
    pub(crate) presentations: CapturedAttentionPresentations,
    _storage: ByteReservation,
}
/// Native-origin scheduling causes retain their actual source roster. Model
/// output and copied JSON cannot create one for a response acknowledgment.
pub(crate) struct CapturedSemanticCauses {
    values: Vec<crate::response::ResponseSemanticCause>,
    _storage: ByteReservation,
}
impl CapturedSemanticCauses {
    pub(crate) fn values(&self) -> &[crate::response::ResponseSemanticCause] {
        &self.values
    }

    pub(crate) fn copy_all(
        &self,
        budget: &ByteBudget,
    ) -> Result<
        (Vec<crate::response::ResponseSemanticCause>, ByteReservation),
        crate::execution::ExecutionError,
    > {
        let bytes = self.values.iter().try_fold(
            self.values
                .len()
                .checked_mul(size_of::<crate::response::ResponseSemanticCause>())
                .ok_or(crate::execution::ExecutionError::Capacity)?,
            |n, value| {
                n.checked_add(value.key.len())
                    .and_then(|n| n.checked_add(value.qualitative_revision.len()))
                    .ok_or(crate::execution::ExecutionError::Capacity)
            },
        )?;
        let storage = budget.reserve(bytes)?;
        Ok((self.values.clone(), storage))
    }
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
    presentations: &'a [AttentionPresentation],
    cues: &'a [Cue<'a>],
}

fn presentation_inputs<'a>(
    state: &'a crate::simulation::SimulationState,
    observer: &str,
    scratch: &mut CurrentJournal,
) -> Result<
    (
        Option<&'a AttentionState>,
        IndexMap<String, AttentionCandidate>,
    ),
    crate::execution::ExecutionError,
> {
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
            scratch,
        )?
    } else {
        IndexMap::new()
    };
    Ok((attention, candidates))
}

pub(crate) fn capture_attention_presentations(
    state: &crate::simulation::SimulationState,
    observer: &str,
    budget: &ByteBudget,
) -> Result<CapturedAttentionPresentations, crate::execution::ExecutionError> {
    let mut scratch = CurrentJournal::new(budget)?;
    let (attention, candidates) = presentation_inputs(state, observer, &mut scratch)?;
    prepare_presentations(
        state,
        observer,
        attention,
        &candidates,
        budget,
        &mut scratch,
    )
}

fn prepare_presentations(
    state: &crate::simulation::SimulationState,
    observer: &str,
    attention: Option<&AttentionState>,
    candidates: &IndexMap<String, AttentionCandidate>,
    budget: &ByteBudget,
    scratch: &mut CurrentJournal,
) -> Result<CapturedAttentionPresentations, crate::execution::ExecutionError> {
    let presentation_bytes = candidates.iter().try_fold(
        candidates
            .len()
            .checked_mul(size_of::<AttentionPresentation>())
            .ok_or_else(capacity)?,
        |n, (key, candidate)| {
            heap_sum([
                n,
                key.len(),
                candidate.description_revision.len(),
                candidate.change_revision.len(),
            ])
            .ok_or_else(capacity)
        },
    )?;
    let mut presentation_storage = budget.reserve(presentation_bytes)?;
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
    for (key, candidate) in candidates {
        let scope = scope.as_ref().ok_or_else(invalid)?;
        let body = scope
            .attention_source(
                &candidate.annotation.source_id,
                &candidate.annotation.lease_id,
            )?
            .ok_or_else(invalid)?;
        // A scoped point can own its support ID. Fund that exact clone before
        // transferring it into the detached presentation alongside its strings.
        let point = current_point(
            scope,
            &candidate.annotation.source_id,
            CurrentFacetSelector {
                channel: Some(&body.grant.channel),
                ..Default::default()
            },
            scratch,
        )?;
        presentation_storage.resize(
            presentation_storage
                .bytes()
                .checked_add(point.heap_bytes().ok_or_else(capacity)?)
                .ok_or_else(capacity)?,
        )?;
        presentations.push(AttentionPresentation {
            key: key.clone(),
            selected: attention
                .is_some_and(|attention| attention.entries.iter().any(|entry| &entry.key == key)),
            description_revision: candidate.description_revision.clone(),
            change_revision: candidate.change_revision.clone(),
            // Source presentation selects the channel without narrowing the
            // exposure; an ambiguous current location therefore stays absent.
            point,
        });
    }
    Ok(CapturedAttentionPresentations {
        entries: presentations,
        _storage: presentation_storage,
    })
}

/// Prepare current causes and their exact scheduling witness. The scheduler
/// needs only a discovery flag. The actual bridge projects and encodes the view.
pub(crate) fn capture_attention_read(
    state: &crate::simulation::SimulationState,
    observer: &str,
    budget: &ByteBudget,
    output: AttentionReadProduct,
) -> Result<CapturedAttentionRead, crate::execution::ExecutionError> {
    let mut scratch = CurrentJournal::new(budget)?;
    let (attention, candidates) = presentation_inputs(state, observer, &mut scratch)?;
    let latches = attention.map_or(0, |state| state.latches.len());
    scratch.reserve_growth(
        latches
            .checked_mul(size_of::<Cue<'_>>())
            .ok_or_else(capacity)?,
    )?;
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
    struct CueInputs<'a>(&'a [Cue<'a>]);
    impl serde::Serialize for CueInputs<'_> {
        fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            use serde::ser::SerializeSeq;
            let mut out = s.serialize_seq(Some(self.0.len()))?;
            for cue in self.0 {
                out.serialize_element(&(&cue.id, cue.description_revision))?;
            }
            out.end()
        }
    }
    let cue_length = json_record_len(&CueInputs(&cues)).map_err(|_| invalid())?;
    scratch.reserve_growth(cue_length.checked_mul(2).ok_or_else(capacity)?)?;
    let cue_json = json_record(&CueInputs(&cues)).map_err(|_| invalid())?;
    let storage = budget.reserve(64).map_err(|_| capacity())?;
    let cue_inputs_token = crate::encoding::sha256_hex(cue_json.as_bytes());
    drop(cue_json);
    let actor = state
        .physical
        .entities
        .get(observer)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(crate::execution::ExecutionError::MissingActor)?;
    let purpose_bytes = actor
        .agency
        .plan
        .as_ref()
        .map_or(0, |plan| plan.id.len())
        .max(actor.action.as_ref().map_or(0, |action| action.id.len()))
        .checked_mul(6)
        .and_then(|n| n.checked_add(64))
        .ok_or_else(capacity)?;
    let _purpose = budget.reserve(purpose_bytes).map_err(|_| capacity())?;
    let purpose = crate::execution::occupied_purpose(actor)?;
    let cause_bytes = cues.iter().try_fold(
        cues.len()
            .checked_mul(size_of::<crate::response::ResponseSemanticCause>())
            .ok_or_else(capacity)?,
        |n, cue| {
            heap_sum([
                n,
                cue.anchor_key.len().checked_mul(12).ok_or_else(capacity)?,
                128,
                cue.description_revision.len(),
            ])
            .ok_or_else(capacity)
        },
    )?;
    let mut cause_storage = budget.reserve(cause_bytes).map_err(|_| capacity())?;
    let mut causes = Vec::with_capacity(cues.len());
    let severity = state.installed.attention.value().urgent_cue;
    for cue in &cues {
        let key = json_record(&(cue.anchor_key, cue.family)).map_err(|_| invalid())?;
        let resolved = actor.agency.semantic.as_ref().is_some_and(|state| {
            state.resolved.get(&key).is_some_and(|resolved| {
                resolved.interval == state.interval
                    && resolved.purpose == purpose
                    && resolved.qualitative_revision == cue.description_revision
                    && resolved.severity >= severity
            })
        });
        if !resolved {
            causes.push(crate::response::ResponseSemanticCause {
                key,
                qualitative_revision: cue.description_revision.to_owned(),
                severity,
                generation: cue.generation,
            });
        }
    }
    cause_storage
        .resize(causes.heap_bytes().ok_or_else(capacity)?)
        .map_err(|_| capacity())?;
    let has_unpresented_description = matches!(output, AttentionReadProduct::Schedule)
        && candidates.values().any(|candidate| {
            candidate.annotation.presented_description.as_deref()
                != Some(candidate.description_revision.as_str())
        });
    let bridge = if matches!(output, AttentionReadProduct::Bridge) {
        let presentations =
            prepare_presentations(state, observer, attention, &candidates, budget, &mut scratch)?;
        let product = Product {
            entries: attention.map_or(&[], |attention| attention.entries.as_slice()),
            candidates: &candidates,
            presentations: &presentations.entries,
            cues: &cues,
        };
        let length = json_record_len(&product).map_err(|_| invalid())?;
        let mut packet = budget.reserve(length.checked_mul(2).ok_or_else(capacity)?)?;
        let json = json_record(&product).map_err(|_| invalid())?;
        packet.resize(json.capacity())?;
        Some(AttentionBridgeRead {
            json,
            presentations,
            _storage: packet,
        })
    } else {
        None
    };
    Ok(CapturedAttentionRead {
        bridge,
        has_unpresented_description,
        cue_inputs_token,
        semantic_causes: CapturedSemanticCauses {
            values: causes,
            _storage: cause_storage,
        },
        _storage: storage,
    })
}
