//! Detached account custody for the asynchronous player request. The final
//! check rereads only its selected event IDs, not a later world revision.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::received::{ReceivedValueRecord, ReceivedValueReference};

pub(crate) struct CapturedPlayerEvents {
    json: String,
    fence: PlayerEventFence,
    _output: ByteReservation,
}
impl CapturedPlayerEvents {
    pub(super) fn new(json: String, output: ByteReservation, fence: PlayerEventFence) -> Self {
        Self {
            json,
            fence,
            _output: output,
        }
    }
    pub(crate) fn json(&self) -> &str {
        &self.json
    }
    pub(crate) fn still_permitted(
        &self,
        state: &SimulationState,
        actor: &str,
        ids: &[String],
        budget: &ByteBudget,
    ) -> Result<bool, ExperienceError> {
        self.fence.still_permitted(state, actor, ids, budget)
    }
}
enum Snapshot {
    Awareness(Arc<PersonalSourceRecord>),
    Temporal {
        receipt: TemporalReceipt,
        members: Vec<usize>,
        values: IndexMap<String, Arc<ReceivedValueRecord>>,
        _receipt_guard: ByteReservation,
        _values_guard: ByteReservation,
    },
    Current {
        original: OwnedObservation,
        members: Vec<usize>,
        _guard: ByteReservation,
    },
}
struct AccountSnapshot {
    original: Arc<crate::events::OriginalOccurrence>,
    evidence: Snapshot,
}
pub(super) struct PlayerEventFence {
    world_id: String,
    generation: String,
    actor_id: String,
    physical_life: u64,
    accounts: IndexMap<String, AccountSnapshot>,
    _guard: ByteReservation,
}
impl PlayerEventFence {
    pub fn capture(
        state: &SimulationState,
        actor_id: &str,
        accounts: IndexMap<&str, Account<'_>>,
        budget: &ByteBudget,
    ) -> Result<Self, ExperienceError> {
        let bytes = map_storage::<String, AccountSnapshot>(accounts.len())
            .and_then(|n| n.checked_add(state.physical.header.id.len()))
            .and_then(|n| n.checked_add(state.generation.len()))
            .and_then(|n| n.checked_add(actor_id.len()))
            .and_then(|n| accounts.keys().try_fold(n, |n, id| n.checked_add(id.len())))
            .ok_or_else(capacity)?;
        let guard = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut retained = IndexMap::new();
        retained
            .try_reserve(accounts.len())
            .map_err(|_| capacity())?;
        for (id, account) in accounts {
            let original = Arc::clone(
                state
                    .occurrences
                    .original(id)
                    .map_err(|_| ExperienceError::Unavailable)?,
            );
            let evidence = match account.evidence {
                Evidence::Awareness(value) => Snapshot::Awareness(Arc::clone(
                    value.source.ok_or(ExperienceError::Unavailable)?,
                )),
                Evidence::Current {
                    original,
                    members,
                    _guard,
                } => Snapshot::Current {
                    original,
                    members,
                    _guard,
                },
                Evidence::Temporal {
                    receipt,
                    members,
                    values,
                    _guard,
                } => {
                    let count = members.len();
                    let keys = members
                        .iter()
                        .try_fold(0usize, |n, index| match &receipt.facets[*index].value_ref {
                            ReceivedValueReference::Shared(id) => n.checked_add(id.len()),
                            _ => Some(n),
                        })
                        .ok_or_else(capacity)?;
                    let bytes = map_storage::<String, Arc<ReceivedValueRecord>>(count)
                        .and_then(|n| n.checked_add(keys))
                        .ok_or_else(capacity)?;
                    let values_guard = budget.reserve(bytes).map_err(|_| capacity())?;
                    let mut shared = IndexMap::new();
                    shared.try_reserve(count).map_err(|_| capacity())?;
                    for &index in &members {
                        if let ReceivedValueReference::Shared(id) = &receipt.facets[index].value_ref
                        {
                            if !shared.contains_key(id) {
                                let record = values
                                    .as_ref()
                                    .and_then(|pool| pool.shared_record(id))
                                    .ok_or(ExperienceError::Unavailable)?;
                                shared.insert(id.clone(), Arc::clone(record));
                            }
                        }
                    }
                    Snapshot::Temporal {
                        receipt,
                        members,
                        values: shared,
                        _receipt_guard: _guard,
                        _values_guard: values_guard,
                    }
                }
            };
            retained.insert(id.to_owned(), AccountSnapshot { original, evidence });
        }
        Ok(Self {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            actor_id: actor_id.to_owned(),
            physical_life: state
                .physical
                .entities
                .get(actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.physical_life)
                .unwrap_or(0),
            accounts: retained,
            _guard: guard,
        })
    }
    fn still_permitted(
        &self,
        state: &SimulationState,
        actor: &str,
        ids: &[String],
        budget: &ByteBudget,
    ) -> Result<bool, ExperienceError> {
        let Some(current_actor) = state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
        else {
            return Ok(false);
        };
        if actor != self.actor_id
            || state.physical.header.id != self.world_id
            || state.generation != self.generation
            || current_actor.physical_life.unwrap_or(0) != self.physical_life
        {
            return Ok(false);
        }
        let bytes = map_storage::<&str, ()>(ids.len())
            .and_then(|n| {
                n.checked_add(
                    ids.len()
                        .checked_mul(tree_node_bound::<&str, &crate::events::WorldEvent>()?)?,
                )
            })
            .ok_or_else(capacity)?;
        let _selection = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut wanted = IndexSet::new();
        wanted.try_reserve(ids.len()).map_err(|_| capacity())?;
        let mut originals = BTreeMap::new();
        for id in ids {
            let Some(snapshot) = self.accounts.get(id) else {
                return Ok(false);
            };
            let event = snapshot.original.event();
            wanted.insert(event.id.as_str());
            originals.insert(event.id.as_str(), event);
        }
        // The captured immutable original supplies metadata even after a hot
        // pointer is pruned. Source's post-await check rereads personal facts;
        // it does not require the original to remain in the newer hot window.
        let current = select_player_accounts(state, actor, wanted, originals, budget)?;
        for id in ids {
            let Some(after) = current.selected.get(id.as_str()) else {
                return Ok(false);
            };
            if !same_evidence(&self.accounts[id].evidence, &after.evidence, budget)? {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
fn first_snapshot<'a>(value: &'a Snapshot, kind: &str) -> Option<&'a SensoryFacet> {
    match value {
        Snapshot::Temporal {
            receipt,
            members,
            values,
            ..
        } => members.iter().find_map(|index| {
            let fragment = match &receipt.facets[*index].value_ref {
                ReceivedValueReference::Shared(id) => values.get(id).map(|record| &record.value),
                ReceivedValueReference::Inline(value) => Some(value.as_ref()),
            }?;
            match fragment {
                ReceivedValueFragment::Sensory(value) if value.kind() == kind => Some(value),
                _ => None,
            }
        }),
        Snapshot::Current {
            original, members, ..
        } => members
            .iter()
            .map(|index| &original.observation().facets[*index].value)
            .find(|value| value.kind() == kind),
        Snapshot::Awareness(_) => None,
    }
}
fn first_current<'a>(value: &'a Evidence<'_>, kind: &str) -> Option<&'a SensoryFacet> {
    match value {
        Evidence::Temporal {
            receipt,
            members,
            values,
            ..
        } => members.iter().find_map(|index| {
            let fragment = match &receipt.facets[*index].value_ref {
                ReceivedValueReference::Shared(id) => {
                    values.as_ref().and_then(|values| values.shared_value(id))
                }
                ReceivedValueReference::Inline(value) => Some(value.as_ref()),
            }?;
            match fragment {
                ReceivedValueFragment::Sensory(value) if value.kind() == kind => Some(value),
                _ => None,
            }
        }),
        Evidence::Current {
            original, members, ..
        } => members
            .iter()
            .map(|index| &original.observation().facets[*index].value)
            .find(|value| value.kind() == kind),
        Evidence::Awareness(_) => None,
    }
}
fn same_evidence(
    before: &Snapshot,
    after: &Evidence<'_>,
    budget: &ByteBudget,
) -> Result<bool, ExperienceError> {
    if let Snapshot::Awareness(source) = before {
        let Evidence::Awareness(after) = after else {
            return Ok(false);
        };
        let next = after.source.ok_or(ExperienceError::Unavailable)?;
        if Arc::ptr_eq(source, next) {
            return Ok(true);
        }
        let before = awareness_evidence(source)?;
        for (left, right) in evidence_fields(&before)
            .into_iter()
            .zip(evidence_fields(after))
        {
            match (left, right) {
                (None, None) => {}
                (Some(left), Some(right)) => {
                    if left.get() == right.get() {
                        continue;
                    }
                    let bytes = encoded_body_bound(left.get())?
                        .checked_add(encoded_body_bound(right.get())?)
                        .ok_or_else(capacity)?;
                    let _decoded = budget.reserve(bytes).map_err(|_| capacity())?;
                    let left: crate::records::SqlCell = serde_json::from_str(left.get())
                        .map_err(|_| ExperienceError::InvalidBody("player evidence comparison"))?;
                    let right: crate::records::SqlCell = serde_json::from_str(right.get())
                        .map_err(|_| ExperienceError::InvalidBody("player evidence comparison"))?;
                    if left != right {
                        return Ok(false);
                    }
                }
                _ => return Ok(false),
            }
        }
        return Ok(true);
    }
    if matches!(after, Evidence::Awareness(_)) {
        return Ok(false);
    }
    let equal = match (
        first_snapshot(before, "event"),
        first_current(after, "event"),
    ) {
        (
            Some(SensoryFacet::Event {
                event_type: a,
                text: at,
                modality: am,
                importance: ai,
                source_subject: asub,
                urgency: au,
                content: ac,
                data: ad,
                references: ar,
                ..
            }),
            Some(SensoryFacet::Event {
                event_type: b,
                text: bt,
                modality: bm,
                importance: bi,
                source_subject: bsub,
                urgency: bu,
                content: bc,
                data: bd,
                references: br,
                ..
            }),
        ) => {
            a == b
                && at == bt
                && am == bm
                && ai == bi
                && asub == bsub
                && au == bu
                && ac == bc
                && ad == bd
                && ar == br
        }
        _ => false,
    };
    fn sound(value: Option<&SensoryFacet>) -> Option<&crate::reception::PerceivedSound> {
        match value {
            Some(SensoryFacet::Sound { sound, .. }) => Some(sound),
            _ => None,
        }
    }
    Ok(equal && sound(first_snapshot(before, "sound")) == sound(first_current(after, "sound")))
}
/// This is the exact personalEventEvidence source field list. Bookkeeping
/// sourceReceipt/retention is deliberately absent; opaque observation and
/// recognition provenance participates without being sent to the formatter.
fn evidence_fields<'a>(
    value: &AwarenessEvidence<'a>,
) -> [Option<&'a serde_json::value::RawValue>; 22] {
    [
        Some(value.retention_class),
        value.expires_at,
        value.sound,
        Some(value.actor_id),
        value.event_data,
        value.references,
        value.event_type,
        Some(value.text),
        value.content,
        Some(value.modality),
        value.source_id,
        value.target_id,
        value.speech,
        Some(value.importance),
        value.urgency,
        value.exposure,
        value.observation,
        value.observations,
        value.source_subject,
        value.source_body,
        value.recognition,
        value.received_features,
    ]
}
