//! Only fields the existing patch consumer replaces. Required fields retain
//! their null values and a vanished optional field enters the removal list.

use super::*;
use crate::player_scene::delta::{fields, removed};

pub(super) struct PlayerChanges<'a> {
    pub(super) before: PlayerWire<'a>,
    pub(super) after: PlayerWire<'a>,
}

impl PlayerChanges<'_> {
    pub(super) fn changed(&self) -> bool {
        let Self { before, after } = self;
        before.body != after.body
            || before.outings != after.outings
            || before.memory_revision != after.memory_revision
            || before.history != after.history
            || before.inventory_read_revision != after.inventory_read_revision
            || before.input_scope != after.input_scope
            || before.steering_profile != after.steering_profile
            || before.steering_progress != after.steering_progress
            || before.can_use_inventory != after.can_use_inventory
            || before.controls != after.controls
    }
    pub(super) fn removed(&self) -> Vec<&'static str> {
        let Self { before, after } = self;
        let mut output = after.body.delta(before.body).removed();
        output.extend(removed!(before,after;
            "history"=>history,"inputScope"=>input_scope,
            "steeringProfile"=>steering_profile,"steeringProgress"=>steering_progress
        ));
        output
    }
}

impl Serialize for PlayerChanges<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let Self { before, after } = self;
        let mut map = serializer.serialize_map(None)?;
        after.body.delta(before.body).entries(&mut map)?;
        fields!(map,before,after;required {
          "memoryRevision"=>memory_revision,"inventoryReadRevision"=>inventory_read_revision,
          "canUseInventory"=>can_use_inventory,"controls"=>controls,"outings"=>outings,
        } optional {
          "history"=>history,"inputScope"=>input_scope,
          "steeringProfile"=>steering_profile,"steeringProgress"=>steering_progress,
        });
        map.end()
    }
}

pub(super) struct ClockChanges<'a> {
    pub(super) before: CalendarView<'a>,
    pub(super) after: CalendarView<'a>,
}

impl ClockChanges<'_> {
    pub(super) fn changed(&self) -> bool {
        self.before.current != self.after.current || self.before.weather != self.after.weather
    }
    pub(super) fn removed(&self) -> Vec<&'static str> {
        let Self { before, after } = self;
        removed!(before,after;"weather"=>weather)
    }
}

impl Serialize for ClockChanges<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let Self { before, after } = self;
        let mut map = serializer.serialize_map(None)?;
        fields!(map,before,after;required {
          "seconds"=>current.seconds,"day"=>current.day,"hour"=>current.hour,"speed"=>current.speed,
          "baseRatio"=>current.base_ratio,"paused"=>current.paused,"pauseReason"=>current.pause_reason,
          "preparingNavigation"=>current.preparing_navigation,
        } optional {});
        if self.before.weather != self.after.weather
            && let Some(weather) = self.after.weather
        {
            map.serialize_entry("weather", weather)?;
        }
        map.end()
    }
}
