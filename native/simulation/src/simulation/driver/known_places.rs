//! Hearing consumes a complete actor-owned place index synchronously. Missing
//! preparation is selected from the operation's initial accepted SQL cut before
//! its physical cursor may acquire a place or speech occurrence.
use super::*;
use crate::experience::{KnownPlaceCapsule, PreparedKnownPlaceEvidence};
use crate::host::retained_size::{HeapBytes, heap_sum};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct KnownPlacesAnswer {
    pub(super) binding: GeometryBinding,
    capsules: Vec<KnownPlaceCapsule>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}
impl KnownPlacesAnswer {
    pub(crate) fn from_rows(binding: GeometryBinding, capsules: Vec<KnownPlaceCapsule>) -> Self {
        Self {
            binding,
            capsules,
            _storage: None,
        }
    }

    pub(crate) fn retained_bytes(&self) -> Option<usize> {
        size_of::<Self>().checked_add(self.capsules.heap_bytes()?)
    }

    pub(super) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, DriveError> {
        let storage = crate::install::reserve_typed_parse::<Self>(
            text,
            size_of::<KnownPlaceCapsule>(),
            None,
            budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => DriveError::Capacity,
            _ => DriveError::MalformedResponse,
        })?;
        let mut value: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        value._storage = Some(storage);
        Ok(value)
    }
}
struct ExpectedActor {
    id: String,
    physical_life: u64,
    privacy_revision: u64,
    revision: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct KnownPlacesRequest {
    pub(crate) binding: GeometryBinding,
    pub(crate) world_id: String,
    pub(crate) generation: String,
    pub(crate) actor_id: String,
    pub(crate) physical_life: u64,
    pub(crate) privacy_revision: u64,
    pub(crate) expected_revision: u64,
    pub(crate) maximum_rows: u64,
    pub(crate) maximum_bytes: u64,
}
pub(super) struct KnownPlacesPreparation {
    actors: Vec<ExpectedActor>,
    next: usize,
    pending: Option<GeometryBinding>,
    _storage: ByteReservation,
}
impl KnownPlacesPreparation {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        budget: &ByteBudget,
        selected_actor: Option<&str>,
    ) -> Result<Option<Self>, DriveError> {
        if let Some(actor) = selected_actor {
            if core.state.experience.known_places(actor).is_ok() {
                return Ok(None);
            }
            let Some((history, life)) = core.state.experience.actor(actor).zip(
                core.state
                    .physical
                    .entities
                    .get(actor)
                    .and_then(|entity| entity.physical_life()),
            ) else {
                return Ok(None);
            };
            let storage = budget
                .reserve(size_of::<Self>() + size_of::<ExpectedActor>() + actor.len())
                .map_err(|_| DriveError::Capacity)?;
            return Ok(Some(Self {
                actors: vec![ExpectedActor {
                    id: actor.to_owned(),
                    physical_life: life,
                    privacy_revision: history.privacy.revision(),
                    revision: core.state.experience.known_place_revision(actor),
                }],
                next: 0,
                pending: None,
                _storage: storage,
            }));
        }
        let selected = || -> Result<_, DriveError> {
            Ok(core
                .state
                .experience
                .unprepared_place_actors()
                .map_err(ExecutionError::from)?
                .filter_map(move |id| {
                    core.state
                        .physical
                        .entities
                        .get(id)
                        .and_then(|entity| entity.physical_life())
                        .map(|life| (id, life))
                }))
        };
        let mut count = 0usize;
        let mut bytes = size_of::<Self>();
        for (id, _) in selected()? {
            count = count.checked_add(1).ok_or(DriveError::Capacity)?;
            bytes = heap_sum([bytes, size_of::<ExpectedActor>(), id.len()])
                .ok_or(DriveError::Capacity)?;
        }
        if count == 0 {
            return Ok(None);
        }
        let storage = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        let mut actors = Vec::new();
        actors
            .try_reserve_exact(count)
            .map_err(|_| DriveError::Capacity)?;
        for (id, life) in selected()? {
            let history = core
                .state
                .experience
                .actor(id)
                .ok_or(ExecutionError::Invariant)?;
            actors.push(ExpectedActor {
                id: id.to_owned(),
                physical_life: life,
                privacy_revision: history.privacy.revision(),
                revision: core.state.experience.known_place_revision(id),
            });
        }
        Ok(Some(Self {
            actors,
            next: 0,
            pending: None,
            _storage: storage,
        }))
    }
    pub(super) fn poll(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: &mut Option<Answer>,
        key: crate::host::CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Poll<(), ()>, DriveError> {
        if let Some(binding) = self.pending {
            let Answer::KnownPlaces(answer) = direct(answer, ProviderKind::KnownPlaces)? else {
                return Err(DriveError::StaleResponse);
            };
            let expected = self
                .actors
                .get(self.next)
                .ok_or(ExecutionError::Invariant)?;
            if answer.binding != binding
                || core
                    .state
                    .physical
                    .entities
                    .get(&expected.id)
                    .and_then(|entity| entity.physical_life())
                    != Some(expected.physical_life)
                || core
                    .state
                    .experience
                    .actor(&expected.id)
                    .is_none_or(|actor| actor.privacy.revision() != expected.privacy_revision)
                || core.state.experience.known_place_revision(&expected.id) != expected.revision
            {
                return Err(DriveError::StaleResponse);
            }
            let prepared = PreparedKnownPlaceEvidence::prepare(
                &answer.capsules,
                &core.state.installed.personal_evidence_preparation,
                budget,
            )
            .map_err(ExecutionError::from)?;
            core.journal
                .experience
                .install_known_places(
                    &mut core.state.experience,
                    &expected.id,
                    expected.revision,
                    prepared,
                )
                .map_err(ExecutionError::from)?;
            self.pending = None;
            self.next += 1;
            return Ok(Poll::Continue);
        }
        if answer.is_some() {
            return Err(DriveError::StaleResponse);
        }
        let Some(expected) = self.actors.get(self.next) else {
            return Ok(Poll::Complete(()));
        };
        let binding = GeometryBinding::new(
            key,
            core.state.geometry_revision(),
            core.journal.next_provider_serial()?,
        );
        let world_id = &core.state.physical.header.id;
        let generation = &core.state.generation;
        let limits = &core.state.installed.personal_evidence_preparation;
        let bytes = heap_sum([
            size_of::<KnownPlacesRequest>(),
            world_id.len(),
            generation.len(),
            expected.id.len(),
        ])
        .ok_or(DriveError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        let backing = ProviderQuestion::reserve_backing(budget)?;
        let question = Arc::new(ProviderQuestion {
            kind: ProviderKind::KnownPlaces,
            binding,
            body: QuestionBody::KnownPlaces(Box::new(KnownPlacesRequest {
                binding,
                world_id: world_id.clone(),
                generation: generation.clone(),
                actor_id: expected.id.clone(),
                physical_life: expected.physical_life,
                privacy_revision: expected.privacy_revision,
                expected_revision: expected.revision,
                maximum_rows: limits.rows,
                maximum_bytes: limits.bytes,
            })),
            _reservation: reservation,
            backing,
        });
        self.pending = Some(binding);
        Ok(Poll::Question(question, ()))
    }
}
