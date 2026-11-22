//! An on-demand read of the player's own installed status actions.

use super::*;
use crate::commands::StatusOperation;
use crate::status::EffectBindings;

pub struct RuntimeStatusChoice<'a> {
    pub definition_id: &'a str,
    pub operation: StatusOperation,
    pub label: &'a str,
    pub icon: Option<&'a str>,
}

pub struct RuntimeStatusMenu<'a> {
    pub sequence: u64,
    pub paused: bool,
    pub actor: &'a str,
    pub available: bool,
    pub allows_actions: bool,
    pub choices: &'a [RuntimeStatusChoice<'a>],
}

impl NativeWorldSession {
    /// Evaluate the installed definitions for this player on demand. The
    /// callback encodes or funds its own result before leaving the read.
    pub fn with_player_status_menu<T>(
        &self,
        account: &str,
        actor: &str,
        render: impl FnOnce(RuntimeStatusMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("missing status subject"))?;
        let available = entity.actively_participates()
            && entity
                .actor
                .as_ref()
                .is_some_and(|body| body.alive && !body.incapacitated);
        let allows_actions = !state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "actions")
            .map_err(failure)?;
        let read = state.installed.status_read(&state.physical);
        let definitions = &state.installed.status_policy.definitions;
        let _custody = self.budget.reserve(
            definitions
                .len()
                .checked_mul(size_of::<RuntimeStatusChoice<'_>>())
                .ok_or(CapacityError)?,
        )?;
        let mut choices = Vec::with_capacity(definitions.len());
        for definition in definitions {
            let Some(actions) = &definition.actions else {
                continue;
            };
            if definition.contribution.is_some() {
                continue;
            }
            let active = entity
                .status_effects
                .as_ref()
                .and_then(|effects| effects.get(&definition.id))
                .is_some_and(|effect| effect.active);
            let (operation, label, icon) = if active {
                (
                    StatusOperation::Deactivate,
                    &actions.deactivate,
                    actions.deactivate_icon.as_deref(),
                )
            } else {
                let bindings = EffectBindings {
                    subject: actor,
                    source: actor,
                    action_target: actor,
                };
                if !read.can_activate(bindings, definition).map_err(failure)? {
                    continue;
                }
                (
                    StatusOperation::Activate,
                    &actions.activate,
                    actions.activate_icon.as_deref(),
                )
            };
            choices.push(RuntimeStatusChoice {
                definition_id: &definition.id,
                operation,
                label,
                icon,
            });
        }
        render(RuntimeStatusMenu {
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            actor,
            available,
            allows_actions,
            choices: &choices,
        })
    }
}
