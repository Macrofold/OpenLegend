//! Each canonical document keeps its actual allocation through replacement,
//! accepted publication and rollback. No shadow row/body ledger is retained.
use super::*;
use crate::host::ResidentReservation;

pub(crate) struct KnowledgeEntry {
    document: KnowledgeDocument,
    storage: ResidentReservation,
}
impl std::ops::Deref for KnowledgeEntry {
    type Target = KnowledgeDocument;
    fn deref(&self) -> &Self::Target {
        &self.document
    }
}
impl Serialize for KnowledgeEntry {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.document.serialize(serializer)
    }
}
pub(crate) struct KnowledgeState {
    pub(super) documents: Option<IndexMap<String, IndexMap<String, KnowledgeEntry>>>,
    metadata: ResidentReservation,
}
impl KnowledgeState {
    pub(crate) fn install(
        documents: Option<IndexMap<String, IndexMap<String, KnowledgeDocument>>>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let backing = documents
            .as_ref()
            .map_or(Some(0), |root| {
                root.iter().try_fold(
                    map_storage::<String, IndexMap<String, KnowledgeEntry>>(root.len())?,
                    |n, (actor, docs)| {
                        heap_sum([
                            n,
                            actor.len(),
                            map_storage::<String, KnowledgeEntry>(docs.len())?,
                            docs.keys()
                                .try_fold(0usize, |n, key| n.checked_add(key.len()))?,
                        ])
                    },
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let metadata =
            budget.reserve_backing(backing.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let root = documents
            .map(|root| -> Result<_, ExecutionError> {
                let mut out = IndexMap::with_capacity(root.len());
                for (actor, docs) in root {
                    let mut values = IndexMap::with_capacity(docs.len());
                    for (key, document) in docs {
                        if key != knowledge_key(document.subject_id.as_ref())? {
                            return Err(ExecutionError::Invariant);
                        }
                        let storage = budget.reserve_record(
                            document.heap_bytes().ok_or(ExecutionError::Capacity)?,
                        )?;
                        values.insert(key, KnowledgeEntry { document, storage });
                    }
                    out.insert(actor, values);
                }
                Ok(out)
            })
            .transpose()?;
        let mut state = Self {
            documents: root,
            metadata,
        };
        state
            .metadata
            .resize(state.metadata_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(state)
    }
    pub(crate) fn as_ref(&self) -> Option<&IndexMap<String, IndexMap<String, KnowledgeEntry>>> {
        self.documents.as_ref()
    }
    pub(crate) fn is_some(&self) -> bool {
        self.documents.is_some()
    }
    pub(crate) fn get(
        &self,
        actor: &str,
        subject: Option<&KnowledgeSubject>,
    ) -> Result<Option<&KnowledgeDocument>, ExecutionError> {
        let key = knowledge_key(subject)?;
        Ok(self
            .documents
            .as_ref()
            .and_then(|root| root.get(actor))
            .and_then(|docs| docs.get(&key))
            .map(|entry| &entry.document))
    }
    fn metadata_bytes(&self) -> Option<usize> {
        self.documents.as_ref().map_or(Some(0), |root| {
            root.iter().try_fold(
                map_storage::<String, IndexMap<String, KnowledgeEntry>>(root.capacity())?,
                |n, (actor, docs)| {
                    heap_sum([
                        n,
                        actor.capacity(),
                        map_storage::<String, KnowledgeEntry>(docs.capacity())?,
                        docs.keys()
                            .try_fold(0usize, |n, key| n.checked_add(key.capacity()))?,
                    ])
                },
            )
        })
    }
}
#[derive(Clone, Copy)]
pub(crate) struct KnowledgeCheckpoint {
    at: usize,
    present: bool,
}
pub(super) enum KnowledgeUndo {
    Observer {
        actor: String,
    },
    Document {
        actor: String,
        key: String,
        prior: Option<(usize, KnowledgeEntry)>,
    },
}
pub(crate) struct KnowledgeJournal {
    pub(super) undo: Vec<KnowledgeUndo>,
    reservation: ByteReservation,
    budget: ByteBudget,
}
impl KnowledgeJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>())?,
            budget: budget.clone(),
        })
    }
    pub(crate) fn checkpoint(&self, state: &KnowledgeState) -> KnowledgeCheckpoint {
        KnowledgeCheckpoint {
            at: self.undo.len(),
            present: state.is_some(),
        }
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut KnowledgeState,
        checkpoint: KnowledgeCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.at > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.at {
            match self.undo.pop().ok_or(ExecutionError::Invariant)? {
                KnowledgeUndo::Observer { actor } => {
                    state
                        .documents
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .shift_remove(&actor)
                        .ok_or(ExecutionError::Invariant)?;
                }
                KnowledgeUndo::Document { actor, key, prior } => {
                    let docs = state
                        .documents
                        .as_mut()
                        .and_then(|root| root.get_mut(&actor))
                        .ok_or(ExecutionError::Invariant)?;
                    docs.shift_remove(&key);
                    if let Some((index, entry)) = prior {
                        docs.shift_insert(index, key, entry);
                    }
                }
            }
        }
        if !checkpoint.present {
            state.documents = None;
        }
        let bytes = state.metadata_bytes().ok_or(ExecutionError::Capacity)?;
        if bytes > state.metadata.bytes() {
            let growth = bytes - state.metadata.bytes();
            self.budget
                .restore_backing(&mut state.metadata, self.reservation.split_off(growth)?)?;
        }
        state.metadata.resize(bytes)?;
        Ok(())
    }
    pub(super) fn ensure_observer(
        &mut self,
        state: &mut KnowledgeState,
        actor: &str,
    ) -> Result<(), ExecutionError> {
        if state
            .documents
            .as_ref()
            .is_some_and(|root| root.contains_key(actor))
        {
            return Ok(());
        }
        let root = state.documents.as_ref();
        let growth = if root.is_none_or(|root| root.len() == root.capacity()) {
            map_storage::<String, IndexMap<String, KnowledgeEntry>>(
                root.map_or(3, |root| ((root.len() + 1) * 2).max(3)),
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let metadata_bytes = state
            .metadata
            .bytes()
            .checked_add(growth)
            .and_then(|n| n.checked_add(actor.len()))
            .ok_or(ExecutionError::Capacity)?;
        self.budget
            .resize_backing(&mut state.metadata, metadata_bytes)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(4 * size_of::<KnowledgeUndo>())
                .and_then(|n| n.checked_add(actor.len()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let root = state.documents.get_or_insert_with(IndexMap::new);
        root.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
        root.insert(actor.into(), IndexMap::new());
        self.undo.push(KnowledgeUndo::Observer {
            actor: actor.into(),
        });
        state
            .metadata
            .resize(state.metadata_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(())
    }
    pub(super) fn replace(
        &mut self,
        state: &mut KnowledgeState,
        actor: &str,
        key: String,
        document: KnowledgeDocument,
        storage: ByteReservation,
    ) -> Result<(), ExecutionError> {
        if storage.bytes() < document.heap_bytes().ok_or(ExecutionError::Capacity)? {
            return Err(ExecutionError::Capacity);
        }
        let docs = state
            .documents
            .as_ref()
            .and_then(|root| root.get(actor))
            .ok_or(ExecutionError::Invariant)?;
        let new_document = !docs.contains_key(&key);
        if let Some(prior) = docs.get(&key) {
            self.budget.retain_record(&prior.storage)?;
        }
        let storage = self.budget.adopt_record(storage)?;
        let doc_growth = if new_document && docs.len() == docs.capacity() {
            map_storage::<String, KnowledgeEntry>(((docs.len() + 1) * 2).max(3))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let added = heap_sum([doc_growth, if new_document { key.capacity() } else { 0 }])
            .ok_or(ExecutionError::Capacity)?;
        let metadata_bytes = state
            .metadata
            .bytes()
            .checked_add(added)
            .ok_or(ExecutionError::Capacity)?;
        self.budget
            .resize_backing(&mut state.metadata, metadata_bytes)?;
        let undo = heap_sum([
            4 * size_of::<KnowledgeUndo>(),
            actor.len() * 2,
            key.capacity(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(undo)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.undo
            .try_reserve(2)
            .map_err(|_| ExecutionError::Capacity)?;
        let docs = state
            .documents
            .as_mut()
            .and_then(|root| root.get_mut(actor))
            .ok_or(ExecutionError::Invariant)?;
        if new_document {
            docs.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
        }
        let index = docs.get_index_of(&key);
        let prior = docs.insert(key.clone(), KnowledgeEntry { document, storage });
        self.undo.push(KnowledgeUndo::Document {
            actor: actor.into(),
            key,
            prior: index.zip(prior),
        });
        state
            .metadata
            .resize(state.metadata_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(())
    }
}
