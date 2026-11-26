//! Common exact-transfer work bounds from the installed application contract.

use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StockTransferLimits {
    pub(crate) examined: usize,
    pub(crate) moved_lots: usize,
}
pub(crate) fn limits() -> &'static StockTransferLimits {
    static LIMITS: LazyLock<StockTransferLimits> = LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/stock-transfer-limits.json"
        ))
        .expect("shared stock transfer limits")
    });
    &LIMITS
}

/// The source and destination are selected storage endpoints. A world endpoint
/// additionally needs a current, deliberately inspected page and physical reach.
#[derive(Clone, Debug, PartialEq)]
pub struct StockRequest {
    pub(crate) source: String,
    pub(crate) destination: String,
    pub(crate) definition: crate::values::DefinitionPin,
    pub(crate) quantity: u64,
    pub(crate) minimum_held: u64,
}

impl StockRequest {
    pub(crate) fn endpoint<'a>(
        &'a self,
        state: &crate::simulation::SimulationState,
        actor: &str,
    ) -> Result<Option<&'a str>, crate::execution::OwnedMoveError> {
        use crate::execution::OwnedMoveError::Unavailable;
        let owns = |id: &str| -> Result<bool, crate::execution::OwnedMoveError> {
            if id == actor {
                return Ok(true);
            }
            let body = state
                .physical
                .entities
                .get(id)
                .filter(|e| e.container.is_some())
                .ok_or(Unavailable)?;
            Ok(crate::install::inventory_bag_access(body, actor)
                && crate::install::owned_item_ancestry(&state.physical, actor, id, |_| {})
                    .map_err(|_| Unavailable)?
                    .is_some())
        };
        if self.source == self.destination {
            return Err(Unavailable);
        }
        match (owns(&self.source)?, owns(&self.destination)?) {
            (true, true) => Ok(None),
            (false, true) => Ok(Some(&self.source)),
            (true, false) => Ok(Some(&self.destination)),
            (false, false) => Err(Unavailable),
        }
    }
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StockResolution {
    pub source_id: String,
    pub destination_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub destination_revision: u64,
    pub definition: crate::values::DefinitionPin,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub quantity: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub minimum_held: u64,
    pub lots: Vec<crate::execution::OwnedStockLot>,
}
impl crate::host::retained_size::HeapBytes for StockResolution {
    fn heap_bytes(&self) -> Option<usize> {
        crate::host::retained_size::heap_sum([
            self.source_id.heap_bytes()?,
            self.destination_id.heap_bytes()?,
            self.definition.heap_bytes()?,
            self.lots.heap_bytes()?,
        ])
    }
}
impl StockResolution {
    pub(crate) fn matches(
        &self,
        request: &StockRequest,
        outputs: &[crate::commands::ActivityOutput],
    ) -> bool {
        self.source_id == request.source
            && self.destination_id == request.destination
            && self.definition == request.definition
            && self.quantity == request.quantity
            && self.minimum_held == request.minimum_held
            && !self.lots.is_empty()
            && self.lots.len() <= limits().moved_lots
            && outputs.len() == self.lots.len()
            && self
                .lots
                .iter()
                .try_fold(0u64, |sum, lot| sum.checked_add(lot.quantity))
                == Some(self.quantity)
            && self
                .lots
                .iter()
                .zip(outputs)
                .enumerate()
                .all(|(index, (lot, out))| {
                    crate::values::is_safe_record_id(&lot.item_id)
                        && lot.quantity > 0
                        && lot.quantity == out.quantity
                        && out.definition_id == self.definition.id
                        && out.port == self.definition.id
                        && self.lots[..index]
                            .iter()
                            .all(|other| other.item_id != lot.item_id)
                        && outputs[..index]
                            .iter()
                            .all(|other| other.item_id != out.item_id)
                })
    }
}

pub(crate) struct CompletedStock {
    pub admission: StockResolution,
    pub outputs: Vec<crate::commands::ActivityOutput>,
    pub _storage: crate::host::ByteReservation,
}
