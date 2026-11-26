//! Trusted public-use grants stay outside saved gameplay. A request binds the
//! actual leaf, its installed family and the observed root revision. Every
//! elapsed action can recheck the same grant and occupied movement space.
use super::{family::BoundaryRules, geometry::Axes, *};
use crate::construction_gather::{ConstructionSite, MaterialGrantFence};
use crate::state::{Entity, EntityStore, Point};
use crate::values::is_safe_record_id;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GateOperation {
    Open,
    Close,
    Bar,
    Unbar,
}
impl GateOperation {
    pub(crate) fn key(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Close => "close",
            Self::Bar => "bar",
            Self::Unbar => "unbar",
        }
    }
    pub(crate) fn moves_leaf(self) -> bool {
        matches!(self, Self::Open | Self::Close)
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Inside,
    Outside,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GateIntent {
    pub assembly_id: String,
    pub item_id: String,
    pub operation: GateOperation,
    pub family_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub family_version: u64,
    pub family_digest: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub expected_revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub side: Option<Side>,
}
heap_record!(GateIntent {
    assembly_id,
    item_id,
    family_id,
    family_digest
});
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GateWork {
    pub intent: GateIntent,
    pub position: GatePosition,
    pub barred: bool,
    pub side: Side,
    pub grant: MaterialGrantFence,
}
heap_record!(GateWork { intent, grant });

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AssetGrant {
    kind: AssetUse,
    pub id: String,
    pub revision: u64,
    revoked: bool,
    world_id: String,
    assembly_id: String,
    family: DefinitionPin,
    site: ConstructionSite,
    operations: Vec<String>,
    assets: Vec<GrantedAsset>,
}
#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
enum AssetUse {
    GateUse,
    StructuralImpact,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GrantedAsset {
    item_id: String,
    definition: DefinitionPin,
    origin_ids: Vec<String>,
}
heap_record!(GrantedAsset {
    item_id,
    definition,
    origin_ids
});
heap_record!(AssetGrant {
    id,
    world_id,
    assembly_id,
    family,
    site,
    operations,
    assets
});

impl AssetGrant {
    pub fn is_current(&self, world: &str, id: &str, revision: u64) -> bool {
        self.world_id == world
            && self.id == id
            && self.revision == revision
            && revision > 0
            && revision <= crate::identity::MAX_SAFE_INTEGER
            && is_safe_record_id(id)
            && self.family.is_valid()
            && self.site.valid()
            && is_safe_record_id(&self.assembly_id)
            && !self.operations.is_empty()
            && self.operations.iter().all(|operation| {
                matches!(
                    operation.as_str(),
                    "open" | "close" | "bar" | "unbar" | "held-tool-impact"
                )
            })
            && !self.assets.is_empty()
            && self.assets.iter().all(|asset| {
                is_safe_record_id(&asset.item_id)
                    && asset.definition.is_valid()
                    && !asset.origin_ids.is_empty()
                    && asset.origin_ids.len() <= crate::construction_gather::material_origin_limit()
                    && asset
                        .origin_ids
                        .iter()
                        .all(|origin| is_safe_record_id(origin))
            })
    }

    pub fn active(&self) -> bool {
        !self.revoked
    }
}

pub(crate) struct GateRead<'a> {
    pub gate: &'a Gate,
    pub family: &'a BoundaryRules,
    pub root: &'a Entity,
    pub edit: Option<&'a Edit>,
    pub frame: Axes,
    pub local_frame: Axes,
    pub support: &'a str,
}
impl GateIntent {
    pub(crate) fn read<'a>(
        &self,
        state: &'a crate::simulation::SimulationState,
    ) -> Option<GateRead<'a>> {
        self.read_in(&state.physical.entities, &state.installed.retained)
    }

    fn read_in<'a>(
        &self,
        entities: &'a EntityStore,
        retained: &'a crate::install::RetainedDefinitions,
    ) -> Option<GateRead<'a>> {
        let root = entities.get(&self.assembly_id)?;
        let structure = root.assembly.as_deref()?;
        let Assembly::Boundary {
            family,
            revision,
            gates,
            active_edit,
            retired: None,
            ..
        } = structure
        else {
            return None;
        };
        let stored = retained.structures.get(&self.family_id)?;
        let family::FamilyRules::Boundary(rules) = &stored.rules else {
            return None;
        };
        let gate = gates.get(&self.item_id)?;
        if family.id != self.family_id
            || family.version != self.family_version
            || family.digest != self.family_digest
            || family != &stored.pin
            || &gate.slide != family
            || *revision != self.expected_revision
        {
            return None;
        }
        let (at, support) = root.world_support()?;
        let room = Axes::room(at, root.spatial.heading)?;
        let post = |index: usize| {
            structure
                .installed_part(entities, &root.id, gate.post_ids[index].as_str())
                .map(|(_, local)| local)
        };
        let (a, b) = (post(0)?, post(1)?);
        let frame = Axes::section(
            room.point(a.x, a.z, a.y),
            room.point(b.x, b.z, b.y),
            rules.geometry.section.spacing,
        )?;
        let local_frame = Axes::section(a, b, rules.geometry.section.spacing)?;
        Some(GateRead {
            gate,
            family: rules,
            root,
            edit: active_edit.as_ref(),
            frame,
            local_frame,
            support,
        })
    }
}
impl GateRead<'_> {
    pub(crate) fn already(&self, operation: GateOperation) -> bool {
        match operation {
            GateOperation::Open => self.gate.position == GatePosition::Open,
            GateOperation::Close => self.gate.position == GatePosition::Closed,
            GateOperation::Bar => self.gate.position == GatePosition::Closed && self.gate.barred,
            GateOperation::Unbar => self.gate.position == GatePosition::Closed && !self.gate.barred,
        }
    }
    fn points(&self, side: Side, radius: f64) -> (Point, Point) {
        let geo = &self.family.geometry;
        let handle = geo.handle(self.frame, self.gate.position, side == Side::Inside);
        let along = geo.section.spacing / 2.
            + if self.gate.position == GatePosition::Open {
                geo.gate.travel
            } else {
                0.
            };
        let normal = match side {
            Side::Inside => {
                geo.gate.inside_offset
                    + geo.gate.thickness / 2.
                    + radius
                    + self.family.work_points.clearance
            }
            Side::Outside => {
                -geo.section.panel_thickness / 2. - radius - self.family.work_points.clearance
            }
        };
        (handle, self.frame.point(along, normal, 0.))
    }
    pub(crate) fn permitted<'a>(
        &self,
        world: &str,
        entities: &EntityStore,
        intent: &GateIntent,
        grants: &'a [AssetGrant],
        fence: Option<&MaterialGrantFence>,
    ) -> Option<&'a AssetGrant> {
        let lot = entities.get(&intent.item_id)?.item.as_ref()?;
        let origins = lot.material_origin_ids.as_ref()?;
        let sweep =
            self.family
                .geometry
                .sweep(self.frame, GatePosition::Closed, GatePosition::Open);
        grants.iter().find(|grant| {
            grant.kind == AssetUse::GateUse
                && !grant.revoked
                && is_safe_record_id(&grant.id)
                && grant.revision > 0
                && grant.world_id == world
                && grant.assembly_id == self.root.id
                && grant.family == self.gate.slide
                && fence.is_none_or(|f| f.id == grant.id && f.revision == grant.revision)
                && grant
                    .operations
                    .iter()
                    .any(|op| op == intent.operation.key())
                && grant.site.surface_id == self.support
                && sweep.iter().all(|s| {
                    s.min.x >= grant.site.min_x
                        && s.max.x <= grant.site.max_x
                        && s.min.z >= grant.site.min_z
                        && s.max.z <= grant.site.max_z
                })
                && grant.assets.iter().any(|asset| {
                    asset.item_id == intent.item_id
                        && asset.definition == lot.definition_pin
                        && !origins.is_empty()
                        && origins.len() == asset.origin_ids.len()
                        && origins.iter().all(|id| asset.origin_ids.contains(id))
                })
        })
    }
}

impl GateIntent {
    pub(crate) fn valid(&self) -> bool {
        is_safe_record_id(&self.assembly_id)
            && is_safe_record_id(&self.item_id)
            && is_safe_record_id(&self.family_id)
            && is_safe_record_id(&self.family_digest)
            && self.family_version > 0
            && self.family_version <= crate::identity::MAX_SAFE_INTEGER
            && self.expected_revision <= crate::identity::MAX_SAFE_INTEGER
            && (self.operation.moves_leaf() || self.side != Some(Side::Outside))
    }

    pub(crate) fn sides(&self) -> impl Iterator<Item = Side> + '_ {
        [Side::Inside, Side::Outside].into_iter().filter(|side| {
            self.side.is_none_or(|chosen| chosen == *side)
                && (self.operation.moves_leaf() || *side == Side::Inside)
        })
    }
}

impl GateRead<'_> {
    /// The same three spaces cover the leaf and its two moving hangers.
    pub(crate) fn sweep(&self) -> [crate::state::Bounds; 3] {
        self.family
            .geometry
            .sweep(self.frame, GatePosition::Closed, GatePosition::Open)
    }

    pub(crate) fn swept_space(&self, intent: &GateIntent) -> crate::geometry::SolidSpace {
        crate::geometry::SolidSpace {
            pieces: self.sweep(),
            moving: [
                intent.item_id.clone(),
                self.gate.binding_ids[4].clone(),
                self.gate.binding_ids[5].clone(),
            ],
            support: self.support.to_owned(),
        }
    }

    pub(crate) fn stance(&self, side: Side, radius: f64) -> (Point, crate::state::SurfacePoint) {
        let (handle, stance) = self.points(side, radius);
        (
            handle,
            crate::state::SurfacePoint {
                x: stance.x,
                y: stance.y,
                z: stance.z,
                surface_id: self.support.to_owned(),
            },
        )
    }
}

pub(crate) fn valid_saved(
    state: &crate::simulation::PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    actor: &Entity,
    action: &crate::state::Action,
) -> bool {
    let Some(work) = action
        .gate_work
        .as_deref()
        .filter(|work| work.intent.valid())
    else {
        return false;
    };
    let Some(gate) = work.intent.read_in(&state.entities, &installed.retained) else {
        return false;
    };
    gate.gate.position == work.position
        && gate.gate.barred == work.barred
        && work.intent.sides().any(|side| side == work.side)
        && work.grant.revision > 0
        && is_safe_record_id(&work.grant.id)
        && gate
            .edit
            .is_some_and(|edit| edit.actor_id == actor.id && edit.invocation_id == action.id)
        && gate.family.seconds.get(work.intent.operation.key()) == Some(&action.total_seconds)
        && action.remaining_seconds >= 0.0
        && action.remaining_seconds <= action.total_seconds
        && action.destination.as_ref().is_some_and(|point| {
            let (_, stance) = gate.stance(work.side, actor.body_profile().radius);
            point.physical() == &stance
        })
}
