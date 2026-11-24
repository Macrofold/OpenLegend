//! Optional history for the exact input handed to one signed NPC reply.
//! Provider transport and the gameplay writer do not wait for this copy.

use crate::{launch::stopped, store::Store, world::HostedWorld};
use openlegend_simulation::{
    encoding::{hex_bytes, json_tree_allocation_bound},
    host::{ByteBudget, ByteReservation},
    runtime::RuntimeNpcStageWitness,
};
use serde_json::Value;
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
    time::Duration,
};
use tokio::{
    sync::{OwnedSemaphorePermit, Semaphore, mpsc, watch},
    task::JoinHandle,
    time::Instant,
};

const INPUT_BYTES: usize = 500_000;
const RETAINED_BYTES: usize = 16 * 1024 * 1024;
const RECORDS: usize = 1_000;
const VISITS: usize = 20_000;
const DEPTH: usize = 32;
const UNADMITTED: u64 = u64::MAX;
// Give the completed reply its ordinary save opportunity without extending
// its lifetime indefinitely when saving is broken.
const SAVE_WAIT: Duration = Duration::from_secs(5);

pub(crate) struct DirectStageCapture {
    pub(crate) witness: RuntimeNpcStageWitness,
    attempt: String,
    digest: String,
    input: String,
    grant_revision: u64,
    player_life: AtomicU64,
    _witness: ByteReservation,
    _record: OwnedSemaphorePermit,
    _capture: ByteReservation,
    _transient: ByteReservation,
}

impl DirectStageCapture {
    pub(crate) fn started(&self, player_life: u64) {
        self.player_life.store(player_life, Ordering::Release);
    }
}

struct SavedStage {
    capture: Arc<DirectStageCapture>,
    through: u64,
    expires: Instant,
}

pub(crate) struct StageCaptures {
    budget: ByteBudget,
    records: Arc<Semaphore>,
    queue: mpsc::Sender<SavedStage>,
    stop: watch::Sender<bool>,
    task: Mutex<Option<JoinHandle<()>>>,
}

impl StageCaptures {
    pub(super) fn new(store: Arc<Store>, world: Arc<HostedWorld>, transient: ByteBudget) -> Self {
        let budget = ByteBudget::new(RETAINED_BYTES);
        let (queue, read) = mpsc::channel(RECORDS);
        let (stop, stopped) = watch::channel(false);
        let task = tokio::spawn(write(
            store,
            world,
            transient,
            budget.clone(),
            read,
            stopped,
        ));
        Self {
            budget,
            records: Arc::new(Semaphore::new(RECORDS)),
            queue,
            stop,
            task: Mutex::new(Some(task)),
        }
    }

    /// Copy the exact admitted wire body with independent custody. This
    /// method runs only for an optional, source-proven generation request.
    pub(crate) fn prepare(
        &self,
        proof: (RuntimeNpcStageWitness, ByteReservation),
        request: &crate::provider_transport::PreparedProviderRequest,
        attempt: &str,
        grant_revision: u64,
        transient: &ByteBudget,
    ) -> Option<Arc<DirectStageCapture>> {
        let input = request.buffered_body()?;
        if input.len() > INPUT_BYTES {
            return None;
        }
        let record = self.records.clone().try_acquire_owned().ok()?;
        let bytes = input.len().checked_add(attempt.len())?.checked_add(1024)?;
        let capture = self.budget.reserve(bytes).ok()?;
        let custody = transient.reserve(bytes).ok()?;
        let input = std::str::from_utf8(input).ok()?;
        let mut copy = String::new();
        copy.try_reserve_exact(input.len()).ok()?;
        copy.push_str(input);
        Some(Arc::new(DirectStageCapture {
            witness: proof.0,
            attempt: attempt.to_owned(),
            digest: hex_bytes(&request.digest),
            input: copy,
            grant_revision,
            player_life: AtomicU64::new(UNADMITTED),
            _witness: proof.1,
            _record: record,
            _capture: capture,
            _transient: custody,
        }))
    }

    pub(crate) fn accepted(&self, capture: Arc<DirectStageCapture>, through: u64) {
        if capture.player_life.load(Ordering::Acquire) != UNADMITTED {
            let _ = self.queue.try_send(SavedStage {
                capture,
                through,
                expires: Instant::now() + SAVE_WAIT,
            });
        }
    }

    pub(super) async fn stop(&self) {
        let _ = self.stop.send(true);
        let task = self.task.lock().ok().and_then(|mut task| task.take());
        if let Some(task) = task {
            let _ = task.await;
        }
    }
}

async fn write(
    store: Arc<Store>,
    world: Arc<HostedWorld>,
    transient: ByteBudget,
    retained: ByteBudget,
    mut read: mpsc::Receiver<SavedStage>,
    stop: watch::Receiver<bool>,
) {
    let mut writer = None;
    loop {
        let selected = tokio::select! {
            biased;
            _ = stopped(stop.clone()) => return,
            stage = read.recv() => stage,
        };
        let Some(SavedStage {
            capture,
            through,
            expires,
        }) = selected
        else {
            return;
        };
        let saved = tokio::select! {
            biased;
            _ = stopped(stop.clone()) => return,
            save = world.when_durable(through, expires) => save,
        };
        if saved.is_err() {
            continue;
        }
        let checking = capture.clone();
        let budget = transient.clone();
        let admission = retained.clone();
        // Join the finite validation work even on shutdown so its custody
        // cannot outlive the optional writer.
        let checked =
            tokio::task::spawn_blocking(move || safe_input(&checking.input, &budget, &admission));
        if !checked.await.unwrap_or(false) || *stop.borrow() {
            continue;
        }
        let process = async {
            if writer.is_none() {
                writer = store.open_stage_capture_writer().await.ok();
            }
            if let Some(active) = &mut writer
                && active
                    .write(
                        &capture.attempt,
                        &capture.digest,
                        &capture.witness,
                        capture.player_life.load(Ordering::Acquire),
                        capture.grant_revision,
                        &capture.input,
                        false,
                    )
                    .await
                    .is_err()
            {
                // Reopen only for a subsequent capture. Do not replay a write
                // whose acknowledgement might have been lost.
                writer = None;
            }
        };
        tokio::select! {
            biased;
            _ = stopped(stop.clone()) => return,
            _ = process => {}
        }
    }
}

/// Preserve the exact safe body. A secret-looking string, malformed embedded
/// JSON, vector or over-budget value leaves an unavailable capture.
fn safe_input(text: &str, transient: &ByteBudget, retained: &ByteBudget) -> bool {
    Check {
        transient,
        retained,
        visits: VISITS,
        source: INPUT_BYTES * 2,
    }
    .json(text, 0)
}

struct Check<'a> {
    transient: &'a ByteBudget,
    retained: &'a ByteBudget,
    visits: usize,
    source: usize,
}

impl Check<'_> {
    fn account(&mut self, bytes: usize) -> bool {
        let Some(left) = self.source.checked_sub(bytes) else {
            return false;
        };
        self.source = left;
        true
    }

    fn json(&mut self, text: &str, depth: usize) -> bool {
        if depth > DEPTH || !self.account(text.len()) {
            return false;
        }
        // The shape bound covers the prepared graph and string workspace.
        let Some(bytes) = json_tree_allocation_bound(text) else {
            return false;
        };
        let (Ok(_temporary), Ok(_limited)) =
            (self.transient.reserve(bytes), self.retained.reserve(bytes))
        else {
            return false;
        };
        serde_json::from_str(text).is_ok_and(|value| self.value(&value, depth))
    }

    fn value(&mut self, value: &Value, depth: usize) -> bool {
        let Some(left) = self.visits.checked_sub(1) else {
            return false;
        };
        self.visits = left;
        if depth > DEPTH {
            return false;
        }
        match value {
            Value::Object(fields) => fields.iter().all(|(name, child)| {
                let Some(remaining) = self.visits.checked_sub(1) else {
                    return false;
                };
                self.visits = remaining;
                self.account(name.len())
                    && !sensitive_field(name)
                    && !matches!(name.as_str(), "embedding" | "vector" | "vectors")
                    && self.value(child, depth + 1)
            }),
            Value::Array(items) => {
                if items.len() > 32 {
                    let Some(remaining) = self.visits.checked_sub(items.len()) else {
                        return false;
                    };
                    self.visits = remaining;
                    if items.iter().all(Value::is_number) {
                        return false;
                    }
                }
                items.iter().all(|item| self.value(item, depth + 1))
            }
            Value::String(value) => {
                let trimmed = value.trim_start();
                if trimmed.starts_with(['{', '[']) {
                    return self.json(trimmed, depth + 1);
                }
                self.account(value.len()) && !sensitive_text(value)
            }
            _ => true,
        }
    }
}

const SECRET_FIELDS: &[&str] = &[
    "authorization",
    "contexthandle",
    "context_handle",
    "context-handle",
    "apikey",
    "api_key",
    "api-key",
    "secret",
    "password",
    "accesstoken",
    "access_token",
    "access-token",
    "refreshtoken",
    "refresh_token",
    "refresh-token",
];

fn sensitive_field(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    SECRET_FIELDS.iter().any(|field| name.contains(field))
}

fn sensitive_text(value: &str) -> bool {
    let text = value.to_ascii_lowercase();
    text.match_indices("bearer").any(|(offset, _)| {
        text[offset + "bearer".len()..]
            .starts_with(char::is_whitespace)
    })
        // An embedded escaped ASCII key can otherwise hide a credential from
        // the text check. Structured JSON above is decoded before checking.
        || text.contains("\\u00")
        || SECRET_FIELDS.iter().any(|field| {
            text.match_indices(field).any(|(offset, _)| {
                text[offset + field.len()..]
                    .trim_start_matches(|ch: char| ch.is_whitespace() || ch == '"' || ch == '\\')
                    .starts_with([':', '='])
            })
        })
}
