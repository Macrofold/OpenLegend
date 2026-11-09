//! A proved body/voice correspondence transfers actual local contact roots.
//! It never treats a routing entity ID as personal identity or extra credit.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRequest};
use crate::reception::{
    CurrentBodyReadScope, CurrentFacetSelector, EvidenceFamily, EvidenceSource, Modality,
    ObservationFactKey, ObserverLife, ReceivingMutation, SourceRevision,
};
use std::mem::size_of;

fn invalid() -> crate::received::ReceivedError {
    crate::received::ReceivedError("Acquired body familiarity correspondence has changed.")
}
fn capacity() -> crate::received::ReceivedError {
    crate::received::ReceivedError("Acquired body familiarity exceeds native byte allowance.")
}
pub(crate) struct BodyFamiliarityPreparation {
    observer: ObserverLife,
    to: crate::worlds::InstalledObserverIdentity,
    from: FamiliarityState,
    support: String,
    comparisons: CollationRequest,
    _reservation: ByteReservation,
}
impl BodyFamiliarityPreparation {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        observer: &str,
        source_id: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, crate::received::ReceivedError> {
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            observer,
        )?;
        let Some(local) = names.current_body_local_subject(source_id)? else {
            return Ok(None);
        };
        let Some(matched) = names.current_body_association(source_id)? else {
            return Ok(None);
        };
        let (Some(from), Some(to)) = (
            names.observer_individual(local),
            names.observer_individual(matched),
        ) else {
            return Ok(None);
        };
        if std::ptr::eq(from, to) || from.familiarity.is_none() || to.individual_id.is_none() {
            return Ok(None);
        }
        let scope = CurrentBodyReadScope::prepare(
            &core.state.reception,
            &core.state.physical.entities,
            &core.state.installed,
            &core.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            observer,
        )?
        .ok_or_else(invalid)?;
        let body = scope.native_body(source_id)?.ok_or_else(invalid)?;
        let association = scope
            .native(
                source_id,
                "association",
                CurrentFacetSelector {
                    channel: Some(&body.grant.channel),
                    modality: Some(Modality::Sight),
                    exposure: None,
                },
            )?
            .ok_or_else(invalid)?;
        if association.field.body_lease_id.as_ref() != Some(&body.field.id) {
            return Ok(None);
        }
        let life = scope.state().observer.as_ref().ok_or_else(invalid)?;
        let source = from.familiarity.as_ref().ok_or_else(invalid)?;
        let count = source
            .roots
            .len()
            .checked_add(to.familiarity.as_ref().map_or(0, |state| state.roots.len()))
            .ok_or_else(capacity)?;
        let bytes = heap_sum([
            size_of::<Self>(),
            size_of::<ObservationFactKey>(),
            to.heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(3)
                .ok_or_else(capacity)?,
            source
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(3)
                .ok_or_else(capacity)?,
            count
                .checked_mul(size_of::<FamiliarityRoot>() + size_of::<u32>())
                .ok_or_else(capacity)?,
            life.heap_bytes().ok_or_else(capacity)?,
            association.original_source.id.len(),
        ])
        .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let proof = ObservationFactKey {
            source: EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                observer: life.clone(),
                id: association.original_source.id.clone(),
                revision: SourceRevision::Number(association.original_source.revision),
            },
            ordinal: association.field.original_ordinal,
        };
        let support_bytes = crate::reception::original_fact_json_len(&proof)?;
        reservation
            .resize(
                reservation
                    .bytes()
                    .checked_add(
                        support_bytes
                            .checked_mul(count.checked_add(2).ok_or_else(capacity)?)
                            .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let support = crate::reception::original_fact_json(&proof)?;
        if !valid_support_key(&support) {
            return Ok(None);
        }
        let comparisons = CollationRequest::prepare(
            binding,
            to.familiarity
                .iter()
                .flat_map(|state| state.roots.iter())
                .chain(source.roots.iter())
                .map(|root| root.key.as_str()),
            budget,
        )
        .map_err(|_| invalid())?;
        Ok(Some(Self {
            observer: life.clone(),
            to: to.clone(),
            from: source.clone(),
            support,
            comparisons,
            _reservation: reservation,
        }))
    }
    pub(crate) fn comparisons(&self) -> &CollationRequest {
        &self.comparisons
    }
    pub(crate) fn finish(
        mut self,
        core: &mut CoreMutation<'_>,
        answer: &CollationAnswer,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if core
            .state
            .physical
            .entities
            .get(&self.observer.actor_id)
            .and_then(|entity| entity.physical_life())
            != Some(self.observer.physical_life)
        {
            return Err(invalid().into());
        }
        let ranks = self.comparisons.finish(answer).map_err(|_| invalid())?;
        let target = self.to.familiarity.get_or_insert_with(|| FamiliarityState {
            roots: Vec::new(),
            authored: None,
            last_credit_at: None,
            next_credit_at: None,
            fast_credits: 0,
        });
        for root in &self.from.roots {
            if target.roots.iter().any(|held| held.key == root.key) {
                continue;
            }
            let mut support: IndexSet<String> = root.support.iter().cloned().collect();
            support.insert(self.support.clone());
            if support.len() > 10 {
                continue;
            }
            let mut root = root.clone();
            root.support = support.into_iter().collect();
            root.required = false;
            target.roots.push(root);
        }
        let mut chronological = target
            .roots
            .iter()
            .map(|root| Ok((root.clone(), ranks.rank(&root.key).map_err(|_| invalid())?)))
            .collect::<Result<Vec<_>, crate::received::ReceivedError>>()?;
        chronological.sort_by(|(a, ar), (b, br)| {
            a.at.total_cmp(&b.at)
                .then_with(|| b.required.cmp(&a.required))
                .then_with(|| a.order.cmp(&b.order))
                .then_with(|| ar.cmp(br))
        });
        let policy = core.state.installed.recognition.value();
        let scale = core
            .state
            .installed
            .content
            .time_policy
            .normal_game_seconds_per_second;
        let mut count = 0u64;
        let mut last = None;
        for required in [true, false] {
            for (root, _) in chronological
                .iter_mut()
                .filter(|(root, _)| root.required == required)
            {
                let quantum = if count < 6 {
                    policy.credit_seconds * scale
                } else {
                    policy.familiarity_mature_seconds
                };
                root.credited = last.is_none_or(|last| root.at >= last + quantum);
                if root.credited {
                    last = Some(root.at);
                    count = count.checked_add(1).ok_or_else(invalid)?;
                }
            }
        }
        chronological.sort_by(|(a, ar), (b, br)| {
            b.required
                .cmp(&a.required)
                .then_with(|| b.at.total_cmp(&a.at))
                .then_with(|| b.order.cmp(&a.order))
                .then_with(|| ar.cmp(br))
        });
        target.roots = chronological
            .into_iter()
            .take(policy.familiarity_roots as usize)
            .map(|(root, _)| root)
            .collect();
        target.fast_credits = target
            .fast_credits
            .max(self.from.fast_credits)
            .max(count.min(6));
        let last_credit = target
            .last_credit_at
            .unwrap_or(f64::NEG_INFINITY)
            .max(self.from.last_credit_at.unwrap_or(f64::NEG_INFINITY))
            .max(last.unwrap_or(f64::NEG_INFINITY));
        if last_credit.is_finite() {
            target.last_credit_at = Some(last_credit)
        }
        let next_credit = target
            .next_credit_at
            .unwrap_or(f64::NEG_INFINITY)
            .max(self.from.next_credit_at.unwrap_or(f64::NEG_INFINITY))
            .max(last.map_or(f64::NEG_INFINITY, |last| {
                last + if target.fast_credits < 6 {
                    policy.credit_seconds * scale
                } else {
                    policy.familiarity_mature_seconds
                }
            }));
        if next_credit.is_finite() {
            target.next_credit_at = Some(next_credit)
        }
        let key = self.to.individual_id.as_ref().ok_or_else(invalid)?.clone();
        let mut receiving = ReceivingMutation {
            experience: &core.state.experience,
            cognition: &mut core.journal.cognition,
            current: &mut core.journal.current,
            acquisitions: &mut core.journal.acquisitions,
            meters: &mut core.journal.meters,
            budget,
        };
        core.journal.recognition.commit(
            &mut core.state.reception,
            &mut core.state.temporal,
            &self.observer.actor_id,
            &key,
            self.to,
            core.state.physical.header.sim_time,
            policy,
            scale,
            &core.state.installed.attention.value().retention,
            &mut core.state.physical,
            &core.state.installed,
            &mut receiving,
        )?;
        Ok(())
    }
}
