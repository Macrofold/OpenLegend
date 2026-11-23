//! Retire the active indexes for the exact accounts chosen by native aging.
//! SourceVersions owns preserved evidence for any older retained derivation.

use super::*;
use openlegend_simulation::{encoding::json_record, experience::PersonalSourceKind};
use std::collections::{BTreeMap, BTreeSet};

impl Store {
    /// Remove the current projections for admitted rows of one exact account
    /// owner and kind. Preserved source versions keep their separate custody.
    pub(in crate::store) async fn remove_account_projections(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        actor: &str,
        kind: PersonalSourceKind,
        records: &[&str],
    ) -> StoreResult<()> {
        let family = crate::store::recall::source_kind(kind);
        tx.execute(
            "DELETE FROM mind_source_dependencies d USING recall_sources r \
             WHERE r.world_id=$1 AND r.actor_id=$2 AND r.source_kind=$3 AND r.record_id=ANY($4::text[]) \
             AND (d.world_id,d.actor_id,d.derived_kind,d.derived_id)=(r.world_id,r.actor_id,r.source_kind,r.id)",
            &[&world, &actor, &family, &records],
        ).await?;
        tx.query_opt(
            &self.schema.lexical.remove_accounts,
            &[&world, &records, &family, &Some(actor)],
        )
        .await?;
        Ok(())
    }

    pub(super) async fn expire_accounts(
        &self,
        tx: &Transaction<'_>,
        save: &SaveRows,
        histories: &[RuntimeHistory],
    ) -> StoreResult<()> {
        let selected = || histories.iter().filter_map(RuntimeHistory::aged_accounts);
        if selected().next().is_none() {
            return Ok(());
        }
        let bound = selected()
            .try_fold(1024usize, |total, aged| {
                aged.rows.iter().try_fold(total, |bytes, row| {
                    bytes
                        .checked_add(512)?
                        .checked_add(row.record.len().checked_mul(4)?)?
                        .checked_add(row.source.len().checked_mul(4)?)?
                        .checked_add(aged.actor.len().checked_mul(4)?)
                })
            })
            .ok_or(StoreError::Capacity)?;
        let _custody = self
            .budget
            .reserve(bound)
            .map_err(|_| StoreError::Capacity)?;
        let mut groups = BTreeMap::<(&str, PersonalSourceKind), BTreeSet<(&str, &str)>>::new();
        for aged in selected() {
            for row in &aged.rows {
                let table = row.kind.table();
                let deleted = save
                    .changes
                    .deletes
                    .get(table)
                    .is_some_and(|ids| ids.contains(&row.record));
                let rewritten = save.changes.writes.get(table).is_some_and(|writes| {
                    writes
                        .iter()
                        .any(|write| !write.create && write.id == row.record)
                });
                if deleted || rewritten {
                    groups
                        .entry((aged.actor.as_str(), row.kind))
                        .or_default()
                        .insert((row.record.as_str(), row.source.as_str()));
                }
            }
        }
        let world = save.world_id.as_str();
        for ((actor, kind), rows) in groups {
            let records = rows.iter().map(|(record, _)| *record).collect::<Vec<_>>();
            self.remove_account_projections(tx, world, actor, kind, &records)
                .await?;
            let actors = vec![actor; rows.len()];
            let ids = rows.iter().map(|(_, source)| *source).collect::<Vec<_>>();
            let family = crate::store::recall::source_kind(kind);
            tx.execute(
                &self.schema.recall.reconcile,
                &[&world, &actors, &ids, &family],
            )
            .await?;
            if kind == PersonalSourceKind::Awareness {
                let pair = json_record(&[world, actor]).map_err(|_| StoreError::InvalidRecord)?;
                let key = format!("integration:conversation-compaction:{pair}");
                tx.execute("DELETE FROM meta WHERE key=$1", &[&key]).await?;
            }
        }
        Ok(())
    }
}
