//! A current-world reopen restores its paused startup boundary and reconciles
//! installed hot-event progression before disclosure. Creation is separate.
use super::*;
impl NativeWorldSession {
    fn inactive_initial_player_world(
        &self,
        actor: &str,
    ) -> Result<&crate::simulation::Simulation, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        let entity = simulation.state.physical.entities.get(actor);
        if self.active
            || !simulation.state.physical.header.paused
            || !entity.is_some_and(|entity| {
                entity
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.alive && actor.controller == "player")
            })
        {
            return Err(failure(
                "The creation route requires a paused initial world with its intended playable character",
            ));
        }
        Ok(simulation)
    }

    /// Confirm the approved player against the inactive initial world, without
    /// creating an authority session or a control lease.
    pub fn check_initial_player(&self, account: &str, actor: &str) -> Result<(), RuntimeError> {
        self.inactive_initial_player_world(actor)?
            .require_player_owner(account, actor)
            .map_err(failure)
    }

    /// A game snapshot contains every player's private state. Copy it only
    /// when the operator may inspect every player character in this cut.
    pub fn check_private_lab_copy(&self, actor:&str) -> Result<(),RuntimeError> {
        let world=self.inactive_initial_player_world(actor)?;
        let entities=&world.state.physical.entities;
        if entities.ordered_ids().any(|id| id!=actor && entities.get(id).and_then(|entity|entity.actor.as_ref()).is_some_and(|body| body.controller=="player")) {
            return Err(failure("A different player's private state is present"));
        }
        Ok(())
    }

    /// Validate publisher-provided fresh grants before the host writes them in
    /// the initial-world transaction. No operational permission is issued here.
    pub fn check_initial_construction_grants(
        &self,
        actor: &str,
        grants: &[crate::InitialConstructionGrant],
    ) -> Result<(), RuntimeError> {
        let initial = self.inactive_initial_player_world(actor)?;
        if self.restore_installation {
            return Err(failure(
                "A restored world cannot issue initial construction grants",
            ));
        }
        crate::construction_seed::check(&initial.state, actor, grants, &self.budget)
            .map_err(failure)
    }

    pub fn begin_startup(&mut self) -> Result<CandidateKey, RuntimeError> {
        self.begin_startup_with_materials(None)
    }

    /// Reading this finite installation check grants no permission. Startup
    /// and recovery fetch current authority only for saved bound work.
    pub fn has_bound_material_gather(&self) -> Result<bool, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        Ok(crate::construction_gather::has_bound_work(&simulation.state))
    }

    pub fn begin_startup_with_materials(
        &mut self,
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session.begin_startup(materials, None).map_err(session_failure)
    }

    /// Reconcile cold startup and new configured owners in a protected save.
    /// The listener must commit the corresponding grants with these rows.
    pub fn begin_configured_startup(
        &mut self,
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
        owners: &[RestoreBinding],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session.begin_startup(materials, Some(owners)).map_err(session_failure)
    }
}
