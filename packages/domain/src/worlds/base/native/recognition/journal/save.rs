//! Recognition rows belong to this selected-world identity owner. Generic SQL
//! helpers preserve order but never infer familiarity, knowledge or permission.
use super::*;
use crate::records::{
    RecordEncodingError, RecordLedger, RecordSchema, RowEncoder, encode_marked_owners,
    encode_sparse_map_changes,
};
fn error() -> RecordEncodingError {
    RecordEncodingError("Recognition save requires complete current ownership and allowance.")
}
impl RecognitionJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &ReceptionState,
        before: RecognitionCheckpoint,
        schema: &RecordSchema,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        if changes.is_empty() {
            return Ok(());
        }
        let count = changes.len();
        let bytes = map_storage::<&str, bool>(count)
            .and_then(|bytes| {
                bytes.checked_add(map_storage::<
                    &str,
                    IndexMap<&str, Option<&ObserverIdentity>>,
                >(count)?)
            })
            .and_then(|bytes| {
                bytes.checked_add(
                    map_storage::<&str, Option<&ObserverIdentity>>(count)?.checked_mul(2)?,
                )
            })
            .and_then(|bytes| bytes.checked_add(count.checked_mul(16)?))
            .and_then(|bytes| bytes.checked_add(map_storage::<&str, Option<&u64>>(count)?))
            .ok_or_else(error)?;
        let _guard = budget.reserve(bytes).map_err(|_| error())?;
        let mut owners = IndexMap::with_capacity(count);
        let mut identities: IndexMap<&str, IndexMap<&str, Option<&ObserverIdentity>>> =
            IndexMap::with_capacity(count);
        let mut revisions = IndexMap::with_capacity(count);
        for change in changes {
            match change {
                RecognitionUndo::Observer { observer } => {
                    owners.entry(observer.as_str()).or_insert(false);
                }
                RecognitionUndo::Identity {
                    observer,
                    key,
                    prior,
                } => {
                    owners.entry(observer.as_str()).or_insert(true);
                    identities
                        .entry(observer.as_str())
                        .or_default()
                        .entry(key.as_str())
                        .or_insert(prior.as_ref().map(|(_, identity)| identity));
                }
                RecognitionUndo::Revision { observer, prior } => {
                    revisions.entry(observer.as_str()).or_insert(prior.as_ref());
                }
            }
        }
        if !owners.is_empty() {
            encode_marked_owners(
                ledger,
                "mind_recognition_owners",
                "observerIdentities",
                &owners,
                state.observer_identities.as_ref(),
                false,
                false,
                output,
                budget,
            )?;
            for (observer, selected) in identities {
                let after = state
                    .observer_identities
                    .as_ref()
                    .and_then(|owners| owners.get(observer))
                    .ok_or_else(error)?;
                encode_sparse_map_changes(
                    schema,
                    ledger,
                    "mind_recognition",
                    &["world", "observerIdentities", observer],
                    None,
                    &selected,
                    Some(after),
                    false,
                    |_| Ok((Vec::new(), budget.reserve(0).map_err(|_| error())?)),
                    output,
                    budget,
                )?;
            }
        }
        if !revisions.is_empty() {
            encode_sparse_map_changes(
                schema,
                ledger,
                "mind_knowledge_revisions",
                &["world"],
                Some("knowledgeRevisions"),
                &revisions,
                state.knowledge_revisions.as_ref(),
                false,
                |_| Ok((Vec::new(), budget.reserve(0).map_err(|_| error())?)),
                output,
                budget,
            )?;
        }
        Ok(())
    }
}
