//! The private history UI receives only selected, natively admitted receipts.
//! It shares the real Sources cursor and never captures an NPC or a world.
use super::*;
use crate::host::PublicationLease;
use std::mem::size_of;
use std::sync::atomic::AtomicBool;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
enum HistoryPurpose {
    Recent,
    Personal,
}

pub struct RuntimePrivateHistoryRead {
    purpose: HistoryPurpose,
    scope: Arc<crate::capture::NpcHistoricalScope>,
    history: Option<crate::experience::CapturedHistoryCuts>,
    recording_gap: Option<crate::received::CoverageGap>,
    sources: Option<crate::capture::PreparedNpcSources>,
    candidate: Option<CandidateKey>,
    receipt_payload: Arc<AtomicBool>,
    _storage: ByteReservation,
}
impl Drop for RuntimePrivateHistoryRead {
    fn drop(&mut self) {
        self.receipt_payload.store(false, Ordering::Release);
    }
}
pub struct RuntimePrivateHistoryPublication {
    _lease: PublicationLease,
}
impl RuntimePrivateHistoryRead {
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
            purpose: HistoryPurpose,
            scope: &'a crate::capture::NpcHistoricalScope,
            #[serde(skip_serializing_if = "Option::is_none")]
            history: Option<H>,
            #[serde(skip_serializing_if = "Option::is_none")]
            recording_gap: &'a Option<crate::received::CoverageGap>,
        }
        RuntimeJson::encode(
            &Packet {
                purpose: self.purpose,
                scope: &self.scope,
                history: self.history.as_ref().map(|history| history.value()),
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
    pub fn read_history(
        &mut self,
        actor: &str,
        purpose: &str,
    ) -> Result<RuntimePrivateHistoryRead, RuntimeError> {
        self.require_active()?;
        let purpose = match purpose {
            "recent" => HistoryPurpose::Recent,
            "personal" => HistoryPurpose::Personal,
            _ => return Err(failure("unknown history purpose")),
        };
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = Arc::new(
            match purpose {
                HistoryPurpose::Recent => crate::capture::NpcHistoricalScope::capture_recent(
                    state,
                    actor,
                    serial,
                    &self.budget,
                ),
                HistoryPurpose::Personal => {
                    crate::capture::NpcHistoricalScope::capture_history_personal(
                        state,
                        actor,
                        serial,
                        &self.budget,
                    )
                }
            }
            .map_err(failure)?,
        );
        // Personal browsing never selects receipt chronology. Keep its read
        // free of the recent directory copies used only by the recent route.
        let history = match purpose {
            HistoryPurpose::Recent => Some(
                crate::experience::capture_history_cuts(
                    state,
                    std::iter::once(actor),
                    &self.budget,
                )
                .map_err(failure)?,
            ),
            HistoryPurpose::Personal => None,
        };
        let recording_gap = state
            .temporal
            .actor(actor)
            .and_then(|actor| actor.header().recording_gap.clone());
        let storage = self
            .budget
            .reserve(
                size_of::<RuntimePrivateHistoryRead>()
                    .checked_add(RuntimeNpcRead::receipt_liveness_backing_bytes())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        self.next_read_serial = serial;
        Ok(RuntimePrivateHistoryRead {
            purpose,
            scope,
            history,
            recording_gap,
            sources: None,
            candidate: None,
            receipt_payload: Arc::new(AtomicBool::new(true)),
            _storage: storage,
        })
    }
    pub fn history_current(&self, read: &RuntimePrivateHistoryRead) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.publication_read().map_err(failure)?.state;
        Ok(read.scope.still_permitted(state))
    }
    pub fn begin_history_sources(
        &mut self,
        read: &mut RuntimePrivateHistoryRead,
        input: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if read.candidate.is_some() || read.sources.is_some() {
            return Err(failure("history sources already selected or active"));
        }
        let _decode = decode_preparation(input, &self.budget)?;
        let selection: crate::capture::NpcSourceSelection =
            serde_json::from_slice(input).map_err(failure)?;
        if selection.consolidation_job.is_some()
            || match read.purpose {
                HistoryPurpose::Recent => !selection.personal.is_empty(),
                HistoryPurpose::Personal => !selection.receipts.is_empty(),
            }
        {
            return Err(failure("history sources do not match the captured purpose"));
        }
        let key = self
            .session
            .begin_npc_sources(Arc::clone(&read.scope), selection)
            .map_err(failure)?;
        read.candidate = Some(key);
        Ok(key)
    }
    pub fn step_history_sources(
        &mut self,
        read: &mut RuntimePrivateHistoryRead,
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
    pub fn cancel_history_sources(
        &mut self,
        read: &RuntimePrivateHistoryRead,
    ) -> Result<(), RuntimeError> {
        if let Some(key) = read
            .candidate
            .filter(|key| self.session.is_npc_sources(*key))
        {
            self.session.cancel(key).map_err(failure)?;
        }
        Ok(())
    }
    pub fn history_publication(
        &self,
        read: &RuntimePrivateHistoryRead,
    ) -> Result<Option<RuntimePrivateHistoryPublication>, RuntimeError> {
        self.session.accepted().map_err(failure)?;
        if read.sources.is_none() || !self.history_current(read)? {
            return Ok(None);
        }
        // Source capture custody remains with the retained read/header. This
        // object owns only the real final synchronous disclosure fence.
        Ok(Some(RuntimePrivateHistoryPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }
}
