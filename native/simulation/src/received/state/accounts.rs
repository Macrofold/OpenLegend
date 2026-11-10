//! Existing personal account envelopes and maintenance clocks. Admission reads
//! the same counters later written by placement; recent charges stay separate.

use super::{AccountCharge, TemporalAccounts, TemporalState};
use crate::attention::AttentionRetentionPolicy;
use crate::experience::AccountClass;
use crate::host::retained_size::HeapBytes;
use crate::identity::MAX_SAFE_INTEGER;
use crate::received::ReceivedError;

/// Match the first real personal-account admission. Cold loading supplies its
/// complete persisted totals; a new owner may bootstrap only from complete
/// native collections, never treat an unselected historical tail as empty.
pub(crate) fn ensure_experience_accounting(
    core: &mut crate::execution::CoreMutation<'_>,
    actor_id: &str,
    budget: &crate::host::ByteBudget,
) -> Result<(), crate::execution::ExecutionError> {
    if !super::ensure_temporal_actor(core, actor_id, budget)? {
        return Ok(());
    }
    bootstrap_personal_accounts(
        &mut core.state.physical,
        &core.state.reception,
        &core.state.experience,
        &mut core.state.temporal,
        &core.state.installed,
        actor_id,
        budget,
    )
}

/// Recognition can retain a first personal identity before any observation.
/// Its actual semantic journal already owns these disjoint state parts.
pub(crate) fn bootstrap_personal_accounts(
    physical: &mut crate::simulation::PhysicalState,
    reception: &crate::reception::ReceptionState,
    experience: &crate::experience::ExperienceState,
    temporal: &mut TemporalState,
    installed: &crate::simulation::InstalledWorld,
    actor_id: &str,
    budget: &crate::host::ByteBudget,
) -> Result<(), crate::execution::ExecutionError> {
    use crate::encoding::json_record_len;
    use crate::execution::ExecutionError;
    use crate::experience::{AccountClass as PersonalClass, PersonalSourceKind};
    let Some(actor) = physical
        .entities
        .get(actor_id)
        .filter(|actor| actor.has_memory())
    else {
        return Ok(());
    };
    let life = actor.physical_life().ok_or(ExecutionError::MissingActor)?;
    if let Some(history) = temporal.actor(actor_id) {
        if history.header().physical_life != life {
            return Err(ExecutionError::Received(ReceivedError(
                "Personal accounting requires its actual receiving-life retirement.",
            )));
        }
        if history.header().accounts.is_some() {
            return Ok(());
        }
    } else {
        super::actor::install_temporal_actor_life(
            temporal, physical, actor_id, life, None, budget,
        )?;
    }
    let mut accounts = TemporalAccounts {
        next_due: None,
        knowledge_due: None,
        support_dirty_revision: 0,
        support_settled_revision: 0,
        optional: AccountCharge { bytes: 0, count: 0 },
        required: AccountCharge { bytes: 0, count: 0 },
        speech: AccountCharge { bytes: 0, count: 0 },
        archives: None,
    };
    let add = |account: &mut AccountCharge, bytes: u64| -> Result<(), ExecutionError> {
        account.bytes = account
            .bytes
            .checked_add(bytes)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Capacity)?;
        account.count = account
            .count
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Capacity)?;
        Ok(())
    };
    let policy = &installed.attention.value().retention;
    for kind in [
        PersonalSourceKind::Awareness,
        PersonalSourceKind::Memory,
        PersonalSourceKind::Summary,
    ] {
        let Some(collection) = experience.optional_collection(actor_id, kind)? else {
            continue;
        };
        // Installed ordinals are unique and below this exact high-water mark.
        // Filling every slot also proves complete residency for a fresh owner
        // whose working-set selection conservatively marks the list partial.
        if !collection.coverage().complete
            && collection.records().len() as u64 != collection.coverage().next_ordinal
        {
            return Err(ExecutionError::Received(ReceivedError(
                "Personal account bootstrap requires complete source ownership.",
            )));
        }
        for record in collection.records() {
            let header = record.header();
            if kind == PersonalSourceKind::Awareness && header.sensory {
                continue;
            }
            let account = match header.class {
                PersonalClass::Optional => &mut accounts.optional,
                PersonalClass::Required => &mut accounts.required,
                PersonalClass::Speech => &mut accounts.speech,
                PersonalClass::Sensory => return Err(ExecutionError::Invariant),
            };
            add(account, record.payload().len() as u64)?;
            if let Some(due) = crate::experience::experience_retention_due(header, policy) {
                accounts.next_due = Some(accounts.next_due.map_or(due, |prior| prior.min(due)));
            }
        }
    }
    let history = temporal.actor(actor_id).ok_or(ExecutionError::Invariant)?;
    if let Some(supports) = history.supports() {
        if !supports.coverage().complete {
            return Err(ExecutionError::Received(ReceivedError(
                "Personal account bootstrap requires complete support ownership.",
            )));
        }
        for record in supports.records() {
            let capsule = record.capsule();
            add(
                if capsule.required {
                    &mut accounts.required
                } else {
                    &mut accounts.optional
                },
                capsule.bytes,
            )?;
        }
    } else if history.header().supports.is_some() {
        return Err(ExecutionError::Invariant);
    }
    if let Some(documents) = reception
        .actor_knowledge
        .as_ref()
        .and_then(|root| root.get(actor_id))
    {
        for document in documents
            .values()
            .filter(|document| document.origin == crate::reception::KnowledgeOrigin::ActorEdit)
        {
            add(
                &mut accounts.optional,
                json_record_len(document).map_err(|_| ExecutionError::Invariant)? as u64,
            )?;
        }
    }
    // Recognition retention and its deadline belong to the selected world.
    let (recognition, due) = crate::worlds::base_recognition::bootstrap_recognition_account(
        reception, installed, actor_id,
    )?;
    accounts.optional.bytes = accounts
        .optional
        .bytes
        .checked_add(recognition.bytes)
        .filter(|n| *n <= MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Capacity)?;
    accounts.optional.count = accounts
        .optional
        .count
        .checked_add(recognition.count)
        .filter(|n| *n <= MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Capacity)?;
    accounts.knowledge_due = due;
    // This selected install rejects nonempty learned-capability collections;
    // there are no nonauthored discovery records to charge at this boundary.
    if accounts.required.bytes as f64
        >= (policy.required.max_bytes as f64 * policy.required_pressure_start).floor()
        || accounts.required.count as f64
            >= (policy.required.max_records as f64 * policy.required_pressure_start).floor()
    {
        let now = physical.header.sim_time;
        accounts.next_due = Some(accounts.next_due.map_or(now, |prior| prior.min(now)));
    }
    let header = history.header();
    let _clone = budget.reserve(header.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    let mut header = header.clone();
    header.accounts = Some(accounts);
    temporal.replace_header(actor_id, header)?;
    Ok(())
}

#[derive(Clone)]
pub(crate) struct AccountAdditionBudget {
    optional: AccountCharge,
    required: AccountCharge,
    speech: AccountCharge,
}
impl AccountAdditionBudget {
    fn from(accounts: &TemporalAccounts) -> Self {
        Self {
            optional: accounts.optional.clone(),
            required: accounts.required.clone(),
            speech: accounts.speech.clone(),
        }
    }
    pub(crate) fn reserve(
        &mut self,
        class: AccountClass,
        bytes: u64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<bool, ReceivedError> {
        let (account, limit, headroom) = match class {
            AccountClass::Optional => (
                &mut self.optional,
                &policy.optional,
                policy.maintenance_headroom,
            ),
            AccountClass::Required => (&mut self.required, &policy.required, 0.0),
            AccountClass::Speech => (
                &mut self.speech,
                &policy.speech,
                policy.speech_maintenance_headroom,
            ),
            AccountClass::Sensory => return Ok(true),
        };
        let bytes = account
            .bytes
            .checked_add(bytes)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ReceivedError("Personal account counter overflow."))?;
        let count = account
            .count
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ReceivedError("Personal account counter overflow."))?;
        if bytes as f64 > limit.max_bytes as f64 * (1.0 + headroom)
            || count as f64 > limit.max_records as f64 * (1.0 + headroom)
        {
            return Ok(false);
        }
        account.bytes = bytes;
        account.count = count;
        Ok(true)
    }
}
impl TemporalState {
    pub(crate) fn account_addition_budget(
        &self,
        actor_id: &str,
    ) -> Result<AccountAdditionBudget, ReceivedError> {
        let accounts = self
            .actors
            .get(actor_id)
            .and_then(|actor| actor.header.accounts.as_ref())
            .ok_or(ReceivedError(
                "Complete personal account ownership is unavailable.",
            ))?;
        Ok(AccountAdditionBudget::from(accounts))
    }
    pub(crate) fn account_recording_gap(
        &mut self,
        actor_id: &str,
        now: f64,
    ) -> Result<(), ReceivedError> {
        let mut header = self
            .actors
            .get(actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?
            .header
            .clone();
        header.recording_gap = Some(super::CoverageGap {
            from: header.recording_gap.as_ref().map_or(now, |gap| gap.from),
            through: now,
        });
        let accounts = header.accounts.as_mut().ok_or(ReceivedError(
            "Complete personal account ownership is unavailable.",
        ))?;
        accounts.next_due = Some(accounts.next_due.map_or(now, |due| due.min(now)));
        self.replace_header(actor_id, header)
    }
    pub(crate) fn adjust_account(
        &mut self,
        actor_id: &str,
        class: AccountClass,
        bytes_delta: i128,
        count_delta: i128,
        due: Option<f64>,
        now: f64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<(), ReceivedError> {
        if class == AccountClass::Sensory {
            return Ok(());
        }
        let mut header = self
            .actors
            .get(actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?
            .header
            .clone();
        let accounts = header.accounts.as_mut().ok_or(ReceivedError(
            "Complete personal account ownership is unavailable.",
        ))?;
        let account = match class {
            AccountClass::Optional => &mut accounts.optional,
            AccountClass::Required => &mut accounts.required,
            AccountClass::Speech => &mut accounts.speech,
            AccountClass::Sensory => unreachable!(),
        };
        let adjust = |current: u64, delta: i128| {
            u64::try_from(i128::from(current) + delta)
                .ok()
                .filter(|n| *n <= MAX_SAFE_INTEGER)
                .ok_or(ReceivedError(
                    "Personal account retention counters underflowed or overflowed.",
                ))
        };
        account.bytes = adjust(account.bytes, bytes_delta)?;
        account.count = adjust(account.count, count_delta)?;
        if bytes_delta >= 0 {
            if let Some(due) = due {
                accounts.next_due = Some(accounts.next_due.map_or(due, |prior| prior.min(due)));
            }
            if class == AccountClass::Required
                && (accounts.required.bytes as f64
                    >= (policy.required.max_bytes as f64 * policy.required_pressure_start).floor()
                    || accounts.required.count as f64
                        >= (policy.required.max_records as f64 * policy.required_pressure_start)
                            .floor())
            {
                accounts.next_due = Some(accounts.next_due.map_or(now, |prior| prior.min(now)));
            }
        }
        self.replace_header(actor_id, header)
    }
}

/// Actual encoded record ownership changes, computed by its semantic writer.
/// The two categories share the same counters as accounts and sparse supports;
/// revocation may shrink an already overfull owner without admitting new data.
#[derive(Clone, Copy)]
pub(crate) struct KnowledgeAccountChange {
    pub before_bytes: Option<u64>,
    pub after_bytes: Option<u64>,
    pub required: bool,
    pub revocation: bool,
}
impl TemporalState {
    pub(crate) fn adjust_retained_knowledge(
        &mut self,
        actor_id: &str,
        change: KnowledgeAccountChange,
        now: f64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<bool, ReceivedError> {
        // Source skips accounting when both retained values are absent.
        if change.before_bytes.is_none() && change.after_bytes.is_none() {
            return Ok(true);
        }
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(false);
        };
        let Some(accounts) = actor.header.accounts.as_ref() else {
            return Ok(false);
        };
        let account = if change.required {
            &accounts.required
        } else {
            &accounts.optional
        };
        let limit = if change.required {
            &policy.required
        } else {
            &policy.optional
        };
        let adjust = |value: u64, before: u64, after: u64| {
            value
                .checked_sub(before)
                .and_then(|n| n.checked_add(after))
                .filter(|n| *n <= MAX_SAFE_INTEGER)
                .ok_or(ReceivedError(
                    "Retained knowledge accounting underflowed or overflowed.",
                ))
        };
        let bytes = adjust(
            account.bytes,
            change.before_bytes.unwrap_or(0),
            change.after_bytes.unwrap_or(0),
        )?;
        let count = adjust(
            account.count,
            u64::from(change.before_bytes.is_some()),
            u64::from(change.after_bytes.is_some()),
        )?;
        if !change.revocation
            && ((bytes > limit.max_bytes && bytes > account.bytes)
                || (count > limit.max_records && count > account.count))
        {
            return Ok(false);
        }
        let mut header = actor.header.clone();
        let accounts = header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?;
        let account = if change.required {
            &mut accounts.required
        } else {
            &mut accounts.optional
        };
        account.bytes = bytes;
        account.count = count;
        if change.required
            && change.after_bytes.is_some()
            && (accounts.required.bytes as f64
                >= (policy.required.max_bytes as f64 * policy.required_pressure_start).floor()
                || accounts.required.count as f64
                    >= (policy.required.max_records as f64 * policy.required_pressure_start)
                        .floor())
        {
            accounts.next_due = Some(accounts.next_due.map_or(now, |prior| prior.min(now)));
        }
        self.replace_header(actor_id, header)?;
        Ok(true)
    }
    pub(crate) fn mark_support_dirty(
        &mut self,
        actor_id: &str,
        source_ids: Option<&[String]>,
    ) -> Result<bool, ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(false);
        };
        if actor.header.accounts.is_none() {
            return Ok(false);
        }
        let Some(supports) = actor.supports.as_ref() else {
            return Ok(false);
        };
        let selected = match source_ids {
            Some(ids) => {
                let found = ids.iter().any(|id| {
                    supports
                        .records()
                        .any(|record| &record.capsule().receipt.id == id)
                });
                if !found && !supports.coverage().complete && !ids.is_empty() {
                    return Err(ReceivedError(
                        "Selected support ownership requires cold coverage.",
                    ));
                }
                found
            }
            None => {
                let found = supports.records().next().is_some();
                if !found && !supports.coverage().complete {
                    return Err(ReceivedError("Support ownership requires cold coverage."));
                }
                found
            }
        };
        if !selected {
            return Ok(false);
        }
        let mut header = actor.header.clone();
        let accounts = header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?;
        accounts.support_dirty_revision = accounts
            .support_dirty_revision
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ReceivedError("Support cleanup revision overflowed."))?;
        self.replace_header(actor_id, header)?;
        Ok(true)
    }
}
impl TemporalState {
    pub(crate) fn set_account_due(
        &mut self,
        actor_id: &str,
        mut due: Option<f64>,
        required_changed: bool,
        now: f64,
        policy: &AttentionRetentionPolicy,
    ) -> Result<(), ReceivedError> {
        let actor = self
            .actors
            .get(actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?;
        let accounts = actor
            .header
            .accounts
            .as_ref()
            .ok_or(ReceivedError("Personal accounts vanished."))?;
        if required_changed
            && (accounts.required.bytes as f64
                >= (policy.required.max_bytes as f64 * policy.required_pressure_start).floor()
                || accounts.required.count as f64
                    >= (policy.required.max_records as f64 * policy.required_pressure_start)
                        .floor())
        {
            due = Some(due.map_or(now, |prior| prior.min(now)));
        }
        if accounts.next_due == due {
            return Ok(());
        }
        let mut header = actor.header.clone();
        header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?
            .next_due = due;
        self.replace_header(actor_id, header)
    }
    /// The due native pass recomputes this marker after the selected world's
    /// actual identity retirements. A removed last seed clears the wake.
    pub(crate) fn set_knowledge_due(
        &mut self,
        actor_id: &str,
        due: Option<f64>,
    ) -> Result<(), ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(());
        };
        let Some(accounts) = actor.header.accounts.as_ref() else {
            return Ok(());
        };
        if accounts.knowledge_due == due {
            return Ok(());
        }
        let mut header = actor.header.clone();
        header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?
            .knowledge_due = due;
        self.replace_header(actor_id, header)
    }
    pub(crate) fn note_knowledge_due(
        &mut self,
        actor_id: &str,
        due: f64,
    ) -> Result<(), ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(());
        };
        let Some(accounts) = actor.header.accounts.as_ref() else {
            return Ok(());
        };
        let next = accounts.knowledge_due.map_or(due, |prior| prior.min(due));
        if accounts.knowledge_due == Some(next) {
            return Ok(());
        }
        let mut header = actor.header.clone();
        header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?
            .knowledge_due = Some(next);
        self.replace_header(actor_id, header)
    }
}

impl TemporalState {
    /// Life retirement clears admission held by that old receiver. It does not
    /// start a new temporal epoch or remove the saved received history.
    pub(crate) fn clear_recording_reservations(
        &mut self,
        actor_id: &str,
        physical_life: u64,
    ) -> Result<(), ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(());
        };
        if actor.header.physical_life != physical_life {
            return Err(ReceivedError("Received recording life changed."));
        }
        if actor.header.terminal_reserved_bytes == 0 {
            return Ok(());
        }
        let mut header = actor.header.clone();
        header.terminal_reserved_bytes = 0;
        self.replace_header(actor_id, header)
    }

    pub(crate) fn release_terminal_reservation(
        &mut self,
        actor_id: &str,
        bytes: u64,
    ) -> Result<(), ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(());
        };
        if bytes > actor.header.terminal_reserved_bytes {
            return Err(ReceivedError("Received terminal reservation underflow."));
        }
        if bytes == 0 {
            return Ok(());
        }
        let mut header = actor.header.clone();
        header.terminal_reserved_bytes -= bytes;
        self.replace_header(actor_id, header)
    }
}

impl TemporalState {
    /// A complete support-set proof settles only its captured dirty generation.
    pub(crate) fn settle_support_cleanup(
        &mut self,
        actor_id: &str,
        revision: u64,
    ) -> Result<bool, ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(false);
        };
        let Some(accounts) = actor.header.accounts.as_ref() else {
            return Ok(false);
        };
        if accounts.support_dirty_revision != revision
            || accounts.support_settled_revision == revision
        {
            return Ok(false);
        }
        // The new header is a real temporary before its sole writer installs
        // canonical custody. Fund its copy before cloning, then release this
        // workspace after the writer has taken ownership.
        let _copy = self
            .budget
            .reserve(
                actor
                    .header
                    .heap_bytes()
                    .and_then(|n| n.checked_add(std::mem::size_of::<super::TemporalActorHeader>()))
                    .ok_or(ReceivedError(
                        "Support settlement header allocation overflow.",
                    ))?,
            )
            .map_err(|_| ReceivedError("Support settlement exceeds native byte allowance."))?;
        let mut header = actor.header.clone();
        header
            .accounts
            .as_mut()
            .ok_or(ReceivedError("Personal accounts vanished."))?
            .support_settled_revision = revision;
        self.replace_header(actor_id, header)?;
        Ok(true)
    }
}
