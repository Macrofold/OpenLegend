//! Active consent is a single authoritative pending collection. Its indexes
//! contain only current participants, exact lots and the next deadline.
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

/// One atomic transfer uses the shared stock-operation envelope.
pub fn trade_lot_limit() -> usize {
    crate::stock_transfer::limits().moved_lots
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftLot {
    pub item_id: String,
    pub definition_pin: DefinitionPin,
    pub quantity: u64,
    pub whole: bool,
    pub revision: u64,
    pub placement_revision: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub capacity: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub contents_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub subtree_revision: Option<u64>,
}
impl GiftLot {
    /// Check the actual persisted offer shape before using its received terms.
    /// This confers no stock access. The command rechecks current ownership.
    pub fn valid_shape(&self) -> bool {
        is_safe_record_id(&self.item_id)
            && self.definition_pin.is_valid()
            && (1..=MAX_SAFE_INTEGER).contains(&self.quantity)
            && self.revision <= MAX_SAFE_INTEGER
            && self.placement_revision <= MAX_SAFE_INTEGER
            && self
                .capacity
                .is_none_or(|value| (1..=MAX_SAFE_INTEGER).contains(&value))
            && self
                .contents_revision
                .is_none_or(|value| value <= MAX_SAFE_INTEGER)
            && self
                .subtree_revision
                .is_none_or(|value| value <= MAX_SAFE_INTEGER)
    }

    fn is_loose_stock(&self) -> bool {
        self.capacity.is_none()
            && self.contents_revision.is_none()
            && self.subtree_revision.is_none()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GiftOffer {
    pub id: String,
    pub revision: u64,
    pub offerer_id: String,
    pub recipient_id: String,
    pub offered: Vec<GiftLot>,
    pub requested: Vec<GiftLot>,
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

    pub(crate) fn lots(&self) -> impl Iterator<Item = &GiftLot> + Clone {
        self.offered.iter().chain(&self.requested)
    }

    fn valid_shape(&self, at: f64) -> bool {
        [&self.id, &self.offerer_id, &self.recipient_id]
            .into_iter()
            .all(|id| is_safe_record_id(id))
            && self.offerer_id != self.recipient_id
            && (1..=MAX_SAFE_INTEGER).contains(&self.revision)
            && !self.offered.is_empty()
            && self.offered.len().saturating_add(self.requested.len())
                <= crate::stock_transfer::limits().moved_lots
            && self.lots().enumerate().all(|(position, lot)| {
                lot.valid_shape()
                    && self
                        .lots()
                        .take(position)
                        .all(|prior| prior.item_id != lot.item_id)
            })
            && self.created_at.is_finite()
            && self.created_at >= 0.0
            && self.created_at <= at
            && self.expires_at.is_finite()
            && self.expires_at > self.created_at
    }
}

pub(crate) struct RetainedGift {
    pub(crate) offer: GiftOffer,
    review_loose_stock: bool,
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
    review: BTreeSet<String>,
}
pub(crate) struct GiftUndo(GiftInverse);
enum GiftInverse {
    Row {
        id: String,
        prior: Option<(usize, Arc<RetainedGift>, bool)>,
        has_after: bool,
    },
    Review {
        id: String,
        was_requested: bool,
    },
}
impl GiftUndo {
    pub(crate) fn revert(self, state: &mut GiftState) -> Result<(), ExecutionError> {
        match self.0 {
            GiftInverse::Row {
                id,
                prior,
                has_after,
            } => {
                if state.rows.contains_key(&id) != has_after {
                    return Err(ExecutionError::Invariant);
                }
                if has_after {
                    state.remove(&id);
                }
                if let Some((ordinal, prior, review)) = prior {
                    state.insert(ordinal, prior);
                    if review {
                        state.review.insert(id);
                    }
                }
            }
            GiftInverse::Review { id, was_requested } => {
                if !state.rows.contains_key(&id) {
                    return Err(ExecutionError::Invariant);
                }
                if was_requested {
                    state.review.insert(id);
                } else {
                    state.review.remove(&id);
                }
            }
        }
        Ok(())
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
            review: BTreeSet::new(),
        };
        for (id, offer) in saved.into_iter().flatten() {
            if id != offer.id
                || !offer.valid_shape(at)
                || offer.expires_at < at
                || !entities
                    .get(&offer.offerer_id)
                    .is_some_and(|entity| entity.actor.is_some())
                || !entities
                    .get(&offer.recipient_id)
                    .is_some_and(|entity| entity.actor.is_some())
                || offer
                    .lots()
                    .any(|lot| state.lots.contains_key(&lot.item_id))
            {
                return Err(InstallError::CurrentFormat);
            }
            let row = Self::fund(offer, budget).map_err(|_| InstallError::Capacity)?;
            // A save can fall between a stock change and the next clock step.
            if row.review_loose_stock {
                state.review.insert(id);
            }
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
            if offer.expires_at > offer.created_at + policy.pending_seconds
                || offer.lots().any(|lot| {
                    !definitions
                        .items
                        .get(&lot.definition_pin.id)
                        .is_some_and(|definition| {
                            definition.pin == lot.definition_pin && definition.portable
                        })
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
        let capacity = Self::record_bytes(&offer).ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve_record(capacity)?;
        let review_loose_stock = offer.lots().all(GiftLot::is_loose_stock);
        Ok(Arc::new(RetainedGift {
            offer,
            review_loose_stock,
            _custody: custody,
        }))
    }
    fn record_bytes(offer: &GiftOffer) -> Option<usize> {
        let base = offer
            .id
            .capacity()
            .checked_add(offer.offerer_id.capacity())?
            .checked_add(offer.recipient_id.capacity())?
            .checked_mul(6)?
            .checked_add(2048)?
            .checked_add(offer.id.capacity())?
            .checked_add(crate::host::retained_size::tree_node_bound::<String, ()>()?)?;
        let slots = offer
            .offered
            .capacity()
            .checked_add(offer.requested.capacity())?;
        offer.lots().try_fold(
            base.checked_add(slots.checked_mul(std::mem::size_of::<GiftLot>())?)?,
            |size, lot| {
                let text = lot
                    .item_id
                    .capacity()
                    .checked_add(lot.definition_pin.id.capacity())?
                    .checked_add(lot.definition_pin.digest.capacity())?;
                size.checked_add(text.checked_mul(6)?)?.checked_add(256)
            },
        )
    }

    fn insert(&mut self, ordinal: usize, retained: Arc<RetainedGift>) {
        let offer = &retained.offer;
        let id = offer.id.clone();
        for lot in offer.lots() {
            self.lots.insert(lot.item_id.clone(), id.clone());
        }
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
    fn remove(&mut self, id: &str) -> Option<(usize, Arc<RetainedGift>, bool)> {
        let (ordinal, _, retained) = self.rows.shift_remove_full(id)?;
        let offer = &retained.offer;
        for lot in offer.lots() {
            self.lots.remove(&lot.item_id);
        }
        for actor in [&offer.offerer_id, &offer.recipient_id] {
            remove_key(&mut self.parties, actor, id);
        }
        remove_key(&mut self.deadlines, &Deadline::new(offer.expires_at), id);
        Some((ordinal, retained, self.review.remove(id)))
    }
    pub(crate) fn add(
        &mut self,
        offer: GiftOffer,
        budget: &ByteBudget,
    ) -> Result<GiftUndo, ExecutionError> {
        if self.rows.contains_key(&offer.id)
            || offer.lots().any(|lot| self.lots.contains_key(&lot.item_id))
        {
            return Err(ExecutionError::Invariant);
        }
        let id = offer.id.clone();
        let row = Self::fund(offer, budget)?;
        self.insert(self.rows.len(), row);
        Ok(GiftUndo(GiftInverse::Row {
            id,
            prior: None,
            has_after: true,
        }))
    }
    pub(crate) fn replace(
        &mut self,
        offer: GiftOffer,
        budget: &ByteBudget,
    ) -> Result<GiftUndo, ExecutionError> {
        if offer.lots().any(|lot| {
            self.lots
                .get(&lot.item_id)
                .is_some_and(|id| id != &offer.id)
        }) {
            return Err(ExecutionError::Invariant);
        }
        let id = offer.id.clone();
        let prepared = Self::fund(offer, budget)?;
        let prior = self.remove(&id).ok_or(ExecutionError::Invariant)?;
        self.insert(prior.0, prepared);
        Ok(GiftUndo(GiftInverse::Row {
            id,
            prior: Some(prior),
            has_after: true,
        }))
    }

    pub(crate) fn finish(&mut self, id: &str) -> Result<GiftUndo, ExecutionError> {
        let prior = self.remove(id).ok_or(ExecutionError::Invariant)?;
        Ok(GiftUndo(GiftInverse::Row {
            id: id.into(),
            prior: Some(prior),
            has_after: false,
        }))
    }
    pub(crate) fn get(&self, id: &str) -> Option<&GiftOffer> {
        self.retained(id).map(|row| &row.offer)
    }

    /// Share the already funded body with an ending that removes its index row.
    pub(crate) fn retained(&self, id: &str) -> Option<&Arc<RetainedGift>> {
        self.rows.get(id)
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
    pub(crate) fn review_pending(&self, id: &str) -> bool {
        self.review.contains(id)
    }

    pub(crate) fn can_queue_review(&self, id: &str) -> bool {
        self.rows.get(id).is_some_and(|row| row.review_loose_stock) && !self.review_pending(id)
    }

    /// The row already funds one review key for its entire pending lifetime.
    pub(crate) fn queue_review(&mut self, id: String) -> Result<GiftUndo, ExecutionError> {
        if !self.can_queue_review(&id) {
            return Err(ExecutionError::Invariant);
        }
        let undo = GiftUndo(GiftInverse::Review {
            id: id.clone(),
            was_requested: false,
        });
        self.review.insert(id);
        Ok(undo)
    }

    pub(crate) fn take_review(&mut self, id: &str) -> Option<GiftUndo> {
        self.review.take(id).map(|id| {
            GiftUndo(GiftInverse::Review {
                id,
                was_requested: true,
            })
        })
    }

    pub(crate) fn review_ids(&self) -> impl Iterator<Item = (usize, &str)> {
        self.review
            .iter()
            .filter_map(|id| self.rows.get_index_of(id).map(|order| (order, id.as_str())))
    }

    pub(crate) fn next_deadline(&self) -> Option<f64> {
        self.deadlines
            .first_key_value()
            .map(|(at, _)| f64::from_bits(at.0))
    }
    pub(crate) fn next_due(&self, at: f64) -> Option<&Arc<RetainedGift>> {
        let (_, ids) = self.deadlines.range(..=Deadline::new(at)).next()?;
        // Simultaneous deadlines keep the same ordinary offer order, which
        // the changed world row and rollback entries already preserve.
        ids.iter()
            .filter_map(|id| self.rows.get_full(id))
            .min_by_key(|(ordinal, _, _)| *ordinal)
            .map(|(_, _, retained)| retained)
    }
    pub(crate) fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }
    pub(crate) fn storage_bytes(&self) -> Option<usize> {
        self.rows.values().try_fold(0usize, |bytes, record| {
            bytes
                .checked_add(Self::record_bytes(&record.offer)?)?
                .checked_add(2048)
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
    Counter,
    Accept,
    Decline,
    Withdraw,
}

impl GiftOperation {
    pub fn proposes(self) -> bool {
        matches!(self, Self::Offer | Self::Counter)
    }
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
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_contents_revision: Option<u64>,
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
    pub offered_items: Option<Vec<GiftSelection>>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub requested_items: Option<Vec<GiftSelection>>,
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
        let prior = self.offer_id.as_deref().is_some_and(is_safe_record_id)
            && self
                .expected_offer_revision
                .is_some_and(|revision| revision <= MAX_SAFE_INTEGER);
        if self.handover_operation.proposes() {
            let Some((offered, requested)) = self
                .offered_items
                .as_ref()
                .zip(self.requested_items.as_ref())
            else {
                return false;
            };
            let terms = offered.iter().chain(requested);
            !offered.is_empty()
                && offered.len().saturating_add(requested.len())
                    <= crate::stock_transfer::limits().moved_lots
                && terms.clone().enumerate().all(|(position, item)| {
                    is_safe_record_id(&item.item_id)
                        && (1..=MAX_SAFE_INTEGER).contains(&item.quantity)
                        && terms
                            .clone()
                            .take(position)
                            .all(|prior| prior.item_id != item.item_id)
                })
                && if self.handover_operation == GiftOperation::Counter {
                    prior
                } else {
                    self.offer_id.is_none() && self.expected_offer_revision.is_none()
                }
        } else {
            self.offered_items.is_none() && self.requested_items.is_none() && prior
        }
    }

    pub fn retained_text_bytes(&self) -> usize {
        let terms = [&self.offered_items, &self.requested_items]
            .into_iter()
            .flatten()
            .map(|items| {
                items.capacity() * std::mem::size_of::<GiftSelection>()
                    + items
                        .iter()
                        .map(|item| item.item_id.capacity())
                        .sum::<usize>()
            })
            .sum::<usize>();
        terms + self.offer_id.as_ref().map_or(0, String::capacity)
    }
}

/// An exact received barter lot from the original participant's retained
/// awareness. The command must still validate current source and custody.
pub struct ReceivedTradeTerm {
    pub source: crate::experience::PersonalSourceRef,
    pub lot: GiftLot,
}

pub struct TradeEvidence {
    world: String,
    actor: String,
    counterpart: String,
    generation: String,
    privacy_revision: u64,
    terms: Vec<ReceivedTradeTerm>,
    _custody: crate::host::ByteReservation,
}

impl TradeEvidence {
    /// Move the admitted command terms and their reservation from the exact
    /// read. Reserve only the added scope and shared command owner here.
    pub fn admit(
        world: &str,
        actor: &str,
        counterpart: &str,
        generation: &str,
        privacy_revision: u64,
        terms: Vec<ReceivedTradeTerm>,
        mut custody: crate::host::ByteReservation,
    ) -> Result<Self, crate::host::CapacityError> {
        use crate::host::CapacityError;

        let fixed = [
            world.len(),
            actor.len(),
            counterpart.len(),
            generation.len(),
        ]
        .into_iter()
        .try_fold(256usize, usize::checked_add)
        .ok_or(CapacityError)?;
        custody.resize(custody.bytes().checked_add(fixed).ok_or(CapacityError)?)?;
        let world = world.to_owned();
        let actor = actor.to_owned();
        let counterpart = counterpart.to_owned();
        let generation = generation.to_owned();
        Ok(Self {
            world,
            actor,
            counterpart,
            generation,
            privacy_revision,
            terms,
            _custody: custody,
        })
    }

    pub(crate) fn current(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        counterpart: &str,
    ) -> bool {
        self.actor == actor
            && self.counterpart == counterpart
            && self.world == state.physical.header.id
            && state.experience.personal_references_current(
                &self.generation,
                actor,
                self.privacy_revision,
                self.terms.iter().map(|term| &term.source),
            )
    }

    pub(crate) fn lot(&self, id: &str) -> Option<&GiftLot> {
        self.terms
            .iter()
            .find(|term| term.lot.item_id == id)
            .map(|term| &term.lot)
    }
}

/// Read-only admission for a proposal. The source's pending offers are the
/// same for a whole recipient page. No recipient's stock is consulted.
pub(crate) struct ProposalWindow<'a> {
    pending: &'a GiftState,
    owner: &'a str,
    previous: Option<&'a str>,
    at: f64,
    outgoing_full: bool,
}

impl<'a> ProposalWindow<'a> {
    pub(crate) fn new(
        state: &'a crate::simulation::SimulationState,
        owner: &'a str,
        previous: Option<&'a GiftOffer>,
        policy: &crate::install::SocialOfferReadPolicy,
    ) -> Self {
        let pending = &state.physical.gifts;
        let previous = previous.map(|offer| offer.id.as_str());
        let at = state.physical.header.sim_time;
        let outgoing = pending.for_actor(owner).filter(|offer| {
            offer.expires_at > at && Some(offer.id.as_str()) != previous && offer.offerer_id == owner
        }).count();
        Self { pending, owner, previous, at, outgoing_full: outgoing as u64 >= policy.outgoing }
    }

    pub(crate) fn item_busy(&self, id: &str) -> bool {
        self.pending.for_item(id).is_some_and(|offer| Some(offer.id.as_str()) != self.previous)
    }

    pub(crate) fn recipient_problem<'b>(
        &self,
        recipient: &str,
        policy: &'b crate::install::SocialOfferReadPolicy,
    ) -> Option<(&'static str, &'b crate::text::JsText)> {
        let current = |offer: &&GiftOffer| {
            offer.expires_at > self.at && Some(offer.id.as_str()) != self.previous
        };
        if self.outgoing_full {
            return Some(("too-many-outgoing", &policy.messages.outgoing));
        }
        let incoming = self.pending.for_actor(recipient).filter(current)
            .filter(|offer| offer.recipient_id == recipient).count();
        if incoming as u64 >= policy.incoming {
            return Some(("too-many-incoming", &policy.messages.incoming));
        }
        if policy.one_pending_per_pair
            && self.pending.for_actor(self.owner).filter(current).any(|offer| offer.party(recipient))
        {
            return Some(("offer-pending", &policy.messages.pair));
        }
        None
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

pub(crate) fn prepare_loose_lot(
    state: &crate::simulation::SimulationState,
    owner: &str,
    selection: &GiftSelection,
) -> Result<GiftLot, (&'static str, &'static str)> {
    use crate::worlds::base_handover::GIFT_COPY as copy;
    let (entity, definition) = usable_lot(state, owner, &selection.item_id, selection.quantity)?;
    let item = entity
        .item
        .as_ref()
        .ok_or(("item-unavailable", copy.own_possessions))?;
    let Some(crate::state::Placement::Contained { revision, .. }) = &entity.placement else {
        return Err(("item-unavailable", copy.own_possessions));
    };
    if selection
        .expected_revision
        .is_some_and(|version| version != item.revision)
        || selection
            .placement_revision
            .is_some_and(|version| version != *revision)
        || selection.expected_contents_revision.is_some()
    {
        return Err(("stale", copy.review_item));
    }
    Ok(GiftLot {
        item_id: selection.item_id.clone(),
        definition_pin: item.definition_pin.clone(),
        quantity: selection.quantity,
        whole: !crate::execution::partitionable_stock(entity, definition),
        revision: item.revision,
        placement_revision: *revision,
        capacity: None,
        contents_revision: None,
        subtree_revision: None,
    })
}

pub(crate) fn loose_lot_current(
    state: &crate::simulation::SimulationState,
    owner: &str,
    lot: &GiftLot,
    exact: bool,
) -> bool {
    usable_lot(state, owner, &lot.item_id, lot.quantity).is_ok_and(|(entity, definition)| {
        definition.pin == lot.definition_pin
            && (!exact || entity.item.as_ref().is_some_and(|item| item.revision == lot.revision)
                && matches!(&entity.placement, Some(crate::state::Placement::Contained { revision, .. }) if *revision == lot.placement_revision))
            && lot.is_loose_stock()
    })
}

pub(crate) fn loose_offer_current(
    state: &crate::simulation::SimulationState,
    offer: &GiftOffer,
) -> bool {
    let exact = !offer.requested.is_empty();
    offer
        .offered
        .iter()
        .all(|lot| loose_lot_current(state, &offer.offerer_id, lot, exact))
        && offer
            .requested
            .iter()
            .all(|lot| loose_lot_current(state, &offer.recipient_id, lot, true))
}

fn gift_able(entity: &crate::state::Entity) -> bool {
    entity.actively_participates()
        && entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
}

/// Ongoing consent uses actor life and stock custody. A temporary action
/// restriction such as sleep prevents a new command without ending an offer.
pub(crate) fn loose_offer_still_held(
    state: &crate::simulation::SimulationState,
    offer: &GiftOffer,
) -> bool {
    let able = |id: &str, holder: bool| {
        state.physical.entities.get(id).is_some_and(|entity| {
            gift_able(entity)
                && (!holder
                    || state
                        .installed
                        .retained
                        .item_handling_read
                        .can_handle(&entity.spatial.body.id))
        })
    };
    able(&offer.offerer_id, true)
        && able(&offer.recipient_id, !offer.requested.is_empty())
        && loose_offer_current(state, offer)
}

pub(crate) fn gift_participant(
    state: &crate::simulation::SimulationState,
    entity: &crate::state::Entity,
) -> Result<bool, ExecutionError> {
    Ok(gift_able(entity)
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
    pub offered: Vec<GiftDescription>,
    pub requested: Vec<GiftDescription>,
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

/// The item consent writer owns these events; other personal agreements still
/// need their own semantic reader before an NPC can use their terms.
pub(crate) fn item_agreement_event(kind: &str) -> bool {
    matches!(
        kind,
        "item-offered"
            | "offer-accepted"
            | "offer-declined"
            | "offer-withdrawn"
            | "offer-own-ending"
            | "offer-expired"
            | "offer-lapsed"
    )
}

struct ReceivedGift {
    disclosure: GiftDisclosure,
    original: Arc<crate::experience::PersonalSourceRecord>,
}

impl ReceivedGift {
    fn body_bytes(&self) -> Option<usize> {
        self.disclosure.body_bytes()?
            .checked_add(size_of::<Arc<crate::experience::PersonalSourceRecord>>())
    }
}

/// An issued direct reply retains the exact received terms and offerer.
/// The model sees its choice alias and wording without either private ID.
#[derive(Clone)]
pub(crate) struct GiftReply {
    pub offerer: String,
    pub id: String,
    pub revision: u64,
    pub accept: bool,
    reference: crate::experience::PersonalSourceRef,
}

crate::host::retained_size::heap_record!(GiftReply { offerer, id, reference });

impl GiftReply {
    fn matches(&self, received: &ReceivedGifts) -> bool {
        received.pending.get(&self.id).is_some_and(|record| {
            record.disclosure.offer.revision == self.revision
                && record.original.header().reference == self.reference
        })
    }

    /// Recheck all actually disclosed replies against one current personal
    /// read. Objective consent state cannot reveal an unobserved ending.
    pub(crate) fn choices_current<'a>(
        state: &crate::simulation::SimulationState,
        actor: &str,
        mut choices: impl Iterator<Item = &'a Self>,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(first) = choices.next() else { return Ok(true); };
        let received = ReceivedGifts::from_player(state, actor, budget)?;
        Ok(first.matches(&received) && choices.all(|choice| choice.matches(&received)))
    }

    /// Reuse the exact personal source fence after the provider wait. The
    /// consent writer itself rechecks the latest received and actual terms.
    pub(crate) fn source_current(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
    ) -> bool {
        let Some(person) = state.experience.actor(actor) else {
            return false;
        };
        state.experience
            .optional_collection(actor, self.reference.kind)
            .ok()
            .flatten()
            .and_then(|collection| collection.resident_record(&self.reference.id))
            .is_some_and(|record| {
                let original = record.header();
                original.reference == self.reference
                    && original.event_id.as_deref().is_some_and(|event| !person.privacy.revoked(event))
            })
    }
}

/// Personally acquired terms from one accepted cut. The caller may borrow
/// their snapshots until this selection's separately admitted custody ends.
pub(crate) struct ReceivedGifts {
    pending: IndexMap<String, ReceivedGift>,
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
                // The stand-alone travel projection owns this authored
                // notice family. Gift terms still require the original
                // separately admitted item agreement below.
                if state.installed.travel
                    && header.event_type.as_deref()
                        == Some(
                            state
                                .installed
                                .ordinary_actions
                                .value()
                                .travel
                                .event_type
                                .as_str(),
                        )
                {
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
                    || gift.descriptions.offered.len() != gift.offer.offered.len()
                    || gift.descriptions.requested.len() != gift.offer.requested.len()
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
                    let gift = ReceivedGift { disclosure: gift, original: Arc::clone(record) };
                    retained.resize(gift.body_bytes().ok_or(ExecutionError::Capacity)?)?;
                    let id = gift.disclosure.offer.id.clone();
                    custody.merge(retained)?;
                    if let Some(removed) = pending.insert(id, gift) {
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
            .map(|record| &record.disclosure)
            .filter(|value| value.offer.revision == revision)
    }

    pub(crate) fn contains_revision(&self, id: &str, revision: u64) -> bool {
        self.find(id, revision).is_some()
    }

    pub(crate) fn with_party<'a>(
        &'a self,
        other: &'a str,
    ) -> impl Iterator<Item = &'a GiftDisclosure> {
        self.pending
            .values()
            .map(|record| &record.disclosure)
            .filter(move |gift| gift.offer.party(other))
    }

    /// The ordinary NPC menu grants replies only to the actual recipient of
    /// loose one-way gifts. It never consults private physical consent state.
    pub(crate) fn npc_incoming<'a>(
        &'a self,
        actor: &'a str,
    ) -> impl Iterator<Item = (&'a GiftDisclosure, &'a crate::experience::PersonalSourceRef)> {
        self.pending.values().filter_map(move |record| {
            let gift = &record.disclosure;
            (gift.offer.recipient_id == actor
                && gift.offer.requested.is_empty()
                && gift.offer.offered.iter().all(GiftLot::is_loose_stock))
            .then_some((gift, &record.original.header().reference))
        })
    }
}

impl GiftReply {
    /// Hold exact issued terms without duplicating their descriptions or stock.
    pub(crate) fn prepare(
        gift: &GiftDisclosure,
        reference: &crate::experience::PersonalSourceRef,
        accept: bool,
        budget: &ByteBudget,
    ) -> Result<(Self, crate::host::ByteReservation), ExecutionError> {
        let bytes = reference
            .heap_bytes()
            .and_then(|n| n.checked_add(gift.offer.id.len()))
            .and_then(|n| n.checked_add(gift.offer.offerer_id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(bytes)?;
        Ok((Self {
            offerer: gift.offer.offerer_id.clone(),
            id: gift.offer.id.clone(),
            revision: gift.offer.revision,
            accept,
            reference: reference.clone(),
        }, custody))
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
        let rows = gift
            .offered
            .capacity()
            .checked_add(gift.requested.capacity())?;
        let descriptions = self
            .descriptions
            .offered
            .capacity()
            .checked_add(self.descriptions.requested.capacity())?;
        let base = std::mem::size_of::<Self>()
            .checked_add(self.family.capacity())?
            .checked_add(self.status.capacity())?
            .checked_add(self.cause.heap_bytes()?)?
            .checked_add(gift.id.capacity().checked_mul(2)?)?
            .checked_add(gift.offerer_id.capacity())?
            .checked_add(gift.recipient_id.capacity())?
            .checked_add(rows.checked_mul(std::mem::size_of::<GiftLot>())?)?
            .checked_add(descriptions.checked_mul(std::mem::size_of::<GiftDescription>())?)?;
        let lot_bytes = gift.lots().try_fold(base, |bytes, lot| {
            bytes
                .checked_add(lot.item_id.capacity())?
                .checked_add(lot.definition_pin.id.capacity())?
                .checked_add(lot.definition_pin.digest.capacity())
        })?;
        self.descriptions
            .offered
            .iter()
            .chain(&self.descriptions.requested)
            .try_fold(lot_bytes, |bytes, description| {
                bytes
                    .checked_add(description.name.heap_bytes()?)?
                    .checked_add(description.description.heap_bytes()?)
            })
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
    pub offers: &'a [GiftReadOffer<'a>],
}

pub struct GiftReadOffer<'a> {
    pub disclosed: &'a GiftDisclosure,
    pub can_accept: bool,
}

pub struct GiftReadLot<'a> {
    pub item: crate::install::OwnedItem<'a>,
    pub description: Option<&'a crate::text::JsText>,
    pub whole: bool,
}
