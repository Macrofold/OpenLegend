//! One native-owned maintenance batch survives model work. SQL answers the
//! existing scoped Sources questions; it never supplies interpretation grants.
use super::*;
use crate::capture::maintenance::{
    MaintenanceAdmission, MaintenanceCapture, MaintenanceInterpretation, MaintenancePresentation,
    MaintenancePurpose,
};
use crate::capture::{NpcHistoricalScope, NpcSourceSelection, PreparedNpcSources};
pub use crate::experience::consolidation::ConsolidationGroup as RuntimeConsolidationGroup;
use crate::experience::consolidation::ConsolidationLimits;
use crate::host::retained_size::HeapBytes;
use std::mem::size_of;
mod dream;
pub use dream::RuntimeConsolidationDream;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeConsolidationBinding {
    pub job_id: String,
    pub selection: NpcSourceSelection,
    pub protected_importance: f64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub summary_bytes: u64,
    pub requires_body: bool,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub dream_episode: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Groups {
    groups: Vec<RuntimeConsolidationGroup>,
}
pub struct RuntimeConsolidationTicket {
    pub(super) job: String,
    pub(super) body: Arc<MaintenanceCapture>,
    pub(super) inner_revision: Option<u64>,
    pub(super) admission: MaintenanceAdmission,
    pub(super) scope: Arc<NpcHistoricalScope>,
    selection: NpcSourceSelection,
    limits: ConsolidationLimits,
    presentation: MaintenancePresentation,
    files: String,
    _files: ByteReservation,
    sources: Option<PreparedNpcSources>,
    interpretation: Option<Arc<MaintenanceInterpretation>>,
    candidate: Option<CandidateKey>,
    _storage: ByteReservation,
}
impl NativeWorldSession {
    pub fn bind_consolidation(
        &mut self,
        body: &RuntimeMaintenanceRead,
        input: &[u8],
    ) -> Result<RuntimeConsolidationTicket, RuntimeError> {
        let _decode = decode_preparation(input, &self.budget)?;
        let input = serde_json::from_slice(input).map_err(failure)?;
        self.bind_consolidation_direct(body, input)
    }

    /// Binds an owned, actor-scoped selection to the live native maintenance read.
    /// The ticket admits its own custody and checks the exact sources again when applied.
    pub fn bind_consolidation_direct(
        &mut self,
        body: &RuntimeMaintenanceRead,
        mut input: RuntimeConsolidationBinding,
    ) -> Result<RuntimeConsolidationTicket, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if !crate::values::is_safe_record_id(&input.job_id)
            || !body.read.scope_current(state)
            || !input.selection.receipts.is_empty()
            || input.selection.personal.is_empty()
            || input.selection.personal.iter().any(|s| s.through.is_some())
            || input.selection.consolidation_job.is_some()
            || !input.protected_importance.is_finite()
            || !(0.0..=10.0).contains(&input.protected_importance)
            || input.summary_bytes == 0
        {
            return Err(failure("invalid consolidation source preparation"));
        }
        let actor = &body.read.request.actor_id;
        let admission = MaintenanceAdmission {
            purpose: MaintenancePurpose::Maintenance,
            requires_body: input.requires_body || input.dream_episode.is_some(),
            dream_episode: input.dream_episode,
        };
        if !body.read.current(state, &admission).map_err(failure)? {
            return Err(failure("maintenance body admission changed"));
        }
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let bytes = size_of::<RuntimeConsolidationTicket>()
            .checked_add(input.job_id.capacity() * 2)
            .and_then(|n| {
                n.checked_add(
                    input
                        .selection
                        .personal
                        .capacity()
                        .checked_mul(size_of::<crate::capture::NpcPersonalSelection>())?,
                )
            })
            .and_then(|n| {
                n.checked_add(
                    input
                        .selection
                        .personal
                        .iter()
                        .try_fold(0usize, |n, s| n.checked_add(s.reference.heap_bytes()?))?,
                )
            })
            .and_then(|n| {
                n.checked_add(admission.dream_episode.as_ref().map_or(0, String::capacity))
            })
            .ok_or_else(|| failure("capacity"))?;
        let storage = self.budget.reserve(bytes).map_err(failure)?;
        let inner_revision = state
            .minds
            .inner_worlds
            .as_ref()
            .and_then(|m| m.get(actor))
            .map(|inner| inner.revision);
        let (files, files_storage) = if admission.dream_episode.is_some() {
            body.read.files(state, &self.budget).map_err(failure)?
        } else {
            let storage = self.budget.reserve(2).map_err(failure)?;
            ("[]".to_owned(), storage)
        };
        let presentation =
            MaintenancePresentation::capture(state, actor, &self.budget).map_err(failure)?;
        let scope = NpcHistoricalScope::capture_personal(state, actor, serial, &self.budget)
            .map_err(failure)?;
        input.selection.consolidation_job = Some(input.job_id.clone());
        self.next_read_serial = serial;
        Ok(RuntimeConsolidationTicket {
            job: input.job_id,
            body: Arc::clone(&body.read),
            inner_revision,
            admission,
            scope: Arc::new(scope),
            selection: input.selection,
            limits: ConsolidationLimits {
                protected_importance: input.protected_importance,
                summary_bytes: input.summary_bytes,
            },
            presentation,
            files,
            _files: files_storage,
            sources: None,
            interpretation: None,
            candidate: None,
            _storage: storage,
        })
    }
    pub fn consolidation_sources(
        &mut self,
        ticket: &mut RuntimeConsolidationTicket,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if ticket.candidate.is_some() || ticket.sources.is_some() {
            return Err(failure("consolidation sources are already being prepared"));
        }
        let (_selection, selection) = ticket.copy_selection(&self.budget)?;
        let key = self
            .session
            .begin_npc_sources(Arc::clone(&ticket.scope), selection)
            .map_err(failure)?;
        ticket.candidate = Some(key);
        Ok(key)
    }
    pub fn step_consolidation_sources(
        &mut self,
        ticket: &mut RuntimeConsolidationTicket,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    ) -> Result<RuntimeNpcPreparationStep, RuntimeError> {
        if ticket.candidate != Some(key) || !self.session.is_npc_sources(key) {
            return Err(failure("consolidation source preparation is stale"));
        }
        let answer = provider_response(answer, &self.budget)?;
        let result = self.session.step(
            key,
            answer,
            crate::experience::HistorySettings {
                policy_id: &self.history_policy_id,
                policy_revision: self.history_policy_revision,
            },
        );
        let step = match result {
            Ok(step) => step,
            Err(e) => {
                if !self.session.is_npc_sources(key) {
                    ticket.candidate = None;
                }
                return Err(failure(e));
            }
        };
        Ok(match step {
            SessionStep::Continue => RuntimeNpcPreparationStep::Continue,
            SessionStep::Question(question) => match self.prepare_provider(key, question) {
                Ok(provider) => RuntimeNpcPreparationStep::Provider(provider),
                Err(error) => {
                    ticket.candidate = None;
                    return Err(error);
                }
            },
            SessionStep::NpcSources(sources) => {
                ticket.candidate = None;
                ticket.sources = Some(sources);
                RuntimeNpcPreparationStep::Complete
            }
            _ => return Err(failure("consolidation source preparation produced effects")),
        })
    }
    pub fn cancel_consolidation_sources(
        &mut self,
        ticket: &mut RuntimeConsolidationTicket,
    ) -> Result<(), RuntimeError> {
        if let Some(key) = ticket.candidate.take() {
            if self.session.is_npc_sources(key) {
                self.session.cancel(key).map_err(failure)?;
            }
        }
        Ok(())
    }
    pub fn consolidation_current(
        &self,
        ticket: &RuntimeConsolidationTicket,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.publication_read().map_err(failure)?.state;
        Ok(ticket.scope.still_permitted(state)
            && ticket
                .body
                .current(state, &ticket.admission)
                .map_err(failure)?)
    }
    pub fn consolidation_publication(
        &self,
        ticket: &RuntimeConsolidationTicket,
    ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError> {
        self.session.accepted().map_err(failure)?;
        if !self.consolidation_current(ticket)? {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(size_of::<RuntimeMaintenancePublication>())
            .map_err(failure)?;
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeMaintenancePublication {
            _lease: lease,
            fence,
            _storage: storage,
        }))
    }
    pub fn consolidation_interpretation(
        &self,
        ticket: &mut RuntimeConsolidationTicket,
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if !ticket.scope.still_permitted(state) || ticket.sources.is_none() {
            return Err(failure("consolidation source preparation is unavailable"));
        }
        if ticket.interpretation.is_none() {
            ticket.interpretation = Some(Arc::new(
                MaintenanceInterpretation::capture(state, &ticket.scope.actor_id, &self.budget)
                    .map_err(failure)?,
            ));
        }
        RuntimeJson::encode(
            ticket
                .interpretation
                .as_ref()
                .ok_or_else(|| failure("interpretation scope unavailable"))?,
            &self.budget,
        )
    }
    pub fn begin_consolidation(
        &mut self,
        owner: &mut Option<RuntimeConsolidationTicket>,
        input: &[u8],
        dream: Option<&RuntimeConsolidationDream>,
        interpretation: Option<&[u8]>,
    ) -> Result<CandidateKey, RuntimeError> {
        let _decode = decode_preparation(input, &self.budget)?;
        let input: Groups = serde_json::from_slice(input).map_err(failure)?;
        let dream = match (dream, interpretation) {
            (None, None) => None,
            (Some(dream), Some(raw)) => Some((dream, raw)),
            _ => {
                return Err(failure(
                    "dream publication requires its native binding and raw interpretation",
                ));
            }
        };
        self.begin_consolidation_owned(owner, input.groups, dream, false)
    }

    /// Starts a whole protected consolidation from caller-funded groups.
    /// SQL publication and acceptance must settle together for this candidate.
    pub fn begin_consolidation_direct(
        &mut self,
        owner: &mut Option<RuntimeConsolidationTicket>,
        groups: Vec<RuntimeConsolidationGroup>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.begin_consolidation_owned(owner, groups, None, true)
    }

    fn begin_consolidation_owned(
        &mut self,
        owner: &mut Option<RuntimeConsolidationTicket>,
        groups: Vec<RuntimeConsolidationGroup>,
        dream: Option<(&RuntimeConsolidationDream, &[u8])>,
        protected: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let ticket = owner
            .as_ref()
            .ok_or_else(|| failure("consolidation was released"))?;
        if !(ticket.sources_ready() || protected && ticket.duplicate())
            || ticket.candidate.is_some()
            || !self.consolidation_current(ticket)?
        {
            return Err(failure("consolidation source preparation changed"));
        }
        let (_selection, selection) = ticket.copy_selection(&self.budget)?;
        let storage = self
            .budget
            .reserve(
                groups
                    .heap_bytes()
                    .and_then(|n| n.checked_add(ticket.job.len()))
                    .and_then(|n| {
                        n.checked_add(
                            ticket
                                .admission
                                .dream_episode
                                .as_ref()
                                .map_or(0, String::capacity),
                        )
                    })
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let dream = dream
            .map(|(dream, raw)| dream.prepare(ticket, raw, &self.budget))
            .transpose()?;
        let candidate = self
            .session
            .begin_consolidation(crate::cognition::consolidation::ConsolidationInput {
                job: ticket.job.clone(),
                body: Arc::clone(&ticket.body),
                admission: MaintenanceAdmission {
                    purpose: MaintenancePurpose::Maintenance,
                    requires_body: ticket.admission.requires_body
                        || protected && !ticket.duplicate() && ticket.has_routine(),
                    dream_episode: ticket.admission.dream_episode.clone(),
                },
                scope: Arc::clone(&ticket.scope),
                selection,
                groups,
                limits: ticket.limits,
                source_count: ticket.sources.as_ref().map_or(0, |s| s.personal.len()),
                source_bytes: ticket
                    .sources
                    .as_ref()
                    .ok_or_else(|| failure("consolidation sources are unavailable"))?
                    .personal
                    .iter()
                    .try_fold(0_u64, |n, s| n.checked_add(s.record.payload().len() as u64))
                    .ok_or_else(|| failure("capacity"))?,
                storage,
                dream,
                protected,
            })
            .map_err(failure)?;
        *owner = None;
        Ok(candidate)
    }
}
impl RuntimeConsolidationTicket {
    pub fn actor_id(&self) -> &str {
        &self.scope.actor_id
    }

    /// Return exact singleton readings for a protected-only or previously
    /// committed selection. Routine sources require the admitted inference path.
    pub fn protected_groups(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<(Vec<RuntimeConsolidationGroup>, ByteReservation)>, RuntimeError> {
        if !budget.owns(&self._storage) {
            return Err(failure("consolidation source preparation changed"));
        }
        if self.duplicate() {
            return Ok(Some((Vec::new(), budget.reserve(0).map_err(failure)?)));
        }
        if !self.sources_ready() {
            return Err(failure("consolidation source preparation changed"));
        }
        let sources = self
            .sources
            .as_ref()
            .ok_or_else(|| failure("missing consolidation sources"))?;
        if self.has_routine() {
            return Ok(None);
        }
        let bytes = sources
            .personal
            .iter()
            .try_fold(0usize, |n, source| {
                let id = &source.record.header().reference.id;
                n.checked_add(size_of::<RuntimeConsolidationGroup>() + size_of::<String>() + 32)?
                    .checked_add(id.len().checked_mul(6)?)
            })
            .ok_or_else(|| failure("capacity"))?;
        let mut storage = budget.reserve(bytes).map_err(failure)?;
        let mut groups = Vec::with_capacity(sources.personal.len());
        for source in &sources.personal {
            let record = source
                .current_record()
                .ok_or_else(|| failure("source has moved"))?;
            use crate::experience::consolidation::{consolidation_key, consolidation_reading};
            let key = consolidation_key(&record.header().reference).map_err(failure)?;
            let (text, text_storage) = consolidation_reading(record, budget).map_err(failure)?;
            storage.merge(text_storage).map_err(failure)?;
            groups.push(RuntimeConsolidationGroup {
                source_keys: vec![key],
                text,
            });
        }
        Ok(Some((groups, storage)))
    }

    fn copy_selection(
        &self,
        budget: &ByteBudget,
    ) -> Result<(ByteReservation, NpcSourceSelection), RuntimeError> {
        // This ticket admits only a personal selection without receipt or parent
        // lookups. Custody for the new cursor is acquired while the copy is funded.
        let capacity = self
            .selection
            .personal
            .len()
            .checked_mul(size_of::<crate::capture::NpcPersonalSelection>())
            .and_then(|n| n.checked_add(self.job.len()))
            .and_then(|base| {
                self.selection
                    .personal
                    .iter()
                    .try_fold(base, |n, item| n.checked_add(item.reference.heap_bytes()?))
            })
            .ok_or_else(|| failure("capacity"))?;
        let storage = budget.reserve(capacity).map_err(failure)?;
        Ok((
            storage,
            NpcSourceSelection {
                receipts: Vec::new(),
                personal: self
                    .selection
                    .personal
                    .iter()
                    .map(|item| crate::capture::NpcPersonalSelection {
                        reference: item.reference.clone(),
                        through: None,
                    })
                    .collect(),
                consolidation_job: Some(self.job.clone()),
            },
        ))
    }
    fn sources_ready(&self) -> bool {
        self.sources.as_ref().is_some_and(|s| {
            !s.personal.is_empty()
                && s.personal.len() == self.selection.personal.len()
                && s.unavailable_personal.is_empty()
                && s.unavailable_receipts.is_empty()
                && s.personal
                    .iter()
                    .all(|p| p.current_record().is_some() && p.through.is_none())
        })
    }

    fn duplicate(&self) -> bool {
        self.sources.as_ref().and_then(|s| s.duplicate_summary) == Some(true)
    }

    fn has_routine(&self) -> bool {
        self.sources.as_ref().is_some_and(|sources| {
            sources
                .personal
                .iter()
                .any(|source| source.record.header().importance < self.limits.protected_importance)
        })
    }
    pub fn candidate_key(&self) -> Option<CandidateKey> {
        self.candidate
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let sources = self
            .sources
            .as_ref()
            .ok_or_else(|| failure("consolidation sources are not prepared"))?;
        let files: &serde_json::value::RawValue =
            serde_json::from_str(&self.files).map_err(failure)?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Packet<'a> {
            actor_id: &'a str,
            inner_revision: Option<u64>,
            files: &'a serde_json::value::RawValue,
            presentation: &'a MaintenancePresentation,
            sources: &'a PreparedNpcSources,
        }
        RuntimeJson::encode(
            &Packet {
                actor_id: &self.scope.actor_id,
                inner_revision: self.inner_revision,
                files,
                presentation: &self.presentation,
                sources,
            },
            budget,
        )
    }
}
