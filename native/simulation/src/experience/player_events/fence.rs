//! Detached account custody for the asynchronous player request. The final
//! check rereads only its selected event IDs, not a later world revision.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::received::{ReceivedValueRecord, ReceivedValueReference};

pub(crate) struct CapturedPlayerEvents {
    encoded: Option<(String, ByteReservation)>,
    fence: PlayerEventFence,
    at: f64,
}
impl CapturedPlayerEvents {
    pub(super) fn new(
        encoded: Option<(String, ByteReservation)>,
        fence: PlayerEventFence,
        at: f64,
    ) -> Self {
        Self { encoded, fence, at }
    }
    pub(crate) fn json(&self) -> Option<&str> {
        self.encoded.as_ref().map(|(json, _)| json.as_str())
    }
    pub(crate) fn read(&self) -> Option<PlayerEventRead<'_>> {
        self.encoded
            .is_none()
            .then_some(PlayerEventRead { capture: self })
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

/// The detached permitted event read owns the evidence and the current role
/// facts. Callers still present selected IDs to the final disclosure check.
pub struct PlayerEventRead<'a> {
    capture: &'a CapturedPlayerEvents,
}
impl<'a> PlayerEventRead<'a> {
    pub fn scope(&self) -> (&'a str, &'a str, f64) {
        let fence = &self.capture.fence;
        (&fence.world_id, &fence.actor_id, self.capture.at)
    }

    pub fn accounts(&self) -> impl ExactSizeIterator<Item = PlayerEventAccount<'a>> {
        self.capture.fence.accounts.values().map(PlayerEventAccount)
    }
}

#[derive(Clone, Copy)]
pub struct PlayerEventAccount<'a>(&'a AccountSnapshot);

pub enum PlayerEventBody<'a> {
    Awareness(&'a str),
    Received {
        event: &'a SensoryFacet,
        sound: Option<&'a SensoryFacet>,
    },
}

impl<'a> PlayerEventAccount<'a> {
    pub fn chronology(self) -> (&'a str, f64, u64, &'a str) {
        let event = self.0.original.event();
        (
            &event.id,
            event.at,
            event.order.unwrap_or(event.sequence),
            &event.event_type,
        )
    }

    pub fn roles(self) -> &'a RoleFacts {
        self.0
            .roles
            .as_ref()
            .expect("only direct captures expose typed accounts")
    }

    pub fn body(self) -> Option<PlayerEventBody<'a>> {
        let snapshot = &self.0.evidence;
        match snapshot {
            Snapshot::Awareness(source, ..) => Some(PlayerEventBody::Awareness(source.payload())),
            _ => Some(PlayerEventBody::Received {
                event: first_snapshot(snapshot, "event")?,
                sound: first_snapshot(snapshot, "sound"),
            }),
        }
    }

    /// Size just the body fields consumed by the formatter, without encoding
    /// them. Awareness is still stored in its canonical database format.
    pub fn selected_body_bytes(self) -> Option<usize> {
        Some(match &self.0.evidence {
            Snapshot::Awareness(..) => self.0.projected_awareness_bytes,
            evidence => first_snapshot(evidence, "event")
                .map_or(Some(0), HeapBytes::heap_bytes)?
                .checked_add(
                    first_snapshot(evidence, "sound").map_or(Some(0), HeapBytes::heap_bytes)?,
                )?,
        })
    }
}

enum Snapshot {
    Awareness(Arc<PersonalSourceRecord>, Arc<crate::host::SharedMemoryPin>),
    Temporal {
        receipt: TemporalReceipt,
        members: Vec<usize>,
        values: IndexMap<String, Arc<ReceivedValueRecord>>,
        _receipt_guard: ByteReservation,
        _values_guard: ByteReservation,
        _pins: Vec<Arc<crate::host::SharedMemoryPin>>,
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
    roles: Option<RoleFacts>,
    projected_awareness_bytes: usize,
    acquired_visual_contact: bool,
    _original_pin: Arc<crate::host::SharedMemoryPin>,
}
pub(super) struct PlayerEventFence {
    world_id: String,
    generation: String,
    actor_id: String,
    physical_life: u64,
    privacy_revision: u64,
    accounts: IndexMap<String, AccountSnapshot>,
    _guard: ByteReservation,
}
impl PlayerEventFence {
    pub fn capture(
        state: &SimulationState,
        actor_id: &str,
        accounts: IndexMap<&str, Account<'_>>,
        direct: bool,
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
            let mut projected_awareness_bytes = 0;
            let evidence = match account.evidence {
                Evidence::Awareness(value) => {
                    if direct {
                        projected_awareness_bytes =
                            value.projection_bytes().ok_or_else(capacity)?;
                    }
                    let source = value.source.ok_or(ExperienceError::Unavailable)?;
                    Snapshot::Awareness(Arc::clone(source), source.capture_pin(budget)?)
                }
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
                        .and_then(|n| {
                            n.checked_add(
                                count.checked_mul(size_of::<Arc<crate::host::SharedMemoryPin>>())?,
                            )
                        })
                        .ok_or_else(capacity)?;
                    let values_guard = budget.reserve(bytes).map_err(|_| capacity())?;
                    let mut shared = IndexMap::new();
                    let mut pins = Vec::new();
                    pins.try_reserve_exact(count).map_err(|_| capacity())?;
                    shared.try_reserve(count).map_err(|_| capacity())?;
                    for &index in &members {
                        if let ReceivedValueReference::Shared(id) = &receipt.facets[index].value_ref
                        {
                            if !shared.contains_key(id) {
                                let record = values
                                    .as_ref()
                                    .and_then(|pool| pool.shared_record(id))
                                    .ok_or(ExperienceError::Unavailable)?;
                                pins.push(record.capture_pin(budget).map_err(|_| capacity())?);
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
                        _pins: pins,
                    }
                }
            };
            let original_pin = original.capture_pin(budget).map_err(|_| capacity())?;
            retained.insert(
                id.to_owned(),
                AccountSnapshot {
                    original,
                    evidence,
                    acquired_visual_contact: account
                        .roles
                        .as_ref()
                        .is_some_and(|roles| roles.acquired_visual_contact),
                    roles: if direct { account.roles } else { None },
                    projected_awareness_bytes,
                    _original_pin: original_pin,
                },
            );
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
            privacy_revision: state
                .experience
                .actor(actor_id)
                .map_or(0, |actor| actor.privacy.revision()),
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
        let privacy_revision = state
            .experience
            .actor(actor)
            .map_or(0, |actor| actor.privacy.revision());
        for id in ids {
            let Some(after) = current.selected.get(id.as_str()) else {
                return Ok(false);
            };
            let before = &self.accounts[id];
            // The retained account can outlive a revocation of its acquired
            // member. A fresh read checks that member again before issuing a contact.
            if before.acquired_visual_contact
                && matches!(before.evidence, Snapshot::Awareness(..))
                && privacy_revision != self.privacy_revision
            {
                return Ok(false);
            }
            if !same_evidence(
                &before.evidence,
                &after.evidence,
                before.acquired_visual_contact,
                budget,
            )? {
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
        Snapshot::Awareness(..) => None,
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
    acquired_contact: bool,
    budget: &ByteBudget,
) -> Result<bool, ExperienceError> {
    if let Snapshot::Awareness(source, _) = before {
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
    // An occurrence contact also used the acquired actor's exact exposure
    // and chronology. Equal wording alone cannot keep that contact valid.
    if acquired_contact {
        let before_origin = match before {
            Snapshot::Temporal { receipt, .. } => receipt.origin.as_ref(),
            Snapshot::Current { original, .. } => Some(&original.observation().origin),
            _ => None,
        };
        let after_origin = match after {
            Evidence::Temporal { receipt, .. } => receipt.origin.as_ref(),
            Evidence::Current { original, .. } => Some(&original.observation().origin),
            _ => None,
        };
        if before_origin != after_origin {
            return Ok(false);
        }
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
                participants: ap,
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
                participants: bp,
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
                && (!acquired_contact || ap == bp)
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
