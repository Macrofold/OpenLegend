//! Sparse personally retained support. Values are owned alongside the original
//! receipt and remain available after unrelated recent/shared storage expires.

use super::{
    ReceivedError, ReceivedValueFragment, ReceivedValues, TemporalReceipt,
    materialize_temporal_value,
};
use crate::encoding::{json_record, sha256_hex};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::{InstalledRow, OwnerCoverage};
use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::mem::{align_of, size_of};
use std::sync::Arc;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TemporalSupportCapsule {
    pub receipt: Arc<TemporalReceipt>,
    pub values: Arc<[ReceivedValueFragment]>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    pub required: bool,
}
impl TemporalSupportCapsule {
    pub fn logical_bytes(
        &self,
        values: &impl crate::reception::ReceivedValueLookup,
    ) -> Result<u64, ReceivedError> {
        let mut bytes = json_record(self)
            .map_err(|_| ReceivedError("Retained support encoding failed."))?
            .len() as i128;
        for (field, value) in self.receipt.facets.iter().zip(self.values.iter()) {
            let fragment_bytes = json_record(value)
                .map_err(|_| ReceivedError("Support value encoding failed."))?
                .len() as i128;
            let expanded = materialize_temporal_value(field, value, values).ok_or(
                ReceivedError("Retained support has no matching personal reception."),
            )?;
            let expanded_bytes = json_record(&expanded)
                .map_err(|_| ReceivedError("Support reception encoding failed."))?
                .len() as i128;
            let reception_bytes = field
                .reception
                .as_ref()
                .map(|reception| {
                    json_record(reception)
                        .map(|encoded| ("reception".len() + 4 + encoded.len()) as i128)
                })
                .transpose()
                .map_err(|_| ReceivedError("Support reception encoding failed."))?
                .unwrap_or(0);
            bytes += expanded_bytes - fragment_bytes - reception_bytes;
        }
        u64::try_from(bytes).map_err(|_| ReceivedError("Retained support charge overflow."))
    }
}

#[derive(Debug)]
pub struct TemporalSupportRecord {
    pub(super) id: String,
    pub(super) parent: String,
    pub(super) slot: String,
    pub(super) position: u64,
    pub(super) payload: Arc<str>,
    pub(super) capsule: TemporalSupportCapsule,
    // Receipt/value custody survives acceptance and every detached record Arc.
    // A required/optional promotion shares unchanged content, but owns its new
    // immutable SQL payload and placement separately.
    pub(super) body_storage: Arc<crate::host::ResidentReservation>,
    pub(super) storage: crate::host::ResidentReservation,
}
impl TemporalSupportRecord {
    pub(crate) fn capture_pins(
        &self,
        budget: &ByteBudget,
    ) -> Result<
        (
            Arc<crate::host::SharedMemoryPin>,
            Arc<crate::host::SharedMemoryPin>,
        ),
        ReceivedError,
    > {
        Ok((
            self.storage
                .capture_pin(budget)
                .map_err(|_| ReceivedError("Retained support capture exceeds native allowance."))?,
            self.body_storage
                .capture_pin(budget)
                .map_err(|_| ReceivedError("Retained support capture exceeds native allowance."))?,
        ))
    }
    pub(crate) fn retain_for_candidate(&self, budget: &ByteBudget) -> Result<(), ReceivedError> {
        budget
            .retain_record(&self.storage)
            .and_then(|_| budget.retain_record(&self.body_storage))
            .map_err(|_| ReceivedError("Retained support before-image exceeds native allowance."))
    }
    fn install(
        row: InstalledRow,
        actor_id: &str,
        through: f64,
        values: &impl crate::reception::ReceivedValueLookup,
        budget: &ByteBudget,
        activity_limits: &crate::activity::ActivityDisplayLimits,
    ) -> Result<Self, ReceivedError> {
        let capsule: TemporalSupportCapsule = serde_json::from_str(&row.payload)
            .map_err(|_| ReceivedError("Invalid current retained support body."))?;
        let parent = json_record(&["world", "experience", "temporal", "actors", actor_id])
            .map_err(|_| ReceivedError("Support owner encoding failed."))?;
        let id = json_record(&[
            "world",
            "experience",
            "temporal",
            "actors",
            actor_id,
            "supports",
            &capsule.receipt.id,
        ])
        .map_err(|_| ReceivedError("Support identity encoding failed."))?;
        if row.id != id
            || row.parent != parent
            || row.slot != capsule.receipt.id
            || capsule.values.len() != capsule.receipt.facets.len()
        {
            return Err(ReceivedError(
                "Retained support has foreign ownership or incomplete values.",
            ));
        }
        capsule.receipt.validate(
            actor_id,
            through,
            values,
            Some(&capsule.values),
            activity_limits,
        )?;
        if capsule.logical_bytes(values)? != capsule.bytes {
            return Err(ReceivedError("Retained support charge disagrees."));
        }
        let locator = &capsule.receipt.locator;
        let columns = [
            Value::from(actor_id),
            Value::from(capsule.receipt.id.clone()),
            Value::from(capsule.bytes),
            Value::from(u64::from(capsule.required)),
            Value::from(sha256_hex(row.payload.as_bytes())),
            Value::from(locator.physical_life),
            Value::from(locator.epoch.clone()),
            Value::from(locator.batch_order),
            Value::from(locator.entry_index),
        ];
        if json_record(&columns)
            .map_err(|_| ReceivedError("Support projection encoding failed."))?
            != json_record(&row.extra)
                .map_err(|_| ReceivedError("Support projection encoding failed."))?
        {
            return Err(ReceivedError(
                "Retained support columns disagree with its body.",
            ));
        }
        let body_storage = Self::fund_body(&capsule, None, budget)?;
        let storage =
            Self::fund_record(&row.id, &row.parent, &row.slot, row.payload.len(), budget)?;
        Ok(Self {
            body_storage,
            storage,
            id: row.id,
            parent: row.parent,
            slot: row.slot,
            position: row.position,
            payload: Arc::from(row.payload),
            capsule,
        })
    }
    pub(super) fn fund_body(
        capsule: &TemporalSupportCapsule,
        prior: Option<&Self>,
        budget: &ByteBudget,
    ) -> Result<Arc<crate::host::ResidentReservation>, ReceivedError> {
        if let Some(prior) = prior.filter(|prior| {
            Arc::ptr_eq(&prior.capsule.receipt, &capsule.receipt)
                && Arc::ptr_eq(&prior.capsule.values, &capsule.values)
        }) {
            return Ok(Arc::clone(&prior.body_storage));
        }
        let error = || ReceivedError("Retained support body exceeds native allowance.");
        let bytes = capsule
            .values
            .iter()
            .try_fold(
                heap_sum([
                    size_of::<TemporalReceipt>(),
                    2 * size_of::<usize>() + align_of::<TemporalReceipt>() - 1,
                    capsule.receipt.heap_bytes().ok_or_else(error)?,
                    capsule
                        .values
                        .len()
                        .checked_mul(size_of::<ReceivedValueFragment>())
                        .ok_or_else(error)?,
                    2 * size_of::<usize>() + align_of::<ReceivedValueFragment>() - 1,
                    size_of::<crate::host::ResidentReservation>()
                        + 2 * size_of::<usize>()
                        + align_of::<crate::host::ResidentReservation>()
                        - 1,
                ])
                .ok_or_else(error)?,
                |n, value| n.checked_add(value.heap_bytes()?),
            )
            .ok_or_else(error)?;
        Ok(Arc::new(budget.reserve_record(bytes).map_err(|_| error())?))
    }
    pub(super) fn fund_record(
        id: &str,
        parent: &str,
        slot: &str,
        payload_bytes: usize,
        budget: &ByteBudget,
    ) -> Result<crate::host::ResidentReservation, ReceivedError> {
        let error = || ReceivedError("Retained support record exceeds native allowance.");
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>() + align_of::<Self>() - 1,
            id.len(),
            parent.len(),
            slot.len(),
            payload_bytes,
            2 * size_of::<usize>(),
            // The canonical member key is a separate string. Collection backing
            // remains with its actual map after removals empty that map.
            slot.len(),
        ])
        .ok_or_else(error)?;
        budget.reserve_record(bytes).map_err(|_| error())
    }
    pub fn capsule(&self) -> &TemporalSupportCapsule {
        &self.capsule
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
    pub fn row_id(&self) -> &str {
        &self.id
    }
    pub fn parent(&self) -> &str {
        &self.parent
    }
    pub fn slot(&self) -> &str {
        &self.slot
    }
    pub fn position(&self) -> u64 {
        self.position
    }
}

#[derive(Debug)]
pub struct TemporalSupportCollection {
    pub(super) records: IndexMap<String, Arc<TemporalSupportRecord>>,
    pub(super) coverage: OwnerCoverage,
    backing: crate::host::ResidentReservation,
    budget: ByteBudget,
}
impl TemporalSupportCollection {
    /// A newly created history has no support rows. Creation needs no activity
    /// formatter; decoding existing capsules retains that separate dependency.
    pub(crate) fn new_empty(actor_id: &str, budget: &ByteBudget) -> Result<Self, ReceivedError> {
        let path = ["world", "experience", "temporal", "actors", actor_id];
        let error = || ReceivedError("Retained support owner exceeds native allowance.");
        let length = crate::encoding::json_record_len(&path).map_err(|_| error())?;
        let _encoding = budget
            .reserve(length.checked_mul(2).ok_or_else(error)?)
            .map_err(|_| error())?;
        let mut backing = budget
            .reserve_backing(
                length
                    .checked_mul(2)
                    .and_then(|n| n.checked_add("mind_temporal_supports".len()))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let owner = json_record(&path).map_err(|_| error())?;
        backing
            .resize(
                owner
                    .capacity()
                    .checked_add("mind_temporal_supports".len())
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        Ok(Self {
            records: IndexMap::new(),
            coverage: OwnerCoverage {
                table: "mind_temporal_supports".to_owned(),
                owner,
                complete: true,
                next_ordinal: 0,
                parent_present: false,
            },
            backing,
            budget: budget.clone(),
        })
    }
    pub fn install(
        actor_id: &str,
        rows: Vec<InstalledRow>,
        coverage: OwnerCoverage,
        through: f64,
        values: Option<&ReceivedValues>,
        budget: &ByteBudget,
        activity_limits: &crate::activity::ActivityDisplayLimits,
    ) -> Result<Self, ReceivedError> {
        let owner = json_record(&["world", "experience", "temporal", "actors", actor_id])
            .map_err(|_| ReceivedError("Support owner encoding failed."))?;
        if coverage.table != "mind_temporal_supports"
            || coverage.owner != owner
            || (!coverage.parent_present && !rows.is_empty())
        {
            return Err(ReceivedError("Invalid retained support coverage."));
        }
        let mut records = IndexMap::new();
        for row in rows {
            let record = TemporalSupportRecord::install(
                row,
                actor_id,
                through,
                &values,
                budget,
                activity_limits,
            )?;
            if record.position >= coverage.next_ordinal
                || records
                    .insert(record.capsule.receipt.id.clone(), Arc::new(record))
                    .is_some()
            {
                return Err(ReceivedError(
                    "Duplicate retained support identity or invalid ordinal.",
                ));
            }
        }
        let bytes = map_storage::<String, Arc<TemporalSupportRecord>>(records.capacity())
            .and_then(|n| n.checked_add(coverage.table.capacity()))
            .and_then(|n| n.checked_add(coverage.owner.capacity()))
            .ok_or(ReceivedError("Retained support map allocation overflow."))?;
        Ok(Self {
            records,
            coverage,
            backing: budget
                .reserve_backing(bytes)
                .map_err(|_| ReceivedError("Retained support map exceeds native allowance."))?,
            budget: budget.clone(),
        })
    }
    pub(super) fn reserve_insert(&mut self) -> Result<(), ReceivedError> {
        if self.records.len() < self.records.capacity() {
            return Ok(());
        }
        let error = || ReceivedError("Retained support map exceeds native allowance.");
        let target = self
            .records
            .capacity()
            .checked_add(1)
            .and_then(|n| n.checked_mul(2))
            .ok_or_else(error)?;
        let fixed = self
            .coverage
            .table
            .capacity()
            .checked_add(self.coverage.owner.capacity())
            .ok_or_else(error)?;
        self.budget
            .resize_backing(
                &mut self.backing,
                fixed
                    .checked_add(
                        map_storage::<String, Arc<TemporalSupportRecord>>(target)
                            .ok_or_else(error)?,
                    )
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        self.records
            .try_reserve(target - self.records.len())
            .map_err(|_| error())?;
        let actual = fixed
            .checked_add(
                map_storage::<String, Arc<TemporalSupportRecord>>(self.records.capacity())
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?;
        // The forecast precedes the allocator; tightening to its actual capacity
        // cannot require capacity after the semantic map has changed.
        if actual > self.backing.bytes() {
            return Err(error());
        }
        self.backing.resize(actual).map_err(|_| error())
    }
    pub fn records(&self) -> impl Iterator<Item = &Arc<TemporalSupportRecord>> {
        self.records.values()
    }
    pub fn coverage(&self) -> &OwnerCoverage {
        &self.coverage
    }
    pub fn get(&self, id: &str) -> Result<Option<&Arc<TemporalSupportRecord>>, ReceivedError> {
        match self.records.get(id) {
            Some(record) => Ok(Some(record)),
            None if self.coverage.complete => Ok(None),
            None => Err(ReceivedError(
                "Retained support requires its original cold coverage.",
            )),
        }
    }
}
