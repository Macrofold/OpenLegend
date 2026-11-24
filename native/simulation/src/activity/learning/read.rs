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
    let count = state
        .activity
        .library
        .acquisitions
        .get(actor)
        .map_or(0, IndexMap::len);
    let storage = budget.reserve(count * size_of::<&str>())?;
    let mut signatures = Vec::with_capacity(count);
    visit_current(state, actor, budget, |method, _| {
        signatures.push(method.signature());
        Ok(())
    })?;
    Ok((signatures, storage))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInspectedSkill {
    pub name: crate::text::JsText,
    pub source: String,
    pub learned_at: f64,
}

pub(crate) fn inspected_activities(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(Vec<RuntimeInspectedSkill>, ByteReservation), ExecutionError> {
    let count = state
        .activity
        .library
        .acquisitions
        .get(actor)
        .map_or(0, IndexMap::len);
    let mut storage = budget.reserve(count * size_of::<RuntimeInspectedSkill>())?;
    let mut skills = Vec::with_capacity(count);
    visit_current(state, actor, budget, |method, acquisition| {
        let name = method
            .body()
            .get("name")
            .and_then(SqlCell::as_text)
            .ok_or(ExecutionError::Invariant)?;
        storage.resize(storage.bytes() + name.storage_bytes() * 4 + 128)?;
        let mut name = name.clone();
        name.push_str(
            if method.body().get("executable").and_then(SqlCell::as_bool) == Some(true) {
                " (tentative)"
            } else {
                " (incomplete; cannot execute)"
            },
        );
        let learned_at = acquisition
            .body()
            .get("at")
            .and_then(SqlCell::as_f64)
            .ok_or(ExecutionError::Invariant)?;
        skills.push(RuntimeInspectedSkill {
            name,
            source: "My own connected actions".into(),
            learned_at,
        });
        Ok(())
    })?;
    Ok((skills, storage))
}

pub(in crate::activity) fn visit_current<'a>(
    state: &'a SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut visit: impl FnMut(
        &'a models::LearningMethod,
        &'a models::LearningAcquisition,
    ) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    visit_current_while(state, actor, budget, |method, acquisition| {
        visit(method, acquisition)?;
        Ok(true)
    })
}

pub(super) fn visit_current_while<'a>(
    state: &'a SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut visit: impl FnMut(
        &'a models::LearningMethod,
        &'a models::LearningAcquisition,
    ) -> Result<bool, ExecutionError>,
) -> Result<(), ExecutionError> {
    let Some(owner) = state
        .activity
        .library
        .acquisitions
        .get(actor)
        .filter(|owner| !owner.is_empty())
    else {
        return Ok(());
    };
    let (manifest, _manifest) = super::format::manifest_shape(state, budget)?;
    for acquisition in owner.values() {
        if !has_support(acquisition) {
            continue;
        }
        let method = method_for_acquisition(state, acquisition)?;
        if matches_installation(state, method, &manifest, budget)? && !visit(method, acquisition)? {
            break;
        }
    }
    Ok(())
}

fn has_support(acquisition: &models::LearningAcquisition) -> bool {
    acquisition
        .body()
        .get("supports")
        .and_then(SqlCell::as_array)
        .is_some_and(|supports| {
            supports
                .iter()
                .any(|support| support.get("revoked").and_then(SqlCell::as_bool) != Some(true))
        })
}

fn method_for_acquisition<'a>(
    state: &'a SimulationState,
    acquisition: &models::LearningAcquisition,
) -> Result<&'a models::LearningMethod, ExecutionError> {
    acquisition
        .body()
        .get("methodId")
        .and_then(SqlCell::as_str)
        .and_then(|id| state.activity.library.methods.get(id))
        .map(std::sync::Arc::as_ref)
        .ok_or(ExecutionError::Invariant)
}

/// Resolve one personal method from the caller’s current accepted cut. This
/// does one owner/id lookup and compares the installed manifest and any role
/// pins. It does not inspect another acquisition or prepare a history page.
/// The caller borrows the result for this cut, and may hold it across a wait
/// only with independent custody and a fresh result before use.
pub(in crate::activity) fn current_acquisition<'a>(
    state: &'a SimulationState,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Option<(&'a models::LearningMethod, &'a models::LearningAcquisition)>, ExecutionError> {
    let Some(acquisition) = state
        .activity
        .library
        .acquisitions
        .get(actor)
        .and_then(|owner| owner.get(id))
        .filter(|acquisition| has_support(acquisition))
    else {
        return Ok(None);
    };
    let method = method_for_acquisition(state, acquisition)?;
    let (manifest, _manifest) = super::format::manifest_shape(state, budget)?;
    Ok(matches_installation(state, method, &manifest, budget)?
        .then_some((method, acquisition.as_ref())))
}

fn matches_installation(
    state: &SimulationState,
    method: &models::LearningMethod,
    manifest: &SqlCell,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let _decode = budget.reserve(
        crate::experience::encoded_body_bound(method.manifest())
            .map_err(|_| ExecutionError::Capacity)?,
    )?;
    let expected: SqlCell =
        serde_json::from_str(method.manifest()).map_err(|_| ExecutionError::Invariant)?;
    if &expected != manifest {
        return Ok(false);
    }
    let roles = method
        .body()
        .get("roles")
        .and_then(SqlCell::as_object)
        .ok_or(ExecutionError::Invariant)?;
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
                return Ok(false);
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
                return Ok(false);
            };
            let _decode = budget.reserve(
                crate::experience::encoded_body_bound(raw).map_err(|_| ExecutionError::Capacity)?,
            )?;
            let definition: SqlCell =
                serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
            if definition.get("id").and_then(SqlCell::as_str) != Some(id)
                || definition.get("version") != version
                || definition.get("digest") != digest
            {
                return Ok(false);
            }
        }
    }
    Ok(true)
}
