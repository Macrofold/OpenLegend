//! Scoped pages and exact lot references from the existing item-offer evidence.
//! This owner never looks up the other party's live possessions.

use super::MemoryBrowseCut;
use crate::store::{Store, StoreError, StoreResult, durable_head, ordinal, read::admitted_query};
use openlegend_simulation::{
    experience::{PersonalSourceKind, PersonalSourceRef},
    handover::GiftLot,
    host::{ByteBudget, ByteReservation},
    text::JsText,
    values::is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::BTreeSet, mem::size_of, sync::Arc};
use tokio_postgres::{Row, Transaction, types::ToSql};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TradeDisclosureStatements {
    first: String,
    earlier: String,
    exact: String,
    pub page_rows: usize,
    scan_rows: usize,
    maximum_references: usize,
}

impl TradeDisclosureStatements {
    pub(crate) fn retained_bytes(&self) -> Option<usize> {
        self.first
            .capacity()
            .checked_add(self.earlier.capacity())?
            .checked_add(self.exact.capacity())
    }

    pub(crate) fn valid(&self) -> bool {
        !self.first.is_empty()
            && !self.earlier.is_empty()
            && !self.exact.is_empty()
            && self.page_rows > 0
            && self.page_rows <= self.scan_rows
            && i64::try_from(self.scan_rows.checked_add(1).unwrap_or(0)).is_ok_and(|n| n > 0)
            && self.maximum_references > 0
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct TradeDisclosurePosition {
    pub position: u64,
    pub ordinal: u32,
}

pub(crate) struct RememberedTradeLot {
    pub source: PersonalSourceRef,
    pub lot: GiftLot,
    pub name: JsText,
    pub description: JsText,
    pub disclosed_at: f64,
}

pub(crate) struct TradeDisclosureEntry {
    pub position: TradeDisclosurePosition,
    /// Older disclosures still advance the scan cursor without offering old terms.
    pub lot: Option<RememberedTradeLot>,
}

pub(crate) struct TradeDisclosurePage {
    pub entries: Vec<TradeDisclosureEntry>,
    pub more: bool,
    _custody: ByteReservation,
}

pub(crate) struct TradeDisclosureReferences {
    pub lots: Vec<RememberedTradeLot>,
    pub custody: ByteReservation,
}

async fn require_cut(tx: &Transaction<'_>, cut: &MemoryBrowseCut) -> StoreResult<()> {
    let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
    if head.world_id != cut.world
        || head.generation != cut.generation
        || head.revision != cut.revision
    {
        return Err(StoreError::StaleCut);
    }
    Ok(())
}

fn decode_lot(row: &Row, custody: &mut ByteReservation) -> StoreResult<RememberedTradeLot> {
    let id: &str = row.try_get("source_id")?;
    let revision: &str = row.try_get("account_revision")?;
    let item_id: &str = row.try_get("item_id")?;
    let lot: &str = row.try_get("lot")?;
    let name: &str = row.try_get("name")?;
    let description: &str = row.try_get("description")?;
    let disclosed_at: f64 = row.try_get("disclosed_at")?;
    if !disclosed_at.is_finite() || !is_safe_record_id(id) || !is_safe_record_id(item_id) {
        return Err(StoreError::InvalidRecord);
    }
    let text_bytes = [id, revision, name, description]
        .into_iter()
        .try_fold(custody.bytes(), |bytes, value| {
            bytes.checked_add(value.len())
        })
        .ok_or(StoreError::Capacity)?;
    // A current lot pin contains three owned strings and scalar fields. Fund
    // its data and escaped-string decode workspace before reading its body.
    let requested = lot
        .len()
        .checked_mul(4)
        .and_then(|bytes| bytes.checked_add(text_bytes))
        .ok_or(StoreError::Capacity)?;
    custody
        .resize(requested)
        .map_err(|_| StoreError::Capacity)?;
    let lot: GiftLot = serde_json::from_str(lot).map_err(|_| StoreError::InvalidRecord)?;
    let source = PersonalSourceRef {
        kind: PersonalSourceKind::Awareness,
        id: id.to_owned(),
        revision: revision.to_owned(),
    };
    if !source.validate() || lot.item_id != item_id || !lot.valid_shape() {
        return Err(StoreError::InvalidRecord);
    }
    let retained = text_bytes
        .checked_add(lot.item_id.capacity())
        .and_then(|bytes| bytes.checked_add(lot.definition_pin.id.capacity()))
        .and_then(|bytes| bytes.checked_add(lot.definition_pin.digest.capacity()))
        .ok_or(StoreError::Capacity)?;
    if retained > requested {
        return Err(StoreError::Capacity);
    }
    custody.resize(retained).map_err(|_| StoreError::Capacity)?;
    Ok(RememberedTradeLot {
        source,
        lot,
        name: name.into(),
        description: description.into(),
        disclosed_at,
    })
}

fn reserve_rows<T>(budget: &ByteBudget, rows: usize) -> StoreResult<ByteReservation> {
    budget
        .reserve(
            rows.checked_mul(size_of::<T>())
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}

impl Store {
    /// Use the current cut only. Query preparation and independently funded
    /// result bodies never hold the world turn or the ordinary receipt reader.
    pub(crate) async fn browse_trade_disclosures(
        self: &Arc<Self>,
        cut: Arc<MemoryBrowseCut>,
        person: String,
        before: Option<TradeDisclosurePosition>,
    ) -> StoreResult<TradeDisclosurePage> {
        if !is_safe_record_id(&person) || person == cut.actor {
            return Err(StoreError::InvalidRecord);
        }
        let owner = Arc::clone(self);
        self.read_isolated(move |tx| {
            Box::pin(async move {
                require_cut(tx, &cut).await?;
                let sql = &owner.schema.recall.trade_disclosures;
                let _input = owner
                    .budget
                    .reserve(8192)
                    .map_err(|_| StoreError::Capacity)?;
                let incoming =
                    json!({"family":"item-offer","offererId":person,"recipientId":cut.actor});
                let outgoing =
                    json!({"family":"item-offer","offererId":cut.actor,"recipientId":person});
                let keys = json!([cut.actor, person]);
                let limit = i64::try_from(sql.scan_rows + 1).map_err(|_| StoreError::Capacity)?;
                let mut args: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(12);
                args.extend([
                    &incoming as &(dyn ToSql + Sync),
                    &outgoing,
                    &keys,
                    &cut.world,
                    &cut.actor,
                    &cut.generation,
                ]);
                let position;
                let ordinal_before;
                let query = if let Some(before) = before {
                    position = crate::store::sql_ordinal(before.position)?;
                    // WITH ORDINALITY is bigint in PostgreSQL. The output is cast to int.
                    ordinal_before = i64::from(before.ordinal);
                    if ordinal_before == 0 {
                        return Err(StoreError::InvalidRecord);
                    }
                    args.push(&position);
                    args.push(&ordinal_before);
                    &sql.earlier
                } else {
                    &sql.first
                };
                args.extend([
                    &limit as &(dyn ToSql + Sync),
                    &cut.world,
                    &cut.actor,
                    &cut.generation,
                ]);
                let (_transfer, rows) = admitted_query(tx, query, &args, &owner.budget).await?;
                let count = rows.len().min(sql.scan_rows);
                let mut custody = reserve_rows::<TradeDisclosureEntry>(&owner.budget, count)?;
                let mut entries = Vec::with_capacity(count);
                let more = rows.len() > count;
                for row in rows.iter().take(count) {
                    let lot_ordinal = u32::try_from(row.try_get::<_, i32>("ordinal")?)
                        .map_err(|_| StoreError::InvalidRecord)?;
                    if lot_ordinal == 0 {
                        return Err(StoreError::InvalidRecord);
                    }
                    let position = TradeDisclosurePosition {
                        position: ordinal(row.try_get("position")?)?,
                        ordinal: lot_ordinal,
                    };
                    let lot = if row.try_get("latest")? {
                        Some(decode_lot(row, &mut custody)?)
                    } else {
                        None
                    };
                    entries.push(TradeDisclosureEntry { position, lot });
                }
                Ok(TradeDisclosurePage {
                    entries,
                    more,
                    _custody: custody,
                })
            })
        })
        .await
    }

    /// Look up the submitted lots exactly. A rendered page is not a proof of
    /// whether a particular lot has a currently eligible received source.
    pub(crate) async fn exact_trade_disclosures(
        self: &Arc<Self>,
        cut: Arc<MemoryBrowseCut>,
        person: String,
        items: Vec<String>,
    ) -> StoreResult<TradeDisclosureReferences> {
        let maximum = self.schema.recall.trade_disclosures.maximum_references;
        if items.len() > maximum
            || !is_safe_record_id(&person)
            || person == cut.actor
            || items.iter().any(|id| !is_safe_record_id(id))
        {
            return Err(StoreError::InvalidRecord);
        }
        if items.is_empty() {
            return Ok(TradeDisclosureReferences {
                lots: Vec::new(),
                custody: reserve_rows::<RememberedTradeLot>(&self.budget, 0)?,
            });
        }
        let owner = Arc::clone(self);
        self.read_isolated(move |tx| {
            Box::pin(async move {
                require_cut(tx, &cut).await?;
                // Each candidate has the same two identities, three copied
                // lookup keys and two exact party/lot objects.
                let input_bytes = items.iter().try_fold(0usize, |bytes, id| {
                    (id.len() + person.len() + cut.actor.len())
                        .checked_mul(12)
                        .and_then(|size| size.checked_add(4096))
                        .and_then(|size| bytes.checked_add(size))
                }).ok_or(StoreError::Capacity)?;
                let _input = owner.budget.reserve(input_bytes).map_err(|_| StoreError::Capacity)?;
                let unique = items.iter().collect::<BTreeSet<_>>();
                if unique.len() != items.len() {
                    return Err(StoreError::InvalidRecord);
                }
                let requests: serde_json::Value = items.iter().map(|item| {
                    json!({
                        "item_id":item,
                        "keys":[cut.actor,person,item],
                        "incoming":{"family":"item-offer","offererId":person,"recipientId":cut.actor,"offered":[{"itemId":item}]},
                        "outgoing":{"family":"item-offer","offererId":cut.actor,"recipientId":person,"requested":[{"itemId":item}]}
                    })
                }).collect::<Vec<_>>().into();
                let (_transfer, rows) = admitted_query(
                    tx,
                    &owner.schema.recall.trade_disclosures.exact,
                    &[&requests, &cut.world, &cut.actor, &cut.generation],
                    &owner.budget,
                )
                .await?;
                if rows.len() > items.len() {
                    return Err(StoreError::InvalidRecord);
                }
                let mut custody = reserve_rows::<RememberedTradeLot>(&owner.budget, rows.len())?;
                let mut lots = Vec::with_capacity(rows.len());
                for row in &rows {
                    let lot = decode_lot(row, &mut custody)?;
                    if !unique.contains(&lot.lot.item_id)
                        || lots.iter().any(|prior: &RememberedTradeLot| prior.lot.item_id == lot.lot.item_id)
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    lots.push(lot);
                }
                Ok(TradeDisclosureReferences { lots, custody })
            })
        }).await
    }
}
