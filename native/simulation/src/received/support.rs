//! Sparse personally retained support. Values are owned alongside the original
//! receipt and remain available after unrelated recent/shared storage expires.

use super::{
    ReceivedError, ReceivedValueFragment, ReceivedValues, TemporalReceipt,
    materialize_temporal_value,
};
use crate::encoding::{json_record, sha256_hex};
use crate::records::{InstalledRow, OwnerCoverage};
use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
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
    pub fn logical_bytes(&self, values: &ReceivedValues) -> Result<u64, ReceivedError> {
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
}
impl TemporalSupportRecord {
    fn install(
        row: InstalledRow,
        actor_id: &str,
        through: f64,
        values: &ReceivedValues,
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
        capsule
            .receipt
            .validate(actor_id, through, values, Some(&capsule.values))?;
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
        Ok(Self {
            id: row.id,
            parent: row.parent,
            slot: row.slot,
            position: row.position,
            payload: Arc::from(row.payload),
            capsule,
        })
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
}
impl TemporalSupportCollection {
    pub fn install(
        actor_id: &str,
        rows: Vec<InstalledRow>,
        coverage: OwnerCoverage,
        through: f64,
        values: Option<&ReceivedValues>,
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
                values.ok_or(ReceivedError(
                    "Retained support requires its actual value owner.",
                ))?,
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
        Ok(Self { records, coverage })
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
