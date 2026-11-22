//! Select exact memory records from the actor's original durable cut. The
//! native source reader still checks the live equivalent before disclosure.
use super::*;

const PAGE: usize = 100;
const SELECT: &str = "SELECT r.at,r.id,r.source_kind,r.revision FROM recall_sources r
    WHERE r.world_id=$1 AND r.actor_id=$2 AND r.source_kind='memory' AND r.at<=$3
      AND ($4::double precision IS NULL OR (r.at,r.id)<($4,$5))
      AND ($6::text IS NULL OR r.id=$6)
    ORDER BY r.at DESC,r.id DESC LIMIT $7";

impl Store {
    pub(crate) async fn editor_memory_rows(
        &self,
        cut: Arc<MemoryBrowseCut>,
        before: Option<MemoryPosition>,
        exact: Option<String>,
    ) -> StoreResult<MemoryPage> {
        let budget = self.budget.clone();
        self.read_isolated(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != cut.world
                    || head.generation != cut.generation
                    || head.revision != cut.revision
                {
                    return Err(StoreError::StaleCut);
                }
                let count = if exact.is_some() { 1 } else { PAGE + 1 };
                let (_transfer, rows) = admitted_query(
                    tx,
                    SELECT,
                    &[
                        &cut.world,
                        &cut.actor,
                        &cut.at,
                        &before.as_ref().map(|row| row.at),
                        &before.as_ref().map(|row| row.id.as_str()),
                        &exact.as_deref(),
                        &(count as i64),
                    ],
                    &budget,
                )
                .await?;
                let mut custody = budget
                    .reserve(512 + rows.len() * 120)
                    .map_err(|_| StoreError::Capacity)?;
                let mut references = Vec::with_capacity(rows.len().min(PAGE));
                let mut next = None;
                for (index, row) in rows.iter().take(PAGE).enumerate() {
                    let id: &str = row.try_get(1)?;
                    let revision: &str = row.try_get(3)?;
                    custody
                        .resize(custody.bytes() + id.len() * 2 + revision.len())
                        .map_err(|_| StoreError::Capacity)?;
                    let reference = PersonalSourceRef {
                        kind: PersonalSourceKind::Memory,
                        id: id.to_owned(),
                        revision: revision.to_owned(),
                    };
                    if !reference.validate()
                        || !openlegend_simulation::values::is_safe_record_id(id)
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    references.push(reference);
                    if index + 1 == PAGE && rows.len() > PAGE {
                        next = Some(position(row)?);
                    }
                }
                Ok(MemoryPage {
                    references,
                    next,
                    scan_limited: false,
                    custody,
                })
            })
        })
        .await
    }
}
