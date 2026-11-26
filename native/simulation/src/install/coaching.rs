//! Active lessons persist through the same ordered record and physical work
//! owners as other ordinary activities. Each participant holds one lesson ID.
use super::{InstallError, RowImport, WorldChildren, physical::PhysicalDefinitions, rows};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_record, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::state::{EntityStore, ReleaseSupport};
use crate::values::DefinitionPin;
use crate::work::WorkBook;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum LessonPhase {
    Requested,
    Observing,
    Feedback,
}
impl LessonPhase {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Requested => "requested",
            Self::Observing => "observing",
            Self::Feedback => "feedback",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CoachingEpisode {
    pub id: String,
    pub learner_id: String,
    pub coach_id: String,
    pub pin: DefinitionPin,
    pub phase: LessonPhase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed: Option<ReleaseSupport>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub observation_event_id: Option<String>,
    /// A real witnessed release is pending until the same projectile terminates
    /// within the coach’s sight. Feedback cannot use pending evidence.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending: Option<PendingObservation>,
    pub actions: IndexMap<String, String>,
    /// The two independent ordinary action receipts may finish on different
    /// simulation slices. An earned outcome remains exact until both close.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settlement: Option<Settlement>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<f64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Settlement {
    Completed,
    Interrupted,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PendingObservation {
    pub action_id: String,
    pub projectile_id: String,
    pub target_id: String,
    pub release: ReleaseSupport,
}
heap_record!(PendingObservation {
    action_id,
    projectile_id,
    target_id,
    release
});
heap_record!(CoachingEpisode {
    id,
    learner_id,
    coach_id,
    pin,
    observed,
    observation_event_id,
    pending,
    actions
});

impl CoachingEpisode {
    pub(crate) fn partner(&self, id: &str) -> Option<&str> {
        if self.learner_id == id {
            Some(&self.coach_id)
        } else if self.coach_id == id {
            Some(&self.learner_id)
        } else {
            None
        }
    }
    fn valid(
        &self,
        entities: &EntityStore,
        defs: &PhysicalDefinitions<'_>,
        work: &WorkBook,
        now: f64,
    ) -> bool {
        let ids = [&self.learner_id, &self.coach_id];
        let actor = |id: &str| entities.get(id).and_then(|e| e.actor.as_ref());
        self.learner_id != self.coach_id
            && crate::values::is_safe_record_id(&self.id)
            && defs
                .attributes
                .get(&self.pin.id)
                .is_some_and(|d| d.pin() == &self.pin && d.value().practice.is_some())
            && work.invocation(&self.id).is_some_and(|w| {
                w.actor_id == self.learner_id
                    && w.module_id == self.pin.id
                    && w.definition_pin == self.pin
            })
            && ids.iter().all(|id| {
                actor(id).is_some_and(|a| a.coaching_episode_id.as_ref() == Some(&self.id))
            })
            && self.pending.as_ref().is_none_or(|s| {
                self.phase == LessonPhase::Observing
                    && self.observed.is_none()
                    && [
                        &s.action_id,
                        &s.target_id,
                        &s.projectile_id,
                        &s.release.event_id,
                        &s.release.occurrence_id,
                    ]
                    .into_iter()
                    .all(|id| crate::values::is_safe_record_id(id))
            })
            && (self.observation_event_id.is_some() == self.observed.is_some())
            && self
                .observation_event_id
                .as_deref()
                .is_none_or(crate::values::is_safe_record_id)
            && self.settlement.is_none_or(|s| {
                self.phase == LessonPhase::Feedback
                    && !self.actions.is_empty()
                    && (s != Settlement::Completed || self.started_at.is_some())
            })
            && self.observed.as_ref().is_none_or(|s| {
                crate::values::is_safe_record_id(&s.event_id)
                    && crate::values::is_safe_record_id(&s.occurrence_id)
            })
            && self.actions.iter().all(|(id, action)| {
                self.partner(id).is_some_and(|other| {
                    actor(id).and_then(|a| a.action.as_ref()).is_some_and(|a| {
                        a.id == *action
                            && a.kind == "coaching"
                            && a.stage == "working"
                            && a.target_id.as_deref() == Some(other)
                            && a.coaching_episode_id.as_ref() == Some(&self.id)
                            && a.competence_pin.as_ref() == Some(&self.pin)
                    })
                })
            })
            && (self.settlement.is_some() || self.started_at.is_some() == (self.actions.len() == 2))
            && self
                .started_at
                .is_none_or(|at| at.is_finite() && at >= 0. && at <= now)
            && match self.phase {
                LessonPhase::Requested => self.observed.is_none() && self.actions.is_empty(),
                LessonPhase::Observing => self.actions.is_empty(),
                LessonPhase::Feedback => self.observed.is_some() && !self.actions.is_empty(),
            }
    }
}

pub(crate) struct CoachingState {
    pub(crate) present: bool,
    pub(crate) records: IndexMap<String, CoachingEpisode>,
    pub(crate) backing: ResidentReservation,
    pub(crate) payload_bytes: usize,
}

impl CoachingState {
    pub(crate) fn install(
        import: &mut RowImport,
        children: &mut WorldChildren,
        entities: &EntityStore,
        definitions: &PhysicalDefinitions<'_>,
        work: &WorkBook,
        now: f64,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let present = match children.take("coachingEpisodes")? {
            None => false,
            Some(true) => true,
            _ => return Err(InstallError::ParentPresence),
        };
        let owner = rows::take_collection(
            import,
            "sim_coaching_episodes",
            "[\"world\"]",
            present,
            true,
        )?;
        let bytes = owner.rows.iter().try_fold(
            map_storage::<String, CoachingEpisode>(owner.rows.len().saturating_mul(2))
                .ok_or(InstallError::Capacity)?,
            |n, r| {
                n.checked_add(
                    crate::experience::encoded_body_bound(&r.payload)
                        .map_err(|_| InstallError::Capacity)?,
                )
                .ok_or(InstallError::Capacity)
            },
        )?;
        let scratch = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
        let mut records = IndexMap::new();
        records
            .try_reserve(owner.rows.len())
            .map_err(|_| InstallError::Capacity)?;
        for row in owner.rows {
            rows::validate_map_row(
                &row,
                "[\"world\"]",
                "coachingEpisodes",
                &row.slot,
                owner.coverage.next_ordinal,
            )?;
            let record: CoachingEpisode =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if !row.extra.is_empty()
                || row.slot != record.id
                || !record.valid(entities, definitions, work, now)
                || records.insert(row.slot, record).is_some()
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        for id in entities.ordered_ids() {
            if let Some(actor) = entities.get(id).and_then(|e| e.actor.as_ref()) {
                let selected = actor
                    .coaching_episode_id
                    .as_ref()
                    .and_then(|key| records.get(key));
                if actor.coaching_episode_id.is_some()
                    && selected.is_none_or(|e| e.partner(id).is_none())
                    || actor.action.as_ref().is_some_and(|a| {
                        (a.kind == "coaching" || a.coaching_episode_id.is_some())
                            && selected.is_none_or(|e| e.actions.get(id) != Some(&a.id))
                    })
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
        let payload_bytes = records.iter().try_fold(0usize, |n, (id, e)| {
            n.checked_add(Self::row_bytes(id, Some(e)).ok_or(InstallError::Capacity)?)
                .ok_or(InstallError::Capacity)
        })?;
        let size = map_storage::<String, CoachingEpisode>(records.capacity())
            .and_then(|n| n.checked_add(payload_bytes))
            .ok_or(InstallError::Capacity)?;
        let mut backing = budget
            .reserve_backing(0)
            .map_err(|_| InstallError::Capacity)?;
        let mut scratch = scratch;
        scratch.resize(size).map_err(|_| InstallError::Capacity)?;
        budget
            .fund_backing(&mut backing, scratch)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            present,
            records,
            backing,
            payload_bytes,
        })
    }
    /// Check only active lesson evidence, after the personal activity and projectile owners are installed.
    /// A retired activity description may have moved out of the accepted working set.
    pub(crate) fn validate_evidence(
        state: &crate::simulation::SimulationState,
    ) -> Result<(), InstallError> {
        for lesson in state.physical.coaching.records.values() {
            let release = lesson
                .observed
                .as_ref()
                .or_else(|| lesson.pending.as_ref().map(|p| &p.release));
            let Some(release) = release else {
                continue;
            };
            let family = &state
                .installed
                .attributes
                .get(&lesson.pin.id)
                .and_then(|d| d.value().practice.as_ref())
                .ok_or(InstallError::CurrentFormat)?
                .family;
            match state
                .activity
                .occurrence_by_id(&lesson.learner_id, &release.occurrence_id)
            {
                Ok(Some(entry))
                    if entry.revoked == Some(true)
                        || entry
                            .release
                            .as_ref()
                            .is_none_or(|r| !r.supports(&release.event_id, family)) =>
                {
                    return Err(InstallError::CurrentFormat);
                }
                Ok(_) | Err(crate::activity::ActivityError::Unavailable) => (),
                Err(_) => return Err(InstallError::CurrentFormat),
            }
            if let Some(pending) = &lesson.pending {
                let flight = &state
                    .physical
                    .projectiles
                    .flights
                    .get(&pending.projectile_id)
                    .ok_or(InstallError::CurrentFormat)?
                    .flight;
                if !flight.practice
                    || flight.action_id != pending.action_id
                    || flight.source_id != lesson.learner_id
                    || flight.target_id.as_deref() != Some(&pending.target_id)
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
            if let Some(witness) = &lesson.observation_event_id
                && let Ok(record) = state.occurrences.original(witness)
            {
                let e = record.event();
                if e.event_type!="coaching-observed" || e.actor_id.as_deref()!=Some(&lesson.learner_id) || e.target_id.as_deref()!=Some(&lesson.coach_id)
                    || !e.data.as_ref().and_then(|values| values.get("observedShotEventId")).is_some_and(|v| matches!(v,crate::reception::EventScalar::Text(id) if id.as_unicode()==Some(release.event_id.as_str()))) { return Err(InstallError::CurrentFormat); }
            }
        }
        Ok(())
    }

    pub(crate) fn row_bytes(id: &str, row: Option<&CoachingEpisode>) -> Option<usize> {
        if let Some(row) = row {
            // The map owns the key. The two participant bodies retain the same ID.
            row.heap_bytes()?.checked_add(id.len().checked_mul(3)?)
        } else {
            Some(0)
        }
    }
    pub(crate) fn settle(
        &mut self,
        bytes: usize,
        capacity: usize,
        budget: &ByteBudget,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let total = map_storage::<String, CoachingEpisode>(capacity)
            .and_then(|v| v.checked_add(bytes))
            .ok_or(ExecutionError::Capacity)?;
        if total > self.backing.bytes() {
            let growth = from.split_off(total - self.backing.bytes())?;
            if restoring {
                budget.restore_backing(&mut self.backing, growth)?;
            } else {
                budget.fund_backing(&mut self.backing, growth)?;
            }
        }
        self.backing.resize(total)?;
        self.payload_bytes = bytes;
        Ok(())
    }
    pub(crate) fn is_present(&self) -> bool {
        self.present
    }
}
