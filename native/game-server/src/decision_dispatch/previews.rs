//! Active preview words have independent custody and never enter saved history.

use crate::{
    authority::AuthorizedScope,
    boot::CurrentServer,
    npc::preview::{PreviewAttempt, PreviewDisclosure, PreviewSpeech},
    store::AdmittedJob,
};
use openlegend_simulation::{
    experience::PersonalSourceRef,
    host::{ByteBudget, ByteReservation},
    reception::EventScalar,
    runtime::RuntimePreparedProducts,
};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
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
    phase: Mutex<PreviewPhase>,
    _custody: ByteReservation,
}

enum PreviewPhase {
    Forming,
    Applying,
    Settled(Option<Arc<ReplyReceipt>>),
    Withdrawn,
}

pub(crate) enum PreviewTerminal<'a> {
    InProgress,
    Withdrawn,
    Settled(Option<&'a PersonalSourceRef>),
}

pub(crate) struct ReplyReceipt {
    source: PersonalSourceRef,
    _custody: ByteReservation,
}

impl ReplyPreview {
    pub(crate) fn current(&self) -> bool {
        !*self.stop.borrow()
            && self
                .phase
                .lock()
                .is_ok_and(|phase| matches!(*phase, PreviewPhase::Forming))
    }

    /// Keep the phase stable through the synchronous authorized frame handoff.
    pub(crate) fn during_forming<T>(&self, send: impl FnOnce() -> T) -> Option<T> {
        let phase = self.phase.lock().ok()?;
        (!*self.stop.borrow() && matches!(*phase, PreviewPhase::Forming)).then(send)
    }

    pub(crate) fn withdraw(&self) {
        if let Ok(mut phase) = self.phase.lock()
            && !matches!(*phase, PreviewPhase::Settled(_))
        {
            *phase = PreviewPhase::Withdrawn;
        }
    }

    pub(crate) fn terminal<T>(&self, read: impl FnOnce(PreviewTerminal<'_>) -> T) -> T {
        let phase = self.phase.lock();
        let outcome = match phase.as_deref() {
            Ok(PreviewPhase::Settled(receipt)) => {
                PreviewTerminal::Settled(receipt.as_ref().map(|receipt| &receipt.source))
            }
            Ok(PreviewPhase::Applying | PreviewPhase::Forming) if !*self.stop.borrow() => {
                PreviewTerminal::InProgress
            }
            _ => PreviewTerminal::Withdrawn,
        };
        read(outcome)
    }

    /// Select only an occurrence actually accepted by this reply and its
    /// acquired addressed speech. The preview itself grants no history ID.
    pub(crate) fn prepare_receipt(
        &self,
        product: &RuntimePreparedProducts<'_>,
        budget: &ByteBudget,
    ) -> Option<Arc<ReplyReceipt>> {
        let speaker = &self.job.job.request.npc_id;
        let listener = &self.scope.scope.actor_id;
        let id = &self.job.job.id;
        let local = &self.speech.local_id;
        let _search = budget.reserve(id.len() + local.len() + 128).ok()?;
        let utterance = format!("{id}:{local}");
        let event = product.events().find(|event| {
            event.actor_id.as_ref() == Some(speaker)
                && event.target_id.as_ref() == Some(listener)
                && matches!(event.data.as_ref().and_then(|data| data.get("utteranceId")), Some(EventScalar::Text(value)) if value == &utterance)
        })?;
        let source = product.addressed_speech_source(&event.id, listener, speaker)?;
        let custody = budget
            .reserve(
                std::mem::size_of::<ReplyReceipt>()
                    + source.id.len()
                    + source.revision.len()
                    + 2 * std::mem::size_of::<usize>(),
            )
            .ok()?;
        Some(Arc::new(ReplyReceipt {
            source: source.clone(),
            _custody: custody,
        }))
    }

    pub(crate) fn settle(&self, receipt: Option<Arc<ReplyReceipt>>) {
        if let Ok(mut phase) = self.phase.lock()
            && matches!(*phase, PreviewPhase::Applying)
        {
            *phase = PreviewPhase::Settled(receipt);
        }
    }
}

pub(super) struct PreviewLease {
    owner: Arc<ReplyPreviews>,
    view: Arc<ReplyPreview>,
    applying: bool,
}

impl PreviewLease {
    pub(super) fn complete(mut self) {
        if let Ok(mut phase) = self.view.phase.lock()
            && matches!(*phase, PreviewPhase::Forming)
        {
            *phase = PreviewPhase::Applying;
            self.applying = true;
        }
        self.owner.changed.send_replace(());
    }
}

impl Drop for PreviewLease {
    fn drop(&mut self) {
        if !self.applying {
            self.owner.end_job(&self.view.job.job.id);
        }
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

    pub(crate) fn end_job(&self, id: &str) {
        if let Some(preview) = self
            .live
            .lock()
            .ok()
            .and_then(|mut entries| entries.remove(id))
        {
            preview.withdraw();
            self.changed.send_replace(());
        }
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
            phase: Mutex::new(PreviewPhase::Forming),
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
            applying: false,
        })
    }
}
