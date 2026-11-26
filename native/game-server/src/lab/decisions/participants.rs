//! A selected NPC may start ordinary decisions during the selected-participants
//! run mode. Changing this set leaves bodies, perception and directed stimuli alone.
use super::{DecisionControl, LabOperator, LabRuntime, stimuli};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, Capability, assert_saved_grant},
    store::{CommitError, Store, StoreError, StoreResult},
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::encoding::sha256_hex;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, sync::Arc};
use tokio_postgres::Transaction;

const EDIT_BYTES: usize = 32 * 1024;

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(transparent)]
pub(crate) struct Participants(BTreeSet<String>);
impl Participants {
    pub(crate) fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
    pub(crate) fn allows(&self, actor: &str) -> bool {
        self.0.contains(actor)
    }
    fn encode(&self) -> StoreResult<String> {
        let json = serde_json::to_string(self).map_err(|_| StoreError::InvalidRecord)?;
        if json.len() > EDIT_BYTES {
            return Err(StoreError::Capacity);
        }
        Ok(json)
    }
}
impl DecisionControl {
    pub(crate) fn install_participants(&self, selected: Participants) {
        self.state
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .participants = Arc::new(selected);
    }
}
pub(crate) async fn init(store: &Store) -> Result<(), CommitError> {
    store.operational(|tx|Box::pin(async move{
        tx.batch_execute("CREATE TABLE IF NOT EXISTS cognition_lab.autonomy_participants (singleton boolean PRIMARY KEY CHECK(singleton), record text NOT NULL CHECK(octet_length(record)<=32768)); INSERT INTO cognition_lab.autonomy_participants VALUES(true,'[]') ON CONFLICT DO NOTHING").await?;
        Ok(())
    })).await
}
pub(crate) async fn checkpoint(tx: &Transaction<'_>) -> StoreResult<Participants> {
    let row: String = tx
        .query_one(
            "SELECT record FROM cognition_lab.autonomy_participants WHERE singleton",
            &[],
        )
        .await?
        .try_get(0)?;
    serde_json::from_str(&row).map_err(|_| StoreError::InvalidRecord)
}
pub(crate) async fn restore(tx: &Transaction<'_>, group: &Participants) -> StoreResult<()> {
    tx.execute(
        "UPDATE cognition_lab.autonomy_participants SET record=$1 WHERE singleton",
        &[&group.encode()?],
    )
    .await?;
    Ok(())
}
pub(crate) async fn load(store: &Store) -> StoreResult<Participants> {
    store.read_operational(|tx| Box::pin(checkpoint(tx))).await
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Read {
    contacts: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Edit {
    contact: String,
    eligible: bool,
    revision: String,
}

pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/decisions/participants", post(read))
        .route("/decisions/participants/edit", post(edit))
        .layer(DefaultBodyLimit::max(EDIT_BYTES))
}

fn selection_changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "participant-selection-changed",
        "Refresh the participant selection while the interval is held.",
    )
}

async fn read(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(Read { contacts }): Json<Read>,
) -> Response {
    let Some(control) = lab.decisions.lab_controls() else {
        return access_failure(AccessError::Availability);
    };
    let roster = control
        .state
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .participants
        .clone();
    let authority = lab.authority.clone();
    let scope = op.scope.clone();
    let references = lab.references.clone();
    let budget = lab.game.host.budget().clone();
    let permitted = lab
        .game
        .world
        .capture(move |session| {
            Ok(authority.current_recall_operator(&scope, true, |fields| {
                let mut eligible = Vec::new();
                for contact in contacts {
                    if stimuli::resolve_subject(session, &references, fields, &contact, &budget)?
                        .is_some_and(|id| roster.allows(&id))
                    {
                        eligible.push(contact);
                    }
                }
                Ok::<_, openlegend_simulation::runtime::RuntimeError>((eligible, roster))
            }))
        })
        .await;
    let Ok(Ok(Ok((eligible,roster)))) = permitted else {
        return access_failure(AccessError::Changed);
    };
    let Ok(raw) = roster.encode() else {return selection_changed();};
    op.current(Capability::Inspect,||{
        Json(serde_json::json!({"ok":true,"eligible":eligible,"revision":sha256_hex(raw.as_bytes())})).into_response()
    }).unwrap_or_else(access_failure)

}

async fn edit(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(Edit {
        contact,
        eligible,
        revision,
    }): Json<Edit>,
) -> Response {
    if let Err(e) = op.current(Capability::Create, || ()) {
        return access_failure(e);
    }
    let Ok(actor) = stimuli::npc_subject(&lab, &op, contact).await else {
        return selection_changed();
    };
    let runtime = lab.clone();
    let response = op.clone();
    let result = tokio::spawn(async move {
        let control = runtime
            .decisions
            .lab_controls()
            .ok_or(StoreError::StaleCut)?;
        let _guard = control.field_edit_guard().await;
        if control.run_active() {
            return Err(StoreError::StaleCut);
        }
        let result = runtime
            .game
            .store
            .operational(move |tx| {
                Box::pin(async move {
                    op.current(Capability::Create, || ())
                        .map_err(|_| StoreError::StaleCut)?;
                    assert_saved_grant(tx, &op.scope.scope, "create").await?;
                    let mut selected = checkpoint(tx).await?;
                    if sha256_hex(selected.encode()?.as_bytes()) != revision {
                        return Err(StoreError::StaleCut);
                    }
                    if eligible {
                        selected.0.insert(actor);
                    } else {
                        selected.0.remove(&actor);
                    }
                    restore(tx, &selected).await?;
                    Ok(selected)
                })
            })
            .await;
        match result {
            Ok(selected) => {
                control.install_participants(selected);
                Ok(())
            }
            Err(_) => {
                if let Ok(saved) = load(&runtime.game.store).await {
                    control.install_participants(saved);
                }
                Err(StoreError::StaleCut)
            }
        }
    })
    .await;
    if matches!(result, Ok(Ok(()))) {
        response
            .current(Capability::Create, || {
                Json(serde_json::json!({"ok":true})).into_response()
            })
            .unwrap_or_else(access_failure)
    } else {
        selection_changed()
    }
}
