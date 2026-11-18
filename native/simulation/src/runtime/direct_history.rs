//! A Rust SQL writer retains the real funded history input independently of
//! the settled candidate. The addon continues to serialize its own handoff.

use super::{NativeWorldSession, RuntimeError, RuntimePreparedProducts, failure};
use crate::experience::{CapturedHistoryInput, HistoryOriginals, history_account_eligible_at};
use crate::host::ByteReservation;
use crate::received::{ReceivedChargeDirectory, ReceivedFrontier, TemporalReceipt};
use crate::reception::SensoryFacet;

#[derive(Clone)]
pub struct RuntimeHistory(CapturedHistoryInput);

pub struct HistoryAccount<'a> {
    pub event_id: &'a str,
    pub actor_id: &'a str,
    pub awareness_payload: Option<&'a str>,
    pub temporal: Option<HistoryTemporal<'a>>,
}

pub struct HistoryTemporal<'a> {
    pub receipt: &'a TemporalReceipt,
    pub values: &'a [SensoryFacet],
    pub bytes: u64,
}

pub struct HistoryCut<'a> {
    pub actor_id: &'a str,
    pub at: f64,
    pub max_age_seconds: f64,
    pub forgotten: &'a [String],
    pub corrected: &'a [String],
    pub frontier: Option<&'a ReceivedFrontier>,
    pub recent_present: bool,
    pub recent_directories: &'a [ReceivedChargeDirectory],
    pub recent_bytes: u64,
    pub recent_count: u64,
}

impl RuntimePreparedProducts<'_> {
    /// Retain the actual exact-cut capture with its original backing guard.
    /// Authority to publish a scoped account still belongs to its reader.
    pub fn retain_history(&self) -> RuntimeHistory {
        RuntimeHistory(self.history.clone())
    }
}

impl RuntimeHistory {
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
    pub fn cuts(&self) -> impl Iterator<Item = HistoryCut<'_>> {
        self.0.cuts().map(
            |(
                actor_id,
                at,
                max_age_seconds,
                forgotten,
                corrected,
                frontier,
                recent_present,
                recent_directories,
                recent_bytes,
                recent_count,
            )| HistoryCut {
                actor_id,
                at,
                max_age_seconds,
                forgotten,
                corrected,
                frontier,
                recent_present,
                recent_directories,
                recent_bytes,
                recent_count,
            },
        )
    }
    /// Narration belongs only to the actual captured player principal.
    pub fn has_story_principal(&self, actor: &str) -> bool {
        self.0.has_principal(actor)
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
        if through != state.accepted_cut
            || histories
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
        let storage = self.budget.reserve(bytes).map_err(failure)?;
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
}

/// Exact accepted changes needed for recall indexes. The database projection
/// may retain only its own funded outputs, never this save-journal borrow.
pub struct RuntimeRecallRead<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub through: u64,
    pub hard_bytes: u64,
    pub changes: &'a crate::records::ChangedRows,
    account_law: crate::worlds::InstalledAccountLaw<'a>,
    budget: &'a crate::host::ByteBudget,
}

impl RuntimeRecallRead<'_> {
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
        use crate::experience::{
            Awareness, ExperienceError, PersonalSourceKind, PersonalSourceRef,
            awareness_learning_sources,
        };
        let _parse = crate::install::reserve_typed_parse::<Awareness>(
            &row.payload,
            std::mem::size_of::<crate::reception::ObservationFacet>(),
            None,
            self.budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => ExperienceError::Capacity,
            _ => ExperienceError::InvalidBody("stored awareness"),
        })?;
        let body: Awareness = serde_json::from_str(&row.payload)
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
}

impl NativeWorldSession {
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
        let hard = crate::simulation::session::MemoryAllowance::capture(state).hard_bytes;
        if !hard.is_finite() || hard < 0.0 || hard > crate::identity::MAX_SAFE_INTEGER as f64 {
            return Err(failure("Invalid installed derived memory allowance"));
        }
        Ok(read(RuntimeRecallRead {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            through,
            hard_bytes: hard as u64,
            changes,
            account_law: state.installed.account_law(),
            budget: &self.budget,
        }))
    }
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
            || self.history.cuts().next().is_some()
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
