//! Locate receipt pages with the same indexed physical predecessor rule as
//! Source, then load only the page and immutable value bodies it names.
use super::*;
use crate::store::ordinal;

pub(super) const PAGES: &str = "mind_temporal_pages";
pub(super) const VALUES: &str = "mind_perception_values";

struct PageHeader<'a> {
    id: &'a str,
    life: u64,
    epoch: &'a str,
    start: (u64, u64),
    first_member: i64,
    through: (u64, u64),
}

impl PageHeader<'_> {
    fn key(&self) -> (u64, u64, i64, &str) {
        (self.start.0, self.start.1, self.first_member, self.id)
    }

    fn contains(&self, coordinate: &Coordinate) -> bool {
        self.life == coordinate.life
            && self.epoch == coordinate.epoch
            && self.through >= (coordinate.batch, coordinate.entry)
    }
}

struct PageColumns {
    life: usize,
    epoch: usize,
    batch: usize,
    entry: usize,
    member: usize,
    last_batch: usize,
    last_entry: usize,
}

impl PageColumns {
    fn new(table: &Table) -> StoreResult<Self> {
        Ok(Self {
            life: column(table, "physical_life")?,
            epoch: column(table, "receipt_epoch")?,
            batch: column(table, "first_batch_order")?,
            entry: column(table, "first_entry")?,
            member: column(table, "first_member")?,
            last_batch: column(table, "last_batch_order")?,
            last_entry: column(table, "last_entry")?,
        })
    }
    fn header<'a>(&self, row: &'a InstalledRow) -> StoreResult<PageHeader<'a>> {
        let at = |column: usize| row.extra.get(column).ok_or(StoreError::InvalidRecord);
        let ordinal = |column| at(column)?.as_u64().ok_or(StoreError::InvalidRecord);
        Ok(PageHeader {
            id: &row.id,
            life: ordinal(self.life)?,
            epoch: at(self.epoch)?.as_str().ok_or(StoreError::InvalidRecord)?,
            start: (ordinal(self.batch)?, ordinal(self.entry)?),
            first_member: at(self.member)?.as_i64().ok_or(StoreError::InvalidRecord)?,
            through: (ordinal(self.last_batch)?, ordinal(self.last_entry)?),
        })
    }
}

impl Read<'_, '_> {
    pub(super) async fn receipts(
        &mut self,
        coords: &[Coordinate],
    ) -> StoreResult<(Vec<InstalledRow>, Vec<InstalledRow>)> {
        if coords.is_empty() {
            return Ok((Vec::new(), Vec::new()));
        }
        let table = self.store.npc_table(PAGES)?;
        let columns = PageColumns::new(table)?;
        let mut local = Vec::new();
        let mut replaced = Vec::new();
        for (id, row) in self.pending.pages() {
            replaced.push(id.as_str());
            if let Some(row) = row {
                local.push((columns.header(row)?, row));
            }
        }
        local.sort_unstable_by(|(left, _), (right, _)| left.key().cmp(&right.key()));
        let query="SELECT selected.ordinal,p.id,p.physical_life,p.receipt_epoch,p.first_batch_order,p.first_entry,p.first_member,p.last_batch_order,p.last_entry
            FROM jsonb_to_recordset($1::text::jsonb) selected(ordinal bigint,batch bigint,entry bigint)
            JOIN LATERAL (SELECT id,physical_life,receipt_epoch,first_batch_order,first_entry,first_member,last_batch_order,last_entry
            FROM mind_temporal_pages WHERE world_id=$2 AND actor_id=$3 AND NOT(id=ANY($4))
              AND (first_batch_order,first_entry)<=(selected.batch,selected.entry)
            ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1) p ON TRUE";
        // These are bounded metadata rows, and both phases use this repeatable
        // snapshot. The selected full records pass their own transfer check.
        let serialized = json_record(coords).map_err(|_| StoreError::InvalidRecord)?;
        let (_wire, rows) = admitted_query(
            self.transaction,
            query,
            &[&serialized, &self.world, &self.actor, &replaced],
            &self.store.budget,
        )
        .await?;
        let mut durable = Vec::with_capacity(coords.len());
        durable.resize_with(coords.len(), || None);
        for row in &rows {
            let index = usize::try_from(ordinal(row.try_get(0)?)?)
                .map_err(|_| StoreError::InvalidRecord)?;
            let header = PageHeader {
                id: row.try_get(1)?,
                life: ordinal(row.try_get(2)?)?,
                epoch: row.try_get(3)?,
                start: (ordinal(row.try_get(4)?)?, ordinal(row.try_get(5)?)?),
                first_member: row.try_get(6)?,
                through: (ordinal(row.try_get(7)?)?, ordinal(row.try_get(8)?)?),
            };
            if durable
                .get_mut(index)
                .ok_or(StoreError::InvalidRecord)?
                .replace(header)
                .is_some()
            {
                return Err(StoreError::InvalidRecord);
            }
        }
        let mut durable_ids = BTreeSet::new();
        let mut pending_ids = BTreeSet::new();
        let mut pages = Vec::new();
        for (coordinate, durable) in coords.iter().zip(durable) {
            let next = local
                .partition_point(|(page, _)| page.start <= (coordinate.batch, coordinate.entry));
            let local = next.checked_sub(1).and_then(|index| local.get(index));
            if let Some((local, row)) = local.filter(|(local, _)| {
                durable
                    .as_ref()
                    .is_none_or(|before| local.key() > before.key())
            }) {
                if local.contains(coordinate) && pending_ids.insert(local.id) {
                    pages.push(copy_row(row, self.custody)?);
                }
            } else if let Some(page) = durable.filter(|page| page.contains(coordinate)) {
                durable_ids.insert(page.id);
            }
        }
        if !durable_ids.is_empty() {
            let selected: Vec<_> = durable_ids.into_iter().collect();
            let loaded = self
                .store
                .select_current_rows(
                    self.transaction,
                    table,
                    "world_id=$1 AND actor_id=$2 AND id=ANY($3)",
                    &[&self.world, &self.actor, &selected],
                    self.custody,
                )
                .await?;
            if loaded.len() != selected.len() {
                return Err(StoreError::StaleCut);
            }
            pages.extend(loaded);
        }
        drop(rows);
        drop(_wire);
        pages.sort_unstable_by(|a, b| (a.position, &a.id).cmp(&(b.position, &b.id)));
        let values = self.values(table, &pages).await?;
        Ok((pages, values))
    }

    async fn values(
        &mut self,
        pages_table: &Table,
        pages: &[InstalledRow],
    ) -> StoreResult<Vec<InstalledRow>> {
        let value_refs = column(pages_table, "value_refs")?;
        let mut wanted = BTreeSet::new();
        for page in pages {
            for item in page
                .extra
                .get(value_refs)
                .and_then(SqlCell::as_array)
                .ok_or(StoreError::InvalidRecord)?
            {
                wanted.insert(item.as_str().ok_or(StoreError::InvalidRecord)?);
            }
        }
        let selected = wanted.len();
        let mut values = Vec::new();
        let mut missing = Vec::new();
        for id in wanted {
            match self.pending.value(id) {
                Some(Some(value)) => values.push(copy_row(value, self.custody)?),
                Some(None) => return Err(StoreError::StaleCut),
                None => missing.push(id),
            }
        }
        if !missing.is_empty() {
            let table = self.store.npc_table(VALUES)?;
            let loaded = self
                .store
                .select_current_rows(
                    self.transaction,
                    table,
                    "world_id=$1 AND source_id=ANY($2)",
                    &[&self.world, &missing],
                    self.custody,
                )
                .await?;
            if loaded.len() != missing.len() {
                return Err(StoreError::StaleCut);
            }
            values.extend(loaded);
        }
        if values.len() != selected {
            return Err(StoreError::StaleCut);
        }
        values.sort_unstable_by(|a, b| (a.position, &a.id).cmp(&(b.position, &b.id)));
        Ok(values)
    }
}
