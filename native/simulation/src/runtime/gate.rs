//! One read of the physical gate connected to the player's admitted observation.
use super::*;
use crate::assembly::{
    Assembly,
    gate::{GateIntent, GateOperation},
};

pub struct RuntimeGateOffer<'a> {
    pub item_id: &'a str,
    pub intent: GateIntent,
    pub label: &'a str,
}

impl NativeWorldSession {
    /// Visit bounded gates on the exact current visible boundary. The host
    /// supplies the scoped part reference before this borrowed read returns.
    pub fn with_gate_offers(
        &self,
        account: &str,
        actor: &str,
        root: &str,
        observed_revision: u64,
        mut receive: impl FnMut(RuntimeGateOffer<'_>) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &simulation.state;
        let Some(boundary) = state
            .physical
            .entities
            .get(root)
            .and_then(|r| r.assembly.as_deref())
        else {
            return Ok(());
        };
        let Assembly::Boundary {
            family,
            revision,
            gates,
            retired: None,
            ..
        } = boundary
        else {
            return Ok(());
        };
        if *revision != observed_revision {
            return Ok(());
        }
        let Some(crate::assembly::family::FamilyRules::Boundary(rules)) = state
            .installed
            .retained
            .structures
            .get(&family.id)
            .filter(|installed| &installed.pin == family)
            .map(|entry| &entry.rules)
        else {
            return Err(failure("gate law changed"));
        };
        for (id, gate) in gates {
            let operations: &[GateOperation] =
                if gate.position == crate::assembly::GatePosition::Open {
                    &[GateOperation::Close]
                } else {
                    // Offering both inside operations discloses no hidden bar state.
                    &[
                        GateOperation::Open,
                        GateOperation::Bar,
                        GateOperation::Unbar,
                    ]
                };
            for &operation in operations {
                let label = rules
                    .labels
                    .get(operation.key())
                    .ok_or_else(|| failure("gate label unavailable"))?;
                let _workspace = self
                    .budget
                    .reserve(root.len() + id.len() + family.id.len() + family.digest.len())?;
                receive(RuntimeGateOffer {
                    item_id: id,
                    intent: GateIntent {
                        assembly_id: root.to_owned(),
                        item_id: id.clone(),
                        operation,
                        family_id: family.id.clone(),
                        family_version: family.version,
                        family_digest: family.digest.clone(),
                        expected_revision: *revision,
                        side: None,
                    },
                    label,
                })?;
            }
        }
        Ok(())
    }
}
