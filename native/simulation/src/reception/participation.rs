//! Physical absence ends only current access. The actual acquired originals,
//! old accounts and temporal history remain with their existing owners.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, map_storage};
use indexmap::IndexSet;
use std::mem::size_of;

pub(crate) fn depart_receiving(
    core: &mut CoreMutation<'_>,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let reception = &core.state.reception;
    let count = 1usize
        .checked_add(
            reception
                .perception_evidence
                .as_ref()
                .map_or(0, |rows| rows.len()),
        )
        .and_then(|n| {
            n.checked_add(
                reception
                    .perception_episodes
                    .as_ref()
                    .map_or(0, |rows| rows.len()),
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let names = reception
        .perception_evidence
        .as_ref()
        .into_iter()
        .flat_map(|rows| rows.keys())
        .chain(
            reception
                .perception_episodes
                .as_ref()
                .into_iter()
                .flat_map(|rows| rows.keys()),
        )
        .try_fold(actor.len(), |n, id| n.checked_add(id.len()))
        .ok_or(ExecutionError::Capacity)?;
    let _observers = budget.reserve(
        map_storage::<String, ()>(count)
            .and_then(|n| n.checked_add(names))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut observers = IndexSet::with_capacity(count);
    observers.insert(actor.to_owned());
    observers.extend(
        reception
            .perception_evidence
            .as_ref()
            .into_iter()
            .flat_map(|rows| rows.keys())
            .cloned(),
    );
    observers.extend(
        reception
            .perception_episodes
            .as_ref()
            .into_iter()
            .flat_map(|rows| rows.keys())
            .cloned(),
    );
    for observer in &observers {
        if observer == actor {
            end_current_evidence(core, observer, budget)?;
            core.journal
                .episodes
                .clear_observer(&mut core.state.reception, observer)?;
            core.physical().clear_contacts(observer)?;
        } else {
            end_current_subject(core, observer, actor, budget)?;
            core.journal
                .episodes
                .remove_subject(&mut core.state.reception, observer, actor)?;
            core.physical()
                .remove_participation_contact(observer, actor)?;
        }
    }
    for people in [true, false] {
        let root = if people {
            &core.state.reception.visible_people
        } else {
            &core.state.reception.visible_objects
        };
        let count = root.as_ref().map_or(0, |root| root.len());
        let names = root
            .as_ref()
            .into_iter()
            .flat_map(|root| root.keys())
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let _ids = budget.reserve(
            count
                .checked_mul(size_of::<String>())
                .and_then(|n| n.checked_add(names))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let ids = root
            .as_ref()
            .into_iter()
            .flat_map(|root| root.iter())
            .filter(|(observer, ids)| {
                if observer.as_str() == actor {
                    !ids.is_empty()
                } else {
                    ids.iter().any(|id| id == actor)
                }
            })
            .map(|(observer, _)| observer.clone())
            .collect::<Vec<_>>();
        for observer in ids {
            let root = if people {
                &core.state.reception.visible_people
            } else {
                &core.state.reception.visible_objects
            };
            let before = root
                .as_ref()
                .and_then(|root| root.get(&observer))
                .ok_or(ExecutionError::Invariant)?;
            let _after = budget.reserve(before.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let after = if observer == actor {
                Vec::new()
            } else {
                before
                    .iter()
                    .filter(|id| id.as_str() != actor)
                    .cloned()
                    .collect()
            };
            core.journal.current.set_visibility(
                &mut core.state.reception,
                &observer,
                people,
                after,
            )?;
        }
    }
    core.journal
        .current
        .clear_visible_places(&mut core.state.reception, actor)?;
    Ok(())
}
