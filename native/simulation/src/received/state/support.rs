//! Sparse received proof remains independently owned after recent blocks expire.
//! Retention copies original clocks and ordinals; it never samples a sense.

use super::*;
use crate::attention::{AccountRetentionLimits, AttentionRetentionPolicy};
use crate::experience::AccountClass;
use crate::host::retained_size::HeapBytes;
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
use std::mem::size_of;

mod capture;
mod receipt;
pub(crate) use capture::{record_snapshot_support, retain_captured_support};
pub(crate) use receipt::SupportRetentionContext;
pub(super) mod encoding;
use encoding::SupportEncoding;

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
    /// Borrow genuine before-capsules removed after the complete pass began.
    /// A replaced or reinserted support remains owned and is not a retirement.
    pub(crate) fn retired_supports_since(
        &self,
        checkpoint: TemporalCheckpoint,
    ) -> Result<impl Iterator<Item = (&str, &Arc<TemporalSupportRecord>)>, ReceivedError> {
        let undo = self.undo.get(checkpoint.operations..).ok_or_else(invalid)?;
        Ok(undo.iter().filter_map(|operation| {
            let TemporalUndo::Support {
                actor_id,
                id,
                before: Some((_, before)),
                ..
            } = operation
            else {
                return None;
            };
            let present = self
                .actors
                .get(actor_id)
                .and_then(|actor| actor.supports.as_ref())
                .is_some_and(|supports| supports.records.contains_key(id));
            (!present).then_some((actor_id.as_str(), before))
        }))
    }
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
        if let Some((_, record)) = &before {
            record.retain_for_candidate(&self.budget)?;
        }
        let next_ordinal = supports.coverage.next_ordinal;
        let parent_present = supports.coverage.parent_present;
        // This is an ordinary Source object map, not a stable history list.
        // Structural edits change later Object.entries SQL positions as well.
        if before.is_some() != after.is_some() && !supports.coverage.complete {
            return Err(invalid());
        }
        let next = if after.is_some() && before.is_none() {
            supports.records.len().checked_add(1).ok_or_else(invalid)?
        } else if after.is_none() && before.is_some() {
            supports.records.len().checked_sub(1).ok_or_else(invalid)?
        } else if supports.coverage.complete {
            supports.records.len()
        } else {
            next_ordinal as usize
        } as u64;
        // IDs in the sparse inverse are actual owned copies, not part of the
        // shared immutable receipt/value body pin.
        let ids = self
            .budget
            .reserve(actor_id.len().checked_add(id.len()).ok_or_else(invalid)?)
            .map_err(|_| invalid())?;
        self.reserve_undo_slots(2, &self.budget.clone())?;
        if after.is_some() && before.is_none() {
            self.actors
                .get_mut(actor_id)
                .and_then(|actor| actor.supports.as_mut())
                .ok_or_else(invalid)?
                .reserve_insert()?;
        }
        self.undo.push(TemporalUndo::Reservation(ids));
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
                supports.coverage.next_ordinal = next;
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
        encoding: SupportEncoding<'_>,
        prior: Option<&TemporalSupportRecord>,
        budget: &crate::host::ByteBudget,
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
        let body_storage = TemporalSupportRecord::fund_body(&capsule, prior, budget)?;
        let storage = TemporalSupportRecord::fund_record(
            &id,
            &parent,
            &capsule.receipt.id,
            encoding::encoded_len(&capsule, encoding)?,
            budget,
        )?;
        let payload = Arc::from(encoding::encode(&capsule, encoding)?);
        Ok(Arc::new(TemporalSupportRecord {
            body_storage,
            storage,
            id,
            parent,
            slot: capsule.receipt.id.clone(),
            position,
            payload,
            capsule,
        }))
    }
    pub(in super::super) fn admit_support(
        &mut self,
        actor_id: &str,
        mut capsule: TemporalSupportCapsule,
        limits: &AccountRetentionLimits,
        values: &impl crate::reception::ReceivedValueLookup,
        now: f64,
        policy: &AttentionRetentionPolicy,
        meters: &mut WorkMeters,
        mut places: Option<crate::experience::KnownPlaceMutation<'_>>,
        encoding: SupportEncoding<'_>,
        budget: &crate::host::ByteBudget,
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
        if (known_place(&capsule)
            || prior
                .as_ref()
                .is_some_and(|prior| known_place(prior.capsule())))
            && places.is_none()
        {
            return Err(ReceivedError(
                "Sparse place support requires its native known-place mutation owner.",
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
        let position = supports
            .records
            .get_index_of(&capsule.receipt.id)
            .map_or(supports.records.len() as u64, |position| position as u64);
        let bytes = capsule.bytes;
        let old_bytes = prior.as_ref().map_or(0, |prior| prior.capsule.bytes);
        let id = capsule.receipt.id.clone();
        let record = self.support_record(
            actor_id,
            capsule,
            position,
            encoding,
            prior.as_deref(),
            budget,
        )?;
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
            if record.capsule.required {
                AccountClass::Required
            } else {
                AccountClass::Optional
            },
            record.capsule.bytes as i128,
            1,
            None,
            now,
            policy,
        )?;
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
        if let Some(places) = places.as_mut() {
            places
                .support_changed(
                    actor_id,
                    prior.as_ref().map(|prior| prior.capsule()),
                    Some(record.capsule()),
                )
                .map_err(|_| ReceivedError("Sparse place evidence preparation failed."))?;
        }
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
        mut places: Option<crate::experience::KnownPlaceMutation<'_>>,
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
        if known_place(prior.capsule()) && places.is_none() {
            return Err(ReceivedError(
                "Sparse place support requires its native known-place mutation owner.",
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
        self.change_support(actor_id, id, None)?;
        if let Some(places) = places.as_mut() {
            places
                .support_changed(actor_id, Some(prior.capsule()), None)
                .map_err(|_| ReceivedError("Sparse place evidence preparation failed."))?;
        }
        Ok(())
    }
    pub(crate) fn set_support_required(
        &mut self,
        actor_id: &str,
        id: &str,
        required: bool,
        limits: &AccountRetentionLimits,
        values: &impl crate::reception::ReceivedValueLookup,
        now: f64,
        policy: &AttentionRetentionPolicy,
        budget: &crate::host::ByteBudget,
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
        let replacement = self.support_record(
            actor_id,
            replacement,
            prior.position,
            SupportEncoding::Existing(prior.payload()),
            Some(&prior),
            budget,
        )?;
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
            replacement.capsule.bytes as i128,
            1,
            None,
            now,
            policy,
        )?;
        self.change_support(actor_id, id, Some(replacement))?;
        Ok(true)
    }
    pub(crate) fn retain_observation_support(
        &mut self,
        observation: &ObservationContribution,
        ordinals: Option<&BTreeSet<u64>>,
        required: bool,
        limits: &AccountRetentionLimits,
        values: &mut Option<ReceivedValues>,
        activity_limits: &Arc<crate::activity::ActivityDisplayLimits>,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
        now: f64,
        sequence: u64,
        policy: &AttentionRetentionPolicy,
        meters: &mut WorkMeters,
        places: Option<crate::experience::KnownPlaceMutation<'_>>,
        budget: &crate::host::ByteBudget,
    ) -> Result<Option<TemporalReceiptLocator>, TemporalAppendError> {
        let actor_id = &observation.observer.actor_id;
        let actor = self.actors.get(actor_id).ok_or_else(invalid)?;
        if actor.header.physical_life != observation.observer.physical_life {
            return Ok(None);
        }
        let _scratch = budget
            .reserve(
                observation
                    .heap_bytes()
                    .and_then(|bytes| bytes.checked_mul(8))
                    .and_then(|bytes| {
                        bytes.checked_add(observation.facets.len().checked_mul(
                            size_of::<usize>()
                                + size_of::<TemporalFacetReference>()
                                + size_of::<ReceivedValueFragment>(),
                        )?)
                    })
                    .ok_or_else(invalid)?,
            )
            .map_err(|_| invalid())?;
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
                    &values.as_ref(),
                    now,
                    policy,
                    budget,
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
            let retained = crate::received::retain_received_value(
                values,
                fragment.clone(),
                None,
                now,
                sequence,
                identity,
                activity_limits,
                budget,
            )?;
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
            &values.as_ref(),
            now,
            policy,
            meters,
            places,
            SupportEncoding::Observation,
            budget,
        )?;
        Ok(record.map(|_| locator))
    }
}
pub(super) fn split(
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
