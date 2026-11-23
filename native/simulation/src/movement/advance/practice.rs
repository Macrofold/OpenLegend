//! The practice release owns its final shot checks, one debit and one flight.
//! Contact has a separate clock boundary and an independent saved owner.
use super::*;
use crate::body::{ProjectileContact, ScarEffect, scar_factor};
use crate::host::retained_size::HeapBytes;
use crate::projectile::{ContactPolicy, ProjectileFlight, practice};
use crate::reception::EventScalar;
use indexmap::IndexMap;
use serde::Serialize;

pub(super) struct PendingPracticeRelease {
    aim: crate::projectile::AimedLife,
    definition: crate::values::DefinitionPin,
    tool: crate::values::DefinitionPin,
    ammunition: String,
    ammunition_definition: String,
    competence: u64,
    accuracy: f64,
    _storage: ByteReservation,
}

impl MoveAdvanceCursor {
    pub(super) fn complete_practice_release(
        &mut self,
        core: &mut CoreMutation<'_>,
        emitted: &crate::events::CompletedOccurrence,
    ) -> Result<Option<crate::execution::StagedOccurrence>, ExecutionError> {
        let Some(release) = self.practice_release.take() else {
            return Ok(None);
        };
        let action = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let definition = installed
            .attributes
            .get(&release.definition.id)
            .filter(|definition| definition.pin() == &release.definition)
            .ok_or(ExecutionError::Invariant)?
            .value();
        let improved = core.record_practice_release(
            &self.actor_id,
            action,
            emitted,
            crate::activity::PracticeReleaseFacts {
                aim: &release.aim,
                definition,
                tool: &release.tool,
                ammunition: &release.ammunition,
                ammunition_definition: &release.ammunition_definition,
                competence: release.competence,
                accuracy: release.accuracy,
            },
        )?;
        if !improved {
            return Ok(None);
        }
        let profile = definition
            .practice
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let _workspace = self
            .budget
            .reserve(1024 + 3 * self.actor_id.len() + 4 * profile.improved_text.len())?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "competence-improved".into(),
            text: EmissionText::Literal(profile.improved_text.as_str().into()),
            audience: AudienceSelection::Explicit(vec![self.actor_id.clone()]),
            source_id: Some(self.actor_id.clone()),
            target_id: None,
            data: Some(IndexMap::from([
                (
                    "attributeId".into(),
                    EventScalar::Text(definition.id.clone().into()),
                ),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
                ("value".into(), EventScalar::Number(1.0)),
            ])),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Some(event))
    }

    pub(super) fn check_practice(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
        let Some(target) = action
            .target_id
            .as_deref()
            .and_then(|id| core.state.physical.entities.get(id))
        else {
            self.fail(
                &core
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .not_applicable
                    .message,
            )?;
            return self.drive(core, None);
        };
        let Some(offer) = practice::practice_choice(
            core.state,
            actor,
            target,
            action.weapon_item_id.as_deref(),
            action.ammo_item_id.as_deref(),
            Some(action),
        )?
        else {
            self.fail(
                &core
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .not_applicable
                    .message,
            )?;
            return self.drive(core, None);
        };
        if let Some(reason) = offer.reason {
            self.fail(reason)?;
            return self.drive(core, None);
        }
        let ray = crate::projectile::firing_line(actor, target).ok_or(ExecutionError::Invariant)?;
        let range = offer
            .weapon
            .and_then(|(_, tool)| tool.ranged_weapon.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .range;
        if crate::spatial::distance(ray.from, ray.to) > range {
            self.fail(&offer.profile.presentation.lane_out_of_reach)?;
            return self.drive(core, None);
        }
        let custody = self
            .budget
            .reserve(size_of::<GeometryQueries>() + size_of_val(&ray))?;
        self.binding.serial = core.journal.next_provider_serial()?;
        let mut query = GeometryQueries::new(self.binding);
        query.sight.push(ray);
        self.queries = Some((query, custody));
        self.phase = Phase::PracticeLine;
        Ok(Progress::Geometry)
    }

    pub(super) fn finish_practice_line(
        &mut self,
        core: &mut CoreMutation<'_>,
        clear: bool,
    ) -> Result<Progress, ExecutionError> {
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
        let target = action
            .target_id
            .as_deref()
            .and_then(|id| core.state.physical.entities.get(id))
            .ok_or(ExecutionError::Invariant)?;
        let offer = practice::practice_choice(
            core.state,
            actor,
            target,
            action.weapon_item_id.as_deref(),
            action.ammo_item_id.as_deref(),
            Some(action),
        )?
        .filter(|offer| offer.reason.is_none())
        .ok_or(ExecutionError::Invariant)?;
        if !clear || practice::body_in_firing_line(core.state, actor, target, offer.profile)? {
            self.fail(if clear {
                &offer.profile.presentation.lane_unsafe
            } else {
                &offer.profile.presentation.lane_blocked
            })?;
            return self.drive(core, None);
        }
        if action.stage == "approaching" {
            self.start_target_work(core, action.replans)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let (tool, tool_type) = offer.weapon.ok_or(ExecutionError::Invariant)?;
        let (ammo, ammo_type) = offer.ammunition.ok_or(ExecutionError::Invariant)?;
        let weapon = tool_type
            .ranged_weapon
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let words = installed
            .occurrence_rules
            .value()
            .ranged
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let ammunition = ammo_type
            .ammunition
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let body_policy = installed.body_policy.as_ref();
        let ray = crate::projectile::firing_line(actor, target).ok_or(ExecutionError::Invariant)?;
        let outgoing = scar_factor(
            body_policy.map(crate::install::VerifiedDefinition::value),
            actor,
            ScarEffect::OutgoingInjury,
        );
        let at = core.state.physical.header.sim_time;
        let recovery = at + weapon.recovery_seconds;
        let text = &words.released;
        let _scratch = self.budget.reserve(
            4096 + 12
                * (action_id.len()
                    + self.actor_id.len()
                    + target.id.len()
                    + tool.id.len()
                    + ammo.id.len())
                + 4 * text.storage_bytes(),
        )?;
        let flight_storage = self.budget.reserve(
            4096 + 8
                * (action_id.len()
                    + self.actor_id.len()
                    + target.id.len()
                    + tool.id.len()
                    + ammo.id.len())
                + 8 * aim.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?;
        let target_id = target.id.clone();
        let ammo_id = ammo.id.to_owned();
        let hold = aim.reservation_id.clone();
        if !core.state.physical.holds.matches_item(
            &self.actor_id,
            action_id,
            &hold,
            &ammo_id,
            1,
            &aim.ammunition,
        ) {
            return Err(ExecutionError::Invariant);
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Attack<'a> {
            ammo_id: &'a str,
            ammunition: &'a crate::values::DefinitionPin,
            outgoing: f64,
            #[serde(rename = "type")]
            kind: &'a str,
            weapon: &'a crate::values::DefinitionPin,
            weapon_id: &'a str,
        }
        let digest = crate::encoding::json_record(&Attack {
            ammo_id: &ammo_id,
            ammunition: &aim.ammunition,
            outgoing,
            kind: "practice-shot",
            weapon: &aim.tool,
            weapon_id: tool.id,
        })
        .map_err(|_| ExecutionError::Invariant)?;
        let policy = ContactPolicy {
            pin: body_policy.map(|body| body.pin().clone()),
            response: body_policy
                .and_then(|body| body.value().combat.as_ref())
                .map_or(ProjectileContact::StopOnly, |combat| {
                    combat.projectile_contact
                }),
        };
        let accuracy = offer.accuracy.ok_or(ExecutionError::Invariant)?;
        let rank = match crate::status::read_attribute(
            actor,
            offer.definition.value(),
            core.state.physical.pending_values.as_ref(),
        )? {
            Some(crate::values::AttributeValue::Number(0.0)) => 0,
            Some(crate::values::AttributeValue::Number(1.0)) => 1,
            _ => return Err(ExecutionError::Invariant),
        };
        let aim_target = aim.aim_target.as_ref().ok_or(ExecutionError::Invariant)?;
        let release_storage = self.budget.reserve(
            512 + aim_target.id.len()
                + ammo_id.len()
                + aim.tool.heap_bytes().ok_or(ExecutionError::Capacity)?
                + offer
                    .definition
                    .pin()
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?
                + aim.ammunition.id.len(),
        )?;
        self.practice_release = Some(PendingPracticeRelease {
            aim: aim_target.clone(),
            definition: offer.definition.pin().clone(),
            tool: aim.tool.clone(),
            ammunition: ammo_id.clone(),
            ammunition_definition: aim.ammunition.id.clone(),
            competence: rank,
            accuracy,
            _storage: release_storage,
        });
        let kind = weapon.ammunition_kind.clone();
        let injury = (weapon.damage + ammunition.damage_bonus) * outgoing;
        // Keep the prepared launch inputs immutable while the original action
        // and its claim settle. All writes share the same candidate inverse.
        let flight = ProjectileFlight::from_action(
            actor,
            action,
            None,
            policy,
            digest.into(),
            ray,
            at,
            weapon,
            injury,
            accuracy,
        )?;
        let projectile =
            self.commit_projectile(core, &hold, ammo_id, recovery, flight, flight_storage)?;
        let event = crate::native_controller::feeding::stage(
            core,
            &self.actor_id,
            &target_id,
            &words.shot_released,
            text.clone(),
            IndexMap::from([
                ("actionId".into(), EventScalar::Text(action_id.into())),
                ("projectileId".into(), EventScalar::Text(projectile.into())),
                ("ammunitionKind".into(), EventScalar::Text(kind.into())),
                ("quantity".into(), EventScalar::Number(1.0)),
                ("targetReference".into(), EventScalar::Boolean(true)),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
            ]),
        )?;
        let mut result = installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        result.code = "released".into();
        result.message = text.clone();
        result.spent = Some(1);
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}
