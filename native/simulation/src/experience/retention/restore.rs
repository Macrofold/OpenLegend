//! Inactive restore selects one actor's actual SQL accounts without importing
//! its complete historical collection. Native alone chooses and applies effects.
use super::*;
use crate::experience::HistoryPreparationError;
use crate::geometry::GeometryBinding;
use crate::host::CandidateKey;
use serde_json::value::RawValue;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
    world_id: String,
    generation: String,
    actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    accepted_cut: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    identity_through: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_id: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    request_serial: u64,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Phase {
    Metadata,
    Records,
    Membership,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Request<'a, T: Serialize + ?Sized> {
    binding: &'a Binding,
    phase: Phase,
    data: &'a T,
    maximum_transfer_bytes: usize,
}
pub(crate) struct RestoreRetentionQuestion {
    binding: Binding,
    phase: Phase,
    data: Box<RawValue>,
    maximum_transfer_bytes: usize,
    _storage: ByteReservation,
}
impl RestoreRetentionQuestion {
    pub(crate) fn value(&self) -> impl Serialize + '_ {
        // The projection wrapper flattens this typed envelope. Flattening a
        // whole RawValue instead would expose serde's private raw-value key.
        Request {
            binding: &self.binding,
            phase: self.phase,
            data: self.data.as_ref(),
            maximum_transfer_bytes: self.maximum_transfer_bytes,
        }
    }
    pub(crate) fn provider_binding(&self, revision: u64) -> GeometryBinding {
        GeometryBinding::new(
            CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.accepted_cut,
                generation: self.binding.candidate_generation,
            },
            revision,
            self.binding.request_serial,
        )
    }
    pub(crate) fn membership<T: Serialize + ?Sized>(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        data: &T,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        Self::new(core, actor, key, serial, Phase::Membership, data, budget)
    }
    fn new<T: Serialize + ?Sized>(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        phase: Phase,
        data: &T,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            core.state.physical.header.id.len(),
            core.state.generation.len(),
            actor.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let binding = Binding {
            world_id: core.state.physical.header.id.clone(),
            generation: core.state.generation.clone(),
            actor_id: actor.to_owned(),
            accepted_cut: key.base_cut,
            identity_through: core.state.physical.identity.next_id(),
            candidate_id: key.id,
            candidate_generation: key.generation,
            request_serial: serial,
        };
        let maximum_transfer_bytes = budget.limit().saturating_sub(budget.used());
        if maximum_transfer_bytes == 0 {
            return Err(ExecutionError::Capacity);
        }
        let request = Request {
            binding: &binding,
            phase,
            data,
            maximum_transfer_bytes,
        };
        let encoded =
            crate::encoding::json_record_len(&request).map_err(|_| ExecutionError::Invariant)?;
        storage.merge(budget.reserve(encoded.checked_mul(2).ok_or(ExecutionError::Capacity)?)?)?;
        let data = RawValue::from_string(json_record(data).map_err(|_| ExecutionError::Invariant)?)
            .map_err(|_| ExecutionError::Invariant)?;
        Ok(Arc::new(Self {
            binding,
            phase,
            data,
            maximum_transfer_bytes,
            _storage: storage,
        }))
    }
}
enum Data {
    Metadata(AccountMetadataReply),
    Records(AccountBodiesReply),
    Membership(RestoreMembershipAnswer),
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreMembershipAnswer {
    pub(crate) aliases: Vec<usize>,
    pub(crate) individuals: Vec<usize>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}
pub(crate) struct RestoreRetentionAnswer {
    binding: Binding,
    data: Data,
    wire_bytes: usize,
    _binding_storage: ByteReservation,
    _data_storage: ByteReservation,
}
impl RestoreRetentionAnswer {
    pub(crate) fn provider_binding(&self, revision: u64) -> GeometryBinding {
        GeometryBinding::new(
            CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.accepted_cut,
                generation: self.binding.candidate_generation,
            },
            revision,
            self.binding.request_serial,
        )
    }

    pub(crate) fn into_membership(
        self,
        question: &RestoreRetentionQuestion,
    ) -> Result<RestoreMembershipAnswer, HistoryPreparationError> {
        if self.binding != question.binding || self.wire_bytes > question.maximum_transfer_bytes {
            return Err(HistoryPreparationError::StaleResponse);
        }
        let Data::Membership(mut answer) = self.data else {
            return Err(HistoryPreparationError::MalformedResponse);
        };
        answer._storage = Some(self._data_storage);
        Ok(answer)
    }
    pub(crate) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, HistoryPreparationError> {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Envelope<'a> {
            #[serde(borrow)]
            binding: &'a RawValue,
            phase: Phase,
            #[serde(borrow)]
            data: &'a RawValue,
        }
        // The borrowed envelope allocates no body. Its deserializer may still
        // unescape an arbitrarily quoted outer key before rejecting it.
        let envelope_storage = budget
            .reserve(
                text.len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(size_of::<Envelope>()))
                    .ok_or(HistoryPreparationError::Capacity)?,
            )
            .map_err(|_| HistoryPreparationError::Capacity)?;
        let envelope: Envelope<'_> =
            serde_json::from_str(text).map_err(|_| HistoryPreparationError::MalformedResponse)?;
        drop(envelope_storage);
        let binding_storage =
            crate::install::reserve_typed_parse::<Binding>(envelope.binding.get(), 0, None, budget)
                .map_err(|error| match error {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
        let binding = serde_json::from_str(envelope.binding.get())
            .map_err(|_| HistoryPreparationError::MalformedResponse)?;
        let (data, data_storage) = match envelope.phase {
            Phase::Metadata => {
                let storage = crate::install::reserve_typed_parse::<AccountMetadataReply>(
                    envelope.data.get(),
                    size_of::<AccountCandidate>(),
                    None,
                    budget,
                )
                .map_err(|error| match error {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
                let value = serde_json::from_str(envelope.data.get())
                    .map_err(|_| HistoryPreparationError::MalformedResponse)?;
                (Data::Metadata(value), storage)
            }
            Phase::Records => {
                let storage = crate::install::row_input::prepare_account_bodies(
                    envelope.data.get().as_bytes(),
                    budget,
                )
                .map_err(|error| match error.kind() {
                    crate::install::row_input::InputErrorKind::Capacity => {
                        HistoryPreparationError::Capacity
                    }
                    crate::install::row_input::InputErrorKind::Format => {
                        HistoryPreparationError::MalformedResponse
                    }
                })?;
                let value = serde_json::from_str(envelope.data.get())
                    .map_err(|_| HistoryPreparationError::MalformedResponse)?;
                (Data::Records(value), storage)
            }
            Phase::Membership => {
                let storage = crate::install::reserve_typed_parse::<RestoreMembershipAnswer>(
                    envelope.data.get(),
                    size_of::<usize>(),
                    None,
                    budget,
                )
                .map_err(|error| match error {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
                let value = serde_json::from_str(envelope.data.get())
                    .map_err(|_| HistoryPreparationError::MalformedResponse)?;
                (Data::Membership(value), storage)
            }
        };
        Ok(Self {
            binding,
            data,
            wire_bytes: text.len(),
            _binding_storage: binding_storage,
            _data_storage: data_storage,
        })
    }
}

pub(crate) struct RestoreAccountCursor {
    read: Option<AccountRetentionRead>,
    pending: Option<Arc<RestoreRetentionQuestion>>,
    key: CandidateKey,
    done: bool,
    _storage: ByteReservation,
}
pub(crate) enum RestoreAccountStep {
    Question(Arc<RestoreRetentionQuestion>),
    Complete,
}
fn import_error(error: ExecutionError) -> HistoryPreparationError {
    match error {
        ExecutionError::Capacity => HistoryPreparationError::Capacity,
        ExecutionError::Experience(ExperienceError::StaleHydration) => {
            HistoryPreparationError::StaleResponse
        }
        // Selection and loading only inspect the untrusted reply. They have
        // not entered a canonical writer, so invalid rows remain retryable.
        _ => HistoryPreparationError::MalformedResponse,
    }
}
impl RestoreAccountCursor {
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        actor: &str,
        preparation: RetentionPreparation,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(size_of::<Self>())?;
        let read = AccountRetentionRead::capture_restore(core.state, actor, preparation, budget)?;
        Ok(Self {
            read: Some(read),
            pending: None,
            key,
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RestoreRetentionAnswer>,
        budget: &ByteBudget,
    ) -> Result<RestoreAccountStep, HistoryPreparationError> {
        if self.done {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if let Some(question) = &self.pending {
            let Some(answer) = answer else {
                return Ok(RestoreAccountStep::Question(Arc::clone(question)));
            };
            if answer.binding != question.binding
                || answer.wire_bytes > question.maximum_transfer_bytes
            {
                return Err(HistoryPreparationError::StaleResponse);
            }
            let read = self.read.as_mut().ok_or(ExecutionError::Invariant)?;
            match (question.phase, answer.data) {
                (Phase::Metadata, Data::Metadata(metadata)) => {
                    let selection = read
                        .prepare_selection(metadata, budget)
                        .map_err(import_error)?;
                    #[derive(Serialize)]
                    #[serde(rename_all = "camelCase")]
                    struct Records<'a> {
                        actor_id: &'a str,
                        at: f64,
                        selected: &'a [AccountCandidate],
                    }
                    let data = Records {
                        actor_id: &read.actor,
                        at: read.at,
                        selected: &selection.candidates,
                    };
                    let serial = core.journal.next_provider_serial()?;
                    let pending = RestoreRetentionQuestion::new(
                        core,
                        &read.actor,
                        self.key,
                        serial,
                        Phase::Records,
                        &data,
                        budget,
                    )?;
                    read.selection = Some(selection);
                    self.pending = Some(pending);
                }
                (Phase::Records, Data::Records(records)) => {
                    // Reserve the consuming carrier before importing the reply.
                    // Once load succeeds there is no fallible custody handoff.
                    let storage =
                        AccountRetentionCursor::prepare_storage(budget).map_err(import_error)?;
                    read.load(records, budget).map_err(import_error)?;
                    let read = self.read.take().ok_or(ExecutionError::Invariant)?;
                    let mut apply = AccountRetentionCursor::from_prepared(read, storage);
                    if !apply.step(core, budget)?.outcome.ok {
                        return Err(HistoryPreparationError::StaleResponse);
                    }
                    self.pending = None;
                    self.done = true;
                    return Ok(RestoreAccountStep::Complete);
                }
                _ => return Err(HistoryPreparationError::StaleResponse),
            }
        } else {
            if answer.is_some() {
                return Err(HistoryPreparationError::StaleResponse);
            }
            let read = self.read.as_ref().ok_or(ExecutionError::Invariant)?;
            let due = read.accounts.next_due.is_some_and(|at| at <= read.at);
            let policy = &read.installed.attention.value().retention;
            let mut needed = due;
            for class in [
                AccountClass::Optional,
                AccountClass::Required,
                AccountClass::Speech,
            ] {
                needed |= pressure(&read.accounts, policy, class, !due)?;
            }
            if !needed {
                self.read = None;
                self.done = true;
                return Ok(RestoreAccountStep::Complete);
            }
            let serial = core.journal.next_provider_serial()?;
            self.pending = Some(RestoreRetentionQuestion::new(
                core,
                &read.actor,
                self.key,
                serial,
                Phase::Metadata,
                &read.packet()?,
                budget,
            )?);
        }
        Ok(RestoreAccountStep::Question(Arc::clone(
            self.pending.as_ref().ok_or(ExecutionError::Invariant)?,
        )))
    }
}
