//! Both ordinary action menus read the actor's practice and sole current lesson
//! through the same read lease and the same visible target.
use super::*;
use crate::commands::CoachingOperation as Op;
use crate::text::{JsText, TextRef, substitute_fields, substituted_fields_bound};
pub struct RuntimeCoachingOffer<'a> {
    pub operation: Op,
    pub attribute: &'a str,
    pub episode: Option<&'a str>,
    pub label: JsText,
    pub description: JsText,
    pub paused: bool,
    _storage: ByteReservation,
}
pub(super) fn visit(
    state: &crate::simulation::SimulationState,
    source: &crate::state::Entity,
    target: &crate::state::Entity,
    name: &JsText,
    budget: &ByteBudget,
    mut emit: impl FnMut(RuntimeCoachingOffer<'_>) -> Result<(), RuntimeError>,
) -> Result<(), RuntimeError> {
    let Some(actor) = source
        .actor
        .as_ref()
        .filter(|_| source.id != target.id && target.actor.is_some())
    else {
        return Ok(());
    };
    let Some(skills) = actor.practice.as_ref() else {
        return Ok(());
    };
    let lesson = actor
        .coaching_episode_id
        .as_ref()
        .and_then(|k| state.physical.coaching.records.get(k));
    if lesson.is_some_and(|e| e.settlement.is_some() || e.partner(&source.id) != Some(&target.id)) {
        return Ok(());
    }
    for attribute in skills.keys() {
        let Some(def) = state
            .installed
            .attributes
            .get(attribute)
            .filter(|d| lesson.is_none_or(|e| e.pin == *d.pin()))
        else {
            continue;
        };
        let Some(profile) = def.value().practice.as_ref() else {
            continue;
        };
        let p = &profile.presentation;
        let _fields = budget.reserve(
            def.value()
                .name
                .len()
                .checked_mul(3)
                .and_then(|n| n.checked_add(64))
                .ok_or(CapacityError)?,
        )?;
        let seconds = profile.feedback_seconds.to_string();
        let skill = def.value().name.to_lowercase();
        let fields = [
            ("target", TextRef::from(name)),
            ("skill", TextRef::from(skill.as_str())),
            ("scope", TextRef::from(profile.scope.as_str())),
            ("feedbackSeconds", TextRef::from(seconds.as_str())),
            ("guidance", TextRef::from(profile.guidance.as_str())),
        ];
        let mut offer =
            |operation: Op, label: &str, description: &str| -> Result<(), RuntimeError> {
                let bytes = substituted_fields_bound(label, &fields)
                    .and_then(|n| n.checked_add(substituted_fields_bound(description, &fields)?))
                    .ok_or(CapacityError)?;
                let storage = budget.reserve(bytes)?;
                emit(RuntimeCoachingOffer {
                    operation,
                    attribute,
                    episode: lesson.map(|e| e.id.as_str()),
                    label: substitute_fields(label, &fields),
                    description: substitute_fields(description, &fields),
                    paused: state.physical.header.paused && !operation.ends(),
                    _storage: storage,
                })
            };
        if let Some(e) = lesson {
            if e.phase == crate::install::LessonPhase::Requested && e.coach_id == source.id {
                offer(Op::Accept, &p.accept_label, &p.accept_description)?;
                offer(Op::Decline, &p.decline_label, &p.decline_description)?;
            }
            if e.observed.is_some() && !e.actions.contains_key(&source.id) {
                offer(
                    Op::Feedback,
                    &profile.coaching_label,
                    &p.feedback_description,
                )?;
            }
            offer(Op::Withdraw, &p.withdraw_label, &p.withdraw_description)?;
        } else {
            offer(Op::Request, &p.request_label, &p.request_description)?;
        }
    }
    Ok(())
}
impl RuntimeContactMenu<'_> {
    pub fn visit_coaching(
        &self,
        budget: &ByteBudget,
        emit: impl FnMut(RuntimeCoachingOffer<'_>) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        visit(
            self.state,
            self.source,
            self.target,
            self.name,
            budget,
            emit,
        )
    }
}

impl NativeWorldSession {
    /// Read only the bound actor's own active lesson, even when the other person
    /// has left view. The command uses the returned ID internally and consumes its reservation.
    pub fn coaching_remedy_target(
        &self,
        account: &str,
        actor: &str,
        episode: &str,
        attribute: &str,
    ) -> Result<Option<(String, u64, ByteReservation)>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let world = &simulation.state.physical;
        let lesson = world
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref()?.coaching_episode_id.as_ref())
            .filter(|id| id.as_str() == episode)
            .and_then(|id| world.coaching.records.get(id))
            .filter(|l| l.pin.id == attribute && l.settlement.is_none());
        let Some(partner) = lesson
            .and_then(|l| l.partner(actor))
            .and_then(|id| world.entities.get(id))
        else {
            return Ok(None);
        };
        let Some(life) = partner.physical_life() else {
            return Ok(None);
        };
        let storage = self.budget.reserve(partner.id.len())?;
        Ok(Some((partner.id.clone(), life, storage)))
    }
}
