//! An admitted physical lesson retains the exact method-bearing source and
//! grants one private capability in the same candidate. Correction uses the
//! same privacy transaction and required account that own the retained proof.
use crate::encoding::{json_record, json_record_len};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::install::{Grant, GrantSource, MethodProof, RecipeAuthority, grant_bound};
use crate::received::{
    KnowledgeAccountChange, ReceivedFieldClock, ReceivedRole, ReceivedValueFragment,
    SupportRetentionContext, TemporalCaptureFacet, TemporalCaptureInput, TemporalChange,
    values::{
        PersonalAccountData, PersonalAccountFragment, PersonalAccountKind, PersonalAccountSource,
    },
};
use indexmap::IndexSet;
use std::{borrow::Cow, sync::Arc};

pub const RECORD_LEARNING_COPY: &str =
    include_str!("../../../../packages/domain/src/recipe-record-copy.json");
pub(crate) const LEARNED_EVENT: &str = "method-learned";

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum Learning {
    Acquired,
    Known,
    Capacity,
}

/// The selected record and method were checked by the command owner. Follow
/// Source's required account and sparse original retention, including a
/// checkpoint before any sequence, source or grant could become observable.
pub(crate) fn learn_record(
    core: &mut CoreMutation<'_>,
    actor: &str,
    evidence_id: &str,
    recipe_id: &str,
    budget: &ByteBudget,
) -> Result<Learning, ExecutionError> {
    if core
        .state
        .learned_capabilities
        .known_recipes(actor)
        .iter()
        .any(|id| id == recipe_id)
    {
        return Ok(Learning::Known);
    }
    let token = core.journal.checkpoint(core.state)?;
    let result = prepare_and_learn(core, actor, evidence_id, recipe_id, budget);
    match result {
        Ok(Learning::Acquired) => core.journal.keep(core.state, token)?,
        _ => core.journal.rollback_to(core.state, token)?,
    }
    result
}

fn prepare_and_learn(
    core: &mut CoreMutation<'_>,
    actor: &str,
    evidence_id: &str,
    recipe_id: &str,
    budget: &ByteBudget,
) -> Result<Learning, ExecutionError> {
    let installed = Arc::clone(&core.state.installed);
    let body = installed
        .retained
        .recipes
        .get(recipe_id)
        .ok_or(ExecutionError::Invariant)?;
    let _workspace = budget.reserve(6 * body.len() + 2_048 + evidence_id.len() * 4)?;
    let recipe: RecipeAuthority<'_> =
        serde_json::from_str(body).map_err(|_| ExecutionError::Invariant)?;
    let life = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| {
            entity
                .has_memory()
                .then(|| entity.physical_life())
                .flatten()
        })
        .ok_or(ExecutionError::MissingActor)?;
    let at = core.state.physical.header.sim_time;
    let policy = &installed.attention.value().retention;
    crate::received::ensure_experience_accounting(core, actor, budget)?;
    let data = PersonalAccountData::from_encoded(
        json_record(&MethodProof {
            recipe_id,
            method_version: recipe.version,
            method_digest: Cow::Borrowed(&recipe.digest),
            provenance: GrantSource::Record,
        })
        .map_err(|_| ExecutionError::Invariant)?,
    )?;
    let locator = crate::experience::append_personal_receipt(
        core,
        actor,
        life,
        TemporalCaptureInput {
            spatial_context: false,
            availability_at: None,
            coverage_gap: None,
            ended_fields: None,
            terminal_reservation_bytes: None,
            terminal_reservation_delta: None,
            received_at: None,
            received_order: None,
            availability: None,
            receiver_frame: None,
            subject: format!("method:{recipe_id}"),
            context_subjects: None,
            subject_identity: None,
            change: TemporalChange::Occurrence,
            required: true,
            source_ids: vec![evidence_id.into()],
            origin: None,
            facets: vec![TemporalCaptureFacet {
                value: ReceivedValueFragment::PersonalAccount(PersonalAccountFragment {
                    kind: PersonalAccountKind::PersonalAccount,
                    source: PersonalAccountSource::Memory,
                    id: evidence_id.into(),
                    text: learning_copy().proof.into(),
                    event_type: Some(LEARNED_EVENT.into()),
                    content: None,
                    data: Some(data),
                }),
                preferred: None,
                reception: None,
                clock: ReceivedFieldClock {
                    role: ReceivedRole::Direct,
                    as_of: at,
                    measured_from: at,
                    measured_through: at,
                    acquired_at: at,
                    confirmed_through: None,
                },
                member_index: None,
                track: None,
                support: None,
                detail_support: None,
                pose_frame: None,
                original: None,
                received_from: None,
            }],
        },
    )?;
    let Some(locator) = locator else {
        return Ok(Learning::Capacity);
    };
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or(ExecutionError::Invariant)?;
    let retained = core
        .state
        .temporal
        .retain_receipt_support(
            &locator,
            None,
            true,
            &policy.required,
            SupportRetentionContext {
                values,
                meaning: &installed.account_law(),
                now: at,
                policy,
                meters: &mut core.journal.meters,
                budget,
                places: None,
            },
        )
        .map_err(|error| match error {
            crate::received::TemporalAppendError::Received(error) => {
                ExecutionError::Received(error)
            }
            crate::received::TemporalAppendError::Work(error) => ExecutionError::Work(error),
        })?;
    if retained.is_none() {
        return Ok(Learning::Capacity);
    }
    let grant = Grant {
        recipe_id: recipe_id.into(),
        learned_at: at,
        source: GrantSource::Record,
        evidence_id: evidence_id.into(),
        source_receipt: Some(locator),
    };
    if !core.state.temporal.adjust_retained_knowledge(
        actor,
        KnowledgeAccountChange {
            before_bytes: None,
            after_bytes: Some(
                json_record_len(&grant).map_err(|_| ExecutionError::Invariant)? as u64,
            ),
            required: true,
            revocation: false,
        },
        at,
        policy,
    )? {
        return Ok(Learning::Capacity);
    }
    let custody = budget.reserve(grant_bound(&grant).ok_or(ExecutionError::Capacity)?)?;
    core.journal.learned.insert(
        &mut core.state.learned_capabilities,
        actor,
        grant,
        custody,
        budget,
    )?;
    core.journal.recognition.advance_revision(
        &mut core.state.reception,
        actor,
        &mut core.journal.cognition,
    )?;
    Ok(Learning::Acquired)
}

pub(crate) fn withdraw_record_grants(
    core: &mut CoreMutation<'_>,
    actor: &str,
    affected: &IndexSet<String>,
    released: &[String],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if core
        .state
        .learned_capabilities
        .acquired_grants(actor)
        .next()
        .is_none()
    {
        return Ok(());
    }
    let removed = |grant: &Grant| {
        grant.source == GrantSource::Record
            && (affected.contains(&grant.evidence_id)
                || grant.source_receipt.as_ref().is_some_and(|locator| {
                    let id = locator.id();
                    affected.contains(&id) || released.contains(&id)
                }))
    };
    let count = core
        .state
        .learned_capabilities
        .acquired_grants(actor)
        .filter(|grant| removed(grant))
        .count();
    if count == 0 {
        return Ok(());
    }
    let _workspace = budget.reserve(
        count
            .checked_mul(std::mem::size_of::<u64>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let charges = core
        .state
        .learned_capabilities
        .acquired_grants(actor)
        .filter(|grant| removed(grant))
        .map(|grant| json_record_len(grant).map(|n| n as u64))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| ExecutionError::Invariant)?;
    let policy = &core.state.installed.attention.value().retention;
    let at = core.state.physical.header.sim_time;
    for bytes in charges {
        if !core.state.temporal.adjust_retained_knowledge(
            actor,
            KnowledgeAccountChange {
                before_bytes: Some(bytes),
                after_bytes: None,
                required: true,
                revocation: true,
            },
            at,
            policy,
        )? {
            return Err(ExecutionError::Invariant);
        }
    }
    core.journal.learned.remove(
        &mut core.state.learned_capabilities,
        actor,
        |grant| !removed(grant),
        budget,
    )?;
    // Privacy already updates the owner's shared knowledge/source revision.
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LearningCopy {
    pub unavailable: &'static str,
    pub stale: &'static str,
    pub uninspected: &'static str,
    pub definition_unavailable: &'static str,
    pub capacity: &'static str,
    proof: &'static str,
}
pub(crate) fn learning_copy() -> &'static LearningCopy {
    static COPY: std::sync::LazyLock<LearningCopy> = std::sync::LazyLock::new(|| {
        serde_json::from_str(RECORD_LEARNING_COPY).expect("recipe record wording")
    });
    &COPY
}
