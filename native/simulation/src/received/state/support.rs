//! Sparse received proof remains independently owned after recent blocks expire.
//! Retention copies original clocks and ordinals; it never samples a sense.

use super::*;
use crate::attention::{AccountRetentionLimits, AttentionRetentionPolicy};
use crate::experience::AccountClass;
use crate::identity::IdentityState;
use crate::received::{
    BodyReception, ReceivedFieldClock, ReceivedReceiptHeader, ReceivedRole, ReceivedTransition,
    ReceivedValueFragment, ReceivedValues, TemporalAppendError, TemporalChange,
    TemporalFacetReference, TemporalReceipt, TemporalReceiptLocator, TemporalReception,
    TemporalSupportCapsule, TemporalSupportRecord,
};
use crate::reception::{
    EvidenceFamily, EvidenceSource, FacetRole, ObservationContribution, ObservationFactKey,
    ObservationOrigin, SensoryFacet, SourceRevision,
};
use crate::work::{WorkMeters, WorkUnit};
use std::collections::BTreeSet;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid sparse temporal support ownership or counters.")
}
fn known_place(capsule: &TemporalSupportCapsule) -> bool {
    matches!(
        capsule.receipt.origin.as_ref(),
        Some(ObservationOrigin::Occurrence { .. })
    ) && capsule.values.iter().any(|value| {
        matches!(
            value,
            ReceivedValueFragment::Sensory(SensoryFacet::EncounterExposure {
                exposure: crate::reception::EncounterExposure::Place { .. }
            })
        )
    })
}
impl TemporalState {
    fn change_support(
        &mut self,
        actor_id: &str,
        id: &str,
        after: Option<Arc<TemporalSupportRecord>>,
    ) -> Result<(), ReceivedError> {
        let supports = self
            .actors
            .get(actor_id)
            .and_then(|actor| actor.supports.as_ref())
            .ok_or_else(invalid)?;
        let before = supports
            .records
            .get_full(id)
            .map(|(at, _, record)| (at, Arc::clone(record)));
        let next_ordinal = supports.coverage.next_ordinal;
        let parent_present = supports.coverage.parent_present;
        let next = if after.is_some() && before.is_none() {
            next_ordinal
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or_else(invalid)?
        } else {
            next_ordinal
        };
        self.undo
            .try_reserve(1)
            .map_err(|_| ReceivedError("Temporal support undo capacity is unavailable."))?;
        self.undo.push(TemporalUndo::Support {
            actor_id: actor_id.to_owned(),
            id: id.to_owned(),
            before,
            next_ordinal,
            parent_present,
        });
        let supports = self
            .actors
            .get_mut(actor_id)
            .and_then(|actor| actor.supports.as_mut())
            .ok_or_else(invalid)?;
        match after {
            Some(record) => {
                supports.coverage.next_ordinal = next;
                supports.coverage.parent_present = true;
                supports.records.insert(id.to_owned(), record);
            }
            None => {
                supports.records.shift_remove(id);
            }
        }
        Ok(())
    }
    fn support_record(
        &self,
        actor_id: &str,
        capsule: TemporalSupportCapsule,
        position: u64,
    ) -> Result<Arc<TemporalSupportRecord>, ReceivedError> {
        let id = json_record(&[
            "world",
            "experience",
            "temporal",
            "actors",
            actor_id,
            "supports",
            &capsule.receipt.id,
        ])
        .map_err(|_| invalid())?;
        let parent = json_record(&["world", "experience", "temporal", "actors", actor_id])
            .map_err(|_| invalid())?;
        let payload = Arc::from(json_record(&capsule).map_err(|_| invalid())?);
        Ok(Arc::new(TemporalSupportRecord {
            id,
            parent,
            slot: capsule.receipt.id.clone(),
            position,
            payload,
            capsule,
        }))
    }
    fn admit_support(
        &mut self,
        actor_id: &str,
        mut capsule: TemporalSupportCapsule,
        limits: &AccountRetentionLimits,
        values: &ReceivedValues,
        now: f64,
        policy: &AttentionRetentionPolicy,
        meters: &mut WorkMeters,
    ) -> Result<Option<Arc<TemporalSupportRecord>>, TemporalAppendError> {
        for _ in 0..4 {
            let bytes = capsule.logical_bytes(values)?;
            if bytes == capsule.bytes {
                break;
            }
            capsule.bytes = bytes;
        }
        let actor = self.actors.get(actor_id).ok_or_else(invalid)?;
        let supports = actor.supports.as_ref().ok_or_else(invalid)?;
        let prior = supports.get(&capsule.receipt.id)?.cloned();
        if known_place(&capsule)
            || prior
                .as_ref()
                .is_some_and(|prior| known_place(prior.capsule()))
        {
            return Err(ReceivedError(
                "Sparse place support requires its native known-place index mutation.",
            )
            .into());
        }
        let accounts = actor.header.accounts.as_ref().ok_or_else(invalid)?;
        let account = if capsule.required {
            &accounts.required
        } else {
            &accounts.optional
        };
        let same = prior
            .as_ref()
            .filter(|prior| prior.capsule.required == capsule.required);
        let old_bytes = same.map_or(0, |prior| prior.capsule.bytes);
        let old_count = u64::from(same.is_some());
        if account
            .count
            .checked_add(1)
            .and_then(|n| n.checked_sub(old_count))
            .ok_or_else(invalid)?
            > limits.max_records
            || account
                .bytes
                .checked_add(capsule.bytes)
                .and_then(|n| n.checked_sub(old_bytes))
                .ok_or_else(invalid)?
                > limits.max_bytes
        {
            return Ok(None);
        }
        let position = prior
            .as_ref()
            .map_or(supports.coverage.next_ordinal, |prior| prior.position);
        if let Some(prior) = &prior {
            self.adjust_account(
                actor_id,
                if prior.capsule.required {
                    AccountClass::Required
                } else {
                    AccountClass::Optional
                },
                -(prior.capsule.bytes as i128),
                -1,
                None,
                now,
                policy,
            )?;
        }
        self.adjust_account(
            actor_id,
            if capsule.required {
                AccountClass::Required
            } else {
                AccountClass::Optional
            },
            capsule.bytes as i128,
            1,
            None,
            now,
            policy,
        )?;
        let bytes = capsule.bytes;
        let old_bytes = prior.as_ref().map_or(0, |prior| prior.capsule.bytes);
        let id = capsule.receipt.id.clone();
        let record = self.support_record(actor_id, capsule, position)?;
        let mut header = self
            .actors
            .get(actor_id)
            .ok_or_else(invalid)?
            .header
            .clone();
        if header.supports.is_none() {
            header.supports = Some(crate::experience::EmptyChildOwner {});
            self.replace_header(actor_id, header)?;
        }
        self.change_support(actor_id, &id, Some(Arc::clone(&record)))?;
        meters.charge(&[
            (WorkUnit::Effects, 1),
            (WorkUnit::OutputBytes, bytes.saturating_sub(old_bytes)),
        ])?;
        Ok(Some(record))
    }
    pub(crate) fn release_support(
        &mut self,
        actor_id: &str,
        id: &str,
        now: f64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<(), ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(());
        };
        let Some(supports) = &actor.supports else {
            return Ok(());
        };
        let Some(prior) = supports.get(id)?.cloned() else {
            return Ok(());
        };
        if known_place(prior.capsule()) {
            return Err(ReceivedError(
                "Sparse place support requires its native known-place index mutation.",
            ));
        }
        self.adjust_account(
            actor_id,
            if prior.capsule.required {
                AccountClass::Required
            } else {
                AccountClass::Optional
            },
            -(prior.capsule.bytes as i128),
            -1,
            None,
            now,
            policy,
        )?;
        self.change_support(actor_id, id, None)
    }
    pub(crate) fn set_support_required(
        &mut self,
        actor_id: &str,
        id: &str,
        required: bool,
        limits: &AccountRetentionLimits,
        values: &ReceivedValues,
        now: f64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<bool, ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(false);
        };
        let Some(prior) = actor
            .supports
            .as_ref()
            .ok_or_else(invalid)?
            .get(id)?
            .cloned()
        else {
            return Ok(false);
        };
        if prior.capsule.required == required {
            return Ok(true);
        }
        let mut replacement = prior.capsule.clone();
        replacement.required = required;
        for _ in 0..4 {
            let bytes = replacement.logical_bytes(values)?;
            if bytes == replacement.bytes {
                break;
            }
            replacement.bytes = bytes;
        }
        let accounts = actor.header.accounts.as_ref().ok_or_else(invalid)?;
        let after = if required {
            &accounts.required
        } else {
            &accounts.optional
        };
        if after.count.checked_add(1).ok_or_else(invalid)? > limits.max_records
            || after
                .bytes
                .checked_add(replacement.bytes)
                .ok_or_else(invalid)?
                > limits.max_bytes
        {
            return Ok(false);
        }
        self.adjust_account(
            actor_id,
            if required {
                AccountClass::Optional
            } else {
                AccountClass::Required
            },
            -(prior.capsule.bytes as i128),
            -1,
            None,
            now,
            policy,
        )?;
        self.adjust_account(
            actor_id,
            if required {
                AccountClass::Required
            } else {
                AccountClass::Optional
            },
            replacement.bytes as i128,
            1,
            None,
            now,
            policy,
        )?;
        let replacement = self.support_record(actor_id, replacement, prior.position)?;
        self.change_support(actor_id, id, Some(replacement))?;
        Ok(true)
    }
    pub(crate) fn retain_observation_support(
        &mut self,
        observation: &ObservationContribution,
        ordinals: Option<&BTreeSet<u64>>,
        required: bool,
        limits: &AccountRetentionLimits,
        values: &mut ReceivedValues,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
        now: f64,
        sequence: u64,
        policy: &AttentionRetentionPolicy,
        meters: &mut WorkMeters,
    ) -> Result<Option<TemporalReceiptLocator>, TemporalAppendError> {
        let actor_id = &observation.observer.actor_id;
        let actor = self.actors.get(actor_id).ok_or_else(invalid)?;
        if actor.header.physical_life != observation.observer.physical_life {
            return Ok(None);
        }
        let selected = observation
            .facets
            .iter()
            .filter(|field| ordinals.is_none_or(|ordinals| ordinals.contains(&field.ordinal)))
            .collect::<Vec<_>>();
        if selected.is_empty() {
            return Ok(None);
        }
        let supports = actor.supports.as_ref().ok_or_else(invalid)?;
        if !supports.coverage.complete {
            return Err(ReceivedError(
                "Sparse support search requires complete original cold ownership.",
            )
            .into());
        }
        let prior = supports
            .records
            .values()
            .find(|record| {
                selected.iter().all(|field| {
                    record.capsule.receipt.facets.iter().any(|reference| {
                        reference.original.as_ref().is_some_and(|original| {
                            original.source.id == observation.id
                                && original.source.revision
                                    == SourceRevision::Number(observation.revision)
                                && original.source.observer.physical_life
                                    == observation.observer.physical_life
                                && original.ordinal == field.ordinal
                        })
                    })
                })
            })
            .cloned();
        let epoch = actor.header.epoch.clone();
        if let Some(prior) = prior {
            if required
                && !prior.capsule.required
                && !self.set_support_required(
                    actor_id,
                    &prior.capsule.receipt.id,
                    true,
                    limits,
                    values,
                    now,
                    policy,
                )?
            {
                return Ok(None);
            }
            return Ok(Some(prior.capsule.receipt.locator.clone()));
        }
        let batch_order = identity
            .allocate("retained-support")
            .map_err(|_| invalid())?
            .sequence;
        let mut fragments = Vec::with_capacity(selected.len());
        let mut fields = Vec::with_capacity(selected.len());
        for field in selected {
            let (fragment, reception) = split(&field.value)?;
            let retained = values.retain(fragment.clone(), None, now, sequence, identity)?;
            fragments.push(fragment);
            fields.push(TemporalFacetReference {
                clock: ReceivedFieldClock {
                    role: match field.role {
                        FacetRole::Direct => ReceivedRole::Direct,
                        FacetRole::Inference => ReceivedRole::Inference,
                        FacetRole::Testimony => ReceivedRole::Testimony,
                    },
                    as_of: field.as_of,
                    measured_from: field.measured_from,
                    measured_through: field.measured_through,
                    acquired_at: field.acquired_at,
                    confirmed_through: None,
                },
                member_index: field.ordinal,
                value_ref: retained.reference,
                track: None,
                original: Some(ObservationFactKey {
                    source: EvidenceSource {
                        family: EvidenceFamily::NativeExposure,
                        id: observation.id.clone(),
                        revision: SourceRevision::Number(observation.revision),
                        observer: observation.observer.clone(),
                    },
                    ordinal: field.ordinal,
                }),
                received_from: None,
                support: field.support.clone(),
                detail_support: None,
                pose_frame: None,
                reception,
            });
        }
        let locator = TemporalReceiptLocator {
            actor_id: actor_id.clone(),
            physical_life: observation.observer.physical_life,
            epoch,
            batch_order,
            entry_index: 0,
        };
        let receipt = TemporalReceipt {
            header: ReceivedReceiptHeader {
                subject: match &observation.origin {
                    ObservationOrigin::Occurrence { event_id, .. } => event_id.clone(),
                    ObservationOrigin::Exposure { episode_id, .. } => episode_id.clone(),
                },
                change: TemporalChange::RetainedState,
                acquisition: batch_order,
                source_ids: vec![observation.id.clone()],
                spatial_context: None,
                subject_identity: None,
                context_subjects: None,
                availability: None,
                availability_at: None,
                coverage_gap: None,
                ended_fields: None,
            },
            id: locator.id(),
            locator: locator.clone(),
            at: now,
            order: transition.received_order(identity)?,
            required,
            receiver_frame: None,
            origin: None,
            facets: fields,
        };
        let record = self.admit_support(
            actor_id,
            TemporalSupportCapsule {
                receipt: Arc::new(receipt),
                values: Arc::from(fragments),
                bytes: 0,
                required,
            },
            limits,
            values,
            now,
            policy,
            meters,
        )?;
        Ok(record.map(|_| locator))
    }
}
fn split(
    value: &SensoryFacet,
) -> Result<(ReceivedValueFragment, Option<TemporalReception>), ReceivedError> {
    use crate::received::values::{BodyFragment, BodyKind, LocationFragment, LocationKind};
    match value {
        SensoryFacet::Body { body } => {
            let (body, pose) = crate::reception::split_observed_body(body.clone());
            Ok((
                ReceivedValueFragment::Body(BodyFragment {
                    kind: BodyKind::Body,
                    body,
                }),
                Some(TemporalReception::Body {
                    pose: BodyReception::Pose { pose },
                }),
            ))
        }
        SensoryFacet::Location { location, frame } => Ok((
            ReceivedValueFragment::Location(LocationFragment {
                kind: LocationKind::Location,
                location: location.clone(),
            }),
            Some(TemporalReception::Location {
                frame: frame.clone(),
            }),
        )),
        SensoryFacet::ObservedMotion { .. } => Err(ReceivedError(
            "Motion must be retained as its received samples.",
        )),
        _ => Ok((ReceivedValueFragment::Sensory(value.clone()), None)),
    }
}
