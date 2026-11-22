//! Per-stream owned previous view and borrowed updates. Comparing a view
//! constructs no encoded JSON or outgoing full-view buffers.

use super::*;
use crate::{
    player_events::PublicEvent,
    player_scene::{EntityFields, ObservedEntity},
};
use openlegend_simulation::host::map_storage;
use serde::ser::SerializeMap;

mod fields;
use fields::{ClockChanges, PlayerChanges};

pub(crate) struct PreviousView {
    data: ViewOwned,
    can_use_inventory: bool,
}

pub(crate) enum ViewSelection<'a> {
    Unchanged,
    Reset,
    Patch(GamePatch<'a>),
}

impl PreparedPlayerView {
    /// Choose the wire packet from this stream's last handed-off view. Called
    /// only inside the current disclosure callback, before the wire encoder.
    pub(crate) fn select<'a>(
        &'a self,
        previous: Option<&'a PreviousView>,
        can_use_inventory: bool,
        budget: &ByteBudget,
    ) -> Result<ViewSelection<'a>, ViewError> {
        let Some(previous) = previous else {
            return Ok(ViewSelection::Reset);
        };
        let before = &previous.data;
        let after = &self.owned;
        // These sections have no patch lane in the existing browser protocol.
        // A changed observer or privacy epoch always needs a fresh full view.
        if !Arc::ptr_eq(&before.policy, &after.policy)
            || before.world_id != after.world_id
            || before.timeline != after.timeline
            || before.host.access != after.host.access
            || before.host.checkpoint != after.host.checkpoint
            || before.host.history.epoch != after.host.history.epoch
            || before.own.seed != after.own.seed
            || before.own.vision != after.own.vision
            || before.own.hearing != after.own.hearing
            || before.contacts.current_place_label != after.contacts.current_place_label
            || raw(before.host.presentation_release.as_ref())
                != raw(after.host.presentation_release.as_ref())
            || before.host.presentation_release_revision != after.host.presentation_release_revision
            || raw(before.host.maintenance.as_ref()) != raw(after.host.maintenance.as_ref())
        {
            return Ok(ViewSelection::Reset);
        }
        if after.host.revision < before.host.revision {
            return Err(ViewError::Changed);
        }
        if after.host.revision == before.host.revision {
            return if same_output(before, after, previous.can_use_inventory, can_use_inventory) {
                Ok(ViewSelection::Unchanged)
            } else {
                Err(ViewError::Changed)
            };
        }
        Ok(ViewSelection::Patch(GamePatch::build(
            before,
            after,
            previous.can_use_inventory,
            can_use_inventory,
            budget,
        )?))
    }

    /// Retain only the accepted decoded view after handoff. The potentially
    /// larger actor/event snapshot and its worker evidence are released here.
    pub(crate) fn into_previous(self, can_use_inventory: bool) -> PreviousView {
        PreviousView {
            data: self.owned,
            can_use_inventory,
        }
    }
}

fn same_output(
    before: &ViewOwned,
    after: &ViewOwned,
    old_inventory: bool,
    new_inventory: bool,
) -> bool {
    before.clock == after.clock
        && before.host.weather == after.host.weather
        && before.contacts.sight_confirmed_through == after.contacts.sight_confirmed_through
        && before.host.command_epoch == after.host.command_epoch
        && before.host.history.events_revision == after.host.history.events_revision
        && before.host.history.revision == after.host.history.revision
        && before.host.history.narrator == after.host.history.narrator
        && !PlayerChanges {
            before: before.player(old_inventory),
            after: after.player(new_inventory),
        }
        .changed()
        && before.contacts.entities == after.contacts.entities
        && before.own.communication_references == after.own.communication_references
        && same_recipes(&before.own, &after.own)
        && before.own.map_markers == after.own.map_markers
        && before.host.history.places_revision == after.host.history.places_revision
        && before.events.journal() == after.events.journal()
        && before.events.conversation() == after.events.conversation()
        && before.host.telemetry.ai == after.host.telemetry.ai
        && before.host.milestones == after.host.milestones
        && before.host.persistence == after.host.persistence
}

fn same_recipes(before: &PreparedSelf, after: &PreparedSelf) -> bool {
    before.recipes == after.recipes
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Removed {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    player: Vec<&'static str>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    clock: Vec<&'static str>,
}
#[derive(Serialize)]
struct EntityUpdate<'a> {
    id: &'a str,
    set: EntityFields<'a>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    remove: Vec<&'static str>,
}
#[derive(Serialize)]
struct EntityChanges<'a> {
    add: Vec<&'a ObservedEntity>,
    update: Vec<EntityUpdate<'a>>,
    remove: Vec<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    order: Option<Vec<&'a str>>,
}
#[derive(Serialize)]
struct EventChanges<'a> {
    upsert: Vec<&'a PublicEvent>,
    remove: Vec<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    order: Option<Vec<&'a str>>,
}

pub(crate) struct GamePatch<'a> {
    before: &'a ViewOwned,
    after: &'a ViewOwned,
    player: PlayerChanges<'a>,
    clock: ClockChanges<'a>,
    removed: Removed,
    entities: Option<EntityChanges<'a>>,
    events: Option<EventChanges<'a>>,
    _custody: ByteReservation,
}

impl<'a> GamePatch<'a> {
    fn build(
        before: &'a ViewOwned,
        after: &'a ViewOwned,
        old_inventory: bool,
        new_inventory: bool,
        budget: &ByteBudget,
    ) -> Result<Self, ViewError> {
        let contacts = before
            .contacts
            .entities
            .len()
            .checked_add(after.contacts.entities.len())
            .ok_or(ViewError::Capacity)?;
        let journal = before
            .events
            .journal()
            .len()
            .checked_add(after.events.journal().len())
            .ok_or(ViewError::Capacity)?;
        let indexes = map_storage::<&str, &ObservedEntity>(contacts)
            .and_then(|n| n.checked_mul(2))
            .and_then(|n| {
                n.checked_add(map_storage::<&str, &PublicEvent>(journal)?.checked_mul(2)?)
            })
            .ok_or(ViewError::Capacity)?;
        let reserve = contacts
            .checked_mul(768)
            .and_then(|n| n.checked_add(journal.checked_mul(128)?))
            .and_then(|n| n.checked_add(indexes))
            .and_then(|n| n.checked_add(4096))
            .ok_or(ViewError::Capacity)?;
        let custody = budget.reserve(reserve).map_err(|_| ViewError::Capacity)?;
        let player = PlayerChanges {
            before: before.player(old_inventory),
            after: after.player(new_inventory),
        };
        let clock = ClockChanges {
            before: before.calendar(),
            after: after.calendar(),
        };
        let removed = Removed {
            player: player.removed(),
            clock: clock.removed(),
        };
        Ok(Self {
            before,
            after,
            player,
            clock,
            removed,
            entities: entities(&before.contacts.entities, &after.contacts.entities),
            events: events(before.events.journal(), after.events.journal()),
            _custody: custody,
        })
    }
}

impl Serialize for GamePatch<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let Self { before, after, .. } = self;
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("schemaVersion", &3)?;
        map.serialize_entry("evaluationCut", &after.clock.seconds)?;
        map.serialize_entry("scope", &after.host.access.scope)?;
        map.serialize_entry("baseRevision", &before.host.revision)?;
        map.serialize_entry("revision", &after.host.revision)?;
        if before.contacts.sight_confirmed_through != after.contacts.sight_confirmed_through {
            map.serialize_entry(
                "sightConfirmedThrough",
                &after.contacts.sight_confirmed_through,
            )?;
        }
        if !self.removed.player.is_empty() || !self.removed.clock.is_empty() {
            map.serialize_entry("remove", &self.removed)?;
        }
        if before.own.communication_references != after.own.communication_references {
            map.serialize_entry(
                "communicationReferences",
                &after.own.communication_references,
            )?;
        }
        if !same_recipes(&before.own, &after.own) {
            map.serialize_entry("recipes", &after.own.recipes)?;
        }
        if before.host.command_epoch != after.host.command_epoch {
            map.serialize_entry("commandEpoch", &after.host.command_epoch)?;
        }
        if before.host.history.events_revision != after.host.history.events_revision {
            map.serialize_entry("worldEventsRevision", &after.host.history.events_revision)?;
        }
        if before.host.history.revision != after.host.history.revision {
            map.serialize_entry("historyRevision", &after.host.history.revision)?;
        }
        if before.host.history.narrator != after.host.history.narrator {
            map.serialize_entry("narrator", &after.host.history.narrator)?;
        }
        if self.clock.changed() {
            map.serialize_entry("clock", &self.clock)?;
        }
        if self.player.changed() {
            map.serialize_entry("player", &self.player)?;
        }
        if let Some(changes) = &self.entities {
            map.serialize_entry("entities", changes)?;
        }
        if let Some(changes) = &self.events {
            map.serialize_entry("events", changes)?;
        }
        if before.events.conversation() != after.events.conversation() {
            map.serialize_entry("conversation", after.events.conversation())?;
        }
        if before.host.telemetry.ai != after.host.telemetry.ai {
            map.serialize_entry("ai", &after.host.telemetry.ai)?;
        }
        if before.host.milestones != after.host.milestones {
            map.serialize_entry("milestones", &after.host.milestones)?;
        }
        if before.host.persistence != after.host.persistence {
            map.serialize_entry("persistence", &after.host.persistence)?;
        }
        if let Some(policy) = after.policy.world.cartography.as_ref()
            && (before.host.history.places_revision != after.host.history.places_revision
                || before.own.player.knowledge_revision != after.own.player.knowledge_revision
                || before.own.map_markers != after.own.map_markers)
        {
            map.serialize_entry("cartography", &after.cartography(policy))?;
        }
        map.end()
    }
}

fn entities<'a>(
    before: &'a [ObservedEntity],
    after: &'a [ObservedEntity],
) -> Option<EntityChanges<'a>> {
    let left: IndexMap<_, _> = before.iter().map(|row| (row.id(), row)).collect();
    let right: IndexMap<_, _> = after.iter().map(|row| (row.id(), row)).collect();
    let mut add = Vec::new();
    let mut update = Vec::new();
    for row in after {
        match left.get(row.id()) {
            None => add.push(row),
            Some(old) if *old != row => {
                let set = row.delta(old);
                update.push(EntityUpdate {
                    id: row.id(),
                    remove: set.removed(),
                    set,
                });
            }
            _ => {}
        }
    }
    let remove: Vec<_> = left
        .keys()
        .copied()
        .filter(|id| !right.contains_key(id))
        .collect();
    let order = (!left.keys().eq(right.keys())).then(|| right.keys().copied().collect());
    (!add.is_empty() || !update.is_empty() || !remove.is_empty() || order.is_some()).then_some(
        EntityChanges {
            add,
            update,
            remove,
            order,
        },
    )
}
fn events<'a>(before: &'a [PublicEvent], after: &'a [PublicEvent]) -> Option<EventChanges<'a>> {
    let left: IndexMap<_, _> = before.iter().map(|row| (row.id(), row)).collect();
    let right: IndexMap<_, _> = after.iter().map(|row| (row.id(), row)).collect();
    let upsert: Vec<_> = after
        .iter()
        .filter(|row| left.get(row.id()).copied() != Some(row))
        .collect();
    let remove: Vec<_> = left
        .keys()
        .copied()
        .filter(|id| !right.contains_key(id))
        .collect();
    let order = (!left.keys().eq(right.keys())).then(|| right.keys().copied().collect());
    (!upsert.is_empty() || !remove.is_empty() || order.is_some()).then_some(EventChanges {
        upsert,
        remove,
        order,
    })
}
fn raw(value: Option<&Arc<RawValue>>) -> Option<&str> {
    value.map(|value| value.get())
}
