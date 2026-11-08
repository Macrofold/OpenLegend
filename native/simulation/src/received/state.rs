//! Temporal actor ownership, complete recent directories and explicit residency.
//! Resident page tails are never interpreted as complete history. Cold records
//! retain original physical and logical coordinates at their accepted cut.

use super::{
    CoverageGap, ReceivedChargeDirectory, ReceivedError, ReceivedFrontier, ReceivedRecentDirectory,
    ReceivedValues, TemporalCurrentGroupCheckpoint, TemporalPageRecord, TemporalReceipt,
    TemporalReceiptLocator,
};
use crate::encoding::json_record;
use crate::experience::EmptyChildOwner;
use crate::records::{InstalledRow, OwnerCoverage};
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalStateHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub namespace: String,
    pub actors: EmptyChildOwner,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AccountCharge {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountClass {
    Optional,
    Required,
    Speech,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalAccounts {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub next_due: Option<f64>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub knowledge_due: Option<f64>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub support_dirty_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub support_settled_revision: u64,
    pub optional: AccountCharge,
    pub required: AccountCharge,
    pub speech: AccountCharge,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub archives: Option<IndexMap<AccountClass, AccountCharge>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalActorHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    /// Current record codec child-presence marker. Actual rows are separately
    /// owned; an inline page would be an incompatible transport.
    pub pages: [(); 0],
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub terminal_reserved_bytes: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub next_due: Option<f64>,
    pub maintenance_due: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub released_through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub frontier: Option<ReceivedFrontier>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording_gap: Option<CoverageGap>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub accounts: Option<TemporalAccounts>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub supports: Option<EmptyChildOwner>,
}

#[derive(Debug)]
pub struct TemporalActorHistory {
    actor_id: String,
    header: TemporalActorHeader,
    payload: Arc<str>,
    pages: BTreeMap<u64, Arc<TemporalPageRecord>>,
    complete_pages: bool,
    next_page_ordinal: u64,
    recent: ReceivedRecentDirectory,
}

fn finite_optional(value: Option<f64>) -> bool {
    value.is_none_or(f64::is_finite)
}

impl TemporalActorHistory {
    /// Complete canonical block directories can cover cold pages without making
    /// their bodies resident. Checkpoints are the actual current owners used to
    /// reconcile secured terminal bytes, never a supplied aggregate promise.
    pub fn install(
        actor_id: String,
        row: InstalledRow,
        pages: Vec<Arc<TemporalPageRecord>>,
        coverage: OwnerCoverage,
        directories: &[ReceivedChargeDirectory],
        recordings: &[&TemporalCurrentGroupCheckpoint],
        through: f64,
    ) -> Result<Self, ReceivedError> {
        let header: TemporalActorHeader = serde_json::from_str(&row.payload)
            .map_err(|_| ReceivedError("Invalid current temporal actor encoding."))?;
        let parent = json_record(&["world", "experience", "temporal"])
            .map_err(|_| ReceivedError("Temporal actor owner encoding failed."))?;
        let id = json_record(&["world", "experience", "temporal", "actors", &actor_id])
            .map_err(|_| ReceivedError("Temporal actor identity encoding failed."))?;
        if !is_safe_record_id(&actor_id)
            || row.id != id
            || row.parent != parent
            || row.slot != actor_id
            || coverage.table != "mind_temporal_pages"
            || coverage.owner != id
            || !coverage.parent_present
            || !finite_optional(header.next_due)
            || header.accounts.as_ref().is_some_and(|accounts| {
                !finite_optional(accounts.next_due)
                    || !finite_optional(accounts.knowledge_due)
                    || accounts.support_settled_revision > accounts.support_dirty_revision
                    || accounts.archives.as_ref().is_some_and(|archives| {
                        archives.len() != 3
                            || [
                                AccountClass::Optional,
                                AccountClass::Required,
                                AccountClass::Speech,
                            ]
                            .iter()
                            .any(|class| !archives.contains_key(class))
                    })
            })
        {
            return Err(ReceivedError(
                "Invalid temporal actor ownership or maintenance.",
            ));
        }
        if let Some(frontier) = &header.frontier {
            if frontier
                .expired_through_time
                .is_some_and(|at| !at.is_finite() || at > through)
                || frontier
                    .pressure_through
                    .as_ref()
                    .is_some_and(|pressure| !pressure.received_at.is_finite())
            {
                return Err(ReceivedError("Invalid received eligibility frontier."));
            }
        }
        let pressure = header
            .frontier
            .as_ref()
            .and_then(|frontier| frontier.pressure_through.as_ref());
        let expected = vec![
            Value::from(actor_id.clone()),
            Value::from(header.next_due),
            Value::from(
                header
                    .frontier
                    .as_ref()
                    .and_then(|frontier| frontier.expired_through_time),
            ),
            Value::from(pressure.map(|pressure| pressure.address.batch_order)),
            Value::from(pressure.map(|pressure| pressure.address.entry_index)),
            Value::from(pressure.map(|pressure| pressure.address.member_index)),
            Value::from(pressure.map(|pressure| pressure.received_at)),
            Value::from(pressure.map(|pressure| pressure.order)),
            Value::from(header.bytes),
            Value::from(header.count),
        ];
        if expected != row.extra {
            return Err(ReceivedError(
                "Temporal actor columns disagree with its payload.",
            ));
        }
        let mut reserved = 0_u64;
        for recording in recordings {
            if recording.epoch != header.epoch
                || recording.last_source.observer.actor_id != actor_id
                || recording.last_source.observer.physical_life != header.physical_life
            {
                return Err(ReceivedError("Foreign temporal terminal reservation."));
            }
            if !recording.gap {
                reserved = reserved
                    .checked_add(
                        recording
                            .terminal_bytes
                            .checked_mul(recording.members.len() as u64)
                            .ok_or(ReceivedError("Temporal terminal reservation overflow."))?,
                    )
                    .ok_or(ReceivedError("Temporal terminal reservation overflow."))?;
            }
        }
        if reserved != header.terminal_reserved_bytes {
            return Err(ReceivedError(
                "Recording terminal reservations disagree with current owners.",
            ));
        }
        if directories
            .iter()
            .any(|directory| directory.actor_id != actor_id)
        {
            return Err(ReceivedError("Foreign temporal charge directory."));
        }
        let recent = ReceivedRecentDirectory::install(
            directories,
            header.frontier.as_ref(),
            Some((header.bytes, header.count)),
        )?;
        let mut installed = BTreeMap::new();
        for page in pages {
            if page.actor_id() != actor_id
                || page.position() >= coverage.next_ordinal
                || installed.insert(page.position(), page).is_some()
            {
                return Err(ReceivedError(
                    "Temporal resident page ownership or ordinal disagrees.",
                ));
            }
        }
        Ok(Self {
            actor_id,
            header,
            payload: Arc::from(row.payload),
            pages: installed,
            complete_pages: coverage.complete,
            next_page_ordinal: coverage.next_ordinal,
            recent,
        })
    }
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub fn header(&self) -> &TemporalActorHeader {
        &self.header
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
    pub fn pages(&self) -> impl Iterator<Item = &Arc<TemporalPageRecord>> {
        self.pages.values()
    }
    pub fn complete_pages(&self) -> bool {
        self.complete_pages
    }
    pub fn next_page_ordinal(&self) -> u64 {
        self.next_page_ordinal
    }
    pub fn recent(&self) -> &ReceivedRecentDirectory {
        &self.recent
    }
    pub fn receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&std::collections::BTreeSet<u64>>,
    ) -> Result<Option<TemporalReceipt>, ReceivedError> {
        if locator.actor_id != self.actor_id {
            return Err(ReceivedError("Foreign temporal receiver."));
        }
        for page in self.pages.values() {
            if let Some(receipt) = page.receipt(locator, members)? {
                return Ok(Some(receipt));
            }
        }
        if self.complete_pages {
            Ok(None)
        } else {
            Err(ReceivedError(
                "Temporal receipt requires original cold coverage.",
            ))
        }
    }
}

#[derive(Debug)]
pub struct TemporalState {
    generation: String,
    header: TemporalStateHeader,
    actors: IndexMap<String, TemporalActorHistory>,
}

impl TemporalState {
    pub fn install(
        generation: String,
        header: TemporalStateHeader,
        actors: IndexMap<String, TemporalActorHistory>,
    ) -> Result<Self, ReceivedError> {
        if generation.is_empty()
            || header.version != 1
            || actors
                .iter()
                .any(|(actor, history)| actor != history.actor_id())
        {
            return Err(ReceivedError("Invalid received history owner."));
        }
        Ok(Self {
            generation,
            header,
            actors,
        })
    }
    pub fn generation(&self) -> &str {
        &self.generation
    }
    pub fn header(&self) -> &TemporalStateHeader {
        &self.header
    }
    pub fn actor(&self, id: &str) -> Option<&TemporalActorHistory> {
        self.actors.get(id)
    }
}
