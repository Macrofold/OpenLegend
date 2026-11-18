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
    Movements,
}

pub struct RuntimePrivateHistoryRead {
    purpose: HistoryPurpose,
    scope: Arc<crate::capture::NpcHistoricalScope>,
    history: Option<crate::experience::CapturedHistoryCuts>,
    recording_gap: Option<crate::received::CoverageGap>,
    sources: Option<crate::capture::PreparedNpcSources>,
    places: Option<crate::capture::PreparedKnownPlaceSources>,
    movements: Option<crate::capture::PreparedMovementTerms>,
    personal_cut: Option<crate::capture::NpcPersonalScope>,
    movement_family: Option<String>,
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
pub struct RuntimePlayerTranscriptRead {
    scope: crate::capture::NpcHistoricalScope,
    durable_revision: u64,
}

impl RuntimePlayerTranscriptRead {
    pub fn durable_head(&self) -> (&str, &str, u64) {
        (
            &self.scope.world_id,
            &self.scope.generation,
            self.durable_revision,
        )
    }

    pub fn privacy_revision(&self) -> u64 {
        self.scope.privacy_revision
    }
}

pub struct RuntimeRecordedEventRoles<'a> {
    roles: crate::experience::player_events::RoleReader<'a>,
    budget: &'a ByteBudget,
}

impl RuntimeRecordedEventRoles<'_> {
    /// Issue only current role facts for the same observer's already
    /// validated saved evidence. Historical labels remain with that evidence.
    pub fn project(
        &self,
        source_id: Option<&str>,
        target_id: Option<&str>,
        subject: Option<&crate::reception::ObserverSubject>,
        body: Option<&crate::experience::AwarenessSourceBody>,
        addressee: bool,
    ) -> Result<crate::experience::player_events::RoleFacts, RuntimeError> {
        self.roles
            .project(source_id, target_id, subject, body, addressee, self.budget)
            .map_err(failure)
    }
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
            #[serde(skip_serializing_if = "Option::is_none")]
            movement_family: &'a Option<String>,
        }
        RuntimeJson::encode(
            &Packet {
                purpose: self.purpose,
                scope: &self.scope,
                history: self.history.as_ref().map(|history| history.value()),
                recording_gap: &self.recording_gap,
                movement_family: &self.movement_family,
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
    pub fn movements(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(
            self.movements
                .as_ref()
                .ok_or_else(|| failure("movement terms unavailable"))?,
            budget,
        )
    }
}
impl NativeWorldSession {
    /// Borrow current naming and body associations only within this
    /// historical read's synchronous disclosure lease.
    pub fn recorded_event_roles<'a>(
        &'a self,
        read: &'a RuntimePlayerTranscriptRead,
        _lease: &RuntimePrivateHistoryPublication,
    ) -> Result<RuntimeRecordedEventRoles<'a>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        let roles =
            crate::experience::player_events::RoleReader::prepare(state, &read.scope.actor_id)
                .map_err(failure)?;
        Ok(RuntimeRecordedEventRoles {
            roles,
            budget: &self.budget,
        })
    }

    /// Pin the current player's private transcript authority and a fixed
    /// already-durable SQL version. No accepted but unsaved event is assumed
    /// available to this historical reader.
    pub fn read_player_transcript(
        &self,
        account: &str,
        actor: &str,
    ) -> Result<RuntimePlayerTranscriptRead, RuntimeError> {
        let accepted = self.session.accepted().map_err(failure)?;
        accepted
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &accepted.state;
        Ok(RuntimePlayerTranscriptRead {
            scope: crate::capture::NpcHistoricalScope::capture_history_personal(
                state,
                actor,
                0,
                &self.budget,
            )
            .map_err(failure)?,
            durable_revision: state.durable_revision,
        })
    }

    /// The original player, timeline, life and personal privacy must still
    /// authorize these durable results at the synchronous transport handoff.
    pub fn transcript_publication(
        &self,
        account: &str,
        read: &RuntimePlayerTranscriptRead,
        temporal: &[(&crate::received::TemporalReceiptLocator, f64)],
        expires_at: Option<f64>,
    ) -> Result<Option<RuntimePrivateHistoryPublication>, RuntimeError> {
        let current = self.session.accepted().map_err(failure)?;
        let scope = &read.scope;
        if current
            .require_player_read(account, &scope.actor_id)
            .is_err()
            || !scope.still_permitted(&current.state)
            || expires_at.is_some_and(|expiry| current.state.physical.header.sim_time >= expiry)
            || current
                .state
                .physical
                .entities
                .get(&scope.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .is_none_or(|actor| actor.physical_life.unwrap_or(0) != scope.physical_life)
        {
            return Ok(None);
        }
        if !durable_temporal_current(&current.state, &scope.actor_id, temporal.iter().copied()) {
            return Ok(None);
        }
        Ok(Some(RuntimePrivateHistoryPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }

    pub fn read_history(
        &mut self,
        actor: &str,
        purpose: &str,
    ) -> Result<RuntimePrivateHistoryRead, RuntimeError> {
        self.require_active()?;
        let purpose = match purpose {
            "recent" => HistoryPurpose::Recent,
            "personal" => HistoryPurpose::Personal,
            "movements" => HistoryPurpose::Movements,
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
                HistoryPurpose::Personal | HistoryPurpose::Movements => {
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
            HistoryPurpose::Personal | HistoryPurpose::Movements => None,
        };
        let personal_cut = matches!(purpose, HistoryPurpose::Movements)
            .then(|| crate::capture::NpcPersonalScope::capture(state, actor))
            .transpose()
            .map_err(failure)?;
        let family = matches!(purpose, HistoryPurpose::Movements).then_some(
            state
                .installed
                .ordinary_actions
                .value()
                .travel
                .agreement_family
                .as_str(),
        );
        let recording_gap = (!matches!(purpose, HistoryPurpose::Movements))
            .then(|| {
                state
                    .temporal
                    .actor(actor)
                    .and_then(|actor| actor.header().recording_gap.clone())
            })
            .flatten();
        let storage = self
            .budget
            .reserve(
                size_of::<RuntimePrivateHistoryRead>()
                    .checked_add(RuntimeNpcRead::receipt_liveness_backing_bytes())
                    .and_then(|n| n.checked_add(family.map_or(0, str::len)))
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
            places: None,
            movements: None,
            personal_cut,
            movement_family: family.map(str::to_owned),
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
        if read.candidate.is_some()
            || read.sources.is_some()
            || read.places.is_some()
            || read.movements.is_some()
        {
            return Err(failure("history sources already selected or active"));
        }
        let _decode = decode_preparation(input, &self.budget)?;
        let selection: crate::capture::NpcSourceSelection =
            serde_json::from_slice(input).map_err(failure)?;
        if selection.consolidation_job.is_some()
            || match read.purpose {
                HistoryPurpose::Recent => !selection.personal.is_empty(),
                HistoryPurpose::Personal => !selection.receipts.is_empty(),
                HistoryPurpose::Movements => true,
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
    /// A Known places page supplies selected canonical source witnesses from
    /// its retained SQL cut, not generic permission to read temporal receipts.
    pub fn admit_history_places(
        &self,
        read: &mut RuntimePrivateHistoryRead,
        input: &[u8],
    ) -> Result<(), RuntimeError> {
        self.admit_place_selection(read, |state, scope| {
            crate::capture::PreparedKnownPlaceSources::prepare(state, scope, input, &self.budget)
        })
    }

    /// Attach only the purpose-bound SQL witnesses obtained by this reader.
    /// The caller's byte owner lives through validation; native custody keeps
    /// the exact personal/support witnesses pinned after this return.
    pub fn admit_history_places_direct(
        &self,
        read: &mut RuntimePrivateHistoryRead,
        places: &[crate::capture::RuntimeKnownPlaceWitness],
        personal: Vec<(
            crate::experience::PersonalSourceKind,
            crate::records::InstalledRow,
        )>,
        supports: Vec<crate::records::InstalledRow>,
        _input_storage: ByteReservation,
    ) -> Result<(), RuntimeError> {
        self.admit_place_selection(read, |state, scope| {
            crate::capture::PreparedKnownPlaceSources::prepare_direct(
                state,
                scope,
                places,
                personal,
                supports,
                &self.budget,
            )
        })
    }

    fn admit_place_selection(
        &self,
        read: &mut RuntimePrivateHistoryRead,
        prepare: impl FnOnce(
            &crate::simulation::SimulationState,
            Arc<crate::capture::NpcHistoricalScope>,
        ) -> Result<
            crate::capture::PreparedKnownPlaceSources,
            crate::execution::ExecutionError,
        >,
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        if !matches!(read.purpose, HistoryPurpose::Personal)
            || read.candidate.is_some()
            || read.sources.is_some()
            || read.places.is_some()
            || read.movements.is_some()
        {
            return Err(failure("history places already selected or wrong purpose"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        read.places = Some(prepare(state, Arc::clone(&read.scope)).map_err(failure)?);
        Ok(())
    }

    /// Capture the permitted private reader and the repository's original
    /// maintenance cut together. Only the supplied application callback may
    /// retain selected SQL inputs. It must qualify the result before use.
    pub fn read_player_known_places<T>(
        &mut self,
        account: &str,
        actor: &str,
        maximum_rows: u64,
        prepare: impl FnOnce(super::RuntimeKnownPlaceRead<'_>) -> T,
    ) -> Result<(RuntimePrivateHistoryRead, T), RuntimeError> {
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(account, actor)
            .map_err(failure)?;
        let read = self.read_history(actor, "personal")?;
        let (state, save, (detached, suffix)) = self.session.player_place_cut().map_err(failure)?;
        let absent_privacy = crate::experience::ActorPrivacy::default();
        let privacy = state
            .experience
            .actor(actor)
            .map_or(&absent_privacy, |entry| &entry.privacy);
        let result = prepare(super::RuntimeKnownPlaceRead {
            binding: crate::geometry::GeometryBinding::new(
                CandidateKey {
                    id: 0,
                    base_cut: state.accepted_cut,
                    generation: self.session.operational_generation(),
                },
                state.installed.geometry.spatial.revision,
                self.next_read_serial,
            ),
            world_id: &state.physical.header.id,
            generation: &state.generation,
            actor_id: actor,
            maximum_rows,
            maximum_bytes: state.installed.personal_evidence_preparation.bytes,
            durable_revision: save.durable_revision,
            durable_cut: save.durable_cut,
            in_flight_through: save.in_flight_through,
            privacy,
            detached,
            suffix,
        });
        Ok((read, result))
    }
    /// The read's original personal coverage is captured before SQL. Its
    /// repository answer may outlive save acknowledgement; never recapture a
    /// newer cut here and mislabel it as the selection's original boundary.
    pub fn admit_history_movements(
        &self,
        read: &mut RuntimePrivateHistoryRead,
        input: &[u8],
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        if !matches!(read.purpose, HistoryPurpose::Movements)
            || read.candidate.is_some()
            || read.sources.is_some()
            || read.places.is_some()
            || read.movements.is_some()
        {
            return Err(failure("movement terms already selected or wrong purpose"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let terms = crate::capture::PreparedMovementTerms::prepare(
            state,
            Arc::clone(&read.scope),
            read.personal_cut
                .as_ref()
                .ok_or_else(|| failure("movement terms have no original personal cut"))?,
            input,
            &self.budget,
        )
        .map_err(failure)?;
        read.movements = Some(terms);
        Ok(())
    }
    pub fn step_history_sources(
        &mut self,
        read: &mut RuntimePrivateHistoryRead,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
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
        if (read.sources.is_none() && read.places.is_none() && read.movements.is_none())
            || !self.history_current(read)?
        {
            return Ok(None);
        }
        // Source capture custody remains with the retained read/header. This
        // object owns only the real final synchronous disclosure fence.
        Ok(Some(RuntimePrivateHistoryPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }
}

/// Accepted time/pressure eviction can precede the ordinary SQL prefix.
/// Each caller still owns identity, privacy and its actual disclosure lease.
pub(super) fn durable_temporal_current<'a>(
    state: &crate::simulation::SimulationState,
    actor: &str,
    receipts: impl Iterator<Item = (&'a crate::received::TemporalReceiptLocator, f64)>,
) -> bool {
    let frontier = state
        .temporal
        .actor(actor)
        .map(|history| history.header().frontier.as_ref());
    receipts.into_iter().all(|(receipt, at)| {
        receipt.actor_id == actor
            && frontier.is_some_and(|frontier| {
                crate::received::received_position_eligible(
                    &crate::received::ReceivedPosition {
                        batch_order: receipt.batch_order,
                        entry_index: receipt.entry_index,
                        member_index: 0,
                    },
                    at,
                    frontier,
                )
            })
    })
}
