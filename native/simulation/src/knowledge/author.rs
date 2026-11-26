//! Creator proposals are real edits. Neither text nor a request to remember
//! something grants the character observation, recognition or event evidence.
use super::{edit::result, *};
use crate::{
    encoding::{json_record, json_record_len},
    experience::{acquire_memory, prepare_memory_admission},
    runtime::PersonAuthorChange,
    text::JsText,
};

pub(super) fn apply(
    core: &mut CoreMutation<'_>,
    actor: &str,
    change: &PersonAuthorChange,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    match change {
        PersonAuthorChange::Inventory(edit) => match core.edit_creator_stock(actor, edit)? {
            Ok(()) => result(true, "inventory-saved", "Carried quantity updated.", budget),
            Err(message) => result(false, "inventory-unavailable", message, budget),
        },
        PersonAuthorChange::Traits { ids, .. } => {
            let state = &core.state;
            let Some(catalogue) =
                crate::worlds::base_traits::catalogue(&state.installed.content.profile)
            else {
                return Err(ExecutionError::UnsupportedFamily);
            };
            let Some(body) = state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.actor.as_ref())
            else {
                return Err(ExecutionError::MissingActor);
            };
            let previous = body.traits.as_deref().unwrap_or_default();
            if ids.len() > catalogue.max_selected {
                return result(
                    false,
                    "traits-unavailable",
                    "Too many character traits were selected.",
                    budget,
                );
            }
            let mut references = Vec::with_capacity(ids.len());
            for id in ids {
                let Some(row) = catalogue
                    .choices
                    .iter()
                    .chain(previous)
                    .find(|row| row.id == *id)
                else {
                    return result(
                        false,
                        "trait-unavailable",
                        "A selected trait is unavailable.",
                        budget,
                    );
                };
                if references.contains(&row) {
                    return result(
                        false,
                        "duplicate-trait",
                        "Select each character trait once.",
                        budget,
                    );
                }
                references.push(row);
            }
            if !previous.iter().eq(references.iter().copied()) {
                let _draft = budget.reserve(
                    references
                        .iter()
                        .map(|t| {
                            t.id.capacity()
                                + t.name.storage_bytes()
                                + t.description.storage_bytes()
                                + size_of::<crate::state::CharacterTrait>()
                        })
                        .sum(),
                )?;
                let selected = references.into_iter().cloned().collect();
                core.physical().replace_person_traits(actor, selected)?;
            }
            result(true, "traits-saved", "Character traits updated.", budget)
        }
        PersonAuthorChange::Event(event) => super::authored_history::apply(core, event, budget),
        PersonAuthorChange::Identity { profile, .. } => {
            let Some(person) = core.state.physical.entities.get(actor) else {
                return Err(ExecutionError::MissingActor);
            };
            let body = person.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
            let goal_bytes = body
                .initial_goals
                .as_ref()
                .map_or(0, |goals| goals.iter().map(|goal| goal.len() + 2).sum());
            let _draft = budget.reserve(
                (change.input_bytes() + goal_bytes + 128)
                    .checked_mul(8)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let profile =
                crate::execution::person_profile::AuthoredProfile::from_draft(profile, person);
            if profile.matches(person) {
                return result(true, "person-saved", "Character saved.", budget);
            }
            let text = profile.identity_text(body.initial_goals.as_deref());
            if !core.journal.cognition.replace_authored_identity(
                &mut core.state.minds,
                actor,
                text,
                budget,
            )? {
                return result(
                    false,
                    "identity-unavailable",
                    "This character has no editable identity document.",
                    budget,
                );
            }
            core.physical().replace_person_profile(actor, profile)?;
            result(true, "person-saved", "Character saved.", budget)
        }
        PersonAuthorChange::Attribute(edit) => {
            let installed = core.state.installed.clone();
            let entity = core
                .state
                .physical
                .entities
                .get(actor)
                .ok_or(ExecutionError::MissingActor)?;
            let definition = installed
                .attributes
                .get(&edit.id)
                .ok_or(ExecutionError::Invariant)?
                .value();
            let refresh_sight = installed
                .account_law()
                .affects_observation(entity, &edit.id);
            core.physical()
                .apply_ordinary_rate(actor, definition, edit.value, refresh_sight)?;
            result(true, "attribute-saved", "Character value updated.", budget)
        }
        PersonAuthorChange::Goal {
            expected_agency_revision,
            change,
        } => {
            // Goal history is actor-scoped. Stable mutation identity also makes
            // an indeterminate acknowledgement safe to reopen by revision.
            let id = crate::encoding::json_record_digest(&(actor, expected_agency_revision))
                .map_err(|_| ExecutionError::Invariant)?;
            let (outcome, storage) = crate::plans::change_goal(
                core,
                actor,
                change,
                &format!("creator-goal:{id}"),
                "god",
                budget,
            )?
            .into_parts();
            Ok(CompletedKnowledgeEdit::from_parts(outcome, storage))
        }
        PersonAuthorChange::Memory {
            summary,
            source,
            importance,
            ..
        } => {
            #[derive(Serialize)]
            #[serde(rename_all = "camelCase")]
            struct AuthoredMemory<'a> {
                kind: &'static str,
                source: crate::runtime::AuthoredMemorySource,
                creator_authored: bool,
                summary: &'a JsText,
                importance: f64,
                entity_ids: [&'a str; 1],
            }
            let draft = AuthoredMemory {
                kind: "episode",
                source: *source,
                creator_authored: true,
                summary,
                importance: *importance,
                entity_ids: [actor],
            };
            let bytes = json_record_len(&draft).map_err(|_| ExecutionError::Invariant)?;
            let _draft = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
            let body = json_record(&draft).map_err(|_| ExecutionError::Invariant)?;
            let pending = prepare_memory_admission(core, actor, body, None, budget)?;
            let schema = core.state.installed.schema.clone();
            if acquire_memory(core, pending, &schema)?.is_some() {
                result(true, "memory-created", "Memory added.", budget)
            } else {
                result(
                    false,
                    "memory-declined",
                    "This character could not retain the memory.",
                    budget,
                )
            }
        }
    }
}
