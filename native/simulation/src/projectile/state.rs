use crate::body::ProjectileContact;
use super::passages::{NearPassages, TABLE};
use crate::execution::ExecutionError;
use crate::experience::EmptyChildOwner;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::install::{InstallError, RowImport, WorldChildren, reserve_typed_parse, rows};
use crate::state::{EntityStore, Point};
use crate::text::JsText;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_present_safe_integer,
    deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::mem::size_of;
use super::ProjectileCrossings;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct FlightPosition {
    pub position: Point,
    pub advanced_at: f64,
    pub remaining_range: f64,
    pub source_exited: bool,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ContactPolicy {
    // An explicitly selected stop-only contact without a body policy has a
    // canonical null pin. A missing field is an invalid current flight.
    #[serde(deserialize_with = "Option::deserialize")]
    pub pin: Option<DefinitionPin>,
    pub response: ProjectileContact,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum SourceController {
    Player,
    Npc,
    Native,
}

impl SourceController {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Player => "player",
            Self::Npc => "npc",
            Self::Native => "native",
        }
    }
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProjectileFlight {
    pub id: String,
    pub action_id: String,
    pub source_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub source_life: u64,
    pub source_controller: SourceController,
    pub contact_policy: ContactPolicy,
    pub source_exited: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_life: Option<u64>,
    pub practice: bool,
    pub requires_lethal_review: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    lethal_permission: Option<Box<crate::contact::StrikePermission>>,
    pub attack_digest: JsText,
    pub tool: DefinitionPin,
    pub ammunition: DefinitionPin,
    pub position: Point,
    pub direction: Point,
    pub launched_at: f64,
    pub advanced_at: f64,
    pub speed: f64,
    pub remaining_range: f64,
    pub injury: f64,
    pub handling: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) execution: Option<Box<crate::attack_execution::AttackExecutionEvidence>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    near_pass_observed_lives: Option<EmptyChildOwner>,
    #[serde(
        default,
        deserialize_with = "super::crossing::deserialize_present",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) encounters: Option<ProjectileCrossings>,
}

impl ProjectileFlight {
    pub(crate) fn from_action(
        source: &crate::state::Entity,
        action: &crate::state::Action,
        reviewed: Option<&crate::contact::StrikePermission>,
        target: Option<(&str, u64)>,
        policy: ContactPolicy,
        digest: JsText,
        line: crate::geometry::SightRay,
        at: f64,
        weapon: &super::RangedWeapon,
        injury: f64,
        handling: f64,
    ) -> Result<Self, ExecutionError> {
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let practice = action.is_practice_shot();
        let source_controller = match source.actor.as_ref().map(|actor| actor.controller.as_str()) {
            Some("player") => SourceController::Player,
            Some("npc") => SourceController::Npc,
            Some("native") => SourceController::Native,
            _ => return Err(ExecutionError::MissingActor),
        };
        let position = source
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let body = source.ordinary_body_profile();
        let length = crate::spatial::distance(line.from, line.to);
        if length <= 1e-12 || !length.is_finite() {
            return Err(ExecutionError::InvalidPosition);
        }
        let direction = Point {
            x: (line.to.x - line.from.x) / length,
            y: (line.to.y - line.from.y) / length,
            z: (line.to.z - line.from.z) / length,
        };
        let source_exited = crate::spatial::moving_point_contact(
            line.from,
            line.from,
            position,
            position,
            body.into(),
        )
        .is_none();
        Ok(Self {
            id: String::new(),
            action_id: action.id.clone(),
            source_id: source.id.clone(),
            source_life: aim.source_life,
            source_controller,
            contact_policy: policy,
            source_exited,
            target_id: target.map(|(id, _)| id.to_owned()),
            target_life: target.filter(|_| !practice).map(|(_, life)| life),
            practice,
            requires_lethal_review: action.requires_lethal_review.unwrap_or(false)
                || source_controller == SourceController::Player,
            lethal_permission: reviewed
                .map(|permission| Box::new(permission.clone()))
                .or_else(|| action.lethal_permission.clone()),
            attack_digest: digest,
            tool: aim.tool.clone(),
            ammunition: aim.ammunition.clone(),
            position: line.from,
            direction,
            launched_at: at,
            advanced_at: at,
            speed: weapon.flight_speed,
            remaining_range: weapon.range,
            injury,
            handling,
            execution: None,
            near_pass_observed_lives: None,
            encounters: None,
        })
    }

    pub(crate) fn has_passages(&self) -> bool {
        self.near_pass_observed_lives.is_some()
    }

    pub(crate) fn set_passages(&mut self, present: bool) {
        self.near_pass_observed_lives = present.then_some(EmptyChildOwner {});
    }

    fn validate(&self, at: f64) -> Result<(), InstallError> {
        let length = [self.direction.x, self.direction.y, self.direction.z]
            .into_iter()
            .map(|axis| axis * axis)
            .sum::<f64>()
            .sqrt();
        if ![&self.id, &self.action_id, &self.source_id]
            .into_iter()
            .all(|id| is_safe_record_id(id))
            || self
                .target_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
            || self.target_life.is_some() != (!self.practice && self.target_id.is_some())
            || self
                .contact_policy
                .pin
                .as_ref()
                .is_some_and(|pin| !pin.is_valid())
            || (self.contact_policy.pin.is_none()
                && self.contact_policy.response != ProjectileContact::StopOnly)
            || self.attack_digest.is_empty()
            || !self.tool.is_valid()
            || !self.ammunition.is_valid()
            || ![self.position.x, self.position.y, self.position.z]
                .into_iter()
                .all(f64::is_finite)
            || !((1.0 - 1e-8)..=(1.0 + 1e-8)).contains(&length)
            || ![
                self.launched_at,
                self.advanced_at,
                self.remaining_range,
                self.speed,
                self.injury,
            ]
            .into_iter()
            .all(f64::is_finite)
            || self.launched_at < 0.0
            || self.advanced_at < self.launched_at
            || self.advanced_at > at
            || self.remaining_range <= 0.0
            || self.speed <= 0.0
            || self.injury < 0.0
            || !(0.0..=1.0).contains(&self.handling)
        {
            return Err(InstallError::CurrentFormat);
        }
        if self.lethal_permission.is_some()
            && (self.practice
                || !self.requires_lethal_review
                || self.source_controller != SourceController::Player
                || !self.lethal_permission.as_ref().is_some_and(|permission| {
                    self.attack_digest.as_unicode().is_some_and(|digest| {
                        permission.valid_for_flight(&self.source_id, self.source_life, digest)
                    })
                }))
        {
            return Err(InstallError::CurrentFormat);
        }
        if self.execution.as_ref().is_some_and(|execution| {
            !execution.valid() || execution.tool() != &self.tool
                || execution.committed_at() != self.launched_at
        }) {
            return Err(InstallError::CurrentFormat);
        }
        if self.encounters.as_ref().is_some_and(|rows| {
            rows.iter().any(|(key, row)| !row.valid(key, self.launched_at, at))
        }) {
            return Err(InstallError::CurrentFormat);
        }
        Ok(())
    }

    pub(crate) fn contact_factor(&self) -> f64 {
        self.execution.as_ref().map_or(1.0, |score| score.contact_factor())
    }

    pub(crate) fn injury_factor(&self) -> f64 {
        self.execution.as_ref().map_or(1.0, |score| score.injury_factor())
    }

    pub(crate) fn progress(&self) -> FlightPosition {
        FlightPosition {
            position: self.position,
            advanced_at: self.advanced_at,
            remaining_range: self.remaining_range,
            source_exited: self.source_exited,
        }
    }

    pub(crate) fn set_progress(&mut self, progress: FlightPosition) {
        self.position = progress.position;
        self.advanced_at = progress.advanced_at;
        self.remaining_range = progress.remaining_range;
        self.source_exited = progress.source_exited;
    }

    pub(crate) fn travel(&self, seconds: f64) -> (Point, f64) {
        let travel = self.remaining_range.min(self.speed * seconds);
        let point = self.position;
        (
            Point {
                x: point.x + self.direction.x * travel,
                y: point.y + self.direction.y * travel,
                z: point.z + self.direction.z * travel,
            },
            travel,
        )
    }
}

heap_record!(ContactPolicy { pin });
heap_record!(ProjectileFlight {
    id,
    action_id,
    source_id,
    contact_policy,
    target_id,
    lethal_permission,
    attack_digest,
    tool,
    ammunition,
    execution
});

pub(crate) struct FundedProjectile {
    pub flight: ProjectileFlight,
    pub passages: NearPassages,
    pub(crate) resident: ResidentReservation,
    pub(crate) crossing_storage: Option<ResidentReservation>,
}

impl Serialize for FundedProjectile {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.flight.serialize(serializer)
    }
}

#[derive(Default)]
pub(crate) struct ProjectileState {
    pub present: bool,
    pub flights: IndexMap<String, Box<FundedProjectile>>,
    map_storage: Option<ResidentReservation>,
}

impl ProjectileState {
    pub(crate) fn validate_crossing_occurrences(
        &self,
        history: &crate::events::OccurrenceHistory,
    ) -> Result<(), InstallError> {
        for row in self.flights.values() {
            let flight = &row.flight;
            for entry in flight.encounters.iter().flat_map(|entries| entries.values()) {
                if let Ok(record) = history.original(&entry.pose_occurrence_id) {
                    let event = record.event();
                    if event.event_type != "body-ducked"
                        || event.at != entry.entered_at
                        || event.actor_id.as_deref() != Some(entry.body_id.as_str())
                        || !event.data.as_ref().and_then(|fields| fields.get("projectileId"))
                            .is_some_and(|value| matches!(value, crate::reception::EventScalar::Text(id) if id.as_unicode() == Some(flight.id.as_str())))
                    {
                        return Err(InstallError::CurrentFormat);
                    }
                }
            }
        }
        Ok(())
    }
    /// Prepare and install one committed flight. The release owner supplies
    /// its already admitted construction allocation and rolls the insertion
    /// back with the debit if later occurrence settlement fails.
    pub(crate) fn launch(
        &mut self,
        flight: ProjectileFlight,
        now: f64,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        flight
            .validate(now)
            .map_err(|_| ExecutionError::Invariant)?;
        if self.flights.contains_key(&flight.id) || flight.near_pass_observed_lives.is_some() || flight.encounters.is_some() {
            return Err(ExecutionError::Invariant);
        }
        let bytes = flight
            .heap_bytes()
            .and_then(|bytes| {
                bytes
                    .checked_add(flight.id.len())?
                    .checked_add(size_of::<FundedProjectile>())
            })
            .ok_or(ExecutionError::Capacity)?;
        storage.resize(bytes)?;
        let resident = budget.adopt_record(storage)?;
        if self.flights.len() == self.flights.capacity() {
            let capacity = self
                .flights
                .capacity()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?
                .max(4);
            let bytes = map_storage::<String, Box<FundedProjectile>>(capacity)
                .ok_or(ExecutionError::Capacity)?;
            let previous = self
                .map_storage
                .as_ref()
                .map_or(0, ResidentReservation::bytes);
            let backing = self.map_storage.get_or_insert(budget.reserve_backing(0)?);
            budget.resize_backing(backing, bytes)?;
            if self
                .flights
                .try_reserve_exact(capacity - self.flights.len())
                .is_err()
            {
                backing.resize(previous)?;
                return Err(ExecutionError::Capacity);
            }
            let actual = map_storage::<String, Box<FundedProjectile>>(self.flights.capacity())
                .ok_or(ExecutionError::Capacity)?;
            budget.resize_backing(backing, actual)?;
        }
        self.flights.insert(
            flight.id.clone(),
            Box::new(FundedProjectile {
                flight,
                passages: NearPassages::default(),
                resident,
                crossing_storage: None,
            }),
        );
        self.present = true;
        Ok(())
    }

    pub(crate) fn install(
        rows_import: &mut RowImport,
        children: &mut WorldChildren,
        at: f64,
        ranged_installed: bool,
        entities: &EntityStore,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        const ROOT: &str = "[\"world\"]";
        let present = match children.take("projectiles")? {
            Some(true) => true,
            None => false,
            _ => return Err(InstallError::ParentPresence),
        };
        let collection =
            rows::take_collection(rows_import, "sim_projectiles", ROOT, present, true)?;
        if !ranged_installed && !collection.rows.is_empty() {
            return Err(InstallError::UnsupportedFamily("projectiles"));
        }
        if collection.rows.is_empty() {
            return Ok(Self {
                present,
                ..Self::default()
            });
        }
        let count = collection.rows.len();
        let mut admission = budget
            .reserve(
                heap_sum([
                    map_storage::<String, Box<FundedProjectile>>(count)
                        .ok_or(InstallError::Capacity)?,
                    crate::host::retained_size::tree_node_bound::<String, ()>()
                        .and_then(|size| size.checked_mul(count))
                        .ok_or(InstallError::Capacity)?,
                ])
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut flights = IndexMap::new();
        flights
            .try_reserve_exact(count)
            .map_err(|_| InstallError::Capacity)?;
        let mut actions = BTreeSet::new();
        for row in collection.rows {
            rows::validate_map_row(
                &row,
                ROOT,
                "projectiles",
                &row.slot,
                collection.coverage.next_ordinal,
            )?;
            let mut parse = reserve_typed_parse::<ProjectileFlight>(&row.payload, 0, None, budget)?;
            let flight: ProjectileFlight =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            flight.validate(at)?;
            let crossing_storage = flight.encounters.as_ref().map(|rows| {
                if rows.values().any(|row| !row.validates_pose(entities)) {
                    return Err(InstallError::CurrentFormat);
                }
                budget.reserve_record(rows.heap_bytes().ok_or(InstallError::Capacity)?)
                    .map_err(|_| InstallError::Capacity)
            }).transpose()?;
            if flight.id != row.slot || !row.extra.is_empty() || flights.contains_key(&row.slot) {
                return Err(InstallError::CurrentFormat);
            }
            admission
                .resize(
                    admission
                        .bytes()
                        .checked_add(flight.action_id.len())
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            if !actions.insert(flight.action_id.clone()) {
                return Err(InstallError::CurrentFormat);
            }
            let receipts = rows::take_collection(
                rows_import,
                TABLE,
                &row.id,
                flight.has_passages(),
                true,
            )?;
            let passages = NearPassages::install(&row.id, receipts, budget)?;
            let bytes = flight
                .heap_bytes()
                .and_then(|size| {
                    size.checked_add(row.slot.capacity())?
                        .checked_add(size_of::<FundedProjectile>())
                })
                .ok_or(InstallError::Capacity)?;
            parse.resize(bytes).map_err(|_| InstallError::Capacity)?;
            let resident = budget
                .adopt_record(parse)
                .map_err(|_| InstallError::Capacity)?;
            flights.insert(
                row.slot,
                Box::new(FundedProjectile {
                    flight,
                    passages,
                    resident,
                    crossing_storage,
                }),
            );
        }
        drop(actions);
        admission
            .resize(
                map_storage::<String, Box<FundedProjectile>>(flights.capacity())
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let held = budget
            .adopt_record(admission)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            present,
            flights,
            map_storage: Some(held),
        })
    }
}
