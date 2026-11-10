//! The free exact-description route binds an already offered command. Language
//! normalization is one finite Node batch; geometry and effects remain native.
use super::*;

fn without_sentence_end(text: &JsText) -> crate::text::TextSlice<'_> {
    let end = text
        .units()
        .enumerate()
        .filter(|(_, unit)| !matches!(unit, 33 | 46 | 63))
        .last()
        .map_or(0, |(index, _)| index + 1);
    text.borrowed()
        .slice(0..end)
        .expect("Prefix stays inside the same text")
}
pub(super) fn same_slots(left: &SqlCell, right: &SqlCell) -> bool {
    [
        "itemId",
        "instrumentId",
        "recipientId",
        "quantity",
        "quantityMode",
        "until",
        "method",
    ]
    .iter()
    .all(|key| {
        left.get("slots")
            .and_then(|slots| slots.get(key))
            .filter(|value| !value.is_null())
            == right
                .get("slots")
                .and_then(|slots| slots.get(key))
                .filter(|value| !value.is_null())
    })
}
fn fulfillment(text: &JsText) -> SqlCell {
    let mut fields = IndexMap::with_capacity(6);
    fields.insert("requested".into(), text.clone().into());
    fields.insert("executableDescription".into(), text.clone().into());
    fields.insert("verdict".into(), "exact".into());
    fields.insert(
        "supported".into(),
        SqlCell::Array(vec![text.clone().into()]),
    );
    fields.insert("omitted".into(), SqlCell::Array(Vec::new()));
    fields.insert(
        "reason".into(),
        "Complete native form bound without inference.".into(),
    );
    SqlCell::Object(fields)
}
impl ResponseCursor {
    pub(super) fn proposal_descriptions(
        response: &ActorResponse,
    ) -> impl Iterator<Item = &JsText> + Clone {
        (0..response.len())
            .filter_map(|index| response.operation(index))
            .filter(|op| {
                op.kind == ResponseKind::Act
                    && op.data.get("kind").and_then(SqlCell::as_str) == Some("proposal")
            })
            .filter_map(|op| op.text("description"))
    }
    pub(super) fn ground_offered(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<Vec<(usize, usize)>, ExecutionError> {
        let native = self
            .bindings
            .input
            .native
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let normalized = self.normalized.as_ref().ok_or(ExecutionError::Invariant)?;
        let count = Self::proposal_descriptions(&self.response).count();
        let command_bytes = native
            .attempt_candidates
            .iter()
            .try_fold(0, |maximum, candidate| {
                candidate
                    .command
                    .heap_bytes()
                    .map(|bytes| maximum.max(bytes))
            })
            .ok_or(ExecutionError::Capacity)?;
        let text_bytes = Self::proposal_descriptions(&self.response)
            .try_fold(0, |maximum, text| {
                text.heap_bytes().map(|bytes| maximum.max(bytes))
            })
            .ok_or(ExecutionError::Capacity)?;
        let operation_bytes = (0..self.response.len())
            .filter_map(|index| self.response.operation(index))
            .map(|op| op.local_id.len())
            .max()
            .unwrap_or(0);
        let bound = heap_sum([
            size_of::<ResponseAttemptBinding>(),
            command_bytes,
            operation_bytes,
            text_bytes.checked_mul(5).ok_or(ExecutionError::Capacity)?,
            map_storage::<String, SqlCell>(7).ok_or(ExecutionError::Capacity)?,
            1024,
        ])
        .and_then(|n| n.checked_mul(count.min(4)))
        .and_then(|n| {
            n.checked_add(4 * (size_of::<(usize, usize, usize)>() + size_of::<(usize, usize)>()))
        })
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = self.budget.reserve(bound)?;
        let mut additions: Vec<ResponseAttemptBinding> = Vec::with_capacity(count.min(4));
        let mut seen: Vec<(usize, usize, usize)> = Vec::with_capacity(4);
        let mut operations = Vec::with_capacity(count.min(4));
        let scope = crate::reception::CurrentBodyReadScope::prepare(
            &core.state.reception,
            &core.state.physical.entities,
            &core.state.installed,
            &core.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            self.bindings.actor_id(),
        )?;
        let mut proposal_index = 0;
        let mut eligible = 0;
        for index in 0..self.response.len() {
            let op = self
                .response
                .operation(index)
                .ok_or(ExecutionError::Invariant)?;
            if op.kind != ResponseKind::Act
                || op.data.get("kind").and_then(SqlCell::as_str) != Some("proposal")
            {
                continue;
            }
            let Some(description) = op.text("description") else {
                continue;
            };
            let position = proposal_index;
            proposal_index += 1;
            let target = op.data.get("targetEntityId").and_then(SqlCell::as_str);
            let permitted = |target: &str| -> Result<bool, ExecutionError> {
                if target == self.bindings.actor_id() {
                    return Ok(true);
                }
                let current = scope
                    .as_ref()
                    .map(|scope| scope.native_body(target))
                    .transpose()?
                    .flatten();
                Ok(self
                    .bindings
                    .input
                    .entity_leases
                    .get(target)
                    .is_some_and(|lease| current.is_some_and(|body| body.field.id == *lease)))
            };
            if target
                .map(permitted)
                .transpose()?
                .is_some_and(|permitted| !permitted)
            {
                continue;
            }
            let slots = op.data.get("slots").filter(|slots| !slots.is_null());
            if slots
                .and_then(|slots| slots.get("until"))
                .filter(|value| !value.is_null())
                .is_some_and(|value| {
                    !value.as_str().is_some_and(|name| {
                        core.state
                            .installed
                            .status_policy
                            .named_times
                            .contains_key(name)
                    })
                })
            {
                continue;
            }
            let mut slot_references_permitted = true;
            for id in ["itemId", "instrumentId", "recipientId"]
                .iter()
                .filter_map(|key| slots.and_then(|slots| slots.get(key)))
                .filter_map(SqlCell::as_str)
            {
                if !permitted(id)? {
                    slot_references_permitted = false;
                    break;
                }
            }
            if !slot_references_permitted {
                continue;
            }
            eligible += 1;
            if eligible > 4 {
                break;
            }
            operations.push((index, position));
            let language = normalized.get(position).ok_or(ExecutionError::Invariant)?;
            if let Some((_, _, bound)) = seen.iter().find(|(prior, prior_position, _)| {
                let prior_op = self
                    .response
                    .operation(*prior)
                    .expect("Earlier real operation");
                normalized
                    .get(*prior_position)
                    .is_some_and(|prior| prior.normalized() == language.normalized())
                    && prior_op.data.get("targetEntityId") == op.data.get("targetEntityId")
                    && prior_op.data.get("mode") == op.data.get("mode")
                    && same_slots(prior_op.data, op.data)
            }) {
                let mut prior: ResponseAttemptBinding = additions[*bound].clone();
                prior.operation_id = Some(op.local_id.into());
                prior.description = description.clone();
                if let Some(SqlCell::Object(report)) = prior.fulfillment.as_mut() {
                    report.insert("requested".into(), description.clone().into());
                }
                additions.push(prior);
                continue;
            }
            let mut matches =
                native
                    .attempt_candidates
                    .iter()
                    .enumerate()
                    .filter(|(ordinal, candidate)| {
                        let target_matches = target.is_none_or(|target| {
                            ["targetId", "heatId"].into_iter().any(|field| {
                                candidate.command.get(field).and_then(SqlCell::as_str)
                                    == Some(target)
                            })
                        });
                        target_matches
                            && super::super::slots::unmet_slots(
                                &core.state.installed,
                                std::slice::from_ref(&candidate.command),
                                slots,
                            )
                            .iter()
                            .all(Option::is_none)
                            && normalized.get(count + *ordinal).is_some_and(|candidate| {
                                without_sentence_end(candidate.normalized())
                                    .units()
                                    .eq(without_sentence_end(language.normalized()).units())
                            })
                    });
            let selected = matches.next().map(|(_, candidate)| candidate);
            if matches.next().is_some() {
                continue;
            }
            if let Some(candidate) = selected {
                seen.push((index, position, additions.len()));
                additions.push(ResponseAttemptBinding {
                    operation_id: Some(op.local_id.into()),
                    manifest_revision: Some(core.state.installed.manifest.revision),
                    target_episodes: None,
                    fulfillment: Some(fulfillment(description)),
                    resolution: None,
                    keep: None,
                    description: description.clone(),
                    commands: vec![candidate.command.clone()],
                });
            }
        }
        drop(scope);
        drop(seen);
        storage.resize(
            additions
                .heap_bytes()
                .and_then(|n| n.checked_add(operations.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if !self.attempt_bindings.is_empty() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.attempt_bindings = additions;
        self.merge(storage)?;
        Ok(operations)
    }
}
