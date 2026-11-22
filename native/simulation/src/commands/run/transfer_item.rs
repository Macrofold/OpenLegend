use super::*;
use crate::execution::OwnedMoveError;
use crate::text::JsText;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Copy {
    unavailable: JsText,
    busy: JsText,
    stale: JsText,
    not_portable: JsText,
    quantity: JsText,
    packing: JsText,
    depth: JsText,
    no_packing_load: JsText,
    filled_open_bag: JsText,
    split_parent: JsText,
    merge_quantity: JsText,
    merge_mismatch: JsText,
    success: JsText,
    narration: JsText,
}

static COPY: LazyLock<Copy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/worlds/base/item-move-copy.json"
    ))
    .expect("authored item arrangement language")
});

impl CommandCursor {
    pub(super) fn transfer_item(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::TransferItem {
            selection,
            envelope,
            group,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let result = if let Some(group) = group {
            core.move_stock_group(actor, group, &selection.target_id, selection.target_revision, &envelope.id)?
        } else {
            core.arrange_owned_lot(actor, &envelope.id, selection.map_ids(String::as_str))?
        };
        let item = match result {
            Ok(item) => item,
            Err(reason) => {
                let (code, message) = match &reason {
                    OwnedMoveError::Unavailable => ("unavailable", &COPY.unavailable),
                    OwnedMoveError::Busy => ("in-use", &COPY.busy),
                    OwnedMoveError::Stale => ("stale", &COPY.stale),
                    OwnedMoveError::NotPortable => ("not-portable", &COPY.not_portable),
                    OwnedMoveError::Quantity => ("item-unavailable", &COPY.quantity),
                    OwnedMoveError::Packing => ("item-unavailable", &COPY.packing),
                    OwnedMoveError::Depth => ("item-unavailable", &COPY.depth),
                    OwnedMoveError::NoPackingLoad => ("item-unavailable", &COPY.no_packing_load),
                    OwnedMoveError::Material { message, .. } => ("item-unavailable", message),
                    OwnedMoveError::FilledOpenBag => ("item-unavailable", &COPY.filled_open_bag),
                    OwnedMoveError::SplitParent => ("stale", &COPY.split_parent),
                    OwnedMoveError::MergeQuantity => ("stale", &COPY.merge_quantity),
                    OwnedMoveError::MergeMismatch => ("item-unavailable", &COPY.merge_mismatch),
                };
                self.reserve(message.storage_bytes() + code.len())?;
                let mut result = outcome(false, code, "");
                result.message = message.clone();
                self.outcome = Some(result);
                self.phase = Phase::Done;
                return Ok(None);
            }
        };
        self.reserve(
            256 + COPY.success.storage_bytes()
                + item.len()
                + COPY.narration.storage_bytes()
                + 2 * actor.len(),
        )?;
        let mut result = outcome(true, "items-arranged", "");
        result.message = COPY.success.clone();
        result.item_id = Some(item);
        self.outcome = Some(result);
        if self.options.preview {
            self.phase = Phase::Done;
            return Ok(None);
        }
        self.begin_source_scope(core)?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "items-arranged".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor.into(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(JsText::concat(&[&" ".into(), &COPY.narration])),
                ],
            }),
            audience: AudienceSelection::Explicit(vec![actor.into()]),
            source_id: Some(actor.into()),
            target_id: None,
            data: None,
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::ImmediateResult;
        Ok(Some(event))
    }
}
