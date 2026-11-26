use super::*;
use crate::execution::OwnedMoveError;
use crate::text::JsText;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Copy {
    unavailable: JsText,
    stock_incomplete: JsText,
    stock_action: JsText,
    stock_moved: String,
    stock_narration: JsText,
    insufficient_stock: JsText,
    personal_minimum: JsText,
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
        if matches!(self.command, NativeCommand::TransferStock {..}) {return self.transfer_stock(core,actor);}
        let result = match &self.command {
            NativeCommand::TransferItem {selection,envelope,group:Some(group)} =>
                core.move_stock_group(actor,group,&selection.target_id,selection.target_revision,&envelope.id)?,
            NativeCommand::TransferItem {selection,envelope,group:None} =>
                core.arrange_lot(actor,&envelope.id,selection.map_ids(String::as_str))?,
            _=>return Err(ExecutionError::Invariant),
        };
        let item = match result {
            Ok(item) => item,
            Err(reason) => {
                self.refuse_arrangement(reason)?;
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
    fn transfer_stock(&mut self,core:&mut CoreMutation<'_>,actor:&str) -> Result<Option<StagedOccurrence>,ExecutionError> {
        let NativeCommand::TransferStock {request,envelope} = &self.command else{return Err(ExecutionError::Invariant);};
        let moved=match core.transfer_stock(actor,request,&envelope.id)? {
            Ok(moved)=>moved,
            Err(reason)=>{self.refuse_arrangement(reason)?;return Ok(None);}
        };
        let material=&core.state.installed.retained.items.get(&request.definition.id).ok_or(ExecutionError::Invariant)?.named.name;
        let allowance=COPY.stock_moved.len()+material.storage_bytes()+32;
        let _format=self.budget.reserve(allowance*4)?;
        let message=COPY.stock_moved.replace("{quantity}",&request.quantity.to_string());
        let (before,after)=message.split_once("{material}").ok_or(ExecutionError::Invariant)?;
        let mut result=outcome(true,"transferred","");
        result.message=JsText::concat(&[&before.into(), material, &after.into()]);
        result.outputs=Some(moved.outputs);
        self._reservation.merge(moved._storage)?;
        self.reserve(allowance)?;
        self.outcome=Some(result);
        if self.options.preview {self.phase=Phase::Done;return Ok(None);}
        self.begin_source_scope(core)?;
        if !self.options.native_controller {
            let storage=self.budget.reserve(COPY.stock_action.storage_bytes())?;
            let view=ActivityView{name:COPY.stock_action.clone(),actor:None,tool:None,target:None,facts:Vec::new(),children:None,result:None};
            let id=core.journal.activity.begin(&mut core.state.activity,&core.state.physical.entities,&self.command,&self.command.envelope().id,
                view,storage,core.state.physical.header.sim_time,activity_parent(&core.state.physical.entities,&self.command)).map_err(ExecutionError::Activity)?;
            core.journal.activity.record_stock_resolution(&mut core.state.activity,actor,&id,moved.admission).map_err(ExecutionError::Activity)?;
            self.activity_id=Some(id);
        }
        let NativeCommand::TransferStock{request,..}=&self.command else{return Err(ExecutionError::Invariant);};
        let event=core.stage_event(EventEmissionIntent{
            event_type:"items-transferred".into(),
            text:EmissionText::Narration(Narration{parts:vec![NarrationPart::Participant{ entity_id:actor.into(), role:PersonRole::Subject,article:None },
                NarrationPart::Literal(JsText::concat(&[&" ".into(),&COPY.stock_narration]))]}),
            audience:AudienceSelection::Physical,source_id:Some(actor.into()),target_id:Some(request.destination.clone()),
            data:None,scope:EventScope::External,origin:None,exposure:None,
        })?;
        self.event=Some(event.id.clone());self.after_event=Phase::ImmediateResult;
        Ok(Some(event))
    }
    pub(super) fn refuse_arrangement(
        &mut self,
        reason: OwnedMoveError,
    ) -> Result<(), ExecutionError> {
        let (code, message) = match &reason {
            OwnedMoveError::StockIncomplete => ("incomplete",&COPY.stock_incomplete),
            OwnedMoveError::InsufficientStock => ("insufficient",&COPY.insufficient_stock),
            OwnedMoveError::PersonalMinimum => ("insufficient",&COPY.personal_minimum),
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
        Ok(())
    }
}
