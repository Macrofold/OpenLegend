//! Durable selection of an already-owned method. The parent claim and child
//! receipt commit through the existing writer in one operational transaction.

use super::*;
use crate::{authority::now_ms, store::CommitError};
use indexmap::IndexMap;
use openlegend_simulation::encoding::{json_record_len, sha256_hex};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecipeChoice {
    pub parent_id: String,
    pub action: &'static str,
    pub recipe_id: String,
}

pub(crate) struct ReuseRequest {
    pub id: String,
    pub scope: RequestScope,
    pub text: JsText,
    pub conversation_id: String,
    pub mode: Option<&'static str>,
    pub choice: RecipeChoice,
}

pub(crate) struct PreparedRecipe {
    pub message: JsText,
    pub digest: Box<RawValue>,
    pub life: u64,
    pub custody: ByteReservation,
}

pub(crate) enum CheckedRecipe {
    Prepared(PreparedRecipe),
    Current,
    Refused(&'static str),
}

pub(crate) enum ReuseOutcome {
    Completed {
        id: String,
        status: JobStatus,
        message: JsText,
        written: bool,
        _custody: ByteReservation,
    },
    AlreadyContinued {
        child: String,
        _custody: ByteReservation,
    },
    Refused(&'static str),
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SavedOrigin {
    pub origin: String,
    pub policy_revision: u64,
}

// History never needs these potentially large prior proposal bytes.
#[derive(Deserialize)]
struct ParentOutline<'a> {
    #[serde(borrow)]
    request: ParentRequest<'a>,
}

#[derive(Deserialize)]
struct ParentRequest<'a> {
    #[serde(borrow)]
    invention: ParentLineage<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParentLineage<'a> {
    depth: Option<u64>,
    authority: Option<SavedOrigin>,
    episode_budget_usd: Option<f64>,
    #[serde(borrow)]
    previous: Option<&'a RawValue>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Fingerprint<'a> {
    kind: &'static str,
    text: &'a JsText,
    world_id: &'a str,
    actor_id: &'a str,
    authority: &'a RequestScope,
    conversation_id: &'a str,
    continuation: &'a RecipeChoice,
    #[serde(skip_serializing_if = "Option::is_none")]
    mode: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Child<'a> {
    id: &'a str,
    kind: &'static str,
    created_at: i64,
    status: JobStatus,
    message: &'a JsText,
    authority: &'a RequestScope,
    fingerprint: &'a str,
    request: ChildRequest<'a>,
    invention: ChildResult<'a>,
}

#[derive(Serialize)]
struct ChildRequest<'a> {
    text: &'a JsText,
    invention: ChildSource<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChildSource<'a> {
    root_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    mode: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    episode_budget_usd: Option<f64>,
    depth: u64,
    continuation: &'a RecipeChoice,
    previous: Previous<'a>,
    base: RecipeBase<'a>,
    actor_id: &'a str,
    world_id: &'a str,
    timeline_id: &'a str,
    conversation_id: &'a str,
    authority: &'a SavedOrigin,
}

#[derive(Serialize)]
#[serde(untagged)]
enum Previous<'a> {
    Saved(&'a RawValue),
    Parent {
        intent: &'a JsText,
        feedback: &'a JsText,
        #[serde(skip_serializing_if = "Option::is_none")]
        candidate: Option<&'a RawValue>,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RecipeBase<'a> {
    recipe_id: &'a str,
    version: u64,
    digest: &'a RawValue,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChildResult<'a> {
    code: &'static str,
    recipe_id: &'a str,
}

impl Store {
    /// The synchronous callback checks the native cut and the current
    /// controller before staging and just before COMMIT. It must never wait
    /// for a world turn while this operation owns the PostgreSQL writer.
    pub(crate) async fn reuse_recipe(
        self: &std::sync::Arc<Self>,
        request: std::sync::Arc<ReuseRequest>,
        check: impl Fn(&InventionMatch, &SavedOrigin, Option<u64>) -> StoreResult<CheckedRecipe>
        + Send
        + Sync
        + 'static,
    ) -> Result<ReuseOutcome, CommitError> {
        let store = self.clone();
        self.operational(move |tx| {
            Box::pin(async move { store.reuse_recipe_at(tx, request, check).await })
        })
        .await
    }

    async fn reuse_recipe_at(
        &self,
        tx: &tokio_postgres::Transaction<'_>,
        request: std::sync::Arc<ReuseRequest>,
        check: impl Fn(&InventionMatch, &SavedOrigin, Option<u64>) -> StoreResult<CheckedRecipe>,
    ) -> StoreResult<ReuseOutcome> {
        let identity = Fingerprint {
            kind: "invention",
            text: &request.text,
            world_id: &request.scope.world_id,
            actor_id: &request.scope.actor_id,
            authority: &request.scope,
            conversation_id: &request.conversation_id,
            continuation: &request.choice,
            mode: request.mode,
        };
        let input_bytes = json_record_len(&identity).map_err(|_| StoreError::InvalidRecord)?;
        let _identity = self
            .budget
            .reserve(
                input_bytes
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(256))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let fingerprint = sha256_hex(
            json_record(&identity)
                .map_err(|_| StoreError::InvalidRecord)?
                .as_bytes(),
        );
        let (_previous_transfer, previous) = admitted_query(
            tx,
            "SELECT fingerprint,CASE WHEN selection->>'kind'='invention' THEN payload END FROM jobs WHERE id=$1",
            &[&request.id], &self.budget,
        ).await?;
        if let Some(row) = previous.first() {
            let saved: &str = row.try_get(0)?;
            let body: Option<&str> = row.try_get(1)?;
            let Some(body) = body.filter(|_| saved == fingerprint) else {
                return Ok(ReuseOutcome::Refused("idempotency-conflict"));
            };
            let custody = decode_allowance(&self.budget, body, size_of::<InventionJob>())?;
            let job = decode(body, &request.id, None)?;
            if !job.belongs_to_receipt(&request.scope) {
                return Ok(ReuseOutcome::Refused("idempotency-conflict"));
            }
            return Ok(ReuseOutcome::Completed {
                id: job.id,
                status: job.status,
                message: job.message,
                written: false,
                _custody: custody,
            });
        }
        drop((previous, _previous_transfer));
        let (_transfer, rows) = admitted_query(
            tx,
            "SELECT payload FROM jobs WHERE id=$1 AND selection->>'kind'='invention'",
            &[&request.choice.parent_id],
            &self.budget,
        )
        .await?;
        let Some(row) = rows.first() else {
            return Ok(ReuseOutcome::Refused("stale"));
        };
        let body: &str = row.try_get(0)?;
        let _parent = decode_allowance(&self.budget, body, size_of::<InventionJob>())?;
        let parent = decode(body, &request.choice.parent_id, None)?;
        let source = &parent.request.invention;
        let Some(result) = parent.invention.as_ref().filter(|_| {
            parent.belongs_to_receipt(&request.scope)
                && parent.status.terminal()
                && source.conversation_id.as_deref() == Some(request.conversation_id.as_str())
                && source.mode.as_deref() == request.mode
                && !source.root_id.is_empty()
        }) else {
            return Ok(ReuseOutcome::Refused("stale"));
        };
        if let Some(child) = &result.continued_by {
            let custody = self
                .budget
                .reserve(child.len() + 256)
                .map_err(|_| StoreError::Capacity)?;
            return Ok(ReuseOutcome::AlreadyContinued {
                child: child.clone(),
                _custody: custody,
            });
        }
        let outline: ParentOutline<'_> =
            serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
        let lineage = outline.request.invention;
        let Some(depth) = lineage.depth else {
            return Ok(ReuseOutcome::Refused("stale"));
        };
        if depth >= 8 {
            return Ok(ReuseOutcome::Refused("continuation-limit"));
        }
        let Some(origin) = &lineage.authority else {
            return Ok(ReuseOutcome::Refused("invention-authority"));
        };
        let Some(found) = result
            .search
            .as_ref()
            .filter(|_| matches!(result.code.as_str(), "needs-choice" | "search-unavailable"))
            .and_then(|search| {
                search
                    .matches
                    .iter()
                    .find(|entry| entry.recipe_id == request.choice.recipe_id)
            })
        else {
            return Ok(ReuseOutcome::Refused("stale"));
        };
        let staged = match check(found, origin, None)? {
            CheckedRecipe::Prepared(staged) => staged,
            CheckedRecipe::Refused(code) => return Ok(ReuseOutcome::Refused(code)),
            CheckedRecipe::Current => return Err(StoreError::InvalidRecord),
        };
        let work = body
            .len()
            .checked_mul(16)
            .and_then(|bytes| bytes.checked_add(input_bytes.checked_mul(8)?))
            .and_then(|bytes| bytes.checked_add(staged.custody.bytes().checked_mul(2)?))
            .and_then(|bytes| bytes.checked_add(4096))
            .ok_or(StoreError::Capacity)?;
        let _work = self
            .budget
            .reserve(work)
            .map_err(|_| StoreError::Capacity)?;
        let rewritten = claimed_parent(body, &request.id)?;

        let previous = lineage.previous.map_or_else(
            || Previous::Parent {
                intent: &parent.request.text,
                feedback: &parent.message,
                candidate: result.candidate.as_deref().or(source.candidate.as_deref()),
            },
            Previous::Saved,
        );
        let now = now_ms();
        let child = Child {
            id: &request.id,
            kind: "invention",
            created_at: now,
            status: JobStatus::Completed,
            message: &staged.message,
            authority: &request.scope,
            fingerprint: &fingerprint,
            request: ChildRequest {
                text: &request.text,
                invention: ChildSource {
                    root_id: &source.root_id,
                    mode: request.mode,
                    episode_budget_usd: lineage.episode_budget_usd,
                    depth: depth + 1,
                    continuation: &request.choice,
                    previous,
                    base: RecipeBase {
                        recipe_id: &found.recipe_id,
                        version: found.version,
                        digest: &staged.digest,
                    },
                    actor_id: &request.scope.actor_id,
                    world_id: &request.scope.world_id,
                    timeline_id: &request.scope.timeline_id,
                    conversation_id: &request.conversation_id,
                    authority: origin,
                },
            },
            invention: ChildResult {
                code: "reused",
                recipe_id: &found.recipe_id,
            },
        };
        let selection = serde_json::json!({
            "kind": child.kind,
            "status": child.status,
            "completedAt": now,
            "authority": {
                "accountId": encoded_key(&request.scope.account_id)?,
                "actorId": encoded_key(&request.scope.actor_id)?,
                "worldId": encoded_key(&request.scope.world_id)?,
                "timelineId": encoded_key(&request.scope.timeline_id)?,
            },
            "displayMessage": encoded_key(&staged.message)?,
            "request": {
                "invention": {
                    "actorId": encoded_key(&request.scope.actor_id)?,
                    "worldId": encoded_key(&request.scope.world_id)?,
                    "timelineId": encoded_key(&request.scope.timeline_id)?,
                }
            }
        })
        .to_string();
        let mut child_body = json_record(&child).map_err(|_| StoreError::InvalidRecord)?;
        // The shared job upsert owns final completion time and fingerprint matching.
        child_body.pop();
        if tx
            .query_opt(
                &self.schema.upsert_job,
                &[&request.id, &fingerprint, &child_body, &selection, &now],
            )
            .await?
            .is_none()
            || tx
                .execute(
                    "UPDATE jobs SET payload=$1 WHERE id=$2 AND payload=$3",
                    &[&rewritten, &parent.id, &body],
                )
                .await?
                != 1
        {
            return Err(StoreError::StaleCut);
        }
        match check(found, origin, Some(staged.life))? {
            CheckedRecipe::Current => {}
            CheckedRecipe::Refused(_) => return Err(StoreError::StaleCut),
            CheckedRecipe::Prepared(_) => return Err(StoreError::InvalidRecord),
        }
        let PreparedRecipe {
            message,
            digest,
            mut custody,
            ..
        } = staged;
        drop((digest, child_body, selection, rewritten, _work));
        custody
            .resize(message.storage_bytes() + request.id.capacity() + 256)
            .map_err(|_| StoreError::Capacity)?;
        Ok(ReuseOutcome::Completed {
            id: request.id.clone(),
            status: JobStatus::Completed,
            message,
            written: true,
            _custody: custody,
        })
    }
}

fn encoded_key(value: &(impl Serialize + ?Sized)) -> StoreResult<String> {
    json_record(value).map_err(|_| StoreError::InvalidRecord)
}

fn claimed_parent(body: &str, child: &str) -> StoreResult<String> {
    let invalid = |_| StoreError::InvalidRecord;
    let mut record: IndexMap<&str, &RawValue> = serde_json::from_str(body).map_err(invalid)?;
    let mut result: IndexMap<&str, &RawValue> = serde_json::from_str(
        record
            .get("invention")
            .ok_or(StoreError::InvalidRecord)?
            .get(),
    )
    .map_err(invalid)?;
    let child = encoded_key(child)?;
    result.insert(
        "continuedBy",
        serde_json::from_str(&child).map_err(invalid)?,
    );
    let claimed = json_record(&result).map_err(invalid)?;
    // continuedBy is a body field. The finite SQL routing projection stays exact.
    record.insert(
        "invention",
        serde_json::from_str(&claimed).map_err(invalid)?,
    );
    json_record(&record).map_err(invalid)
}
