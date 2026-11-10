//! Exact archive plans are prepared from selected current headers and bounded
//! PostgreSQL source dependencies. Accepting a candidate charges those actual
//! deltas once; the existing database writer persists the same plan afterward.

use super::*;
use crate::attention::AttentionRetentionPolicy;
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::values::deserialize_present_option;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
enum Category {
    Optional,
    Required,
    Speech,
}
impl Category {
    fn class(self) -> AccountClass {
        match self {
            Self::Optional => AccountClass::Optional,
            Self::Required => AccountClass::Required,
            Self::Speech => AccountClass::Speech,
        }
    }
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Charge {
    category: Category,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    bytes: u64,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Desired {
    category: Category,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    bytes: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    payload: Option<String>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Change {
    actor_id: String,
    kind: String,
    id: String,
    revision: String,
    #[serde(deserialize_with = "deserialize_nullable")]
    expected_prior: Option<Charge>,
    #[serde(deserialize_with = "deserialize_nullable")]
    desired: Option<Desired>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SourceVersionPlan {
    changes: Vec<Change>,
}

/// Borrow only the archive metadata needed by whole-install reconciliation.
/// The plan retains the actual immutable payload and its admission separately.
#[derive(Clone, Copy)]
pub(crate) struct SourceVersionArchiveChange<'a> {
    pub actor_id: &'a str,
    pub kind: &'a str,
    pub id: &'a str,
    pub revision: &'a str,
    pub expected_prior: Option<(AccountClass, u64)>,
    pub desired: Option<(AccountClass, u64)>,
    pub has_payload: bool,
}

impl HeapBytes for Category {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
heap_record!(Charge { category, bytes });
heap_record!(Desired {
    category,
    bytes,
    payload
});
heap_record!(Change {
    actor_id,
    kind,
    id,
    revision,
    expected_prior,
    desired
});
heap_record!(SourceVersionPlan { changes });
impl SourceVersionPlan {
    pub(crate) fn archive_changes(
        &self,
    ) -> impl ExactSizeIterator<Item = SourceVersionArchiveChange<'_>> {
        self.changes
            .iter()
            .map(|change| SourceVersionArchiveChange {
                actor_id: &change.actor_id,
                kind: &change.kind,
                id: &change.id,
                revision: &change.revision,
                expected_prior: change
                    .expected_prior
                    .as_ref()
                    .map(|value| (value.category.class(), value.bytes)),
                desired: change
                    .desired
                    .as_ref()
                    .map(|value| (value.category.class(), value.bytes)),
                has_payload: change
                    .desired
                    .as_ref()
                    .is_some_and(|value| value.payload.is_some()),
            })
    }
    pub(crate) fn empty() -> Self {
        Self {
            changes: Vec::new(),
        }
    }
    pub(crate) fn is_empty(&self) -> bool {
        self.changes.is_empty()
    }
    pub(crate) fn array_element_bytes() -> usize {
        size_of::<Change>()
    }
    pub(crate) fn validate_actors(
        &self,
        actors: &indexmap::IndexSet<String>,
        budget: &ByteBudget,
    ) -> Result<(), crate::experience::HistoryPreparationError> {
        use crate::experience::HistoryPreparationError as E;
        let _storage = budget
            .reserve(
                map_storage::<(&str, &str, &str, &str), ()>(self.changes.len())
                    .ok_or(E::Capacity)?,
            )
            .map_err(|_| E::Capacity)?;
        let mut keys = indexmap::IndexSet::new();
        keys.try_reserve(self.changes.len())
            .map_err(|_| E::Capacity)?;
        for change in &self.changes {
            if !actors.contains(&change.actor_id)
                || !matches!(change.kind.as_str(), "awareness" | "memory" | "summary")
                || change.id.is_empty()
                || change.revision.is_empty()
                || !keys.insert((
                    change.actor_id.as_str(),
                    change.kind.as_str(),
                    change.id.as_str(),
                    change.revision.as_str(),
                ))
                || change
                    .desired
                    .as_ref()
                    .and_then(|d| d.payload.as_ref().map(|p| (d, p)))
                    .is_some_and(|(desired, payload)| {
                        payload.len() as u64 != desired.bytes
                            || crate::encoding::sha256_hex(payload.as_bytes()) != change.revision
                    })
            {
                return Err(E::MalformedResponse);
            }
        }
        Ok(())
    }
}

fn invalid() -> ReceivedError {
    ReceivedError("Exact archived source accounting is unavailable or inconsistent.")
}
fn account(accounts: &mut TemporalAccounts, class: AccountClass) -> &mut AccountCharge {
    match class {
        AccountClass::Optional => &mut accounts.optional,
        AccountClass::Required => &mut accounts.required,
        AccountClass::Speech => &mut accounts.speech,
    }
}
fn adjust(charge: &mut AccountCharge, bytes: i128, count: i128) -> Result<(), ReceivedError> {
    charge.bytes = u64::try_from(i128::from(charge.bytes) + bytes)
        .ok()
        .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    charge.count = u64::try_from(i128::from(charge.count) + count)
        .ok()
        .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    Ok(())
}
/// The enclosing candidate/cold-preparation fence binds this plan to the exact
/// before cut. This owner never queries SQL or reconstructs personal bodies.
pub(crate) fn apply_source_version_plan(
    state: &mut TemporalState,
    plan: &SourceVersionPlan,
    now: f64,
    policy: &AttentionRetentionPolicy,
    budget: &ByteBudget,
) -> Result<(), ReceivedError> {
    apply_accounting(state, plan, false, now, policy, budget)
}
/// The private restore closure replans against one unchanged archive baseline.
/// Reverse only its genuinely applied plan; other retention effects survive.
pub(crate) fn reset_source_version_plan(
    state: &mut TemporalState,
    plan: &SourceVersionPlan,
    now: f64,
    policy: &AttentionRetentionPolicy,
    budget: &ByteBudget,
) -> Result<(), ReceivedError> {
    apply_accounting(state, plan, true, now, policy, budget)
}
fn apply_accounting(
    state: &mut TemporalState,
    plan: &SourceVersionPlan,
    reset: bool,
    now: f64,
    policy: &AttentionRetentionPolicy,
    budget: &ByteBudget,
) -> Result<(), ReceivedError> {
    if plan.changes.is_empty() {
        return Ok(());
    }
    let count = plan.changes.len();
    let mut bytes = heap_sum([
        map_storage::<String, TemporalActorHeader>(count).ok_or_else(invalid)?,
        map_storage::<String, Vec<Category>>(count).ok_or_else(invalid)?,
        count
            .checked_mul(4 * size_of::<Category>())
            .ok_or_else(invalid)?,
        state
            .undo
            .capacity()
            .checked_add(count)
            .and_then(|n| n.checked_add(1))
            .and_then(|n| n.checked_mul(2 * size_of::<TemporalUndo>()))
            .ok_or_else(invalid)?,
    ])
    .ok_or_else(invalid)?;
    for change in &plan.changes {
        let header = &state
            .actors
            .get(&change.actor_id)
            .ok_or_else(invalid)?
            .header;
        bytes = heap_sum([
            bytes,
            change.actor_id.len().checked_mul(4).ok_or_else(invalid)?,
            header.epoch.len(),
            map_storage::<AccountClass, AccountCharge>(
                header
                    .accounts
                    .as_ref()
                    .and_then(|accounts| accounts.archives.as_ref())
                    .map_or(3, IndexMap::capacity),
            )
            .ok_or_else(invalid)?,
        ])
        .ok_or_else(invalid)?;
    }
    let mut reservation = budget.reserve(bytes).map_err(|_| invalid())?;
    let mut headers = IndexMap::<String, TemporalActorHeader>::new();
    let mut pressure = IndexMap::<String, Vec<Category>>::new();
    headers.try_reserve(count).map_err(|_| invalid())?;
    pressure.try_reserve(count).map_err(|_| invalid())?;
    for change in &plan.changes {
        if !matches!(change.kind.as_str(), "awareness" | "memory" | "summary")
            || change.id.is_empty()
            || change.revision.is_empty()
        {
            return Err(invalid());
        }
        if !reset && let Some(desired) = &change.desired {
            if let Some(payload) = &desired.payload {
                if payload.len() as u64 != desired.bytes
                    || crate::encoding::sha256_hex(payload.as_bytes()) != change.revision
                {
                    return Err(invalid());
                }
            }
        }
        if !headers.contains_key(&change.actor_id) {
            let header = state
                .actors
                .get(&change.actor_id)
                .ok_or_else(invalid)?
                .header
                .clone();
            headers.insert(change.actor_id.clone(), header);
        }
        let header = headers.get_mut(&change.actor_id).ok_or_else(invalid)?;
        let accounts = header.accounts.as_mut().ok_or_else(invalid)?;
        if accounts.archives.is_none() {
            accounts.archives = Some(IndexMap::from([
                (AccountClass::Optional, AccountCharge { bytes: 0, count: 0 }),
                (AccountClass::Required, AccountCharge { bytes: 0, count: 0 }),
                (AccountClass::Speech, AccountCharge { bytes: 0, count: 0 }),
            ]));
        }
        let mut prior = change
            .expected_prior
            .as_ref()
            .map(|charge| (charge.category, charge.bytes));
        let mut desired = change
            .desired
            .as_ref()
            .map(|charge| (charge.category, charge.bytes));
        if reset {
            std::mem::swap(&mut prior, &mut desired);
        }
        for (value, direction) in [(prior, -1i128), (desired, 1i128)] {
            if let Some((category, bytes)) = value {
                let class = category.class();
                adjust(
                    account(accounts, class),
                    direction * i128::from(bytes),
                    direction,
                )?;
                adjust(
                    accounts
                        .archives
                        .as_mut()
                        .and_then(|archives| archives.get_mut(&class))
                        .ok_or_else(invalid)?,
                    direction * i128::from(bytes),
                    direction,
                )?;
            }
        }
        if let Some((category, bytes)) = desired {
            if prior.is_none_or(|(prior_category, prior_bytes)| {
                prior_category != category || bytes > prior_bytes
            }) {
                let values = pressure.entry(change.actor_id.clone()).or_default();
                if !values.contains(&category) {
                    values.push(category);
                }
            }
        }
    }
    for (actor, pools) in pressure {
        let header = headers.get_mut(&actor).ok_or_else(invalid)?;
        let accounts = header.accounts.as_mut().ok_or_else(invalid)?;
        if pools.into_iter().any(|pool| {
            let (usage, limit) = match pool {
                Category::Optional => (&accounts.optional, &policy.optional),
                Category::Required => (&accounts.required, &policy.required),
                Category::Speech => (&accounts.speech, &policy.speech),
            };
            if pool == Category::Required {
                usage.bytes as f64
                    >= (limit.max_bytes as f64 * policy.required_pressure_start).floor()
                    || usage.count as f64
                        >= (limit.max_records as f64 * policy.required_pressure_start).floor()
            } else {
                usage.bytes > limit.max_bytes || usage.count > limit.max_records
            }
        }) {
            accounts.next_due = Some(accounts.next_due.map_or(now, |due| due.min(now)));
        }
    }
    for header in headers.values() {
        bytes = bytes
            .checked_add(
                crate::encoding::json_record_len(header)
                    .map_err(|_| invalid())?
                    .checked_mul(3)
                    .ok_or_else(invalid)?,
            )
            .ok_or_else(invalid)?;
    }
    reservation.resize(bytes).map_err(|_| invalid())?;
    state
        .undo
        .try_reserve(headers.len() + 1)
        .map_err(|_| invalid())?;
    state.undo.push(TemporalUndo::Reservation(reservation));
    for (actor, header) in headers {
        state.replace_header(&actor, header)?;
    }
    Ok(())
}
