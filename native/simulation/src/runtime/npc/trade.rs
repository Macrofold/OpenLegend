//! Exact private trade history extends already authorized give choices.
use super::*;
use crate::{
    capture::PreparedNpcRead,
    experience::PersonalSourceKind,
    handover::{NpcTradeLot, gift_participant},
    runtime::private_history::RuntimePersonalBrowseCut,
};

impl RuntimeNpcRead {
    /// A detached catalogue needs no further world turn when it contains no
    /// reachable give choice that remembered terms could extend.
    pub fn has_npc_trade_prospects(&self) -> bool {
        match self.preparation.as_ref() {
            Some(PreparedNpcRead::Offers(offers)) => offers.fresh_trade_peers().next().is_some(),
            _ => false,
        }
    }
}

impl NativeWorldSession {
    /// Borrow the stored-history cut only when the actual prepared catalogue
    /// contains a usable give choice and the actor could have trade history.
    /// The application copies this small selection, releases the world turn,
    /// and performs its indexed lookup on a separate PostgreSQL connection.
    pub fn with_npc_trade_prospects<T>(
        &self,
        read: &RuntimeNpcRead,
        prepare: impl FnOnce(RuntimePersonalBrowseCut<'_>, &mut dyn Iterator<Item = &str>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = &read.historical_scope;
        if !self.npc_host_current(read) || !scope.still_permitted(state) {
            return Ok(None);
        }
        let Some(PreparedNpcRead::Offers(offers)) = read.preparation.as_ref() else {
            return Ok(None);
        };
        let mut peers = offers.fresh_trade_peers().peekable();
        if peers.peek().is_none()
            || !state
                .experience
                .optional_collection(&scope.actor_id, PersonalSourceKind::Awareness)
                .map_err(failure)?
                .is_some_and(|awareness| {
                    !awareness.coverage().complete || awareness.has_known_agreement_body()
                })
        {
            return Ok(None);
        }
        Ok(Some(prepare(
            RuntimePersonalBrowseCut {
                world: &scope.world_id,
                generation: &scope.generation,
                actor: &scope.actor_id,
                durable_revision: scope.durable_revision,
                privacy_revision: scope.privacy_revision,
                at: scope.at,
                identity_through: scope.identity_through,
            },
            &mut peers,
        )))
    }

    /// Add only choices for still-permitted evidence and an existing, actual
    /// gift prospect. Presentation storage drops after this synchronous join.
    pub fn join_npc_trade_prospects(
        &self,
        read: &mut RuntimeNpcRead,
        terms: &[NpcTradeLot],
    ) -> Result<(), RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = &read.historical_scope;
        if terms.is_empty()
            || !self.npc_host_current(read)
            || !scope.still_permitted(state)
            || state.physical.header.paused
        {
            return Ok(());
        }
        let Some(actor) = state.physical.entities.get(&scope.actor_id) else {
            return Ok(());
        };
        if !gift_participant(state, actor).map_err(failure)? {
            return Ok(());
        }
        if let Some(PreparedNpcRead::Offers(offers)) = read.preparation.as_mut() {
            offers
                .add_disclosed_trades(state, &read.read, terms, &self.budget)
                .map_err(failure)?;
        }
        Ok(())
    }
}
