//! The private history UI receives only selected, natively admitted receipts.
//! It shares the real Sources cursor and never captures an NPC or a world.
use super::*;
use crate::host::PublicationLease;
use std::mem::size_of;
use std::sync::atomic::AtomicBool;

pub struct RuntimeRecentHistoryRead {
    scope: Arc<crate::capture::NpcHistoricalScope>,
    history: crate::experience::CapturedHistoryCuts,
    recording_gap: Option<crate::received::CoverageGap>,
    sources: Option<crate::capture::PreparedNpcSources>,
    candidate: Option<CandidateKey>,
    receipt_payload: Arc<AtomicBool>,
    _storage: ByteReservation,
}
impl Drop for RuntimeRecentHistoryRead {
    fn drop(&mut self) {
        self.receipt_payload.store(false, Ordering::Release);
    }
}
pub struct RuntimeRecentHistoryPublication {
    _lease: PublicationLease,
}
impl RuntimeRecentHistoryRead {
    pub fn receipt_liveness(&self) -> Weak<AtomicBool> {
        Arc::downgrade(&self.receipt_payload)
    }
    pub fn candidate_key(&self) -> Option<CandidateKey> {
        self.candidate
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Packet<'a, H: Serialize> {
            scope: &'a crate::capture::NpcHistoricalScope,
            history: H,
            #[serde(skip_serializing_if = "Option::is_none")]
            recording_gap: &'a Option<crate::received::CoverageGap>,
        }
        RuntimeJson::encode(
            &Packet {
                scope: &self.scope,
                history: self.history.value(),
                recording_gap: &self.recording_gap,
            },
            budget,
        )
    }
    pub fn sources(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(
            self.sources
                .as_ref()
                .ok_or_else(|| failure("history sources unavailable"))?,
            budget,
        )
    }
}
impl NativeWorldSession {
    pub fn read_recent_history(
        &mut self,
        actor: &str,
    ) -> Result<RuntimeRecentHistoryRead, RuntimeError> {
        self.require_active()?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = Arc::new(
            crate::capture::NpcHistoricalScope::capture_recent(state, actor, serial, &self.budget)
                .map_err(failure)?,
        );
        let history =
            crate::experience::capture_history_cuts(state, std::iter::once(actor), &self.budget)
                .map_err(failure)?;
        let recording_gap = state
            .temporal
            .actor(actor)
            .and_then(|actor| actor.header().recording_gap.clone());
        let storage = self
            .budget
            .reserve(
                size_of::<RuntimeRecentHistoryRead>()
                    .checked_add(RuntimeNpcRead::receipt_liveness_backing_bytes())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        self.next_read_serial = serial;
        Ok(RuntimeRecentHistoryRead {
            scope,
            history,
            recording_gap,
            sources: None,
            candidate: None,
            receipt_payload: Arc::new(AtomicBool::new(true)),
            _storage: storage,
        })
    }
    pub fn recent_history_current(
        &self,
        read: &RuntimeRecentHistoryRead,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.publication_read().map_err(failure)?.state;
        Ok(read.scope.still_permitted(state))
    }
    pub fn begin_recent_history_sources(
        &mut self,
        read: &mut RuntimeRecentHistoryRead,
        input: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if read.candidate.is_some() || read.sources.is_some() {
            return Err(failure("history sources already selected or active"));
        }
        let _decode = decode_preparation(input, &self.budget)?;
        let selection: crate::capture::NpcSourceSelection =
            serde_json::from_slice(input).map_err(failure)?;
        if !selection.personal.is_empty() || selection.consolidation_job.is_some() {
            return Err(failure(
                "recent history accepts only actual receipt selections",
            ));
        }
        let key = self
            .session
            .begin_npc_sources(Arc::clone(&read.scope), selection)
            .map_err(failure)?;
        read.candidate = Some(key);
        Ok(key)
    }
    pub fn step_recent_history_sources(
        &mut self,
        read: &mut RuntimeRecentHistoryRead,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, String)>,
    ) -> Result<RuntimeNpcPreparationStep, RuntimeError> {
        if read.candidate != Some(key) || !self.session.is_npc_sources(key) {
            return Err(failure("history source preparation is stale"));
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
            Err(error) => {
                if !self.session.is_npc_sources(key) {
                    read.candidate = None;
                }
                return Err(failure(error));
            }
        };
        Ok(match step {
            SessionStep::Continue => RuntimeNpcPreparationStep::Continue,
            SessionStep::Question(question) => match self.prepare_provider(key, question) {
                Ok(provider) => RuntimeNpcPreparationStep::Provider(provider),
                Err(error) => {
                    read.candidate = None;
                    return Err(error);
                }
            },
            SessionStep::NpcSources(sources) => {
                read.candidate = None;
                self.held_receipts
                    .register(&sources, &read.receipt_payload, &self.budget)
                    .map_err(failure)?;
                read.sources = Some(sources);
                RuntimeNpcPreparationStep::Complete
            }
            _ => return Err(failure("history read produced executable effects")),
        })
    }
    pub fn cancel_recent_history_sources(
        &mut self,
        read: &RuntimeRecentHistoryRead,
    ) -> Result<(), RuntimeError> {
        if let Some(key) = read
            .candidate
            .filter(|key| self.session.is_npc_sources(*key))
        {
            self.session.cancel(key).map_err(failure)?;
        }
        Ok(())
    }
    pub fn recent_history_publication(
        &self,
        read: &RuntimeRecentHistoryRead,
    ) -> Result<Option<RuntimeRecentHistoryPublication>, RuntimeError> {
        self.session.accepted().map_err(failure)?;
        if read.sources.is_none() || !self.recent_history_current(read)? {
            return Ok(None);
        }
        // Source capture custody remains with the retained read/header. This
        // object owns only the real final synchronous disclosure fence.
        Ok(Some(RuntimeRecentHistoryPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }
}
