//! Sparse motion checks carry the actual references of their earlier value.
use super::*;
fn references(track: &CurrentMotionSample) -> Vec<&str> {
    let mut refs: Vec<_> = received_facet_value_references(&track.earlier.value).collect();
    refs.sort_by(|a, b| crate::encoding::js_string_cmp(a, b));
    refs.dedup();
    refs
}
impl CurrentJournal {
    pub(crate) fn encode_motion_changes(
        &self,
        state: &ReceptionState,
        before: CurrentCheckpoint,
        schema: &crate::records::RecordSchema,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        let count = changes
            .iter()
            .try_fold(0usize, |count, change| {
                count.checked_add(match change {
                    CurrentUndo::MotionMember { .. } => 1,
                    CurrentUndo::Motion { prior, .. } => prior.len(),
                    _ => 0,
                })
            })
            .ok_or_else(error)?;
        if count == 0 {
            return Ok(());
        }
        let _selection = budget
            .reserve(
                map_storage::<(&str, &str), Option<&CurrentMotionSample>>(count)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut selected = IndexMap::with_capacity(count);
        for change in changes {
            match change {
                CurrentUndo::MotionMember {
                    observer,
                    subject,
                    prior,
                    ..
                } => {
                    selected
                        .entry((observer.as_str(), subject.as_str()))
                        .or_insert(prior.as_ref().map(|(_, value)| value));
                }
                CurrentUndo::Motion {
                    observer, prior, ..
                } => {
                    for (subject, value) in prior {
                        selected
                            .entry((observer.as_str(), subject.as_str()))
                            .or_insert(Some(value));
                    }
                }
                _ => {}
            }
        }
        for ((observer, subject), before) in selected {
            let owner = state
                .perception_evidence
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .ok_or_else(error)?;
            let after = owner
                .motion_samples
                .as_ref()
                .and_then(|samples| samples.get(subject));
            let layout = schema.layout("mind_perception_motion_samples")?;
            let bytes = before
                .map(|before| layout.project_len(before))
                .transpose()
                .map_err(|_| error())?
                .unwrap_or(0)
                .checked_add(
                    after
                        .map(|after| layout.project_len(after))
                        .transpose()
                        .map_err(|_| error())?
                        .unwrap_or(0),
                )
                .and_then(|bytes| bytes.checked_mul(16))
                .ok_or_else(error)?;
            let _encoding = budget.reserve(bytes).map_err(|_| error())?;
            let old_payload = before
                .map(|before| layout.project(before))
                .transpose()
                .map_err(|_| error())?;
            let payload = after
                .map(|after| layout.project(after))
                .transpose()
                .map_err(|_| error())?;
            if old_payload == payload {
                continue;
            }
            let address = SelectedPlacement::new(
                ledger,
                "mind_perception_motion_samples",
                &[
                    "world",
                    "perceptionEvidence",
                    observer,
                    "motionSamples",
                    subject,
                ],
                &["world", "perceptionEvidence", observer],
                subject,
                0,
                before.is_none(),
                budget,
            )?;
            if let Some(after) = after {
                let insert_only = address.create()
                    && ledger
                        .coverage("mind_perception_motion_samples", &address.value().parent)
                        .is_some_and(|owner| owner.parent_present);
                let reference_changes = super::super::super::save::ReferenceDelta::new(
                    before.map(references),
                    references(after),
                    insert_only,
                );
                output.write_encoded(
                    "mind_perception_motion_samples",
                    address.value(),
                    payload.as_deref().ok_or_else(error)?,
                    &[observer.into(), reference_changes.cell()],
                    insert_only,
                    reference_changes.effects(),
                )?;
            } else if !address.create() {
                output.delete("mind_perception_motion_samples", &address.value().id, false)?;
            }
            let parent = ["world", "perceptionEvidence", observer];
            let bytes = crate::encoding::json_record_len(&parent).map_err(|_| error())?;
            let _guard = budget
                .reserve(bytes * 2 + 64 + size_of::<OwnerCoverage>())
                .map_err(|_| error())?;
            output.observe_owner(&OwnerCoverage {
                table: "mind_perception_motion_samples".into(),
                owner: crate::encoding::json_record(&parent).map_err(|_| error())?,
                complete: true,
                next_ordinal: u64::from(
                    owner
                        .motion_samples
                        .as_ref()
                        .is_some_and(|samples| !samples.is_empty()),
                ),
                parent_present: owner.motion_samples.is_some(),
            })?;
        }
        Ok(())
    }
}
