use super::*;
use crate::cognition::{
    ActorMind, InnerKind, InnerRecord, InnerSource, InnerStatus, InnerWorld, MindDocument,
};
use crate::host::retained_size::map_storage;
use crate::reception::ObserverSubject;
use crate::text::JsText;

/// Keep enlarged shared maps funded even if the other map or the candidate later fails.
fn reserve_entry<V>(
    map: &mut indexmap::IndexMap<String, V>,
    backing: &mut crate::host::ResidentReservation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if map.len() < map.capacity() {
        return Ok(());
    }
    let occupied = map_storage::<String, V>(map.capacity()).ok_or(ExecutionError::Capacity)?;
    let other = backing
        .bytes()
        .checked_sub(occupied)
        .ok_or(ExecutionError::Invariant)?;
    let limit = map
        .len()
        .checked_add(1)
        .and_then(usize::checked_next_power_of_two)
        .and_then(|n| n.checked_mul(2))
        .ok_or(ExecutionError::Capacity)?
        .max(4);
    let bytes = |capacity| {
        map_storage::<String, V>(capacity)
            .and_then(|n| n.checked_add(other))
            .ok_or(ExecutionError::Capacity)
    };
    budget.resize_backing(backing, bytes(limit)?)?;
    let reserved = map.try_reserve(1);
    backing.resize(bytes(map.capacity())?)?;
    reserved.map_err(|_| ExecutionError::Capacity)
}

impl CognitionJournal {
    /// Install the new person's own protected biography and empty history.
    /// No existing person's private state supplies any part of this record.
    pub(crate) fn create_person(
        &mut self,
        state: &mut MindState,
        actor: &str,
        identity: JsText,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let minds = state
            .minds
            .as_mut()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let inner = state
            .inner_worlds
            .as_mut()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        if minds.contains_key(actor) || inner.contains_key(actor) {
            return Err(ExecutionError::Invariant);
        }
        let mut text = JsText::from("My beginnings\n\n");
        text.push_text(&identity);
        let document = MindDocument::published(
            "identity".into(),
            "My beginnings".into(),
            text,
            1,
            true,
            Vec::new(),
        );
        let mut mind = ActorMind {
            documents: vec![document],
            records: vec![InnerRecord {
                id: "identity".into(),
                revision: 1,
                document_id: "identity".into(),
                kind: InnerKind::Identity,
                subject_id: Some(ObserverSubject::Entity {
                    entity_id: actor.into(),
                }),
                source: InnerSource::Authored,
                confidence: 1.0,
                trust: None,
                status: InnerStatus::Active,
                evidence: Vec::new(),
            }],
            revision: 0,
            thoughts: Vec::new(),
            last_reflection_at: -86400.0,
            last_dream_episode: None,
            sensitivities: None,
            contents_storage: None,
            metadata_storage: None,
        };
        let mut world = InnerWorld {
            revision: 0,
            source_snapshot: "actor-initialization".into(),
            publication_job_id: "actor-initialization".into(),
            publication_body: None,
            evidence_ids: Vec::new(),
            reconsideration_required: None,
            contents_storage: None,
            metadata_storage: None,
        };
        let mind_contents = crate::cognition::retained_size::mind_contents_bytes(&mind)
            .ok_or(ExecutionError::Capacity)?;
        let world_contents = crate::cognition::retained_size::inner_contents_bytes(&world)
            .ok_or(ExecutionError::Capacity)?;
        mind.metadata_storage =
            Some(budget.reserve_record(
                mind.heap_bytes().ok_or(ExecutionError::Capacity)? - mind_contents,
            )?);
        mind.contents_storage = Some(budget.reserve_record(mind_contents)?);
        world.metadata_storage = Some(budget.reserve_record(
            world.heap_bytes().ok_or(ExecutionError::Capacity)? - world_contents,
        )?);
        world.contents_storage = Some(budget.reserve_record(world_contents)?);
        let key_bytes = actor.len() * 2;
        self.reserve(1, actor.len())?;
        reserve_entry(minds, &mut state._storage, budget)?;
        reserve_entry(inner, &mut state._storage, budget)?;
        budget.fund_backing(&mut state._storage, budget.reserve(key_bytes)?)?;
        minds.insert(actor.into(), mind);
        inner.insert(actor.into(), world);
        self.undo.push(Undo::NewPerson {
            actor: actor.into(),
            key_bytes,
        });
        Ok(())
    }
}
