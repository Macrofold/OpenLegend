//! One accepted authority and disclosure lease for explicitly requested action
//! discovery. Individual roles use the same reads as their selected menus.

use super::*;

pub struct RuntimeActionCatalogue<'a> {
    simulation: &'a crate::simulation::Simulation,
    budget: &'a ByteBudget,
    account: &'a str,
    actor: GatheringActor<'a>,
}

impl NativeWorldSession {
    /// Borrow the current status and the catalogue's read authority under one
    /// publication lease. Each visitor independently funds retained app rows.
    /// The caller finishes final synchronous encoding before it returns.
    pub fn with_player_action_catalogue<T>(
        &self,
        account: &str,
        actor: &str,
        contact_reference: impl FnMut(
            crate::capture::PlayerObservedBody<'_>,
        ) -> Result<String, RuntimeError>,
        publish: impl FnOnce(
            RuntimeStatusMenu<'_>,
            RuntimeActionCatalogue<'_>,
        ) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        self.with_player_status_menu(account, actor, contact_reference, |status| {
            let life = simulation
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.physical_life());
            let owner = GatheringActor {
                id: actor,
                life,
                can_act: status.available && status.allows_actions,
            };
            publish(
                status,
                RuntimeActionCatalogue {
                    simulation,
                    budget: &self.budget,
                    account,
                    actor: owner,
                },
            )
        })
    }
}

impl RuntimeActionCatalogue<'_> {
    /// Visit current perceived Gather sites and borrow the shaped offer. The
    /// carried tools scan is paid at most once, on the first eligible site.
    pub fn visit_gathering(
        &self,
        mut add: impl FnMut(
            &crate::capture::PlayerObservedBody<'_>,
            RuntimeGatherOffer<'_>,
        ) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        let state = &self.simulation.state;
        let mut tool_yields = None;
        let mut workspace = self.budget.reserve(0)?;
        let mut error = None;
        self.simulation
            .visit_accepted_player_contacts(self.account, self.actor.id, self.budget, |body| {
                let Some((gathering, quantity)) = menu_gathering(state, &body) else {
                    return false;
                };
                let result = (|| {
                    if tool_yields.is_none() {
                        let mut yields: IndexMap<&str, u64> = IndexMap::new();
                        crate::gathering::visit_tool_yields(
                            state,
                            self.actor.id,
                            |material, count| {
                                if let Some(value) = yields.get_mut(material) {
                                    *value = (*value).max(count);
                                } else {
                                    let bytes =
                                        crate::host::retained_size::map_storage::<&str, u64>(
                                            yields.len().checked_add(1).ok_or(CapacityError)?,
                                        )
                                        .ok_or(CapacityError)?;
                                    workspace.resize(bytes)?;
                                    yields.try_reserve(1).map_err(|_| CapacityError)?;
                                    yields.insert(material, count);
                                }
                                Ok(())
                            },
                        )
                        .map_err(failure)?;
                        tool_yields = Some(yields);
                    }
                    let yields = tool_yields.as_ref().expect("prepared tool yields");
                    let amount = yields
                        .get(gathering.definition.pin.id.as_str())
                        .map_or(gathering.base_yield, |amount| {
                            gathering.base_yield.max(*amount)
                        });
                    add(
                        &body,
                        gather_menu_offer(state, &body, gathering, quantity, self.actor, amount),
                    )
                })();
                if let Err(problem) = result {
                    error = Some(problem);
                    return true;
                }
                false
            })
            .map_err(failure)?;
        error.map_or(Ok(()), Err)
    }

    /// Borrow current installed known manufacturing offers. The visitor can
    /// independently fund each resulting app row before the method advances.
    pub fn visit_known_manufacture(
        &self,
        visit: impl FnMut(&str, crate::runtime::RuntimeManufactureOffer<'_>) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        super::super::manufacture::visit_known_manufacture(
            &self.simulation.state,
            self.actor.id,
            self.budget,
            visit,
        )
    }
}
