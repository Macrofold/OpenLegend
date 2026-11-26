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
pub(crate) fn visit_agreements(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut emit: impl FnMut(&str, u64, &str) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    use serde::Deserialize;
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Awareness {
        event_data: Data,
    }
    #[derive(Deserialize)]
    struct Data {
        agreement: JsText,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Acquired {
        id: String,
        revision: u64,
        proposer_id: String,
        recipient_id: String,
        status: String,
        expires_at: f64,
        end_at: Option<f64>,
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
    let now = state.physical.header.sim_time;
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
        let text = data
            .event_data
            .agreement
            .json_document()
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let record: Acquired =
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
            "pending" => record.expires_at > now,
            "accepted" => record.end_at.is_some_and(|at| at > now),
            "ended" => false,
            _ => return Err(ExecutionError::InvalidCheckpoint),
        } {
            emit(&record.id, record.revision, other)?;
        }
        keys += record.id.capacity();
        custody.resize(
            keys + map_storage::<String, ()>(seen.len() + 1).ok_or(ExecutionError::Capacity)?,
        )?;
        seen.insert(record.id);
    }
    Ok(())
}
