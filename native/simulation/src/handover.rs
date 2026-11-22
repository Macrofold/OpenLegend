//! Active consent is a single authoritative pending collection. Its indexes
//! contain only the keys needed for one pair, one lot and the next deadline.
use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ResidentReservation, retained_size::HeapBytes},
    identity::MAX_SAFE_INTEGER,
    state::EntityStore,
    values::{DefinitionPin, is_safe_record_id},
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize, Serializer, ser::SerializeMap};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::Arc,
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftLot {
    pub item_id: String,
    pub definition_pin: DefinitionPin,
    pub quantity: u64,
    pub whole: bool,
    pub revision: u64,
    pub placement_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftOffer {
    pub id: String,
    pub revision: u64,
    pub offerer_id: String,
    pub recipient_id: String,
    pub offered: [GiftLot; 1],
    pub requested: [(); 0],
    pub created_at: f64,
    pub expires_at: f64,
}
impl GiftOffer {
    pub fn lot(&self) -> &GiftLot {
        &self.offered[0]
    }
    pub fn party(&self, actor: &str) -> bool {
        self.offerer_id == actor || self.recipient_id == actor
    }

    fn valid_shape(&self, at: f64) -> bool {
        let lot = self.lot();
        [&self.id, &self.offerer_id, &self.recipient_id, &lot.item_id]
            .into_iter()
            .all(|id| is_safe_record_id(id))
            && self.offerer_id != self.recipient_id
            && (1..=MAX_SAFE_INTEGER).contains(&self.revision)
            && lot.definition_pin.is_valid()
            && (1..=MAX_SAFE_INTEGER).contains(&lot.quantity)
            && lot.revision <= MAX_SAFE_INTEGER
            && lot.placement_revision <= MAX_SAFE_INTEGER
            && self.created_at.is_finite()
            && self.created_at >= 0.0
            && self.created_at <= at
            && self.expires_at.is_finite()
            && self.expires_at > self.created_at
    }
}

struct RetainedGift {
    offer: GiftOffer,
    _custody: ResidentReservation,
}

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct Deadline(u64);
impl Deadline {
    // Installation and command admission already require nonnegative finite
    // times. Their IEEE bits therefore have the same order as game time.
    fn new(at: f64) -> Self {
        Self((at + 0.0).to_bits())
    }
}

pub(crate) struct GiftState {
    rows: IndexMap<String, Arc<RetainedGift>>,
    parties: BTreeMap<String, BTreeSet<String>>,
    lots: BTreeMap<String, String>,
    deadlines: BTreeMap<Deadline, BTreeSet<String>>,
}
pub(crate) struct GiftUndo {
    id: String,
    prior: Option<(usize, Arc<RetainedGift>)>,
}
impl GiftUndo {
    pub(crate) fn revert(self, state: &mut GiftState) -> Result<(), ExecutionError> {
        let removed = state.remove(&self.id);
        match self.prior {
            Some((ordinal, prior)) if removed.is_none() => {
                state.insert(ordinal, prior);
                Ok(())
            }
            None if removed.is_some() => Ok(()),
            _ => Err(ExecutionError::Invariant),
        }
    }
}

impl GiftState {
    pub(crate) fn install(
        saved: Option<IndexMap<String, GiftOffer>>,
        entities: &EntityStore,
        at: f64,
        budget: &ByteBudget,
    ) -> Result<Self, crate::install::InstallError> {
        use crate::install::InstallError;
        let mut state = Self {
            rows: IndexMap::new(),
            parties: BTreeMap::new(),
            lots: BTreeMap::new(),
            deadlines: BTreeMap::new(),
        };
        for (id, offer) in saved.into_iter().flatten() {
            let lot = offer.lot();
            if id != offer.id
                || !offer.valid_shape(at)
                || offer.expires_at < at
                || !entities
                    .get(&offer.offerer_id)
                    .is_some_and(|entity| entity.actor.is_some())
                || !entities
                    .get(&offer.recipient_id)
                    .is_some_and(|entity| entity.actor.is_some())
                || state.lots.contains_key(&lot.item_id)
            {
                return Err(InstallError::CurrentFormat);
            }
            let row = Self::fund(offer, budget).map_err(|_| InstallError::Capacity)?;
            state.insert(state.rows.len(), row);
        }
        Ok(state)
    }
    pub(crate) fn validate_definitions(
        &self,
        definitions: &crate::install::RetainedDefinitions,
        budget: &ByteBudget,
    ) -> Result<(), crate::install::InstallError> {
        use crate::install::InstallError;
        if self.rows.is_empty() {
            return Ok(());
        }
        let policy = definitions
            .social_offer_read
            .as_ref()
            .ok_or(InstallError::CurrentFormat)?;
        for retained in self.rows.values() {
            let offer = &retained.offer;
            let lot = offer.lot();
            if offer.expires_at > offer.created_at + policy.pending_seconds
                || !definitions
                    .items
                    .get(&lot.definition_pin.id)
                    .is_some_and(|definition| {
                        definition.pin == lot.definition_pin && definition.portable
                    })
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        let pair_keys = if policy.one_pending_per_pair {
            self.parties.values().map(BTreeSet::len).max().unwrap_or(0)
        } else {
            0
        };
        let pair_bytes = crate::host::retained_size::tree_node_bound::<&str, ()>()
            .and_then(|size| size.checked_mul(pair_keys))
            .ok_or(InstallError::Capacity)?;
        let _pairs = budget
            .reserve(pair_bytes)
            .map_err(|_| InstallError::Capacity)?;
        for (actor, ids) in &self.parties {
            let mut outgoing = 0;
            let mut incoming = 0;
            let mut counterparts = BTreeSet::<&str>::new();
            for id in ids {
                let offer = self.get(id).ok_or(InstallError::CurrentFormat)?;
                let other = if offer.offerer_id == *actor {
                    outgoing += 1;
                    &offer.recipient_id
                } else {
                    incoming += 1;
                    &offer.offerer_id
                };
                if policy.one_pending_per_pair && !counterparts.insert(other) {
                    return Err(InstallError::CurrentFormat);
                }
            }
            if incoming > policy.incoming || outgoing > policy.outgoing {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(())
    }

    fn fund(offer: GiftOffer, budget: &ByteBudget) -> Result<Arc<RetainedGift>, ExecutionError> {
        // Fund the immutable offer and all of its exact index keys. An undo
        // entry may hold this body independently of current membership.
        let variable = [
            &offer.id,
            &offer.offerer_id,
            &offer.recipient_id,
            &offer.lot().item_id,
            &offer.lot().definition_pin.id,
            &offer.lot().definition_pin.digest,
        ]
        .iter()
        .try_fold(0usize, |n, value| n.checked_add(value.capacity()))
        .ok_or(ExecutionError::Capacity)?;
        let capacity = variable
            .checked_mul(6)
            .and_then(|bytes| bytes.checked_add(2048))
            .ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve_record(capacity)?;
        Ok(Arc::new(RetainedGift {
            offer,
            _custody: custody,
        }))
    }
    fn insert(&mut self, ordinal: usize, retained: Arc<RetainedGift>) {
        let offer = &retained.offer;
        let id = offer.id.clone();
        self.lots.insert(offer.lot().item_id.clone(), id.clone());
        for actor in [&offer.offerer_id, &offer.recipient_id] {
            self.parties
                .entry(actor.clone())
                .or_default()
                .insert(id.clone());
        }
        self.deadlines
            .entry(Deadline::new(offer.expires_at))
            .or_default()
            .insert(id.clone());
        self.rows.shift_insert(ordinal, id, retained);
    }
    fn remove(&mut self, id: &str) -> Option<(usize, Arc<RetainedGift>)> {
        let (ordinal, _, retained) = self.rows.shift_remove_full(id)?;
        let offer = &retained.offer;
        self.lots.remove(&offer.lot().item_id);
        for actor in [&offer.offerer_id, &offer.recipient_id] {
            remove_key(&mut self.parties, actor, id);
        }
        remove_key(&mut self.deadlines, &Deadline::new(offer.expires_at), id);
        Some((ordinal, retained))
    }
    pub(crate) fn add(
        &mut self,
        offer: GiftOffer,
        budget: &ByteBudget,
    ) -> Result<GiftUndo, ExecutionError> {
        if self.rows.contains_key(&offer.id) || self.lots.contains_key(&offer.lot().item_id) {
            return Err(ExecutionError::Invariant);
        }
        let id = offer.id.clone();
        let row = Self::fund(offer, budget)?;
        self.insert(self.rows.len(), row);
        Ok(GiftUndo { id, prior: None })
    }
    pub(crate) fn finish(&mut self, id: &str) -> Result<GiftUndo, ExecutionError> {
        let prior = self.remove(id).ok_or(ExecutionError::Invariant)?;
        Ok(GiftUndo {
            id: id.into(),
            prior: Some(prior),
        })
    }
    pub(crate) fn get(&self, id: &str) -> Option<&GiftOffer> {
        self.rows.get(id).map(|row| &row.offer)
    }
    pub(crate) fn for_actor(&self, actor: &str) -> impl Iterator<Item = &GiftOffer> {
        self.parties
            .get(actor)
            .into_iter()
            .flatten()
            .filter_map(|id| self.get(id))
    }
    pub(crate) fn for_item(&self, item: &str) -> Option<&GiftOffer> {
        self.lots.get(item).and_then(|id| self.get(id))
    }
    pub(crate) fn next_deadline(&self) -> Option<f64> {
        self.deadlines
            .first_key_value()
            .map(|(at, _)| f64::from_bits(at.0))
    }
    pub(crate) fn next_due(&self, at: f64) -> Option<&GiftOffer> {
        let (_, ids) = self.deadlines.range(..=Deadline::new(at)).next()?;
        // Simultaneous deadlines keep the same ordinary offer order, which
        // the changed world row and rollback entries already preserve.
        ids.iter()
            .filter_map(|id| self.rows.get_full(id))
            .min_by_key(|(ordinal, _, _)| *ordinal)
            .map(|(_, _, retained)| &retained.offer)
    }
    pub(crate) fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }
    pub(crate) fn storage_bytes(&self) -> Option<usize> {
        self.rows.values().try_fold(0usize, |n, record| {
            let offer = &record.offer;
            [
                offer.id.heap_bytes(),
                offer.offerer_id.heap_bytes(),
                offer.recipient_id.heap_bytes(),
                offer.lot().item_id.heap_bytes(),
                offer.lot().definition_pin.id.heap_bytes(),
                offer.lot().definition_pin.digest.heap_bytes(),
            ]
            .into_iter()
            .try_fold(n.checked_add(4096)?, |n, bytes| {
                n.checked_add(bytes?.checked_mul(6)?)
            })
        })
    }
}
fn remove_key<K: Ord>(index: &mut BTreeMap<K, BTreeSet<String>>, key: &K, id: &str) {
    if let Some(ids) = index.get_mut(key) {
        ids.remove(id);
        if ids.is_empty() {
            index.remove(key);
        }
    }
}
impl Serialize for GiftState {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(self.rows.len()))?;
        for (id, row) in &self.rows {
            map.serialize_entry(id, &row.offer)?;
        }
        map.end()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GiftOperation {
    Offer,
    Accept,
    Decline,
    Withdraw,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftSelection {
    pub item_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub quantity: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub placement_revision: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftIntent {
    pub handover_operation: GiftOperation,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub offered_items: Option<[GiftSelection; 1]>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub requested_items: Option<[(); 0]>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub offer_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_offer_revision: Option<u64>,
}
impl GiftIntent {
    pub fn valid(&self) -> bool {
        match self.handover_operation {
            GiftOperation::Offer => {
                self.offered_items.as_ref().is_some_and(|[item]| {
                    is_safe_record_id(&item.item_id)
                        && item.quantity > 0
                        && item.quantity <= MAX_SAFE_INTEGER
                }) && self.requested_items.is_some()
                    && self.offer_id.is_none()
                    && self.expected_offer_revision.is_none()
            }
            GiftOperation::Accept | GiftOperation::Decline | GiftOperation::Withdraw => {
                self.offered_items.is_none()
                    && self.requested_items.is_none()
                    && self.offer_id.as_deref().is_some_and(is_safe_record_id)
                    && self
                        .expected_offer_revision
                        .is_some_and(|revision| revision <= MAX_SAFE_INTEGER)
            }
        }
    }
    pub fn retained_text_bytes(&self) -> usize {
        self.offer_id.as_ref().map_or(0, String::capacity)
            + self
                .offered_items
                .as_ref()
                .map_or(0, |[lot]| lot.item_id.capacity())
    }
}

/// For gifts, a previous split/revision is allowed if equivalent unclaimed
/// units remain at the original directly accessible custodian.
pub(crate) fn usable_lot<'a>(
    state: &'a crate::simulation::SimulationState,
    actor: &str,
    id: &str,
    quantity: u64,
) -> Result<
    (
        &'a crate::state::Entity,
        &'a crate::install::ItemDefinitionRead,
    ),
    (&'static str, &'static str),
> {
    use crate::worlds::base_handover::GIFT_COPY as copy;
    let entities = &state.physical.entities;
    let body = entities.get(actor).and_then(|entity| entity.actor.as_ref());
    let entity = entities
        .get(id)
        .filter(|entity| {
            entity.container.is_none()
                && state.inventory.has_direct_item(entities, actor, entity)
                && matches!(
                    entity.placement,
                    Some(crate::state::Placement::Contained { .. })
                )
        })
        .ok_or(("item-unavailable", copy.own_possessions))?;
    let lot = entity
        .item
        .as_ref()
        .ok_or(("item-unavailable", copy.own_possessions))?;
    let definition = state
        .installed
        .retained
        .items
        .get(&lot.definition_pin.id)
        .filter(|definition| definition.pin == lot.definition_pin)
        .ok_or(("item-unavailable", copy.own_possessions))?;
    if !definition.portable {
        return Err(("not-portable", copy.not_portable));
    }
    if quantity != lot.quantity && !crate::execution::partitionable_stock(entity, definition) {
        return Err(("whole-object", copy.whole_object));
    }
    if !crate::execution::can_debit_lot(state, entity, quantity)
        || body
            .and_then(|body| body.action.as_ref())
            .is_some_and(|action| {
                action.item_id.as_deref() == Some(id)
                    || action.food_preparation.as_ref().is_some_and(|preparation| {
                        preparation.inputs.values().any(|input| input == id)
                    })
            })
    {
        return Err(("quantity", copy.quantity));
    }
    Ok((entity, definition))
}

pub(crate) fn gift_participant(
    state: &crate::simulation::SimulationState,
    entity: &crate::state::Entity,
) -> Result<bool, ExecutionError> {
    Ok(entity.actively_participates()
        && entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
        && state
            .installed
            .retained
            .item_handling_read
            .can_handle(&entity.spatial.body.id)
        && !state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "actions")?)
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftDescription {
    pub name: crate::text::JsText,
    pub description: crate::text::JsText,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftDescriptions {
    pub offered: [GiftDescription; 1],
    pub requested: [(); 0],
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftDisclosure {
    pub family: String,
    #[serde(flatten)]
    pub offer: GiftOffer,
    pub descriptions: GiftDescriptions,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cause: Option<String>,
}

/// Personally acquired terms from one accepted cut. The caller may borrow
/// their snapshots until this selection's separately admitted custody ends.
pub(crate) struct ReceivedGifts {
    pending: IndexMap<String, GiftDisclosure>,
    _custody: crate::host::ByteReservation,
}

impl ReceivedGifts {
    pub(crate) fn from_player(
        state: &crate::simulation::SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::at_time(state, actor, state.physical.header.sim_time, budget)
    }

    pub(crate) fn at_time(
        state: &crate::simulation::SimulationState,
        actor: &str,
        now: f64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        use crate::{experience::PersonalSourceKind, text::JsText};
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Body {
            event_data: Agreement,
        }
        #[derive(Deserialize)]
        struct Agreement {
            agreement: JsText,
        }
        let mut pending = IndexMap::new();
        let mut custody = budget.reserve(0)?;
        if let Some(collection) = state
            .experience
            .optional_collection(actor, PersonalSourceKind::Awareness)?
            && collection.may_have_current_trade_terms()?
        {
            let privacy = &state
                .experience
                .actor(actor)
                .ok_or(ExecutionError::Invariant)?
                .privacy;
            for record in collection.records() {
                let header = record.header();
                if !header.agreement_body
                    || header
                        .event_id
                        .as_ref()
                        .is_none_or(|id| privacy.revoked(id))
                {
                    continue;
                }
                if !header.personal_agreement {
                    if header
                        .event_type
                        .as_deref()
                        .is_some_and(|kind| state.installed.account_law().agreement_event(kind))
                    {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    continue;
                }
                // The account's original received record is the authority.
                // The hot world event and pending consent map grant no reads.
                let payload = parsed_agreement(record.payload(), budget)?;
                let Ok(body) = serde_json::from_str::<Body>(record.payload()) else {
                    return Err(ExecutionError::Invariant);
                };
                let raw = body
                    .event_data
                    .agreement
                    .as_unicode()
                    .ok_or(ExecutionError::Invariant)?;
                let bound = crate::experience::encoded_body_bound(raw)?;
                let mut retained = budget.reserve(bound)?;
                let gift: GiftDisclosure =
                    serde_json::from_str(raw).map_err(|_| ExecutionError::UnsupportedFamily)?;
                if gift.family != "item-offer"
                    || !gift.offer.party(actor)
                    || !gift.offer.valid_shape(header.at)
                {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                let state_matches = match gift.status.as_str() {
                    "pending" => {
                        if gift.cause.is_some() {
                            return Err(ExecutionError::Invariant);
                        }
                        gift.offer.expires_at > now
                    }
                    "ended" => false,
                    _ => return Err(ExecutionError::Invariant),
                };
                if state_matches {
                    retained.resize(gift.body_bytes().ok_or(ExecutionError::Capacity)?)?;
                    custody.merge(retained)?;
                    if let Some(removed) = pending.insert(gift.offer.id.clone(), gift) {
                        let released = removed.body_bytes().ok_or(ExecutionError::Capacity)?;
                        drop(removed);
                        custody.resize(
                            custody
                                .bytes()
                                .checked_sub(released)
                                .ok_or(ExecutionError::Invariant)?,
                        )?;
                    }
                } else {
                    if let Some(removed) = pending.shift_remove(&gift.offer.id) {
                        let released = removed.body_bytes().ok_or(ExecutionError::Capacity)?;
                        drop(removed);
                        custody.resize(
                            custody
                                .bytes()
                                .checked_sub(released)
                                .ok_or(ExecutionError::Invariant)?,
                        )?;
                    }
                }
                drop(payload);
            }
        }
        Ok(Self {
            pending,
            _custody: custody,
        })
    }

    pub(crate) fn find(&self, id: &str, revision: u64) -> Option<&GiftDisclosure> {
        self.pending
            .get(id)
            .filter(|value| value.offer.revision == revision)
    }

    pub(crate) fn contains_revision(&self, id: &str, revision: u64) -> bool {
        self.pending
            .get(id)
            .is_some_and(|value| value.offer.revision == revision)
    }

    pub(crate) fn with_party<'a>(
        &'a self,
        other: &'a str,
    ) -> impl Iterator<Item = &'a GiftDisclosure> {
        self.pending
            .values()
            .filter(move |gift| gift.offer.party(other))
    }
}

fn parsed_agreement(
    payload: &str,
    budget: &ByteBudget,
) -> Result<crate::host::ByteReservation, ExecutionError> {
    Ok(budget.reserve(crate::experience::encoded_body_bound(payload)?)?)
}

impl GiftDisclosure {
    fn body_bytes(&self) -> Option<usize> {
        let gift = &self.offer;
        let item = gift.lot();
        let description = &self.descriptions.offered[0];
        [
            &gift.id,
            &gift.id,
            &gift.offerer_id,
            &gift.recipient_id,
            &item.item_id,
            &item.definition_pin.id,
            &item.definition_pin.digest,
            &self.family,
            &self.status,
        ]
        .into_iter()
        .try_fold(std::mem::size_of::<Self>() * 3, |bytes, value| {
            bytes.checked_add(value.capacity())
        })?
        .checked_add(self.cause.heap_bytes()?)?
        .checked_add(description.name.heap_bytes()?)?
        .checked_add(description.description.heap_bytes()?)
    }
}

#[derive(Clone, PartialEq, Serialize)]
pub struct GiftHead {
    pub id: String,
    pub revision: u64,
}

/// A gift reader borrows only its own eligible stock and the other party's
/// explicitly received terms inside the same accepted publication lease.
pub struct GiftRead<'a> {
    pub counterpart: crate::capture::PlayerObservedBody<'a>,
    pub owned: &'a [GiftReadLot<'a>],
    pub offers: &'a [&'a GiftDisclosure],
}

pub struct GiftReadLot<'a> {
    pub item: crate::install::OwnedItem<'a>,
    pub description: Option<&'a crate::text::JsText>,
    pub whole: bool,
}
