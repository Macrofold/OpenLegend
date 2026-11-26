//! Rebuild exact account projections from bounded pages of staged checkpoint
//! records. The same emitters place ordinary accepted accounts.

use super::*;
use crate::store::read::admitted_query;
use openlegend_simulation::runtime::RuntimeRecallDecoder;
use tokio_postgres::Row;

const PAGE: i64 = 64;

pub(super) struct Records<'a> {
    world: &'a str,
    query: String,
    after: Option<(String, i64, String)>,
    custody: ByteReservation,
}

impl<'a> Records<'a> {
    pub(super) fn new(
        store: &Store,
        world: &'a str,
        kind: PersonalSourceKind,
    ) -> StoreResult<Self> {
        let custody = store
            .budget
            .reserve(1024)
            .map_err(|_| StoreError::Capacity)?;
        let query = format!(
            "SELECT id,parent_id,position,source_id,actor_id,account_revision,payload
             FROM {} WHERE world_id=$1
             AND ($2::text IS NULL OR (parent_id,position,id)>($2,$3::bigint,$4::text))
             ORDER BY parent_id,position,id LIMIT $5",
            kind.table()
        );
        Ok(Self {
            world,
            query,
            after: None,
            custody,
        })
    }

    pub(super) async fn next(
        &mut self,
        store: &Store,
        tx: &Transaction<'_>,
    ) -> StoreResult<(ByteReservation, Vec<Row>)> {
        let parent = self.after.as_ref().map(|row| row.0.as_str());
        let position = self.after.as_ref().map(|row| row.1);
        let id = self.after.as_ref().map(|row| row.2.as_str());
        let (wire, rows) = admitted_query(
            tx,
            &self.query,
            &[&self.world, &parent, &position, &id, &PAGE],
            &store.budget,
        )
        .await?;
        if let Some(last) = rows.last() {
            let next_parent: &str = last.try_get(1)?;
            let next_id: &str = last.try_get(0)?;
            let size = next_parent
                .len()
                .checked_add(next_id.len())
                .ok_or(StoreError::Capacity)?;
            self.custody
                .resize(
                    self.custody
                        .bytes()
                        .checked_add(size)
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            self.after = Some((next_parent.to_owned(), last.try_get(2)?, next_id.to_owned()));
            self.custody
                .resize(1024usize.checked_add(size).ok_or(StoreError::Capacity)?)
                .map_err(|_| StoreError::Capacity)?;
        }
        Ok((wire, rows))
    }
}

impl Store {
    /// Replace personal search projections from actual canonical records.
    /// Operational account, grant, billing and provider-attempt rows remain
    /// under their separate owners throughout the stopped SQL transaction.
    pub(crate) async fn rebuild_checkpoint_projections(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        decoder: &RuntimeRecallDecoder<'_>,
    ) -> StoreResult<()> {
        for table in [
            "mind_source_dependencies",
            "recall_sources",
            "memory_lexical_documents",
            "memory_lexical_pending",
            "memory_index_queue",
        ] {
            tx.execute(&format!("DELETE FROM {table} WHERE world_id=$1"), &[&world])
                .await?;
        }
        self.rebuild_checkpoint_awareness(tx, world, decoder)
            .await?;
        for kind in [PersonalSourceKind::Memory, PersonalSourceKind::Summary] {
            self.rebuild_checkpoint_retained_accounts(tx, world, kind, decoder)
                .await?;
        }
        Ok(())
    }

    /// The protected writer has already staged the canonical rows. The
    /// database reader holds one page while the common emitter places it.
    pub(crate) async fn rebuild_checkpoint_awareness(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        decoder: &RuntimeRecallDecoder<'_>,
    ) -> StoreResult<()> {
        let hard_bytes = sql_ordinal(decoder.hard_bytes)?;
        let mut scan = Records::new(self, world, PersonalSourceKind::Awareness)?;
        loop {
            let (_wire, rows) = scan.next(self, tx).await?;
            if rows.is_empty() {
                break;
            }
            let mut sources = Vec::with_capacity(rows.len());
            for row in &rows {
                let record_id: &str = row.try_get(0)?;
                let id: &str = row.try_get(3)?;
                let actor: &str = row.try_get(4)?;
                let revision: &str = row.try_get(5)?;
                let payload: &str = row.try_get(6)?;
                sources.push(
                    decoder
                        .with_awareness(payload, revision, |awareness, learning, place| {
                            AccountRow::prepare(
                                world,
                                record_id,
                                payload.len(),
                                actor,
                                id,
                                revision,
                                awareness,
                                learning,
                                place,
                            )
                        })
                        .map_err(|error| match error {
                            ExperienceError::Capacity => StoreError::Capacity,
                            _ => StoreError::InvalidRecord,
                        })??,
                );
            }
            self.write_awareness_rows(tx, world, hard_bytes, &sources)
                .await?;
            if rows.len() < PAGE as usize {
                break;
            }
        }
        Ok(())
    }
}
