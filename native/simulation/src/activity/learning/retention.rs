//! Method + private acquisition publication stays in the existing sparse
//! activity journal. A declined idea creates no orphan shared definition.
use super::candidate::{LearningCandidate, same_ids};
use super::history::LearningHistory;
use super::normalize::{object, string, strings};
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::records::SqlCell;
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

pub(super) fn retain(
    core: &mut CoreMutation<'_>,
    history: &LearningHistory,
    candidate: &LearningCandidate,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let actor = history.actor.as_str();
    let known = core
        .state
        .activity
        .library
        .methods
        .values()
        .find(|m| m.signature() == candidate.signature());
    let _id = budget.reserve(
        candidate
            .method
            .get("id")
            .and_then(SqlCell::as_str)
            .ok_or(ExecutionError::Invariant)?
            .len()
            .checked_mul(2)
            .and_then(|n| n.checked_add(256))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let method = if let Some(method) = known {
        Arc::clone(method)
    } else {
        if core.state.activity.library.methods.len() as u64
            >= core.state.activity.limits.definitions
        {
            return Ok(false);
        }
        let base = candidate
            .method
            .get("id")
            .and_then(SqlCell::as_str)
            .ok_or(ExecutionError::Invariant)?;
        let mut id = base.to_owned();
        let mut suffix = 0usize;
        while core.state.activity.library.methods.contains_key(&id) {
            suffix = suffix.checked_add(1).ok_or(ExecutionError::Capacity)?;
            id = format!("{base}-{suffix}");
        }
        let funding = budget.reserve(
            candidate
                .method
                .heap_bytes()
                .and_then(|n| n.checked_add(id.len()))
                .and_then(|n| n.checked_add(size_of::<LearningMethod>() + 2 * size_of::<usize>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut body = candidate.method.clone();
        let SqlCell::Object(fields) = &mut body else {
            return Err(ExecutionError::Invariant);
        };
        fields.insert("id".to_owned(), string(id));
        LearningMethod::new(
            body,
            &core.state.activity.language,
            &core.state.activity.limits,
            funding,
            budget,
        )
        .map_err(ExecutionError::Activity)?
    };
    let acquired = core
        .state
        .activity
        .library
        .acquisitions
        .get(actor)
        .and_then(|a| a.get(method.id()));
    if acquired.is_none()
        && core
            .state
            .activity
            .library
            .acquisitions
            .get(actor)
            .map_or(0, IndexMap::len) as u64
            >= core.state.activity.limits.acquisitions
    {
        return Ok(false);
    }
    let _selected = budget.reserve(
        candidate
            .occurrence_ids
            .len()
            .checked_mul(size_of::<&super::history::LearningRow>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let entries = candidate
        .occurrence_ids
        .iter()
        .map(|id| history.entry(id).ok_or(ExecutionError::InvalidCheckpoint))
        .collect::<Result<Vec<_>, _>>()?;
    if entries.iter().any(|row| {
        row.entry.revoked == Some(true)
            || row.denied
            || (row.entry.status != ActivityStatus::Completed && row.entry.outputs.is_empty())
    }) {
        return Ok(false);
    }
    let evidence_count = entries
        .iter()
        .map(|r| r.entry.evidence_ids.len() + usize::from(r.entry.result_evidence.is_some()))
        .sum::<usize>()
        .checked_add(candidate.other_evidence.len())
        .and_then(|n| {
            n.checked_add(
                candidate
                    .other_evidence
                    .iter()
                    .filter_map(|id| history.entry(id))
                    .map(|r| r.entry.evidence_ids.len())
                    .sum::<usize>(),
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let evidence_text = entries
        .iter()
        .try_fold(0usize, |n, row| {
            n.checked_add(
                row.entry
                    .evidence_ids
                    .iter()
                    .map(String::len)
                    .sum::<usize>(),
            )?
            .checked_add(
                row.entry
                    .result_evidence
                    .as_ref()
                    .map_or(Some(0), ResultEvidence::id_len)?,
            )
        })
        .ok_or(ExecutionError::Capacity)?
        .checked_add(
            candidate
                .other_evidence
                .iter()
                .map(String::len)
                .sum::<usize>(),
        )
        .and_then(|n| {
            n.checked_add(
                candidate
                    .other_evidence
                    .iter()
                    .filter_map(|id| history.entry(id))
                    .flat_map(|r| &r.entry.evidence_ids)
                    .map(String::len)
                    .sum::<usize>(),
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let before = acquired
        .map_or(Some(0), |a| a.body().heap_bytes())
        .ok_or(ExecutionError::Capacity)?;
    let funding = budget.reserve(
        before
            .checked_add(
                candidate
                    .bindings
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_add(candidate.occurrence_ids.heap_bytes()?))
            .and_then(|n| n.checked_add(evidence_text.checked_mul(3)?))
            .and_then(|n| n.checked_add(map_storage::<String, ()>(evidence_count)?))
            .and_then(|n| {
                n.checked_add(
                    evidence_count.checked_mul(size_of::<SqlCell>() + size_of::<String>())?,
                )
            })
            .and_then(|n| {
                n.checked_add(
                    size_of::<LearningAcquisition>()
                        + 2 * size_of::<usize>()
                        + actor.len()
                        + method.id().len() * 2
                        + 2048,
                )
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut body = if let Some(acquired) = acquired {
        acquired.body().clone()
    } else {
        object([
            ("id", string(method.id())),
            ("methodId", string(method.id())),
            ("actorId", string(actor)),
            (
                "at",
                SqlCell::Number(
                    serde_json::Number::from_f64(core.state.physical.header.sim_time)
                        .ok_or(ExecutionError::Invariant)?,
                ),
            ),
            ("supports", SqlCell::Array(Vec::new())),
            ("status", string("tentative")),
            ("bindings", candidate.bindings.clone()),
        ])
    };
    let SqlCell::Object(fields) = &mut body else {
        return Err(ExecutionError::Invariant);
    };
    let Some(SqlCell::Array(supports)) = fields.get_mut("supports") else {
        return Err(ExecutionError::Invariant);
    };
    if (supports.len() as u64) < core.state.activity.limits.links
        && !supports
            .iter()
            .any(|s| same_ids(s.get("occurrenceIds"), &candidate.occurrence_ids))
    {
        let mut evidence = IndexSet::with_capacity(evidence_count);
        for row in &entries {
            for id in &row.entry.evidence_ids {
                evidence.insert(id.clone());
            }
            if let Some(result) = &row.entry.result_evidence {
                evidence.insert(result.id());
            }
        }
        for id in &candidate.other_evidence {
            evidence.insert(id.clone());
        }
        for row in history
            .rows
            .iter()
            .filter(|r| candidate.other_evidence.contains(&r.entry.id))
        {
            for id in &row.entry.evidence_ids {
                evidence.insert(id.clone());
            }
        }
        supports.push(object([
            (
                "occurrenceIds",
                strings(candidate.occurrence_ids.iter().map(String::as_str)),
            ),
            ("evidenceIds", strings(evidence.iter().map(String::as_str))),
            ("revoked", SqlCell::Bool(false)),
        ]));
    }
    if crate::encoding::json_record_len(&body).map_err(|_| ExecutionError::Invariant)? as u64
        > core.state.activity.limits.acquisition_bytes
    {
        return Ok(false);
    }
    let acquired = LearningAcquisition::new(
        body,
        actor,
        &method,
        &core.state.activity.language,
        &core.state.activity.limits,
        funding,
        budget,
    )
    .map_err(ExecutionError::Activity)?;
    if !core
        .state
        .activity
        .library
        .methods
        .contains_key(method.id())
    {
        core.journal
            .activity
            .insert_learning_method(&mut core.state.activity, Arc::clone(&method))
            .map_err(ExecutionError::Activity)?;
    }
    core.journal
        .activity
        .replace_learning_acquisition(&mut core.state.activity, actor, method.id(), acquired)
        .map_err(ExecutionError::Activity)?;
    Ok(true)
}
