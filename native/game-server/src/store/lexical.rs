//! Exact durable lexical queue work. Builds borrow no world turn or SQL
//! writer. The completed transaction rechecks every original claim key.

use super::{CommitError, Store, StoreError, StoreResult, durable_head, ordinal, sql_ordinal};
use crate::language::{LanguageError, LanguageProvider, LexicalVector};
use openlegend_simulation::{
    encoding::json_record,
    host::{ByteBudget, ByteReservation},
};
use serde::Serialize;
use std::{collections::HashSet, sync::Arc};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Claim {
    actor: String,
    id: String,
    kind: String,
    revision: String,
    world_revision: i64,
}

struct Pending {
    claim: Claim,
    removing: bool,
    text: Option<String>,
}

pub struct PendingLexical {
    world: String,
    generation: String,
    pending: Vec<Pending>,
    storage: ByteReservation,
}

struct Prepared {
    claim: Claim,
    expected: bool,
    vector: Option<LexicalVector>,
}

pub struct PreparedLexical {
    world: String,
    generation: String,
    rows: Vec<Prepared>,
    _storage: ByteReservation,
}

impl PendingLexical {
    /// Prepare admitted search text without holding a Postgres transaction.
    /// The optional vectors carry independent storage until their fixed-key
    /// transaction completes, while this original input is released promptly.
    pub fn prepare(
        self,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> Result<PreparedLexical, LanguageError> {
        let Self {
            world,
            generation,
            pending,
            mut storage,
        } = self;
        let _transition = budget
            .reserve(
                pending
                    .len()
                    .checked_mul(std::mem::size_of::<Prepared>())
                    .ok_or(LanguageError::Capacity)?,
            )
            .map_err(|_| LanguageError::Capacity)?;
        let mut rows = Vec::with_capacity(pending.len());
        for row in pending {
            let vector = if row.removing {
                None
            } else {
                row.text
                    .as_deref()
                    .map(|text| language.lexical_vector(text, budget))
                    .transpose()?
            };
            rows.push(Prepared {
                claim: row.claim,
                expected: !row.removing && row.text.as_deref().is_some_and(|s| !s.is_empty()),
                vector,
            });
        }
        let bytes = rows
            .iter()
            .try_fold(
                4096usize + world.capacity() + generation.capacity(),
                |bytes, row| {
                    bytes
                        .checked_add(row.claim.actor.capacity())?
                        .checked_add(row.claim.id.capacity())?
                        .checked_add(row.claim.kind.capacity())?
                        .checked_add(row.claim.revision.capacity())?
                        .checked_add(std::mem::size_of::<Prepared>())
                },
            )
            .ok_or(LanguageError::Capacity)?;
        storage.resize(bytes).map_err(|_| LanguageError::Capacity)?;
        Ok(PreparedLexical {
            world,
            generation,
            rows,
            _storage: storage,
        })
    }
}

impl Store {
    /// Capture one bounded prefix of queued source bodies. The size/bodies
    /// statements share one repeatable snapshot and the same selected rows.
    /// An empty statement result transfers no body and needs no writer.
    pub async fn pending_lexical(self: &Arc<Self>) -> StoreResult<Option<PendingLexical>> {
        let store = self.clone();
        self.read_operational(move |transaction|Box::pin(async move {
            let work=&store.schema.lexical.work;
            let _query=store.budget.reserve(work.len().checked_mul(4).and_then(|n|n.checked_add(4096)).ok_or(StoreError::Capacity)?)
                .map_err(|_|StoreError::Capacity)?;
            let selected=format!("SELECT * FROM ({work}) AS pending WHERE id IS NOT NULL");
            let summary=transaction.query_one(&format!("SELECT count(*),COALESCE(sum(
                octet_length(world_id)+octet_length(generation)+octet_length(actor_id)+octet_length(id)
                +octet_length(source_kind)+octet_length(source_revision)+COALESCE(octet_length(search_text),0)),0)::bigint
                FROM ({selected}) AS admitted"), &[]).await?;
            let count=ordinal(summary.try_get(0)?)?;
            if count==0 {return Ok(None);}
            let bytes=ordinal(summary.try_get(1)?)?.checked_mul(8)
                .and_then(|n|n.checked_add(count.checked_mul(4096)?))
                .and_then(|n|n.checked_add(8192)).and_then(|n|usize::try_from(n).ok()).ok_or(StoreError::Capacity)?;
            let mut custody=store.budget.reserve(bytes).map_err(|_|StoreError::Capacity)?;
            let rows=transaction.query(&selected,&[]).await?;
            if rows.len() as u64!=count {return Err(StoreError::StaleCut);}
            let first=rows.first().ok_or(StoreError::StaleCut)?;
            let world=first.try_get::<_,String>("world_id")?;
            let generation=first.try_get::<_,String>("generation")?;
            let pending=rows.iter().map(|row| {
                if row.try_get::<_,&str>("world_id")?!=world || row.try_get::<_,&str>("generation")?!=generation {
                    return Err(StoreError::InvalidRecord);
                }
                Ok(Pending {
                    claim:Claim { actor:row.try_get("actor_id")?, id:row.try_get("id")?, kind:row.try_get("source_kind")?,
                        revision:row.try_get("source_revision")?, world_revision:row.try_get("world_revision")? },
                    removing:row.try_get("removing")?, text:row.try_get("search_text")?,
                })
            }).collect::<StoreResult<Vec<_>>>()?;
            drop(rows);
            let retained=pending.iter().try_fold(4096usize+world.capacity()+generation.capacity(),|bytes,row| {
                bytes.checked_add(row.claim.actor.capacity())?.checked_add(row.claim.id.capacity())?
                    .checked_add(row.claim.kind.capacity())?.checked_add(row.claim.revision.capacity())?
                    .checked_add(row.text.as_ref().map_or(0,String::capacity))?.checked_add(std::mem::size_of::<Pending>())
            }).ok_or(StoreError::Capacity)?;
            custody.resize(retained).map_err(|_|StoreError::Capacity)?;
            Ok(Some(PendingLexical{world,generation,pending,storage:custody}))
        })).await
    }

    /// Publish only still-current queue claims and exact source revisions.
    /// An obsolete claim leaves its replacement queued for a fresh read.
    pub async fn publish_lexical(
        self: &Arc<Self>,
        plan: PreparedLexical,
        hard_bytes: u64,
    ) -> Result<bool, CommitError> {
        let hard = sql_ordinal(hard_bytes).map_err(CommitError::RolledBack)?;
        let store = self.clone();
        self.operational(move |transaction|Box::pin(async move {
            let head=durable_head(transaction).await?.ok_or(StoreError::StaleCut)?;
            let world=plan.world.as_str();
            let generation=plan.generation.as_str();
            if head.world_id!=world || head.generation!=generation {return Err(StoreError::StaleCut);}
            let transfer=plan.rows.iter().try_fold(16384usize,|bytes,row| {
                let key=1024usize.checked_add(row.claim.actor.len())?.checked_add(row.claim.id.len())?
                    .checked_add(row.claim.kind.len())?.checked_add(row.claim.revision.len())?;
                bytes.checked_add(key.checked_mul(12)?)?.checked_add(row.vector.as_ref().map_or(0,|value|value.as_str().len()).checked_mul(12)?)
            }).ok_or(StoreError::Capacity)?;
            let _sql=store.budget.reserve(transfer).map_err(|_|StoreError::Capacity)?;
            let requested:Vec<_>=plan.rows.iter().map(|row|&row.claim).collect();
            let request=json_record(&requested).map_err(|_|StoreError::InvalidRecord)?;
            let found=transaction.query("WITH requested AS (
              SELECT value,ord FROM jsonb_array_elements($1::text::jsonb) WITH ORDINALITY q(value,ord)
            ) SELECT ord,GREATEST(0::bigint,$4-COALESCE(u.bytes,0)),r.search_text<>'' AS available
              FROM requested s JOIN memory_lexical_pending q ON q.world_id=$2 AND q.generation=$3
                AND q.actor_id=s.value->>'actor' AND q.id=s.value->>'id' AND q.source_kind=s.value->>'kind'
                AND q.source_revision=s.value->>'revision' AND q.world_revision=(s.value->>'worldRevision')::bigint
              LEFT JOIN memory_derived_usage u ON u.world_id=q.world_id AND u.actor_id=q.actor_id
              LEFT JOIN recall_sources r ON r.world_id=q.world_id AND r.actor_id=q.actor_id AND r.id=q.id AND r.source_kind=q.source_kind AND r.revision=q.source_revision
              ORDER BY ord",&[&request,&world,&generation,&hard]).await?;
            drop(request);
            #[derive(Serialize)]
            struct Write<'a> {
                #[serde(flatten)] claim:&'a Claim,
                budget:i64,
                vector:Option<&'a str>,
            }
            let mut writes=Vec::with_capacity(found.len());
            let mut expected=Vec::new();
            for selected in &found {
                let index=ordinal(selected.try_get(0)?)?.checked_sub(1).and_then(|n|usize::try_from(n).ok()).ok_or(StoreError::InvalidRecord)?;
                let row=plan.rows.get(index).ok_or(StoreError::InvalidRecord)?;
                let available=selected.try_get::<_,Option<bool>>(2)?==Some(true);
                let admitted=selected.try_get::<_,i64>(1)?;
                if available && row.expected {expected.push(&row.claim);}
                writes.push(Write {claim:&row.claim,budget:admitted,
                    vector:if available && admitted>0 {row.vector.as_ref().map(LexicalVector::as_str)} else {None}});
            }
            drop(found);
            if writes.is_empty() {return Ok(true);}
            let values=json_record(&writes).map_err(|_|StoreError::InvalidRecord)?;
            let stored=transaction.query(&store.schema.lexical.write,&[&values,&world,&generation]).await?;
            let saved:HashSet<_>=stored.iter().map(|row|Ok((row.try_get::<_,&str>(0)?,row.try_get::<_,&str>(1)?,row.try_get::<_,&str>(2)?)))
                .collect::<StoreResult<_>>()?;
            let missing:HashSet<_>=expected.into_iter().filter(|row|!saved.contains(&(row.actor.as_str(),row.id.as_str(),row.kind.as_str())))
                .map(|row|row.actor.as_str()).collect();
            if !missing.is_empty(){
                let actors:Vec<_>=missing.into_iter().collect();
                transaction.execute("INSERT INTO memory_lexical_progress SELECT world_id,generation,0,0,0,$2::text[] FROM world_head WHERE world_id=$1
                  ON CONFLICT(world_id) DO UPDATE SET incomplete_actors=ARRAY(SELECT DISTINCT unnest(memory_lexical_progress.incomplete_actors||excluded.incomplete_actors))",&[&world,&actors]).await?;
            }
            drop(values);
            let completed=transaction.query_one(&store.schema.lexical.complete,&[
                &json_record(&writes.iter().map(|row|row.claim).collect::<Vec<_>>()).map_err(|_|StoreError::InvalidRecord)?,
                &world,&generation,&sql_ordinal(head.revision)?]).await?;
            Ok(!completed.try_get::<_,bool>(0)?)
        })).await
    }
}
