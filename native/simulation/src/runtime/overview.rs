//! Accepted public positions for the characterless Operations caller.

use super::{ByteReservation, NativeWorldSession, RuntimeError, failure};
use serde::Serialize;

const BODY_LIMIT: usize = 2_000;

#[derive(Serialize)]
pub struct RuntimeOverview {
    bodies: Vec<OverviewBody>,
    omitted: usize,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(Serialize)]
struct OverviewBody {
    category: Category,
    x: f64,
    z: f64,
}

// Declaration order is the public lexical category order.
#[derive(Serialize, Eq, Ord, PartialEq, PartialOrd)]
#[serde(rename_all = "lowercase")]
enum Category {
    Animal,
    Fire,
    Object,
    Person,
    Resource,
}

impl Category {
    fn for_kind(kind: &str) -> Result<Self, RuntimeError> {
        match kind {
            "player" | "npc" => Ok(Self::Person),
            "animal" => Ok(Self::Animal),
            "resource" => Ok(Self::Resource),
            "campfire" => Ok(Self::Fire),
            "practice-target" | "remains" | "item-pile" | "item" | "assembly" => Ok(Self::Object),
            _ => Err(RuntimeError::application_refused(
                "Unsupported public overview category",
            )),
        }
    }
}

impl NativeWorldSession {
    /// Borrow the selected world's authored reference material, without reading
    /// any actor, timeline or diagnostic capture.
    pub fn experiment_guides(&self) -> Result<impl serde::Serialize + '_, RuntimeError> {
        Ok(&self
            .session
            .accepted()
            .map_err(failure)?
            .state
            .installed
            .manifest
            .experiment_guides)
    }

    /// Scan the accepted physical entities once for the public map. The result
    /// owns at most MP17's body limit and carries no entity identifiers.
    pub fn public_overview(&self) -> Result<RuntimeOverview, RuntimeError> {
        let current = self.session.accepted().map_err(failure)?;
        let entities = &current.state.physical.entities;
        let limit = entities.len().min(BODY_LIMIT);
        let custody = self
            .budget
            .reserve(limit * std::mem::size_of::<OverviewBody>())?;
        let mut bodies = Vec::new();
        bodies.try_reserve_exact(limit).map_err(failure)?;
        let mut omitted = 0;
        for entity in entities.ordered_ids().filter_map(|id| entities.get(id)) {
            let Some(position) = entity.world_position() else {
                continue;
            };
            if entity.retirement.is_some()
                || entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.participation.as_ref())
                    .is_some_and(|participation| participation.phase == "inactive")
            {
                continue;
            }
            if bodies.len() == BODY_LIMIT {
                omitted += 1;
                continue;
            }
            bodies.push(OverviewBody {
                category: Category::for_kind(&entity.kind)?,
                x: round_tenth(position.x),
                z: round_tenth(position.z),
            });
        }
        // Select in entity order before sorting so the cap matches MP17.
        bodies.sort_unstable_by(|a, b| {
            a.category
                .cmp(&b.category)
                .then_with(|| a.x.total_cmp(&b.x))
                .then_with(|| a.z.total_cmp(&b.z))
        });
        Ok(RuntimeOverview {
            bodies,
            omitted,
            _custody: custody,
        })
    }
}

fn round_tenth(value: f64) -> f64 {
    let scaled = value * 10.0;
    let floor = scaled.floor();
    // Match Math.round, including ties towards positive infinity.
    let rounded = if scaled - floor >= 0.5 {
        floor + 1.0
    } else {
        floor
    };
    if rounded == 0.0 { 0.0 } else { rounded / 10.0 }
}
