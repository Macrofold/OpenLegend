//! A complete closed coaching family. No selected command can create a lesson;
//! an actual nonempty lesson refuses rather than becoming a no-op sweep.
use super::{InstallError, RowImport, WorldChildren};
pub(crate) struct ClosedCoachingState {
    pub(crate) present: bool,
}
impl ClosedCoachingState {
    pub(crate) fn install(
        import: &mut RowImport,
        children: &mut WorldChildren,
    ) -> Result<Self, InstallError> {
        let present = match children.take("coachingEpisodes")? {
            None => false,
            Some(true) => true,
            _ => return Err(InstallError::ParentPresence),
        };
        let rows = super::rows::take_collection(
            import,
            "sim_coaching_episodes",
            "[\"world\"]",
            present,
            true,
        )?;
        if !rows.rows.is_empty() {
            return Err(InstallError::UnsupportedFamily("coaching episodes"));
        }
        Ok(Self { present })
    }
    pub(crate) fn is_present(&self) -> bool {
        self.present
    }
}
