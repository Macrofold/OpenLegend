//! Existing acquired signatures use current immutable meaning and surviving
//! private supports. Knowing a template never grants its future object roles.
use super::*;
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::simulation::SimulationState;
use std::mem::size_of;

pub(crate) fn learning_signatures<'a>(
    state: &'a SimulationState,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(Vec<&'a str>, ByteReservation), ExecutionError> {
    let owner = state.activity.library.acquisitions.get(actor);
    let storage = budget.reserve(owner.map_or(0, IndexMap::len) * size_of::<&str>())?;
    let (manifest, _manifest) = super::format::manifest_shape(state, budget)?;
    let mut signatures = Vec::with_capacity(owner.map_or(0, IndexMap::len));
    for acquisition in owner.into_iter().flat_map(|owner| owner.values()) {
        if !acquisition
            .body()
            .get("supports")
            .and_then(SqlCell::as_array)
            .is_some_and(|s| {
                s.iter()
                    .any(|s| s.get("revoked").and_then(SqlCell::as_bool) != Some(true))
            })
        {
            continue;
        }
        let method = acquisition
            .body()
            .get("methodId")
            .and_then(SqlCell::as_str)
            .and_then(|id| state.activity.library.methods.get(id))
            .ok_or(ExecutionError::Invariant)?;
        let _decode = budget.reserve(
            crate::experience::encoded_body_bound(method.manifest())
                .map_err(|_| ExecutionError::Capacity)?,
        )?;
        let expected: SqlCell =
            serde_json::from_str(method.manifest()).map_err(|_| ExecutionError::Invariant)?;
        if expected != manifest {
            continue;
        }
        let roles = method
            .body()
            .get("roles")
            .and_then(SqlCell::as_object)
            .ok_or(ExecutionError::Invariant)?;
        let mut current = true;
        for role in roles.values() {
            if let Some(host) = role.get("targetHost") {
                let _decode = budget.reserve(
                    crate::encoding::json_record_len(host)
                        .map_err(|_| ExecutionError::Invariant)?
                        .checked_mul(4)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let pin: crate::values::DefinitionPin = serde_json::from_str(
                    &crate::encoding::json_record(host).map_err(|_| ExecutionError::Invariant)?,
                )
                .map_err(|_| ExecutionError::Invariant)?;
                if !state.installed.manifest.activity_hosts.contains(&pin) {
                    current = false;
                    break;
                }
            }
            let mut pins = [None, None];
            if let Some(id) = role.get("definitionId").and_then(SqlCell::as_str) {
                pins[0] = Some((
                    id,
                    role.get("definitionVersion"),
                    role.get("definitionDigest"),
                ));
            }
            if let Some(pin) = role.get("gatheredDefinition") {
                if let Some(id) = pin.get("id").and_then(SqlCell::as_str) {
                    pins[1] = Some((id, pin.get("version"), pin.get("digest")));
                }
            }
            for (id, version, digest) in pins.into_iter().flatten() {
                let Some(raw) = state.installed.retained.item_definitions.get(id) else {
                    current = false;
                    break;
                };
                let _decode = budget.reserve(
                    crate::experience::encoded_body_bound(raw)
                        .map_err(|_| ExecutionError::Capacity)?,
                )?;
                let definition: SqlCell =
                    serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
                if definition.get("id").and_then(SqlCell::as_str) != Some(id)
                    || definition.get("version") != version
                    || definition.get("digest") != digest
                {
                    current = false;
                    break;
                }
            }
            if !current {
                break;
            }
        }
        if current {
            signatures.push(method.signature());
        }
    }
    Ok((signatures, storage))
}
