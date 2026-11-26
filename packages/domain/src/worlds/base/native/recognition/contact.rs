//! Actual received contact credits an existing local individual. Reading a
//! scene or waiting for its deadline cannot create this source-owned root.
use super::*;
use crate::encoding::{json_record, json_record_len};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRanks, CollationRequest};
use crate::received::ReceivedError;
use crate::reception::ObserverSubject;
use std::mem::size_of;
fn invalid() -> ReceivedError {
    ReceivedError("Received familiarity contact lost its actual individual or support.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Received familiarity contact exceeds native byte allowance.")
}
pub(super) struct ContactInput<'a> {
    pub source_key: &'a str,
    pub at: f64,
    pub order: u64,
    pub support: &'a [String],
}
pub(super) fn contact_candidate(
    previous: &crate::worlds::InstalledObserverIdentity,
    input: ContactInput<'_>,
    now: f64,
    policy: &RecognitionPolicy,
    scale: f64,
    ranks: &CollationRanks,
) -> Result<Option<crate::worlds::InstalledObserverIdentity>, ReceivedError> {
    if previous.individual_id.is_none() || previous.seed_only == Some(true) {
        return Ok(None);
    }
    let key = json_record(&("contact", input.source_key, input.at)).map_err(|_| invalid())?;
    if !valid_support_key(input.source_key)
        || recognition_support_sources(&[input.source_key.to_owned()]).is_empty()
        || input.support.iter().any(|key| !valid_support_key(key))
        || !input.at.is_finite()
        || input.at < 0.0
        || input.at > now
        || input.order > crate::identity::MAX_SAFE_INTEGER
    {
        return Err(invalid());
    }
    if previous.familiarity.as_ref().is_some_and(|state| {
        state.next_credit_at.is_some_and(|next| input.at < next)
            || state.roots.iter().any(|r| r.key == key)
    }) {
        return Ok(None);
    }
    let mut candidate = previous.clone();
    let state = candidate
        .familiarity
        .get_or_insert_with(|| FamiliarityState {
            roots: Vec::new(),
            authored: None,
            last_credit_at: None,
            next_credit_at: None,
            fast_credits: 0,
        });
    let mut support = Vec::with_capacity(input.support.len() + 1);
    support.push(input.source_key.to_owned());
    for key in input.support {
        if !support.contains(key) {
            support.push(key.clone())
        }
    }
    state.roots.push(FamiliarityRoot {
        key,
        source_key: input.source_key.into(),
        at: input.at,
        order: input.order,
        support,
        required: false,
        credited: true,
    });
    let mut roots = std::mem::take(&mut state.roots)
        .into_iter()
        .map(|root| {
            let rank = ranks.rank(&root.key).map_err(|_| invalid())?;
            Ok((root, rank))
        })
        .collect::<Result<Vec<_>, ReceivedError>>()?;
    roots.sort_by(|(a, ar), (b, br)| {
        b.required
            .cmp(&a.required)
            .then_with(|| b.at.total_cmp(&a.at))
            .then_with(|| b.order.cmp(&a.order))
            .then_with(|| ar.cmp(br))
    });
    state.roots = roots
        .into_iter()
        .take(policy.familiarity_roots as usize)
        .map(|(root, _)| root)
        .collect();
    state.fast_credits = 6.min(state.fast_credits + 1);
    state.last_credit_at = Some(input.at);
    state.next_credit_at = Some(
        input.at
            + if state.fast_credits < 6 {
                policy.credit_seconds * scale
            } else {
                policy.familiarity_mature_seconds
            },
    );
    Ok(Some(candidate))
}
pub(crate) struct AttentionContactPreparation {
    observer: String,
    life: u64,
    revision: u64,
    key: String,
    previous: crate::worlds::InstalledObserverIdentity,
    source: String,
    at: f64,
    order: u64,
    support: Vec<String>,
    comparisons: CollationRequest,
    _reservation: ByteReservation,
}
impl AttentionContactPreparation {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        observer: &str,
        subject: &ObserverSubject,
        source: &str,
        at: f64,
        order: u64,
        support: &[String],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ReceivedError> {
        let law = core.state.installed.account_law();
        let Some((key, identity)) =
            law.attention_identity(&core.state.reception, observer, Some(subject))
        else {
            return Ok(None);
        };
        if identity.individual_id.is_none() || identity.seed_only == Some(true) {
            return Ok(None);
        }
        let contact_len = json_record_len(&("contact", source, at)).map_err(|_| invalid())?;
        let bytes = heap_sum([
            size_of::<Self>(),
            observer.len(),
            key.len(),
            identity
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(4)
                .ok_or_else(capacity)?,
            source.len().checked_mul(5).ok_or_else(capacity)?,
            support
                .iter()
                .try_fold(
                    support
                        .len()
                        .checked_mul(size_of::<String>())
                        .ok_or_else(capacity)?,
                    |sum, key| sum.checked_add(key.len()).ok_or_else(capacity),
                )?
                .checked_mul(4)
                .ok_or_else(capacity)?,
            contact_len.checked_mul(4).ok_or_else(capacity)?,
            8 * size_of::<FamiliarityRoot>(),
        ])
        .ok_or_else(capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let contact = json_record(&("contact", source, at)).map_err(|_| invalid())?;
        let comparisons = CollationRequest::prepare(
            binding,
            identity
                .familiarity
                .iter()
                .flat_map(|s| s.roots.iter().map(|r| r.key.as_str()))
                .chain(std::iter::once(contact.as_str())),
            budget,
        )
        .map_err(|_| invalid())?;
        Ok(Some(Self {
            observer: observer.into(),
            life: core
                .state
                .physical
                .entities
                .get(observer)
                .and_then(|e| e.physical_life())
                .ok_or_else(invalid)?,
            revision: core
                .state
                .reception
                .knowledge_revisions
                .as_ref()
                .and_then(|m| m.get(observer))
                .copied()
                .unwrap_or(0),
            key: key.into(),
            previous: identity.clone(),
            source: source.into(),
            at,
            order,
            support: support.to_vec(),
            comparisons,
            _reservation: reservation,
        }))
    }
    pub(crate) fn comparisons(&self) -> &CollationRequest {
        &self.comparisons
    }
    pub(crate) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: &CollationAnswer,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if core
            .state
            .physical
            .entities
            .get(&self.observer)
            .and_then(|e| e.physical_life())
            != Some(self.life)
            || core
                .state
                .reception
                .knowledge_revisions
                .as_ref()
                .and_then(|m| m.get(&self.observer))
                .copied()
                .unwrap_or(0)
                != self.revision
        {
            return Err(invalid().into());
        }
        let ranks = self.comparisons.finish(answer).map_err(|_| invalid())?;
        let Some(candidate) = contact_candidate(
            &self.previous,
            ContactInput {
                source_key: &self.source,
                at: self.at,
                order: self.order,
                support: &self.support,
            },
            core.state.physical.header.sim_time,
            core.state.installed.recognition.value(),
            core.state
                .installed
                .content
                .time_policy
                .normal_game_seconds_per_second,
            &ranks,
        )?
        else {
            return Ok(false);
        };
        super::retention::commit_observer_identity(
            core,
            &self.observer,
            &self.key,
            candidate,
            budget,
        )
    }
}
