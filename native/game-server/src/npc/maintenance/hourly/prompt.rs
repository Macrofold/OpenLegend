//! Partition exact personal readings before transport. Local handles never
//! confer another person's identity or access outside the chosen sources.

use super::{CallFailure, capacity};
use crate::{
    boot::CurrentServer, npc::decide::prepare::game_time,
    store::recall::maintenance_scan::MaintenanceQueries, world::WorldError,
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len},
    experience::PersonalSourceKind,
    host::{ByteBudget, ByteReservation, CapacityError},
    records::SqlCell,
    runtime::{
        RuntimeConsolidationDream, RuntimeConsolidationGroup, RuntimeConsolidationReadings,
        RuntimeError,
    },
    text::JsText,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{mem::size_of, ops::Range};

pub(super) struct Partitions {
    pub values: Vec<Partition>,
    custody: ByteReservation,
}

impl Partitions {
    pub(super) fn append_dream(
        &mut self,
        dream: &RuntimeConsolidationDream,
        budget: &ByteBudget,
    ) -> Result<(), WorldError> {
        let fields = dream.prompt_fields();
        let bytes = json_record_len(&fields).map_err(RuntimeError::application_refused)?;
        let _working = budget
            .reserve(
                bytes
                    .checked_mul(3)
                    .ok_or(CapacityError)
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        let fields = json_record(&fields).map_err(RuntimeError::application_refused)?;
        let prompt = &mut self.values[0].prompt;
        if !fields.starts_with('{') || !fields.ends_with('}') || !prompt.ends_with('}') {
            return Err(RuntimeError::application_refused("invalid daily context").into());
        }
        self.custody
            .resize(
                self.custody
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(CapacityError)
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        prompt
            .try_reserve_exact(bytes)
            .map_err(|_| RuntimeError::from(CapacityError))?;
        prompt.pop();
        prompt.push(',');
        prompt.push_str(&fields[1..]);
        Ok(())
    }
}

pub(super) struct DreamSchema {
    pub value: Value,
    _custody: ByteReservation,
}

/// Bind the finite strict schema originated by the Source contract to this
/// one request's opaque subject and evidence handle sets.
pub(super) fn dream_schema(
    policy: &MaintenanceQueries,
    offer: &RuntimeConsolidationDream,
    budget: &ByteBudget,
) -> Result<DreamSchema, CallFailure> {
    let subjects = offer.subject_aliases();
    let evidence = offer.evidence_aliases();
    let key = usize::from(subjects.size_hint().0 > 0) * 2 + usize::from(evidence.size_hint().0 > 0);
    let template = &policy.daily_schemas[key];
    let bytes = json_record_len(template)
        .map_err(|_| CallFailure::Invalid)?
        .checked_mul(8)
        .and_then(|n| {
            n.checked_add(
                offer
                    .subject_aliases()
                    .chain(offer.evidence_aliases())
                    .try_fold(0usize, |n, id| n.checked_add(96 + id.len()))?,
            )
        })
        .ok_or_else(|| capacity(CapacityError))?;
    let storage = budget.reserve(bytes).map_err(capacity)?;
    let mut template = template.clone();
    let subjects = subjects
        .map(|alias| Value::String(alias.to_owned()))
        .collect::<Vec<_>>();
    let evidence = evidence
        .map(|alias| Value::String(alias.to_owned()))
        .collect::<Vec<_>>();
    fn bind(value: &mut Value, subjects: &[Value], evidence: &[Value]) -> usize {
        match value {
            Value::Object(fields) => {
                let marker = fields.get("const").and_then(Value::as_str).or_else(|| {
                    let [marker] = fields.get("enum")?.as_array()?.as_slice() else {
                        return None;
                    };
                    marker.as_str()
                });
                let choices = match marker {
                    Some("__OPENLEGEND_DREAM_SUBJECT__") => Some(subjects),
                    Some("__OPENLEGEND_DREAM_EVIDENCE__") => Some(evidence),
                    _ => None,
                };
                if let Some(choices) = choices.filter(|choices| !choices.is_empty()) {
                    fields.remove("const");
                    fields.insert("enum".to_owned(), Value::Array(choices.to_vec()));
                    1
                } else {
                    fields
                        .values_mut()
                        .map(|value| bind(value, subjects, evidence))
                        .sum()
                }
            }
            Value::Array(values) => values
                .iter_mut()
                .map(|value| bind(value, subjects, evidence))
                .sum(),
            _ => 0,
        }
    }
    if bind(&mut template, &subjects, &evidence)
        != usize::from(!subjects.is_empty()) + usize::from(!evidence.is_empty())
    {
        return Err(CallFailure::Invalid);
    }
    Ok(DreamSchema {
        value: template,
        _custody: storage,
    })
}

pub(super) struct Partition {
    pub routine: Range<usize>,
    pub prompt: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Reading<'a> {
    experience: Experience<'a>,
    at: &'a str,
    chronological_position: usize,
    existing_summary: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Experience<'a> {
    source: PersonalSourceKind,
    handle: &'a str,
    owner: &'static str,
    time_unit: &'static str,
    value: Facts<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Facts<'a> {
    at: f64,
    summary: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_type: Option<&'a str>,
}

/// Prepare one network string per admitted partition. The authoritative
/// ticket and owned personal reading remain independent of these strings.
pub(super) fn partitions(
    readings: &RuntimeConsolidationReadings,
    game: &CurrentServer,
    daily: bool,
) -> Result<Partitions, crate::world::WorldError> {
    let base = if daily {
        r#"{"mode":"daily","memoryOwner":"self","sources":{"#
    } else {
        r#"{"mode":"hourly","memoryOwner":"self","sources":{"#
    };
    let policy = &game.store.schema.recall.maintenance;
    let world = &game.view_policy().world;
    let budget = game.host.budget();
    let mut custody = budget
        .reserve(512 + readings.readings.len() * size_of::<Partition>())
        .map_err(RuntimeError::from)?;
    let mut values = Vec::with_capacity(readings.readings.len());
    let base_input = base.len() + policy.hourly_instructions.encode_utf16().count() + 4096;
    let mut input = base_input;
    let mut output = 128;
    let mut prompt = String::new();
    let mut start = 0;
    let mut index = 0;
    for (position, reading) in readings.readings.iter().enumerate() {
        if reading.protected {
            continue;
        }
        let handle = format!("s{index}");
        let event_time = game_time(reading.at, world.offset_hours, world.day_label.as_deref());
        let fields = Reading {
            experience: Experience {
                source: reading.kind,
                handle: &handle,
                owner: "self",
                time_unit: "game seconds",
                value: Facts {
                    at: reading.at,
                    summary: &reading.text,
                    source: reading.source.as_deref(),
                    event_type: reading.event_type.as_deref(),
                },
            },
            at: &event_time,
            chronological_position: position,
            existing_summary: reading.kind == PersonalSourceKind::Summary,
        };
        let measured = json_record_len(&fields).map_err(RuntimeError::application_refused)?;
        let _fragment = budget
            .reserve(
                measured
                    .checked_mul(3)
                    .ok_or(CapacityError)
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        let value = json_record(&fields).map_err(RuntimeError::application_refused)?;
        let item = value.encode_utf16().count() + handle.len() + 5;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Singleton<'a> {
            source_ids: [&'a str; 1],
            text: &'a JsText,
        }
        let answer = Singleton {
            source_ids: [&handle],
            text: &reading.text,
        };
        let bound = json_record_len(&answer).map_err(RuntimeError::application_refused)?;
        let _estimate = budget
            .reserve(
                bound
                    .checked_mul(3)
                    .ok_or(CapacityError)
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        let answer = json_record(&answer)
            .map_err(RuntimeError::application_refused)?
            .encode_utf16()
            .count();
        let exceeds = |input: usize, output: usize| {
            input + item > policy.input_characters || output + answer > policy.output_characters
        };
        if start != index && exceeds(input, output) {
            finish_partition(&mut values, &mut prompt, start..index);
            start = index;
            input = base_input;
            output = 128;
        }
        if exceeds(input, output) {
            return Err(RuntimeError::application_refused(
                "one memory exceeds its consolidation allowance",
            )
            .into());
        }
        let addition =
            value.len() + handle.len() + 5 + if start == index { base.len() + 2 } else { 0 };
        custody
            .resize(
                custody
                    .bytes()
                    .checked_add(addition)
                    .ok_or(CapacityError)
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        prompt
            .try_reserve_exact(addition)
            .map_err(|_| RuntimeError::from(CapacityError))?;
        if start == index {
            prompt.push_str(base);
        } else {
            prompt.push(',');
        }
        prompt.push('"');
        prompt.push_str(&handle);
        prompt.push_str("\":");
        prompt.push_str(&value);
        index += 1;
        input += item;
        output += answer;
    }
    if start != index {
        finish_partition(&mut values, &mut prompt, start..index);
    }
    if values.is_empty() {
        return Err(RuntimeError::application_refused(
            "consolidation requires an eligible routine account",
        )
        .into());
    }
    Ok(Partitions { values, custody })
}

fn finish_partition(values: &mut Vec<Partition>, prompt: &mut String, routine: Range<usize>) {
    prompt.push_str("}}");
    values.push(Partition {
        routine,
        prompt: std::mem::take(prompt),
    });
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Answer {
    feasible: bool,
    interpretation: SqlCell,
    groups: Vec<Group>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Group {
    source_ids: Vec<String>,
    text: JsText,
}

pub(super) struct Decoded {
    groups: Vec<Group>,
    pub(super) interpretation: Option<SqlCell>,
    pub(super) custody: ByteReservation,
}

pub(super) fn decode(
    text: &str,
    budget: &ByteBudget,
    interpreting: bool,
) -> Result<Decoded, CallFailure> {
    let bytes = SqlCell::json_decode_bound(text).ok_or(CallFailure::Invalid)?;
    let custody = budget.reserve(bytes).map_err(capacity)?;
    let answer: Answer = serde_json::from_str(text).map_err(|_| CallFailure::Invalid)?;
    if !answer.feasible || answer.groups.is_empty() {
        return Err(CallFailure::Invalid);
    }
    let interpretation = match answer.interpretation {
        SqlCell::Null => None,
        object @ SqlCell::Object(_) if interpreting => Some(object),
        _ => return Err(CallFailure::Invalid),
    };
    Ok(Decoded {
        groups: answer.groups,
        interpretation,
        custody,
    })
}

pub(super) struct Coverage {
    routine: Vec<(usize, String)>,
    covered: usize,
    groups: Vec<(usize, RuntimeConsolidationGroup)>,
    custody: ByteReservation,
}

impl Coverage {
    pub(super) fn new(
        mut readings: RuntimeConsolidationReadings,
        budget: &ByteBudget,
    ) -> Result<Self, CallFailure> {
        let count = readings.readings.len();
        let mut custody = budget
            .reserve(
                512 + count
                    * (size_of::<(usize, RuntimeConsolidationGroup)>()
                        + size_of::<RuntimeConsolidationGroup>()
                        + size_of::<(usize, String)>()
                        + size_of::<String>()),
            )
            .map_err(capacity)?;
        let mut groups = Vec::with_capacity(count);
        let mut routine = Vec::with_capacity(count);
        let mut retained = 0;
        for (position, item) in readings.readings.into_iter().enumerate() {
            retained += item.key.capacity();
            if item.protected {
                retained += item.text.storage_bytes();
                groups.push((
                    position,
                    RuntimeConsolidationGroup {
                        source_keys: vec![item.key],
                        text: item.text,
                    },
                ));
            } else {
                routine.push((position, item.key));
            }
        }
        // Only the private keys and protected originals are still held.
        // The routine reading text has already become the provider prompt.
        readings.custody.resize(retained).map_err(capacity)?;
        custody.merge(readings.custody).map_err(capacity)?;
        Ok(Self {
            routine,
            covered: 0,
            groups,
            custody,
        })
    }

    /// Each partition must cover its complete ordered handle range. Groups
    /// can never cross a protected position.
    pub(super) fn accept(
        &mut self,
        range: Range<usize>,
        decoded: Decoded,
        max_bytes: u64,
    ) -> Result<(), CallFailure> {
        if self.covered != range.start {
            return Err(CallFailure::Invalid);
        }
        let Decoded {
            groups,
            mut custody,
            ..
        } = decoded;
        let mut retained = 0;
        for group in groups {
            if group.source_ids.is_empty() || group.source_ids.len() > range.end - self.covered {
                return Err(CallFailure::Invalid);
            }
            let first = self.routine[self.covered].0;
            let mut old = None;
            let mut keys = Vec::with_capacity(group.source_ids.len());
            for id in group.source_ids {
                let index = self.covered;
                if index >= range.end || id != format!("s{index}") {
                    return Err(CallFailure::Invalid);
                }
                let (position, key) = &mut self.routine[index];
                if old.is_some_and(|last| last + 1 != *position) {
                    return Err(CallFailure::Invalid);
                }
                keys.push(std::mem::take(key));
                self.covered += 1;
                old = Some(*position);
            }
            let text = group.text.trimmed();
            if text.units_len() == 0 || text.utf8_len() as u64 > max_bytes {
                return Err(CallFailure::Invalid);
            }
            retained += text.storage_bytes();
            self.groups.push((
                first,
                RuntimeConsolidationGroup {
                    source_keys: keys,
                    text,
                },
            ));
        }
        if self.covered != range.end {
            return Err(CallFailure::Invalid);
        }
        custody.resize(retained).map_err(capacity)?;
        self.custody.merge(custody).map_err(capacity)?;
        Ok(())
    }

    pub(super) fn finish(
        mut self,
    ) -> Result<(Vec<RuntimeConsolidationGroup>, ByteReservation), CallFailure> {
        if self.covered != self.routine.len() {
            return Err(CallFailure::Invalid);
        }
        self.groups.sort_unstable_by_key(|(position, _)| *position);
        Ok((
            self.groups.into_iter().map(|(_, group)| group).collect(),
            self.custody,
        ))
    }
}
