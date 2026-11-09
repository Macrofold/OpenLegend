//! The proof's actual learned-capability owners. Its scoped opening has no
//! learned recipes; nonempty capability inputs require the complete method
//! execution family and refuse here rather than disappear from NPC context.

use super::rows::{take_collection, validate_map_row, validate_marker};
use super::{InstallError, RowImport};
use crate::records::{ChildShape, InstalledRow};
use crate::state::EntityStore;
use indexmap::IndexMap;

pub(crate) struct EmptyLearnedOwner {
    pub row: InstalledRow,
    pub next_ordinal: u64,
}
pub(crate) struct LearnedCapabilities {
    pub owners: IndexMap<String, EmptyLearnedOwner>,
    pub next_owner_ordinal: u64,
}
impl LearnedCapabilities {
    /// The complete root owner map and every present child were consumed above.
    /// Source treats an absent actor key as empty; any nonempty present child
    /// refuses installation rather than disappearing from this read.
    pub(crate) fn known_recipes(&self) -> &[String] {
        &[]
    }
}

pub(crate) fn install_learned_capabilities(
    import: &mut RowImport,
    present: bool,
    entities: &EntityStore,
) -> Result<LearnedCapabilities, InstallError> {
    let owners = take_collection(
        import,
        "mind_learned_capabilities_owners",
        "[\"world\"]",
        present,
        true,
    )?;
    let mut installed = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            "[\"world\"]",
            "knowledge",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&row, ChildShape::Array)?;
        if !entities
            .get(&row.slot)
            .is_some_and(|entity| entity.actor.is_some())
        {
            return Err(InstallError::ParentPresence);
        }
        let entries = take_collection(import, "mind_learned_capabilities", &row.id, true, true)?;
        if !entries.rows.is_empty() {
            return Err(InstallError::UnsupportedFamily("learned methods"));
        }
        let key = row.slot.clone();
        if installed
            .insert(
                key,
                EmptyLearnedOwner {
                    row,
                    next_ordinal: entries.coverage.next_ordinal,
                },
            )
            .is_some()
        {
            return Err(InstallError::DuplicateRow);
        }
    }
    Ok(LearnedCapabilities {
        owners: installed,
        next_owner_ordinal: owners.coverage.next_ordinal,
    })
}
