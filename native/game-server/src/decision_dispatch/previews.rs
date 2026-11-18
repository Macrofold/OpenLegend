//! Active preview words have independent custody and never enter saved history.

use crate::{
    authority::AuthorizedScope,
    boot::CurrentServer,
    npc::preview::{PreviewAttempt, PreviewDisclosure, PreviewSpeech},
    store::AdmittedJob,
};
use openlegend_simulation::host::ByteReservation;
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tokio::sync::watch;

pub(crate) struct ReplyPreviews {
    live: Mutex<HashMap<String, Arc<ReplyPreview>>>,
    changed: watch::Sender<()>,
}

pub(crate) struct ReplyPreview {
    pub scope: Arc<AuthorizedScope>,
    pub job: Arc<AdmittedJob>,
    pub generation: String,
    pub original: PreviewDisclosure,
    pub speech: PreviewSpeech,
    stop: watch::Receiver<bool>,
    withdrawn: AtomicBool,
    _custody: ByteReservation,
}

impl ReplyPreview {
    pub(crate) fn current(&self) -> bool {
        !*self.stop.borrow() && !self.withdrawn.load(Ordering::Acquire)
    }

    pub(crate) fn withdraw(&self) {
        self.withdrawn.store(true, Ordering::Release);
    }
}

pub(super) struct PreviewLease {
    owner: Arc<ReplyPreviews>,
    view: Arc<ReplyPreview>,
}

impl Drop for PreviewLease {
    fn drop(&mut self) {
        self.view.withdraw();
        if let Ok(mut active) = self.owner.live.lock() {
            active.remove(&self.view.job.job.id);
        }
        self.owner.changed.send_replace(());
    }
}

impl ReplyPreviews {
    pub(super) fn new() -> Self {
        Self {
            live: Mutex::new(HashMap::new()),
            changed: watch::channel(()).0,
        }
    }

    pub(crate) fn watch(&self) -> watch::Receiver<()> {
        self.changed.subscribe()
    }

    pub(crate) fn get(&self, request: &str) -> Option<Arc<ReplyPreview>> {
        self.live.lock().ok()?.get(request).cloned()
    }

    pub(super) async fn begin(
        self: &Arc<Self>,
        game: &Arc<CurrentServer>,
        attempt: &PreviewAttempt,
        speech: PreviewSpeech,
    ) -> Option<PreviewLease> {
        let original = attempt.disclosure(game, speech.volume).await.ok()??;
        if *attempt.stopped.borrow() {
            return None;
        }
        let key = &attempt.job.job.id;
        let custody = game
            .host
            .budget()
            .reserve(std::mem::size_of::<ReplyPreview>() + key.len() + 256)
            .ok()?;
        let view = Arc::new(ReplyPreview {
            scope: attempt.scope.clone(),
            job: attempt.job.clone(),
            generation: uuid::Uuid::new_v4().to_string(),
            original,
            speech,
            stop: attempt.stopped.clone(),
            withdrawn: AtomicBool::new(false),
            _custody: custody,
        });
        let mut active = self.live.lock().ok()?;
        if active.contains_key(key) {
            return None;
        }
        active.insert(key.clone(), view.clone());
        drop(active);
        self.changed.send_replace(());
        Some(PreviewLease {
            owner: self.clone(),
            view,
        })
    }
}
