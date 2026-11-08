//! Exposure identities and their empty observer owners have unordered schema
//! rows. Clearing/removing/reacquiring an observer preserves that distinction.
use super::*;
use crate::records::{
    RecordEncodingError, RecordLedger, RecordSchema, RowEncoder, encode_marked_owners,
    encode_sparse_map_changes,
};
fn error() -> RecordEncodingError {
    RecordEncodingError("Exposure save requires complete current ownership and allowance.")
}
impl EpisodeJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &ReceptionState,
        before: EpisodeCheckpoint,
        schema: &RecordSchema,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        if changes.is_empty() {
            return Ok(());
        }
        let count = changes
            .iter()
            .try_fold(0usize, |count, change| {
                count.checked_add(match change {
                    EpisodeUndo::Observer { prior, .. } => {
                        prior.as_ref().map_or(1, |(_, prior)| prior.len() + 1)
                    }
                    EpisodeUndo::Subject { .. } => 1,
                })
            })
            .ok_or_else(error)?;
        let _guard = budget
            .reserve(
                map_storage::<&str, bool>(changes.len())
                    .and_then(|bytes| {
                        bytes.checked_add(map_storage::<&str, IndexMap<&str, Option<&String>>>(
                            changes.len(),
                        )?)
                    })
                    .and_then(|bytes| {
                        bytes.checked_add(
                            map_storage::<&str, Option<&String>>(count)?
                                .checked_mul(2)?
                                .checked_add(changes.len().checked_mul(16)?)?,
                        )
                    })
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut owners = IndexMap::with_capacity(changes.len());
        let mut children: IndexMap<&str, IndexMap<&str, Option<&String>>> =
            IndexMap::with_capacity(changes.len());
        for change in changes {
            match change {
                EpisodeUndo::Observer { observer, prior } => {
                    owners.entry(observer.as_str()).or_insert(prior.is_some());
                    let selected = children.entry(observer.as_str()).or_default();
                    if let Some((_, prior)) = prior {
                        for (subject, value) in prior {
                            selected.entry(subject.as_str()).or_insert(Some(value));
                        }
                    }
                }
                EpisodeUndo::Subject {
                    observer,
                    subject,
                    prior,
                } => {
                    owners.entry(observer.as_str()).or_insert(true);
                    children
                        .entry(observer.as_str())
                        .or_default()
                        .entry(subject.as_str())
                        .or_insert(prior.as_ref().map(|(_, value)| value));
                }
            }
        }
        encode_marked_owners(
            ledger,
            "mind_exposure_owners",
            "perceptionEpisodes",
            &owners,
            state.perception_episodes.as_ref(),
            true,
            false,
            output,
            budget,
        )?;
        for (observer, selected) in children {
            let after = state
                .perception_episodes
                .as_ref()
                .and_then(|owners| owners.get(observer));
            // Keep explicit metadata tombstones until the immutable SQL prefix;
            // its bridge removes those covered by an actual parent cascade.
            encode_sparse_map_changes(
                schema,
                ledger,
                "mind_exposure",
                &["world", "perceptionEpisodes", observer],
                None,
                &selected,
                after,
                true,
                output,
                budget,
            )?;
        }
        Ok(())
    }
}
