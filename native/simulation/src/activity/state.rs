//! Canonical selected action history, original SQL placement and derived live
//! references. Completed history remains independent of personal result access.

use super::*;
use crate::commands::{ActivityOutput, CooperationBinding, NativeCommand, Outcome};
use crate::experience::EmptyChildOwner;
use crate::identity::MAX_SAFE_INTEGER;
use crate::records::{InstalledRow, OwnerCoverage};
use crate::state::UnconvertedField;
use crate::values::{deserialize_present_safe_integer, deserialize_safe_integer};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;

// Source list cursors use -1 for "before the first member". They remain
// JavaScript safe integers, including JSON 1.0; null cannot erase a supplied one.
fn deserialize_cursor<'de, D: serde::Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
    let n = f64::deserialize(d)?;
    if n.is_finite() && n >= -1.0 && n <= MAX_SAFE_INTEGER as f64 && n.fract() == 0.0 {
        Ok(n as i64)
    } else {
        Err(serde::de::Error::custom("Invalid action-learning cursor."))
    }
}
fn deserialize_present_cursor<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> Result<Option<i64>, D::Error> {
    deserialize_cursor(d).map(Some)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub nodes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub depth: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub iterations: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub wait_seconds: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub facts: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub detail_entries: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub text: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub outputs: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub links: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidates: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub definitions: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub acquisitions: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub page: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub expanded_work: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub assessed: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub assessment_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub acquisition_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub record_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub retained_records: u64,
}
impl ActivityLimits {
    pub(crate) fn display(
        &self,
        display_bytes: usize,
    ) -> Result<ActivityDisplayLimits, ActivityError> {
        let count = |n: u64| usize::try_from(n).map_err(|_| ActivityError::Capacity);
        Ok(ActivityDisplayLimits {
            text: count(self.text)?,
            detail_entries: count(self.detail_entries)?,
            facts: count(self.facts)?,
            nodes: count(self.nodes)?,
            depth: count(self.depth)?,
            display_bytes,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub admitted: u64,
    pub occurrences: EmptyChildOwner,
    pub methods: EmptyChildOwner,
    pub acquisitions: EmptyChildOwner,
    pub learning: EmptyChildOwner,
    pub current: EmptyChildOwner,
    pub active: EmptyChildOwner,
    pub items: EmptyChildOwner,
    pub changes: EmptyChildOwner,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ActivityStatus {
    Running,
    Completed,
    Blocked,
    Cancelled,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ConnectionKind {
    Material,
    Support,
    State,
    Purpose,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityConnection {
    pub from: String,
    pub relation: ConnectionKind,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub port: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityObject {
    pub kind: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_version: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_digest: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityEffect {
    pub id: String,
    pub subject_id: String,
    pub label: crate::text::JsText,
    pub property: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<String>,
    pub before: ActivityScalar,
    pub after: ActivityScalar,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityOccurrence {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attack_execution: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cooperation: Option<CooperationBinding>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub release: Option<UnconvertedField>,
    pub id: String,
    pub actor_id: String,
    pub command_id: String,
    pub action_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub parent_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub parent_name: Option<crate::text::JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub method_id: Option<String>,
    pub at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ended_at: Option<f64>,
    pub command: NativeCommand,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub objects: IndexMap<String, ActivityObject>,
    pub view: ActivityView,
    pub status: ActivityStatus,
    pub outputs: Vec<ActivityOutput>,
    pub connections: Vec<ActivityConnection>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub outcome: Option<Outcome>,
    pub evidence_ids: Vec<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub result_evidence: Option<ResultEvidence>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub effects: Option<Vec<ActivityEffect>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub revoked: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub incomplete: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub stock_resolution: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub no_learning_control: Option<bool>,
}
impl ActivityOccurrence {
    pub(crate) fn validate(
        &self,
        actor_id: &str,
        limits: &ActivityLimits,
        display: &ActivityDisplayLimits,
    ) -> Result<(), ActivityError> {
        if self.attack_execution.is_some()
            || self.release.is_some()
            || self.stock_resolution.is_some()
            || self.method_id.is_some()
        {
            return Err(ActivityError::UnsupportedFamily);
        }
        if self.actor_id != actor_id
            || !is_safe_record_id(&self.id)
            || !is_safe_record_id(&self.action_id)
            || self.command.envelope().id != self.id
            || self.command.envelope().actor_id != actor_id
            || self.command_id != self.id
            || !self.at.is_finite()
            || self.at < 0.0
            || self
                .parent_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
            || self
                .parent_name
                .as_ref()
                .is_some_and(|name| name.trim_is_empty() || name.units_len() as u64 > limits.text)
            || self.outputs.len() as u64 > limits.outputs
            || self.connections.len() as u64 > limits.links
            || self.evidence_ids.len() as u64 > limits.links
            || self.evidence_ids.iter().any(|id| !is_safe_record_id(id))
            || self.command.envelope().human_initiated.is_some()
            || self.command.envelope().combat_help_id.is_some()
            || self.command.envelope().cooperation.is_some()
            || self
                .cooperation
                .as_ref()
                .is_some_and(|binding| !is_safe_record_id(&binding.id) || binding.revision == 0)
        {
            return Err(ActivityError::InvalidStructure);
        }
        if self.status != ActivityStatus::Running
            && (self
                .ended_at
                .is_none_or(|at| !at.is_finite() || at < self.at)
                || self.outcome.is_none())
        {
            return Err(ActivityError::InvalidStructure);
        }
        if let Some(evidence) = &self.result_evidence {
            evidence.validate(actor_id)?;
            if matches!(evidence,ResultEvidence::Recent{subject,..}if subject!=&self.id) {
                return Err(ActivityError::InvalidEvidence);
            }
        }
        for output in &self.outputs {
            if ![output.port.as_str(), &output.item_id, &output.definition_id]
                .into_iter()
                .all(is_safe_record_id)
                || output.quantity == 0
                || output.quantity > MAX_SAFE_INTEGER
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        for link in &self.connections {
            if !is_safe_record_id(&link.from)
                || link.from == self.id
                || link.quantity.is_some_and(|n| !n.is_finite() || n <= 0.0)
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        if let Some(effects) = &self.effects {
            let mut ids = BTreeSet::new();
            if effects.len() as u64 > limits.outputs
                || effects.iter().any(|effect| {
                    !is_safe_record_id(&effect.id)
                        || !ids.insert(&effect.id)
                        || !is_safe_record_id(&effect.subject_id)
                        || effect.label.trim_is_empty()
                        || effect.label.units_len() as u64 > limits.text
                        || js_trim(&effect.property).is_empty()
                        || effect.property.encode_utf16().count() as u64 > limits.text
                        || effect
                            .unit
                            .as_ref()
                            .is_some_and(|text| text.encode_utf16().count() as u64 > limits.text)
                        || [&effect.before, &effect.after]
                            .iter()
                            .any(|value| match value {
                                ActivityScalar::Number(n) => !n.is_finite(),
                                ActivityScalar::String(text) => {
                                    text.units_len() as u64 > limits.text
                                }
                                _ => false,
                            })
                })
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        let bytes =
            crate::encoding::json_record_len(self).map_err(|_| ActivityError::InvalidStructure)?;
        if bytes as u64 > limits.record_bytes {
            return Err(ActivityError::Capacity);
        }
        project_activity(
            &self.view,
            None,
            display,
            display.display_bytes,
            display.depth,
        )?;
        Ok(())
    }
}

pub(crate) struct ActivityRecord {
    pub occurrence: ActivityOccurrence,
    pub position: u64,
    pub slot: String,
    pub(super) storage: crate::host::ByteReservation,
}
pub(crate) struct ActivityCollection {
    pub actor_id: String,
    pub complete: bool,
    pub next_ordinal: u64,
    pub parent_present: bool,
    pub records: IndexMap<String, ActivityRecord>,
    pub order: BTreeMap<u64, String>,
    // The source searches in original list order. Keep only an address index,
    // including all equal-action addresses, rather than scan personal history.
    pub(super) actions: BTreeMap<String, BTreeMap<u64, String>>,
    pub(super) storage: crate::host::ByteReservation,
}
impl ActivityCollection {
    pub(crate) fn install(
        actor_id: String,
        rows: Vec<InstalledRow>,
        coverage: OwnerCoverage,
        limits: &ActivityLimits,
        display: &ActivityDisplayLimits,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, ActivityError> {
        let parent = crate::encoding::json_record(&[
            "world",
            "actionExperience",
            "occurrences",
            actor_id.as_str(),
        ])
        .map_err(|_| ActivityError::InvalidStructure)?;
        if !is_safe_record_id(&actor_id)
            || coverage.table != "activity_occurrences"
            || coverage.owner != parent
            || coverage.next_ordinal > MAX_SAFE_INTEGER
            || (!coverage.parent_present && !rows.is_empty())
        {
            return Err(ActivityError::InvalidStructure);
        }
        let mut records = IndexMap::new();
        let mut order = BTreeMap::new();
        let mut actions: BTreeMap<String, BTreeMap<u64, String>> = BTreeMap::new();
        for row in rows {
            let occurrence: ActivityOccurrence =
                serde_json::from_str(&row.payload).map_err(|_| ActivityError::UnsupportedFamily)?;
            occurrence.validate(&actor_id, limits, display)?;
            let id = crate::encoding::json_record(&[
                "world",
                "actionExperience",
                "occurrences",
                actor_id.as_str(),
                occurrence.id.as_str(),
            ])
            .map_err(|_| ActivityError::InvalidStructure)?;
            if row.id != id
                || row.parent != parent
                || row.position >= coverage.next_ordinal
                || records.contains_key(&occurrence.id)
                || order.insert(row.position, occurrence.id.clone()).is_some()
            {
                return Err(ActivityError::InvalidStructure);
            }
            let extra = serde_json::json!([
                actor_id,
                occurrence.id,
                occurrence.at,
                occurrence.status,
                occurrence.parent_id,
                occurrence.result_evidence.as_ref().map(ResultEvidence::id)
            ]);
            if crate::encoding::json_record(&row.extra)
                .map_err(|_| ActivityError::InvalidStructure)?
                != crate::encoding::json_record(&extra)
                    .map_err(|_| ActivityError::InvalidStructure)?
            {
                return Err(ActivityError::InvalidStructure);
            }
            actions
                .entry(occurrence.action_id.clone())
                .or_default()
                .insert(row.position, occurrence.id.clone());
            records.insert(
                occurrence.id.clone(),
                ActivityRecord::installed(occurrence, row.position, row.slot, budget)?,
            );
        }
        let storage = budget
            .reserve(
                actor_id
                    .capacity()
                    .checked_add(
                        crate::host::retained_size::map_storage::<String, ActivityRecord>(
                            records.capacity(),
                        )
                        .ok_or(ActivityError::Capacity)?,
                    )
                    .ok_or(ActivityError::Capacity)?,
            )
            .map_err(|_| ActivityError::Capacity)?;
        Ok(Self {
            actor_id,
            complete: coverage.complete,
            next_ordinal: coverage.next_ordinal,
            parent_present: coverage.parent_present,
            records,
            order,
            actions,
            storage,
        })
    }
    pub(crate) fn get(&self, id: &str) -> Result<Option<&ActivityRecord>, ActivityError> {
        if let Some(record) = self.records.get(id) {
            return Ok(Some(record));
        }
        if self.complete {
            Ok(None)
        } else {
            Err(ActivityError::Unavailable)
        }
    }
    pub(super) fn action_record(
        &self,
        action_id: &str,
    ) -> Result<Option<&ActivityRecord>, ActivityError> {
        match self
            .actions
            .get(action_id)
            .and_then(|rows| rows.first_key_value())
        {
            Some((_, id)) => self.get(id),
            None if self.complete => Ok(None),
            None => Err(ActivityError::Unavailable),
        }
    }
    pub(super) fn index_action(
        &mut self,
        id: &str,
        position: u64,
        old: Option<&str>,
        new: Option<&str>,
    ) {
        index_action_map(&mut self.actions, id, position, old, new);
    }
}

pub(super) fn index_action_map(
    actions: &mut BTreeMap<String, BTreeMap<u64, String>>,
    id: &str,
    position: u64,
    old: Option<&str>,
    new: Option<&str>,
) {
    if let Some(old) = old {
        if let Some(rows) = actions.get_mut(old) {
            rows.remove(&position);
            if rows.is_empty() {
                actions.remove(old);
            }
        }
    }
    if let Some(new) = new {
        actions
            .entry(new.to_owned())
            .or_default()
            .insert(position, id.to_owned());
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityReference {
    pub actor_id: String,
    pub occurrence_id: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LearningInspection {
    pub event_id: String,
    #[serde(deserialize_with = "deserialize_cursor")]
    pub after: i64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub method_after: Option<u64>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LearningCursor {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub inspection: Option<LearningInspection>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub after: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_cursor",
        skip_serializing_if = "Option::is_none"
    )]
    pub position: Option<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub examined: Option<Vec<String>>,
    pub pending: Vec<String>,
    pub assessed: Vec<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityItemSource {
    pub actor_id: String,
    pub occurrence_id: String,
    pub port: String,
    pub quantity: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ambiguous: Option<bool>,
}

pub(crate) struct ActivityState {
    pub header: ActivityHeader,
    pub collections: IndexMap<String, ActivityCollection>,
    pub learning: IndexMap<String, LearningCursor>,
    pub current: IndexMap<String, String>,
    pub active: IndexMap<String, ActivityReference>,
    pub items: IndexMap<String, Vec<ActivityItemSource>>,
    pub changes: IndexMap<String, Vec<ActivityReference>>,
    pub limits: Arc<ActivityLimits>,
    pub display: Arc<ActivityDisplayLimits>,
    pub(super) metadata_bytes: usize,
    pub(super) metadata_storage: crate::host::ByteReservation,
}
impl ActivityState {
    pub(crate) fn occurrence_for(
        &self,
        actor_id: &str,
        action_id: &str,
    ) -> Result<Option<&ActivityOccurrence>, ActivityError> {
        let Some(collection) = self.collections.get(actor_id) else {
            return Ok(None);
        };
        collection
            .action_record(action_id)
            .map(|record| record.map(|record| &record.occurrence))
    }
    /// Methods/acquisitions have no selected producer/consumer yet: their real
    /// nonempty input remains unclaimed/refused by the complete installer.
    pub(crate) fn install(
        header: ActivityHeader,
        collections: IndexMap<String, ActivityCollection>,
        learning: IndexMap<String, LearningCursor>,
        current: IndexMap<String, String>,
        active: IndexMap<String, ActivityReference>,
        items: IndexMap<String, Vec<ActivityItemSource>>,
        changes: IndexMap<String, Vec<ActivityReference>>,
        limits: Arc<ActivityLimits>,
        display: Arc<ActivityDisplayLimits>,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, ActivityError> {
        if header.version != 1 || header.admitted > limits.retained_records {
            return Err(ActivityError::InvalidStructure);
        }
        let mut ids = BTreeSet::new();
        let mut all: BTreeMap<&str, (&str, &ActivityRecord)> = BTreeMap::new();
        let mut count = 0_u64;
        for (actor, collection) in &collections {
            if actor != &collection.actor_id {
                return Err(ActivityError::InvalidStructure);
            }
            for (id, record) in &collection.records {
                if !ids.insert(id) {
                    return Err(ActivityError::InvalidStructure);
                }
                count = count.checked_add(1).ok_or(ActivityError::Capacity)?;
                all.insert(id, (actor, record));
            }
        }
        if count > header.admitted {
            return Err(ActivityError::InvalidStructure);
        }
        for (actor, owner) in &collections {
            for record in owner.records.values() {
                for link in &record.occurrence.connections {
                    if let Some((other_actor, source)) = all.get(link.from.as_str()) {
                        if actor.as_str() != *other_actor
                            || source.occurrence.at > record.occurrence.at
                            || source.position >= record.position
                        {
                            return Err(ActivityError::InvalidStructure);
                        }
                    }
                }
            }
        }
        for cursor in learning.values() {
            if cursor.assessed.len() as u64 > limits.assessed
                || crate::encoding::json_record_len(&cursor.assessed)
                    .map_err(|_| ActivityError::InvalidStructure)? as u64
                    > limits.assessment_bytes
                || cursor.pending.len() as u64 > limits.page
                || cursor
                    .examined
                    .as_ref()
                    .is_some_and(|values| values.len() as u64 > limits.visits)
                || cursor
                    .pending
                    .iter()
                    .chain(cursor.examined.iter().flatten())
                    .any(|id| !is_safe_record_id(id))
                || cursor
                    .inspection
                    .as_ref()
                    .is_some_and(|inspection| !is_safe_record_id(&inspection.event_id))
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        for (action, reference) in &active {
            let entry = collections
                .get(&reference.actor_id)
                .ok_or(ActivityError::InvalidStructure)?
                .get(&reference.occurrence_id)?
                .ok_or(ActivityError::InvalidStructure)?;
            if &entry.occurrence.action_id != action
                || entry.occurrence.status != ActivityStatus::Running
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        for (actor, action) in &current {
            if active
                .get(action)
                .is_none_or(|reference| &reference.actor_id != actor)
            {
                return Err(ActivityError::InvalidStructure);
            }
        }
        let mut state = Self {
            header,
            collections,
            learning,
            current,
            active,
            items,
            changes,
            limits,
            display,
            metadata_bytes: 0,
            metadata_storage: budget.reserve(0).map_err(|_| ActivityError::Capacity)?,
        };
        state.install_metadata()?;
        Ok(state)
    }
    pub(crate) fn active(
        &self,
        action_id: &str,
    ) -> Result<Option<&ActivityOccurrence>, ActivityError> {
        let Some(reference) = self.active.get(action_id) else {
            return Ok(None);
        };
        self.collections
            .get(&reference.actor_id)
            .ok_or(ActivityError::InvalidStructure)?
            .get(&reference.occurrence_id)
            .map(|record| record.map(|record| &record.occurrence))
    }
}
