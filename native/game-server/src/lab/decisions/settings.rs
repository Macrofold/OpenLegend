//! A job snapshots its Lab choices before native preparation. Configured
//! destinations, credentials and the game's spending limits stay server-owned.
use super::{DecisionControl, LabOperator, LabRuntime};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, Capability, assert_saved_grant},
    store::{CommitError, Store, StoreError, StoreResult},
};
use axum::{
    Extension, Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::Transaction;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Settings {
    pub(crate) fast_model: Option<String>,
    pub(crate) complex_model: Option<String>,
    pub(crate) output_tokens: Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Choices<'a> {
    pub(crate) judgment_model: Option<&'a str>,
    pub(crate) fast_models: Vec<&'a str>,
    pub(crate) complex_models: Vec<&'a str>,
    pub(crate) budget_micro_usd: u64,
}

impl DecisionControl {
    pub(crate) fn settings(&self) -> Arc<Settings> {
        self.state
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .settings
            .clone()
    }
}

pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new().route("/decisions/settings", get(read).post(apply))
}
async fn read(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
) -> Response {
    let Some(control) = lab.decisions.lab_controls() else {
        return access_failure(AccessError::Availability);
    };
    op.current(Capability::Inspect, || {
        Json(serde_json::json!({
            "settings": &*control.settings(), "choices":lab.decisions.lab_model_choices(),
        }))
        .into_response()
    })
    .unwrap_or_else(access_failure)
}
impl Settings {
    pub(crate) fn validate(&self, available: &Choices<'_>) -> bool {
        self.fast_model
            .as_ref()
            .is_none_or(|m| available.fast_models.contains(&m.as_str()))
            && self
                .complex_model
                .as_ref()
                .is_none_or(|m| available.complex_models.contains(&m.as_str()))
            && self
                .output_tokens
                .is_none_or(|n| (1..=crate::npc::LAB_GENERATION_TOKENS).contains(&n))
    }
}

pub(crate) async fn initialize(store: &Store) -> Result<(), CommitError> {
    store.operational(|tx| Box::pin(async move{
        tx.batch_execute("CREATE SCHEMA IF NOT EXISTS cognition_lab; CREATE TABLE IF NOT EXISTS cognition_lab.inference_settings(singleton boolean PRIMARY KEY CHECK(singleton),policy jsonb NOT NULL); CREATE INDEX IF NOT EXISTS lab_authored_speech ON jobs ((selection->>'npcId'),(selection->>'authoredSpeechEvent')) WHERE selection ? 'authoredSpeechEvent'").await?; tx.batch_execute(super::rerun::SCHEMA).await?; Ok(())
    })).await
}

pub(crate) async fn load(store: &Store) -> Result<Settings, StoreError> {
    store
        .read_operational(|tx| Box::pin(read_checkpoint(tx)))
        .await
}

pub(crate) async fn read_checkpoint(tx: &Transaction<'_>) -> StoreResult<Settings> {
    let row = tx
        .query_opt(
            "SELECT policy FROM cognition_lab.inference_settings WHERE singleton",
            &[],
        )
        .await?;
    let Some(row) = row else {
        return Ok(Settings::default());
    };
    let json: serde_json::Value = row.try_get(0)?;
    serde_json::from_value(json).map_err(|_| StoreError::InvalidRecord)
}

pub(crate) async fn restore_checkpoint(
    tx: &Transaction<'_>,
    settings: &Settings,
) -> StoreResult<()> {
    let value = serde_json::to_value(settings).map_err(|_| StoreError::InvalidRecord)?;
    tx.execute("INSERT INTO cognition_lab.inference_settings(singleton,policy) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET policy=EXCLUDED.policy", &[&value]).await?;
    Ok(())
}

impl DecisionControl {
    pub(crate) fn install_settings(&self, settings: Settings) {
        self.state
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .settings = Arc::new(settings);
    }
}

async fn apply(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(settings): Json<Settings>,
) -> Response {
    if !settings.validate(&lab.decisions.lab_model_choices()) {
        return refusal(
            StatusCode::BAD_REQUEST,
            "unavailable-model-setting",
            "Select a configured model for its purpose and a supported output limit.",
        );
    }
    if let Err(e) = op.current(Capability::Create, || ()) {
        return access_failure(e);
    }
    // An acknowledged transaction publishes its exact Arc even if the request
    // disconnects after COMMIT. Starting a run shares this transition lock.
    tokio::spawn(async move {
        let Some(control) = lab.decisions.lab_controls() else {
            return access_failure(AccessError::Availability);
        };
        let _transition = control.transition.lock().await;
        let _ordinary = lab.saves.enter_ordinary().await;
        if control.lease().is_some() {
            return refusal(
                StatusCode::CONFLICT,
                "lab-is-running",
                "Hold decisions before changing their settings.",
            );
        }
        let selected = settings.clone();
        let outcome = lab
            .game
            .store
            .operational(move |tx| {
                Box::pin(async move {
                    op.current(Capability::Create, || ())
                        .map_err(|_| StoreError::StaleCut)?;
                    assert_saved_grant(tx, &op.scope.scope, "create").await?;
                    restore_checkpoint(tx, &selected).await
                })
            })
            .await;
        match outcome {
            Ok(()) => {
                control.install_settings(settings);
                Json(serde_json::json!({"ok": true})).into_response()
            }
            Err(_) => {
                if let Ok(saved) = load(&lab.game.store).await {
                    control.install_settings(saved);
                }
                access_failure(AccessError::Availability)
            }
        }
    })
    .await
    .unwrap_or_else(|_| access_failure(AccessError::Availability))
}
