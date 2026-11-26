//! An optional appraisal offer uses the same personal facts and current
//! feeling records as the rest of this decision. It never requests new recall.
use super::{CallFailure, PersonalSource, PersonalSources, alias, capacity, packet_failure};
use crate::decision_render::{AppraisalScale, DecisionPolicy, tree_bytes};
use openlegend_simulation::{
    capture::NpcAliasOrdinal,
    experience::PersonalSourceKind,
    host::{ByteReservation, CapacityError},
    runtime::{AppraisalSelection, AppraisalSourceAlias, PersonalOrdinal, RuntimeNpcRead},
};
use serde_json::{Value, json};
use std::collections::HashMap;

pub(super) struct Input<'a> {
    pub current: &'a RuntimeNpcRead,
    pub original: &'a RuntimeNpcRead,
    pub sources: Option<&'a PersonalSources>,
    pub rows: &'a [(usize, &'a PersonalSource)],
    pub trigger: Option<usize>,
    pub canonical: &'a HashMap<&'a str, String>,
    pub refs: &'a [String],
    pub key: &'a str,
}

pub(super) struct Offering {
    pub context: Value,
    pub schema: Value,
    pub selection: AppraisalSelection,
}

pub(super) fn prepare(
    policy: &DecisionPolicy,
    input: Input<'_>,
    experience: &mut [Value],
    custody: &mut ByteReservation,
) -> Result<Option<Offering>, CallFailure> {
    if policy.appraisal_policies.is_empty() {
        return Ok(None);
    }
    let records = input
        .current
        .appraisal_records()
        .ok_or(CallFailure::Invalid)?;
    let feelings = input.current.feelings().map_err(packet_failure)?;
    let editable = |pin| policy.appraisal_policies.iter().find(|law| &law.pin == pin);
    let editable_count = records
        .clone()
        .filter(|record| editable(record.pin).is_some())
        .count();
    let cause_count = input.rows.len().min(policy.appraisal_source_limit);
    if editable_count == 0 && cause_count == 0 {
        return Ok(None);
    }

    let template = policy.appraisal_template().ok_or(CallFailure::Invalid)?;
    let policies = &policy.appraisal_policies;
    // Each offered value shape copies one static schema variant plus bounded
    // aliases. The context owns separate captions and each cause's visible
    // subject aliases until either the reply or optional follow-up finishes.
    let schema_bytes = tree_bytes(template)
        .checked_add(
            (cause_count + input.refs.len())
                .checked_mul(128)
                .ok_or_else(exhausted)?,
        )
        .and_then(|per_variant| {
            per_variant.checked_mul(policies.len().checked_add(editable_count)?.checked_add(1)?)
        })
        .ok_or_else(exhausted)?;
    let context_bytes = 2048usize
        .checked_add(
            policies
                .iter()
                .try_fold(0usize, |sum, law| {
                    sum.checked_add(
                        law.label
                            .len()
                            .checked_add(law.lifetime.len())?
                            .checked_add(1024)?,
                    )
                })
                .ok_or_else(exhausted)?,
        )
        .and_then(|bytes| bytes.checked_add(feelings.admitted_bytes().checked_mul(2)?))
        .and_then(|bytes| bytes.checked_add(editable_count.checked_mul(1024)?))
        .and_then(|bytes| {
            bytes.checked_add(
                cause_count
                    .checked_mul(1024usize.checked_add(input.refs.len().checked_mul(128)?)?)?,
            )
        })
        .ok_or_else(exhausted)?;
    custody
        .resize(
            custody
                .bytes()
                .checked_add(schema_bytes)
                .and_then(|bytes| bytes.checked_add(context_bytes))
                .ok_or_else(exhausted)?,
        )
        .map_err(capacity)?;

    let mut policy_display = Vec::new();
    let mut policy_bindings = Vec::new();
    let mut record_display = Vec::new();
    let mut record_bindings = Vec::new();
    let mut create = Vec::new();
    let mut reframe = Vec::new();
    let mut cause_display = Vec::new();
    let mut cause_bindings = Vec::new();
    let mut trigger = None;
    let selected = input
        .trigger
        .into_iter()
        .chain((0..input.rows.len()).filter(|index| Some(*index) != input.trigger));
    for index in selected.take(cause_count) {
        let (ordinal, entry) = input.rows[index];
        let inventory = input.sources.ok_or(CallFailure::Invalid)?.ordinal;
        let (coverage, subjects) = input
            .original
            .appraisal_cause(inventory, ordinal)
            .ok_or(CallFailure::Stale("decision-appraisal-source"))?;
        let handle = alias(input.key, "appraisal-cause", index);
        let reference = alias(input.key, "appraisal-experience", index);
        experience[index]["reference"] = json!(&reference);
        cause_display.push(json!({
            "handle":handle,"experience":{"reference":reference},"coverage":coverage,
            "subjects":subjects.iter().filter_map(|subject| input.canonical.get(subject.as_str())).collect::<Vec<_>>(),
        }));
        cause_bindings.push(AppraisalSourceAlias {
            alias: handle,
            inventory,
            ordinal,
        });
        if Some(index) == input.trigger && entry.reference.kind == PersonalSourceKind::Awareness {
            trigger = Some(PersonalOrdinal { inventory, ordinal });
        }
    }

    for law in policies.iter().filter(|_| !cause_bindings.is_empty()) {
        let handle = alias(input.key, "appraisal-policy", law.ordinal);
        policy_display.push(
            json!({"handle":handle,"label":law.label,"value":law.value,"lifetime":law.lifetime}),
        );
        create.push((handle.clone(), law.value));
        policy_bindings.push(NpcAliasOrdinal {
            alias: handle,
            ordinal: law.ordinal,
        });
    }
    for (law, record) in records.filter_map(|record| Some((editable(record.pin)?, record))) {
        let feeling = feelings
            .values
            .get(record.ordinal)
            .ok_or(CallFailure::Invalid)?;
        let handle = alias(input.key, "appraisal-record", record.ordinal);
        let value = match feeling.intensity {
            Some((value, _, _)) => json!({"kind":"scaled","value":value}),
            None => json!({"kind":"qualitative"}),
        };
        let subject = record.target.and_then(|id| input.canonical.get(id));
        record_display.push(json!({
            "handle":handle,"revision":record.revision,"label":feeling.feeling,
            "subject":subject,"value":value,"lifetime":feeling.lifetime,"coverage":feeling.coverage,
        }));
        reframe.push((handle.clone(), law.value));
        record_bindings.push(NpcAliasOrdinal {
            alias: handle,
            ordinal: record.ordinal,
        });
    }

    let causes = cause_bindings
        .iter()
        .map(|source| source.alias.as_str())
        .collect::<Vec<_>>();
    let schema = bind_schema(template, &create, &reframe, &causes, input.refs)?;
    let context =
        json!({"policies":policy_display,"feelings":record_display,"sources":cause_display});
    Ok(Some(Offering {
        context,
        schema,
        selection: AppraisalSelection::decision(
            policy_bindings,
            record_bindings,
            cause_bindings,
            trigger,
        ),
    }))
}

/// Reuse the release's exact create, reframe and resolve shapes. Add the
/// authorized aliases and each definition's value range to that shape.
fn bind_schema(
    template: &Value,
    create: &[(String, AppraisalScale)],
    records: &[(String, AppraisalScale)],
    causes: &[&str],
    targets: &[String],
) -> Result<Value, CallFailure> {
    let variants = template["anyOf"].as_array().ok_or(CallFailure::Invalid)?;
    let get = |kind: &str| {
        variants
            .iter()
            .find(|variant| variant["properties"]["kind"]["const"] == kind)
            .cloned()
            .ok_or(CallFailure::Invalid)
    };
    let mut bound = Vec::new();
    if !causes.is_empty() {
        for (kind, key, offers) in [
            ("create", "definition", create),
            ("reframe", "appraisal", records),
        ] {
            for (handle, scale) in offers {
                let mut schema = get(kind)?;
                let properties = schema["properties"]
                    .as_object_mut()
                    .ok_or(CallFailure::Invalid)?;
                properties.get_mut(key).ok_or(CallFailure::Invalid)?["const"] = json!(handle);
                properties.get_mut("source").ok_or(CallFailure::Invalid)?["enum"] = json!(causes);
                if kind == "create" {
                    properties.get_mut("target").ok_or(CallFailure::Invalid)?["enum"] = json!(
                        targets
                            .iter()
                            .map(|target| Some(target.as_str()))
                            .chain([None])
                            .collect::<Vec<_>>()
                    );
                }
                let variant = properties["value"]["anyOf"]
                    .as_array()
                    .and_then(|values| {
                        values.iter().find(|value| {
                            value["properties"]["kind"]["const"]
                                == match scale {
                                    AppraisalScale::Qualitative => "qualitative",
                                    AppraisalScale::Scaled { .. } => "scaled",
                                }
                        })
                    })
                    .ok_or(CallFailure::Invalid)?;
                let mut value = variant.clone();
                if let AppraisalScale::Scaled { min, max } = scale {
                    value["properties"]["value"]["minimum"] = json!(min);
                    value["properties"]["value"]["maximum"] = json!(max);
                }
                properties.insert("value".into(), value);
                bound.push(schema);
            }
        }
    }
    if !records.is_empty() {
        let mut schema = get("resolve")?;
        schema["properties"]["appraisal"]["enum"] =
            json!(records.iter().map(|(handle, _)| handle).collect::<Vec<_>>());
        bound.push(schema);
    }
    Ok(json!({"anyOf": bound}))
}

fn exhausted() -> CallFailure {
    capacity(CapacityError)
}
