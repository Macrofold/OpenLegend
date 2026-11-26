//! Required notes come from the same accepted subject selection as the NPC's
//! decision. The read keeps only the selected text and exact note revisions.
use super::{
    CandidateKey, NativeWorldSession, RuntimeError, RuntimeNpcPreparationStep, RuntimeNpcRead,
    RuntimeProvider, RuntimeProviderInput, failure,
};
use crate::{
    execution::ExecutionError,
    host::{
        ByteBudget, ByteReservation,
        retained_size::{HeapBytes, map_storage},
    },
    reception::{KnowledgeOrigin, KnowledgeSubject, ObserverSubject},
    simulation::SimulationState,
    text::JsText,
    worlds::InstalledPersonalNameReader,
};
use std::{collections::HashSet, mem::size_of};

pub struct RuntimeNpcSubjectNote<'a> {
    pub ordinal: usize,
    pub recognized_entity: Option<&'a str>,
    pub label: &'a JsText,
    pub text: &'a JsText,
    pub revision: u64,
    pub origin: KnowledgeOrigin,
    pub maximum: u64,
}

struct OwnedNote {
    ordinal: usize,
    subject: KnowledgeSubject,
    text: JsText,
    revision: u64,
    origin: KnowledgeOrigin,
}

pub(super) struct RequiredNotes {
    notes: Vec<OwnedNote>,
    maximum: u64,
    stage_knowledge_revision: Option<u64>,
    _custody: ByteReservation,
}

impl NativeWorldSession {
    /// Acquire the required notes before leaving the original world turn.
    /// Untargeted readers of the same presentation do not copy note bodies.
    pub fn step_npc_context_with_notes(
        &mut self,
        read: &mut RuntimeNpcRead,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    ) -> Result<RuntimeNpcPreparationStep, RuntimeError> {
        let step = self.step_npc_preparation(read, key, answer)?;
        if matches!(step, RuntimeNpcPreparationStep::Complete) {
            let state = &self.session.accepted().map_err(failure)?.state;
            read.required_notes = read.capture_required_notes(state, &self.budget)?;
        }
        Ok(step)
    }
}

impl RuntimeNpcRead {
    pub fn required_notes(&self) -> impl Iterator<Item = RuntimeNpcSubjectNote<'_>> {
        self.required_notes.iter().flat_map(|selected| {
            selected.notes.iter().map(|note| RuntimeNpcSubjectNote {
                ordinal: note.ordinal,
                recognized_entity: match &note.subject {
                    KnowledgeSubject::Entity { entity_id } => Some(entity_id.as_str()),
                    _ => None,
                },
                label: self.reference_facts.knowledge[note.ordinal].label(),
                text: &note.text,
                revision: note.revision,
                origin: note.origin,
                maximum: selected.maximum,
            })
        })
    }

    fn capture_required_notes(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<Option<Box<RequiredNotes>>, RuntimeError> {
        let known = &self.reference_facts.knowledge;
        if known.is_empty() {
            return Ok(None);
        }
        let involved = self.selected_body_ordinals()?.iter().flat_map(|&ordinal| {
            let body = &self.reference_facts.bodies[ordinal];
            body.subjects
                .iter()
                .filter(|fact| matches!(fact.subject, ObserverSubject::Individual { .. }))
                .chain(body.entity.current_communication.then_some(&body.entity))
                .filter(|fact| fact.has_notepad_text())
                .map(|fact| &fact.subject)
        });
        let count = involved.clone().count();
        if count == 0 {
            return Ok(None);
        }
        let _selection = budget.reserve(
            map_storage::<&ObserverSubject, ()>(count).ok_or(crate::host::CapacityError)?,
        )?;
        let mut selected = HashSet::new();
        selected
            .try_reserve(count)
            .map_err(|_| crate::host::CapacityError)?;
        selected.extend(involved);
        let bytes = selected
            .len()
            .checked_mul(size_of::<OwnedNote>())
            .and_then(|bytes| bytes.checked_add(size_of::<RequiredNotes>()))
            .ok_or(crate::host::CapacityError)?;
        let mut custody = budget.reserve(bytes)?;
        let mut notes = Vec::new();
        notes
            .try_reserve_exact(selected.len())
            .map_err(|_| crate::host::CapacityError)?;
        let actor = &self.read.perception.actor_id;
        let maximum = state
            .installed
            .retained
            .knowledge_limits
            .as_ref()
            .ok_or_else(|| failure("NPC note policy is unavailable"))?
            .max_characters
            .subject;
        for (ordinal, fact) in known
            .iter()
            .enumerate()
            .filter(|(_, fact)| selected.contains(&fact.subject))
        {
            let subject_bytes = fact
                .subject
                .heap_bytes()
                .ok_or(crate::host::CapacityError)?;
            let _lookup = budget.reserve(
                subject_bytes
                    .checked_mul(8)
                    .and_then(|n| n.checked_add(256))
                    .ok_or(crate::host::CapacityError)?,
            )?;
            let subject = fact.knowledge_subject();
            let note = state
                .reception
                .actor_knowledge
                .get(actor, Some(&subject))
                .map_err(failure)?
                .filter(|note| !note.text.is_empty())
                .ok_or_else(|| failure("Required NPC note changed during preparation"))?;
            custody.resize(
                custody
                    .bytes()
                    .checked_add(subject_bytes)
                    .and_then(|n| n.checked_add(note.text.storage_bytes()))
                    .ok_or(crate::host::CapacityError)?,
            )?;
            notes.push(OwnedNote {
                ordinal,
                subject,
                text: note.text.clone(),
                revision: note.revision,
                origin: note.origin,
            });
        }
        Ok(Some(Box::new(RequiredNotes {
            notes,
            maximum,
            stage_knowledge_revision: self.historical_scope.stage_capture
                .then(|| state.reception.knowledge_revision(actor)),
            _custody: custody,
        })))
    }

    pub(super) fn stage_notes_match(&self, knowledge_revision: u64) -> bool {
        self.required_notes.as_ref().is_none_or(|selection| {
            selection.stage_knowledge_revision == Some(knowledge_revision)
        })
    }

    /// A held call cares about the notes it actually disclosed. This check
    /// neither compares a whole knowledge revision nor repeats scene capture.
    pub(super) fn required_notes_current(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(selected) = &self.required_notes else {
            return Ok(true);
        };
        let actor = &self.read.perception.actor_id;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        for note in &selected.notes {
            let _lookup = budget.reserve(
                note.subject
                    .heap_bytes()
                    .and_then(|n| n.checked_mul(8))
                    .and_then(|n| n.checked_add(256))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let current = state
                .reception
                .actor_knowledge
                .get(actor, Some(&note.subject))?;
            if !current.is_some_and(|current| current.revision == note.revision)
                || !self.reference_facts.knowledge[note.ordinal].note_name_current(&names)
            {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
