//! Prepare a few installed evasive examples only for a personally relevant
//! combat opportunity. The ordinary command owns physical path and recovery.

use super::*;
use crate::movement::evasion::{destination, profile};
use crate::state::Entity;
use crate::text::{JsText, substitute_fields, substituted_fields_bound};
use std::sync::Arc;

#[derive(Serialize)]
pub struct NpcEvasionChoice {
    pub label: JsText,
    pub description: JsText,
    #[serde(skip)]
    _storage: ByteReservation,
}

impl NpcCandidateCursor {
    pub(super) fn offer_evasion(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        preparation_id: &str,
    ) -> Result<bool, ExecutionError> {
        let installed = &core.state.installed;
        let Some(copy) = installed.occurrence_rules.value().evasion.as_ref() else {
            return Ok(false);
        };
        let Some(direction) = copy.directions.get(index) else {
            return Ok(false);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let Some((profile, _)) = profile(installed, actor) else {
            return Ok(false);
        };
        if index == 0 && !self.evasion_relevant(core, actor) {
            return Ok(false);
        }

        self.stage = Enumerate::Evade(index + 1);
        let Some((surface,point,distance)) = destination(installed,actor,direction,profile.maximum_distance) else {
            return Ok(true);
        };
        let _point = self.budget.reserve(surface.len())?;
        let destination = SurfacePoint {
            x: point.x,
            y: point.y,
            z: point.z,
            surface_id: surface.to_owned(),
        };

        let _numbers = self.budget.reserve(512)?;
        let distance = format!("{distance:.2}");
        let seconds = crate::encoding::json_record(&profile.seconds)
            .map_err(|_| ExecutionError::Invariant)?;
        let repeat = crate::encoding::json_record(&profile.repeat_seconds)
            .map_err(|_| ExecutionError::Invariant)?;
        let names = [
            ("label", profile.label.as_str().into()),
            ("direction", direction.label.as_str().into()),
        ];
        let motion = [
            ("distance", distance.as_str().into()),
            ("seconds", seconds.as_str().into()),
            ("repeatSeconds", repeat.as_str().into()),
            ("description", profile.description.as_str().into()),
        ];
        let label_bound =
            substituted_fields_bound(&copy.choice_label, &names).ok_or(ExecutionError::Capacity)?;
        let details_bound = substituted_fields_bound(&copy.choice_details, &motion)
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = self.budget.reserve(
            heap_sum([
                size_of::<NpcEvasionChoice>() + 2 * size_of::<usize>(),
                label_bound,
                details_bound,
                copy.destination_scope.len(),
            ])
            .and_then(|bytes| bytes.checked_mul(2))
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let label = substitute_fields(&copy.choice_label, &names);
        let mut description = label.clone();
        description.push_str(". ");
        description.push_text(&substitute_fields(&copy.choice_details, &motion));
        description.push_str(" ");
        description.push_str(&copy.destination_scope);
        storage.resize(
            heap_sum([
                size_of::<NpcEvasionChoice>() + 2 * size_of::<usize>(),
                label.storage_bytes(),
                description.storage_bytes(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let id = self.id(&[
            "evade:",
            label.as_unicode().ok_or(ExecutionError::Invariant)?,
        ])?;
        let choice = Arc::new(NpcEvasionChoice {
            label,
            description,
            _storage: storage,
        });
        let mut input = CommandInput::new(&self.actor, preparation_id, "evade");
        input.destination = Some(&destination);
        let (command, guard) = self.command(&input)?;
        self.start(
            core,
            id,
            NpcOfferMeaning::Evade { choice },
            command,
            guard,
            WorkTransitionMode::Replace,
        )?;
        Ok(true)
    }

    fn evasion_relevant(&self, core: &CoreMutation<'_>, actor: &Entity) -> bool {
        let Some(body) = actor.actor.as_ref() else {
            return false;
        };
        let physical = &core.state.physical;
        let now = physical.header.sim_time;
        body.combat_ready_at.is_some_and(|at| at > now)
            || body.encounters.as_ref().is_some_and(|encounters| {
                Some(encounters.life) == actor.physical_life()
                    && (encounters.unknown.values().any(|cue| cue.until > now)
                        || encounters.pairs.values().any(|pair| {
                            !pair.active.is_empty()
                                || pair.incoming_until.is_some_and(|until| until > now)
                        }))
            })
            || self.targets.iter().any(|target| {
                target.visible
                    && physical.entities.get(&target.id).is_some_and(|entity| {
                        entity.actor.as_ref().is_some_and(|body| {
                            body.alive
                                && (crate::combat_encounters::observed_preparation(entity)
                                    .is_some()
                                    || body.combat_ready_at.is_some_and(|at| at > now)
                                    || body
                                        .action
                                        .as_ref()
                                        .is_some_and(|action| action.evasion.is_some()))
                        })
                    })
            })
    }
}
