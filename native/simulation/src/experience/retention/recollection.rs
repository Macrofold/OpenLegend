//! Natural release coarsens only the account it already owns. Dated claims and
//! receipts remain fallible provenance, never a reconstruction of cold facts.
use super::*;
use crate::received::TemporalReceiptLocator;
use crate::records::SqlCell;
use crate::text::JsText;
use serde_json::value::RawValue;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Coordinate {
    batch_order: u64,
    entry_index: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Span {
    actor_id: String,
    physical_life: u64,
    epoch: String,
    family: &'static str,
    from: Coordinate,
    through: Coordinate,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Impression<'a> {
    version: u64,
    from: f64,
    through: f64,
    claims: Vec<SqlCell>,
    provenance: Vec<Span>,
    dependencies: Vec<Box<RawValue>>,
    reason: RetentionReason,
    created_at: f64,
    reinforced_at: f64,
    weaken_at: f64,
    expires_at: f64,
    weakened: bool,
    #[serde(skip)]
    _source: std::marker::PhantomData<&'a ()>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Recollection<'a> {
    id: &'a str,
    actor_id: &'a str,
    kind: &'static str,
    source: &'static str,
    summary: &'a JsText,
    at: f64,
    entity_ids: Vec<String>,
    importance: f64,
    impression: Impression<'a>,
}
#[derive(Deserialize)]
struct Manifest {
    #[serde(default)]
    receipts: Vec<TemporalReceiptLocator>,
    #[serde(default)]
    coverage: Vec<Box<RawValue>>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fading {
    weaken_at: f64,
    expires_at: f64,
    weakened: bool,
    claims: Vec<Box<RawValue>>,
}
fn raw<T: Serialize>(value: &T) -> Result<Box<RawValue>, ExecutionError> {
    RawValue::from_string(json_record(value).map_err(|_| ExecutionError::Invariant)?)
        .map_err(|_| ExecutionError::Invariant)
}
fn cell<T: Serialize>(value: &T) -> Result<SqlCell, ExecutionError> {
    serde_json::from_str(&json_record(value).map_err(|_| ExecutionError::Invariant)?)
        .map_err(|_| ExecutionError::Invariant)
}
fn claim(kind: &str, fields: impl IntoIterator<Item = (&'static str, SqlCell)>) -> SqlCell {
    let mut value = IndexMap::new();
    value.insert("kind".to_owned(), SqlCell::Text(kind.into()));
    value.extend(
        fields
            .into_iter()
            .map(|(key, value)| (key.to_owned(), value)),
    );
    SqlCell::Object(value)
}
fn fade(mut body: memory::MemoryBody, now: f64) -> Result<Option<String>, ExecutionError> {
    let value: Fading = body.get("impression")?.ok_or(ExecutionError::Invariant)?;
    if value.expires_at <= now {
        return Ok(None);
    }
    if value.weakened || value.weaken_at > now {
        return Ok(Some(body.encoded()?));
    }
    #[derive(Deserialize)]
    struct Kind<'a> {
        #[serde(borrow)]
        kind: &'a str,
    }
    let mut claims = Vec::with_capacity(value.claims.len());
    for value in value.claims {
        if serde_json::from_str::<Kind<'_>>(value.get())
            .map_err(|_| ExecutionError::Invariant)?
            .kind
            == "occurrence"
        {
            claims.push(value);
        }
    }
    if claims.is_empty() {
        return Ok(None);
    }
    let mut impression: IndexMap<String, Box<RawValue>> =
        body.get("impression")?.ok_or(ExecutionError::Invariant)?;
    impression.insert("claims".to_owned(), raw(&claims)?);
    impression.insert("weakened".to_owned(), raw(&true)?);
    body.set("summary", &JsText::from(""))?;
    body.set("impression", &impression)?;
    Ok(Some(body.encoded()?))
}
pub(super) fn released(
    record: &PersonalSourceRecord,
    summary: Option<&JsText>,
    now: f64,
    installed: &InstalledWorld,
) -> Result<Option<String>, ExecutionError> {
    let body = memory::MemoryBody::decode(record.payload())?;
    if record.header.impression.is_some() {
        return fade(body, now);
    }
    let Some(retention) = record
        .header
        .retention
        .as_ref()
        .filter(|r| r.after_release == AccountAfterRelease::Impression)
    else {
        return Ok(None);
    };
    let Some(locator) = retention.receipt.as_ref() else {
        return Ok(None);
    };
    if record.header.record_kind.as_deref() == Some("commitment") {
        return Ok(None);
    }
    let summary = match record.header.reference.kind {
        PersonalSourceKind::Awareness => crate::narration::native_text(
            &body
                .get::<crate::narration::NativeText>("text")?
                .ok_or(ExecutionError::Invariant)?,
        ),
        PersonalSourceKind::Memory => body
            .get::<JsText>("summary")?
            .ok_or(ExecutionError::Invariant)?,
        PersonalSourceKind::Summary => summary.cloned().ok_or(ExecutionError::Invariant)?,
    };
    let manifest = body.get::<Manifest>("manifest")?;
    let receipts = if record.header.reference.kind == PersonalSourceKind::Summary
        || (record.header.reference.kind == PersonalSourceKind::Memory && manifest.is_some())
    {
        manifest
            .as_ref()
            .map(|m| m.receipts.clone())
            .unwrap_or_default()
    } else {
        vec![locator.clone()]
    };
    let mut spans: IndexMap<(String, u64, String), Span> = IndexMap::new();
    for receipt in receipts {
        let coordinate = (receipt.batch_order, receipt.entry_index);
        let key = (receipt.actor_id, receipt.physical_life, receipt.epoch);
        if let Some(span) = spans.get_mut(&key) {
            if coordinate < (span.from.batch_order, span.from.entry_index) {
                span.from = Coordinate {
                    batch_order: coordinate.0,
                    entry_index: coordinate.1,
                };
            }
            if coordinate > (span.through.batch_order, span.through.entry_index) {
                span.through = Coordinate {
                    batch_order: coordinate.0,
                    entry_index: coordinate.1,
                };
            }
        } else {
            spans.insert(
                key.clone(),
                Span {
                    actor_id: record.header.actor_id.clone(),
                    physical_life: key.1,
                    epoch: key.2,
                    family: "temporal-receipt",
                    from: Coordinate {
                        batch_order: coordinate.0,
                        entry_index: coordinate.1,
                    },
                    through: Coordinate {
                        batch_order: coordinate.0,
                        entry_index: coordinate.1,
                    },
                },
            );
        }
    }
    if spans.is_empty() {
        return Ok(None);
    }
    let policy = &installed.attention.value().retention.impression;
    let weaken_at = record.header.at + policy.weaken_after_seconds;
    let expires_at = record.header.at + policy.expire_after_seconds;
    if expires_at <= now {
        return Ok(None);
    }
    let weakened = weaken_at <= now;
    let mut claims = Vec::with_capacity(2);
    if let Some(event) = record.header.event_type.as_ref() {
        let inference = record.header.reference.kind == PersonalSourceKind::Summary
            || matches!(
                record.header.source.as_deref(),
                Some("inferred" | "self_thought")
            );
        claims.push(claim(
            "occurrence",
            [
                ("eventType", cell(event)?),
                (
                    "role",
                    cell(&if inference { "inference" } else { "direct" })?,
                ),
            ],
        ));
    }
    if !weakened && !summary.trim_is_empty() {
        claims.push(claim("interpretation", [("text", cell(&summary)?)]));
    }
    if claims.is_empty()
        || claims.len() as u64 > policy.max_claims
        || spans.len() as u64 > policy.max_spans
    {
        return Ok(None);
    }
    let projection = body.projection()?;
    let mut originals: Vec<&Value> = Vec::new();
    if record.header.reference.kind != PersonalSourceKind::Awareness {
        if let Some(values) = projection
            .get("manifest")
            .and_then(|m| m.get("observations"))
            .and_then(Value::as_array)
        {
            originals.extend(values);
        } else {
            if let Some(original) = projection.get("observation") {
                originals.push(original);
            }
            if let Some(values) = projection.get("observations").and_then(Value::as_array) {
                originals.extend(values);
            }
            if let Some(evidence) = projection.get("evidence") {
                if let Some(original) = evidence.get("observation") {
                    originals.push(original);
                }
                if let Some(values) = evidence.get("observations").and_then(Value::as_array) {
                    originals.extend(values);
                }
            }
        }
    } else {
        if let Some(original) = projection.get("observation") {
            originals.push(original);
        }
        if let Some(values) = projection.get("observations").and_then(Value::as_array) {
            originals.extend(values);
        }
    }
    let mut dependencies = Vec::new();
    dependencies.push(raw(&record.header.reference)?);
    if let Some(manifest) = manifest {
        dependencies.extend(manifest.coverage);
    }
    if record.header.reference.kind == PersonalSourceKind::Summary {
        dependencies.extend(
            body.get::<Vec<Box<RawValue>>>("sources")?
                .unwrap_or_default(),
        );
    }
    for dependency in super::super::manifest_dependencies::observation_dependencies(&originals)? {
        dependencies.push(raw(&dependency)?);
    }
    let mut seen = IndexSet::new();
    dependencies.retain(|value| seen.insert(value.get().to_owned()));
    let empty = JsText::from("");
    let value = Recollection {
        id: &record.header.reference.id,
        actor_id: &record.header.actor_id,
        kind: "impression",
        source: "inferred",
        summary: if weakened { &empty } else { &summary },
        at: record.header.at,
        entity_ids: body.get("entityIds")?.ok_or(ExecutionError::Invariant)?,
        importance: record.header.importance,
        impression: Impression {
            version: 1,
            from: record.header.at,
            through: record.header.at,
            claims,
            provenance: spans.into_values().collect(),
            dependencies,
            reason: retention.reason,
            created_at: now,
            reinforced_at: record.header.at,
            weaken_at,
            expires_at,
            weakened,
            _source: std::marker::PhantomData,
        },
    };
    let bytes = crate::encoding::json_record_len(&value).map_err(|_| ExecutionError::Invariant)?;
    if bytes as u64 > policy.max_bytes {
        return Ok(None);
    }
    Ok(Some(
        json_record(&value).map_err(|_| ExecutionError::Invariant)?,
    ))
}
