//! The private Journal queue and its exact, independently funded claim.
//! Provider execution belongs to the application. SQL owns durable state,
//! receipt identity and the story rows visible to the Journal and banner.

use super::super::{
    perspective::{AwarenessEvidence, TemporalEvidence},
    transcript::{VerifiedEventBody, retained_event},
};
use super::{StoryJob, StorySource, TranscriptItem};
use crate::language::LanguageProvider;
use crate::store::{
    CommitError, DurableHead, Store, StoreError, StoreResult, durable_head, ordinal,
    read::admitted_query, sql_ordinal,
};
use openlegend_simulation::{
    encoding::json_record, host::ByteReservation, narration::native_text,
    received::TemporalReceiptLocator, reception::EncounterExposure, records::SqlCell, text::JsText,
};
use serde::Deserialize;
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio_postgres::{Row, Transaction};

const FAILED: &str = "Narration failed.";

#[derive(Clone, Copy)]
enum StorySourceScope {
    Generation,
    RetainedPassage,
}

pub(crate) struct ClaimedStory {
    pub(crate) head: DurableHead,
    pub(crate) grant_revision: Option<u64>,
    job: StoryJob,
    _custody: ByteReservation,
}

pub(crate) enum StoryOutput {
    Generated {
        text: JsText,
        cited_optional: Vec<OptionalStorySource>,
        _custody: ByteReservation,
    },
    Failed(&'static str),
    Revoked,
}

pub(crate) struct OptionalStorySource {
    source: StorySource,
    _custody: ByteReservation,
}

impl OptionalStorySource {
    pub(crate) fn id(&self) -> &str {
        &self.source.id
    }
    pub(crate) fn evidence(&self) -> StoryEvidence<'_> {
        StoryEvidence::from(&self.source)
    }
}

pub(crate) struct StoryEvidence<'a> {
    pub(crate) id: &'a str,
    pub(crate) text: &'a openlegend_simulation::narration::NativeText,
    pub(crate) at: f64,
    pub(crate) order: i64,
    pub(crate) event_type: &'a str,
    pub(crate) account: &'a RawValue,
}

impl<'a> From<&'a StorySource> for StoryEvidence<'a> {
    fn from(source: &'a StorySource) -> Self {
        Self {
            id: &source.id,
            text: &source.text,
            at: source.time,
            order: source.order,
            event_type: &source.event_type,
            account: &source.evidence,
        }
    }
}

pub(crate) struct StoryRevisions {
    pub(crate) rows: Vec<StoryRevision>,
    pub(crate) privacy_revision: u64,
    pub(crate) expires_at: Option<f64>,
    _custody: ByteReservation,
}

pub(crate) struct StoryRevision {
    pub(crate) id: String,
    pub(crate) revision: String,
    pub(crate) temporal: Option<(TemporalReceiptLocator, f64)>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Temporal {
    receipt: TemporalReceiptLocator,
    received_at: f64,
}

#[derive(Deserialize)]
struct Exposure {
    exposure: Option<EncounterExposure>,
}

impl ClaimedStory {
    pub(crate) fn principal(&self) -> (&str, &str) {
        (&self.job.owner_id, &self.job.actor_id)
    }

    pub(crate) fn attempt_id(&self) -> String {
        format!(
            "{}:{}:generation:{}",
            self.head.world_id, self.job.id, self.job.item.revision
        )
    }

    pub(crate) fn story_id(&self) -> &str {
        &self.job.id
    }

    pub(crate) fn voice(&self) -> &str {
        &self.job.voice
    }

    pub(crate) fn selection(&self) -> (&str, u64, u64, &str, f64) {
        let stamp = &self.job.selection;
        (
            &stamp.mechanism,
            stamp.version,
            stamp.policy_revision,
            &stamp.policy_digest,
            self.job.item.time,
        )
    }

    pub(crate) fn exposures(&self) -> StoreResult<Vec<EncounterExposure>> {
        self.job
            .sources
            .iter()
            .filter(|source| self.job.item.source_ids.contains(&source.id))
            .filter_map(
                |source| match serde_json::from_str::<Exposure>(source.evidence.get()) {
                    Ok(value) => value.exposure.map(Ok),
                    Err(_) => Some(Err(StoreError::InvalidRecord)),
                },
            )
            .collect()
    }

    pub(crate) fn exposure_bound(&self) -> usize {
        // The selected raw evidence previously needed at least this much
        // space to decode; the delivered witness holds only its exposure.
        self._custody.bytes()
    }

    /// Borrow the fixed causal sources. Optional context is selected afresh
    /// at this story's original anchor for each explicit generation.
    pub(crate) fn sources(&self) -> impl Iterator<Item = StoryEvidence<'_>> {
        self.job
            .sources
            .iter()
            .filter(|source| self.mandatory_source(&source.id))
            .map(StoryEvidence::from)
    }

    pub(crate) fn mandatory_source(&self, id: &str) -> bool {
        self.job.item.source_ids.iter().any(|source| source == id)
    }

    pub(crate) fn impacts(&self) -> impl Iterator<Item = (&str, f64, &str)> {
        self.job.item.impacts.iter().map(|impact| {
            (
                impact.field.as_str(),
                impact.delta,
                impact.source_id.as_str(),
            )
        })
    }
}

impl Store {
    pub(crate) async fn next_story_due(&self, world: String) -> StoreResult<Option<i64>> {
        self.read_operational(move |tx| {
            Box::pin(async move {
                tx.query_one(
                    "SELECT min(created_at) FROM story_jobs WHERE world_id=$1 AND state='queued'",
                    &[&world],
                )
                .await?
                .try_get(0)
                .map_err(StoreError::from)
            })
        })
        .await
    }

    /// Claim once under the ordinary PostgreSQL writer. A cold process may
    /// recover this row as uncertain and can never dispatch it again.
    pub(crate) async fn claim_story(
        self: &Arc<Self>,
        world: String,
        before: i64,
    ) -> Result<Option<ClaimedStory>, CommitError> {
        let store = self.clone();
        self.operational(move |tx| Box::pin(async move {
            let Some(row) = tx.query_opt(
                "SELECT id,owner_id FROM story_jobs WHERE world_id=$1 AND state='queued' AND created_at<=$2 ORDER BY created_at,id LIMIT 1 FOR UPDATE",
                &[&world,&before],
            ).await? else { return Ok(None); };
            let id = row.try_get(0)?;
            let owner = row.try_get(1)?;
            let (mut job, custody) = store.story_job(tx, &world, owner, id).await?.ok_or(StoreError::StaleCut)?;
            let head = durable_head(tx).await?.filter(|head| head.world_id == world).ok_or(StoreError::StaleCut)?;
            if job.state != "queued" { return Err(StoreError::StaleCut); }
            let grant_revision = story_grant(tx,&world,&job.owner_id,&job.actor_id).await?;
            job.state = "running".into();
            write_story(tx, &world, &job).await?;
            Ok(Some(ClaimedStory { head, grant_revision, job, _custody: custody }))
        })).await
    }

    /// Confirm the same running claim, real grant and every selected source
    /// in one database snapshot. The native owner still rechecks its live
    /// privacy, age, authored selection and exposure before actual use.
    pub(crate) async fn story_current(
        self: &Arc<Self>,
        story: Arc<ClaimedStory>,
        optional: Arc<Vec<OptionalStorySource>>,
    ) -> StoreResult<Option<StoryRevisions>> {
        let store = self.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                store
                    .story_sources_current(
                        tx,
                        &story,
                        &optional,
                        "running",
                        StorySourceScope::Generation,
                    )
                    .await
            })
        })
        .await
    }

    /// Select the bounded recent optional accounts before decoding. Reuse
    /// the Journal's real current-format awareness and temporal verifier.
    pub(crate) async fn story_optional_sources(
        self: &Arc<Self>,
        story: Arc<ClaimedStory>,
    ) -> StoreResult<StoryOptionalRows> {
        let store = self.clone();
        self.read_operational(move |tx| Box::pin(async move {
            let ids = &story.job.item.source_ids;
            let limit = (16usize.saturating_sub(ids.len()).min(8)) as i64;
            let sql = format!("WITH selected AS MATERIALIZED (
                SELECT p.* FROM history_perspectives p WHERE p.world_id=$1 AND p.actor_id=$2 AND p.position<=$3
                AND NOT(p.event_id=ANY($4::text[])) AND {} ORDER BY p.position DESC,p.event_id DESC LIMIT $5)
              SELECT p.event_id,p.position,p.payload,{} AS account FROM selected p ORDER BY p.position DESC,p.event_id DESC",
                store.schema.banner_account,store.schema.transcript_account);
            let (custody,rows) = admitted_query(tx,&sql,&[&story.head.world_id,&story.job.actor_id,&story.job.item.order,&ids,&limit],&store.budget).await?;
            Ok(StoryOptionalRows { story, rows, _custody: custody })
        })).await
    }

    pub(crate) async fn finish_story(
        self: &Arc<Self>,
        story: Arc<ClaimedStory>,
        output: StoryOutput,
    ) -> Result<bool, CommitError> {
        let store = self.clone();
        self.operational(move |tx| Box::pin(async move {
            let world = &story.head.world_id;
            let (owner, _) = story.principal();
            let Some((mut current, _custody)) = store.story_job(tx, world, owner, story.story_id()).await? else { return Ok(false); };
            if current.state != "running" || current.item.revision != story.job.item.revision { return Ok(false); }
            let optional = match &output {
                StoryOutput::Generated { cited_optional, .. } => cited_optional.as_slice(),
                _ => &[],
            };
            let valid = !matches!(output, StoryOutput::Revoked)
                && store.story_sources_current(tx, &story, optional, "running", StorySourceScope::Generation)
                    .await?.is_some();
            if !valid {
                let restore_previous = current.previous_item.is_some()
                    && store.story_sources_current(tx, &story, &[], "running", StorySourceScope::RetainedPassage)
                        .await?.is_some();
                cancel_story(tx, world, &mut current, restore_previous).await?;
                return Ok(false);
            }
            // The hidden previous entry still owned its old citations while
            // regeneration was running. Replace them at the same durable
            // boundary as the new prose and its actual cited source bodies.
            current.previous_item = None;
            let required = &current.item.source_ids;
            let before = current.sources.len();
            current.sources.retain(|source| required.contains(&source.id));
            if current.sources.len() != before {
                tx.execute(
                    "DELETE FROM story_context_sources WHERE world_id=$1 AND owner_id=$2 AND narration_id=$3",
                    &[&world, &owner, &current.id],
                ).await?;
            }
            current.item.revision = current.item.revision.checked_add(1).ok_or(StoreError::Capacity)?;
            let mut retained = Vec::new();
            match output {
                StoryOutput::Generated { text, cited_optional, _custody } => {
                    current.state = "completed".into();
                    current.item.text = text;
                    current.item.authored_fallback = Some(false);
                    current.reason = None;
                    retained.push(_custody);
                    if !cited_optional.is_empty() {
                        let ids = cited_optional.iter().map(OptionalStorySource::id).collect::<Vec<_>>();
                        tx.execute("INSERT INTO story_context_sources (world_id,narration_id,owner_id,event_id)
                            SELECT $1,$2,$3,s.event FROM unnest($4::text[]) s(event) ON CONFLICT DO NOTHING",
                            &[&world,&current.id,&current.owner_id,&ids]).await?;
                    }
                    for item in cited_optional {
                        current.sources.push(item.source);
                        retained.push(item._custody);
                    }
                }
                StoryOutput::Failed(reason) => {
                    current.reason = Some(reason.to_owned());
                    let has_authored_introduction = story.exposures()?.iter().any(|exposure| matches!(exposure, EncounterExposure::Place { .. } | EncounterExposure::InventoryItem { .. }));
                    current.state = if has_authored_introduction { "fallback" } else { "failed" }.into();
                    current.item.text = if has_authored_introduction {
                        let mut text = JsText::from("");
                        for (index, source) in current.sources.iter().filter(|source| current.item.source_ids.contains(&source.id)).enumerate() {
                            if index > 0 { text.push_str(" "); }
                            text.push_text(&native_text(&source.text));
                        }
                        text
                    } else { FAILED.into() };
                    current.item.authored_fallback = Some(has_authored_introduction);
                }
                StoryOutput::Revoked => unreachable!("revocation handled before publication"),
            }
            current.item.status.clone_from(&current.state);
            write_story(tx, world, &current).await?;
            write_narration(tx, world, &current.item, owner, true).await?;
            drop(retained);
            Ok(true)
        })).await
    }

    /// A process can die after claim or during transfer. Mark its previously
    /// running jobs uncertain. Never reserve or send another paid attempt.
    pub(crate) async fn recover_stories(
        self: &Arc<Self>,
        world: String,
    ) -> Result<(), CommitError> {
        let store = self.clone();
        self.operational(move |tx| Box::pin(async move {
            loop {
                let Some(row) = tx.query_opt("SELECT id,owner_id FROM story_jobs WHERE world_id=$1 AND state='running' ORDER BY id LIMIT 1", &[&world]).await? else { return Ok(()); };
                let id = row.try_get(0)?;
                let owner = row.try_get(1)?;
                let (mut current, _custody) = store.story_job(tx, &world, owner, id).await?.ok_or(StoreError::StaleCut)?;
                current.state = "uncertain".into();
                current.reason = Some("Interrupted generation was not repeated.".into());
                current.item.status = "failed".into();
                current.item.text = FAILED.into();
                current.item.authored_fallback = Some(false);
                write_story(tx, &world, &current).await?;
                write_narration(tx, &world, &current.item, owner, true).await?;
            }
        })).await
    }

    /// Repeat the same explicit request without requeueing or spending. The
    /// published passage never changes its Journal ID or chronological anchor.
    pub(crate) async fn regenerate_story(
        self: &Arc<Self>,
        world: String,
        owner: String,
        actor: String,
        id: String,
        request: String,
    ) -> Result<bool, CommitError> {
        let store = self.clone();
        self.operational(move |tx| Box::pin(async move {
            let key = format!("story-regeneration:{world}:{owner}:{request}");
            if let Some(prior) = tx.query_opt("SELECT value FROM meta WHERE key=$1", &[&key]).await? {
                return Ok(prior.try_get::<_, &str>(0)? == id);
            }
            let Some((mut job,_custody)) = store.story_job(tx,&world,&owner,&id).await? else { return Ok(false); };
            if job.actor_id != actor || !matches!(job.state.as_str(),"completed"|"fallback"|"failed") { return Ok(false); }
            let head = durable_head(tx).await?.filter(|head| head.world_id == world).ok_or(StoreError::StaleCut)?;
            let grant_revision = story_grant(tx,&world,&owner,&actor).await?;
            let story = ClaimedStory { head, grant_revision, job, _custody };
            if store.story_sources_current(tx,&story,&[],&story.job.state,StorySourceScope::RetainedPassage).await?.is_none() { return Ok(false); }
            job=story.job;
            job.previous_item=Some(job.item.clone());
            job.state="queued".into();
            job.item.status="pending".into();
            job.item.revision=job.item.revision.checked_add(1).ok_or(StoreError::Capacity)?;
            let voice=tx.query_opt("SELECT CASE WHEN octet_length(value)<=64 THEN value END FROM meta WHERE key=$1", &[&format!("integration:narrator-voice:{owner}")]).await?;
            if let Some(voice) = voice {
                let voice: &str=voice.try_get::<_,Option<&str>>(0)?.ok_or(StoreError::InvalidRecord)?;
                job.voice = serde_json::from_str(voice).map_err(|_|StoreError::InvalidRecord)?;
                if !matches!(job.voice.as_str(),"restrained"|"lyrical"|"wry") { return Err(StoreError::InvalidRecord); }
            }
            job.item.voice.clone_from(&job.voice);
            tx.execute("DELETE FROM story_banners WHERE world_id=$1 AND owner_id=$2 AND id=$3",&[&world,&owner,&id]).await?;
            write_story(tx,&world,&job).await?;
            write_narration(tx,&world,&job.item,&owner,false).await?;
            tx.execute("INSERT INTO meta VALUES ($1,$2)",&[&key,&id]).await?;
            Ok(true)
        })).await
    }

    async fn story_job(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        owner: &str,
        id: &str,
    ) -> StoreResult<Option<(StoryJob, ByteReservation)>> {
        let (_transfer, rows) = admitted_query(
            tx,
            "SELECT payload,actor_id FROM story_jobs WHERE world_id=$1 AND owner_id=$2 AND id=$3",
            &[&world, &owner, &id],
            &self.budget,
        )
        .await?;
        let Some(row) = rows.first() else {
            return Ok(None);
        };
        let payload = row.try_get::<_, &str>(0)?;
        let custody = self
            .budget
            .reserve(SqlCell::json_decode_bound(payload).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let job: StoryJob = serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
        if job.id != id
            || job.item.id != id
            || job.owner_id != owner
            || job.actor_id != row.try_get::<_, &str>(1)?
            || job.item.source_ids.is_empty()
            || job.sources.len() > 16
            || job.item.source_ids.iter().any(|id| {
                job.sources.iter().filter(|source| source.id == *id).count() != 1
            })
        {
            return Err(StoreError::InvalidRecord);
        }
        Ok(Some((job, custody)))
    }

    async fn story_sources_current(
        &self,
        tx: &Transaction<'_>,
        story: &ClaimedStory,
        cited_optional: &[OptionalStorySource],
        state: &str,
        scope: StorySourceScope,
    ) -> StoreResult<Option<StoryRevisions>> {
        let (owner, actor) = story.principal();
        let world = &story.head.world_id;
        let Some(head) = durable_head(tx).await? else {
            return Ok(None);
        };
        if head.world_id != *world || head.generation != story.head.generation {
            return Ok(None);
        }
        let Some(grant) = story.grant_revision else {
            return Ok(None);
        };
        let grant = sql_ordinal(grant)?;
        // Scope and version use projected columns. Story bodies can contain
        // exact code units PostgreSQL JSON text operators cannot decode.
        let revision = sql_ordinal(story.job.item.revision)?;
        let claim = tx
            .query_opt(
                "SELECT 1 FROM story_jobs j
          JOIN auth_grants g ON g.world_id=j.world_id AND g.account_id=j.owner_id
          JOIN story_narrations n ON n.world_id=j.world_id AND n.owner_id=j.owner_id AND n.id=j.id
          WHERE j.world_id=$1 AND j.owner_id=$2 AND j.id=$3 AND n.revision=$4
          AND j.actor_id=$5 AND g.actor_id=$5 AND j.state=$6 AND g.revision=$7
          AND g.capabilities::jsonb ? 'play'",
                &[
                    &world,
                    &owner,
                    &story.job.id,
                    &revision,
                    &actor,
                    &state,
                    &grant,
                ],
            )
            .await?;
        if claim.is_none() {
            return Ok(None);
        }
        let sources = || {
            story
                .job
                .sources
                .iter()
                .filter(|source| {
                    matches!(scope, StorySourceScope::RetainedPassage)
                        || story.mandatory_source(&source.id)
                })
                .chain(cited_optional.iter().map(|entry| &entry.source))
        };
        let ids = sources().map(|source| &source.id).collect::<Vec<_>>();
        let sql = format!("SELECT p.event_id,p.payload::jsonb->>'revision',
          CASE WHEN p.payload::jsonb#>>'{{account,kind}}'='temporal' THEN p.payload::jsonb->'account' END::text
          FROM history_perspectives p WHERE p.world_id=$1 AND p.actor_id=$2 AND p.event_id=ANY($3::text[]) AND {}", self.schema.banner_account);
        let (_transfer, rows) =
            admitted_query(tx, &sql, &[&world, &actor, &ids], &self.budget).await?;
        if rows.len() != ids.len() {
            return Ok(None);
        }
        let bytes = rows.iter().try_fold(0usize, |bytes, row| {
            let temporal: Option<&str> = row.try_get(2)?;
            let size = bytes
                .checked_add(1024)
                .and_then(|bytes| {
                    bytes.checked_add(temporal.map_or(Some(0), SqlCell::json_decode_bound)?)
                })
                .ok_or(StoreError::Capacity)?;
            Ok::<_, StoreError>(size)
        })?;
        let custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let values = rows
            .iter()
            .map(read_revision)
            .collect::<StoreResult<Vec<_>>>()?;
        if sources().any(|source| {
            !values
                .iter()
                .any(|item| item.id == source.id && item.revision == source.revision)
        }) {
            return Ok(None);
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Expiry {
            expires_at: Option<f64>,
        }
        let expires_at = sources().try_fold(None, |known: Option<f64>, source| {
            let expiry = serde_json::from_str::<Expiry>(source.evidence.get())
                .map_err(|_| StoreError::InvalidRecord)?
                .expires_at;
            Ok::<_, StoreError>(match (known, expiry) {
                (Some(a), Some(b)) => Some(a.min(b)),
                (None, value) | (value, None) => value,
            })
        })?;
        let key = json_record(&["world", "experience", "privacyRevisions", actor])
            .map_err(|_| StoreError::InvalidRecord)?;
        let privacy = tx.query_one("SELECT coalesce((SELECT payload::bigint FROM mind_privacy_revisions WHERE world_id=$1 AND id=$2),0)",&[&world,&key]).await?;
        Ok(Some(StoryRevisions {
            rows: values,
            privacy_revision: ordinal(privacy.try_get(0)?)?,
            expires_at,
            _custody: custody,
        }))
    }
}

async fn story_grant(
    tx: &Transaction<'_>,
    world: &str,
    owner: &str,
    actor: &str,
) -> StoreResult<Option<u64>> {
    tx.query_opt("SELECT revision FROM auth_grants WHERE world_id=$1 AND account_id=$2 AND actor_id=$3 AND capabilities::jsonb ? 'play'",
        &[&world,&owner,&actor]).await?
        .map(|row| ordinal(row.try_get(0)?)).transpose()
}

pub(crate) struct StoryOptionalRows {
    story: Arc<ClaimedStory>,
    rows: Vec<Row>,
    _custody: ByteReservation,
}

impl StoryOptionalRows {
    pub(crate) fn prepare(
        self,
        language: &LanguageProvider,
        budget: &openlegend_simulation::host::ByteBudget,
    ) -> StoreResult<Vec<OptionalStorySource>> {
        let actor = &self.story.job.actor_id;
        self.rows
            .iter()
            .map(|row| {
                let id: &str = row.try_get(0)?;
                let order = row.try_get(1)?;
                let pointer: &str = row.try_get(2)?;
                let acquired: &str = row.try_get(3)?;
                let bytes = SqlCell::json_decode_bound(pointer)
                    .and_then(|bytes| bytes.checked_add(SqlCell::json_decode_bound(acquired)?))
                    .ok_or(StoreError::Capacity)?;
                let custody = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
                #[derive(Deserialize)]
                struct Revision {
                    revision: String,
                }
                let Revision { revision } =
                    serde_json::from_str(pointer).map_err(|_| StoreError::InvalidRecord)?;
                let (time, _, account) =
                    retained_event(id, order, pointer, acquired, actor, language, budget)?;
                use openlegend_simulation::narration::NativeText;
                let (text, event_type, evidence, content) = match account {
                    VerifiedEventBody::Awareness(raw) => {
                        let evidence: AwarenessEvidence<'_> =
                            serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
                        let text = serde_json::from_str(evidence.text.get())
                            .map_err(|_| StoreError::InvalidRecord)?;
                        (
                            text,
                            evidence.event_type.into_owned(),
                            raw.to_owned(),
                            evidence.content.map(ToOwned::to_owned),
                        )
                    }
                    VerifiedEventBody::Temporal { values, .. } => {
                        let evidence = TemporalEvidence::acquire(actor, &values)?;
                        let content = evidence
                            .content
                            .map(|value| json_record(value).and_then(RawValue::from_string))
                            .transpose()
                            .map_err(|_| StoreError::InvalidRecord)?;
                        (
                            NativeText::Literal(evidence.text.clone()),
                            evidence.event_type.to_owned(),
                            json_record(&evidence).map_err(|_| StoreError::InvalidRecord)?,
                            content,
                        )
                    }
                };
                let source = StorySource {
                    id: id.to_owned(),
                    text,
                    evidence: RawValue::from_string(evidence)
                        .map_err(|_| StoreError::InvalidRecord)?,
                    revision,
                    time,
                    order,
                    event_type,
                    content,
                };
                Ok(OptionalStorySource {
                    source,
                    _custody: custody,
                })
            })
            .collect()
    }
}

fn read_revision(row: &Row) -> StoreResult<StoryRevision> {
    let temporal = row
        .try_get::<_, Option<&str>>(2)?
        .map(|raw| {
            let read: Temporal =
                serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
            Ok::<_, StoreError>((read.receipt, read.received_at))
        })
        .transpose()?;
    Ok(StoryRevision {
        id: row.try_get(0)?,
        revision: row.try_get(1)?,
        temporal,
    })
}

async fn write_story(tx: &Transaction<'_>, world: &str, job: &StoryJob) -> StoreResult<()> {
    let payload = json_record(job).map_err(|_| StoreError::InvalidRecord)?;
    tx.execute(
        "UPDATE story_jobs SET state=$4,payload=$5 WHERE world_id=$1 AND owner_id=$2 AND id=$3",
        &[&world, &job.owner_id, &job.id, &job.state, &payload],
    )
    .await?;
    Ok(())
}

async fn write_narration(
    tx: &Transaction<'_>,
    world: &str,
    item: &TranscriptItem,
    owner: &str,
    banner: bool,
) -> StoreResult<()> {
    let payload = json_record(item).map_err(|_| StoreError::InvalidRecord)?;
    tx.execute(
        "INSERT INTO story_narrations (world_id,id,owner_id,position,revision,payload)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(world_id,owner_id,id)
      DO UPDATE SET position=excluded.position,revision=excluded.revision,payload=excluded.payload",
        &[
            &world,
            &item.id,
            &owner,
            &item.order,
            &sql_ordinal(item.revision)?,
            &payload,
        ],
    )
    .await?;
    if banner {
        tx.execute("INSERT INTO story_banners (world_id,id,owner_id,position,payload)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT(world_id,owner_id,id)
          DO UPDATE SET position=excluded.position,payload=excluded.payload WHERE (story_banners.position,story_banners.payload) IS DISTINCT FROM (excluded.position,excluded.payload)",
            &[&world,&item.id,&owner,&item.order,&payload]).await?;
    }
    Ok(())
}

async fn cancel_story(
    tx: &Transaction<'_>,
    world: &str,
    job: &mut StoryJob,
    still_permitted: bool,
) -> StoreResult<()> {
    let (id, owner) = (&job.id, &job.owner_id);
    // Revocation removes all private prose and source capsules. Payment
    // remains in the separately retained attempt ledger.
    tx.execute(
        "DELETE FROM story_banners WHERE world_id=$1 AND owner_id=$2 AND id=$3",
        &[&world, &owner, &id],
    )
    .await?;
    if still_permitted && let Some(previous) = job.previous_item.take() {
        job.item = previous;
        job.state.clone_from(&job.item.status);
        write_story(tx, world, job).await?;
        write_narration(tx, world, &job.item, &job.owner_id, false).await?;
        return Ok(());
    }
    tx.execute(
        "DELETE FROM story_narrations WHERE world_id=$1 AND owner_id=$2 AND id=$3",
        &[&world, &owner, &id],
    )
    .await?;
    tx.execute(
        "DELETE FROM story_event_sources WHERE world_id=$1 AND owner_id=$2 AND narration_id=$3",
        &[&world, &owner, &id],
    )
    .await?;
    tx.execute(
        "DELETE FROM story_context_sources WHERE world_id=$1 AND owner_id=$2 AND narration_id=$3",
        &[&world, &owner, &id],
    )
    .await?;
    tx.execute(
        "DELETE FROM story_jobs WHERE world_id=$1 AND owner_id=$2 AND id=$3",
        &[&world, &owner, &id],
    )
    .await?;
    Ok(())
}
