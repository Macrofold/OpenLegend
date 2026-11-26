//! Inactive restore selects one actor's actual SQL accounts without importing
//! its complete historical collection. Native alone chooses and applies effects.
use super::*;
use crate::experience::HistoryPreparationError;
use crate::geometry::GeometryBinding;
use crate::host::CandidateKey;
use serde_json::value::RawValue;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RestoreAccountBinding {
    pub world_id: String,
    pub generation: String,
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub accepted_cut: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub identity_through: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidate_id: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidate_generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub request_serial: u64,
}
impl RestoreAccountBinding {
    fn provider_binding(&self, revision: u64) -> GeometryBinding {
        GeometryBinding::new(
            CandidateKey {
                id: self.candidate_id,
                base_cut: self.accepted_cut,
                generation: self.candidate_generation,
            },
            revision,
            self.request_serial,
        )
    }
}
heap_record!(RestoreAccountBinding {
    world_id,
    generation,
    actor_id
});

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Phase {
    Metadata,
    Records,
    Membership,
}

#[derive(Clone, Copy)]
pub enum RestoreAccountQuery<'a> {
    Metadata {
        at: f64,
        due: bool,
        pressured: PressuredAccounts,
    },
    Records {
        at: f64,
        selected: &'a [AccountCandidate],
    },
}

pub struct RestoreAccountRequest<'a> {
    pub binding: &'a RestoreAccountBinding,
    pub query: RestoreAccountQuery<'a>,
    pub maximum_transfer_bytes: usize,
}

pub(crate) struct RestoreMembershipRead {
    pub(crate) at: f64,
    pub(crate) max_age_seconds: f64,
    pub(crate) aliases: Vec<String>,
    pub(crate) individual_ids: Vec<String>,
    pub(crate) recent_bytes: u64,
    pub(crate) recent_count: u64,
}

enum QuestionData {
    Metadata {
        at: f64,
        due: bool,
        pressured: PressuredAccounts,
    },
    Records {
        at: f64,
        selected: Vec<AccountCandidate>,
    },
    Membership(RestoreMembershipRead),
    MembershipPacket(Box<RawValue>),
}
impl QuestionData {
    fn phase(&self) -> Phase {
        match self {
            Self::Metadata { .. } => Phase::Metadata,
            Self::Records { .. } => Phase::Records,
            Self::Membership(_) | Self::MembershipPacket(_) => Phase::Membership,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Request<'a, T> {
    binding: &'a RestoreAccountBinding,
    phase: Phase,
    data: T,
    maximum_transfer_bytes: usize,
}

pub(crate) struct RestoreRetentionQuestion {
    binding: RestoreAccountBinding,
    data: QuestionData,
    maximum_transfer_bytes: usize,
    _storage: ByteReservation,
}
impl Serialize for RestoreRetentionQuestion {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value().serialize(serializer)
    }
}
impl RestoreRetentionQuestion {
    pub(crate) fn accounts(&self) -> Option<RestoreAccountRequest<'_>> {
        let query = match &self.data {
            QuestionData::Metadata { at, due, pressured } => RestoreAccountQuery::Metadata {
                at: *at,
                due: *due,
                pressured: *pressured,
            },
            QuestionData::Records { at, selected } => {
                RestoreAccountQuery::Records { at: *at, selected }
            }
            QuestionData::Membership(_) | QuestionData::MembershipPacket(_) => return None,
        };
        Some(RestoreAccountRequest {
            binding: &self.binding,
            query,
            maximum_transfer_bytes: self.maximum_transfer_bytes,
        })
    }

    /// Compatibility with the active Node host. The stand-alone reader borrows
    /// the typed question and the canonical changes through its SQL await.
    pub(crate) fn value(&self) -> impl Serialize + '_ {
        struct Body<'a>(&'a RestoreRetentionQuestion);
        impl Serialize for Body<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                #[derive(Serialize)]
                #[serde(rename_all = "camelCase")]
                struct Records<'a> {
                    actor_id: &'a str,
                    at: f64,
                    selected: &'a [AccountCandidate],
                }
                let binding = &self.0.binding;
                match &self.0.data {
                    QuestionData::Metadata { at, due, pressured } => AccountMetadataQuery {
                        world_id: &binding.world_id,
                        generation: &binding.generation,
                        accepted_cut: binding.accepted_cut,
                        actor_id: &binding.actor_id,
                        at: *at,
                        due: *due,
                        pressured: *pressured,
                    }
                    .serialize(serializer),
                    QuestionData::Records { at, selected } => Records {
                        actor_id: &binding.actor_id,
                        at: *at,
                        selected,
                    }
                    .serialize(serializer),
                    QuestionData::MembershipPacket(raw) => raw.serialize(serializer),
                    QuestionData::Membership(_) => Err(serde::ser::Error::custom(
                        "Rust restore membership has no Node packet",
                    )),
                }
            }
        }
        Request {
            binding: &self.binding,
            phase: self.data.phase(),
            data: Body(self),
            maximum_transfer_bytes: self.maximum_transfer_bytes,
        }
    }
    pub(crate) fn provider_binding(&self, revision: u64) -> GeometryBinding {
        self.binding.provider_binding(revision)
    }
    pub(crate) fn requires_membership_packet(&self) -> bool {
        matches!(self.data, QuestionData::MembershipPacket(_))
    }

    pub(crate) fn membership_read(&self) -> Option<(&RestoreAccountBinding, &RestoreMembershipRead)> {
        let QuestionData::Membership(read) = &self.data else {
            return None;
        };
        Some((&self.binding, read))
    }

    /// Own only the keys the SQL reader uses. Recent receipts and privacy
    /// remain with the inactive candidate and are checked on return.
    pub(crate) fn direct_membership(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        max_age_seconds: f64,
        recent: &crate::received::ReceivedRecentDirectory,
        aliases: &[&str],
        individual_ids: &[&str],
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let bytes = [aliases, individual_ids]
            .into_iter()
            .flatten()
            .try_fold(0usize, |bytes, id| {
                bytes.checked_add(size_of::<String>())?.checked_add(id.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        Self::new(core, actor, key, serial, bytes, budget, || {
            QuestionData::Membership(RestoreMembershipRead {
                at: core.state.physical.header.sim_time,
                max_age_seconds,
                aliases: aliases.iter().map(|id| (*id).to_owned()).collect(),
                individual_ids: individual_ids.iter().map(|id| (*id).to_owned()).collect(),
                recent_bytes: recent.bytes(),
                recent_count: recent.count(),
            })
        })
    }

    pub(crate) fn membership<T: Serialize + ?Sized>(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        data: &T,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let (binding, maximum_transfer_bytes, mut storage) =
            Self::bind(core, actor, key, serial, budget)?;
        let request = Request {
            binding: &binding,
            phase: Phase::Membership,
            data,
            maximum_transfer_bytes,
        };
        let encoded =
            crate::encoding::json_record_len(&request).map_err(|_| ExecutionError::Invariant)?;
        storage.merge(budget.reserve(encoded.checked_mul(2).ok_or(ExecutionError::Capacity)?)?)?;
        let encoded = json_record(data).map_err(|_| ExecutionError::Invariant)?;
        let data = RawValue::from_string(encoded).map_err(|_| ExecutionError::Invariant)?;
        Ok(Arc::new(Self {
            binding,
            data: QuestionData::MembershipPacket(data),
            maximum_transfer_bytes,
            _storage: storage,
        }))
    }
    fn new(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        data_bytes: usize,
        budget: &ByteBudget,
        prepare: impl FnOnce() -> QuestionData,
    ) -> Result<Arc<Self>, ExecutionError> {
        let (binding, maximum_transfer_bytes, mut storage) =
            Self::bind(core, actor, key, serial, budget)?;
        storage.merge(budget.reserve(data_bytes)?)?;
        let data = prepare();
        Ok(Arc::new(Self {
            binding,
            data,
            maximum_transfer_bytes,
            _storage: storage,
        }))
    }
    fn bind(
        core: &CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<(RestoreAccountBinding, usize, ByteReservation), ExecutionError> {
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            core.state.physical.header.id.len(),
            core.state.generation.len(),
            actor.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let binding = RestoreAccountBinding {
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
        Ok((binding, maximum_transfer_bytes, storage))
    }
}
pub enum RestoreAccountAnswer {
    Metadata(AccountMetadataReply),
    Records(AccountBodiesReply),
}

enum Data {
    Metadata(AccountMetadataReply),
    Records(AccountBodiesReply),
    Membership(RestoreMembershipAnswer),
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreMembershipAnswer {
    pub(crate) aliases: Vec<usize>,
    pub(crate) individuals: Vec<usize>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}
heap_record!(RestoreMembershipAnswer { aliases, individuals });
pub(crate) struct RestoreRetentionAnswer {
    binding: RestoreAccountBinding,
    data: Data,
    wire_bytes: usize,
    _binding_storage: ByteReservation,
    _data_storage: ByteReservation,
}
impl RestoreRetentionAnswer {
    /// Continue under the original finite transfer allowance without building
    /// the retired application packet. The answer owns its selected SQL rows.
    pub(crate) fn from_accounts(
        question: &RestoreRetentionQuestion,
        answer: RestoreAccountAnswer,
        custody: ByteReservation,
    ) -> Result<(Self, ByteReservation), HistoryPreparationError> {
        let data = match (question.data.phase(), answer) {
            (Phase::Metadata, RestoreAccountAnswer::Metadata(value)) => Data::Metadata(value),
            (Phase::Records, RestoreAccountAnswer::Records(value)) => Data::Records(value),
            _ => return Err(HistoryPreparationError::StaleResponse),
        };
        Self::from_direct(question, data, custody)
    }

    pub(crate) fn from_membership(
        question: &RestoreRetentionQuestion,
        aliases: Vec<usize>,
        individuals: Vec<usize>,
        custody: ByteReservation,
    ) -> Result<(Self, ByteReservation), HistoryPreparationError> {
        if question.membership_read().is_none() {
            return Err(HistoryPreparationError::StaleResponse);
        }
        Self::from_direct(question,
            Data::Membership(RestoreMembershipAnswer { aliases, individuals, _storage: None }),
            custody)
    }

    fn from_direct(
        question: &RestoreRetentionQuestion,
        data: Data,
        mut custody: ByteReservation,
    ) -> Result<(Self, ByteReservation), HistoryPreparationError> {
        fn measure<T: Serialize + HeapBytes>(
            binding: &RestoreAccountBinding,
            phase: Phase,
            data: &T,
        ) -> Result<(usize, usize), HistoryPreparationError> {
            #[derive(Serialize)]
            struct Envelope<'a, T> {
                binding: &'a RestoreAccountBinding,
                phase: Phase,
                data: &'a T,
            }
            let wire = crate::encoding::json_record_len(&Envelope { binding, phase, data })
                .map_err(|_| HistoryPreparationError::MalformedResponse)?;
            let heap = data.heap_bytes().ok_or(HistoryPreparationError::Capacity)?;
            Ok((wire, heap))
        }
        let binding = &question.binding;
        let phase = question.data.phase();
        let (wire_bytes, heap) = match &data {
            Data::Metadata(value) => measure(binding, phase, value)?,
            Data::Records(value) => measure(binding, phase, value)?,
            Data::Membership(value) => measure(binding, phase, value)?,
        };
        if wire_bytes > question.maximum_transfer_bytes {
            return Err(HistoryPreparationError::Capacity);
        }
        let binding_bytes = binding.heap_bytes().ok_or(HistoryPreparationError::Capacity)?;
        let bytes = heap_sum([size_of::<Self>(), binding_bytes, heap])
            .ok_or(HistoryPreparationError::Capacity)?;
        custody.resize(bytes)?;
        let wrapper = custody.split_off(size_of::<Self>())?;
        let binding_storage = custody.split_off(binding_bytes)?;
        Ok((
            Self {
                binding: binding.clone(),
                data,
                wire_bytes,
                _binding_storage: binding_storage,
                _data_storage: custody,
            },
            wrapper,
        ))
    }

    pub(crate) fn provider_binding(&self, revision: u64) -> GeometryBinding {
        self.binding.provider_binding(revision)
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
        let binding_storage = crate::install::reserve_typed_parse::<RestoreAccountBinding>(
            envelope.binding.get(),
            0,
            None,
            budget,
        )
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
            match (question.data.phase(), answer.data) {
                (Phase::Metadata, Data::Metadata(metadata)) => {
                    let selection = read
                        .prepare_selection(metadata, budget)
                        .map_err(import_error)?;
                    let bytes = selection
                        .candidates
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?;
                    let serial = core.journal.next_provider_serial()?;
                    let pending = RestoreRetentionQuestion::new(
                        core,
                        &read.actor,
                        self.key,
                        serial,
                        bytes,
                        budget,
                        || QuestionData::Records {
                            at: read.at,
                            selected: selection.candidates.clone(),
                        },
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
            let (due, pressured) = read.metadata_filter()?;
            if !due && pressured.classes().next().is_none() {
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
                0,
                budget,
                || QuestionData::Metadata {
                    at: read.at,
                    due,
                    pressured,
                },
            )?);
        }
        Ok(RestoreAccountStep::Question(Arc::clone(
            self.pending.as_ref().ok_or(ExecutionError::Invariant)?,
        )))
    }
}
