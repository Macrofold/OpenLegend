//! The explicit target gesture borrows the current preferred held item. It
//! never prepares an inventory page or chooses a different carried tool.
use super::*;
use crate::worlds::base_context_actions::equipped_use_rank;

impl NativeWorldSession {
    /// Check the authenticated owner and the installed preference while the
    /// accepted cut is stable. The app keeps its world turn through the
    /// selected target read and its final authorized encoding.
    pub fn player_equipped_target_id(
        &self,
        account: &str,
        actor: &str,
        item: &str,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let accepted = self.session.accepted().map_err(failure)?;
        accepted
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &accepted.state;
        let Some(body) = state.physical.entities.get(actor) else {
            return Ok(false);
        };
        let profile = &state.installed.content.profile;
        let mut selected = None;
        for child in state
            .inventory
            .children(&state.physical.entities, &body.id, true)
        {
            let Some(definition) = child
                .item
                .as_ref()
                .and_then(|lot| state.installed.retained.items.get(&lot.definition_pin.id))
            else {
                continue;
            };
            let Some(rank) = equipped_use_rank((&profile.id, profile.version), definition) else {
                continue;
            };
            if selected.is_none_or(|(earlier, _)| rank < earlier) {
                selected = Some((rank, child.id.as_str()));
                if rank == 0 {
                    break;
                }
            }
        }
        Ok(selected.is_some_and(|(_, preferred)| preferred == item))
    }
}
