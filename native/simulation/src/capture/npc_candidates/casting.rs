//! A cast offer binds a known source to an accessible tool. The ordinary
//! command preview remains responsible for physical admission and rollback.
use super::*;
use crate::{casts, text::JsText};

struct CastTool {
    kind: String,
    id: String,
    order: usize,
}

pub(super) struct CastTools {
    entries: Vec<CastTool>,
    _entries: ByteReservation,
    _text: ByteReservation,
}

impl CastTools {
    /// Walk accessible owned lots once, only after finding a currently visible
    /// cast source. Group compatible kinds without reordering tools in a group.
    fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &core.state;
        let installed = &state.installed.retained;
        let mut entries = Vec::<CastTool>::new();
        let mut backing = budget.reserve(0)?;
        let mut text = budget.reserve(0)?;
        state.inventory.visit_owned(
            &state.physical,
            installed,
            actor,
            actor,
            &mut |item| {
                let Some(kind) = installed
                    .items
                    .get(item.definition_id)
                    .ok_or(ExecutionError::Invariant)?
                    .fishing_kind()
                else {
                    return Ok(());
                };
                if item.available_quantity == 0 {
                    return Ok(());
                }
                if entries.len() == entries.capacity() {
                    let capacity = entries
                        .capacity()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?
                        .max(4);
                    let replacement = budget.reserve(
                        capacity
                            .checked_mul(size_of::<CastTool>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    entries
                        .try_reserve_exact(capacity - entries.len())
                        .map_err(|_| ExecutionError::Capacity)?;
                    backing = replacement;
                }
                text.resize(
                    heap_sum([text.bytes(), kind.len(), item.id.len()])
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                entries.push(CastTool {
                    kind: kind.to_owned(),
                    id: item.id.to_owned(),
                    order: entries.len(),
                });
                Ok(())
            },
        )?;
        entries.sort_unstable_by(|left, right| {
            left.kind
                .cmp(&right.kind)
                .then(left.order.cmp(&right.order))
        });
        Ok(Self {
            entries,
            _entries: backing,
            _text: text,
        })
    }

    fn first(&self, kind: &str) -> usize {
        self.entries
            .partition_point(|tool| tool.kind.as_str() < kind)
    }
}

impl NpcCandidateCursor {
    pub(super) fn offer_cast(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        next_tool: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        let target = &self.targets[index];
        let source = target
            .visible
            .then(|| casts::source(core.state, &target.id))
            .flatten();
        let Some(source) = source.filter(|source| source.stock.quantity > 0) else {
            self.stage = Enumerate::Fish(index + 1, 0);
            return Ok(());
        };
        if self.cast_tools.is_none() {
            self.cast_tools = Some(CastTools::prepare(core, &self.actor, &self.budget)?);
        }
        let tools = self.cast_tools.as_ref().ok_or(ExecutionError::Invariant)?;
        let kind = &source.rules.definition.tool_kind;
        let at = if next_tool == 0 {
            tools.first(kind)
        } else {
            next_tool
        };
        let Some(tool) = tools.entries.get(at).filter(|tool| tool.kind == *kind) else {
            self.stage = Enumerate::Fish(index + 1, 0);
            return Ok(());
        };
        self.stage = Enumerate::Fish(index, at + 1);
        let mut input = CommandInput::new(&self.actor, preparation_id, "fish");
        input.target_id = Some(&target.id);
        input.item_id = Some(&tool.id);
        let body = target.body;
        let (command, guard) = self.command(&input)?;
        // Opaque names separate tool/target pairs even when IDs contain punctuation.
        let _scratch = self
            .budget
            .reserve((target.id.len() + tool.id.len()) * 8 + 128)?;
        let binding = crate::encoding::json_record(&(&target.id, &tool.id))
            .map_err(|_| ExecutionError::Invariant)?;
        let id = self.id(&["fish-", &crate::encoding::sha256_hex(binding.as_bytes())])?;
        self.start(
            core,
            id,
            NpcOfferMeaning::Fish { body },
            command,
            guard,
            WorkTransitionMode::Replace,
        )
    }

    pub(super) fn describe_cast(
        &self,
        core: &CoreMutation<'_>,
        offer: &mut PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let NpcOfferMeaning::Fish { body } = offer.meaning else {
            return Ok(());
        };
        let Some(NativeCommand::Fish {
            target_id, item_id, ..
        }) = offer.command.command()
        else {
            return Err(ExecutionError::Invariant);
        };
        let source = casts::source(core.state, target_id).ok_or(ExecutionError::Invariant)?;
        let tool = casts::tool(core.state, &self.actor, item_id, &source)?
            .ok_or(ExecutionError::Invariant)?;
        let target = self
            .description_context
            .as_ref()
            .and_then(|read| read.observed_name(body))
            .ok_or(ExecutionError::Invariant)?;
        let rules = &source.rules.definition;
        let mut protection = self.budget.reserve(text_bound([
            &rules.action_label,
            &tool.named.name,
            target,
            &rules.description,
        ])?)?;
        let description = JsText::concat(&[
            &rules.action_label,
            &" ".into(),
            &tool.named.name,
            &" at ".into(),
            target,
            &". ".into(),
            &rules.description,
        ]);
        protection.resize(description.storage_bytes())?;
        offer._storage.merge(protection)?;
        offer.description = Some(description);
        Ok(())
    }
}

pub(super) fn text_bound<'a>(
    parts: impl IntoIterator<Item = &'a JsText>,
) -> Result<usize, ExecutionError> {
    // An exact JavaScript string may retain both UTF-16 units and its quoted
    // JSON spelling. A fresh join must coexist with its original inputs.
    parts
        .into_iter()
        .try_fold(128, |total: usize, part| {
            total.checked_add(part.units_len().checked_mul(12)?)
        })
        .ok_or(ExecutionError::Capacity)
}

pub(super) fn append_offer_details(
    prepared: &mut JsText,
    suffix: &JsText,
    custody: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let before = prepared.storage_bytes();
    let mut protection = budget.reserve(text_bound([&*prepared, suffix])?)?;
    let complete = JsText::concat(&[prepared, suffix]);
    protection.resize(complete.storage_bytes())?;
    custody.merge(protection)?;
    *prepared = complete;
    custody.resize(custody.bytes() - before)?;
    Ok(())
}
