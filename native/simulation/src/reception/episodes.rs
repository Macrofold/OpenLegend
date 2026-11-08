//! Actual sight/acoustic-source continuity bindings. Losing a grant removes its
//! binding; neither retirement nor rollback acquires an observation.

use super::*;
mod save;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use std::mem::size_of;

type Episodes = IndexMap<String, String>;
fn invalid() -> ReceivedError {
    ReceivedError("Invalid native perception episode mutation or rollback.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Native perception episode journal exceeds byte allowance.")
}
#[derive(Clone, Copy)]
pub(crate) struct EpisodeCheckpoint {
    operations: usize,
    root_present: bool,
}
enum EpisodeUndo {
    Observer {
        observer: String,
        prior: Option<(usize, Episodes)>,
    },
    Subject {
        observer: String,
        subject: String,
        prior: Option<(usize, String)>,
    },
}
pub(crate) struct EpisodeJournal {
    undo: Vec<EpisodeUndo>,
    reservation: ByteReservation,
}
impl EpisodeJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self, state: &ReceptionState) -> EpisodeCheckpoint {
        EpisodeCheckpoint {
            operations: self.undo.len(),
            root_present: state.perception_episodes.is_some(),
        }
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ReceivedError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.undo.try_reserve(1).map_err(|_| capacity())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: EpisodeCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(invalid());
        }
        while self.undo.len() > checkpoint.operations {
            let root = state.perception_episodes.as_mut().ok_or_else(invalid)?;
            match self.undo.pop().ok_or_else(invalid)? {
                EpisodeUndo::Observer { observer, prior } => {
                    root.shift_remove(&observer);
                    if let Some((at, prior)) = prior {
                        if at > root.len() {
                            return Err(invalid());
                        }
                        root.shift_insert(at, observer, prior);
                    }
                }
                EpisodeUndo::Subject {
                    observer,
                    subject,
                    prior,
                } => {
                    let episodes = root.get_mut(&observer).ok_or_else(invalid)?;
                    episodes.shift_remove(&subject);
                    if let Some((at, prior)) = prior {
                        if at > episodes.len() {
                            return Err(invalid());
                        }
                        episodes.shift_insert(at, subject, prior);
                    }
                }
            }
        }
        if !checkpoint.root_present {
            state.perception_episodes = None;
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.undo.clear();
        self.reservation
            .resize(size_of::<Self>() + self.undo.capacity() * size_of::<EpisodeUndo>())
            .map_err(|_| capacity())
    }
    /// Native control retirement deletes this actual observer binding, including
    /// an empty mapping. The root retains its prior presence meaning.
    pub(crate) fn remove_observer(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<bool, ReceivedError> {
        let Some(root) = state.perception_episodes.as_mut() else {
            return Ok(false);
        };
        let Some((_, _, episodes)) = root.get_full(observer) else {
            return Ok(false);
        };
        self.reserve(
            2 * size_of::<EpisodeUndo>()
                + observer.len()
                + episodes.heap_bytes().ok_or_else(capacity)?,
        )?;
        let (at, key, prior) = root.shift_remove_full(observer).ok_or_else(invalid)?;
        self.undo.push(EpisodeUndo::Observer {
            observer: key,
            prior: Some((at, prior)),
        });
        Ok(true)
    }
    pub(crate) fn remove_subject(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
    ) -> Result<bool, ReceivedError> {
        let Some(episodes) = state
            .perception_episodes
            .as_mut()
            .and_then(|root| root.get_mut(observer))
        else {
            return Ok(false);
        };
        let Some(prior) = episodes.get(subject) else {
            return Ok(false);
        };
        self.reserve(
            2 * size_of::<EpisodeUndo>() + observer.len() + subject.len() + prior.capacity(),
        )?;
        let (at, key, prior) = episodes.shift_remove_full(subject).ok_or_else(invalid)?;
        self.undo.push(EpisodeUndo::Subject {
            observer: observer.to_owned(),
            subject: key,
            prior: Some((at, prior)),
        });
        Ok(true)
    }
    /// Ordinary loss retains the existing empty observer map, as the source
    /// kernel does. This differs intentionally from native control retirement.
    pub(crate) fn clear_observer(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        let Some(root) = state.perception_episodes.as_mut() else {
            return Ok(());
        };
        let Some(episodes) = root
            .get_mut(observer)
            .filter(|episodes| !episodes.is_empty())
        else {
            return Ok(());
        };
        self.reserve(
            2 * size_of::<EpisodeUndo>()
                + observer.len()
                + episodes.heap_bytes().ok_or_else(capacity)?,
        )?;
        let at = root.get_index_of(observer).ok_or_else(invalid)?;
        let prior = std::mem::take(root.get_mut(observer).ok_or_else(invalid)?);
        self.undo.push(EpisodeUndo::Observer {
            observer: observer.to_owned(),
            prior: Some((at, prior)),
        });
        Ok(())
    }
    /// The caller has proved actual sight. An existing binding is left intact;
    /// the episode string uses the source's sequence/time coordinates, no ID draw.
    pub(crate) fn ensure<'a>(
        &mut self,
        state: &'a mut ReceptionState,
        observer: &str,
        subject: &str,
        sequence: u64,
        now: f64,
        previous: Option<&str>,
    ) -> Result<&'a str, ReceivedError> {
        if !is_safe_record_id(observer)
            || !is_safe_record_id(subject)
            || !now.is_finite()
            || now < 0.0
            || sequence > crate::identity::MAX_SAFE_INTEGER
        {
            return Err(invalid());
        }
        if state
            .perception_episodes
            .as_ref()
            .and_then(|root| root.get(observer))
            .and_then(|episodes| episodes.get(subject))
            .is_none()
        {
            let bytes = 2 * size_of::<EpisodeUndo>()
                + 2 * (observer.len() + subject.len())
                + 64
                + previous.map_or(0, str::len);
            self.reserve(bytes)?;
            if state.perception_episodes.is_none() {
                self.reserve(map_storage::<String, Episodes>(2).ok_or_else(capacity)?)?;
                state.perception_episodes = Some(IndexMap::new());
            }
            let root = state.perception_episodes.as_mut().ok_or_else(invalid)?;
            if !root.contains_key(observer) {
                self.reserve(
                    map_storage::<String, Episodes>(2 * (root.len() + 1)).ok_or_else(capacity)?,
                )?;
                root.try_reserve(1).map_err(|_| capacity())?;
                root.insert(observer.to_owned(), IndexMap::new());
                self.undo.push(EpisodeUndo::Observer {
                    observer: observer.to_owned(),
                    prior: None,
                });
            }
            let episodes = root.get_mut(observer).ok_or_else(invalid)?;
            if episodes.len() == episodes.capacity() {
                self.reserve(
                    map_storage::<String, String>(2 * (episodes.len() + 1)).ok_or_else(capacity)?,
                )?;
                episodes.try_reserve(1).map_err(|_| capacity())?;
            }
            let value = previous.map(str::to_owned).unwrap_or_else(|| {
                let mut number = ryu_js::Buffer::new();
                format!("{sequence}:{}:{subject}", number.format(now))
            });
            episodes.insert(subject.to_owned(), value);
            self.undo.push(EpisodeUndo::Subject {
                observer: observer.to_owned(),
                subject: subject.to_owned(),
                prior: None,
            });
        }
        state
            .perception_episodes
            .as_ref()
            .and_then(|root| root.get(observer))
            .and_then(|episodes| episodes.get(subject))
            .map(String::as_str)
            .ok_or_else(invalid)
    }
}
