//! Geometry and attention are bounded receiver continuations. Their root,
//! ordered lists and stable-position maps keep their distinct Source codecs.
use super::*;
use crate::records::{MapPositions, RecordSchema, encode_list_changes, encode_map_changes};
fn one<T: Serialize + ?Sized>(
    schema: &RecordSchema,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
    observer: &str,
    field: &str,
    table: &str,
    before: Option<&T>,
    after: Option<&T>,
    owned_codec: bool,
) -> Result<(), RecordEncodingError> {
    let layout = schema.layout(table)?;
    let length = |value: &T| {
        if owned_codec {
            crate::encoding::json_record_len(value)
        } else {
            layout.project_len(value)
        }
    };
    let encode = |value: &T| {
        if owned_codec {
            crate::encoding::json_record(value)
        } else {
            layout.project(value)
        }
    };
    let bytes = before
        .map(length)
        .transpose()
        .map_err(|_| error())?
        .unwrap_or(0)
        .checked_add(
            after
                .map(length)
                .transpose()
                .map_err(|_| error())?
                .unwrap_or(0),
        )
        .and_then(|bytes| bytes.checked_mul(2))
        .ok_or_else(error)?;
    let _guard = budget.reserve(bytes).map_err(|_| error())?;
    let before_payload = before.map(encode).transpose().map_err(|_| error())?;
    let payload = after.map(encode).transpose().map_err(|_| error())?;
    if before_payload != payload {
        let address = SelectedPlacement::new(
            ledger,
            table,
            &["world", "perceptionEvidence", observer, field],
            &["world", "perceptionEvidence", observer],
            field,
            0,
            before.is_none(),
            budget,
        )?;
        if let Some(payload) = payload {
            output.write_encoded(
                table,
                address.value(),
                &payload,
                &[],
                address.create(),
                RowEffects::default(),
            )?;
        } else if !address.create() {
            output.delete(table, &address.value().id, false)?;
        }
    }
    let parent = ["world", "perceptionEvidence", observer];
    let bytes = crate::encoding::json_record_len(&parent).map_err(|_| error())?;
    let _guard = budget
        .reserve(bytes * 2 + table.len() + size_of::<OwnerCoverage>())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: crate::encoding::json_record(&parent).map_err(|_| error())?,
        complete: true,
        next_ordinal: u64::from(after.is_some()),
        parent_present: after.is_some(),
    })
}
impl CurrentJournal {
    pub(crate) fn encode_scene_changes(
        &self,
        state: &ReceptionState,
        before: CurrentCheckpoint,
        schema: &RecordSchema,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        let count = changes
            .iter()
            .filter(|change| {
                matches!(
                    change,
                    CurrentUndo::Geometry { .. } | CurrentUndo::Attention { .. }
                )
            })
            .count();
        if count == 0 {
            return Ok(());
        }
        let _selection = budget
            .reserve(
                map_storage::<&str, Option<&ReceivedGeometryState>>(count)
                    .and_then(|bytes| {
                        bytes.checked_add(map_storage::<&str, Option<&AttentionState>>(count)?)
                    })
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut geometries = IndexMap::with_capacity(count);
        let mut attentions = IndexMap::with_capacity(count);
        for change in changes {
            match change {
                CurrentUndo::Geometry { observer, prior } => {
                    geometries
                        .entry(observer.as_str())
                        .or_insert(prior.as_ref());
                }
                CurrentUndo::Attention { observer, prior } => {
                    attentions
                        .entry(observer.as_str())
                        .or_insert(prior.as_ref());
                }
                _ => {}
            }
        }
        for (observer, before) in geometries {
            let after = state
                .perception_evidence
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .ok_or_else(error)?
                .geometry
                .as_ref();
            one(
                schema,
                ledger,
                output,
                budget,
                observer,
                "geometry",
                "mind_perception_geometry",
                before,
                after,
                false,
            )?;
            let parent = ["world", "perceptionEvidence", observer, "geometry"];
            encode_list_changes(
                schema,
                ledger,
                "mind_perception_geometry_fragments",
                &parent,
                Some("fragments"),
                before.map(|before| before.fragments.as_slice()),
                after.map(|after| after.fragments.as_slice()),
                |fragment| Some(fragment.key.as_str()),
                output,
                budget,
            )?;
            // The current Source list key is absent on received features; its
            // actual identity is the list index, not observation.id.
            encode_list_changes(
                schema,
                ledger,
                "mind_perception_geometry_boundaries",
                &parent,
                Some("boundaries"),
                before.map(|before| before.boundaries.as_slice()),
                after.map(|after| after.boundaries.as_slice()),
                |_| None,
                output,
                budget,
            )?;
        }
        for (observer, before) in attentions {
            let after = state
                .perception_evidence
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .ok_or_else(error)?
                .attention
                .as_ref();
            let before_header = before.map(crate::attention::encode_attention_header);
            let after_header = after.map(crate::attention::encode_attention_header);
            one(
                schema,
                ledger,
                output,
                budget,
                observer,
                "attention",
                "mind_perception_attention",
                before_header.as_ref(),
                after_header.as_ref(),
                true,
            )?;
            let parent = ["world", "perceptionEvidence", observer, "attention"];
            encode_map_changes(
                schema,
                ledger,
                "mind_perception_attention_annotations",
                &parent,
                Some("annotations"),
                before.map(|before| &before.annotations),
                after.map(|after| &after.annotations),
                MapPositions::Stable,
                output,
                budget,
            )?;
            encode_map_changes(
                schema,
                ledger,
                "mind_perception_attention_latches",
                &parent,
                Some("latches"),
                before.map(|before| &before.latches),
                after.map(|after| &after.latches),
                MapPositions::Stable,
                output,
                budget,
            )?;
            encode_map_changes(
                schema,
                ledger,
                "mind_perception_attention_scans",
                &parent,
                Some("relationScans"),
                before.map(|before| &before.relation_scans),
                after.map(|after| &after.relation_scans),
                MapPositions::Stable,
                output,
                budget,
            )?;
        }
        Ok(())
    }
}
