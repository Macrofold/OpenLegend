//! A Rust SQL writer retains the real funded history input independently of
//! the settled candidate. The addon continues to serialize its own handoff.

use super::{NativeWorldSession, RuntimeError, RuntimePreparedProducts, failure};
use crate::experience::{CapturedHistoryInput, HistoryOriginals, history_account_eligible_at};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::TemporalReceipt;
use crate::reception::SensoryFacet;
use crate::simulation::SimulationState;

pub use crate::experience::SensoryExpiration;

#[derive(Clone)]
pub struct RuntimeHistory(CapturedHistoryInput);

#[derive(Clone, Copy)]
pub struct HistoryAccount<'a> {
    pub event_id: &'a str,
    pub actor_id: &'a str,
    pub awareness_payload: Option<&'a str>,
    pub temporal: Option<HistoryTemporal<'a>>,
}

#[derive(Clone, Copy)]
pub struct HistoryTemporal<'a> {
    pub receipt: &'a TemporalReceipt,
    pub values: &'a [SensoryFacet],
    pub bytes: u64,
}

impl RuntimePreparedProducts<'_> {
    /// Retain the actual exact-cut capture with its original backing guard.
    /// Authority to publish a scoped account still belongs to its reader.
    pub fn retain_history(&self) -> RuntimeHistory {
        RuntimeHistory(self.history.clone())
    }

    /// Prepare the same scoped eligibility and recall inputs as an ordinary
    /// save, from the private participation candidate and its protected prefix.
    /// The callback may retain only its funded derived products through commit.
    pub fn prepare_protected_gameplay_save<T>(
        &self,
        budget: &ByteBudget,
        prepare: impl FnOnce(RuntimeHistory, Option<RuntimeHistoryCuts>, RuntimeRecallRead<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        if !matches!(
            self.operation,
            crate::simulation::CompletedOperation::Participation(_)
                | crate::simulation::CompletedOperation::ActivityLearning(_)
                | crate::simulation::CompletedOperation::Reflection(_)
        ) || !self.outcome().ok
        {
            return Err(failure(
                "protected gameplay save requires its completed candidate",
            ));
        }
        let prefix = self
            .protected_save
            .ok_or_else(|| failure("protected gameplay save requires its prefix"))?;
        let history = self.retain_history();
        let eligibility = capture_history_cuts(
            self.state,
            prefix.through_cut,
            std::slice::from_ref(&history),
            budget,
        )?;
        let recall =
            RuntimeRecallRead::new(self.state, prefix.through_cut, &prefix.changes, budget)?;
        Ok(prepare(history, eligibility, recall))
    }

    /// An occurrence can request a reply only when the intended recipient
    /// actually acquired addressed speech in this exact candidate.
    pub fn addressed_speech_source(
        &self,
        event: &str,
        recipient: &str,
        speaker: &str,
    ) -> Option<&crate::experience::PersonalSourceRef> {
        self.history
            .addressed_speech_source(event, recipient, speaker)
    }
}

impl RuntimeHistory {
    /// Exact natural deadlines whose canonical body was retired by this
    /// accepted candidate, independent of the current live history owner.
    pub fn sensory_expirations(&self) -> &[SensoryExpiration] {
        self.0.sensory_expirations()
    }
    pub fn world_id(&self) -> &str {
        self.0.world_id()
    }
    pub fn generation(&self) -> &str {
        self.0.generation()
    }
    pub fn base_cut(&self) -> u64 {
        self.0.base_cut()
    }
    pub fn originals(&self) -> HistoryOriginals<'_> {
        self.0.originals()
    }
    pub fn accounts(&self) -> impl Iterator<Item = HistoryAccount<'_>> {
        self.0.accounts().map(
            |(event_id, actor_id, awareness_payload, temporal)| HistoryAccount {
                event_id,
                actor_id,
                awareness_payload,
                temporal: temporal.map(|(receipt, values, bytes)| HistoryTemporal {
                    receipt,
                    values,
                    bytes,
                }),
            },
        )
    }
    /// Narration belongs only to the actual captured player principal.
    pub fn story_principal(&self, actor: &str) -> Option<&str> {
        self.0.story_principal(actor)
    }

    /// The event-time subject's type and selected field, without retaining its body.
    pub fn story_subject(
        &self,
        id: &str,
        field: &str,
        policy: &str,
    ) -> Option<(bool, Option<f64>)> {
        self.0.story_subject(id, field, policy)
    }

    pub fn policy(&self) -> (u64, Option<&str>) {
        self.0.policy()
    }
}

/// Current eligibility for the independently held accounts in one pending
/// prefix. Its funding stays with that prefix while SQL is in flight.
pub struct RuntimeHistoryCuts {
    world: String,
    generation: String,
    through: u64,
    accounts: Vec<(RuntimeHistory, Vec<bool>)>,
    _storage: ByteReservation,
}

impl RuntimeHistoryCuts {
    pub fn binding(&self) -> (&str, &str, u64) {
        (&self.world, &self.generation, self.through)
    }

    pub fn eligible_accounts(&self, history: &RuntimeHistory) -> Option<&[bool]> {
        if history.0.account_count() == 0 {
            return Some(&[]);
        }
        self.accounts
            .binary_search_by_key(&history.base_cut(), |(candidate, _)| candidate.base_cut())
            .ok()
            .and_then(|index| {
                let (candidate, accounts) = &self.accounts[index];
                history
                    .0
                    .same_capture(&candidate.0)
                    .then_some(accounts.as_slice())
            })
    }
}

impl NativeWorldSession {
    /// Borrow the current accepted recent directory and privacy owners under
    /// the same application turn that detaches the prefix. Keep one decision
    /// per held account, bound to its exact immutable capture, through SQL.
    pub fn capture_save_history_cuts(
        &self,
        through: u64,
        histories: &[RuntimeHistory],
    ) -> Result<Option<RuntimeHistoryCuts>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if through != state.accepted_cut {
            return Err(failure("history eligibility cut is stale"));
        }
        capture_history_cuts(state, through, histories, &self.budget)
    }
}

fn capture_history_cuts(
    state: &SimulationState,
    through: u64,
    histories: &[RuntimeHistory],
    budget: &ByteBudget,
) -> Result<Option<RuntimeHistoryCuts>, RuntimeError> {
    if histories
        .windows(2)
        .any(|pair| pair[0].base_cut() >= pair[1].base_cut())
        || histories.iter().any(|history| {
            history.world_id() != state.physical.header.id
                || history.generation() != state.generation
                || history.base_cut() >= through
        })
    {
        return Err(failure("history eligibility cut is stale"));
    }
    let needed = histories
        .iter()
        .filter(|history| history.0.account_count() != 0);
    let captures = needed.clone().count();
    if captures == 0 {
        return Ok(None);
    }
    let bytes = needed
        .clone()
        .try_fold(
            state
                .physical
                .header
                .id
                .len()
                .checked_add(state.generation.len())
                .ok_or_else(|| failure("capacity"))?,
            |bytes, history| {
                bytes
                    .checked_add(std::mem::size_of::<(RuntimeHistory, Vec<bool>)>())?
                    .checked_add(history.0.account_count())
            },
        )
        .ok_or_else(|| failure("capacity"))?;
    let storage = budget.reserve(bytes).map_err(failure)?;
    let accounts = needed
        .map(|history| {
            (
                history.clone(),
                history
                    .accounts()
                    .map(|account| {
                        history_account_eligible_at(
                            state,
                            account.actor_id,
                            account.event_id,
                            account.temporal.map(|temporal| temporal.receipt),
                        )
                    })
                    .collect(),
            )
        })
        .collect();
    Ok(Some(RuntimeHistoryCuts {
        world: state.physical.header.id.clone(),
        generation: state.generation.clone(),
        through,
        accounts,
        _storage: storage,
    }))
}

/// Exact accepted changes needed for recall indexes. The database projection
/// may retain only its own funded outputs, never this save-journal borrow.
pub struct RuntimeRecallRead<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub through: u64,
    pub hard_bytes: u64,
    pub changes: &'a crate::records::ChangedRows,
    decoder: RuntimeRecallDecoder<'a>,
}

/// The actual installed account law used by the bounded storage projection.
/// It decodes one selected canonical body under independent temporary custody.
pub struct RuntimeRecallDecoder<'a> {
    pub hard_bytes: u64,
    account_law: crate::worlds::InstalledAccountLaw<'a>,
    budget: &'a crate::host::ByteBudget,
}

impl RuntimeRecallRead<'_> {
    fn new<'a>(
        state: &'a SimulationState,
        through: u64,
        changes: &'a crate::records::ChangedRows,
        budget: &'a ByteBudget,
    ) -> Result<RuntimeRecallRead<'a>, RuntimeError> {
        let decoder = RuntimeRecallDecoder::for_state(state, budget)?;
        Ok(RuntimeRecallRead {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            through,
            hard_bytes: decoder.hard_bytes,
            changes,
            decoder,
        })
    }
    /// Decode one accepted awareness body under its own parser and builder
    /// custody. Reuse the world's actual identity-support placement law.
    pub fn with_awareness<T>(
        &self,
        row: &crate::records::ChangedRow,
        revision: &str,
        read: impl FnOnce(
            &crate::experience::Awareness,
            &[crate::experience::PersonalLearningSource],
            Option<&crate::experience::KnownPlaceCapsule>,
        ) -> T,
    ) -> Result<T, crate::experience::ExperienceError> {
        self.decoder.with_awareness(&row.payload, revision, read)
    }
}

impl RuntimeRecallDecoder<'_> {
    pub(super) fn for_state<'a>(
        state: &'a crate::simulation::SimulationState,
        budget: &'a crate::host::ByteBudget,
    ) -> Result<RuntimeRecallDecoder<'a>, RuntimeError> {
        Ok(RuntimeRecallDecoder {
            hard_bytes: derived_hard_bytes(state)?,
            account_law: state.installed.account_law(),
            budget,
        })
    }

    pub fn with_awareness<T>(
        &self,
        payload: &str,
        revision: &str,
        read: impl FnOnce(
            &crate::experience::Awareness,
            &[crate::experience::PersonalLearningSource],
            Option<&crate::experience::KnownPlaceCapsule>,
        ) -> T,
    ) -> Result<T, crate::experience::ExperienceError> {
        use crate::experience::{
            Awareness, ExperienceError, PersonalSourceKind, PersonalSourceRef,
            awareness_learning_sources,
        };
        let _parse = crate::install::reserve_typed_parse::<Awareness>(
            payload,
            std::mem::size_of::<crate::reception::ObservationFacet>(),
            None,
            self.budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => ExperienceError::Capacity,
            _ => ExperienceError::InvalidBody("stored awareness"),
        })?;
        let body: Awareness = serde_json::from_str(payload)
            .map_err(|_| ExperienceError::InvalidBody("stored awareness"))?;
        let learning = awareness_learning_sources(&body, &self.account_law)
            .map_err(|_| ExperienceError::InvalidBody("stored awareness learning"))?;
        let place = if matches!(
            body.exposure,
            Some(crate::reception::EncounterExposure::Place { .. })
        ) {
            let reference = PersonalSourceRef {
                kind: PersonalSourceKind::Awareness,
                id: body.event_id.clone(),
                revision: revision.to_owned(),
            };
            Some(
                crate::experience::places::known_place_capsule(&body, Some(reference))?
                    .ok_or(ExperienceError::InvalidBody("acquired place awareness"))?,
            )
        } else {
            None
        };
        Ok(read(&body, &learning, place.as_ref()))
    }

    /// Reuse the selected world's recognition and retained-place interpretation
    /// for ordinary canonical memory and summary observations. The application
    /// must hold its exact source row and any returned placement independently.
    pub fn with_retained_observations<'a, T>(
        &self,
        observations: &[&'a crate::reception::ObservationContribution],
        recognition: &[String],
        owner: &crate::experience::PersonalSourceRef,
        read: impl FnOnce(
            &[crate::experience::PersonalLearningSource],
            &[crate::experience::KnownPlaceCapsule],
        ) -> T,
    ) -> Result<T, crate::experience::ExperienceError> {
        use crate::experience::{ExperienceError, account_learning_sources};
        use crate::reception::{EncounterExposure, ObservationOrigin, SensoryFacet};
        let learning =
            account_learning_sources(&self.account_law, recognition, observations.iter().copied())
                .map_err(|_| ExperienceError::InvalidBody("stored account learning"))?;
        let mut places = indexmap::IndexMap::new();
        for observation in observations {
            let ObservationOrigin::Occurrence { event_id, .. } = &observation.origin else {
                continue;
            };
            for field in &observation.facets {
                let SensoryFacet::EncounterExposure {
                    exposure: exposure @ EncounterExposure::Place { .. },
                } = &field.value
                else {
                    continue;
                };
                let place = crate::experience::places::place_capsule(
                    observation,
                    exposure,
                    event_id,
                    Some(owner.clone()),
                )?
                .ok_or(ExperienceError::InvalidBody("retained place observation"))?;
                let key = (
                    observation.observer.actor_id.as_str(),
                    observation.observer.physical_life,
                    observation.id.as_str(),
                    observation.revision,
                    place.facet_ordinal,
                );
                places.insert(key, place);
            }
        }
        Ok(read(&learning, &places.into_values().collect::<Vec<_>>()))
    }

    /// The finite saved manifest uses the same native observation dependency
    /// visitor as its accepted canonical metadata. Only its selected rows may
    /// become exact dependency placements in the stopped SQL writer.
    pub fn with_manifest_dependencies<T>(
        &self,
        observations: &str,
        read: impl FnOnce(Vec<(crate::reception::EvidenceSource, Option<u64>, Vec<String>)>) -> T,
    ) -> Result<T, crate::experience::ExperienceError> {
        use crate::experience::{ExperienceError, manifest_dependencies};
        let _storage = self
            .budget
            .reserve(
                crate::records::SqlCell::json_decode_bound(observations)
                    .and_then(|bytes| bytes.checked_mul(2))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        let values = serde_json::from_str::<Vec<serde_json::Value>>(observations)
            .map_err(|_| ExperienceError::InvalidBody("stored manifest observations"))?;
        let values = values.iter().collect::<Vec<_>>();
        let links = manifest_dependencies::observation_dependencies(&values)?
            .into_iter()
            .map(|row| {
                let source = serde_json::from_value(row.source)
                    .map_err(|_| ExperienceError::InvalidBody("stored manifest dependency"))?;
                Ok((source, row.ordinal, row.aliases))
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(read(links))
    }
}

impl NativeWorldSession {
    /// The background index reads this selected world allowance from the
    /// accepted installation without preparing any gameplay database cut.
    pub fn recall_hard_bytes(&self) -> Result<u64, RuntimeError> {
        self.require_active()?;
        derived_hard_bytes(&self.session.accepted().map_err(failure)?.state)
    }

    /// Borrow before detachment in the same accepted application turn. The
    /// detached writer later checks the selected record bodies and save cut.
    pub fn with_ordinary_recall<T>(
        &self,
        through: u64,
        read: impl FnOnce(RuntimeRecallRead<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let (state, changes) = self
            .session
            .ordinary_recall_rows(through)
            .map_err(failure)?;
        Ok(read(RuntimeRecallRead::new(
            state,
            through,
            changes,
            &self.budget,
        )?))
    }

    /// Lend the verified installation law to its stopped checkpoint writer.
    /// The product grants no access to bodies: each row comes from its exact
    /// private PostgreSQL snapshot and has a separate reader reservation.
    pub fn checkpoint_recall_decoder(&self) -> Result<RuntimeRecallDecoder<'_>, RuntimeError> {
        if self.active || !self.restore_installation {
            return Err(failure(
                "recall preparation requires its stopped checkpoint",
            ));
        }
        let state = self
            .session
            .restore_projection_state(self.restoring)
            .map_err(failure)?;
        RuntimeRecallDecoder::for_state(state, &self.budget)
    }

    /// Lend the installed law to the first publication transaction. The
    /// caller reads each canonical account from its own staged SQL rows.
    pub fn opening_recall_decoder(&self) -> Result<RuntimeRecallDecoder<'_>, RuntimeError> {
        if self.active || self.restore_installation {
            return Err(failure(
                "recall preparation requires an unpublished opening",
            ));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        if state.durable_revision != 1
            || state.accepted_cut != 0
            || state.physical.header.sim_time != 0.0
            || !state.physical.header.paused
        {
            return Err(failure(
                "recall preparation requires the first paused revision",
            ));
        }
        RuntimeRecallDecoder::for_state(state, &self.budget)
    }
}

fn derived_hard_bytes(state: &crate::simulation::SimulationState) -> Result<u64, RuntimeError> {
    let hard = crate::simulation::session::MemoryAllowance::capture(state).hard_bytes;
    if !hard.is_finite() || hard < 0.0 || hard > crate::identity::MAX_SAFE_INTEGER as f64 {
        return Err(failure("Invalid installed derived memory allowance"));
    }
    Ok(hard as u64)
}

/// Startup or host control can certify a metadata-only transaction. The SQL
/// writer independently validates the detached prefix against this exact cut.
pub struct RuntimeMetadataPersistence(RuntimeHistory);

impl RuntimeMetadataPersistence {
    pub fn binding(&self) -> (&str, &str, u64) {
        (
            self.0.world_id(),
            self.0.generation(),
            self.0.base_cut() + 1,
        )
    }
}

impl RuntimePreparedProducts<'_> {
    pub fn metadata_startup(&self) -> Result<RuntimeMetadataPersistence, super::RuntimeError> {
        if !matches!(self.operation, super::CompletedOperation::Startup(_))
            || self.protected_save.is_some()
        {
            return Err(super::failure("not a startup metadata candidate"));
        }
        self.metadata_persistence()
    }

    pub fn metadata_control(&self) -> Result<RuntimeMetadataPersistence, super::RuntimeError> {
        if !matches!(self.operation, super::CompletedOperation::HostControl(_))
            || self
                .protected_save
                .is_none_or(|save| !metadata_rows(&save.changes))
        {
            return Err(super::failure("not a protected control metadata candidate"));
        }
        self.metadata_persistence()
    }

    fn metadata_persistence(&self) -> Result<RuntimeMetadataPersistence, super::RuntimeError> {
        if self.restore.is_some()
            || !self.source_versions.is_empty()
            || self.events().next().is_some()
            || self.history.originals().next().is_some()
            || self.history.accounts().next().is_some()
            || self.history.needs_actor_projection()
            || !metadata_rows(self.records)
        {
            return Err(super::failure("candidate requires a derived projection"));
        }
        Ok(RuntimeMetadataPersistence(self.retain_history()))
    }
}

pub fn metadata_rows(rows: &crate::records::ChangedRows) -> bool {
    rows.deletes.is_empty()
        && rows.expired.is_empty()
        && rows
            .writes
            .keys()
            .all(|name| matches!(name.as_str(), "data_world" | "world_settings"))
}
