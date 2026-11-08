//! Existing personal account envelopes and maintenance clocks. Admission reads
//! the same counters later written by placement; recent charges stay separate.

use super::{AccountCharge, TemporalAccounts, TemporalState};
use crate::attention::AttentionRetentionPolicy;
use crate::experience::AccountClass;
use crate::identity::MAX_SAFE_INTEGER;
use crate::received::ReceivedError;

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
