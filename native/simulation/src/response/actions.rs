//! Supplied choices retain their own work and target fences. This module chooses
//! an existing command/plan owner; it never performs a physical action itself.
use super::*;
use crate::commands::{NativeCommand, WorkTransitionMode};
use crate::execution::CoreMutation;
use crate::language::NormalizedAttempt;
use crate::plans::{DeferredIntent, IntentSlots, PlanEditInput, PlanMode};
use crate::records::SqlCell;
use crate::text::JsText;

pub(super) enum ActionIntent {
    Complete(ComponentResult),
    Command(NativeCommand),
    Plan(PlanEditInput),
    Invoke,
    Expression,
    CancelPlan,
}
fn result(
    ok: bool,
    code: &str,
    message: &str,
    budget: &ByteBudget,
) -> Result<ActionIntent, ExecutionError> {
    Ok(ActionIntent::Complete(ComponentResult::prepare(
        ok,
        code,
        message.into(),
        budget,
    )?))
}
pub(super) fn mode(data: &SqlCell) -> Result<PlanMode, ExecutionError> {
    match data.get("mode").and_then(SqlCell::as_str) {
        Some("enqueue") => Ok(PlanMode::Enqueue),
        Some("replace") => Ok(PlanMode::Replace),
        Some("interrupt") => Ok(PlanMode::Interrupt),
        _ => Err(ExecutionError::Invariant),
    }
}
pub(super) fn transition(mode: PlanMode) -> WorkTransitionMode {
    match mode {
        PlanMode::Enqueue => WorkTransitionMode::Enqueue,
        PlanMode::Replace => WorkTransitionMode::Replace,
        PlanMode::Interrupt => WorkTransitionMode::Interrupt,
    }
}
fn truthy(value: Option<&SqlCell>) -> bool {
    value.is_some_and(|v| !v.is_null() && v.as_text().is_none_or(|s| !s.is_empty()))
}
pub(super) fn decode<T: serde::de::DeserializeOwned>(value: &SqlCell) -> Result<T, ExecutionError> {
    let json = crate::encoding::json_record(value).map_err(|_| ExecutionError::Invariant)?;
    serde_json::from_str(&json).map_err(|_| ExecutionError::Invariant)
}
/// Spread preserves the actual offered command property positions. Source only
/// replaces actor/id here; unsupported families remain an ordinary component refusal.
pub(super) fn command(
    raw: &SqlCell,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Option<NativeCommand>, ExecutionError> {
    if !matches!(
        raw.get("type").and_then(SqlCell::as_str),
        Some("move" | "say" | "status-effect" | "cancel")
    ) {
        return Ok(None);
    }
    let bytes = raw
        .heap_bytes()
        .and_then(|n| n.checked_mul(8))
        .and_then(|n| n.checked_add((actor.len() + id.len()) * 8 + 256))
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let mut value = raw.as_object().ok_or(ExecutionError::Invariant)?.clone();
    value.insert("actorId".into(), actor.into());
    value.insert("id".into(), id.into());
    let json = crate::encoding::json_record(&SqlCell::Object(value))
        .map_err(|_| ExecutionError::Invariant)?;
    Ok(serde_json::from_str(&json).ok())
}
fn target_current(
    core: &CoreMutation<'_>,
    actor: &str,
    target: &str,
    expected: Option<&Option<String>>,
) -> bool {
    target == actor
        || !core
            .state
            .physical
            .entities
            .get(target)
            .is_some_and(|e| e.actor.is_some())
        || crate::worlds::base_knowledge::subject_reference_current(
            &core.state.reception,
            actor,
            target,
            expected,
        )
}
fn raw_targets<'a>(raw: &'a SqlCell, actor: &'a str) -> impl Iterator<Item = &'a str> {
    [raw.get("targetId"), raw.get("heatId")]
        .into_iter()
        .flatten()
        .filter_map(SqlCell::as_str)
        .filter(move |id| !id.is_empty() && *id != actor)
}
fn targets_current(
    core: &CoreMutation<'_>,
    actor: &str,
    commands: &[SqlCell],
    expected: Option<&IndexMap<String, Option<String>>>,
) -> bool {
    commands.iter().all(|raw| {
        raw_targets(raw, actor)
            .all(|target| target_current(core, actor, target, expected.and_then(|m| m.get(target))))
    })
}
/// Scope checks precede kind checks so a hidden target cannot be probed through
/// different slot errors. No whole-world subject roster is constructed.
pub(super) fn target_gate(
    core: &CoreMutation<'_>,
    bindings: &ResponseBindings,
    op: &ResponseOperation<'_>,
    budget: &ByteBudget,
) -> Result<Option<ComponentResult>, ExecutionError> {
    let data = op.data;
    let actor = bindings.actor_id();
    let input = &bindings.input;
    let direct = if op.kind == ResponseKind::Talk {
        data.get("addresseeEntityId")
    } else if op.kind == ResponseKind::Act {
        data.get("invocation")
            .and_then(|i| i.get("targetEntityId"))
            .filter(|v| !v.is_null())
            .or_else(|| data.get("targetEntityId"))
    } else {
        None
    };
    let slots = if op.kind == ResponseKind::Act {
        data.get("slots").filter(|v| !v.is_null())
    } else {
        None
    };
    let permitted = |v: &SqlCell| {
        v.as_str()
            .is_some_and(|id| input.entity_ids.iter().any(|p| p == id))
    };
    if direct
        .filter(|v| truthy(Some(v)))
        .is_some_and(|v| !permitted(v))
        || slots.is_some_and(|s| {
            ["itemId", "instrumentId", "recipientId"]
                .iter()
                .filter_map(|k| s.get(k))
                .filter(|v| truthy(Some(v)))
                .any(|v| !permitted(v))
        })
    {
        return Ok(Some(ComponentResult::prepare(
            false,
            "unpermitted-target",
            "The requested target was not in this decision context.".into(),
            budget,
        )?));
    }
    if let Some(slots) = slots {
        // Full actor-only installation and all selected writers prohibit live
        // item entities. An offered actor cannot become an item/tool by naming it.
        if ["itemId", "instrumentId"]
            .iter()
            .any(|k| truthy(slots.get(k)))
            || slots
                .get("recipientId")
                .filter(|v| truthy(Some(v)))
                .is_some_and(|v| {
                    !v.as_str()
                        .and_then(|id| core.state.physical.entities.get(id))
                        .is_some_and(|e| e.actor.is_some())
                })
        {
            return Ok(Some(ComponentResult::prepare(false,"invalid-slot","An item or tool reference must name an item, and a recipient must name a living being.".into(),budget)?));
        }
        let slots: IntentSlots = decode(slots)?;
        if !slots.named_times_valid(&core.state.installed) {
            return Ok(Some(ComponentResult::prepare(
                false,
                "invalid-slot",
                "That stopping time is not one this world names.".into(),
                budget,
            )?));
        }
    }
    let mut commands = Vec::<&SqlCell>::new();
    let count = if op.kind == ResponseKind::Plan {
        data.get("steps")
            .and_then(SqlCell::as_array)
            .map_or(0, |s| s.len())
    } else {
        1
    };
    let _list = budget.reserve((count + 2) * size_of::<&SqlCell>())?;
    if op.kind == ResponseKind::Act && data.get("kind").and_then(SqlCell::as_str) == Some("known") {
        if let Some(command) = data
            .get("actionId")
            .and_then(SqlCell::as_str)
            .and_then(|id| input.actions.get(id))
            .and_then(|c| c.invocation.as_ref())
        {
            commands.push(command)
        }
    } else if op.kind == ResponseKind::Plan {
        for step in data
            .get("steps")
            .and_then(SqlCell::as_array)
            .ok_or(ExecutionError::Invariant)?
        {
            if let Some(command) = step
                .get("actionId")
                .and_then(SqlCell::as_str)
                .and_then(|id| input.actions.get(id))
                .and_then(|c| c.invocation.as_ref())
            {
                commands.push(command)
            }
        }
    }
    let targets = || {
        commands
            .iter()
            .flat_map(|command| raw_targets(command, actor))
            .chain(if op.kind == ResponseKind::Act {
                direct.and_then(SqlCell::as_str)
            } else {
                None
            })
            .chain(
                slots
                    .and_then(|v| v.get("recipientId"))
                    .and_then(SqlCell::as_str),
            )
    };
    let law = core.state.installed.account_law();
    let scope = crate::reception::CurrentBodyReadScope::prepare(
        &core.state.reception,
        &core.state.physical.entities,
        &core.state.installed,
        &core.state.experience,
        &law,
        actor,
    )?;
    for target in targets() {
        if let Some(lease) = input.entity_leases.get(target) {
            let current = scope
                .as_ref()
                .map(|s| s.observed(target, "body"))
                .transpose()?
                .flatten();
            if current.map(|v| v.field.id.as_str()) != Some(lease.as_str()) {
                return Ok(Some(ComponentResult::prepare(
                    false,
                    "stale-body",
                    "The observed body is no longer the same current observation.".into(),
                    budget,
                )?));
            }
        }
    }
    if let Some(expected) = &input.expected_encounters {
        for target in targets() {
            let value = expected.get(target).cloned();
            if !target_current(core, actor, target, Some(&value)) {
                return Ok(Some(ComponentResult::prepare(
                    false,
                    "stale-encounter",
                    "The referenced target encounter changed.".into(),
                    budget,
                )?));
            }
        }
    }
    Ok(None)
}
fn plan(
    core: &CoreMutation<'_>,
    actor: &str,
    id: &str,
    commands: Vec<NativeCommand>,
    mode: PlanMode,
    goal: Option<String>,
    revision: Option<u64>,
) -> Result<ActionIntent, ExecutionError> {
    let revision = revision.unwrap_or(
        core.state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .agency
            .plan
            .as_ref()
            .map_or(0, |p| p.revision),
    );
    Ok(ActionIntent::Plan(PlanEditInput {
        id: id.into(),
        actor_id: actor.into(),
        commands,
        mode,
        expected_revision: revision,
        goal_id: goal,
    }))
}
fn supported(
    raw: &SqlCell,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Result<NativeCommand, ActionIntent>, ExecutionError> {
    Ok(match command(raw, actor, id, budget)? {
        Some(command) => Ok(command),
        None => Err(result(
            false,
            "unsupported-action",
            "That action family is not available in this native execution scope.",
            budget,
        )?),
    })
}
fn fulfillment(value: &SqlCell, description: &JsText) -> bool {
    let text = |key: &str, max| {
        value
            .get(key)
            .and_then(SqlCell::as_text)
            .is_some_and(|v| !v.trim_is_empty() && v.units_len() <= max)
    };
    let Some(verdict) = value
        .get("verdict")
        .and_then(SqlCell::as_str)
        .filter(|v| ["exact", "partial", "confirm"].contains(v))
    else {
        return false;
    };
    let Some(supported) = value.get("supported").and_then(SqlCell::as_array) else {
        return false;
    };
    let Some(omitted) = value.get("omitted").and_then(SqlCell::as_array) else {
        return false;
    };
    value.get("requested").and_then(SqlCell::as_text) == Some(description)
        && text("requested", 500)
        && text("executableDescription", 1000)
        && text("reason", 1000)
        && supported.len() <= 8
        && supported.iter().all(|v| {
            v.as_text()
                .is_some_and(|v| !v.trim_is_empty() && v.units_len() <= 500)
        })
        && omitted.len() <= 8
        && omitted.iter().all(|v| {
            ["requirement", "reason"].iter().all(|k| {
                v.get(k)
                    .and_then(SqlCell::as_text)
                    .is_some_and(|t| !t.trim_is_empty() && t.units_len() <= 500)
            })
        })
        && (verdict != "exact" || omitted.is_empty())
        && (verdict != "partial" || !omitted.is_empty())
}
pub(super) fn prepare(
    core: &mut CoreMutation<'_>,
    bindings: &ResponseBindings,
    response_id: &str,
    op: &ResponseOperation<'_>,
    initial_generation: u64,
    language: Option<NormalizedAttempt<'_>>,
    budget: &ByteBudget,
) -> Result<ActionIntent, ExecutionError> {
    let actor = bindings.actor_id();
    let data = op.data;
    let input = &bindings.input;
    let id = format!("{response_id}:{}", op.local_id);
    if op.kind == ResponseKind::Talk {
        let target = data.get("addresseeEntityId").filter(|v| truthy(Some(v)));
        let valid = target.is_none_or(|v| {
            v.as_str().is_some_and(|id| {
                input.entity_ids.iter().any(|p| p == id)
                    && core.state.physical.entities.get(id).is_some()
            })
        });
        let text = op.text("text").ok_or(ExecutionError::Invariant)?;
        if text.trim_is_empty() || text.units_len() > 1200 || !valid {
            return result(
                false,
                "invalid-speech",
                if valid {
                    "Speech must contain 1–1200 characters."
                } else {
                    "talk.addresseeEntityId must be null for ambient speech or a permitted existing entity ID."
                },
                budget,
            );
        }
        let mut raw = IndexMap::new();
        raw.insert("id".into(), id.as_str().into());
        raw.insert("actorId".into(), actor.into());
        raw.insert("type".into(), "say".into());
        raw.insert("text".into(), text.clone().into());
        if let Some(name) = op.text("selfIntroduction").filter(|name| !name.is_empty()) {
            raw.insert("selfIntroduction".into(), name.clone().into());
        }
        raw.insert(
            "volume".into(),
            data.get("volume").ok_or(ExecutionError::Invariant)?.clone(),
        );
        if let Some(target) = target {
            raw.insert("targetId".into(), target.clone());
            raw.insert(
                "targetRole".into(),
                data.get("addresseeRole")
                    .cloned()
                    .unwrap_or_else(|| "body".into()),
            );
        }
        return Ok(ActionIntent::Command(decode(&SqlCell::Object(raw))?));
    }
    let kind = data
        .get("kind")
        .and_then(SqlCell::as_str)
        .ok_or(ExecutionError::Invariant)?;
    let invalid = (kind != "invoke" && truthy(data.get("invocation")))
        || (kind != "proposal" && truthy(data.get("slots")))
        || match kind {
            "invoke" => {
                !truthy(data.get("invocation"))
                    || ["actionId", "verb", "targetEntityId", "description"]
                        .iter()
                        .any(|k| truthy(data.get(k)))
            }
            "known" => {
                !truthy(data.get("actionId"))
                    || ["verb", "targetEntityId", "description"]
                        .iter()
                        .any(|k| truthy(data.get(k)))
            }
            "expression" => {
                !truthy(data.get("verb"))
                    || ["actionId", "description"]
                        .iter()
                        .any(|k| truthy(data.get(k)))
            }
            "proposal" => {
                !truthy(data.get("description"))
                    || op.text("description").is_some_and(|t| t.units_len() > 500)
                    || ["actionId", "verb"].iter().any(|k| truthy(data.get(k)))
            }
            _ => true,
        };
    if invalid {
        return result(
            false,
            "invalid-action-response",
            "The proposed action fields do not match its kind.",
            budget,
        );
    }
    let mode = mode(data)?;
    let stale = || !matches!(mode, PlanMode::Enqueue) && initial_generation != input.expected_plan;
    match kind {
        "expression" => Ok(ActionIntent::Expression),
        "invoke" => Ok(ActionIntent::Invoke),
        "known" => {
            let Some(choice) = op
                .text("actionId")
                .and_then(JsText::as_unicode)
                .and_then(|id| input.actions.get(id))
            else {
                return result(
                    false,
                    "unoffered-action",
                    "The proposed action was not offered.",
                    budget,
                );
            };
            if !choice.expected_work.current(core.state, actor)
                || (choice.transition != WorkTransitionMode::Continue
                    && transition(mode) != choice.transition)
                || stale()
            {
                return result(false, "stale-plan", "The current task changed.", budget);
            }
            if let Some(raw) = &choice.invocation {
                let selected = match supported(raw, actor, &id, budget)? {
                    Ok(command) => command,
                    Err(result) => return Ok(result),
                };
                if matches!(selected, NativeCommand::Cancel { .. }) {
                    Ok(ActionIntent::Command(selected))
                } else {
                    plan(core, actor, &id, vec![selected], mode, None, None)
                }
            } else {
                let mut message: JsText = if let Some(purpose) = &choice.purpose {
                    let mut text: JsText = "Selected purpose: ".into();
                    text.push_text(&purpose.description);
                    text.push_str(". Existing behavior continues.");
                    text
                } else {
                    "Existing behavior continues.".into()
                };
                let storage = budget.reserve(
                    message.heap_bytes().ok_or(ExecutionError::Capacity)? + "continued".len(),
                )?;
                Ok(ActionIntent::Complete(ComponentResult {
                    outcome: Outcome {
                        ok: true,
                        code: "continued".into(),
                        message: std::mem::take(&mut message),
                        spent: None,
                        outputs: None,
                        recipe_id: None,
                        item_id: None,
                        entity_id: None,
                        goal_id: None,
                        plan_id: None,
                        action_id: None,
                    },
                    storage,
                }))
            }
        }
        "proposal" => {
            let description = op.text("description").ok_or(ExecutionError::Invariant)?;
            let target = op
                .text("targetEntityId")
                .and_then(JsText::as_unicode)
                .filter(|id| !id.is_empty());
            let slots = data
                .get("slots")
                .filter(|v| !v.is_null())
                .map(decode::<IntentSlots>)
                .transpose()?;
            let matches = || {
                input.attempt_bindings.iter().filter(|b| {
                    b.operation_id.as_deref() == Some(op.local_id) && &b.description == description
                })
            };
            let binding = if matches().count() == 1 {
                matches().next()
            } else {
                None
            };
            if let Some(binding) = binding.filter(|b| b.resolution.is_some()) {
                let resolution = binding
                    .resolution
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?;
                let reason = resolution
                    .value()
                    .get("reason")
                    .and_then(SqlCell::as_text)
                    .ok_or(ExecutionError::Invariant)?;
                let held = if binding.keep == Some(true) {
                    Some(
                        crate::plans::defer_attempt(
                            core,
                            actor,
                            DeferredIntent {
                                id: &id,
                                language: language.ok_or(ExecutionError::Invariant)?,
                                target_entity_id: target,
                                mode,
                                slots: slots.as_ref(),
                                resolution: Some(resolution),
                            },
                            budget,
                        )?
                        .into_parts(),
                    )
                } else {
                    None
                };
                let mut message = reason.clone();
                if let Some((outcome, _)) = &held {
                    if !outcome.ok {
                        message.push_str(" ");
                        message.push_text(&outcome.message);
                    }
                }
                let code = resolution
                    .value()
                    .get("category")
                    .and_then(SqlCell::as_str)
                    .ok_or(ExecutionError::Invariant)?;
                return Ok(ActionIntent::Complete(ComponentResult::prepare(
                    false,
                    code,
                    (&message).into(),
                    budget,
                )?));
            }
            let Some(binding) = binding else {
                return Ok(ActionIntent::Complete(ComponentResult::from_parts(
                    crate::plans::defer_attempt(
                        core,
                        actor,
                        DeferredIntent {
                            id: &id,
                            language: language.ok_or(ExecutionError::Invariant)?,
                            target_entity_id: target,
                            mode,
                            slots: slots.as_ref(),
                            resolution: None,
                        },
                        budget,
                    )?
                    .into_parts(),
                )));
            };
            if binding.manifest_revision != Some(core.state.installed.manifest.revision) {
                return result(
                    false,
                    "stale-mechanics",
                    "Mechanics changed after this action was interpreted.",
                    budget,
                );
            }
            if !targets_current(
                core,
                actor,
                &binding.commands,
                binding.target_episodes.as_ref(),
            ) {
                return result(
                    false,
                    "stale-encounter",
                    "The interpreted target encounter changed.",
                    budget,
                );
            }
            if target.is_some_and(|target| {
                binding.commands.iter().any(|raw| {
                    raw.get("targetId")
                        .and_then(SqlCell::as_str)
                        .is_some_and(|id| id != target)
                        || raw
                            .get("heatId")
                            .and_then(SqlCell::as_str)
                            .is_some_and(|id| id != target)
                })
            }) {
                return result(
                    false,
                    "target-mismatch",
                    "The explicit target does not match the resolved native action.",
                    budget,
                );
            }
            let Some(fulfillment) = binding
                .fulfillment
                .as_ref()
                .filter(|f| fulfillment(f, description))
            else {
                return result(
                    false,
                    "invalid-fulfillment",
                    "The action fulfillment report is invalid.",
                    budget,
                );
            };
            if fulfillment.get("verdict").and_then(SqlCell::as_str) == Some("confirm") {
                return result(
                    false,
                    "unsupported-action",
                    "Held action revisions are not available in this native execution scope.",
                    budget,
                );
            }
            if stale() {
                return result(
                    false,
                    "stale-plan",
                    "The current native task changed.",
                    budget,
                );
            }
            let mut commands = Vec::with_capacity(binding.commands.len());
            for (index, raw) in binding.commands.iter().enumerate() {
                let command_id = if binding.commands.len() == 1
                    && raw.get("type").and_then(SqlCell::as_str) == Some("cancel")
                {
                    id.clone()
                } else {
                    format!("{id}:{index}")
                };
                match supported(raw, actor, &command_id, budget)? {
                    Ok(command) => commands.push(command),
                    Err(result) => return Ok(result),
                }
            }
            if let Some(slots) = slots
                .as_ref()
                .filter(|_| fulfillment.get("verdict").and_then(SqlCell::as_str) == Some("exact"))
            {
                let slots = slots.value();
                let mut unmet = Vec::<JsText>::new();
                if let Some(recipient) = slots.get("recipientId").and_then(SqlCell::as_str) {
                    if !binding
                        .commands
                        .iter()
                        .any(|c| c.get("targetId").and_then(SqlCell::as_str) == Some(recipient))
                    {
                        unmet.push("the requested recipient".into());
                    }
                }
                if slots.get("quantity").is_some_and(|v| !v.is_null()) {
                    unmet.push("the requested amount".into())
                }
                for (key, prefix) in [
                    ("until", "the requested stopping time ("),
                    ("method", "the requested method ("),
                ] {
                    if let Some(text) = slots
                        .get(key)
                        .and_then(SqlCell::as_text)
                        .filter(|v| !v.is_empty())
                    {
                        let mut text0: JsText = prefix.into();
                        text0.push_text(text);
                        text0.push_str(")");
                        unmet.push(text0);
                    }
                }
                if !unmet.is_empty() {
                    let mut message: JsText = "The resolved action does not keep ".into();
                    for (i, part) in unmet.iter().enumerate() {
                        if i != 0 {
                            message.push_str(", ");
                        }
                        message.push_text(part)
                    }
                    message.push_str(".");
                    return Ok(ActionIntent::Complete(ComponentResult::prepare(
                        false,
                        "slot-mismatch",
                        (&message).into(),
                        budget,
                    )?));
                }
            }
            if commands.len() == 1 && matches!(&commands[0], NativeCommand::Cancel { .. }) {
                Ok(ActionIntent::Command(commands.remove(0)))
            } else {
                plan(core, actor, &id, commands, mode, None, None)
            }
        }
        _ => Err(ExecutionError::Invariant),
    }
}
pub(super) fn goal_ref(
    value: &SqlCell,
    dependencies: &[SqlCell],
    components: &IndexMap<String, Outcome>,
) -> Option<Option<String>> {
    if value.is_null() {
        return Some(None);
    }
    let reference = value.as_str()?;
    if let Some(alias) = reference.strip_prefix('$') {
        if !dependencies.iter().any(|v| v.as_str() == Some(alias)) {
            return None;
        }
        return components
            .get(alias)
            .and_then(|o| o.goal_id.clone())
            .map(Some);
    }
    Some(Some(reference.into()))
}
pub(super) fn prepare_plan(
    core: &CoreMutation<'_>,
    bindings: &ResponseBindings,
    response_id: &str,
    op: &ResponseOperation<'_>,
    components: &IndexMap<String, Outcome>,
    budget: &ByteBudget,
) -> Result<ActionIntent, ExecutionError> {
    let data = op.data;
    let input = &bindings.input;
    let actor = bindings.actor_id();
    if data
        .get("goalId")
        .and_then(SqlCell::as_text)
        .is_some_and(|text| text.as_unicode().is_none() && text.unit_at(0) != Some(b'$' as u16))
    {
        let rule = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .plan
            .invalid_goal;
        return result(false, &rule.code, &rule.message, budget);
    }
    let Some(goal) = goal_ref(
        data.get("goalId").ok_or(ExecutionError::Invariant)?,
        op.requires_accepted,
        components,
    ) else {
        return result(
            false,
            "unoffered-action",
            "Plan references require supplied actions and accepted goals.",
            budget,
        );
    };
    let steps = data
        .get("steps")
        .and_then(SqlCell::as_array)
        .ok_or(ExecutionError::Invariant)?;
    if steps.iter().any(|s| {
        s.get("actionId").filter(|v| !v.is_null()).is_some_and(|v| {
            v.as_str()
                .and_then(|id| input.actions.get(id))
                .and_then(|c| c.invocation.as_ref())
                .is_none()
        })
    }) {
        return result(
            false,
            "unoffered-action",
            "Plan references require supplied actions and accepted goals.",
            budget,
        );
    }
    if data.get("mode").and_then(SqlCell::as_str) == Some("cancel") {
        let current = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.plan.as_ref())
            .map_or(0, |p| p.revision);
        if !steps.is_empty()
            || !data.get("goalId").is_some_and(SqlCell::is_null)
            || data.get("expectedRevision").and_then(SqlCell::as_u64) != Some(current)
        {
            return result(
                false,
                "invalid-plan",
                "Cancellation requires the current plan revision and no new steps or goal.",
                budget,
            );
        }
        return Ok(ActionIntent::CancelPlan);
    }
    for step in steps {
        if let Some(choice) = step
            .get("actionId")
            .and_then(SqlCell::as_str)
            .and_then(|id| input.actions.get(id))
        {
            if !choice.expected_work.current(core.state, actor) {
                return result(
                    false,
                    "stale-plan",
                    "The work affected by this choice changed.",
                    budget,
                );
            }
        }
    }
    let mode = mode(data)?;
    if steps
        .first()
        .and_then(|s| s.get("actionId"))
        .and_then(SqlCell::as_str)
        .and_then(|id| input.actions.get(id))
        .is_some_and(|c| c.transition != transition(mode))
    {
        return result(
            false,
            "work-transition",
            "The plan must preserve the selected first action’s handling of current work.",
            budget,
        );
    }
    let id = format!("{response_id}:{}", op.local_id);
    let mut commands = Vec::with_capacity(steps.len());
    for (index, step) in steps.iter().enumerate() {
        let Some(raw) = step
            .get("actionId")
            .and_then(SqlCell::as_str)
            .and_then(|id| input.actions.get(id))
            .and_then(|c| c.invocation.as_ref())
        else {
            return result(
                false,
                "unsupported-action",
                "Produced-item plan steps are not available in this native execution scope.",
                budget,
            );
        };
        match supported(raw, actor, &format!("{id}:{index}"), budget)? {
            Ok(command) => commands.push(command),
            Err(result) => return Ok(result),
        }
    }
    plan(
        core,
        actor,
        &id,
        commands,
        mode,
        goal,
        data.get("expectedRevision").and_then(SqlCell::as_u64),
    )
}
