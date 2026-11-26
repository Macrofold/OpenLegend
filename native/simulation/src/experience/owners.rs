//! Current per-actor list ownership. Empty and absent lists differ, and a newly
//! receiving memoryless body can create its real sensory list without a copied
//! actor/world graph or a guessed next SQL ordinal.

use super::*;

#[derive(Debug)]
pub struct PersonalOwnerMap {
    pub(super) coverage: OwnerCoverage,
    pub(super) placements: IndexMap<String, u64>,
}
impl PersonalOwnerMap {
    pub(crate) fn install(
        kind: PersonalSourceKind,
        coverage: OwnerCoverage,
        placements: IndexMap<String, u64>,
    ) -> Result<Self, ExperienceError> {
        let owner = if kind == PersonalSourceKind::Memory {
            "[\"world\"]"
        } else {
            "[\"world\",\"experience\"]"
        };
        if coverage.table != format!("{}_owners", kind.table())
            || coverage.owner != owner
            || !coverage.complete
            || placements.iter().any(|(actor, position)| {
                !is_safe_record_id(actor) || *position >= coverage.next_ordinal
            })
            || (!coverage.parent_present && !placements.is_empty())
        {
            return Err(ExperienceError::UnknownCoverage);
        }
        Ok(Self {
            coverage,
            placements,
        })
    }
}
impl PersonalSourceKind {
    pub fn owner_table(self) -> String {
        format!("{}_owners", self.table())
    }
}

pub(crate) struct MemoryOwner<'a> {
    pub actor_id: &'a str,
    pub position: u64,
    pub collection: &'a PersonalSourceCollection,
}
pub(crate) struct MemoryOwners<'a> {
    owners: Vec<MemoryOwner<'a>>,
    _reservation: crate::host::ByteReservation,
}
impl<'a> MemoryOwners<'a> {
    pub(crate) fn iter(&self) -> impl DoubleEndedIterator<Item = &MemoryOwner<'a>> {
        self.owners.iter()
    }
}
impl ExperienceState {
    /// Object.entries(memories), followed by each collection's original array
    /// ordinals. A complete owner map does not certify any cold list body.
    pub(crate) fn memory_owners<'a>(
        &'a self,
        budget: &crate::host::ByteBudget,
    ) -> Result<MemoryOwners<'a>, ExperienceError> {
        let owners = self
            .owner_maps
            .get(&PersonalSourceKind::Memory)
            .ok_or(ExperienceError::UnknownCoverage)?;
        if !owners.coverage.complete {
            return Err(ExperienceError::UnknownCoverage);
        }
        let reservation = budget
            .reserve(
                owners
                    .placements
                    .len()
                    .checked_mul(std::mem::size_of::<MemoryOwner<'_>>())
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        let mut selected = Vec::new();
        selected
            .try_reserve_exact(owners.placements.len())
            .map_err(|_| ExperienceError::Capacity)?;
        for (actor, position) in &owners.placements {
            selected.push(MemoryOwner {
                actor_id: actor,
                position: *position,
                collection: self
                    .optional_collection(actor, PersonalSourceKind::Memory)?
                    .ok_or(ExperienceError::UnknownCoverage)?,
            });
        }
        selected.sort_unstable_by(|a, b| {
            crate::encoding::js_property_cmp(a.actor_id, b.actor_id)
                .then(a.position.cmp(&b.position))
        });
        Ok(MemoryOwners {
            owners: selected,
            _reservation: reservation,
        })
    }
}
