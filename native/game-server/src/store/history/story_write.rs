//! Ordinary history adds a selected narration and exact acquired sources in
//! the same SQL transaction. Provider claims are a later operational stage.

use super::super::{Store, StoreError, StoreResult, sql_ordinal};
use super::perspective::Compare;
use super::story::{Impact, PolicyStamp, StoryCandidate, StorySource};
use openlegend_simulation::{encoding::json_record, narration::native_text, text::JsText};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio_postgres::Transaction;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoryJob {
    id: String,
    owner_id: String,
    actor_id: String,
    item: TranscriptItem,
    sources: Vec<StorySource>,
    voice: String,
    created_at: i64,
    state: String,
    selection: PolicyStamp,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptItem {
    id: String,
    kind: String,
    text: JsText,
    time: f64,
    order: i64,
    source_ids: Vec<String>,
    impacts: Vec<Impact>,
    status: String,
    revision: u64,
    voice: String,
}

impl Store {
    pub(super) async fn append_stories(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        mut candidates: Vec<StoryCandidate<'_>>,
        compare: &Compare<'_>,
    ) -> StoreResult<()> {
        let mut failed = false;
        candidates.sort_by(|left, right| {
            right
                .importance
                .total_cmp(&left.importance)
                .then_with(|| left.source.order.cmp(&right.source.order))
                .then_with(|| {
                    compare(&left.source.id, &right.source.id).unwrap_or_else(|_| {
                        failed = true;
                        Ordering::Equal
                    })
                })
        });
        if failed {
            return Err(StoreError::InvalidRecord);
        }
        for candidate in candidates {
            self.schedule_story(transaction, world, candidate, compare)
                .await?;
        }
        Ok(())
    }

    async fn schedule_story(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        mut candidate: StoryCandidate<'_>,
        compare: &Compare<'_>,
    ) -> StoreResult<()> {
        let owner = candidate.owner;
        let source = candidate.source;
        if let Some(milestone) = candidate.milestone.as_deref()
            && transaction.query_opt("SELECT 1 FROM story_milestones WHERE world_id=$1 AND owner_id=$2 AND milestone=$3",
                    &[&world,&owner,&milestone]).await?.is_some() {
            return Ok(());
        }
        let id = format!("story:{owner}:{}", candidate.grouping);
        let prior = transaction.query_opt("SELECT state,octet_length(payload)::bigint FROM story_jobs WHERE world_id=$1 AND id=$2 AND owner_id=$3", &[&world,&id,&owner]).await?;
        let (prior, _prior) = if let Some(prior) = prior {
            let state: &str = prior.try_get(0)?;
            if state != "queued" {
                return Ok(());
            }
            let bytes =
                usize::try_from(prior.try_get::<_, i64>(1)?).map_err(|_| StoreError::Capacity)?;
            let custody = self
                .budget
                .reserve(
                    bytes
                        .checked_mul(32)
                        .and_then(|n| n.checked_add(4096))
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            let result = transaction
                .query_one(
                    "SELECT payload FROM story_jobs WHERE world_id=$1 AND id=$2 AND owner_id=$3",
                    &[&world, &id, &owner],
                )
                .await?;
            let payload: &str = result.try_get(0)?;
            if payload.len() != bytes {
                return Err(StoreError::StaleCut);
            }
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct Prior {
                actor_id: String,
                item: TranscriptItem,
                sources: Vec<StorySource>,
                created_at: i64,
                selection: Option<PolicyStamp>,
            }
            let previous: Prior =
                serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
            if previous.actor_id != candidate.actor
                || previous.sources.len() >= candidate.maximum_sources
                || previous
                    .selection
                    .as_ref()
                    .is_none_or(|prior| prior.policy_revision != candidate.stamp.policy_revision)
                || previous.sources.iter().any(|source| source.id == source.id)
            {
                return Ok(());
            }
            (
                Some((
                    previous.sources,
                    previous.item.impacts,
                    previous.created_at,
                    previous.item.revision,
                )),
                Some(custody),
            )
        } else {
            let blocked=transaction.query_one("SELECT EXISTS(SELECT 1 FROM story_jobs WHERE world_id=$1 AND owner_id=$2 AND state IN ('queued','running')) OR EXISTS (
                        SELECT 1 FROM story_delivery WHERE world_id=$1 AND owner_id=$2 AND $3::double precision-game_time<$4::double precision)",
                &[&world,&owner,&source.time,&candidate.minimum_interval]).await?.try_get::<_,bool>(0)?;
            if blocked {
                return Ok(());
            }
            (None, None)
        };
        let voice_key = format!("integration:narrator-voice:{owner}");
        let voice = transaction
            .query_opt("SELECT value FROM meta WHERE key=$1", &[&voice_key])
            .await?
            .map(|row| {
                serde_json::from_str::<String>(row.get(0)).map_err(|_| StoreError::InvalidRecord)
            })
            .transpose()?
            .unwrap_or_else(|| "restrained".to_owned());
        if !matches!(voice.as_str(), "restrained" | "lyrical" | "wry") {
            return Err(StoreError::InvalidRecord);
        }
        let first = prior.is_none();
        let (mut sources, mut impacts, created_at, revision) = if let Some(prior) = prior {
            prior
        } else {
            (
                Vec::new(),
                Vec::new(),
                i64::try_from(
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map_err(|_| StoreError::InvalidRecord)?
                        .as_millis(),
                )
                .map_err(|_| StoreError::Capacity)?,
                1,
            )
        };
        // This freshly authorized source is moved into the prepared job. Its
        // original/perspective owners remain independent from job custody.
        let event_time = source.time;
        let event_id = source.id.clone();
        sources.push(source);
        impacts.append(&mut candidate.impacts);
        let mut failed = false;
        sources.sort_by(|left, right| {
            left.order.cmp(&right.order).then_with(|| {
                compare(&left.id, &right.id).unwrap_or_else(|_| {
                    failed = true;
                    Ordering::Equal
                })
            })
        });
        if failed {
            return Err(StoreError::InvalidRecord);
        }
        let anchor = sources.last().ok_or(StoreError::InvalidRecord)?;
        let mut text = JsText::from("");
        for (index, source) in sources.iter().enumerate() {
            if index != 0 {
                text.push_str(" ");
            }
            text.push_text(&native_text(&source.text));
        }
        let job = StoryJob {
            id: id.clone(),
            owner_id: owner.to_owned(),
            actor_id: candidate.actor.to_owned(),
            item: TranscriptItem {
                id: id.clone(),
                kind: "narration".to_owned(),
                text,
                time: anchor.time,
                order: anchor.order,
                source_ids: sources.iter().map(|source| source.id.clone()).collect(),
                impacts,
                status: "pending".to_owned(),
                revision,
                voice: voice.clone(),
            },
            sources,
            voice,
            created_at,
            state: "queued".to_owned(),
            selection: candidate.stamp.clone(),
        };
        let job_payload = json_record(&job).map_err(|_| StoreError::InvalidRecord)?;
        let narration = json_record(&job.item).map_err(|_| StoreError::InvalidRecord)?;
        transaction
            .execute(
                "DELETE FROM story_banners WHERE world_id=$1 AND owner_id=$2 AND id=$3",
                &[&world, &owner, &id],
            )
            .await?;
        transaction.execute("INSERT INTO story_jobs VALUES ($1,$2,$3,'queued',$4,$5) ON CONFLICT(world_id,id,owner_id)
            DO UPDATE SET state=excluded.state,payload=excluded.payload", &[&world,&id,&owner,&created_at,&job_payload]).await?;
        transaction.execute("INSERT INTO story_narrations VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(world_id,owner_id,id)
            DO UPDATE SET position=excluded.position,revision=excluded.revision,payload=excluded.payload",
            &[&world,&id,&owner,&job.item.order,&sql_ordinal(revision)?,&narration]).await?;
        if first {
            transaction
                .execute(
                    "INSERT INTO story_delivery VALUES ($1,$2,$3) ON CONFLICT(world_id,owner_id)
                DO UPDATE SET game_time=excluded.game_time",
                    &[&world, &owner, &event_time],
                )
                .await?;
        }
        transaction.execute("INSERT INTO story_event_sources SELECT $1,$2,$3,s.event FROM unnest($4::text[]) s(event) ON CONFLICT DO NOTHING",
            &[&world,&id,&owner,&job.item.source_ids]).await?;
        if let Some(milestone) = candidate.milestone.as_deref() {
            transaction
                .execute(
                    "INSERT INTO story_milestones VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
                    &[&world, &owner, &milestone, &event_id],
                )
                .await?;
        }
        Ok(())
    }
}
