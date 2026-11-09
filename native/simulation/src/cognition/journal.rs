//! Sparse private interpretation edits share the operation's root and nested
//! rollback. Remembering a commitment grants no body permission or world effect.

use super::{InnerKind, InnerStatus, MindState};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use std::mem::size_of;

enum Undo {
    SemanticNotice(super::SemanticNotice),
    Reconsideration {
        actor: String,
        before: Option<bool>,
    },
    MindRevision {
        actor: String,
        before: u64,
    },
    InnerRevision {
        actor: String,
        before: u64,
    },
    Record {
        actor: String,
        index: usize,
        revision: u64,
        status: InnerStatus,
    },
    ResetMind {
        actor: String,
        revision: u64,
        documents: Vec<super::MindDocument>,
        records: Vec<super::InnerRecord>,
        thoughts: Vec<super::PrivateThought>,
        storage: crate::host::ResidentReservation,
    },
    ResetInner {
        actor: String,
        revision: u64,
        evidence_ids: Vec<String>,
        publication_body: Option<String>,
        reconsideration: Option<bool>,
        storage: crate::host::ResidentReservation,
    },
}
#[derive(Clone, Copy)]
pub(crate) struct CognitionCheckpoint {
    undo: usize,
    retained_bytes: usize,
}
pub(crate) enum CognitionChange<'a> {
    InnerWorld(&'a str),
    MindRevision(&'a str),
    MindRecord { actor: &'a str, index: usize },
    MindContents(&'a str),
}
pub(crate) struct CognitionJournal {
    undo: Vec<Undo>,
    reservation: ByteReservation,
    retained_bytes: usize,
}
fn next(value: u64) -> Result<u64, ExecutionError> {
    value
        .checked_add(1)
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Invariant)
}

impl CognitionJournal {
    pub(crate) fn note_appraisal_change(&mut self, actor: &str) -> Result<(), ExecutionError> {
        self.reserve(1, actor.len())?;
        self.undo
            .push(Undo::SemanticNotice(super::SemanticNotice::State {
                entity_id: actor.into(),
                field: super::notices::PrivateStateField::Appraisal,
            }));
        Ok(())
    }
    pub(crate) fn note_knowledge_change(&mut self, actor: &str) -> Result<(), ExecutionError> {
        self.reserve(1, actor.len())?;
        self.undo
            .push(Undo::SemanticNotice(super::SemanticNotice::Knowledge {
                actor_id: actor.into(),
            }));
        Ok(())
    }
    pub(crate) fn prepare_semantic_notices(
        &self,
        maximum_scopes: usize,
        budget: &ByteBudget,
    ) -> Result<super::PreparedSemanticNotices, ExecutionError> {
        super::PreparedSemanticNotices::prepare(
            self.undo.iter().filter_map(|undo| match undo {
                Undo::SemanticNotice(notice) => Some(notice),
                _ => None,
            }),
            maximum_scopes,
            budget,
        )
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>())?,
            retained_bytes: 0,
        })
    }
    pub(crate) fn checkpoint(&self) -> CognitionCheckpoint {
        CognitionCheckpoint {
            undo: self.undo.len(),
            retained_bytes: self.retained_bytes,
        }
    }
    pub(crate) fn changes(&self) -> impl Iterator<Item = CognitionChange<'_>> {
        self.undo.iter().filter_map(|undo| {
            Some(match undo {
                Undo::SemanticNotice(_) => return None,
                Undo::Reconsideration { actor, .. } | Undo::InnerRevision { actor, .. } => {
                    CognitionChange::InnerWorld(actor)
                }
                Undo::MindRevision { actor, .. } => CognitionChange::MindRevision(actor),
                Undo::Record { actor, index, .. } => CognitionChange::MindRecord {
                    actor,
                    index: *index,
                },
                Undo::ResetMind { actor, .. } => CognitionChange::MindContents(actor),
                Undo::ResetInner { actor, .. } => CognitionChange::InnerWorld(actor),
            })
        })
    }
    pub(super) fn resets(
        &self,
    ) -> impl Iterator<
        Item = (
            &str,
            &[super::MindDocument],
            &[super::InnerRecord],
            &[super::PrivateThought],
        ),
    > {
        self.undo.iter().filter_map(|undo| match undo {
            Undo::ResetMind {
                actor,
                documents,
                records,
                thoughts,
                ..
            } => Some((
                actor.as_str(),
                documents.as_slice(),
                records.as_slice(),
                thoughts.as_slice(),
            )),
            _ => None,
        })
    }
    fn reserve(&mut self, additional: usize, strings: usize) -> Result<(), ExecutionError> {
        let needed = self
            .undo
            .len()
            .checked_add(additional)
            .ok_or(ExecutionError::Capacity)?;
        let capacity = self.undo.capacity().max(needed);
        let retained = self
            .retained_bytes
            .checked_add(strings)
            .ok_or(ExecutionError::Capacity)?;
        let bytes = capacity
            .checked_mul(size_of::<Undo>())
            .and_then(|bytes| bytes.checked_add(retained))
            .and_then(|bytes| bytes.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(bytes)?;
        self.undo
            .try_reserve_exact(needed.saturating_sub(self.undo.len()))
            .map_err(|_| ExecutionError::Capacity)?;
        self.retained_bytes = retained;
        Ok(())
    }
    /// Body reconciliation asks an existing private mind to reconsider. This
    /// flag alone changes neither its revision nor its authored identity.
    pub(crate) fn require_reconsideration(
        &mut self,
        state: &mut MindState,
        actor: &str,
    ) -> Result<(), ExecutionError> {
        let Some(inner) = state
            .inner_worlds
            .as_ref()
            .and_then(|worlds| worlds.get(actor))
        else {
            return Ok(());
        };
        if inner.reconsideration_required == Some(true) {
            return Ok(());
        }
        let before = inner.reconsideration_required;
        self.reserve(1, actor.len())?;
        let inner = state
            .inner_worlds
            .as_mut()
            .and_then(|worlds| worlds.get_mut(actor))
            .ok_or(ExecutionError::Invariant)?;
        self.undo.push(Undo::Reconsideration {
            actor: actor.to_owned(),
            before,
        });
        inner.reconsideration_required = Some(true);
        Ok(())
    }
    /// The selected proof already has its actors' authored initial minds. A
    /// different installer must supply that real initialization prerequisite;
    /// an absent mind cannot become an invented empty identity here.
    pub(crate) fn clear_derived_mind(
        &mut self,
        state: &mut MindState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let mind = state
            .minds
            .as_ref()
            .and_then(|minds| minds.get(actor))
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let inner = state
            .inner_worlds
            .as_ref()
            .and_then(|worlds| worlds.get(actor));
        let revision = if let Some(inner) = inner {
            next(inner.revision)?
        } else {
            next(mind.revision)?
        };
        let documents = mind.documents.iter().filter(|document| document.protected);
        let records = mind.records.iter().filter(|record| {
            mind.documents
                .iter()
                .any(|document| document.protected && document.id == record.document_id)
        });
        let document_count = documents.clone().count();
        let record_count = records.clone().count();
        let new_bytes = documents
            .clone()
            .try_fold(0usize, |bytes, document| {
                bytes.checked_add(document.heap_bytes()?)
            })
            .and_then(|bytes| {
                records.clone().try_fold(bytes, |bytes, record| {
                    bytes.checked_add(record.heap_bytes()?)
                })
            })
            .and_then(|bytes| {
                bytes.checked_add(document_count.checked_mul(size_of::<super::MindDocument>())?)
            })
            .and_then(|bytes| {
                bytes.checked_add(record_count.checked_mul(size_of::<super::InnerRecord>())?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let replacement = budget.adopt_record(budget.reserve(new_bytes)?)?;
        budget.retain_record(
            mind.contents_storage
                .as_ref()
                .ok_or(ExecutionError::Invariant)?,
        )?;
        if let Some(inner) = inner {
            budget.retain_record(
                inner
                    .contents_storage
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?,
            )?;
        }
        // The old vectors move with their canonical guards. Only actual actor
        // strings in the inverse are separate workspace; no second body copy.
        self.reserve(
            1 + usize::from(inner.is_some()),
            actor
                .len()
                .checked_mul(1 + usize::from(inner.is_some()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut retained_documents = Vec::new();
        retained_documents
            .try_reserve_exact(document_count)
            .map_err(|_| ExecutionError::Capacity)?;
        retained_documents.extend(documents.cloned());
        let mut retained_records = Vec::new();
        retained_records
            .try_reserve_exact(record_count)
            .map_err(|_| ExecutionError::Capacity)?;
        retained_records.extend(records.cloned());
        let mind = state
            .minds
            .as_mut()
            .and_then(|minds| minds.get_mut(actor))
            .ok_or(ExecutionError::Invariant)?;
        self.undo.push(Undo::ResetMind {
            actor: actor.to_owned(),
            revision: mind.revision,
            documents: std::mem::replace(&mut mind.documents, retained_documents),
            records: std::mem::replace(&mut mind.records, retained_records),
            thoughts: std::mem::take(&mut mind.thoughts),
            storage: mind
                .contents_storage
                .replace(replacement)
                .ok_or(ExecutionError::Invariant)?,
        });
        mind.revision = revision;
        if let Some(inner) = state
            .inner_worlds
            .as_mut()
            .and_then(|worlds| worlds.get_mut(actor))
        {
            let empty = inner
                .contents_storage
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .split_off(0)?;
            self.undo.push(Undo::ResetInner {
                storage: inner
                    .contents_storage
                    .replace(empty)
                    .ok_or(ExecutionError::Invariant)?,
                actor: actor.to_owned(),
                revision: inner.revision,
                evidence_ids: std::mem::take(&mut inner.evidence_ids),
                publication_body: inner.publication_body.take(),
                reconsideration: inner.reconsideration_required,
            });
            inner.revision = revision;
            inner.reconsideration_required = Some(true);
        }
        Ok(())
    }
    /// Source experience.ts's obligation consequence, after the one immutable
    /// account owner has validated the replacement. All allocation/counter work
    /// is admitted before changing a flag or mental record.
    pub(crate) fn apply_obligation_change(
        &mut self,
        state: &mut MindState,
        actor: &str,
        memory_id: &str,
        event_id: Option<&str>,
        resolved: bool,
    ) -> Result<(), ExecutionError> {
        let inner = state
            .inner_worlds
            .as_ref()
            .and_then(|worlds| worlds.get(actor));
        let mind = state.minds.as_ref().and_then(|minds| minds.get(actor));
        let matches = |record: &super::InnerRecord| {
            resolved
                && record.kind == InnerKind::Commitment
                && record.status == InnerStatus::Active
                && record
                    .evidence
                    .iter()
                    .any(|link| link.id == memory_id || event_id == Some(link.id.as_str()))
        };
        let count = mind.map_or(0, |mind| {
            mind.records.iter().filter(|record| matches(record)).count()
        });
        let reconsideration =
            inner.is_some_and(|inner| inner.reconsideration_required != Some(true));
        if count > 0 {
            let mind = mind.ok_or(ExecutionError::Invariant)?;
            next(mind.revision)?;
            for record in mind.records.iter().filter(|record| matches(record)) {
                next(record.revision)?;
            }
            if let Some(inner) = inner {
                next(inner.revision)?;
            }
        }
        let entries = count
            .checked_add(usize::from(reconsideration))
            .and_then(|entries| entries.checked_add(usize::from(count > 0)))
            .and_then(|entries| entries.checked_add(usize::from(count > 0 && inner.is_some())))
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(
            entries,
            entries
                .checked_mul(actor.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if reconsideration {
            let inner = state
                .inner_worlds
                .as_mut()
                .and_then(|worlds| worlds.get_mut(actor))
                .ok_or(ExecutionError::Invariant)?;
            self.undo.push(Undo::Reconsideration {
                actor: actor.to_owned(),
                before: inner.reconsideration_required,
            });
            inner.reconsideration_required = Some(true);
        }
        if count > 0 {
            let mind = state
                .minds
                .as_mut()
                .and_then(|minds| minds.get_mut(actor))
                .ok_or(ExecutionError::Invariant)?;
            self.undo.push(Undo::MindRevision {
                actor: actor.to_owned(),
                before: mind.revision,
            });
            mind.revision += 1;
            for (index, record) in mind
                .records
                .iter_mut()
                .enumerate()
                .filter(|(_, record)| matches(record))
            {
                self.undo.push(Undo::Record {
                    actor: actor.to_owned(),
                    index,
                    revision: record.revision,
                    status: record.status,
                });
                record.status = InnerStatus::Resolved;
                record.revision += 1;
            }
            if let Some(inner) = state
                .inner_worlds
                .as_mut()
                .and_then(|worlds| worlds.get_mut(actor))
            {
                self.undo.push(Undo::InnerRevision {
                    actor: actor.to_owned(),
                    before: inner.revision,
                });
                inner.revision += 1;
            }
        }
        Ok(())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut MindState,
        checkpoint: CognitionCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.undo > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.undo {
            match self.undo.pop().ok_or(ExecutionError::Invariant)? {
                Undo::SemanticNotice(_) => {}
                Undo::Reconsideration { actor, before } => {
                    state
                        .inner_worlds
                        .as_mut()
                        .and_then(|worlds| worlds.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?
                        .reconsideration_required = before
                }
                Undo::MindRevision { actor, before } => {
                    state
                        .minds
                        .as_mut()
                        .and_then(|minds| minds.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?
                        .revision = before
                }
                Undo::InnerRevision { actor, before } => {
                    state
                        .inner_worlds
                        .as_mut()
                        .and_then(|worlds| worlds.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?
                        .revision = before
                }
                Undo::Record {
                    actor,
                    index,
                    revision,
                    status,
                } => {
                    let record = state
                        .minds
                        .as_mut()
                        .and_then(|minds| minds.get_mut(&actor))
                        .and_then(|mind| mind.records.get_mut(index))
                        .ok_or(ExecutionError::Invariant)?;
                    record.revision = revision;
                    record.status = status;
                }
                Undo::ResetMind {
                    actor,
                    revision,
                    documents,
                    records,
                    thoughts,
                    storage,
                } => {
                    let mind = state
                        .minds
                        .as_mut()
                        .and_then(|minds| minds.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?;
                    mind.revision = revision;
                    mind.documents = documents;
                    mind.records = records;
                    mind.thoughts = thoughts;
                    mind.contents_storage = Some(storage);
                }
                Undo::ResetInner {
                    actor,
                    revision,
                    evidence_ids,
                    publication_body,
                    reconsideration,
                    storage,
                } => {
                    let inner = state
                        .inner_worlds
                        .as_mut()
                        .and_then(|worlds| worlds.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?;
                    inner.revision = revision;
                    inner.evidence_ids = evidence_ids;
                    inner.publication_body = publication_body;
                    inner.reconsideration_required = reconsideration;
                    inner.contents_storage = Some(storage);
                }
            }
        }
        self.retained_bytes = checkpoint.retained_bytes;
        self.reserve(0, 0)
    }
}
