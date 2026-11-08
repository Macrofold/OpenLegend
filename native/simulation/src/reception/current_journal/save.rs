//! Current contacts retain acquired payload separately from check/recording
//! metadata. Only subjects selected by the mutation journal are encoded.
use super::*;
mod motion;
mod scene;
mod visibility;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
};

fn error() -> RecordEncodingError {
    RecordEncodingError("Current contact save requires complete placement and allowance.")
}
impl CurrentJournal {
    pub(crate) fn encode_contact_changes(
        &self,
        state: &ReceptionState,
        before: CurrentCheckpoint,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        let count = changes
            .iter()
            .filter(|change| matches!(change, CurrentUndo::Contact { .. }))
            .count();
        if count == 0 {
            return Ok(());
        }
        let _selected = budget
            .reserve(map_storage::<(&str, &str), Option<&CurrentContact>>(count).ok_or_else(error)?)
            .map_err(|_| error())?;
        let mut selected = IndexMap::with_capacity(count);
        for change in changes {
            if let CurrentUndo::Contact {
                observer,
                subject,
                prior,
            } = change
            {
                selected
                    .entry((observer.as_str(), subject.as_str()))
                    .or_insert(prior.as_ref().map(|(_, contact)| contact));
            }
        }
        for ((observer, subject), before) in selected {
            let current = state
                .perception_evidence
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .ok_or_else(error)?;
            let after = current.current.get(subject);
            // Transient broad-phase caches never belong in a canonical row.
            let before_bytes = before.map(contact_bound).transpose()?.unwrap_or(0);
            let after_bytes = after.map(contact_bound).transpose()?.unwrap_or(0);
            let _encoding = budget
                .reserve(before_bytes.checked_add(after_bytes).ok_or_else(error)?)
                .map_err(|_| error())?;
            let before_payload = before
                .map(encode_current_contact_payload)
                .transpose()
                .map_err(|_| error())?;
            let after_payload = after
                .map(encode_current_contact_payload)
                .transpose()
                .map_err(|_| error())?;
            let before_metadata = before
                .map(encode_current_contact_metadata)
                .transpose()
                .map_err(|_| error())?;
            let after_metadata = after
                .map(encode_current_contact_metadata)
                .transpose()
                .map_err(|_| error())?;
            if before_payload == after_payload && before_metadata == after_metadata {
                continue;
            }
            let address = SelectedPlacement::new(
                ledger,
                "mind_perception_current",
                &["world", "perceptionEvidence", observer, "current", subject],
                &["world", "perceptionEvidence", observer],
                subject,
                0,
                before.is_none(),
                budget,
            )?;
            if let Some(after) = after {
                let insert_only = address.create()
                    && ledger
                        .coverage("mind_perception_current", &address.value().parent)
                        .is_some_and(|owner| owner.parent_present);
                let references = super::super::save::ReferenceDelta::new(
                    before.map(received_contact_value_references),
                    received_contact_value_references(after),
                    insert_only,
                );
                let metadata_only = before_payload.is_some() && before_payload == after_payload;
                let columns = metadata_only.then(|| {
                    if references.changed() {
                        vec!["metadata".to_owned(), "value_refs".to_owned()]
                    } else {
                        vec!["metadata".to_owned()]
                    }
                });
                let mut effects = references.effects();
                effects.write_columns = columns.as_deref();
                output.write_encoded(
                    "mind_perception_current",
                    address.value(),
                    after_payload.as_deref().ok_or_else(error)?,
                    &[
                        observer.into(),
                        references.cell(),
                        after_metadata.as_deref().ok_or_else(error)?.into(),
                    ],
                    insert_only,
                    effects,
                )?;
            } else if !address.create() {
                output.delete("mind_perception_current", &address.value().id, false)?;
            }
            let parent = crate::encoding::json_record(&["world", "perceptionEvidence", observer])
                .map_err(|_| error())?;
            output.observe_owner(&OwnerCoverage {
                table: "mind_perception_current".into(),
                owner: parent,
                complete: true,
                next_ordinal: u64::from(!current.current.is_empty()),
                parent_present: true,
            })?;
        }
        Ok(())
    }
}
fn contact_bound(contact: &CurrentContact) -> Result<usize, RecordEncodingError> {
    // Reserve before either storage codec or its shared-value closure allocates.
    // JSON escaping and simultaneous before/after reference products are included.
    current_contact_storage_bytes(contact)
        .ok()
        .and_then(|bytes| bytes.checked_mul(16))
        .ok_or_else(error)
}

fn header_subject(change: &CurrentUndo) -> Option<&str> {
    match change {
        CurrentUndo::VisualConfirmation { observer, .. }
        | CurrentUndo::MotionMember { observer, .. }
        | CurrentUndo::MotionExpiry { observer, .. }
        | CurrentUndo::GapMember { observer, .. }
        | CurrentUndo::Attention { observer, .. }
        | CurrentUndo::NextContact { observer, .. }
        | CurrentUndo::Geometry { observer, .. }
        | CurrentUndo::Motion { observer, .. }
        | CurrentUndo::Gaps { observer, .. } => Some(observer),
        _ => None,
    }
}
impl CurrentJournal {
    pub(in super::super) fn header_change_count(
        &self,
        before: CurrentCheckpoint,
    ) -> Result<usize, RecordEncodingError> {
        Ok(self
            .undo
            .get(before.operations..)
            .ok_or_else(error)?
            .iter()
            .filter(|change| header_subject(change).is_some())
            .count())
    }
    pub(in super::super) fn select_headers<'a>(
        &'a self,
        state: &'a ReceptionState,
        before: CurrentCheckpoint,
        selected: &mut super::super::save::Headers<'a>,
        schema: &crate::records::RecordSchema,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        for change in self.undo.get(before.operations..).ok_or_else(error)? {
            if let Some(observer) = header_subject(change) {
                super::super::save::select_header(selected, state, observer, schema, budget)?;
            }
        }
        Ok(())
    }
    pub(in super::super) fn restore_headers(
        &self,
        before: CurrentCheckpoint,
        selected: &mut super::super::save::Headers<'_>,
    ) -> Result<(), RecordEncodingError> {
        use super::super::save::ChildMarker;
        for change in self
            .undo
            .get(before.operations..)
            .ok_or_else(error)?
            .iter()
            .rev()
        {
            let Some(observer) = header_subject(change) else {
                continue;
            };
            let entry = selected.get_mut(observer).ok_or_else(error)?;
            match change {
                CurrentUndo::VisualConfirmation { prior, .. } => entry.reserve(prior)?,
                CurrentUndo::GapMember { prior, .. } => entry.reserve(prior)?,
                CurrentUndo::Gaps { prior, .. } => entry.reserve(prior)?,
                _ => {}
            }
            let header = entry.value.as_mut().ok_or_else(error)?;
            match change {
                CurrentUndo::VisualConfirmation { prior, .. } => {
                    header.visual_confirmation = prior.clone()
                }
                CurrentUndo::MotionMember { root_present, .. } => {
                    header.motion_samples = root_present.then_some(ChildMarker)
                }
                CurrentUndo::MotionExpiry { prior, .. } => header.motion_expires_at = *prior,
                CurrentUndo::GapMember { subject, prior, .. } => {
                    header.gaps.shift_remove(subject);
                    if let Some((at, prior)) = prior {
                        header
                            .gaps
                            .shift_insert(*at, subject.clone(), prior.clone());
                    }
                }
                CurrentUndo::Attention { prior, .. } => {
                    header.attention = prior.as_ref().map(|_| ChildMarker)
                }
                CurrentUndo::NextContact { prior, .. } => header.next_contact = *prior,
                CurrentUndo::Geometry { prior, .. } => {
                    header.geometry = prior.as_ref().map(|_| ChildMarker)
                }
                CurrentUndo::Motion { expires_at, .. } => {
                    header.motion_samples = Some(ChildMarker);
                    header.motion_expires_at = *expires_at;
                }
                CurrentUndo::Gaps { prior, .. } => header.gaps = prior.clone(),
                _ => return Err(error()),
            }
        }
        Ok(())
    }
}
