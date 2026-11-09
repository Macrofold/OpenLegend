//! Current player history is selected from that actor's acquired accounts.
//! Objective occurrences supply only the finite metadata consumed by the
//! existing formatter, after the actor's evidence has passed its actual fence.
use super::*;
use crate::host::retained_size::{map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    ReceivedEntry, ReceivedEntryKind, ReceivedOrigin, ReceivedValueFragment, TemporalReceipt,
    materialize_received_receipt,
};
use crate::reception::{EventScalar, OwnedObservation, ReceivedValueLookup, SensoryFacet};
use crate::simulation::SimulationState;
use serde::ser::{SerializeSeq, SerializeStruct, Serializer};
use std::mem::size_of;
mod roles;
use roles::{RoleFacts, RoleReader};
mod fence;
pub(crate) use fence::CapturedPlayerEvents;

enum Evidence<'a> {
    Awareness(AwarenessEvidence<'a>),
    Temporal {
        receipt: TemporalReceipt,
        members: Vec<usize>,
        values: &'a Option<crate::received::ReceivedValues>,
        _guard: ByteReservation,
    },
    Current {
        original: OwnedObservation,
        members: Vec<usize>,
        _guard: ByteReservation,
    },
}
/// Only fields actually consumed by projectEventEvidence cross to Node. Large
/// original observations and unrelated recognition/history bodies stay native.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AwarenessEvidence<'a> {
    #[serde(skip)]
    source: Option<&'a Arc<PersonalSourceRecord>>,
    #[serde(borrow, skip_serializing)]
    observation: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing)]
    observations: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing)]
    recognition: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing)]
    received_features: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow)]
    retention_class: &'a serde_json::value::RawValue,
    #[serde(borrow)]
    actor_id: &'a serde_json::value::RawValue,
    #[serde(borrow)]
    text: &'a serde_json::value::RawValue,
    #[serde(borrow)]
    modality: &'a serde_json::value::RawValue,
    #[serde(borrow)]
    importance: &'a serde_json::value::RawValue,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    expires_at: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    event_type: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    event_data: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    references: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    content: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    source_id: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    speech: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    sound: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    urgency: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    exposure: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    source_subject: Option<&'a serde_json::value::RawValue>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    source_body: Option<&'a serde_json::value::RawValue>,
}
struct Account<'a> {
    original: &'a crate::events::WorldEvent,
    evidence: Evidence<'a>,
    roles: Option<RoleFacts>,
}
struct Original<'a>(&'a crate::events::WorldEvent);
impl Serialize for Original<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Response<'a> {
            #[serde(rename = "responseId")]
            id: &'a crate::text::JsText,
        }
        let event = self.0;
        let mut value = s.serialize_struct("OriginalMetadata", 7)?;
        value.serialize_field("id", &event.id)?;
        value.serialize_field("sequence", &event.sequence)?;
        value.serialize_field("at", &event.at)?;
        if let Some(order) = event.order {
            value.serialize_field("order", &order)?;
        }
        value.serialize_field("type", &event.event_type)?;
        if let Some(scope) = event.scope {
            value.serialize_field("scope", &scope)?;
        }
        if let Some(EventScalar::Text(id)) =
            event.data.as_ref().and_then(|data| data.get("responseId"))
        {
            value.serialize_field("data", &Response { id })?;
        }
        value.end()
    }
}
struct Values<'a, 'b>(&'a Evidence<'b>);
impl Serialize for Values<'_, '_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut values = s.serialize_seq(None)?;
        match self.0 {
            Evidence::Temporal {
                receipt,
                members,
                values: pool,
                ..
            } => {
                for &index in members {
                    let field = &receipt.facets[index];
                    let pool_values = pool.as_ref();
                    let Some(ReceivedValueFragment::Sensory(value)) =
                        pool_values.value_at(&field.value_ref)
                    else {
                        return Err(serde::ser::Error::custom(
                            "Selected event value became unavailable.",
                        ));
                    };
                    values.serialize_element(value)?;
                }
            }
            Evidence::Current {
                original, members, ..
            } => {
                for &index in members {
                    values.serialize_element(&original.observation().facets[index].value)?;
                }
            }
            Evidence::Awareness(_) => {
                return Err(serde::ser::Error::custom(
                    "Awareness has its own encoded source.",
                ));
            }
        }
        values.end()
    }
}
impl Serialize for Account<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut value = s.serialize_struct("PermittedPlayerEvent", 3)?;
        value.serialize_field("original", &Original(self.original))?;
        match &self.evidence {
            Evidence::Awareness(source) => value.serialize_field("evidence", source)?,
            evidence => value.serialize_field("values", &Values(evidence))?,
        }
        value.serialize_field(
            "roles",
            self.roles.as_ref().ok_or_else(|| {
                serde::ser::Error::custom("Player event roles were not captured.")
            })?,
        )?;
        value.end()
    }
}
fn capacity() -> ExperienceError {
    ExperienceError::Capacity
}
fn occurrence_id(entry: &ReceivedEntry) -> Option<&str> {
    if entry.kind != ReceivedEntryKind::Occurrence {
        return None;
    }
    match &entry.receipt.origin {
        Some(ReceivedOrigin::Occurrence { event_id, .. }) => Some(event_id),
        _ => None,
    }
}
fn temporal<'a>(
    state: &'a SimulationState,
    actor: &str,
    batch: &crate::received::ReceivedBatch,
    entry: &ReceivedEntry,
    budget: &ByteBudget,
) -> Result<Option<Evidence<'a>>, ExperienceError> {
    let guard = budget
        .reserve(super::history::receipt_bound(batch, entry).ok_or_else(capacity)?)
        .map_err(|_| capacity())?;
    let receipt = materialize_received_receipt(batch, entry, None)
        .map_err(|_| ExperienceError::Unavailable)?;
    let mut members = Vec::new();
    members
        .try_reserve_exact(receipt.facets.len())
        .map_err(|_| capacity())?;
    let pool = &state.reception.received_values;
    let values = pool.as_ref();
    let mut event = false;
    for (index, field) in receipt.facets.iter().enumerate() {
        let Some(fragment) = values.value_at(&field.value_ref) else {
            return Err(ExperienceError::Unavailable);
        };
        if !matches!(
            fragment,
            ReceivedValueFragment::Sensory(SensoryFacet::Event { .. } | SensoryFacet::Sound { .. })
        ) {
            continue;
        }
        if !super::evidence::temporal_facet_eligible(
            &state.experience,
            actor,
            field,
            fragment,
            &state.installed.account_law(),
        )? {
            continue;
        }
        event |= matches!(
            fragment,
            ReceivedValueFragment::Sensory(SensoryFacet::Event { .. })
        );
        members.push(index);
    }
    Ok(event.then_some(Evidence::Temporal {
        receipt,
        members,
        values: pool,
        _guard: guard,
    }))
}
fn select_temporal_page<'a>(
    state: &'a SimulationState,
    actor: &str,
    batches: impl Iterator<Item = &'a crate::received::ReceivedBatch>,
    wanted: &IndexSet<&'a str>,
    hot: &BTreeMap<&'a str, &'a crate::events::WorldEvent>,
    selected: &mut IndexMap<&'a str, Account<'a>>,
    budget: &ByteBudget,
) -> Result<(), ExperienceError> {
    let privacy = state.experience.actor(actor).map(|actor| &actor.privacy);
    let mut found = BTreeMap::new();
    // Build the same page-local occurrence selection once. Rewalking every
    // entry for each displayed ID would add deep-history work to this read.
    for batch in batches {
        for entry in &batch.entries {
            let Some(id) = occurrence_id(entry) else {
                continue;
            };
            let Some(&id) = wanted.get(id) else {
                continue;
            };
            if selected.contains_key(id)
                || found.contains_key(id)
                || !hot.contains_key(id)
                || privacy.is_some_and(|privacy| privacy.forgotten_index.contains(id))
            {
                continue;
            }
            if let Some(evidence) = temporal(state, actor, batch, entry, budget)? {
                found.insert(id, evidence);
            }
        }
    }
    for &id in wanted {
        if let Some(evidence) = found.remove(id) {
            selected.insert(
                id,
                Account {
                    original: hot[id],
                    evidence,
                    roles: None,
                },
            );
        }
    }
    Ok(())
}

fn awareness_evidence(
    source: &Arc<PersonalSourceRecord>,
) -> Result<AwarenessEvidence<'_>, ExperienceError> {
    let mut value: AwarenessEvidence<'_> = serde_json::from_str(source.payload())
        .map_err(|_| ExperienceError::InvalidBody("player event facts"))?;
    value.source = Some(source);
    Ok(value)
}
struct SelectedAccounts<'a> {
    selected: IndexMap<&'a str, Account<'a>>,
    _guard: ByteReservation,
}
fn select_player_accounts<'a>(
    state: &'a SimulationState,
    actor_id: &'a str,
    wanted: IndexSet<&'a str>,
    hot: BTreeMap<&'a str, &'a crate::events::WorldEvent>,
    budget: &ByteBudget,
) -> Result<SelectedAccounts<'a>, ExperienceError> {
    let actor = state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    let awareness = state
        .experience
        .optional_collection(actor_id, PersonalSourceKind::Awareness)?;
    let privacy = state.experience.actor(actor_id).map(|actor| &actor.privacy);
    let maximum = wanted.len();
    let bytes = maximum
        .checked_mul(tree_node_bound::<&str, Evidence>().ok_or_else(capacity)?)
        .and_then(|bytes| bytes.checked_add(map_storage::<&str, Account>(maximum)?))
        .ok_or_else(capacity)?;
    let guard = budget.reserve(bytes).map_err(|_| capacity())?;
    let mut selected = IndexMap::new();
    selected.try_reserve(maximum).map_err(|_| capacity())?;
    if let Some(awareness) = awareness {
        for source in awareness.records() {
            let Some(id) = source.header().event_id.as_deref() else {
                return Err(ExperienceError::InvalidBody("player awareness event"));
            };
            if wanted.contains(id)
                && !privacy.is_some_and(|privacy| privacy.forgotten_index.contains(id))
            {
                if let Some(original) = hot.get(id) {
                    selected.insert(
                        id,
                        Account {
                            original,
                            evidence: Evidence::Awareness(awareness_evidence(source)?),
                            roles: None,
                        },
                    );
                }
            }
        }
    }
    if let Some(history) = state.temporal.actor(actor_id) {
        // Pending logical pages are later than their durable physical predecessor.
        for page in history.pending_pages().iter().rev() {
            select_temporal_page(
                state,
                actor_id,
                std::iter::once(page.batch().value()),
                &wanted,
                &hot,
                &mut selected,
                budget,
            )?;
        }
        for page in history.pages().rev() {
            select_temporal_page(
                state,
                actor_id,
                page.batches().map(|batch| batch.value()),
                &wanted,
                &hot,
                &mut selected,
                budget,
            )?;
        }
    }
    // The full originals capture serves a complete cognition cut. A player
    // event read first selects occurrence IDs, then funds/materializes only
    // those originals, as receivedEventAccounts does in Source.
    let life = actor
        .actor
        .as_ref()
        .and_then(|actor| actor.physical_life)
        .unwrap_or(0);
    let originals = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(actor_id))
        .filter(|owner| owner.life == life)
        .map(|owner| owner.received.as_slice())
        .unwrap_or(&[]);
    let values = state.reception.received_values.as_ref();
    for source in originals {
        let crate::reception::ObservationOrigin::Occurrence { event_id, .. } = &source.origin
        else {
            continue;
        };
        let id = event_id.as_str();
        if !wanted.contains(id)
            || selected.contains_key(id)
            || privacy.is_some_and(|privacy| privacy.forgotten_index.contains(id))
        {
            continue;
        }
        let Some(original) = hot.get(id) else {
            continue;
        };
        let observation = crate::reception::materialize_owned_observation(&values, source, budget)
            .map_err(|_| ExperienceError::Unavailable)?;
        let value = observation.observation();
        if value.observer.actor_id != actor_id || value.observer.physical_life != life {
            return Err(ExperienceError::ForeignOwner);
        }
        let bytes = value
            .facets
            .len()
            .checked_mul(size_of::<usize>())
            .and_then(|n| n.checked_add(value.id.len().checked_mul(6)?))
            .and_then(|n| n.checked_add(128))
            .ok_or_else(capacity)?;
        let guard = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut members = Vec::new();
        members
            .try_reserve_exact(value.facets.len())
            .map_err(|_| capacity())?;
        let mut event = false;
        for (index, facet) in value.facets.iter().enumerate() {
            if matches!(
                facet.value,
                SensoryFacet::Event { .. } | SensoryFacet::Sound { .. }
            ) && value.observer.actor_id == actor_id
                && super::evidence::member_unrevoked(privacy, &value.id, facet.ordinal)
            {
                event |= matches!(facet.value, SensoryFacet::Event { .. });
                members.push(index);
            }
        }
        if event {
            selected.insert(
                original.id.as_str(),
                Account {
                    original,
                    evidence: Evidence::Current {
                        original: observation,
                        members,
                        _guard: guard,
                    },
                    roles: None,
                },
            );
        }
    }
    Ok(SelectedAccounts {
        selected,
        _guard: guard,
    })
}
pub(crate) fn capture_player_events(
    state: &SimulationState,
    actor_id: &str,
    window: usize,
    budget: &ByteBudget,
) -> Result<CapturedPlayerEvents, ExperienceError> {
    let actor = state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    if !state.occurrences.covers_hot_read(window) {
        return Err(ExperienceError::Unavailable);
    }
    let awareness = state
        .experience
        .optional_collection(actor_id, PersonalSourceKind::Awareness)?;
    let privacy = state.experience.actor(actor_id).map(|actor| &actor.privacy);
    let maximum = window.checked_mul(2).ok_or_else(capacity)?;
    let hot_count = state.occurrences.hot().len();

    let skeleton = map_storage::<&str, ()>(maximum)
        .and_then(|bytes| {
            bytes.checked_add(
                hot_count.checked_mul(tree_node_bound::<&str, &crate::events::WorldEvent>()?)?,
            )
        })
        .ok_or_else(capacity)?;
    let _selection_guard = budget.reserve(skeleton).map_err(|_| capacity())?;
    let mut hot = BTreeMap::new();
    for value in state.occurrences.hot() {
        hot.insert(value.event().event().id.as_str(), value.event().event());
    }
    let mut wanted = IndexSet::new();
    wanted.try_reserve(maximum).map_err(|_| capacity())?;
    wanted.extend(
        state
            .occurrences
            .hot()
            .skip(hot_count.saturating_sub(window))
            .map(|value| value.event().event().id.as_str()),
    );
    if let Some(awareness) = awareness {
        let count = awareness.records().len();
        wanted.extend(
            awareness
                .records()
                .skip(count.saturating_sub(window))
                .filter_map(|source| source.header().event_id.as_deref()),
        );
    }
    let SelectedAccounts {
        mut selected,
        _guard: _accounts_guard,
    } = select_player_accounts(state, actor_id, wanted, hot, budget)?;
    let roles = RoleReader::prepare(state, actor_id)?;
    for account in selected.values_mut() {
        account.roles = Some(roles.capture(&account.evidence, budget)?);
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Product<'a, 'b> {
        world_id: &'a str,
        generation: &'a str,
        accepted_cut: u64,
        actor_id: &'a str,
        physical_life: Option<u64>,
        at: f64,
        privacy_revision: u64,
        accounts: Vec<&'a Account<'b>>,
    }
    let _pointers = budget
        .reserve(
            selected
                .len()
                .checked_mul(size_of::<&Account>())
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let product = Product {
        world_id: &state.physical.header.id,
        generation: &state.generation,
        accepted_cut: state.accepted_cut,
        actor_id,
        physical_life: actor.actor.as_ref().and_then(|actor| actor.physical_life),
        at: state.physical.header.sim_time,
        privacy_revision: privacy.map_or(0, ActorPrivacy::revision),
        accounts: selected.values().collect(),
    };
    let length =
        crate::encoding::json_record_len(&product).map_err(|_| ExperienceError::Unavailable)?;
    let mut output = budget
        .reserve(length.checked_mul(2).ok_or_else(capacity)?.max(8))
        .map_err(|_| capacity())?;
    let json = crate::encoding::json_record(&product).map_err(|_| ExperienceError::Unavailable)?;
    output.resize(json.capacity()).map_err(|_| capacity())?;
    drop(product);
    let fence = fence::PlayerEventFence::capture(state, actor_id, selected, budget)?;
    Ok(CapturedPlayerEvents::new(json, output, fence))
}
