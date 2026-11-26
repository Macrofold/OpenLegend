//! The native writer consumes an indexed immutable selection. Only Lab edits
//! and restores read the SQL record, so a clock tick performs no database I/O.
use super::{LabError, LabOperator, LabRuntime};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, Capability, assert_saved_grant},
    store::{CommitError, Store, StoreError, StoreResult},
    world::WorldError,
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    runtime::{NativeValueHold, NativeValueHolds, PersonAttributeEdit},
};
use serde::Deserialize;
use std::sync::Arc;
use tokio_postgres::Transaction;
use uuid::Uuid;

pub(super) async fn initialize(store: &Store) -> Result<(), CommitError> {
    store.operational(|tx|Box::pin(async move{
        tx.batch_execute("CREATE TABLE IF NOT EXISTS cognition_lab.hold_sets(id uuid PRIMARY KEY,record text NOT NULL);
            CREATE TABLE IF NOT EXISTS cognition_lab.hold_selection(singleton boolean PRIMARY KEY CHECK(singleton),id uuid REFERENCES cognition_lab.hold_sets(id));
            INSERT INTO cognition_lab.hold_selection VALUES(true,NULL) ON CONFLICT DO NOTHING").await?;
        Ok(())
    })).await
}
pub(super) async fn selected(tx: &Transaction<'_>) -> StoreResult<Option<Uuid>> {
    let id: Option<String> = tx
        .query_one(
            "SELECT id::text FROM cognition_lab.hold_selection WHERE singleton",
            &[],
        )
        .await?
        .try_get(0)?;
    id.map(|s| Uuid::parse_str(&s).map_err(|_| StoreError::InvalidRecord))
        .transpose()
}
pub(super) async fn restore(tx: &Transaction<'_>, id: Option<Uuid>) -> StoreResult<()> {
    tx.execute(
        "UPDATE cognition_lab.hold_selection SET id=$1::text::uuid WHERE singleton",
        &[&id.map(|i| i.to_string())],
    )
    .await?;
    Ok(())
}
/// First measure the immutable row, then fund its decoded keys, native
/// selection and the transient serialized copy before retrieving the SQL text.
pub(super) async fn read(
    tx: &Transaction<'_>,
    id: Option<Uuid>,
    budget: &ByteBudget,
) -> StoreResult<(Vec<NativeValueHold>, ByteReservation)> {
    let key = id.map(|i| i.to_string());
    let bytes = if key.is_some() {
        let count: i32 = tx
            .query_opt(
                "SELECT octet_length(record) FROM cognition_lab.hold_sets WHERE id=$1::text::uuid",
                &[&key],
            )
            .await?
            .ok_or(StoreError::StaleCut)?
            .try_get(0)?;
        usize::try_from(count).map_err(|_| StoreError::Capacity)?
    } else {
        0
    };
    let custody = budget
        .reserve(
            bytes
                .checked_mul(12)
                .and_then(|n| n.checked_add(2048))
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)?;
    let rows = if key.is_some() {
        let row = tx
            .query_one(
                "SELECT record FROM cognition_lab.hold_sets WHERE id=$1::text::uuid",
                &[&key],
            )
            .await?;
        serde_json::from_str(row.try_get(0)?).map_err(|_| StoreError::InvalidRecord)?
    } else {
        vec![]
    };
    Ok((rows, custody))
}
pub(super) async fn hydrate(lab: &LabRuntime) -> Result<(), LabError> {
    let budget = lab.game.host.budget().clone();
    let (rows, storage) = lab
        .game
        .store
        .read_operational(move |tx| {
            Box::pin(async move { read(tx, selected(tx).await?, &budget).await })
        })
        .await?;
    let current = (!rows.is_empty())
        .then(|| NativeValueHolds::new(rows, storage))
        .transpose()?
        .map(Arc::new);
    lab.game.world.install_value_holds(current).await?;
    Ok(())
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Edit {
    actor: String,
    life: u64,
    attribute: PersonAttributeEdit,
    held: bool,
}
pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/holds", post(edit))
        .layer(DefaultBodyLimit::max(16 * 1024))
}

async fn edit(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Edit>,
) -> Response {
    // Track through commit/publication even when the browser closes its request.
    let permit = op.host.clone();
    let host = lab.game.world.operations.clone();
    match host
        .spawn(super::HOST.scope(permit, apply(lab, op, input)))
        .await
    {
        Ok(Ok(())) => Json(serde_json::json!({"ok":true})).into_response(),
        Ok(Err(WorldError::Access(e))) => access_failure(e),
        Ok(Err(WorldError::ProjectionChanged)) => refusal(
            StatusCode::CONFLICT,
            "value-hold-changed",
            "The character or value changed. Reload the editor.",
        ),
        _ => access_failure(AccessError::Availability),
    }
}
async fn apply(lab: Arc<LabRuntime>, op: LabOperator, input: Edit) -> Result<(), WorldError> {
    let auth = op.authority.clone();
    auth.current(&op.scope, Capability::Create, true, |_, _| ())?;
    op.current(Capability::Inspect, || ())?;
    let control = lab
        .decisions
        .lab_controls()
        .ok_or(AccessError::Availability)?;
    let _edit = control.field_edit_guard().await;
    if !control.hold_for_edit() {
        return Err(AccessError::Busy.into());
    }
    let _barrier = lab.saves.enter_protected().await?;
    let scope = op.scope.clone();
    let refs = lab.references.clone();
    let budget = lab.game.host.budget().clone();
    let hold = lab
        .game
        .world
        .capture(move |session| {
            Ok(auth.current_recall_operator(&scope, true, |who| {
                let actor = if input.actor == who.actor_id {
                    who.actor_id.clone()
                } else {
                    let Some(contact) =
                        refs.resolve_contact(session, who, &input.actor, &budget)?
                    else {
                        return Ok(None);
                    };
                    contact.id
                };
                if !session.private_history_permitted(&who.account_id, &who.actor_id, &actor)?
                    || !session.may_edit_recall(&who.actor_id, &actor)?
                {
                    return Ok(None);
                }
                session.author_value_hold(&actor, &input.attribute, input.life)
            }))
        })
        .await??
        .map_err(WorldError::from)?
        .ok_or(WorldError::ProjectionChanged)?;
    let writer = op.clone();
    let budget = lab.game.host.budget().clone();
    let saved = lab
        .game
        .store
        .operational(move |tx| {
            Box::pin(async move {
                for cap in ["create", "inspect"] {
                    assert_saved_grant(tx, &writer.scope.scope, cap).await?
                }
                let (mut rows, storage) = read(tx, selected(tx).await?, &budget).await?;
                let matches = |r: &NativeValueHold| {
                    r.actor_id == hold.actor_id && r.definition.id == hold.definition.id
                };
                let existing = rows.iter().position(matches);
                let same = existing.is_some_and(|pos| {
                    rows[pos].life == hold.life && rows[pos].definition == hold.definition
                });
                if same == input.held {
                    return Err(StoreError::StaleCut);
                }
                if let Some(pos) = existing {
                    rows.swap_remove(pos);
                }
                if input.held {
                    rows.push(hold)
                }
                let selection = if rows.is_empty() {
                    None
                } else {
                    Some(Arc::new(
                        NativeValueHolds::new(rows, storage)
                            .map_err(|_| StoreError::InvalidRecord)?,
                    ))
                };
                let id = if let Some(selection) = &selection {
                    let id = Uuid::new_v4();
                    let data = serde_json::to_string(selection.rows())
                        .map_err(|_| StoreError::InvalidRecord)?;
                    tx.execute(
                        "INSERT INTO cognition_lab.hold_sets VALUES($1::text::uuid,$2)",
                        &[&id.to_string(), &data],
                    )
                    .await?;
                    Some(id)
                } else {
                    None
                };
                restore(tx, id).await?;
                writer
                    .authority
                    .current_recall_operator(&writer.scope, true, |_| ())
                    .map_err(|_| StoreError::Cancelled)?;
                Ok(selection)
            })
        })
        .await;
    match saved {
        Ok(selection) => lab.game.world.install_value_holds(selection).await?,
        Err(CommitError::RolledBack(StoreError::StaleCut)) => {
            return Err(WorldError::ProjectionChanged);
        }
        Err(CommitError::RolledBack(_)) => return Err(AccessError::Availability.into()),
        Err(CommitError::Unknown(_)) => {
            // An indeterminate commit must never let a clock resume with a
            // different set than its checkpoint records. Cold re-open rereads SQL.
            lab.game.world.require_hold_recovery();
            return Err(AccessError::Availability.into());
        }
    }
    op.current(Capability::Inspect, || ())?;
    Ok(())
}
