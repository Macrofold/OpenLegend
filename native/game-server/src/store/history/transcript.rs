//! Indexed private history browsing. A saved perspective is a reference to
//! an acquired account, never permission to read the original event's words.

use super::super::read::admitted_query;
use super::super::{DurableHead, Store, StoreError, StoreResult, durable_head, ordinal};
use super::perspective::TemporalEvidence;
use crate::{
    language::{LanguageProvider, canonical::write_canonical},
    player_view::profile::{Voice, narrator_voice},
};
use openlegend_simulation::{
    encoding::{hex_bytes, json_record, json_record_len, sha256_hex},
    host::{ByteBudget, ByteReservation},
    narration::{NativeText, native_text},
    received::{
        ReceivedBatch, ReceivedEntryKind, TemporalReceipt, TemporalReceiptLocator,
        materialize_received_receipt,
    },
    reception::{
        Intelligibility, ObservationOrigin, PerceivedSpeech, ReferenceRole, SensoryFacet,
        SpeechAddressing, SpeechPerception,
    },
    records::SqlCell,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use tokio_postgres::Row;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct TranscriptRequest {
    pub before: Option<u64>,
    pub watermark: Option<u64>,
    pub limit: Option<usize>,
}

pub(crate) struct Transcript {
    pub items: Vec<TranscriptItem>,
    pub watermark: u64,
    pub before: Option<u64>,
    pub voice: Voice,
    _custody: ByteReservation,
}

pub(crate) struct TranscriptRows {
    actor: String,
    events: Vec<Row>,
    stories: Vec<Row>,
    watermark: u64,
    limit: usize,
    voice: Voice,
    _transfers: [ByteReservation; 2],
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TranscriptItem {
    pub id: String,
    kind: ItemKind,
    text: JsText,
    time: f64,
    pub order: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    speaker_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    speaker: Option<JsText>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    speech: Option<PerceivedSpeech>,
    source_ids: Vec<String>,
    pub impacts: Vec<Impact>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    authored_fallback: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    status: Option<ItemStatus>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    voice: Option<Voice>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    source_status: Option<SourceStatus>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    revision: Option<u64>,
    #[serde(skip)]
    pub temporal: Option<(TemporalReceiptLocator, f64)>,
    #[serde(skip)]
    pub expires_at: Option<f64>,
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum ItemKind {
    Event,
    Speech,
    Narration,
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum ItemStatus {
    Pending,
    Failed,
    Fallback,
    Completed,
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum SourceStatus {
    Available,
    Unavailable,
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Impact {
    pub entity_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    entity_name: Option<JsText>,
    field: String,
    delta: f64,
    pub source_id: String,
}

#[derive(Deserialize)]
struct Source<'a> {
    id: &'a str,
    time: f64,
    order: i64,
    #[serde(borrow)]
    account: Account<'a>,
}

#[derive(Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum Account<'a> {
    Awareness {
        revision: &'a str,
    },
    Perspective {
        revision: &'a str,
    },
    Temporal {
        revision: &'a str,
        receipt: TemporalReceiptLocator,
        received_at: f64,
        bytes: usize,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Awareness {
    actor_id: String,
    event_type: String,
    event_id: Option<String>,
    text: NativeText,
    expires_at: Option<f64>,
    source_id: Option<String>,
    #[serde(default)]
    references: Vec<Reference>,
    speech: Option<PerceivedSpeech>,
    sound: Option<Box<serde_json::value::RawValue>>,
}

#[derive(Deserialize)]
struct Reference {
    role: ReferenceRole,
    label: JsText,
}

#[derive(Deserialize)]
struct TemporalBody {
    batch: ReceivedBatch,
    values: Vec<SensoryFacet>,
}

impl Store {
    /// Load a finite page from exactly the originally selected durable head.
    /// PostgreSQL resolves account bodies only after the scoped index limit.
    /// The returned carrier retains only independently funded selected rows.
    /// Its caller decodes them after releasing the SQL snapshot and reader.
    pub(crate) async fn transcript(
        self: &std::sync::Arc<Self>,
        head: DurableHead,
        account: String,
        actor: String,
        request: &TranscriptRequest,
    ) -> StoreResult<TranscriptRows> {
        let page = i64::try_from(request.limit.unwrap_or(40))
            .ok()
            .filter(|limit| (1..=100).contains(limit))
            .ok_or(StoreError::InvalidRecord)?;
        let requested_watermark = request
            .watermark
            .map(super::super::sql_ordinal)
            .transpose()?;
        let requested_boundary = request.before.map(super::super::sql_ordinal).transpose()?;
        let store = self.clone();
        self.read_operational(move |tx| Box::pin(async move {
            if durable_head(tx).await?.as_ref() != Some(&head) {
                return Err(StoreError::StaleCut);
            }
            let world = &head.world_id;
            let summary = tx.query_one(
                "SELECT greatest(
                   coalesce((SELECT max(position) FROM history_perspectives WHERE world_id=$1 AND actor_id=$2),0),
                   coalesce((SELECT max(position) FROM story_narrations WHERE world_id=$1 AND owner_id=$3),0)),
                 (SELECT CASE WHEN octet_length(value)<=64 THEN value END FROM meta WHERE key='integration:narrator-voice:'||$3),
                 EXISTS(SELECT 1 FROM meta WHERE key='integration:narrator-voice:'||$3 AND octet_length(value)>64)",
                &[world, &actor, &account],
            ).await?;
            let maximum = summary.try_get::<_,i64>(0)?;
            let watermark = requested_watermark.unwrap_or(maximum).min(maximum);
            let next = watermark.checked_add(1).ok_or(StoreError::InvalidRecord)?;
            let boundary = requested_boundary.unwrap_or(next).min(next);
            if summary.try_get::<_,bool>(2)? { return Err(StoreError::InvalidRecord); }
            let voice = narrator_voice(summary.try_get(1)?)?;
            let offered = page + 1;
            let selection = format!(
                "WITH selected AS MATERIALIZED (
                  SELECT p.* FROM history_perspectives p
                  WHERE p.world_id=$1 AND p.actor_id=$2 AND p.position<$3
                    AND NOT EXISTS (
                      SELECT 1 FROM story_event_sources s JOIN story_narrations n
                      ON n.world_id=s.world_id AND n.id=s.narration_id AND n.owner_id=s.owner_id
                      WHERE s.world_id=p.world_id AND s.event_id=p.event_id AND s.owner_id=$4)
                  ORDER BY p.position DESC,p.event_id DESC LIMIT $5)
                 SELECT p.event_id,p.position,p.payload,{} AS account FROM selected p
                 JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id
                 ORDER BY p.position DESC,p.event_id DESC", store.schema.transcript_account
            );
            let (event_bytes, events) = admitted_query(tx, &selection, &[world,&actor,&boundary,&account,&offered], &store.budget).await?;
            let (story_bytes, stories) = admitted_query(tx,
                "SELECT id,position,payload FROM story_narrations WHERE world_id=$1 AND owner_id=$2
                 AND position<$3 ORDER BY position DESC,id DESC LIMIT $4",
                &[world,&account,&boundary,&offered], &store.budget,
            ).await?;
            Ok(TranscriptRows {actor,events,stories,watermark:ordinal(watermark)?,limit:page as usize,voice,_transfers:[event_bytes,story_bytes]})
        })).await
    }
}

impl TranscriptRows {
    /// Decode the selected accounts on the existing compute pool. The result
    /// owns its typed fields independently of the SQL buffers consumed here.
    pub(crate) fn prepare(
        self,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> StoreResult<Transcript> {
        let Self {
            actor,
            events,
            stories,
            watermark,
            limit,
            voice,
            _transfers,
        } = self;
        let mut retained = budget
            .reserve((events.len() + stories.len()) * std::mem::size_of::<TranscriptItem>())
            .map_err(|_| StoreError::Capacity)?;
        let mut items = Vec::with_capacity(events.len() + stories.len());
        for row in events {
            let pointer = row.try_get::<_, &str>(2)?;
            let acquired = row
                .try_get::<_, Option<&str>>(3)?
                .ok_or(StoreError::InvalidRecord)?;
            reserve_graph(&mut retained, &[pointer, acquired])?;
            items.push(event(
                row.try_get(0)?,
                row.try_get(1)?,
                pointer,
                acquired,
                &actor,
                language,
                budget,
            )?);
        }
        for row in stories {
            let payload = row.try_get::<_, &str>(2)?;
            reserve_graph(&mut retained, &[payload])?;
            items.push(narration(&row, payload, &actor)?);
        }
        items.sort_unstable_by(|a, b| b.order.cmp(&a.order).then_with(|| b.id.cmp(&a.id)));
        let has_older = items.len() > limit;
        items.truncate(limit);
        items.reverse();
        let before = has_older.then(|| items[0].order);
        Ok(Transcript {
            items,
            watermark,
            before,
            voice,
            _custody: retained,
        })
    }
}

fn reserve_graph(custody: &mut ByteReservation, bodies: &[&str]) -> StoreResult<()> {
    let bytes = bodies
        .iter()
        .try_fold(custody.bytes(), |used, body| {
            used.checked_add(SqlCell::json_decode_bound(body)?)?
                .checked_add(1024)
        })
        .ok_or(StoreError::Capacity)?;
    custody.resize(bytes).map_err(|_| StoreError::Capacity)
}

pub(super) enum VerifiedEventBody<'a> {
    Awareness(&'a str),
    Temporal {
        values: Vec<SensoryFacet>,
        receipt: TemporalReceiptLocator,
        received_at: f64,
    },
}

pub(super) fn retained_event<'a>(
    id: &str,
    position: i64,
    pointer: &str,
    acquired: &'a str,
    actor: &str,
    language: &LanguageProvider,
    budget: &ByteBudget,
) -> StoreResult<(f64, VerifiedEventBody<'a>)> {
    let source: Source<'_> = decode(pointer)?;
    if source.id != id || source.order != position || !source.time.is_finite() {
        return Err(StoreError::InvalidRecord);
    }
    let body = match source.account {
        Account::Awareness { revision } | Account::Perspective { revision } => {
            if sha256_hex(acquired.as_bytes()) != revision {
                return Err(StoreError::InvalidRecord);
            }
            VerifiedEventBody::Awareness(acquired)
        }
        Account::Temporal {
            revision,
            receipt,
            received_at,
            bytes,
        } => {
            let body: TemporalBody = decode(acquired)?;
            let [entry] = body.batch.entries.as_slice() else {
                return Err(StoreError::InvalidRecord);
            };
            if entry.kind != ReceivedEntryKind::Occurrence {
                return Err(StoreError::InvalidRecord);
            }
            let selected = materialize_received_receipt(&body.batch, entry, None)
                .map_err(|_| StoreError::InvalidRecord)?;
            #[derive(Serialize)]
            struct ExactAccount<'a> {
                receipt: &'a TemporalReceipt,
                values: &'a [SensoryFacet],
            }
            if selected.locator != receipt
                || receipt.actor_id != actor
                || selected.at != received_at
                || !matches!(&selected.origin,Some(ObservationOrigin::Occurrence {event_id,..}) if event_id==id)
                || json_record_len(&ExactAccount {
                    receipt: &selected,
                    values: &body.values,
                })
                .map_err(|_| StoreError::InvalidRecord)?
                    != bytes
            {
                return Err(StoreError::InvalidRecord);
            }
            let evidence = TemporalEvidence::acquire(actor, &body.values)?;
            let size = json_record_len(&evidence).map_err(|_| StoreError::InvalidRecord)?;
            let _computation = budget
                .reserve(size.checked_mul(10).ok_or(StoreError::Capacity)?)
                .map_err(|_| StoreError::Capacity)?;
            let encoded = json_record(&evidence).map_err(|_| StoreError::InvalidRecord)?;
            let mut canonical = Vec::new();
            write_canonical(
                &encoded,
                &|a, b| language.compare_utf8(a, b),
                &mut canonical,
            )
            .map_err(|_| StoreError::InvalidRecord)?;
            if sha256_hex(&canonical) != revision {
                return Err(StoreError::InvalidRecord);
            }
            VerifiedEventBody::Temporal {
                values: body.values,
                receipt,
                received_at,
            }
        }
    };
    Ok((source.time, body))
}

fn event(
    id: &str,
    position: i64,
    pointer: &str,
    acquired: &str,
    actor: &str,
    language: &LanguageProvider,
    budget: &ByteBudget,
) -> StoreResult<TranscriptItem> {
    let (at, verified) = retained_event(id, position, pointer, acquired, actor, language, budget)?;
    let (kind, text, speaker_id, speaker, speech, temporal, expires_at) = match verified {
        VerifiedEventBody::Awareness(acquired) => {
            let evidence: Awareness = decode(acquired)?;
            if evidence.actor_id != actor
                || evidence
                    .event_id
                    .as_deref()
                    .is_some_and(|event| event != id)
            {
                return Err(StoreError::InvalidRecord);
            }
            let mut speech = evidence.speech;
            let speaker = speech
                .as_ref()
                .and_then(|part| part.speaker.as_ref().map(|part| part.name_at_time.clone()))
                .or_else(|| {
                    evidence
                        .references
                        .into_iter()
                        .find(|reference| reference.role == ReferenceRole::Actor)
                        .map(|reference| reference.label)
                });
            if let Some(parts) = speech.as_mut() {
                if parts.perception == SpeechPerception::Seen {
                    parts.addressing = None;
                    parts.intelligibility = Intelligibility::None;
                    parts.segments.clear();
                    parts.addressee = None;
                } else {
                    parts.addressing = Some(parts.addressing.unwrap_or(SpeechAddressing::Ambient));
                }
            }
            let kind = if evidence.event_type == "speech"
                && (speech.is_some() || evidence.sound.is_none())
            {
                ItemKind::Speech
            } else {
                ItemKind::Event
            };
            (
                kind,
                native_text(&evidence.text),
                evidence.source_id,
                speaker,
                speech,
                None,
                evidence.expires_at,
            )
        }
        VerifiedEventBody::Temporal {
            values,
            receipt,
            received_at,
        } => {
            let evidence = TemporalEvidence::acquire(actor, &values)?;
            let speaker = values.iter().find_map(|value| match value {
                SensoryFacet::Event { references, .. } => references
                    .iter()
                    .find(|reference| reference.role == ReferenceRole::Actor)
                    .map(|reference| reference.label.clone()),
                _ => None,
            });
            (
                ItemKind::Event,
                evidence.text.clone(),
                evidence.source_id.map(str::to_owned),
                speaker,
                None,
                Some((receipt, received_at)),
                None,
            )
        }
    };
    Ok(TranscriptItem {
        id: id.to_owned(),
        kind,
        text,
        time: at,
        order: ordinal(position)?,
        speaker_id: speaker_id.filter(|id| id == actor),
        speaker,
        speech,
        source_ids: vec![id.to_owned()],
        impacts: Vec::new(),
        authored_fallback: None,
        status: None,
        voice: None,
        source_status: None,
        revision: None,
        temporal,
        expires_at,
    })
}

pub(super) fn narration(row: &Row, payload: &str, actor: &str) -> StoreResult<TranscriptItem> {
    let mut item: TranscriptItem = decode(payload)?;
    if item.kind != ItemKind::Narration
        || item.id != row.try_get::<_, &str>(0)?
        || item.order != ordinal(row.try_get(1)?)?
    {
        return Err(StoreError::InvalidRecord);
    }
    item.speaker_id = item.speaker_id.take().filter(|id| id == actor);
    if item.status == Some(ItemStatus::Failed)
        || (item.status == Some(ItemStatus::Fallback)
            && !item.source_ids.is_empty()
            && item.authored_fallback != Some(true))
    {
        item.text = JsText::from("Narration failed.");
        item.status = Some(ItemStatus::Failed);
    }
    Ok(item)
}

impl TranscriptItem {
    pub(crate) fn project_impacts(
        &mut self,
        actor: &str,
        references: &crate::player_references::PlayerReferences<'_>,
    ) -> StoreResult<()> {
        for impact in &mut self.impacts {
            if impact.entity_id != actor {
                impact.entity_id = references
                    .historical(&impact.source_id, &impact.entity_id, "impact")
                    .map_err(|_| StoreError::InvalidRecord)?;
            }
        }
        Ok(())
    }
}

fn decode<'a, T: Deserialize<'a>>(body: &'a str) -> StoreResult<T> {
    serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)
}
