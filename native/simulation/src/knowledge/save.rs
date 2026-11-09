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
                    documents.entry(actor.as_str()).or_default();
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
                |document| columns(document, actor, budget),
                output,
                budget,
            )?;
        }
        Ok(())
    }
}

fn columns(
    document: &KnowledgeEntry,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(Vec<crate::records::SqlCell>, ByteReservation), RecordEncodingError> {
    use crate::records::SqlCell;
    let error = || RecordEncodingError("Knowledge SQL projection exceeds its byte allowance.");
    let size = crate::encoding::json_record_len(&document.subject_id).map_err(|_| error())?;
    let mut guard = budget
        .reserve(
            size.checked_mul(2)
                .and_then(|n| n.checked_add(actor.len()))
                .and_then(|n| n.checked_add(5 * size_of::<SqlCell>() + 16))
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let json = crate::encoding::json_record(&document.subject_id).map_err(|_| error())?;
    guard
        .resize(
            guard
                .bytes()
                .checked_add(crate::experience::encoded_body_bound(&json).map_err(|_| error())?)
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let subject: SqlCell = serde_json::from_str(&json).map_err(|_| error())?;
    let kind = match document.subject_id {
        None => SqlCell::Null,
        Some(KnowledgeSubject::Entity { .. }) => SqlCell::from("entity"),
        Some(KnowledgeSubject::Individual { .. }) => SqlCell::from("individual"),
        Some(KnowledgeSubject::Place { .. }) => SqlCell::from("place"),
        Some(KnowledgeSubject::MapMarker { .. }) => SqlCell::from("map-marker"),
    };
    let extra = vec![
        actor.into(),
        subject,
        document.revision.into(),
        (document.text.utf8_len() as u64).into(),
        kind,
    ];
    drop(json);
    guard
        .resize(extra.heap_bytes().ok_or_else(error)?)
        .map_err(|_| error())?;
    Ok((extra, guard))
}
