//! Select the actor's canonical memories at the captured SQL prefix plus
//! its actual accepted suffix. Native still owns body admission and disclosure.

use super::*;
use openlegend_simulation::{
    encoding::{json_record, json_record_len},
    records::{ChangedRows, SqlCell},
    runtime::RuntimeMemoryPageRead,
};
use std::collections::BTreeMap;

const TABLE: &str = "mind_memories";
const OWNERS: &str = "mind_memories_owners";

#[derive(Default)]
struct Overlay {
    cleared: bool,
    slots: BTreeMap<String, Option<Pending>>,
}

#[derive(Serialize)]
struct Pending {
    at: f64,
    revision: String,
}

#[derive(Serialize)]
struct Positioned<'a> {
    id: &'a str,
    at: f64,
    revision: &'a str,
}

pub(crate) struct PreparedEvidencePage {
    world: String,
    generation: String,
    actor: String,
    revision: u64,
    in_flight: Option<u64>,
    detached: Overlay,
    suffix: Overlay,
    custody: ByteReservation,
}

// The original tool browses canonical memory, including cold accounts.
// Use its same newest-time and ascending-source-ID order. Mask a changed
// key before the limit, so removals and replacements cannot starve the page.
const SELECT: &str = "
    WITH memories AS (
        SELECT m.at,m.source_id AS id,m.account_revision AS revision
        FROM mind_memories m
        WHERE m.world_id=$1 AND m.actor_id=$2 AND NOT $6::boolean
          AND NOT(m.source_id=ANY($7::text[]))
          AND NOT EXISTS (
            SELECT 1 FROM mind_forgotten f WHERE f.world_id=$1 AND f.actor_id=$2
              AND (f.source_id=m.source_id OR f.source_id=m.event_id)
          )
        UNION ALL
        SELECT at,id,revision FROM jsonb_to_recordset($8::text::jsonb)
            AS pending(at double precision,id text,revision text)
    )
    SELECT at,id,'memory'::text,revision FROM memories
    WHERE at<=$3 AND ($4::double precision IS NULL OR at<$4 OR (at=$4 AND id>$5::text))
    ORDER BY at DESC,id LIMIT $9";

impl Store {
    /// Copy only the selected actor's pending memory coordinates. A save
    /// acknowledgement may drop either borrowed row owner on the next turn.
    pub(crate) fn prepare_evidence_page(
        &self,
        read: RuntimeMemoryPageRead<'_>,
    ) -> StoreResult<PreparedEvidencePage> {
        if read.detached.is_some() != read.in_flight_through.is_some() {
            return Err(StoreError::StaleCut);
        }
        let mut custody = self
            .budget
            .reserve(4096 + read.world_id.len() + read.generation.len() + read.actor.len())
            .map_err(|_| StoreError::Capacity)?;
        let table = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == TABLE)
            .ok_or(StoreError::Schema)?;
        let column = |name| {
            table
                .columns
                .iter()
                .position(|column| column.name == name)
                .ok_or(StoreError::Schema)
        };
        let fields = [
            column("actor_id")?,
            column("source_id")?,
            column("at")?,
            column("account_revision")?,
        ];
        let parent = json_record(&["world", "memories", read.actor])
            .map_err(|_| StoreError::InvalidRecord)?;
        let detached = read
            .detached
            .map(|rows| {
                Overlay::from_rows(
                    rows,
                    &parent,
                    read.actor,
                    fields,
                    &self.budget,
                    &mut custody,
                )
            })
            .transpose()?
            .unwrap_or_default();
        let suffix = Overlay::from_rows(
            read.suffix,
            &parent,
            read.actor,
            fields,
            &self.budget,
            &mut custody,
        )?;
        Ok(PreparedEvidencePage {
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            actor: read.actor.to_owned(),
            revision: read.durable_revision,
            in_flight: read.in_flight_through,
            detached,
            suffix,
            custody,
        })
    }

    pub(crate) async fn evidence_rows(
        &self,
        cut: Arc<MemoryBrowseCut>,
        mut pending: PreparedEvidencePage,
        before: Option<MemoryPosition>,
        limit: usize,
    ) -> StoreResult<MemoryPage> {
        if !(1..=EVIDENCE_PAGE).contains(&limit)
            || pending.world != cut.world
            || pending.generation != cut.generation
            || pending.actor != cut.actor
            || pending.revision != cut.revision
        {
            return Err(StoreError::StaleCut);
        }
        let budget = self.budget.clone();
        self.read_isolated(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != cut.world || head.generation != cut.generation {
                    return Err(StoreError::StaleCut);
                }
                let overlay = match head.revision.checked_sub(pending.revision) {
                    Some(0) if !pending.suffix.cleared => {
                        pending.detached.slots.append(&mut pending.suffix.slots);
                        pending.detached
                    }
                    Some(0) => pending.suffix,
                    Some(1) if pending.in_flight.is_some() => pending.suffix,
                    _ => return Err(StoreError::StaleCut),
                };
                grow(
                    &mut pending.custody,
                    overlay
                        .slots
                        .len()
                        .checked_mul(128)
                        .ok_or(StoreError::Capacity)?,
                )?;
                let hidden = overlay.slots.keys().map(String::as_str).collect::<Vec<_>>();
                let positions = overlay
                    .slots
                    .iter()
                    .filter_map(|(id, value)| {
                        value.as_ref().map(|value| Positioned {
                            id,
                            at: value.at,
                            revision: &value.revision,
                        })
                    })
                    .collect::<Vec<_>>();
                let bytes = json_record_len(&positions).map_err(|_| StoreError::InvalidRecord)?;
                grow(
                    &mut pending.custody,
                    bytes.checked_mul(4).ok_or(StoreError::Capacity)?,
                )?;
                let encoded = json_record(&positions).map_err(|_| StoreError::InvalidRecord)?;
                let (_transfer, rows) = admitted_query(
                    tx,
                    SELECT,
                    &[
                        &cut.world,
                        &cut.actor,
                        &cut.at,
                        &before.as_ref().map(|position| position.at),
                        &before.as_ref().map(|position| position.id.as_str()),
                        &overlay.cleared,
                        &hidden,
                        &encoded,
                        &((limit + 1) as i64),
                    ],
                    &budget,
                )
                .await?;
                let mut custody = budget.reserve(2048).map_err(|_| StoreError::Capacity)?;
                let mut references = Vec::with_capacity(rows.len().min(limit));
                let mut next = None;
                for (index, row) in rows.iter().take(limit).enumerate() {
                    let id: &str = row.try_get(1)?;
                    let revision: &str = row.try_get(3)?;
                    grow(&mut custody, id.len() * 2 + revision.len())?;
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
                    if index + 1 == limit && rows.len() > limit {
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

impl Overlay {
    fn from_rows(
        changes: &ChangedRows,
        parent: &str,
        actor: &str,
        [actor_column, id_column, at_column, revision_column]: [usize; 4],
        budget: &openlegend_simulation::host::ByteBudget,
        custody: &mut ByteReservation,
    ) -> StoreResult<Self> {
        if ["data_world", "world_settings"]
            .into_iter()
            .any(|table| changes.deletes.contains_key(table))
        {
            return Err(StoreError::StaleCut);
        }
        let cleared = changes
            .deletes
            .get(OWNERS)
            .is_some_and(|keys| keys.iter().any(|key| key == parent));
        let mut output = Self {
            cleared,
            ..Self::default()
        };
        let prefix = parent.strip_suffix(']').ok_or(StoreError::InvalidRecord)?;
        for key in changes
            .deletes
            .get(TABLE)
            .into_iter()
            .flatten()
            .chain(changes.expired.get(TABLE).into_iter().flatten())
        {
            if !key
                .strip_prefix(prefix)
                .is_some_and(|rest| rest.starts_with(','))
            {
                continue;
            }
            let _decode = budget
                .reserve(
                    key.len()
                        .checked_mul(8)
                        .and_then(|n| n.checked_add(512))
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            let path: [String; 4] =
                serde_json::from_str(key).map_err(|_| StoreError::InvalidRecord)?;
            if path[0] != "world" || path[1] != "memories" || path[2] != actor {
                return Err(StoreError::InvalidRecord);
            }
            grow(custody, path[3].len() + 384)?;
            let [_, _, _, id] = path;
            output.slots.insert(id, None);
        }
        for row in changes
            .writes
            .get(TABLE)
            .into_iter()
            .flatten()
            .filter(|row| row.parent == parent)
        {
            // The underlying SQL writer removes a deleted parent after all
            // child writes. Even a selected write is absent under that parent.
            if cleared {
                break;
            }
            let field = |position| {
                row.extra
                    .get(position)
                    .and_then(SqlCell::as_str)
                    .ok_or(StoreError::InvalidRecord)
            };
            let id = field(id_column)?;
            let revision = field(revision_column)?;
            let at = row
                .extra
                .get(at_column)
                .and_then(SqlCell::as_f64)
                .filter(|at| at.is_finite())
                .ok_or(StoreError::InvalidRecord)?;
            if field(actor_column)? != actor {
                return Err(StoreError::InvalidRecord);
            }
            grow(custody, id.len() + revision.len() + 384)?;
            output.slots.insert(
                id.to_owned(),
                Some(Pending {
                    at,
                    revision: revision.to_owned(),
                }),
            );
        }
        Ok(output)
    }
}

fn grow(custody: &mut ByteReservation, bytes: usize) -> StoreResult<()> {
    custody
        .resize(
            custody
                .bytes()
                .checked_add(bytes)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}
