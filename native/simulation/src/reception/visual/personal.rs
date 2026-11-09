//! Memory-capable visual reception uses one actual current lifetime across broad
//! selection, selected detail, received geometry and familiarity. Physical sight
//! is supplied as the sealed result of the same candidate's finite sensor batch.
use super::*;
mod publication;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::CandidateKey;
use crate::language::{CollationAnswer, CollationRequest};
use crate::received::{CurrentRecordingContext, TemporalSupportRecord};
use crate::worlds::base_recognition::AttentionContactPreparation;
pub(crate) use publication::*;

/// These are the real scheduler/change-feed facts. Unknown changed subjects
/// deliberately widen detail; they are never interpreted as an empty change.
pub(crate) struct VisualOpportunity {
    pub detail_only: bool,
    pub immediate: bool,
    pub due_subjects: IndexSet<String>,
    pub changed_detail_subjects: Option<IndexSet<String>>,
    pub changed_people: Option<IndexSet<String>>,
    pub objects_changed: bool,
}
pub(crate) struct RequestedVisualDetails {
    pub ids: IndexSet<String>,
    _reservation: ByteReservation,
}
/// Select detail from the actual received competition before constructing a
/// physical query. Broad and detail-only reception share this same predicate.
pub(crate) fn requested_visual_details(
    core: &CoreMutation<'_>,
    observer: &str,
    opportunity: &VisualOpportunity,
    budget: &ByteBudget,
) -> Result<RequestedVisualDetails, ExecutionError> {
    let state = owner(core, observer)?;
    let entries = state
        .attention
        .as_ref()
        .map_or(&[][..], |a| a.entries.as_slice());
    let bytes = entries.iter().try_fold(
        crate::host::retained_size::map_storage::<String, ()>(entries.len())
            .ok_or(ExecutionError::Capacity)?,
        |sum, e| {
            sum.checked_add(e.source_id.len())
                .ok_or(ExecutionError::Capacity)
        },
    )?;
    let reservation = budget.reserve(bytes)?;
    let ids = entries
        .iter()
        .filter(|entry| {
            opportunity.immediate
                || opportunity.due_subjects.contains(&entry.source_id)
                || entry.started_at == core.state.physical.header.sim_time
                || opportunity
                    .changed_detail_subjects
                    .as_ref()
                    .is_none_or(|changed| changed.contains(&entry.source_id))
                || state
                    .current
                    .get(&entry.source_id)
                    .and_then(|c| c.sight.as_ref())
                    .and_then(|s| s.detail.as_ref())
                    .is_none()
        })
        .map(|e| e.source_id.clone())
        .collect();
    Ok(RequestedVisualDetails {
        ids,
        _reservation: reservation,
    })
}

pub(crate) struct VisualNotice {
    pub target_id: String,
    pub detail: crate::text::JsText,
    pub person: bool,
}
/// This product proves receiving only. The outward notice emitter must preserve
/// person notices → people publication → objects publication → object notices.
pub(crate) struct ReceivedPersonalVisual {
    pub observer: ObserverLife,
    pub people: Vec<String>,
    pub objects: Vec<String>,
    pub notices: Vec<VisualNotice>,
    pub detail_only: bool,
    _reservation: ByteReservation,
    _geometry: Option<CompletedGeometryReception>,
}
pub(crate) enum PersonalVisualAnswer {
    Geometry(GeometryAnswers),
    Language(CollationAnswer),
}
pub(crate) enum PersonalVisualStep<'a> {
    Geometry(&'a GeometryQueries),
    Language(&'a CollationRequest),
    Received(ReceivedPersonalVisual),
}
enum Phase {
    Physical,
    Geometry,
    Contacts,
    Finish,
    Done,
}
pub(crate) struct PersonalVisualCursor {
    phase: Phase,
    visual: Option<VisualReception>,
    sight: Option<SightResults>,
    opportunity: VisualOpportunity,
    candidate: CandidateKey,
    people: Vec<String>,
    objects: Vec<String>,
    geometry: Option<GeometryReceptionCursor>,
    acquired_geometry: Option<CompletedGeometryReception>,
    contacts: Vec<String>,
    contact_at: usize,
    contact: Option<AttentionContactPreparation>,
    held: Option<Arc<TemporalSupportRecord>>,
    reservation: Option<ByteReservation>,
}
impl PersonalVisualCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        sight: SightResults,
        opportunity: VisualOpportunity,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let observer = core
            .state
            .physical
            .entities
            .get(&sight.observer().actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        if !observer.has_memory()
            || observer.physical_life() != Some(sight.observer().physical_life)
            || sight.binding().candidate_id != candidate.id
            || sight.binding().base_cut != candidate.base_cut
            || sight.binding().generation != candidate.generation
        {
            return Err(invalid());
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            opportunity
                .due_subjects
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            opportunity
                .changed_detail_subjects
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            opportunity
                .changed_people
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            sight
                .iter()
                .try_fold(0usize, |sum, (id, _)| {
                    heap_sum([sum, id.len().checked_mul(8)?, 8 * size_of::<String>()])
                })
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            phase: Phase::Physical,
            visual: None,
            sight: Some(sight),
            opportunity,
            candidate,
            people: Vec::new(),
            objects: Vec::new(),
            geometry: None,
            acquired_geometry: None,
            contacts: Vec::new(),
            contact_at: 0,
            contact: None,
            held: None,
            reservation: Some(reservation),
        })
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.geometry
            .as_ref()
            .and_then(GeometryReceptionCursor::geometry_request)
    }
    pub(crate) fn language_request(&self) -> Option<&CollationRequest> {
        self.contact
            .as_ref()
            .map(AttentionContactPreparation::comparisons)
            .or_else(|| {
                self.geometry
                    .as_ref()
                    .and_then(GeometryReceptionCursor::language_request)
            })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PersonalVisualAnswer>,
        budget: &ByteBudget,
    ) -> Result<PersonalVisualStep<'a>, ExecutionError> {
        let mut answer = answer;
        loop {
            match self.phase {
                Phase::Physical => {
                    if answer.is_some() {
                        return Err(invalid());
                    }
                    self.receive_physical(core, budget)?;
                    self.geometry = Some(GeometryReceptionCursor::prepare(
                        core,
                        &self.visual.as_ref().ok_or_else(invalid)?.observer.actor_id,
                        self.candidate,
                        budget,
                    )?);
                    self.phase = Phase::Geometry;
                }
                Phase::Geometry => {
                    let input = answer.take().map(|a| match a {
                        PersonalVisualAnswer::Geometry(a) => GeometryReceptionAnswer::Geometry(a),
                        PersonalVisualAnswer::Language(a) => GeometryReceptionAnswer::Language(a),
                    });
                    let result = self
                        .geometry
                        .as_mut()
                        .ok_or_else(invalid)?
                        .step(core, input, budget)?;
                    let kind = match result {
                        GeometryReceptionStep::Geometry(_) => 0,
                        GeometryReceptionStep::Language(_) => 1,
                        GeometryReceptionStep::Complete(result) => {
                            self.acquired_geometry = Some(result);
                            2
                        }
                    };
                    if kind == 0 {
                        return Ok(PersonalVisualStep::Geometry(
                            self.geometry_request().ok_or_else(invalid)?,
                        ));
                    }
                    if kind == 1 {
                        return Ok(PersonalVisualStep::Language(
                            self.language_request().ok_or_else(invalid)?,
                        ));
                    }
                    self.geometry = None;
                    let visual = self.visual.as_mut().ok_or_else(invalid)?;
                    if let Some(before) = visual.current.before.as_ref().map(Arc::clone) {
                        reconcile_current_cohort(core, before, None, budget)?;
                    }
                    visual.current.reconciled = true;
                    self.prepare_contacts(core, budget)?;
                    self.phase = Phase::Contacts;
                }
                Phase::Contacts => {
                    if let Some(prepared) = self.contact.take() {
                        let Some(PersonalVisualAnswer::Language(answer)) = answer.take() else {
                            self.contact = Some(prepared);
                            return Ok(PersonalVisualStep::Language(
                                self.language_request().ok_or_else(invalid)?,
                            ));
                        };
                        let credited = prepared.finish(core, &answer, budget)?;
                        if !credited {
                            self.release_contact(core)?
                        } else {
                            self.held = None;
                        }
                    } else if answer.is_some() {
                        return Err(invalid());
                    }
                    while self.contact_at < self.contacts.len() {
                        let at = self.contact_at;
                        self.contact_at += 1;
                        self.prepare_contact(core, at, budget)?;
                        if self.contact.is_some() {
                            return Ok(PersonalVisualStep::Language(
                                self.language_request().ok_or_else(invalid)?,
                            ));
                        }
                    }
                    self.phase = Phase::Finish;
                }
                Phase::Finish => {
                    let mut visual = self.visual.take().ok_or_else(invalid)?;
                    visual.settle_housekeeping(core, budget)?;
                    evaluate_attention_relations(core, &visual.observer.actor_id, budget)?;
                    visual.current.finish(core, budget)?;
                    visual.reserve(
                        visual
                            .notices
                            .len()
                            .checked_mul(size_of::<VisualNotice>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let mut notices = Vec::new();
                    notices
                        .try_reserve_exact(visual.notices.len())
                        .map_err(|_| ExecutionError::Capacity)?;
                    for (id, detail) in visual.notices {
                        let person = self.people.contains(&id);
                        notices.push(VisualNotice {
                            target_id: id,
                            detail,
                            person,
                        });
                    }
                    let mut reservation = self.reservation.take().ok_or_else(invalid)?;
                    reservation.merge(visual.reservation)?;
                    self.phase = Phase::Done;
                    return Ok(PersonalVisualStep::Received(ReceivedPersonalVisual {
                        observer: visual.observer,
                        people: std::mem::take(&mut self.people),
                        objects: std::mem::take(&mut self.objects),
                        notices,
                        detail_only: self.opportunity.detail_only,
                        _reservation: reservation,
                        _geometry: self.acquired_geometry.take(),
                    }));
                }
                Phase::Done => return Err(invalid()),
            }
        }
    }
    fn receive_physical(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let sight = self.sight.as_ref().ok_or_else(invalid)?;
        let observer = sight.observer().actor_id.as_str();
        begin_perception_phase(core, observer, budget)?;
        let count = sight.iter().count();
        // A sensor batch proves rays, not enumeration order. The canonical
        // entity-order labels reproduce Source's selected-contact index order.
        let mut ordered: Vec<_> = sight.iter().collect();
        ordered.sort_by(|(a, _), (b, _)| {
            core.state
                .physical
                .entities
                .ordering(a)
                .cmp(&core.state.physical.entities.ordering(b))
        });
        self.people
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        self.objects
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut eligible = IndexSet::with_capacity(count);
        for &(id, seen) in &ordered {
            if !seen || id == observer {
                continue;
            }
            let entity = core
                .state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::MissingEntity)?;
            // PhysicalInstallation certified every admitted mutable entity has
            // its real actor body. Corpses remain actors, and are read as objects.
            let actor = entity
                .actor
                .as_ref()
                .ok_or(ExecutionError::UnsupportedFamily)?;
            if actor.alive {
                self.people.push(id.into());
            } else if entity.remains.is_some() {
                self.objects.push(id.into());
            } else {
                continue;
            }
            eligible.insert(id.into());
        }
        // BodyIndex emits stable entity order. People and objects are separate
        // Source arrays; their concatenation owns episode insertion chronology.
        if !self.opportunity.detail_only {
            if let Some(changed) = &self.opportunity.changed_people {
                // A scoped broad sample retests changed people, not the entire
                // prior roster. In particular, a detail-only body refresh does
                // not itself replace the independently maintained broad list.
                // All admitted mutable roots have actor bodies; an absent root
                // or remains is the selected object's exposure dependency.
                let previous = core
                    .state
                    .reception
                    .visible_people
                    .as_ref()
                    .and_then(|rows| rows.get(observer));
                let bytes = self
                    .reservation
                    .as_ref()
                    .ok_or_else(invalid)?
                    .bytes()
                    .checked_add(
                        previous
                            .map_or(Some(0), HeapBytes::heap_bytes)
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?;
                self.reservation
                    .as_mut()
                    .ok_or_else(invalid)?
                    .resize(bytes)?;
                self.people.retain(|id| changed.contains(id));
                self.people.extend(
                    previous
                        .into_iter()
                        .flatten()
                        .filter(|id| !changed.contains(*id))
                        .cloned(),
                );
                self.people.sort_by(|a, b| {
                    core.state
                        .physical
                        .entities
                        .ordering(a)
                        .cmp(&core.state.physical.entities.ordering(b))
                });
                if !self.opportunity.objects_changed {
                    if let Some(previous) = core
                        .state
                        .reception
                        .visible_objects
                        .as_ref()
                        .and_then(|rows| rows.get(observer))
                    {
                        let bytes = self
                            .reservation
                            .as_ref()
                            .ok_or_else(invalid)?
                            .bytes()
                            .checked_add(previous.heap_bytes().ok_or(ExecutionError::Capacity)?)
                            .ok_or(ExecutionError::Capacity)?;
                        self.reservation
                            .as_mut()
                            .ok_or_else(invalid)?
                            .resize(bytes)?;
                        self.objects.clone_from(previous);
                    }
                }
                eligible.clear();
                eligible.extend(self.people.iter().chain(&self.objects).cloned());
            }
            self.reconcile_episodes(core, &eligible, budget)?;
            core.journal
                .current
                .clear_visible_places(&mut core.state.reception, observer)?;
        }
        let mut visual = begin_visual(core, sight, None, budget)?;
        visual.collect_notices = !self.opportunity.detail_only;
        if self.opportunity.detail_only {
            let requested = requested_visual_details(
                core,
                &visual.observer.actor_id,
                &self.opportunity,
                budget,
            )?;
            let lost: IndexSet<_> = requested
                .ids
                .iter()
                .filter(|id| !eligible.contains(*id))
                .cloned()
                .collect();
            for id in &lost {
                core.journal
                    .episodes
                    .remove_subject(&mut core.state.reception, observer, id)?;
            }
            self.people = core
                .state
                .reception
                .visible_people
                .as_ref()
                .and_then(|r| r.get(observer))
                .into_iter()
                .flatten()
                .filter(|id| !lost.contains(*id))
                .cloned()
                .collect();
            self.objects = core
                .state
                .reception
                .visible_objects
                .as_ref()
                .and_then(|r| r.get(observer))
                .into_iter()
                .flatten()
                .filter(|id| !lost.contains(*id))
                .cloned()
                .collect();
            // Detail-only loss filters the existing outward lists before
            // receiving, as Source does. Missing observer lists remain missing.
            for people in [true, false] {
                let present = (if people {
                    &core.state.reception.visible_people
                } else {
                    &core.state.reception.visible_objects
                })
                .as_ref()
                .is_some_and(|r| r.contains_key(observer));
                if present {
                    let ids = if people { &self.people } else { &self.objects };
                    core.journal
                        .current
                        .reserve_growth(ids.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    core.journal.current.set_visibility(
                        &mut core.state.reception,
                        observer,
                        people,
                        ids.clone(),
                    )?;
                }
            }
            visual.receive_losses(core, sight, Some(&requested.ids), Some(&eligible), budget)?;
            // A detail-only cut consumes the attention selection in its own
            // order. Broad reception below consumes the physical candidate
            // order; exchanging those orders changes saved sample chronology.
            for id in &requested.ids {
                if eligible.contains(id) {
                    receive_subject(&mut visual, core, id, sight, true, budget)?;
                }
            }
            visual.finish_checks(core, false, budget)?;
        } else {
            visual.receive_losses(core, sight, None, Some(&eligible), budget)?;
            for id in self.people.iter().chain(&self.objects) {
                receive_subject(&mut visual, core, id, sight, false, budget)?;
            }
            visual.finish_checks(core, true, budget)?;
            let changed: Vec<_> = visual.attention_changes.iter().cloned().collect();
            let geometry: Vec<_> = visual.geometry_changes.iter().cloned().collect();
            core.sync_attention_changes()?;
            update_attention(
                &core.state.physical,
                &mut core.state.reception,
                &core.state.installed,
                &core.state.experience,
                &mut core.journal.current,
                observer,
                AttentionUpdate {
                    changed_source_ids: Some(&changed),
                    geometry_source_ids: Some(&geometry),
                    ..Default::default()
                },
            )?;
            if let Some(before) = visual.current.before.as_ref().map(Arc::clone) {
                reconcile_current_cohort(core, before, None, budget)?;
            }
            visual.current.reconciled = true;
            visual.settle_housekeeping(core, budget)?;
            let requested = requested_visual_details(
                core,
                &visual.observer.actor_id,
                &self.opportunity,
                budget,
            )?;
            let current = visual.current;
            let mut detail = begin_visual(core, sight, Some(current), budget)?;
            detail.receive_losses(core, sight, Some(&requested.ids), Some(&eligible), budget)?;
            for &(id, _) in &ordered {
                if requested.ids.contains(id) && eligible.contains(id) {
                    receive_subject(&mut detail, core, id, sight, true, budget)?;
                }
            }
            detail.finish_checks(core, false, budget)?;
            detail.reservation.merge(visual.reservation)?;
            detail.notices = visual.notices; // only broad changes produce notices
            visual = detail;
        }
        self.visual = Some(visual);
        Ok(())
    }
    fn reconcile_episodes(
        &self,
        core: &mut CoreMutation<'_>,
        eligible: &IndexSet<String>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let sight = self.sight.as_ref().ok_or_else(invalid)?;
        let observer = &sight.observer().actor_id;
        let prior = core
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|r| r.get(observer));
        let _reservation = budget.reserve(
            prior
                .map_or(Some(0), |p| {
                    p.keys()
                        .try_fold(p.len().checked_mul(size_of::<String>())?, |sum, id| {
                            sum.checked_add(id.len())
                        })
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let removed: Vec<_> = prior
            .into_iter()
            .flat_map(|p| p.keys())
            .filter(|id| !eligible.contains(*id))
            .cloned()
            .collect();
        for id in removed {
            core.journal
                .episodes
                .remove_subject(&mut core.state.reception, observer, &id)?;
        }
        let now = core.state.physical.header.sim_time;
        for id in self.people.iter().chain(&self.objects) {
            let previous = core
                .state
                .reception
                .perception_evidence
                .as_ref()
                .and_then(|p| p.get(observer))
                .and_then(|p| p.gaps.get(id))
                .filter(|g| {
                    g.through >= now
                        && core
                            .state
                            .physical
                            .entities
                            .get(id)
                            .is_some_and(|e| e.physical_life() == g.physical_life)
                })
                .map(|g| g.episode_id.clone());
            core.journal.episodes.ensure(
                &mut core.state.reception,
                observer,
                id,
                core.state.physical.header.sequence,
                now,
                previous.as_deref(),
            )?;
        }
        Ok(())
    }
    fn prepare_contacts(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let observer = &self.visual.as_ref().ok_or_else(invalid)?.observer.actor_id;
        // Source finishes physical reception before its contact-credit phase.
        // Its entry order is the completed attention selection, not the
        // pre-sight cohort which also owns outgoing history above.
        let Some(cohort) = CurrentCohort::capture(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            observer,
            budget,
        )?
        else {
            self.contacts.clear();
            return Ok(());
        };
        let count = cohort
            .entry_source_ids()
            .count()
            .checked_add(cohort.track_source_ids().count())
            .ok_or(ExecutionError::Capacity)?;
        let text = cohort
            .entry_source_ids()
            .chain(cohort.track_source_ids())
            .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let bytes = crate::host::retained_size::heap_sum([
            text,
            count
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            crate::host::retained_size::map_storage::<String, ()>(count)
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut ids = IndexSet::with_capacity(count);
        for id in cohort.entry_source_ids().chain(cohort.track_source_ids()) {
            if !ids.contains(id) {
                ids.insert(id.to_owned());
            }
        }
        self.contacts = ids.into_iter().collect();
        Ok(())
    }
    fn prepare_contact(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let observer = &self.visual.as_ref().ok_or_else(invalid)?.observer.actor_id;
        let id = &self.contacts[index];
        let current = owner(core, observer)?;
        let _reservation = budget.reserve(
            current
                .current
                .get(id)
                .map(super::super::current_journal::contact_copy_heap)
                .transpose()?
                .unwrap_or(0),
        )?;
        let subject = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            observer,
        )?
        .current_body_subject(id)?;
        let Some(subject) = subject else {
            return Ok(());
        };
        let now = core.state.physical.header.sim_time;
        if !core.state.installed.account_law().attention_contact_due(
            &core.state.reception,
            observer,
            &subject,
            now,
        ) {
            return Ok(());
        }
        if !crate::received::ensure_temporal_actor(core, observer, budget)? {
            return Ok(());
        }
        let current = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|r| r.get(observer))
            .ok_or_else(invalid)?;
        let Some(body) = current_native_facet_at(
            Some(current),
            id,
            "body",
            CurrentFacetSelector {
                modality: Some(Modality::Sight),
                ..Default::default()
            },
        )?
        else {
            return Ok(());
        };
        if body.metadata.availability.is_some()
            || effective_current_check(current, body.grant, body.metadata, false)?.map_or(
                body.metadata.times.expanded().confirmed_through,
                |stamp| {
                    stamp
                        .through
                        .max(body.metadata.times.expanded().confirmed_through)
                },
            ) != now
        {
            return Ok(());
        }
        let installed = Arc::clone(&core.state.installed);
        let policy = &installed.attention.value().retention;
        let held = core.state.temporal.retain_current_support(
            &mut CurrentRecordingContext {
                current: &mut core.journal.current,
                actor_id: observer,
                owner: current,
                values: core
                    .state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?,
                identity: &mut core.state.physical.identity,
                scopes: &mut core.journal.acquisitions,
                recent_policy: &policy.recent,
                maintenance_headroom: policy.maintenance_headroom,
                meaning: &crate::worlds::InstalledEvidenceMeaning,
                meters: &mut core.journal.meters,
                now,
                sequence: core.state.physical.header.sequence,
                budget,
            },
            body,
            false,
            &policy.optional,
            policy,
        )?;
        let Some(held) = held else { return Ok(()) };
        let receipt = &held.capsule().receipt;
        let Some(member) = receipt.facets.first().map(|f| f.member_index) else {
            self.held = Some(held);
            self.release_contact(core)?;
            return Ok(());
        };
        let source_bound=receipt.locator.id_len().and_then(|n|n.checked_add(receipt.locator.actor_id.len())).and_then(|n|n.checked_mul(6)).and_then(|n|n.checked_add(r#"{"family":"native-exposure","id":"","revision":1,"observer":{"actorId":"","physicalLife":9007199254740991}}"#.len())).ok_or(ExecutionError::Capacity)?;
        let support_bound = source_bound
            .checked_add(r#"{"source":,"memberIndex":9007199254740991}"#.len())
            .ok_or(ExecutionError::Capacity)?;
        let _encoding = budget.reserve(
            source_bound
                .checked_add(support_bound)
                .and_then(|n| n.checked_add(size_of::<String>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let source = crate::worlds::base_recognition::source_json(&receipt.locator)?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Support<'a> {
            source: &'a serde_json::value::RawValue,
            member_index: u64,
        }
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(&source).map_err(|_| invalid())?;
        let support = crate::encoding::json_record(&Support {
            source: raw,
            member_index: member,
        })
        .map_err(|_| invalid())?;
        let binding = GeometryBinding::new(
            self.candidate,
            installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        self.contact = AttentionContactPreparation::prepare(
            core,
            observer,
            &subject,
            &source,
            now,
            receipt.order,
            &[support],
            binding,
            budget,
        )?;
        self.held = Some(held);
        if self.contact.is_none() {
            self.release_contact(core)?;
        }
        Ok(())
    }
    fn release_contact(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(held) = self.held.take() {
            let observer = &self.visual.as_ref().ok_or_else(invalid)?.observer.actor_id;
            core.state.temporal.release_support(
                observer,
                &held.capsule().receipt.id,
                core.state.physical.header.sim_time,
                &core.state.installed.attention.value().retention,
                None,
            )?;
        }
        Ok(())
    }
}
