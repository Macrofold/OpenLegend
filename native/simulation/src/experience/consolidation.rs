//! A complete, explicit partition precedes autobiographical retirement. Source
//! bodies and provenance stay native-owned; the formatter supplies reading text
//! and ICU supplies ordering, neither supplies a summary or retirement decision.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use std::mem::size_of;
mod journal;
mod manifest;

pub(crate) struct Source {
    pub reference: PersonalSourceRef,
    pub value: SqlCell,
    pub record: Arc<PersonalSourceRecord>,
    _pin: Arc<crate::host::SharedMemoryPin>,
}
impl Serialize for Source {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = s.serialize_struct("ExperienceEntry", 2)?;
        out.serialize_field("source", &self.reference.kind)?;
        out.serialize_field("value", &self.value)?;
        out.end()
    }
}
pub(super) fn cell(value: &impl Serialize) -> Result<SqlCell, ExecutionError> {
    serde_json::from_str(&json_record(value).map_err(|_| ExecutionError::Invariant)?)
        .map_err(|_| ExecutionError::Invariant)
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsolidationGroup {
    pub source_keys: Vec<String>,
    pub text: JsText,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsolidationLimits {
    pub protected_importance: f64,
    pub summary_bytes: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConsolidationFormatRequest {
    pub binding: GeometryBinding,
    pub actor_id: String,
    pub sources: Vec<Source>,
    #[serde(skip)]
    _storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsolidationFormatAnswer {
    pub binding: GeometryBinding,
    readings: Vec<JsText>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}
impl ConsolidationFormatAnswer {
    pub(crate) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, HistoryPreparationError> {
        let storage =
            crate::install::reserve_typed_parse::<Self>(text, size_of::<JsText>(), None, budget)
                .map_err(|e| match e {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
        let mut answer: Self =
            serde_json::from_str(text).map_err(|_| HistoryPreparationError::MalformedResponse)?;
        answer._storage = Some(storage);
        Ok(answer)
    }
}
impl ConsolidationFormatRequest {
    pub(crate) fn validate(
        &self,
        answer: &ConsolidationFormatAnswer,
    ) -> Result<(), HistoryPreparationError> {
        if self.binding != answer.binding {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if self.sources.len() != answer.readings.len() {
            return Err(HistoryPreparationError::MalformedResponse);
        }
        Ok(())
    }
    pub(crate) fn prepare(
        binding: GeometryBinding,
        actor: &str,
        sources: &crate::capture::PreparedNpcSources,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !sources.receipts.is_empty()
            || !sources.unavailable_personal.is_empty()
            || !sources.unavailable_receipts.is_empty()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let bound = sources
            .personal
            .iter()
            .try_fold(size_of::<Self>() + actor.len(), |n, source| {
                n.checked_add(encoded_body_bound(source.record.payload()).ok()?)
                    .and_then(|n| n.checked_add(source.record.header().reference.heap_bytes()?))
                    .and_then(|n| n.checked_add(size_of::<Source>()))
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bound)?;
        let mut values = Vec::with_capacity(sources.personal.len());
        for (index, source) in sources.personal.iter().enumerate() {
            let record = source
                .current_record()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            if source.selection != index
                || source.through.is_some()
                || record.header().actor_id != actor
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let value =
                serde_json::from_str(record.payload()).map_err(|_| ExecutionError::Invariant)?;
            values.push(Source {
                reference: record.header().reference.clone(),
                value,
                record: Arc::clone(record),
                _pin: record.capture_pin(budget)?,
            });
        }
        Ok(Self {
            binding,
            actor_id: actor.into(),
            sources: values,
            _storage: storage,
        })
    }
}
struct Draft {
    value: IndexMap<String, SqlCell>,
    manifest: manifest::Manifest,
}
pub(crate) struct PreparedConsolidation {
    actor: String,
    sources: Vec<Source>,
    retired: Vec<usize>,
    drafts: Vec<Draft>,
    _storage: ByteReservation,
}
impl PreparedConsolidation {
    pub(crate) fn prepare(
        state: &crate::simulation::SimulationState,
        request: ConsolidationFormatRequest,
        answer: ConsolidationFormatAnswer,
        job: &str,
        groups: Vec<ConsolidationGroup>,
        limits: ConsolidationLimits,
        budget: &ByteBudget,
    ) -> Result<Self, HistoryPreparationError> {
        if request.binding != answer.binding {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if request.sources.len() != answer.readings.len() {
            return Err(HistoryPreparationError::MalformedResponse);
        }
        if !limits.protected_importance.is_finite()
            || !(0.0..=10.0).contains(&limits.protected_importance)
            || limits.summary_bytes == 0
            || !is_safe_record_id(job)
            || request.sources.is_empty()
            || groups.is_empty()
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let prep = &state.installed.personal_evidence_preparation;
        if request.sources.len() as u64 > prep.rows
            || request
                .sources
                .iter()
                .try_fold(0_u64, |n, s| n.checked_add(s.record.payload().len() as u64))
                .is_none_or(|n| n > prep.bytes)
        {
            return Err(ExecutionError::Capacity.into());
        }
        let input_bytes = request
            .sources
            .iter()
            .try_fold(0usize, |n, s| {
                n.checked_add(encoded_body_bound(s.record.payload()).ok()?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let metadata = map_storage::<String, usize>(request.sources.len())
            .and_then(|n| n.checked_add(request.sources.len().checked_mul(size_of::<usize>() * 4)?))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget
            .reserve(
                input_bytes
                    .checked_mul(4)
                    .and_then(|n| n.checked_add(metadata))
                    .and_then(|n| n.checked_add(groups.heap_bytes()?))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .map_err(|_| HistoryPreparationError::Capacity)?;
        let mut positions = IndexMap::with_capacity(request.sources.len());
        let mut retired = Vec::new();
        for (index, source) in request.sources.iter().enumerate() {
            let h = source.record.header();
            if h.reference.kind == PersonalSourceKind::Memory
                && !matches!(h.record_kind.as_deref(), Some("episode" | "reflection"))
            {
                return Err(ExecutionError::InvalidCheckpoint.into());
            }
            let key = json_record(&(&h.reference.kind, &h.reference.id))
                .map_err(|_| ExecutionError::Invariant)?;
            if positions.insert(key, index).is_some() {
                return Err(ExecutionError::InvalidCheckpoint.into());
            }
            if h.importance < limits.protected_importance {
                retired.push(index);
            }
        }
        let mut through = 0usize;
        let mut drafts = Vec::with_capacity(groups.len());
        for group in groups {
            if group.source_keys.is_empty()
                || group.text.trim_is_empty()
                || group.text.utf8_len() as u64 > limits.summary_bytes
            {
                return Err(ExecutionError::InvalidCheckpoint.into());
            }
            let mut indices = Vec::with_capacity(group.source_keys.len());
            for key in group.source_keys {
                let index = *positions
                    .get(&key)
                    .ok_or(ExecutionError::InvalidCheckpoint)?;
                if index != through {
                    return Err(ExecutionError::InvalidCheckpoint.into());
                }
                through = through.checked_add(1).ok_or(ExecutionError::Capacity)?;
                indices.push(index);
            }
            if indices.iter().any(|i| {
                request.sources[*i].record.header().importance >= limits.protected_importance
            }) {
                if indices.len() != 1 || group.text != answer.readings[indices[0]] {
                    return Err(ExecutionError::InvalidCheckpoint.into());
                }
                continue;
            }
            let entries: Vec<_> = indices.iter().map(|i| &request.sources[*i]).collect();
            let first_summary = entries
                .iter()
                .find(|s| s.reference.kind == PersonalSourceKind::Summary);
            let id = first_summary
                .map(|s| s.reference.id.clone())
                .unwrap_or_else(|| format!("{job}:{}", drafts.len()));
            let revision = entries
                .iter()
                .filter(|s| s.reference.kind == PersonalSourceKind::Summary)
                .map(|s| {
                    s.value
                        .get("revision")
                        .and_then(SqlCell::as_u64)
                        .unwrap_or(0)
                })
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .filter(|n| *n <= MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?;
            let from = entries
                .iter()
                .map(|s| {
                    if s.reference.kind == PersonalSourceKind::Summary {
                        s.value
                            .get("from")
                            .and_then(SqlCell::as_f64)
                            .ok_or(ExecutionError::InvalidCheckpoint)
                    } else {
                        Ok(s.record.header().at)
                    }
                })
                .collect::<Result<Vec<_>, _>>()?
                .into_iter()
                .fold(f64::INFINITY, f64::min);
            let to = entries
                .iter()
                .map(|s| s.record.header().at)
                .fold(0.0, f64::max);
            let mut coverage = IndexMap::new();
            let mut manifest = manifest::Manifest::new();
            let mut entities = IndexSet::new();
            for source in &entries {
                if source.reference.kind == PersonalSourceKind::Summary {
                    for reference in manifest::array(&source.value, "sources")? {
                        coverage.insert(
                            json_record(reference).map_err(|_| ExecutionError::Invariant)?,
                            reference.clone(),
                        );
                    }
                } else {
                    let reference = manifest::reference_cell(&source.reference)?;
                    coverage.insert(
                        json_record(&reference).map_err(|_| ExecutionError::Invariant)?,
                        reference,
                    );
                }
                manifest.add(source)?;
                for id in manifest::array(&source.value, "entityIds")? {
                    entities.insert(
                        id.as_str()
                            .ok_or(ExecutionError::InvalidCheckpoint)?
                            .to_owned(),
                    );
                }
            }
            let mut value = IndexMap::new();
            value.insert("id".into(), id.into());
            value.insert("revision".into(), cell(&revision)?);
            value.insert("text".into(), SqlCell::Text(group.text));
            value.insert("from".into(), cell(&from)?);
            value.insert("to".into(), cell(&to)?);
            value.insert(
                "sources".into(),
                SqlCell::Array(coverage.into_values().collect()),
            );
            // Placeholder retains Source's exact property position; the native
            // attribution owner fills it after genuine ICU reference ordering.
            value.insert("manifest".into(), SqlCell::Null);
            let reasons: Vec<_> = entries
                .iter()
                .filter_map(|s| s.value.get("retention"))
                .collect();
            if let Some(reason) = reasons
                .iter()
                .find(|r| r.get("required").and_then(SqlCell::as_bool) == Some(true))
                .copied()
                .or_else(|| reasons.first().copied())
            {
                let mut reason = reason
                    .as_object()
                    .ok_or(ExecutionError::InvalidCheckpoint)?
                    .clone();
                use crate::attention::{
                    AccountRecordingInput, AccountRecordingLaw, RecordingSource,
                };
                reason.insert(
                    "afterRelease".into(),
                    cell(&state.installed.account_law().account_after_release(
                        AccountRecordingInput {
                            source: RecordingSource::Summary,
                            own: true,
                            event_type: None,
                            activity: None,
                        },
                    ))?,
                );
                value.insert("retention".into(), SqlCell::Object(reason));
            }
            value.insert(
                "entityIds".into(),
                cell(&entities.into_iter().collect::<Vec<_>>())?,
            );
            value.insert(
                "importance".into(),
                cell(
                    &entries
                        .iter()
                        .map(|s| s.record.header().importance)
                        .fold(0.0, f64::max),
                )?,
            );
            value.insert(
                "sequence".into(),
                cell(
                    &entries
                        .iter()
                        .map(|s| s.record.header().sequence.unwrap_or(0))
                        .max()
                        .unwrap_or(0),
                )?,
            );
            drafts.push(Draft { value, manifest });
        }
        if through != request.sources.len() {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        Ok(Self {
            actor: request.actor_id,
            sources: request.sources,
            retired,
            drafts,
            _storage: storage,
        })
    }
    pub(crate) fn collation_keys(&self) -> impl Iterator<Item = &str> + Clone {
        self.drafts.iter().flat_map(|draft| {
            draft
                .manifest
                .collation_keys()
                .chain(draft.value.get("id").and_then(SqlCell::as_str))
        })
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor
    }
    pub(crate) fn apply(
        mut self,
        core: &mut CoreMutation<'_>,
        ranks: &crate::language::CollationRanks,
        budget: &ByteBudget,
    ) -> Result<Vec<String>, ExecutionError> {
        let now = core.state.physical.header.sim_time;
        if core.state.physical.header.paused {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let installed = Arc::clone(&core.state.installed);
        let law = installed.account_law();
        let policy = &installed.attention.value().retention;
        let summary_collection = core
            .state
            .experience
            .optional_collection(&self.actor, PersonalSourceKind::Summary)?;
        let current_summaries = summary_collection.map_or(0, |c| c.records().len());
        let copied_summary_bytes = summary_collection
            .filter(|c| c.coverage.complete)
            .into_iter()
            .flat_map(|c| c.records())
            .try_fold(0usize, |n, r| {
                n.checked_add(encoded_body_bound(r.payload()).ok()?)
                    .and_then(|n| {
                        n.checked_add(
                            r.columns
                                .iter()
                                .try_fold(0usize, |n, v| n.checked_add(v.heap_bytes()?))?,
                        )
                    })
            })
            .ok_or(ExecutionError::Capacity)?;
        let _apply_storage = budget.reserve(
            copied_summary_bytes
                .checked_add(
                    self.sources
                        .len()
                        .checked_mul(
                            size_of::<Arc<PersonalSourceRecord>>()
                                + size_of::<crate::records::RecordPlacement>()
                                + 128,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )
                .and_then(|n| {
                    n.checked_add(
                        current_summaries
                            .checked_mul(size_of::<Arc<PersonalSourceRecord>>() * 2 + 64)?,
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        // SQL selected these exact current rows in this candidate, so ledger
        // refinement records real placements without claiming whole coverage.
        let mut placements: BTreeMap<String, Vec<crate::records::RecordPlacement>> =
            BTreeMap::new();
        for source in &self.sources {
            let h = source.record.header();
            if core
                .state
                .experience
                .actor(&self.actor)
                .is_none_or(|history| history.privacy.is_forgotten(&h.reference.id))
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            placements
                .entry(h.reference.kind.table().into())
                .or_default()
                .push(crate::records::RecordPlacement {
                    id: source.record.row_id().into(),
                    parent: source.record.parent().into(),
                    slot: source.record.slot().into(),
                    position: source.record.position(),
                });
        }
        let refined = core
            .state
            .records
            .prepare_verified_hydration(core.state.accepted_cut, &placements, &[])
            .map_err(|_| ExecutionError::Invariant)?;
        core.state
            .records
            .apply_verified_hydration(refined)
            .map_err(|_| ExecutionError::Invariant)?;
        for source in &self.sources {
            core.journal.experience.load_consolidation_source(
                &mut core.state.experience,
                Arc::clone(&source.record),
            )?;
        }
        core.journal.experience.ensure_collection(
            &mut core.state.experience,
            PersonalSourceKind::Summary,
            &self.actor,
        )?;
        let history = core
            .state
            .experience
            .actor(&self.actor)
            .ok_or(ExperienceError::ForeignOwner)?;
        let collection = history.collection(PersonalSourceKind::Summary)?;
        let complete = collection.coverage.complete;
        let mut next = collection.coverage.next_ordinal;
        let mut additions = Vec::with_capacity(self.drafts.len());
        for mut draft in self.drafts.drain(..) {
            let manifest = draft.manifest.finish(ranks)?;
            for reference in manifest::array(&manifest, "coverage")? {
                if history.privacy.is_forgotten(
                    reference
                        .get("id")
                        .and_then(SqlCell::as_str)
                        .ok_or(ExecutionError::Invariant)?,
                ) {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
            }
            draft.value.insert("manifest".into(), manifest);
            let id = draft
                .value
                .get("id")
                .and_then(SqlCell::as_str)
                .ok_or(ExecutionError::Invariant)?;
            let position = if let Some(prior) = collection.resident_record(id) {
                prior.position
            } else {
                let result = next;
                next = next
                    .checked_add(1)
                    .filter(|n| *n <= MAX_SAFE_INTEGER)
                    .ok_or(ExecutionError::Invariant)?;
                result
            };
            let value = SqlCell::Object(draft.value);
            let payload = json_record(&value).map_err(|_| ExecutionError::Invariant)?;
            if payload.len() as u64 > installed.personal_evidence_preparation.bytes
                || manifest::array(&value, "sources")?.len() as u64
                    > installed.personal_evidence_preparation.rows
            {
                return Err(ExecutionError::Capacity);
            }
            additions.push(prepare_summary(
                &self.actor,
                payload,
                position,
                now,
                &installed,
                budget,
            )?);
        }
        let before: Vec<_> = self
            .retired
            .iter()
            .map(|i| Arc::clone(&self.sources[*i].record))
            .collect();
        if before.iter().any(|r| r.header.unresolved_commitment) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut support_ids = IndexSet::new();
        let mut places_changed = false;
        for record in before.iter().chain(additions.iter()) {
            let body = super::memory::MemoryBody::decode(record.payload())?;
            let projected = body.projection()?;
            if !super::memory::columns::known_place_capsules(
                &projected,
                body.originals()?,
                &self.actor,
                now,
            )?
            .is_empty()
            {
                places_changed = true;
            }
            if let Some(receipt) = record
                .header
                .retention
                .as_ref()
                .and_then(|r| r.receipt.as_ref())
            {
                support_ids.insert(receipt.id());
            }
            if let Some(receipt) = &record.header.source_receipt {
                support_ids.insert(receipt.id());
            }
        }
        for index in &self.retired {
            if let Some(manifest) = self.sources[*index].value.get("manifest") {
                for receipt in manifest::array(manifest, "receipts")? {
                    let receipt: TemporalReceiptLocator = serde_json::from_str(
                        &json_record(receipt).map_err(|_| ExecutionError::Invariant)?,
                    )
                    .map_err(|_| ExecutionError::Invariant)?;
                    support_ids.insert(receipt.id());
                }
            }
        }
        // Existing summaries replaced under the same identity are charged once
        // as before/after, not as an unrelated new account.
        for record in &before {
            core.state.temporal.adjust_account(
                &self.actor,
                record.header.class,
                -(record.payload.len() as i128),
                -1,
                None,
                now,
                policy,
            )?;
        }
        for record in &additions {
            core.state.temporal.adjust_account(
                &self.actor,
                record.header.class,
                record.payload.len() as i128,
                1,
                experience_retention_due(&record.header, policy),
                now,
                policy,
            )?;
        }
        let _retired_index = budget.reserve(
            map_storage::<(PersonalSourceKind, &str), &Arc<PersonalSourceRecord>>(before.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let retired_by_id: IndexMap<_, _> = before
            .iter()
            .map(|r| ((r.header.reference.kind, r.header.reference.id.as_str()), r))
            .collect();
        if complete {
            let old = core
                .state
                .experience
                .actor(&self.actor)
                .ok_or(ExperienceError::ForeignOwner)?
                .collection(PersonalSourceKind::Summary)?;
            let removed: IndexSet<_> = before
                .iter()
                .filter(|r| r.header.reference.kind == PersonalSourceKind::Summary)
                .map(|r| r.header.reference.id.as_str())
                .collect();
            let mut records: Vec<_> = old
                .records()
                .filter(|r| !removed.contains(r.header.reference.id.as_str()))
                .cloned()
                .chain(additions)
                .collect();
            for record in &records {
                ranks
                    .rank(&record.header.reference.id)
                    .map_err(|_| ExecutionError::Invariant)?;
            }
            records.sort_by(|a, b| {
                a.header.at.total_cmp(&b.header.at).then_with(|| {
                    ranks
                        .compare(&a.header.reference.id, &b.header.reference.id)
                        .expect("all summary ranks admitted")
                })
            });
            let mut rows = Vec::with_capacity(records.len());
            for (position, record) in records.into_iter().enumerate() {
                if record.position == position as u64 && record.slot == position.to_string() {
                    rows.push(record);
                } else {
                    rows.push(Arc::new(PersonalSourceRecord::install(
                        PersonalSourceKind::Summary,
                        &self.actor,
                        InstalledRow {
                            id: record.row_id.clone(),
                            parent: record.parent.clone(),
                            slot: position.to_string(),
                            position: position as u64,
                            payload: record.payload.to_string(),
                            extra: record.columns.to_vec(),
                        },
                        &law,
                        budget,
                    )?));
                }
            }
            let mut after = PersonalSourceCollection {
                kind: PersonalSourceKind::Summary,
                actor_id: self.actor.clone(),
                by_ordinal: BTreeMap::new(),
                lookup: BTreeMap::new(),
                agreement_body_count: 0,
                current_open_heads_selected: false,
                sensory_selected: false,
                unresolved_selected: false,
                coverage: SourceCoverage {
                    complete: true,
                    next_ordinal: rows.len() as u64,
                    parent_present: true,
                },
            };
            for record in rows {
                if after
                    .lookup
                    .insert(record.header.reference.id.clone(), record.position)
                    .is_some()
                    || after.by_ordinal.insert(record.position, record).is_some()
                {
                    return Err(ExecutionError::Invariant);
                }
            }
            core.journal.experience.replace_summary_collection(
                &mut core.state.experience,
                &self.actor,
                after,
            )?;
        } else {
            for record in additions {
                let expected = retired_by_id
                    .get(&(
                        PersonalSourceKind::Summary,
                        record.header.reference.id.as_str(),
                    ))
                    .copied();
                let owned = Arc::try_unwrap(record).map_err(|_| ExecutionError::Invariant)?;
                if let Some(expected) = expected {
                    core.journal.experience.replace(
                        &mut core.state.experience,
                        &expected.header.reference,
                        owned,
                    )?;
                } else {
                    core.journal
                        .experience
                        .append(&mut core.state.experience, owned)?;
                }
            }
            for record in &before {
                if record.header.reference.kind == PersonalSourceKind::Summary
                    && !core
                        .state
                        .experience
                        .actor(&self.actor)
                        .ok_or(ExperienceError::ForeignOwner)?
                        .collection(PersonalSourceKind::Summary)?
                        .resident_record(&record.header.reference.id)
                        .is_some_and(|after| after.header.reference != record.header.reference)
                {
                    core.journal.experience.remove(
                        &mut core.state.experience,
                        &self.actor,
                        PersonalSourceKind::Summary,
                        &record.header.reference.id,
                    )?;
                }
            }
        }
        for record in &before {
            if record.header.reference.kind != PersonalSourceKind::Summary {
                core.journal.experience.remove(
                    &mut core.state.experience,
                    &self.actor,
                    record.header.reference.kind,
                    &record.header.reference.id,
                )?;
            }
        }
        core.journal.experience.set_consolidated_at(
            &mut core.state.experience,
            &self.actor,
            now,
        )?;
        if places_changed {
            core.journal
                .experience
                .invalidate_known_places(&mut core.state.experience, &self.actor)?;
        }
        core.state.temporal.mark_support_dirty(
            &self.actor,
            Some(&support_ids.into_iter().collect::<Vec<_>>()),
        )?;
        Ok(before
            .iter()
            .map(|r| r.header.reference.id.clone())
            .collect())
    }
}
fn prepare_summary(
    actor: &str,
    payload: String,
    position: u64,
    through: f64,
    installed: &crate::simulation::InstalledWorld,
    budget: &ByteBudget,
) -> Result<Arc<PersonalSourceRecord>, ExecutionError> {
    let _decode = budget.reserve(encoded_body_bound(&payload)?)?;
    let projected = super::header_input::header_input(&payload)?;
    let projected = object(&projected)?;
    let law = installed.account_law();
    let header = header(
        projected,
        PersonalSourceKind::Summary,
        actor,
        &payload,
        &law,
    )?;
    let extra = super::memory::memory_columns(
        projected,
        &header,
        &payload,
        &law,
        &installed.attention.value().retention,
        &installed.schema,
    )?
    .into_iter()
    .map(Into::into)
    .collect();
    let parent = collection_owner(PersonalSourceKind::Summary, actor)?;
    let id = json_record(&[
        "world",
        "experience",
        "summaries",
        actor,
        &header.reference.id,
    ])
    .map_err(|_| ExecutionError::Invariant)?;
    let record = PersonalSourceRecord::install(
        PersonalSourceKind::Summary,
        actor,
        InstalledRow {
            id,
            parent,
            slot: position.to_string(),
            position,
            payload,
            extra,
        },
        &law,
        budget,
    )?;
    let mut registry = crate::reception::OriginalRevisionRegistry::new(budget)?;
    record.validate_originals(&mut registry, through, budget)?;
    Ok(Arc::new(record))
}
impl HeapBytes for ConsolidationGroup {
    fn heap_bytes(&self) -> Option<usize> {
        self.source_keys
            .heap_bytes()?
            .checked_add(self.text.heap_bytes()?)
    }
}
