//! A refusal depends only on the exact Source-visible membership/episode and
//! public scalar addresses. The opaque hash discloses none of these facts.
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use serde::Serialize;
use std::mem::size_of;
struct Visible<'a> {
    people: &'a [String],
    objects: &'a [String],
}
impl Serialize for Visible<'_> {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeSeq;
        let mut out = s.serialize_seq(Some(self.people.len() + self.objects.len()))?;
        for id in self.people.iter().chain(self.objects) {
            out.serialize_element(id)?;
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(untagged)]
enum Fact<'a> {
    Visible(Visible<'a>),
    Absent(&'static str),
    Entity(
        (
            Option<&'a str>,
            Option<u64>,
            Option<u64>,
            Option<u64>,
            Option<bool>,
            Option<bool>,
        ),
    ),
}
pub(crate) fn resolution_signature(
    state: &SimulationState,
    actor: &str,
    depends: &[String],
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let _slots = budget.reserve(
        depends
            .len()
            .checked_mul(size_of::<Fact<'_>>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut facts = Vec::with_capacity(depends.len());
    for id in depends {
        if id == "@visible" {
            facts.push(Fact::Visible(Visible {
                people: state
                    .reception
                    .visible_people
                    .as_ref()
                    .and_then(|m| m.get(actor))
                    .map_or(&[], Vec::as_slice),
                objects: state
                    .reception
                    .visible_objects
                    .as_ref()
                    .and_then(|m| m.get(actor))
                    .map_or(&[], Vec::as_slice),
            }));
            continue;
        }
        let Some(entity) = state
            .physical
            .entities
            .get(id)
            .filter(|e| e.retirement.is_none())
        else {
            facts.push(Fact::Absent("absent"));
            continue;
        };
        if entity.inventory_revision.is_some() || entity.item.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let episode = state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|m| m.get(actor))
            .and_then(|m| m.get(id))
            .map(String::as_str);
        facts.push(Fact::Entity((
            episode,
            entity.resource.as_ref().map(|r| r.quantity),
            None,
            None,
            entity.heat.as_ref().map(|h| h.lit),
            entity.actor.as_ref().map(|a| a.alive),
        )));
    }
    let value = (state.installed.manifest.revision, &facts);
    let bytes = crate::encoding::json_record_len(&value).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        bytes
            .checked_mul(2)
            .and_then(|n| n.checked_add(64))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let json = crate::encoding::json_record(&value).map_err(|_| ExecutionError::Invariant)?;
    let signature = crate::encoding::content_label(&json);
    drop(json);
    storage.resize(signature.capacity())?;
    Ok((signature, storage))
}
