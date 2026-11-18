//! Read selected historical places and their exact canonical witnesses from
//! the same actor-scoped PostgreSQL snapshot. Native still admits the witnesses.

use super::*;
use crate::language::LanguageProvider;
use openlegend_simulation::{
    capture::RuntimeKnownPlaceWitness,
    experience::KnownPlaceCapsule,
    reception::{EncounterExposure, ObservationContribution, SensoryFacet},
    records::InstalledRow,
    text::JsText,
};
use std::collections::BTreeMap;
use std::sync::Arc;
use tokio_postgres::Transaction;

const PAGE: usize = 20;
const PLACE_SEARCH_SCAN: usize = 2_000;

mod search;

pub(super) struct HistoricalFilter {
    pub(super) forgotten_count: usize,
    pub(super) corrections: indexmap::IndexMap<String, String>,
    pub(super) privacy_revision: u64,
}

pub(crate) struct PlaceViewRequest {
    pub(crate) after: Option<String>,
    pub(crate) id: Option<String>,
    pub(crate) search: Option<PlaceViewSearch>,
}

impl PlaceViewRequest {
    pub(crate) fn maximum_rows(search: bool) -> u64 {
        (if search {
            PLACE_SEARCH_SCAN + 1
        } else {
            PAGE + 1
        }) as u64
    }
}

#[derive(Clone)]
pub(crate) struct PlaceViewSearch {
    pub(crate) words: Arc<[String]>,
    pub(crate) language: Arc<LanguageProvider>,
}

pub(crate) struct PlaceViewReference {
    pub(crate) source_id: String,
    pub(crate) revision: String,
    pub(crate) correction: Option<Option<JsText>>,
}

pub(crate) struct KnownPlaceViewPage {
    pub(crate) places: Vec<RuntimeKnownPlaceWitness>,
    pub(crate) references: Vec<PlaceViewReference>,
    pub(crate) next: Option<String>,
    pub(crate) scan_limited: bool,
    witnesses: Option<PlaceRows>,
    _display: ByteReservation,
}

type PlaceRows = (
    Vec<(PersonalSourceKind, InstalledRow)>,
    Vec<InstalledRow>,
    ByteReservation,
);

impl KnownPlaceViewPage {
    pub(crate) fn take_witnesses(&mut self) -> StoreResult<PlaceRows> {
        self.witnesses.take().ok_or(StoreError::InvalidRecord)
    }
}

impl PreparedKnownPlaceRead {
    pub(crate) fn view_identity(&self) -> StoreResult<(&str, u64)> {
        let history = self.history.as_ref().ok_or(StoreError::InvalidRecord)?;
        Ok((&self.generation, history.privacy_revision))
    }
}

struct PlaceIndex {
    owner: String,
    kind: String,
    revision: String,
    capsule: KnownPlaceCapsule,
    search_text: String,
}

struct SelectedPlaces {
    index: Vec<PlaceIndex>,
    next: Option<String>,
    scan_limited: bool,
    witnesses: PlaceSourceRows,
}

type PlaceSourceRows = BTreeMap<&'static str, BTreeMap<String, SourceRow>>;

impl Store {
    /// Read an ordered private page and all required canonical source bodies.
    /// The returned SQL owners stay funded through native validation.
    pub(crate) async fn read_known_place_view(
        self: &Arc<Self>,
        read: PreparedKnownPlaceRead,
        request: PlaceViewRequest,
    ) -> StoreResult<KnownPlaceViewPage> {
        let store = self.clone();
        self.read_operational(move |transaction| Box::pin(async move {
            let history = read.history.as_ref().ok_or(StoreError::InvalidRecord)?;
            let head = durable_head(transaction).await?.ok_or(StoreError::StaleCut)?;
            if head.world_id != read.world || head.generation != read.generation {
                return Err(StoreError::StaleCut);
            }
            let detached_durable = match head.revision.checked_sub(read.revision) {
                Some(0) => false,
                Some(1) if read.in_flight_through.is_some() => true,
                _ => return Err(StoreError::StaleCut),
            };
            let detached = read.detached_supports.as_ref().filter(|_| !detached_durable);
            let overlay = SqlSupports::prepare(&store.budget, detached, &read.suffix_supports)?;
            // The historical path must also hydrate the exact supporting body;
            // a different read cut cannot fill missing pending canonical rows.
            if overlay.has_changes() || read.suffix_changes_owner || (!detached_durable && read.detached_changes_owner) {
                return Err(StoreError::StaleCut);
            }
            let visited = if request.search.is_some() { PLACE_SEARCH_SCAN } else { PAGE };
            let limit = visited + 1;
            let selected_limit = sql_ordinal(limit as u64)?;
            let select = candidate_places(false, true);
            let forgotten = &read.revoked[..history.forgotten_count];
            let parameters: &[&(dyn ToSql + Sync)] = &[
                &read.world, &read.actor, &read.revoked, &selected_limit,
                &forgotten, &request.after, &request.id,
            ];
            let text = if request.search.is_some() {
                "COALESCE((SELECT r.search_text FROM recall_sources r WHERE r.world_id=$1 AND r.actor_id=$2
                  AND r.id=p.owner_id AND r.source_kind=p.owner_kind AND r.revision=p.owner_revision),'')"
            } else { "''::text" };
            let size = transaction.query_one(&format!(
                "{select} SELECT count(*), COALESCE(sum(octet_length(capsule)+octet_length(owner_id)+octet_length(owner_kind)+octet_length(owner_revision)+octet_length({text})),0)::bigint FROM retained_places p"
            ), parameters).await?;
            let count = ordinal(size.try_get(0)?)? as usize;
            let bytes = ordinal(size.try_get(1)?)?;
            if count > limit || bytes > read.maximum_bytes {
                return Err(StoreError::Capacity);
            }
            let display = store.place_transfer(bytes, count)?;
            let rows = if count == 0 { Vec::new() } else {
                transaction.query(&format!("{select} SELECT owner_id,owner_kind,owner_revision,capsule,{text} FROM retained_places p ORDER BY place_id"), parameters).await?
            };
            if rows.len() != count {
                return Err(StoreError::StaleCut);
            }
            let index = rows.iter().take(visited).map(|row| {
                let owner: &str = row.try_get(0)?;
                let kind: &str = row.try_get(1)?;
                let revision: &str = row.try_get(2)?;
                let body: &str = row.try_get(3)?;
                validate_capsule(body, &read.actor, owner, kind, revision)?;
                let capsule = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
                Ok(PlaceIndex { owner: owner.to_owned(), kind: kind.to_owned(), revision: revision.to_owned(), capsule, search_text: row.try_get(4)? })
            }).collect::<StoreResult<Vec<_>>>()?;
            drop(rows);
            let mut source_hold = store.budget.reserve(2048).map_err(|_| StoreError::Capacity)?;
            let selected = if let Some(search) = request.search {
                store.search_place_view(transaction, &read, search, index, count > visited, &mut source_hold).await?
            } else {
                let next = (count > PAGE).then(|| index.last().expect("one full page").capsule.place_id.clone());
                SelectedPlaces { index, next, scan_limited: false, witnesses: BTreeMap::new() }
            };
            store.hydrate_place_view(transaction, read, selected, display, source_hold).await
        })).await
    }

    fn place_transfer(&self, bytes: u64, count: usize) -> StoreResult<ByteReservation> {
        let bytes = usize::try_from(bytes).map_err(|_| StoreError::Capacity)?;
        let bound = bytes
            .checked_mul(16)
            .and_then(|bytes| bytes.checked_add(2048_usize.checked_mul(count)?))
            .ok_or(StoreError::Capacity)?;
        self.budget.reserve(bound).map_err(|_| StoreError::Capacity)
    }

    async fn hydrate_place_view(
        &self,
        transaction: &Transaction<'_>,
        read: PreparedKnownPlaceRead,
        selected: SelectedPlaces,
        mut display: ByteReservation,
        mut held: ByteReservation,
    ) -> StoreResult<KnownPlaceViewPage> {
        let history = read.history.as_ref().ok_or(StoreError::InvalidRecord)?;
        let SelectedPlaces {
            index,
            next,
            scan_limited,
            mut witnesses,
        } = selected;
        // The page has at most 20 entries. Batch each actual source family and
        // the bounded correction selection, without re-reading shared owners.
        for kind in ["awareness", "memory", "summary", "support"] {
            let mut owners: Vec<&str> = index
                .iter()
                .filter(|entry| entry.kind == kind)
                .map(|entry| entry.owner.as_str())
                .collect();
            if kind == "awareness" {
                owners.extend(index.iter().filter_map(|entry| {
                    entry
                        .capsule
                        .source_event_id
                        .as_ref()
                        .and_then(|id| history.corrections.get(id))
                        .map(String::as_str)
                }));
            }
            owners.sort_unstable();
            owners.dedup();
            let known = witnesses.entry(kind).or_default();
            owners.retain(|owner| !known.contains_key(*owner));
            if owners.is_empty() {
                continue;
            }
            let rows = self
                .place_source_rows(transaction, &read, kind, &owners, &mut held)
                .await?;
            known.extend(rows);
        }
        let mut public = Vec::with_capacity(index.len());
        let mut references = Vec::with_capacity(index.len());
        for entry in index {
            let owner = witnesses
                .get(entry.kind.as_str())
                .and_then(|rows| rows.get(&entry.owner))
                .ok_or(StoreError::StaleCut)?;
            if owner.revision != entry.revision {
                return Err(StoreError::StaleCut);
            }
            let exposure = place_exposure(&owner.row.payload, &entry.capsule, &entry.kind)?;
            let correction = entry
                .capsule
                .source_event_id
                .as_ref()
                .and_then(|id| history.corrections.get(id));
            let correction = correction
                .map(|id| {
                    witnesses
                        .get("awareness")
                        .and_then(|rows| rows.get(id))
                        .map(|source| -> StoreResult<JsText> {
                            search::source_text("awareness", &source.row.payload)
                        })
                        .transpose()
                })
                .transpose()?;
            display
                .resize(
                    display
                        .bytes()
                        .checked_add(
                            owner
                                .row
                                .payload
                                .len()
                                .checked_mul(4)
                                .ok_or(StoreError::Capacity)?,
                        )
                        .and_then(|bytes| {
                            bytes.checked_add(
                                correction
                                    .as_ref()
                                    .and_then(Option::as_ref)
                                    .map_or(0, JsText::units_len)
                                    .checked_mul(4)?,
                            )
                        })
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            references.push(PlaceViewReference {
                source_id: entry.owner,
                revision: entry.revision,
                correction,
            });
            public.push(RuntimeKnownPlaceWitness {
                capsule: entry.capsule,
                exposure,
            });
        }
        let mut personal = Vec::new();
        let mut supports = Vec::new();
        for (kind, rows) in witnesses {
            let selected = public.iter();
            if kind == "support" {
                supports.extend(rows.into_values().map(|entry| entry.row));
            } else {
                let kind = source_kind(kind).ok_or(StoreError::InvalidRecord)?;
                for (id, entry) in rows {
                    if selected.clone().any(|row| {
                        row.capsule
                            .personal_source
                            .as_ref()
                            .is_some_and(|source| source.kind == kind && source.id == id)
                    }) {
                        personal.push((kind, entry.row));
                    }
                }
            }
        }
        Ok(KnownPlaceViewPage {
            places: public,
            references,
            next,
            scan_limited,
            witnesses: Some((personal, supports, held)),
            _display: display,
        })
    }
}

struct SourceRow {
    revision: String,
    row: InstalledRow,
}

fn source_kind(kind: &str) -> Option<PersonalSourceKind> {
    match kind {
        "awareness" => Some(PersonalSourceKind::Awareness),
        "memory" => Some(PersonalSourceKind::Memory),
        "summary" => Some(PersonalSourceKind::Summary),
        _ => None,
    }
}

impl Store {
    async fn place_source_rows(
        &self,
        transaction: &Transaction<'_>,
        read: &PreparedKnownPlaceRead,
        kind: &str,
        owners: &[&str],
        held: &mut ByteReservation,
    ) -> StoreResult<BTreeMap<String, SourceRow>> {
        let name = match kind {
            "awareness" => "mind_awareness",
            "memory" => "mind_memories",
            "summary" => "mind_summaries",
            "support" => "mind_temporal_supports",
            _ => return Err(StoreError::InvalidRecord),
        };
        let table = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == name)
            .ok_or(StoreError::Schema)?;
        let support = kind == "support";
        let (from, identity, revision) = if support {
            (
                format!(
                    "FROM {name} s WHERE s.world_id=$1 AND s.actor_id=$2 AND s.source_id=ANY($4::text[])"
                ),
                "s.source_id",
                "s.account_revision",
            )
        } else {
            (format!("FROM recall_sources r JOIN {name} s ON s.world_id=r.world_id AND s.id=r.record_id
             WHERE r.world_id=$1 AND r.actor_id=$2 AND r.source_kind=$3 AND r.id=ANY($4::text[]) AND r.eligible=1"), "r.id", "r.revision")
        };
        // Keep the same positional parameter grammar for all source families.
        let from = if support {
            format!("{from} AND $3::text='support'")
        } else {
            from
        };
        let params: &[&(dyn ToSql + Sync)] = &[&read.world, &read.actor, &kind, &owners];
        let shape = transaction.query_one(&format!("SELECT count(*),COALESCE(sum(octet_length(s::text)+4*octet_length(s.payload)),0)::bigint {from}"), params).await?;
        let rows = ordinal(shape.try_get(0)?)? as usize;
        let bytes = ordinal(shape.try_get(1)?)?;
        if rows > owners.len() || bytes > read.maximum_bytes {
            return Err(StoreError::Capacity);
        }
        let bytes = usize::try_from(bytes).map_err(|_| StoreError::Capacity)?;
        held.resize(
            held.bytes()
                .checked_add(bytes.checked_mul(12).ok_or(StoreError::Capacity)?)
                .and_then(|n| n.checked_add(rows.checked_mul(2048)?))
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)?;
        if rows == 0 {
            return Ok(BTreeMap::new());
        }
        let mut select = "SELECT s.id,s.parent_id,s.slot,s.position,s.payload".to_owned();
        for column in &table.columns {
            select.push_str(",s.");
            select.push_str(&column.name);
        }
        select.push_str(&format!(",{identity},{revision} {from}"));
        let output = transaction.query(&select, params).await?;
        if output.len() != rows {
            return Err(StoreError::StaleCut);
        }
        let mut values = BTreeMap::new();
        for row in output {
            let id = row.try_get(5 + table.columns.len())?;
            let revision = row.try_get(6 + table.columns.len())?;
            let row = super::super::read::installed_row(table, row)?;
            if values.insert(id, SourceRow { revision, row }).is_some() {
                return Err(StoreError::InvalidRecord);
            }
        }
        Ok(values)
    }
}

fn place_exposure(
    body: &str,
    capsule: &KnownPlaceCapsule,
    kind: &str,
) -> StoreResult<EncounterExposure> {
    let same = |exposure: &EncounterExposure| matches!(exposure, EncounterExposure::Place { id, .. } if id == &capsule.place_id);
    match kind {
        "awareness" => {
            #[derive(Deserialize)]
            struct Fields {
                exposure: Option<EncounterExposure>,
            }
            let source: Fields =
                serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            source
                .exposure
                .filter(same)
                .ok_or(StoreError::InvalidRecord)
        }
        "support" => {
            let source: openlegend_simulation::received::TemporalSupportCapsule =
                serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            source
                .values
                .iter()
                .zip(source.receipt.facets.iter())
                .find_map(|(value, field)| {
                    if !field
                        .original
                        .as_ref()
                        .is_some_and(|original| original.source == capsule.source)
                    {
                        return None;
                    }
                    match value {
                        openlegend_simulation::received::ReceivedValueFragment::Sensory(
                            SensoryFacet::EncounterExposure { exposure },
                        ) if same(exposure) => Some(exposure.clone()),
                        _ => None,
                    }
                })
                .ok_or(StoreError::InvalidRecord)
        }
        "memory" | "summary" => {
            #[derive(Default, Deserialize)]
            struct Observations {
                #[serde(default)]
                observation: Option<ObservationContribution>,
                #[serde(default)]
                observations: Vec<ObservationContribution>,
            }
            #[derive(Deserialize)]
            struct Fields {
                #[serde(flatten)]
                own: Observations,
                #[serde(default)]
                evidence: Observations,
                #[serde(default)]
                manifest: Observations,
            }
            let source: Fields =
                serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            [source.own, source.evidence, source.manifest]
                .into_iter()
                .flat_map(|found| found.observations.into_iter().chain(found.observation))
                .filter(|original| original.id == capsule.source.id)
                .flat_map(|original| original.facets.into_iter())
                .find_map(|facet| match facet.value {
                    SensoryFacet::EncounterExposure { exposure } if same(&exposure) => {
                        Some(exposure)
                    }
                    _ => None,
                })
                .ok_or(StoreError::InvalidRecord)
        }
        _ => Err(StoreError::InvalidRecord),
    }
}
