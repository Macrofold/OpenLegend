//! Deferring a private request creates no action, event or interpreter dispatch.
//! Its bounded vector and agency revision use the same physical checkpoint.
use super::*;
use crate::execution::{CoreMutation, ExecutionError, PhysicalMutation};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use crate::language::NormalizedAttempt;
use crate::state::FundedIntents;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use std::mem::size_of;

pub(crate) struct DeferredIntent<'a> {
    pub id: &'a str,
    pub language: NormalizedAttempt<'a>,
    pub target_entity_id: Option<&'a str>,
    pub mode: PlanMode,
    pub slots: Option<&'a IntentSlots>,
    pub resolution: Option<&'a ActionResolution>,
}
pub(crate) struct CompletedIntentEdit {
    outcome: Outcome,
    storage: ByteReservation,
}
impl CompletedIntentEdit {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.storage)
    }
}
fn result(
    ok: bool,
    code: &'static str,
    message: &'static str,
    budget: &ByteBudget,
) -> Result<CompletedIntentEdit, ExecutionError> {
    let mut storage = budget.reserve(
        code.len()
            .checked_add(message.len())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let outcome = Outcome {
        ok,
        code: code.into(),
        message: message.into(),
        spent: None,
        outputs: None,
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    };
    storage.resize(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(CompletedIntentEdit { outcome, storage })
}
fn exhausted(budget: &ByteBudget) -> Result<CompletedIntentEdit, ExecutionError> {
    result(
        false,
        "invalid-attempt",
        "Existing intentions were kept; another change could not be recorded.",
        budget,
    )
}
fn same(
    intent: &PendingIntent,
    language: &NormalizedAttempt<'_>,
    target: Option<&str>,
    mode: PlanMode,
    slots: Option<&IntentSlots>,
) -> bool {
    intent.normalized == *language.normalized()
        && intent.target_entity_id.as_deref() == target
        && intent.mode == mode
        && intent.slots.as_ref() == slots.filter(|slots| slots.nonempty())
}
fn commit(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    value: Vec<PendingIntent>,
    storage: ByteReservation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let funded = FundedIntents::new(value, storage, budget)?;
    let mut physical = PhysicalMutation {
        state: &mut core.state.physical,
        journal: &mut core.journal.physical,
    };
    physical.replace_intents(actor_id, funded, budget)?;
    physical.advance_agency_revision(actor_id)
}
pub(crate) fn defer_attempt(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    request: DeferredIntent<'_>,
    budget: &ByteBudget,
) -> Result<CompletedIntentEdit, ExecutionError> {
    let description = request.language.description();
    let limits = &core.state.installed.agency_limits;
    if !is_safe_record_id(request.id)
        || description.trim_is_empty()
        || description.units_len() as u64 > limits.attempt_characters
        || request
            .target_entity_id
            .is_some_and(|id| !is_safe_record_id(id))
        || request
            .slots
            .is_some_and(|slots| !slots.named_times_valid(&core.state.installed))
    {
        return result(
            false,
            "invalid-attempt",
            "An attempt needs 1–500 characters.",
            budget,
        );
    }
    let agency = &core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?
        .agency;
    let prior = agency.attempts.iter().position(|intent| {
        same(
            intent,
            &request.language,
            request.target_entity_id,
            request.mode,
            request.slots,
        ) && intent.manifest_revision == core.state.installed.manifest.revision
    });
    if let Some(index) = prior {
        let old = &agency.attempts[index];
        let changed = request.resolution.is_some()
            && old.status == "needs-interpretation"
            && old.resolution.as_ref() != request.resolution;
        let outcome = result(
            true,
            "attempt-pending",
            "This intent already awaits interpretation; no action or paid work was repeated.",
            budget,
        )?;
        if changed {
            if agency.revision == MAX_SAFE_INTEGER {
                return exhausted(budget);
            }
            let bytes = agency
                .attempts
                .heap_bytes()
                .and_then(|n| n.checked_add(request.resolution?.heap_bytes()?));
            // Option presence was established above; keep the admitted result
            // separate from actual canonical list construction and its undo.
            let bytes = bytes.ok_or(ExecutionError::Capacity)?;
            let storage = budget.reserve(bytes)?;
            let mut after = agency.attempts.clone();
            after[index].resolution = request.resolution.cloned();
            commit(core, actor_id, after, storage, budget)?;
        }
        return Ok(outcome);
    }
    if agency.attempts.len() as u64 >= limits.attempts {
        return result(
            false,
            "attempt-limit",
            "Four unlisted intents already await interpretation.",
            budget,
        );
    }
    if agency.attempts.iter().any(|intent| intent.id == request.id) {
        return result(
            false,
            "attempt-conflict",
            "This attempt identity belongs to different intent.",
            budget,
        );
    }
    if agency.revision == MAX_SAFE_INTEGER {
        return exhausted(budget);
    }
    let extra = heap_sum([
        size_of::<PendingIntent>(),
        request.id.len(),
        description.storage_bytes(),
        request.language.normalized().storage_bytes(),
        request.target_entity_id.map_or(0, str::len),
        request
            .slots
            .map_or(Some(0), HeapBytes::heap_bytes)
            .ok_or(ExecutionError::Capacity)?,
        request
            .resolution
            .map_or(Some(0), HeapBytes::heap_bytes)
            .ok_or(ExecutionError::Capacity)?,
        "needs-interpretation".len(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let bytes = agency
        .attempts
        .heap_bytes()
        .and_then(|n| n.checked_add(extra))
        .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    let mut after = Vec::new();
    after
        .try_reserve_exact(agency.attempts.len() + 1)
        .map_err(|_| ExecutionError::Capacity)?;
    after.extend(agency.attempts.iter().cloned());
    after.push(PendingIntent {
        id: request.id.to_owned(),
        description: description.trimmed(),
        normalized: request.language.normalized().clone(),
        target_entity_id: request.target_entity_id.map(str::to_owned),
        slots: request.slots.filter(|slots| slots.nonempty()).cloned(),
        mode: request.mode,
        manifest_revision: core.state.installed.manifest.revision,
        status: "needs-interpretation".to_owned(),
        resolution: request.resolution.cloned(),
        alternative: None,
    });
    let outcome = result(
        true,
        "attempt-deferred",
        "Intent retained privately without an executable binding; no action was performed or invention admitted.",
        budget,
    )?;
    commit(core, actor_id, after, storage, budget)?;
    Ok(outcome)
}
pub(crate) fn withdraw_attempt(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<CompletedIntentEdit, ExecutionError> {
    let agency = &core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?
        .agency;
    let Some(index) = agency.attempts.iter().position(|intent| intent.id == id) else {
        return result(
            false,
            "attempt-unavailable",
            "That private intent is no longer pending.",
            budget,
        );
    };
    if agency.revision == MAX_SAFE_INTEGER {
        return exhausted(budget);
    }
    let storage = budget.reserve(
        agency
            .attempts
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut after = agency.attempts.clone();
    after.remove(index);
    let outcome = result(
        true,
        "attempt-withdrawn",
        "Private intent withdrawn; ongoing work is unchanged.",
        budget,
    )?;
    commit(core, actor_id, after, storage, budget)?;
    Ok(outcome)
}
pub(crate) fn resolve_attempt(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    language: NormalizedAttempt<'_>,
    target: Option<&str>,
    mode: PlanMode,
    slots: Option<&IntentSlots>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let agency = &core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?
        .agency;
    let count = agency
        .attempts
        .iter()
        .filter(|intent| same(intent, &language, target, mode, slots))
        .count();
    let keys_bytes = agency
        .attempts
        .iter()
        .filter(|intent| same(intent, &language, target, mode, slots))
        .try_fold(0_usize, |n, intent| n.checked_add(intent.id.len()))
        .ok_or(ExecutionError::Capacity)?;
    let _keys = budget.reserve(
        count
            .checked_mul(size_of::<String>())
            .and_then(|n| n.checked_add(keys_bytes))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let matching: Vec<_> = agency
        .attempts
        .iter()
        .filter(|intent| same(intent, &language, target, mode, slots))
        .map(|intent| intent.id.clone())
        .collect();
    for id in matching {
        withdraw_attempt(core, actor_id, &id, budget)?;
    }
    Ok(())
}
