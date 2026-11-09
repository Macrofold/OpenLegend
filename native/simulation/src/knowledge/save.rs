//! Knowledge edits select their actual sparse documents and structural owners.
use super::state::{KnowledgeEntry, KnowledgeUndo};
use super::*;
use crate::records::{
    RecordEncodingError, RowEncoder, encode_marked_owners, encode_sparse_map_changes,
};
impl KnowledgeJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &KnowledgeState,
        schema: &crate::records::RecordSchema,
        ledger: &crate::records::RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.undo.is_empty() {
            return Ok(());
        }
        let error =
            || RecordEncodingError("Knowledge changes require actual owner coverage and capacity.");
        let _guard = budget
            .reserve(
                map_storage::<&str, bool>(self.undo.len())
                    .and_then(|n| {
                        n.checked_add(
                            map_storage::<&str, IndexMap<&str, Option<&KnowledgeEntry>>>(
                                self.undo.len(),
                            )?,
                        )
                    })
                    .and_then(|n| {
                        n.checked_add(map_storage::<&str, Option<&KnowledgeEntry>>(
                            self.undo.len(),
                        )?)
                    })
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut owners = IndexMap::new();
        let mut documents: IndexMap<&str, IndexMap<&str, Option<&KnowledgeEntry>>> =
            IndexMap::new();
        for undo in &self.undo {
            match undo {
                KnowledgeUndo::Observer { actor } => {
                    owners.entry(actor.as_str()).or_insert(false);
                }
                KnowledgeUndo::Document { actor, key, prior } => {
                    owners.entry(actor.as_str()).or_insert(true);
                    documents
                        .entry(actor.as_str())
                        .or_default()
                        .entry(key.as_str())
                        .or_insert(prior.as_ref().map(|(_, entry)| entry));
                }
            }
        }
        encode_marked_owners(
            ledger,
            "mind_knowledge_documents_owners",
            "actorKnowledge",
            &owners,
            state.as_ref(),
            false,
            false,
            output,
            budget,
        )?;
        for (actor, selected) in documents {
            encode_sparse_map_changes(
                schema,
                ledger,
                "mind_knowledge_documents",
                &["world", "actorKnowledge", actor],
                None,
                &selected,
                state.as_ref().and_then(|root| root.get(actor)),
                false,
                output,
                budget,
            )?;
        }
        Ok(())
    }
}
