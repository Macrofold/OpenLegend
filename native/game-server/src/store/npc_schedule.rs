//! The ordinary NPC cursor uses the current Source integration key and job
//! index. One PostgreSQL transaction records an admitted job and consumes its
//! exact predecessor. A restart never resubmits an already recorded attempt.

use super::{
    AdmittedJob, CommitError, Store, StoreError, StoreResult, durable_head, read::admitted_query,
};
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound},
    host::ByteReservation,
};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, sync::Arc};

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ThoughtCursor {
    pub(crate) fingerprint: Option<String>,
    pub(crate) semantic_revision: Option<String>,
    pub(crate) at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) watermark: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) attempted_opportunity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) attempted_job_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) review_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) skipped_opportunity: Option<String>,
}

pub(crate) struct ThoughtRead {
    pub(crate) cursor: ThoughtCursor,
    pub(crate) speech: BTreeSet<String>,
    expected: Option<String>,
    _custody: ByteReservation,
}

fn key(world: &str, actor: &str) -> String {
    format!("integration:semantic-schedule:{world}:{actor}")
}

impl Store {
    /// A durable intent without a reply is an uncertain paid attempt. Only
    /// a definitely unsubmitted reservation can be made available again.
    pub(crate) async fn discovery_spent(&self, job: String) -> StoreResult<bool> {
        self.read_operational(move |tx| Box::pin(async move {
            let row = tx.query_one("SELECT coalesce(bool_or(CASE WHEN a.receipt IS NULL THEN l.dispatch_intent ELSE coalesce((a.receipt::jsonb->>'dispatched')::bool,false) OR coalesce((a.receipt::jsonb->>'completionUncertain')::bool,false) END),false) FROM cognition_attempt_links l JOIN attempts a ON a.id=l.attempt_id WHERE l.root_job_id=$1", &[&job]).await?;
            Ok(row.try_get(0)?)
        })).await
    }

    /// Read the chosen actor's durable cursor for selecting the native trigger.
    /// The detached result retains the exact predecessor for the joined write.
    pub(crate) async fn thought_read(
        &self,
        world: String,
        generation: String,
        actor: String,
    ) -> StoreResult<ThoughtRead> {
        let budget = self.budget.clone();
        self.read_operational(move |tx|Box::pin(async move {
            let head=durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
            if head.world_id!=world || head.generation!=generation {return Err(StoreError::StaleCut);}
            let schedule=key(&world,&actor);
            let (_transfer, rows)=admitted_query(tx,"SELECT value FROM meta WHERE key=$1",&[&schedule],&budget).await?;
            let raw=rows.first().map(|row|row.try_get::<_,&str>(0)).transpose()?;
            let bytes=raw.map_or(Some(2048),|value|json_tree_allocation_bound(value).and_then(|n|n.checked_add(value.len())).and_then(|n|n.checked_add(2048))).ok_or(StoreError::Capacity)?;
            let custody=budget.reserve(bytes).map_err(|_|StoreError::Capacity)?;
            let cursor=raw.map(|value|serde_json::from_str(value).map_err(|_|StoreError::InvalidRecord)).transpose()?.unwrap_or_default();
            Ok(ThoughtRead {cursor,speech:BTreeSet::new(),expected:raw.map(str::to_owned),_custody:custody})
        })).await
    }

    /// Read job ownership only for speech selected by the native trigger.
    /// Check its predecessor and generation in the job snapshot. If either
    /// changed during capture, refuse and let a later wake rebuild the trigger.
    pub(crate) async fn thought_speech(
        &self,
        world: String,
        generation: String,
        actor: String,
        mut prior: ThoughtRead,
        event_ids: Vec<String>,
    ) -> StoreResult<ThoughtRead> {
        let budget = self.budget.clone();
        let bytes = event_ids
            .iter()
            .try_fold(prior._custody.bytes(), |sum, id| {
                sum.checked_add(256)?.checked_add(id.len())
            })
            .ok_or(StoreError::Capacity)?;
        prior
            ._custody
            .resize(bytes)
            .map_err(|_| StoreError::Capacity)?;
        self.read_operational(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != world || head.generation != generation {
                    return Err(StoreError::StaleCut);
                }
                let schedule = key(&world, &actor);
                let same: bool = tx
                    .query_one(
                        "SELECT (SELECT value FROM meta WHERE key=$1) IS NOT DISTINCT FROM $2",
                        &[&schedule, &prior.expected],
                    )
                    .await?
                    .try_get(0)?;
                if !same {
                    return Err(StoreError::StaleCut);
                }

                // The current job index owns the original speech regardless
                // of whether the provider ever ran or the reply later failed.
                // Do not parse player prose as PostgreSQL JSONB. Canonical
                // job bodies can contain independently encoded UTF-16 text.
                let encoded = event_ids
                    .iter()
                    .map(json_record)
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let (_job_transfer, rows) = admitted_query(
                    tx,
                    "SELECT DISTINCT ON (selection #>> '{playerSpeechEventId}') payload FROM jobs \
                     WHERE selection #>> '{kind}'='chat' AND selection #>> '{playerSpeechEventId}'=ANY($1) \
                     ORDER BY selection #>> '{playerSpeechEventId}',created_at DESC,id DESC",
                    &[&encoded],
                    &budget,
                )
                .await?;
                #[derive(Deserialize)]
                #[serde(rename_all="camelCase")]
                struct SpeechOwner<'a> {
                    #[serde(borrow)]
                    request: SpeechRecipient<'a>,
                    player_speech_event_id: &'a str,
                }
                #[derive(Deserialize)]
                #[serde(rename_all="camelCase")]
                struct SpeechRecipient<'a> {
                    npc_id: &'a str,
                }
                for row in rows {
                    let owner: SpeechOwner<'_> = serde_json::from_str(row.try_get(0)?)
                        .map_err(|_| StoreError::InvalidRecord)?;
                    if owner.request.npc_id == actor
                        && event_ids.iter().any(|id| id == owner.player_speech_event_id)
                    {
                        prior.speech.insert(owner.player_speech_event_id.to_owned());
                    }
                }
                Ok(prior)
            })
        })
        .await
    }

    /// Publish the same native opportunity at most once. The previous
    /// durable cursor remains recoverable if either insertion fails.
    pub(crate) async fn accept_thought(
        self: &Arc<Self>,
        world: String,
        generation: String,
        actor: String,
        prior: ThoughtRead,
        cursor: ThoughtCursor,
        job: Option<Arc<AdmittedJob>>,
    ) -> Result<(), CommitError> {
        let store = self.clone();
        self.operational(move |tx|Box::pin(async move {
            let head=durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
            if head.world_id!=world || head.generation!=generation {return Err(StoreError::StaleCut);}
            let key=key(&world,&actor);
            let prior_present=prior.expected.is_some();
            let match_previous=tx.query_opt("SELECT value = $2 FROM meta WHERE key=$1 FOR UPDATE",&[&key,&prior.expected]).await?;
            let same=match_previous.as_ref().map(|row|row.try_get::<_,Option<bool>>(0)).transpose()?.flatten();
            if (prior_present && same!=Some(true)) || (!prior_present && match_previous.is_some()) {return Err(StoreError::StaleCut);}
            let value=json_record(&cursor).map_err(|_|StoreError::InvalidRecord)?;
            tx.execute("INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value IS DISTINCT FROM excluded.value",&[&key,&value]).await?;
            if let Some(job)=job.as_ref() {
                if job.job.request.npc_id!=actor || job.job.kind!="thought" || cursor.attempted_job_id.as_deref()!=Some(job.job.id.as_str()) {return Err(StoreError::InvalidRecord);}
                store.write_conversation_job(tx,&job.job).await?;
            }
            Ok(())
        })).await
    }
}
