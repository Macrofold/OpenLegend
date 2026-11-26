//! Revalidate the displayed ordinary choice within the command's authority turn.
use super::*;
use crate::player_http::actions::ContactCommand;
use crate::player_references::ResolvedContact;
use openlegend_simulation::capture::EncounterPreference;

pub(super) struct AcceptedContactChoice {
    pub(super) contact: ResolvedContact,
    pub(super) control: Option<(EncounterPreference, ByteReservation)>,
}

impl CommandInput {
    pub(super) fn fresh_contact_choice(
        &self,
        world: &NativeWorldSession,
        scope: &RequestScope,
        refs: &ReferenceIssuer,
        selected: &str,
        game: &CurrentServer,
    ) -> Result<Option<AcceptedContactChoice>, RuntimeError> {
        let budget = game.host.budget();
        crate::npc::with_contact_choices(
            world,
            scope,
            refs,
            selected,
            game,
            true,
            false,
            |menu, references| {
                let Some(binding) = menu.binding() else {
                    return Ok(None);
                };
                if let Some(selection) = &self.primary_action {
                    let choice = menu.primary_command(selection, references)?;
                    if !choice.is_some_and(|shown| self.same_context_command(shown)) {
                        return Ok(None);
                    }
                }
                let control = if let Some(request) = &self.encounter_preference {
                    if !menu.control_allowed(request.operation)
                        || references
                            .encounter_control(request.operation, binding)
                            .map_err(RuntimeError::application_refused)?
                            != request.reference
                    {
                        return Ok(None);
                    }
                    let bytes = binding.target_id.len() + binding.episode.map_or(0, str::len);
                    let storage = budget.reserve(bytes)?;
                    Some((
                        EncounterPreference {
                            actor_life: binding.actor_life,
                            target_id: binding.target_id.to_owned(),
                            target_life: binding.target_life,
                            episode: binding.episode.map(str::to_owned),
                            revision: binding.revision,
                            hostile_revision: binding.hostile_revision,
                        },
                        storage,
                    ))
                } else {
                    None
                };
                Ok(Some(AcceptedContactChoice {
                    contact: ResolvedContact::new(
                        binding.target_id,
                        Some(binding.target_life),
                        budget,
                    )?,
                    control,
                }))
            },
        )
        .map(Option::flatten)
    }

    fn same_context_command(&self, shown: &ContactCommand<'_>) -> bool {
        match shown {
            ContactCommand::Strike {
                target_id,
                definition_id,
                item_id,
                auto_equip,
                expected_revision,
                ..
            } => {
                self.kind == CommandKind::Strike
                    && self.target_id.as_deref() == Some(target_id)
                    && self.definition_id.as_deref() == Some(definition_id)
                    && self.item_id.as_deref() == *item_id
                    && self.auto_equip == auto_equip.then_some(true)
                    && self.expected_revision == *expected_revision
            }
            ContactCommand::Ranged {
                mode,
                target_id,
                item_id,
                ammunition_id,
                auto_equip,
            } => {
                self.kind.ranged_start() == Some(*mode)
                    && self.target_id.as_deref() == Some(target_id)
                    && self.item_id.as_deref() == Some(item_id)
                    && self.ammunition_id.as_deref() == Some(ammunition_id)
                    && self.auto_equip == auto_equip.then_some(true)
            }
            ContactCommand::Release { aim_id, .. } => {
                self.kind == CommandKind::ReleaseShot && self.aim_id.as_deref() == Some(aim_id)
            }
            ContactCommand::Preference {
                target_id,
                encounter_preference,
                ..
            } => {
                self.kind == CommandKind::EncounterPreference
                    && self.target_id.as_deref() == Some(target_id)
                    && self.encounter_preference.as_ref().is_some_and(|request| {
                        request.operation == encounter_preference.operation
                            && request.reference == encounter_preference.reference
                    })
            }
            ContactCommand::Guard { .. } | ContactCommand::Teach { .. } => false,
        }
    }
}
