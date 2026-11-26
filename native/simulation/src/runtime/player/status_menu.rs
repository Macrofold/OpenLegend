//! An on-demand read of the player's own installed status actions.

use super::*;
use crate::body::scar_treatment;
use crate::capture::PlayerObservedBody;
use crate::commands::StatusOperation;
use crate::status::EffectBindings;

pub struct RuntimeStatusChoice<'a> {
    pub definition_id: &'a str,
    pub operation: StatusOperation,
    pub label: &'a str,
    pub icon: Option<&'a str>,
}

pub struct RuntimeScarChoice<'a> {
    pub id: &'a str,
    pub name: &'a str,
}

pub struct RuntimeScarMenu<'a> {
    pub label: &'a str,
    pub target: &'a str,
    pub material: &'a crate::text::JsText,
    pub quantity: u64,
    pub material_available: bool,
    pub scars: &'a [RuntimeScarChoice<'a>],
}

pub struct RuntimeStatusMenu<'a> {
    pub sequence: u64,
    pub paused: bool,
    pub actor: &'a str,
    pub available: bool,
    pub allows_actions: bool,
    pub choices: &'a [RuntimeStatusChoice<'a>],
    pub treatment: Option<RuntimeScarMenu<'a>>,
}

impl NativeWorldSession {
    /// Evaluate the installed definitions for this player on demand. The
    /// callback encodes or funds its own result before leaving the read.
    pub fn with_player_status_menu<T>(
        &self,
        account: &str,
        actor: &str,
        mut contact_reference: impl FnMut(PlayerObservedBody<'_>) -> Result<String, RuntimeError>,
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
        let mut treatment = None;
        let mut scars = Vec::new();
        let mut rest_reference = None;
        let mut treatment_custody = self.budget.reserve(0)?;
        if available
            && let Some((policy, rule)) = scar_treatment::installed(state)
            && policy
                .scars
                .iter()
                .any(|scar| scar_treatment::has_scar(entity, &scar.id))
            && let Some(origin) = entity.world_position()
        {
            let mut failure = None;
            simulation
                .visit_accepted_player_contacts(account, actor, &self.budget, |body| {
                    let Some(rest) = state.physical.entities.get(body.source_id).filter(|rest| {
                        rest.kind == policy.rest_kind && rest.physical_life() == body.physical_life
                    }) else {
                        return false;
                    };
                    if !rest
                        .world_position()
                        .is_some_and(|point| crate::spatial::distance(origin, point) <= rule.reach)
                    {
                        return false;
                    }
                    match contact_reference(body) {
                        Ok(reference) => rest_reference = Some(reference),
                        Err(error) => failure = Some(error),
                    }
                    true
                })
                .map_err(super::failure)?;
            if let Some(error) = failure {
                return Err(error);
            }
            if let Some(rest) = &rest_reference {
                let material = state
                    .installed
                    .retained
                    .items
                    .get(&rule.material_id)
                    .ok_or_else(|| super::failure("missing treatment material definition"))?;
                treatment_custody.resize(
                    rest.capacity()
                        .checked_add(
                            policy
                                .scars
                                .len()
                                .checked_mul(size_of::<RuntimeScarChoice<'_>>())
                                .ok_or(CapacityError)?,
                        )
                        .ok_or(CapacityError)?,
                )?;
                scars.reserve_exact(policy.scars.len());
                scars.extend(
                    policy
                        .scars
                        .iter()
                        .filter(|scar| scar_treatment::has_scar(entity, &scar.id))
                        .map(|scar| RuntimeScarChoice {
                            id: &scar.id,
                            name: &scar.name,
                        }),
                );
                treatment = Some(RuntimeScarMenu {
                    label: &policy.treatment_label,
                    target: rest,
                    material: &material.named.name,
                    quantity: rule.quantity,
                    material_available: scar_treatment::material(state, entity, rule).is_some(),
                    scars: &scars,
                });
            }
        }
        render(RuntimeStatusMenu {
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            actor,
            available,
            allows_actions,
            choices: &choices,
            treatment,
        })
    }
}
