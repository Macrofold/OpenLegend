//! The ordinary append SQL row records a permitted acquired account. Its
//! revision and participant columns follow history-append.ts.

use super::super::{StoreError, StoreResult, sql_ordinal};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{hex_bytes, json_record, json_record_len, serialize_js_map, write_json_record},
    events::OriginalOccurrence,
    host::{ByteBudget, ByteReservation},
    received::TemporalReceiptLocator,
    reception::{
        EventScalar, ExperienceModality, ObservationOrigin, ObserverSubject, PerceivedSound,
        ReceivedReference, ReferenceRole, SensoryFacet,
    },
    runtime::{HistoryAccount, HistoryTemporal},
    text::JsText,
};
use serde::{Deserialize, Serialize, Serializer};
use serde_json::value::RawValue;
use sha2::{Digest, Sha256};
use std::{borrow::Cow, cmp::Ordering, io};

pub(super) type Compare<'a> = dyn Fn(&str, &str) -> StoreResult<Ordering> + Sync + 'a;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AwarenessEvidence<'a> {
    #[serde(skip_serializing, borrow)]
    event_id: Cow<'a, str>,
    #[serde(borrow)]
    retention_class: &'a RawValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    expires_at: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sound: Option<&'a RawValue>,
    #[serde(borrow)]
    actor_id: Cow<'a, str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_data: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    references: Option<&'a RawValue>,
    #[serde(borrow)]
    event_type: Cow<'a, str>,
    text: &'a RawValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<&'a RawValue>,
    modality: &'a RawValue,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    source_id: Option<Cow<'a, str>>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    target_id: Option<Cow<'a, str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speech: Option<&'a RawValue>,
    importance: &'a RawValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    urgency: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    exposure: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    observation: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    observations: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_subject: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_body: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recognition: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    received_features: Option<&'a RawValue>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TemporalEvidence<'a> {
    retention_class: &'static str,
    actor_id: &'a str,
    event_type: &'a str,
    text: &'a JsText,
    modality: ExperienceModality,
    importance: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    urgency: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_subject: Option<&'a ObserverSubject>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sound: Option<&'a PerceivedSound>,
    #[serde(serialize_with = "event_data")]
    event_data: &'a IndexMap<String, EventScalar>,
    references: &'a [ReceivedReference],
}

fn event_data<S: Serializer>(
    value: &&IndexMap<String, EventScalar>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    serialize_js_map(value, serializer)
}

impl<'a> TemporalEvidence<'a> {
    fn acquire(actor_id: &'a str, values: &'a [SensoryFacet]) -> StoreResult<Self> {
        let event = values
            .iter()
            .find(|value| matches!(value, SensoryFacet::Event { .. }));
        let Some(SensoryFacet::Event {
            event_type,
            text,
            modality,
            importance,
            urgency,
            content,
            source_subject,
            data,
            references,
            ..
        }) = event
        else {
            return Err(StoreError::InvalidRecord);
        };
        let participant = |role| {
            references
                .iter()
                .find(|reference| reference.role == role)
                .map(|reference| reference.id.as_str())
                .filter(|id| !id.is_empty())
        };
        let sound = values.iter().find_map(|value| match value {
            SensoryFacet::Sound { sound, .. } => Some(sound),
            _ => None,
        });
        Ok(Self {
            retention_class: "memory",
            actor_id,
            event_type,
            text,
            modality: *modality,
            importance: *importance,
            urgency: *urgency,
            content: content.as_ref(),
            source_id: participant(ReferenceRole::Actor),
            target_id: participant(ReferenceRole::Target),
            source_subject: source_subject.as_ref(),
            sound,
            event_data: data,
            references,
        })
    }
}

#[derive(Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "kind"
)]
enum AccountRef<'a> {
    Awareness {
        revision: String,
    },
    Temporal {
        revision: String,
        receipt: &'a TemporalReceiptLocator,
        received_at: f64,
        bytes: u64,
    },
}

#[derive(Serialize)]
struct StoredSource<'a> {
    id: &'a str,
    revision: String,
    time: f64,
    order: i64,
    #[serde(rename = "type")]
    event_type: &'a str,
    account: AccountRef<'a>,
}

pub(super) struct Perspective<'a> {
    pub actor: &'a str,
    pub event: &'a str,
    pub position: i64,
    pub payload: String,
    pub event_type: String,
    pub source: Option<String>,
    pub target: Option<String>,
    pub speech_peer: Option<String>,
    pub conversation_relevant: bool,
    pub temporal_life: Option<i64>,
    pub temporal_epoch: Option<&'a str>,
    pub temporal_batch: Option<i64>,
    pub temporal_entry: Option<i64>,
    _custody: ByteReservation,
}

impl<'a> Perspective<'a> {
    pub(super) fn prepare(
        account: HistoryAccount<'a>,
        original: &'a OriginalOccurrence,
        original_revision: &str,
        position: i64,
        compare: &Compare<'_>,
        budget: &ByteBudget,
    ) -> StoreResult<Self> {
        let original = original.event();
        if account.event_id != original.id
            || !original
                .audience
                .iter()
                .any(|actor| actor == account.actor_id)
        {
            return Err(StoreError::InvalidRecord);
        }
        let mut custody = budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        let (revision, account_ref, event_type, source, target, speech, sound) = match (
            account.awareness_payload,
            account.temporal,
        ) {
            (Some(payload), None) => {
                reserve(&mut custody, payload.len())?;
                let awareness: AwarenessEvidence<'_> =
                    serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
                if awareness.event_id != account.event_id || awareness.actor_id != account.actor_id
                {
                    return Err(StoreError::InvalidRecord);
                }
                // Canonical acquired awareness remains the exact body owner.
                let revision = revision(original_revision, &awareness)?;
                (
                    revision,
                    AccountRef::Awareness {
                        revision: digest(payload.as_bytes()),
                    },
                    awareness.event_type.into_owned(),
                    awareness.source_id.map(Cow::into_owned),
                    awareness.target_id.map(Cow::into_owned),
                    awareness.speech.is_some(),
                    awareness.sound.is_some(),
                )
            }
            (
                None,
                Some(HistoryTemporal {
                    receipt,
                    values,
                    bytes,
                }),
            ) => {
                if receipt.locator.actor_id != account.actor_id
                    || !matches!(receipt.origin.as_ref(), Some(ObservationOrigin::Occurrence { event_id, .. }) if event_id == account.event_id)
                {
                    return Err(StoreError::InvalidRecord);
                }
                let evidence = TemporalEvidence::acquire(account.actor_id, values)?;
                let length = json_record_len(&evidence).map_err(|_| StoreError::InvalidRecord)?;
                reserve(&mut custody, length)?;
                let encoded = json_record(&evidence).map_err(|_| StoreError::InvalidRecord)?;
                let mut original_hash = Sha256::new();
                original_hash.update(original_revision);
                original_hash.update(encoded.as_bytes());
                let revision = hex_bytes(&original_hash.finalize());
                let mut canonical = HashWriter(Sha256::new());
                canonical_json(&encoded, compare, &mut canonical)?;
                (
                    revision,
                    AccountRef::Temporal {
                        revision: canonical.finish(),
                        receipt: &receipt.locator,
                        received_at: receipt.at,
                        bytes,
                    },
                    evidence.event_type.to_owned(),
                    evidence.source_id.map(str::to_owned),
                    evidence.target_id.map(str::to_owned),
                    false,
                    evidence.sound.is_some(),
                )
            }
            _ => return Err(StoreError::InvalidRecord),
        };
        let event_type_perceived = if sound && !speech {
            "sound".to_owned()
        } else {
            event_type.clone()
        };
        let speech_peer = if event_type_perceived == "speech" {
            if source.as_deref() == Some(account.actor_id) && target.is_some() {
                target.clone()
            } else if target.is_none() || target.as_deref() == Some(account.actor_id) {
                source.clone()
            } else {
                None
            }
        } else {
            None
        };
        let data = original.data.as_ref();
        let conversation_relevant = data
            .and_then(|data| data.get("responseId"))
            .is_some_and(|value| !matches!(value, EventScalar::Null(())))
            || data
                .and_then(|data| data.get("conversationRelevant"))
                .is_some_and(|value| matches!(value, EventScalar::Boolean(true)));
        let receipt = match &account_ref {
            AccountRef::Temporal { receipt, .. } => Some(*receipt),
            _ => None,
        };
        let payload = json_record(&StoredSource {
            id: account.event_id,
            revision,
            time: original.at,
            order: position,
            event_type: &event_type,
            account: account_ref,
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        let strings = payload.capacity()
            + event_type_perceived.capacity()
            + source.as_ref().map_or(0, String::capacity)
            + target.as_ref().map_or(0, String::capacity)
            + speech_peer.as_ref().map_or(0, String::capacity);
        custody
            .resize(
                strings
                    .checked_mul(3)
                    .and_then(|n| n.checked_add(1024))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        Ok(Self {
            actor: account.actor_id,
            event: account.event_id,
            position,
            payload,
            event_type: event_type_perceived,
            source,
            target,
            speech_peer,
            conversation_relevant,
            temporal_life: receipt
                .map(|loc| sql_ordinal(loc.physical_life))
                .transpose()?,
            temporal_epoch: receipt.map(|loc| loc.epoch.as_str()),
            temporal_batch: receipt
                .map(|loc| sql_ordinal(loc.batch_order))
                .transpose()?,
            temporal_entry: receipt
                .map(|loc| sql_ordinal(loc.entry_index))
                .transpose()?,
            _custody: custody,
        })
    }
}

fn reserve(custody: &mut ByteReservation, bytes: usize) -> StoreResult<()> {
    // Intermediate decoded key/array metadata, stable sort scratch and exact
    // JS evidence input. This does not replace the retained original funding.
    custody
        .resize(
            bytes
                .checked_mul(48)
                .and_then(|n| n.checked_add(4096))
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}

fn revision<T: Serialize>(original: &str, evidence: &T) -> StoreResult<String> {
    let mut hash = HashWriter(Sha256::new());
    hash.0.update(original);
    write_json_record(evidence, &mut hash).map_err(|_| StoreError::InvalidRecord)?;
    Ok(hash.finish())
}

pub(super) fn digest(body: &[u8]) -> String {
    hex_bytes(&Sha256::digest(body))
}

struct HashWriter(Sha256);
impl HashWriter {
    fn finish(self) -> String {
        hex_bytes(&self.0.finalize())
    }
}
impl io::Write for HashWriter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.update(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn canonical_json(input: &str, compare: &Compare<'_>, out: &mut HashWriter) -> StoreResult<()> {
    match input.as_bytes().first() {
        Some(b'{') => {
            let mut object: IndexMap<String, &RawValue> =
                serde_json::from_str(input).map_err(|_| StoreError::InvalidRecord)?;
            let mut failed = false;
            object.sort_by(|left, _, right, _| {
                compare(left, right).unwrap_or_else(|_| {
                    failed = true;
                    Ordering::Equal
                })
            });
            if failed {
                return Err(StoreError::InvalidRecord);
            }
            out.0.update(b"{");
            for (at, (key, value)) in object.into_iter().enumerate() {
                if at > 0 {
                    out.0.update(b",");
                }
                write_json_record(&key, &mut *out).map_err(|_| StoreError::InvalidRecord)?;
                out.0.update(b":");
                canonical_json(value.get(), compare, out)?;
            }
            out.0.update(b"}");
        }
        Some(b'[') => {
            let array = serde_json::from_str::<Vec<&RawValue>>(input)
                .map_err(|_| StoreError::InvalidRecord)?;
            out.0.update(b"[");
            for (at, value) in array.into_iter().enumerate() {
                if at > 0 {
                    out.0.update(b",");
                }
                canonical_json(value.get(), compare, out)?;
            }
            out.0.update(b"]");
        }
        Some(_) => out.0.update(input.as_bytes()),
        None => return Err(StoreError::InvalidRecord),
    }
    Ok(())
}
