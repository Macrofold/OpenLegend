use super::*;
use crate::install::rows::take_collection;
use crate::install::{InstallError, RowImport, WorldChildren};
impl OutingState {
    pub(crate) fn install_closed(
        import: &mut RowImport,
        children: &mut WorldChildren,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let present = match children.take("outings")? {
            None => false,
            Some(true) => true,
            _ => return Err(InstallError::ParentPresence),
        };
        let owner = take_collection(import, "activity_outings", "[\"world\"]", present, true)?;
        // This owner must not turn shape support into a claim that travel,
        // activities, work cancellation and private agreement readers work.
        if !owner.rows.is_empty() {
            return Err(InstallError::UnsupportedFamily("outings"));
        }
        Ok(Self {
            records: present.then(IndexMap::new),
            index: OutingIndex::default(),
            backing: budget
                .reserve_backing(0)
                .map_err(|_| InstallError::Capacity)?,
            key_bytes: 0,
        })
    }
}
