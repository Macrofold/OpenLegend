//! The optional exact stage owns one diagnostic-only connection for writes.
//! The ordinary job and provider receipt remain the only authoritative facts.
use super::{HISTORY, ReadAccess, Store, StoreError, StoreResult, admitted_query};
use crate::store::{Session, sql_ordinal};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    runtime::RuntimeNpcStageWitness,
};
use serde::Deserialize;
use tokio_postgres::Transaction;

// LA199 counts the exact submitted text before it becomes a JSONB string.
// Diagnostic projections in the retiring host read only the display columns.
// The scoped Rust stage reader selects the private input from selection.
const MAX_INPUT_BYTES: i64 = 500_000;
const MAX_PROOF_BYTES: i64 = 8_192;
const MAX_RECORD_BYTES: i64 = 1_000_000;
const PRUNE_INTERVAL: usize = 25;

const WRITE: &str = r#"
    WITH input AS (SELECT $3::text::jsonb AS witness), captured AS MATERIALIZED (
    SELECT 'rust-stage:' || a.id AS id,a.receipt::jsonb->>'startedAt' AS started_at,
        jsonb_build_object(
            'kind','rust-stage-capture', 'parentId',j.id,
            'providerRequestDigest',$2::text,
            'ownerActor',j.selection#>>'{authority,actorId}', 'privacyKey',$5::text,
            'input',$8::text, 'proof',jsonb_build_object('witness',input.witness,'playerLife',$6::bigint,
                'grantRevision',$7::bigint,'redacted',$9::boolean)
        ) AS selection
    FROM input CROSS JOIN world_head h
    JOIN attempts a ON a.id=$1
    JOIN cognition_attempt_links l ON l.attempt_id=a.id AND l.stage='generate'
    JOIN jobs j ON j.id=l.root_job_id
    WHERE h.id=1 AND h.world_id=input.witness->>'worldId' AND h.generation=input.witness->>'generation'
    AND j.selection->>'kind'='chat' AND j.selection->>'status'='completed'
    AND j.selection ? 'playerSpeechEventId' AND j.selection->>'npcId'=$4
    AND j.selection#>>'{authority,accountId}' IS NOT NULL
    AND j.selection#>>'{authority,actorId}' IS NOT NULL
    AND (j.selection#>>'{authority,worldId}')::jsonb=to_jsonb(h.world_id)
    AND (j.selection#>>'{authority,timelineId}')::jsonb=(SELECT value::jsonb FROM meta
        WHERE key='integration:world-timeline:' || h.world_id)
    AND a.id=j.id || ':attempt:0:generate' AND l.dispatch_intent AND a.status='settled'
    AND a.receipt::jsonb->>'requestId'=a.id AND a.receipt::jsonb->>'providerRequestDigest'=$2
    AND a.receipt::jsonb @> '{"transportStarted":true,"responseReceived":true,"completionUncertain":false}'::jsonb
    AND NOT EXISTS (SELECT 1 FROM cognition_attempt_links followup
        WHERE followup.root_job_id=j.id AND followup.stage='generate-query-answer')
    AND COALESCE((SELECT payload::bigint FROM mind_privacy_revisions
        WHERE world_id=h.world_id AND id=$5),0)=(input.witness->>'privacyRevision')::bigint
    )
    INSERT INTO intelligence_calls(id,started_at,payload,selection,summary,stage)
    SELECT id,started_at,'null',selection,'null','"rust-stage-capture"' FROM captured
    WHERE octet_length(selection::text) + octet_length(id) + octet_length(started_at)
        + octet_length('nullnull"rust-stage-capture"'::text) <= $10::bigint
    ON CONFLICT (id) DO NOTHING
"#;

pub(crate) struct StageCaptureWriter {
    session: Session,
    budget: ByteBudget,
    since_prune: usize,
}

impl Store {
    /// One optional worker owns this connection. No gameplay writer lock or
    /// writer-health state is read or changed even if the SQL connection fails.
    pub(crate) async fn open_stage_capture_writer(&self) -> StoreResult<StageCaptureWriter> {
        let (database, tls) = &self.checkpoint_connection;
        let session = Self::session(database, tls.clone()).await?;
        let mut writer = StageCaptureWriter {
            session,
            budget: self.budget.clone(),
            since_prune: 0,
        };
        writer.prune().await?;
        Ok(writer)
    }
}

impl StageCaptureWriter {
    /// Persist only a first-send product with a matching completed conversation
    /// and receipt. The worker owns the funded input across this optional SQL
    /// operation. A retry cannot overwrite an already recorded attempt.
    pub(crate) async fn write(
        &mut self,
        attempt_id: &str,
        provider_request_digest: &str,
        witness: &RuntimeNpcStageWitness,
        player_life: u64,
        grant_revision: u64,
        sanitized_input: &str,
        redacted: bool,
    ) -> StoreResult<bool> {
        if attempt_id.is_empty()
            || !attempt_id.ends_with(":attempt:0:generate")
            || attempt_id.contains('\0')
            || provider_request_digest.len() != 64
            || !provider_request_digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit())
            || sanitized_input.is_empty()
            || sanitized_input.len() > MAX_INPUT_BYTES as usize
            || sanitized_input.contains('\0')
            || redacted
            || sha256_hex(sanitized_input.as_bytes()) != provider_request_digest
        {
            return Ok(false);
        }
        if self.since_prune >= PRUNE_INTERVAL {
            self.prune().await?;
        }
        let bytes = sanitized_input
            .len()
            .checked_add(MAX_PROOF_BYTES as usize * 2)
            .ok_or(StoreError::Capacity)?;
        let _encoding = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let invalid = |_| StoreError::InvalidRecord;
        let proof = json_record(witness).map_err(invalid)?;
        if proof.len() > MAX_PROOF_BYTES as usize {
            return Ok(false);
        }
        let actor_key = json_record(witness.actor_id()).map_err(invalid)?;
        let privacy_key = json_record(&[
            "world",
            "experience",
            "privacyRevisions",
            witness.actor_id(),
        ])
        .map_err(invalid)?;
        let player_life = sql_ordinal(player_life)?;
        let grant_revision = sql_ordinal(grant_revision)?;
        let changed = self
            .session
            .client
            .execute(
                WRITE,
                &[
                    &attempt_id,
                    &provider_request_digest,
                    &proof,
                    &actor_key,
                    &privacy_key,
                    &player_life,
                    &grant_revision,
                    &sanitized_input,
                    &redacted,
                    &MAX_RECORD_BYTES,
                ],
            )
            .await?;
        self.since_prune += changed as usize;
        Ok(changed == 1)
    }

    async fn prune(&mut self) -> StoreResult<()> {
        self.session
            .client
            .execute(
                "DELETE FROM intelligence_calls WHERE id IN (SELECT id FROM intelligence_calls \
             WHERE stage='\"rust-stage-capture\"' \
             ORDER BY started_at DESC,id DESC LIMIT $2 OFFSET $1)",
                &[&HISTORY, &(PRUNE_INTERVAL as i64)],
            )
            .await?;
        self.since_prune = 0;
        Ok(())
    }
}

pub(crate) struct StageOwner {
    pub actor_key: String,
    pub timeline_key: String,
    pub player_life: i64,
    pub grant_revision: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SavedStageProof {
    pub witness: RuntimeNpcStageWitness,
    pub player_life: u64,
    pub grant_revision: u64,
    pub redacted: bool,
}

pub(crate) struct SavedStageCapture {
    pub proof: SavedStageProof,
    pub input: String,
    _storage: ByteReservation,
}

const READ: &str = r#"
    SELECT c.selection->>'input' AS input,(c.selection->'proof')::text AS proof,
        c.selection->>'providerRequestDigest' AS digest
    FROM intelligence_calls c JOIN attempts a ON a.id=$1 AND c.id='rust-stage:' || a.id
    JOIN cognition_attempt_links l ON l.attempt_id=a.id AND l.stage='generate' AND l.root_job_id=$2
    JOIN jobs j ON j.id=l.root_job_id
    WHERE c.stage='"rust-stage-capture"' AND c.selection->>'kind'='rust-stage-capture'
    AND c.selection->>'parentId'=j.id AND j.selection->>'kind'='chat'
    AND j.selection->>'status'='completed' AND j.selection#>>'{authority,accountId}'=$3
    AND j.selection#>>'{authority,worldId}'=$4 AND j.selection#>>'{authority,actorId}'=$6
    AND j.selection#>>'{authority,timelineId}'=$11::text
    AND (j.selection->>'npcId')::jsonb=c.selection#>'{proof,witness,actorId}'
    AND c.selection#>>'{proof,witness,generation}'=$5 AND c.selection->>'ownerActor'=$6
    AND c.selection#>'{proof,witness,worldId}'=($4::text)::jsonb
    AND COALESCE((SELECT payload::bigint FROM mind_privacy_revisions
        WHERE world_id=c.selection#>>'{proof,witness,worldId}' AND id=c.selection->>'privacyKey'),0)
        =(c.selection#>>'{proof,witness,privacyRevision}')::bigint
    AND c.selection#>'{proof,playerLife}'=to_jsonb($7::bigint)
    AND c.selection#>'{proof,grantRevision}'=to_jsonb($8::bigint)
    AND l.dispatch_intent AND a.status='settled' AND a.id=j.id || ':attempt:0:generate'
    AND a.receipt::jsonb->>'requestId'=a.id
    AND a.receipt::jsonb->>'providerRequestDigest'=c.selection->>'providerRequestDigest'
    AND a.receipt::jsonb @> '{"transportStarted":true,"responseReceived":true,"completionUncertain":false}'::jsonb
    AND jsonb_typeof(c.selection->'input')='string'
    AND octet_length(c.selection->>'input') BETWEEN 1 AND $9::bigint
    AND octet_length((c.selection->'proof')::text) BETWEEN 1 AND $10::bigint
"#;

/// The parent already admitted the exact linked receipt under its existing
/// signed root access. This reads one eligible blob from that same snapshot.
pub(super) async fn read_stage(
    tx: &Transaction<'_>,
    access: &ReadAccess,
    root_id: &str,
    attempt_id: &str,
    budget: &ByteBudget,
) -> StoreResult<Option<SavedStageCapture>> {
    let Some(owner) = &access.stage_owner else {
        return Ok(None);
    };
    let (_transfer, rows) = match admitted_query(
        tx,
        READ,
        &[
            &attempt_id,
            &root_id,
            &access.account,
            &access.world_key,
            &access.generation,
            &owner.actor_key,
            &owner.player_life,
            &owner.grant_revision,
            &MAX_INPUT_BYTES,
            &MAX_PROOF_BYTES,
            &owner.timeline_key,
        ],
        budget,
    )
    .await
    {
        Ok(result) => result,
        Err(StoreError::Capacity) => return Ok(None),
        Err(error) => return Err(error),
    };
    let Some(row) = rows.first() else {
        return Ok(None);
    };
    let input: &str = row.try_get(0)?;
    let encoded: &str = row.try_get(1)?;
    // Keep the exact detached body and finite witness independently of the
    // driver row transfer, whose more conservative custody will now close.
    let body_bytes = input
        .len()
        .checked_add(encoded.len() * 2 + 512)
        .ok_or(StoreError::Capacity)?;
    let Ok(storage) = budget.reserve(body_bytes) else {
        return Ok(None);
    };
    let Ok(proof) = serde_json::from_str::<SavedStageProof>(encoded) else {
        return Ok(None);
    };
    let digest: &str = row.try_get(2)?;
    if proof.redacted || sha256_hex(input.as_bytes()) != digest {
        return Ok(None);
    }
    Ok(Some(SavedStageCapture {
        proof,
        input: input.to_owned(),
        _storage: storage,
    }))
}
