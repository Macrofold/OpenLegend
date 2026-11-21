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
        self.read_operational(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != world || head.generation != generation {
                    return Err(StoreError::StaleCut);
                }
                let schedule = key(&world, &actor);
                let (_transfer, rows) = admitted_query(
                    tx,
                    "SELECT value FROM meta WHERE key=$1",
                    &[&schedule],
                    &budget,
                )
                .await?;
                let raw = rows
                    .first()
                    .map(|row| row.try_get::<_, &str>(0))
                    .transpose()?;
                let bytes = raw
                    .map_or(Some(2048), |value| {
                        json_tree_allocation_bound(value)
                            .and_then(|n| n.checked_add(value.len()))
                            .and_then(|n| n.checked_add(2048))
                    })
                    .ok_or(StoreError::Capacity)?;
                let custody = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
                let cursor = raw
                    .map(|value| serde_json::from_str(value).map_err(|_| StoreError::InvalidRecord))
                    .transpose()?
                    .unwrap_or_default();
                Ok(ThoughtRead {
                    cursor,
                    speech: BTreeSet::new(),
                    expected: raw.map(str::to_owned),
                    _custody: custody,
                })
            })
        })
        .await
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
        mut event_ids: Vec<String>,
    ) -> StoreResult<ThoughtRead> {
        event_ids.sort_unstable();
        event_ids.dedup();
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

                // Fund escaped keys, driver buffers and one fixed-width row
                // per input. No variable-size body transfer needs a preflight.
                let work_bytes = event_ids
                    .iter()
                    .try_fold(
                        actor
                            .len()
                            .checked_mul(24)
                            .and_then(|bytes| bytes.checked_add(2048))
                            .ok_or(StoreError::Capacity)?,
                        |sum, id| {
                            sum.checked_add(2048)?
                                .checked_add(id.len().checked_mul(24)?)
                        },
                    )
                    .ok_or(StoreError::Capacity)?;
                let _working = budget
                    .reserve(work_bytes)
                    .map_err(|_| StoreError::Capacity)?;
                let encoded = event_ids
                    .iter()
                    .map(json_record)
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let recipient = json_record(&actor).map_err(|_| StoreError::InvalidRecord)?;
                // The latest job owns the original speech even if the
                // provider never ran or the reply failed. Compare the actor
                // after selecting that job, never against an older attempt.
                let rows = openlegend_simulation::profile_result!(
                    BODY,
                    tx.query(
                        "SELECT wanted.ordinality, latest.npc_id=$2 \
                         FROM unnest($1::text[]) WITH ORDINALITY AS wanted(event_key,ordinality) \
                         CROSS JOIN LATERAL ( \
                           SELECT selection->>'npcId' AS npc_id FROM jobs \
                           WHERE selection #>> '{kind}'='chat' \
                             AND selection #>> '{playerSpeechEventId}'=wanted.event_key \
                           ORDER BY created_at DESC,id DESC LIMIT 1 \
                         ) latest",
                        &[&encoded, &recipient],
                    )
                )
                .await?;
                openlegend_simulation::profile_count!(BODY_ROWS, rows.len() as u64);
                for row in rows {
                    let index = usize::try_from(row.try_get::<_, i64>(0)?)
                        .ok()
                        .and_then(|ordinality| ordinality.checked_sub(1))
                        .ok_or(StoreError::InvalidRecord)?;
                    let id = event_ids.get_mut(index).ok_or(StoreError::InvalidRecord)?;
                    let owned = row
                        .try_get::<_, Option<bool>>(1)?
                        .ok_or(StoreError::InvalidRecord)?;
                    if owned {
                        prior.speech.insert(std::mem::take(id));
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
