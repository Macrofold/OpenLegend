//! Participant links and the episode change together under the physical
//! candidate journal. Save capture emits only the touched episode and actors.
use super::*;
use crate::host::retained_size::map_storage;
use crate::install::CoachingEpisode;

impl PhysicalMutation<'_> {
    pub(crate) fn coaching_participant(
        &mut self,
        id: &str,
        episode: Option<&str>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = self
            .state
            .entities
            .resolve(entity)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if actor.coaching_episode_id.as_deref() == episode {
            return Ok(());
        }
        let key = UndoKey::CoachingParticipant(entity.slot, entity.generation);
        self.journal.reserve(
            actor
                .coaching_episode_id
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                + episode.map_or(0, str::len)
                + id.len(),
        )?;
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::CoachingParticipant {
                    entity,
                    before: actor.coaching_episode_id.clone(),
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(entity)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .coaching_episode_id = episode.map(str::to_owned);
        self.journal.change(PhysicalChange::Attribute {
            entity_id: id.to_owned(),
            outward_change: false,
        })
    }
    pub(crate) fn end_coaching(&mut self, id: &str) -> Result<(), ExecutionError> {
        let Some(episode) = self.state.coaching.records.get(id) else {
            return Ok(());
        };
        if !episode.actions.is_empty() {
            let mut closing = episode.clone();
            closing.settlement = Some(crate::install::CoachingSettlement::Interrupted);
            return self.put_coaching(id, Some(closing));
        }
        let ids = [episode.learner_id.clone(), episode.coach_id.clone()];
        for who in ids {
            self.coaching_participant(&who, None)?;
        }
        self.release_work(id)?;
        self.put_coaching(id, None)
    }
    pub(crate) fn finish_coaching_member(
        &mut self,
        actor: &str,
        action: &str,
    ) -> Result<(), ExecutionError> {
        let Some(id) = self
            .state
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref()?.coaching_episode_id.as_ref())
        else {
            return Ok(());
        };
        let Some(l) = self.state.coaching.records.get(id).filter(|l| {
            l.settlement.is_some() && l.actions.get(actor).is_some_and(|a| a == action)
        }) else {
            return Ok(());
        };
        let key = l.id.clone();
        let mut updated = l.clone();
        updated.actions.shift_remove(actor);
        self.put_coaching(&key, Some(updated))?;
        if self
            .state
            .coaching
            .records
            .get(&key)
            .is_some_and(|e| e.actions.is_empty())
        {
            self.end_coaching(&key)?;
        }
        Ok(())
    }
    pub(crate) fn put_coaching(
        &mut self,
        id: &str,
        episode: Option<CoachingEpisode>,
    ) -> Result<(), ExecutionError> {
        let owner = &mut self.state.coaching;
        let entry = owner.records.get_full(id);
        let old = crate::install::CoachingState::row_bytes(id, entry.map(|(_, _, v)| v))
            .ok_or(ExecutionError::Capacity)?;
        let new = crate::install::CoachingState::row_bytes(id, episode.as_ref())
            .ok_or(ExecutionError::Capacity)?;
        let bytes = owner
            .payload_bytes
            .checked_sub(old)
            .and_then(|n| n.checked_add(new))
            .ok_or(ExecutionError::Capacity)?;
        let grows =
            episode.is_some() && entry.is_none() && owner.records.len() == owner.records.capacity();
        let expected = if grows {
            owner
                .records
                .len()
                .checked_add(1)
                .and_then(|v| v.checked_mul(2))
                .and_then(|v| v.checked_add(3))
                .ok_or(ExecutionError::Capacity)?
        } else {
            owner.records.capacity()
        };
        let bound = map_storage::<String, CoachingEpisode>(expected)
            .and_then(|n| n.checked_add(bytes))
            .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(
            old.checked_add(id.len().checked_mul(3).ok_or(ExecutionError::Capacity)?)
                .and_then(|n| n.checked_add(bound.saturating_sub(owner.backing.bytes())))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::CoachingEpisode(id.to_owned());
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::CoachingEpisode {
                    id: id.to_owned(),
                    before: entry.map(|(i, _, e)| (i, e.clone())),
                    present: owner.present,
                },
            )?;
        }
        if let Some(value) = episode {
            if grows {
                owner
                    .records
                    .try_reserve(1)
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            owner.records.insert(id.into(), value);
        } else {
            owner.records.shift_remove(id);
        }
        // Make the undo journal see the actual row even if backing allocation fails.
        owner.payload_bytes = bytes;
        owner.settle(
            bytes,
            owner.records.capacity(),
            &self.journal.budget,
            &mut self.journal.reservation,
            false,
        )?;
        owner.present = !owner.records.is_empty();
        Ok(())
    }
}

impl CoreMutation<'_> {
    pub(crate) fn coaching_party_available(
        &self,
        entity: &crate::state::Entity,
        profile: &crate::status::PracticeProfile,
    ) -> Result<bool, ExecutionError> {
        let installed = &self.state.installed;
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(false);
        };
        Ok(actor.alive
            && !actor.incapacitated
            && entity.actively_participates()
            && entity.retirement.is_none()
            && entity.supported_position().is_some()
            && (!profile.coaching_eligibility.manual_work
                || actor.body.as_ref().is_some_and(|body| {
                    installed
                        .occurrence_rules
                        .value()
                        .response
                        .offers
                        .manual_work_body_plans
                        .contains(&body.plan)
                }))
            && (profile.coaching_eligibility.communication != "spoken"
                || crate::worlds::InstalledSpeechAction::allows_speaker(entity))
            && !installed
                .capabilities
                .capability_blocked(Some(entity), "actions")?
            && !installed
                .capabilities
                .capability_blocked(Some(entity), "speech")?)
    }

    /// Check only this real episode’s participant, installation, and evidence
    /// owners. Revocation and world transitions use the same current cut.
    pub(crate) fn coaching_is_current(&self, l: &CoachingEpisode) -> Result<bool, ExecutionError> {
        let Some(def) = self
            .state
            .installed
            .attributes
            .get(&l.pin.id)
            .filter(|d| d.pin() == &l.pin)
        else {
            return Ok(false);
        };
        let Some(profile) = def.value().practice.as_ref() else {
            return Ok(false);
        };
        let parties = [&l.learner_id, &l.coach_id];
        for id in parties {
            let Some(e) = self.state.physical.entities.get(id) else {
                return Ok(false);
            };
            let Some(a) = e.actor.as_ref() else {
                return Ok(false);
            };
            if !self.coaching_party_available(e, profile)? {
                return Ok(false);
            }
            let rank = a
                .practice
                .as_ref()
                .and_then(|p| p.get(&l.pin.id))
                .map(|p| p.rank(profile));
            if id == &l.learner_id && rank.is_none()
                || id == &l.coach_id
                    && l.phase != crate::install::LessonPhase::Requested
                    && rank != Some(1)
            {
                return Ok(false);
            }
            if let Some(release) = l
                .observed
                .as_ref()
                .or_else(|| l.pending.as_ref().map(|p| &p.release))
                && self.state.experience.actor(id).is_none_or(|h| {
                    l.observation_event_id
                        .as_ref()
                        .is_some_and(|id| h.privacy.revoked(id))
                        || h.privacy.revoked(&release.event_id)
                        || h.privacy.revoked(&release.occurrence_id)
                })
            {
                return Ok(false);
            }
            if let Some(aid) = l.actions.get(id)
                && !a
                    .action
                    .as_ref()
                    .is_some_and(|a| a.id == *aid && a.coaching_episode_id.as_ref() == Some(&l.id))
            {
                return Ok(false);
            }
            if !crate::outings::reception::sees(
                self,
                id,
                l.partner(id).ok_or(ExecutionError::Invariant)?,
            )? {
                return Ok(false);
            }
        }
        if l.phase == crate::install::LessonPhase::Feedback {
            let a = self
                .state
                .physical
                .entities
                .get(&l.learner_id)
                .ok_or(ExecutionError::Invariant)?;
            let b = self
                .state
                .physical
                .entities
                .get(&l.coach_id)
                .ok_or(ExecutionError::Invariant)?;
            if crate::geometry::interaction_reach(
                a,
                b,
                profile.communication_range,
                &self.journal.physical.budget,
            )?
            .is_none()
            {
                return Ok(false);
            }
        }
        Ok(true)
    }
    pub(crate) fn reconcile_coaching(&mut self) -> Result<(), ExecutionError> {
        let mut index = 0;
        while let Some((id, l)) = self.state.physical.coaching.records.get_index(index) {
            self.journal
                .meters
                .charge(&[(crate::work::WorkUnit::Tests, 1)])?;
            if l.settlement.is_none() && !self.coaching_is_current(l)? {
                let key = id.clone();
                self.physical().end_coaching(&key)?;
                if !self.state.physical.coaching.records.contains_key(&key) {
                    continue;
                }
            }
            let (_, l) = self
                .state
                .physical
                .coaching
                .records
                .get_index(index)
                .ok_or(ExecutionError::Invariant)?;
            if l.settlement.is_some() {
                let missing = l.actions.iter().find(|(who, action)| {
                    !self
                        .state
                        .physical
                        .entities
                        .get(who.as_str())
                        .and_then(|e| e.actor.as_ref()?.action.as_ref())
                        .is_some_and(|a| a.id == **action)
                });
                if let Some((who, action)) = missing {
                    let who = who.clone();
                    let action = action.clone();
                    self.physical().finish_coaching_member(&who, &action)?;
                    continue;
                }
            }
            index += 1;
        }
        self.physical().prune_empty_coaching()
    }
    /// Consult only this learner’s selected lesson and the awareness acquired
    /// by its coach at this exact release. Older private history is never scanned.
    pub(crate) fn coaching_release(
        &mut self,
        learner: &str,
        action: &str,
        target: &str,
        attribute: &str,
        occurrence: &str,
        event: &CompletedOccurrence,
    ) -> Result<(), ExecutionError> {
        let Some(id) = self
            .state
            .physical
            .entities
            .get(learner)
            .and_then(|e| e.actor.as_ref()?.coaching_episode_id.as_deref())
        else {
            return Ok(());
        };
        let Some(l) = self.state.physical.coaching.records.get(id).filter(|l| {
            l.learner_id == learner
                && l.pin.id == attribute
                && l.phase == crate::install::LessonPhase::Observing
                && l.observed.is_none()
                && l.pending.is_none()
        }) else {
            return Ok(());
        };
        let Some(history) = self
            .state
            .experience
            .actor(&l.coach_id)
            .filter(|h| !h.privacy.revoked(event.event_id()))
        else {
            return Ok(());
        };
        let selected = history
            .collection(crate::experience::PersonalSourceKind::Awareness)
            .map_err(ExecutionError::Experience)?
            .records()
            .rev()
            .take_while(|r| r.header().sequence.is_some_and(|s| s >= event.sequence()))
            .find(|r| r.header().event_id.as_deref() == Some(event.event_id()));
        #[derive(serde::Deserialize)]
        struct Modality<'a> {
            modality: &'a str,
        }
        if !selected.is_some_and(|r| {
            serde_json::from_str::<Modality<'_>>(r.payload())
                .is_ok_and(|m| m.modality == "observed")
        }) || !crate::outings::reception::sees(self, &l.coach_id, learner)?
            || !crate::outings::reception::sees(self, &l.coach_id, target)?
        {
            return Ok(());
        }
        let mut changed = l.clone();
        let key = l.id.clone();
        let original = self
            .state
            .occurrences
            .original(event.event_id())
            .map_err(|_| ExecutionError::Invariant)?;
        let projectile = original
            .event()
            .data
            .as_ref()
            .and_then(|d| d.get("projectileId"))
            .and_then(|v| match v {
                crate::reception::EventScalar::Text(id) => id.as_unicode(),
                _ => None,
            })
            .ok_or(ExecutionError::Invariant)?;
        changed.pending = Some(crate::install::PendingObservation {
            projectile_id: projectile.into(),
            action_id: action.into(),
            target_id: target.into(),
            release: crate::state::ReleaseSupport {
                occurrence_id: occurrence.into(),
                event_id: event.event_id().into(),
            },
        });
        self.physical().put_coaching(&key, Some(changed))
    }
    pub(crate) fn coaching_result(
        &mut self,
        source: &str,
        action: &str,
        visible: bool,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let Some(id) = self
            .state
            .physical
            .entities
            .get(source)
            .and_then(|e| e.actor.as_ref()?.coaching_episode_id.as_ref())
        else {
            return Ok(None);
        };
        let Some(l) = self
            .state
            .physical
            .coaching
            .records
            .get(id)
            .filter(|e| e.pending.as_ref().is_some_and(|p| p.action_id == action))
        else {
            return Ok(None);
        };
        let key = l.id.clone();
        let mut changed = l.clone();
        let pending = changed.pending.take().ok_or(ExecutionError::Invariant)?;
        let seen = visible
            && [&l.learner_id, &l.coach_id].into_iter().all(|id| {
                self.state.experience.actor(id).is_some_and(|h| {
                    !h.privacy.revoked(&pending.release.event_id)
                        && !h.privacy.revoked(&pending.release.occurrence_id)
                })
            });
        let event = if seen {
            let p = self
                .state
                .installed
                .attributes
                .get(&l.pin.id)
                .and_then(|d| d.value().practice.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            let e = crate::events::EventEmissionIntent {
                event_type: "coaching-observed".into(),
                text: crate::events::EmissionText::Literal(
                    p.presentation.observed_event.as_str().into(),
                ),
                audience: crate::events::AudienceSelection::Explicit(vec![
                    l.learner_id.clone(),
                    l.coach_id.clone(),
                ]),
                scope: crate::events::EventScope::Private,
                source_id: Some(l.learner_id.clone()),
                target_id: Some(l.coach_id.clone()),
                data: Some(indexmap::IndexMap::from([(
                    "observedShotEventId".into(),
                    crate::reception::EventScalar::Text(pending.release.event_id.as_str().into()),
                )])),
                exposure: None,
                origin: None,
            };
            let event = self.stage_event(e)?;
            changed.observed = Some(pending.release);
            changed.observation_event_id = Some(event.id.clone());
            Some(event)
        } else {
            None
        };
        self.physical().put_coaching(&key, Some(changed))?;
        Ok(event)
    }
}

impl crate::simulation::PhysicalState {
    pub(crate) fn coaching_witness<'a>(
        &'a self,
        source: &str,
        action: &str,
    ) -> Option<(&'a str, &'a str)> {
        let id = self
            .entities
            .get(source)?
            .actor
            .as_ref()?
            .coaching_episode_id
            .as_ref()?;
        let l = self.coaching.records.get(id)?;
        let pending = l.pending.as_ref().filter(|p| p.action_id == action)?;
        Some((&l.coach_id, &pending.target_id))
    }
}
