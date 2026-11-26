//! Cooperative episode rules supplied by this world's selected social-offer definition.
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::text::JsText;
use crate::values::DefinitionPin;
use indexmap::IndexMap;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CooperationPolicy {
    pub episode_seconds: f64,
    pub arrival_metres: f64,
    pub families: Vec<String>,
    pub ceasefire_seconds: f64,
    pub help_methods: Vec<DefinitionPin>,
    pub description: JsText,
    pub labels: IndexMap<String, JsText>,
}

impl CooperationPolicy {
    pub(crate) fn valid(&self) -> bool {
        [
            self.episode_seconds,
            self.arrival_metres,
            self.ceasefire_seconds,
        ]
        .into_iter()
        .all(|n| n.is_finite() && n > 0.)
            && self.help_methods.iter().all(DefinitionPin::is_valid)
    }

    pub(crate) fn supports(&self, family: &str) -> bool {
        self.families.iter().any(|value| value == family)
    }
}

heap_record!(CooperationPolicy {
    families,
    help_methods,
    description,
    labels
});

use crate::{
    execution::ExecutionError,
    experience::PersonalSourceKind,
    host::{ByteBudget, map_storage},
    simulation::SimulationState,
};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CooperationReceipt {
    pub id: String,
    pub revision: u64,
    pub proposer_id: String,
    pub recipient_id: String,
    pub status: String,
    pub expires_at: f64,
    pub end_at: Option<f64>,
    pub terms: crate::records::SqlCell,
    pub amendment: Option<crate::records::SqlCell>,
}

impl CooperationReceipt {
    pub(crate) fn available_at(&self, now: f64) -> bool {
        match self.status.as_str() {
            "pending" => self.expires_at > now,
            "accepted" => self.end_at.is_some_and(|at| at > now),
            _ => false,
        }
    }
}
pub(crate) fn visit_agreements(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut emit: impl FnMut(&str, u64, &str) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    visit_receipts(state, actor, budget, |r, _, companion| {
        if r.available_at(state.physical.header.sim_time) {
            emit(&r.id, r.revision, companion)?;
        }
        Ok(())
    })
}

/// Visit each newest retained personal agreement once. The record and proof
/// remain borrowed for the call; copy only the published projection.
pub(crate) fn visit_receipts(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut emit: impl FnMut(
        &CooperationReceipt,
        &crate::experience::PersonalSourceRef,
        &str,
    ) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    use serde::Deserialize;
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Awareness {
        retention_class: String,
        event_data: Data,
    }
    #[derive(Deserialize)]
    struct Data {
        agreement: JsText,
    }
    let Some(history) = state.experience.actor(actor) else {
        return Ok(());
    };
    let Some(records) = state
        .experience
        .optional_collection(actor, PersonalSourceKind::Awareness)?
    else {
        return Ok(());
    };
    if !records.may_have_current_agreements()? {
        return Ok(());
    }
    let mut seen = indexmap::IndexSet::new();
    let mut custody = budget.reserve(0)?;
    let mut keys = 0;
    for row in records.records().rev() {
        let header = row.header();
        if header.event_type.as_deref() != Some("cooperation")
            || history.privacy.revoked(&header.reference.id)
            || header
                .event_id
                .as_ref()
                .is_some_and(|id| history.privacy.revoked(id))
        {
            continue;
        }
        let _scope = budget.reserve(crate::experience::encoded_body_bound(row.payload())?)?;
        let data: Awareness =
            serde_json::from_str(row.payload()).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        if data.retention_class != "memory" {
            continue;
        }
        let text = data
            .event_data
            .agreement
            .json_document()
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let record: CooperationReceipt =
            serde_json::from_str(&text).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        if seen.contains(&record.id) {
            continue;
        }
        let other = if record.proposer_id == actor {
            &record.recipient_id
        } else if record.recipient_id == actor {
            &record.proposer_id
        } else {
            return Err(ExecutionError::InvalidCheckpoint);
        };
        if match record.status.as_str() {
            "pending" | "accepted" => true,
            "ended" => false,
            _ => return Err(ExecutionError::InvalidCheckpoint),
        } {
            emit(&record, &header.reference, other)?;
        }
        keys += record.id.capacity();
        custody.resize(
            keys + map_storage::<String, ()>(seen.len() + 1).ok_or(ExecutionError::Capacity)?,
        )?;
        seen.insert(record.id);
    }
    Ok(())
}
