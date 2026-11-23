//! Pickup reads exposed detail or the exact current inspection page. The same
//! read binds a menu and its later command without granting new observation.
use super::*;
use crate::{
    capture::PlayerObservedBody,
    execution::ExecutionError,
    ground_items::{GroundLot, inspection::WorldStorage, pickup_contents, pickup_lot, pickup_pile},
    reception::{ObservedPileItem, SensoryFacet},
    simulation::SimulationState,
    state::{Entity, InventoryInspection},
    text::JsText,
};

pub(super) struct PickupRead<'a> {
    state: &'a SimulationState,
    actor: &'a Entity,
    pile: &'a Entity,
    observed: &'a [ObservedPileItem],
    inspected: Option<&'a InventoryInspection>,
}

impl<'a> PickupRead<'a> {
    pub(super) fn current(
        state: &'a SimulationState,
        actor_id: &str,
        contact: &PlayerObservedBody<'a>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, RuntimeError> {
        let Some(actor) = state.physical.entities.get(actor_id) else {
            return Ok(None);
        };
        let Some(pile) = pickup_pile(state, actor, contact.source_id) else {
            return Ok(None);
        };
        let observed = contact
            .facets()
            .find_map(|facet| match &facet.value {
                SensoryFacet::PileContents { items } => Some(items.as_slice()),
                _ => None,
            })
            .unwrap_or_default();
        let inspected = actor
            .actor
            .as_ref()
            .and_then(|body| body.inventory_inspection.as_ref())
            .and_then(|page| page.container_id.as_deref())
            .filter(|id| *id == pile.id)
            .and_then(|id| WorldStorage::selected(state, actor_id, id))
            .filter(|page| world_storage::observed_storage_matches(page, contact))
            .map(|page| page.inspection(budget))
            .transpose()
            .map_err(|error| match error {
                ExecutionError::Capacity => RuntimeError::from(CapacityError),
                other => failure(other),
            })?
            .flatten();
        Ok(
            (!observed.is_empty() || inspected.is_some()).then_some(Self {
                state,
                actor,
                pile,
                observed,
                inspected,
            }),
        )
    }

    fn observed_name(&self, lot: &GroundLot<'_>) -> Option<&'a JsText> {
        self.observed
            .iter()
            .find(|fact| Self::same_lot(fact, lot))
            .map(|fact| &fact.name)
    }

    fn same_lot(fact: &ObservedPileItem, lot: &GroundLot<'_>) -> bool {
        fact.portable
            && fact.id == lot.entity.id
            && fact.definition_id == lot.definition.pin.id
            && fact.quantity == lot.lot.quantity as f64
    }

    fn inspected_members(&self) -> impl Iterator<Item = (&'a String, &'a JsText)> {
        self.inspected.into_iter().flat_map(|page| {
            page.item_ids
                .iter()
                .zip(page.item_names.iter().map(|name| &name.name))
        })
    }

    fn lots(&self) -> impl Iterator<Item = RuntimePickupLot<'a>> + '_ {
        let named_lot = |lot: GroundLot<'a>, name| RuntimePickupLot {
            id: &lot.entity.id,
            name,
            quantity: lot.lot.quantity,
            partial_limit: lot.partial_limit(),
        };
        let observed = self.observed.iter().filter_map(move |fact| {
            let lot = pickup_lot(self.state, self.pile, &fact.id)?;
            Self::same_lot(fact, &lot).then(|| named_lot(lot, &fact.name))
        });
        let inspected = self.inspected_members().filter_map(move |(id, name)| {
            let lot = pickup_lot(self.state, self.pile, id)?;
            self.observed_name(&lot)
                .is_none()
                .then(|| named_lot(lot, name))
        });
        observed.chain(inspected)
    }

    fn allows_all(&self, known: usize) -> bool {
        // A selected page may expose only some direct stock. The whole-pile
        // action can move more than those displayed members, so require that
        // current permitted choices cover every portable member before offering it.
        known != 0
            && pickup_contents(self.state, self.pile)
                .take(known + 1)
                .count()
                == known
    }

    pub(super) fn allows(&self, item: Option<&str>) -> bool {
        if let Some(id) = item {
            return pickup_lot(self.state, self.pile, id).is_some()
                && (self
                    .observed
                    .iter()
                    .any(|fact| fact.portable && fact.id == id)
                    || self.inspected_members().any(|(known, _)| known == id));
        }
        self.allows_all(self.lots().count())
    }

    pub(super) fn render<T>(
        &self,
        budget: &ByteBudget,
        encode: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        let maximum = self.observed.len() + self.inspected.map_or(0, |page| page.item_ids.len());
        let _items = budget.reserve(
            maximum
                .checked_mul(size_of::<RuntimePickupLot>())
                .ok_or(CapacityError)?,
        )?;
        let mut items = Vec::with_capacity(maximum);
        items.extend(self.lots());
        // Detail and a page normally agree. Restore direct inventory order
        // when the page contributes a current member missing from older detail.
        if self.inspected.is_some() && !self.observed.is_empty() {
            items.sort_unstable_by(|left, right| crate::encoding::js_string_cmp(left.id, right.id));
        }
        let policy = &self.state.installed.retained.item_handling_read;
        let reason = crate::consumption::action_problem(
            &self.state.installed,
            self.actor,
            self.state.physical.header.paused,
        )
        .map_err(failure)?
        .map(|blocked| blocked.message.as_str());
        encode(RuntimeResourceOffer::Pickup(RuntimePickupOffer {
            label: &policy.pickup_label,
            all_label: &policy.pickup_all_label,
            all_description: &policy.pickup_all_description,
            all_available: items.len() > 1 && self.allows_all(items.len()),
            reason,
            items: &items,
            sequence: self.state.physical.header.sequence,
        }))
    }
}
