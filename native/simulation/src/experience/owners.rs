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
