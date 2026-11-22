//! Partition exact personal readings before transport. Local handles never
//! confer another person's identity or access outside the chosen sources.

use super::{CallFailure, capacity};
use crate::{boot::CurrentServer, npc::decide::prepare::game_time};
use openlegend_simulation::{
    encoding::{json_record, json_record_len},
    experience::PersonalSourceKind,
    host::{ByteBudget, ByteReservation, CapacityError},
    records::SqlCell,
    runtime::{RuntimeConsolidationGroup, RuntimeConsolidationReadings},
    text::JsText,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::{mem::size_of, ops::Range};

pub(super) struct Partitions {
    pub values: Vec<Partition>,
    _custody: ByteReservation,
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
) -> Result<Partitions, crate::world::WorldError> {
    use openlegend_simulation::runtime::RuntimeError;

    const BASE: &str = r#"{"mode":"hourly","memoryOwner":"self","sources":{"#;
    let policy = &game.store.schema.recall.maintenance;
    let world = &game.view_policy().world;
    let budget = game.host.budget();
    let mut custody = budget
        .reserve(512 + readings.readings.len() * size_of::<Partition>())
        .map_err(RuntimeError::from)?;
    let mut values = Vec::with_capacity(readings.readings.len());
    let base_input = BASE.len() + policy.hourly_instructions.encode_utf16().count() + 4096;
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
            value.len() + handle.len() + 5 + if start == index { BASE.len() + 2 } else { 0 };
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
            prompt.push_str(BASE);
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
    Ok(Partitions {
        values,
        _custody: custody,
    })
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
    interpretation: Box<RawValue>,
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
    _custody: ByteReservation,
}

pub(super) fn decode(text: &str, budget: &ByteBudget) -> Result<Decoded, CallFailure> {
    let bytes = SqlCell::json_decode_bound(text).ok_or(CallFailure::Invalid)?;
    let custody = budget.reserve(bytes).map_err(capacity)?;
    let answer: Answer = serde_json::from_str(text).map_err(|_| CallFailure::Invalid)?;
    if !answer.feasible || answer.interpretation.get() != "null" || answer.groups.is_empty() {
        return Err(CallFailure::Invalid);
    }
    Ok(Decoded {
        groups: answer.groups,
        _custody: custody,
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
            mut _custody,
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
        _custody.resize(retained).map_err(capacity)?;
        self.custody.merge(_custody).map_err(capacity)?;
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
